// VũTube.cơm – máy chủ trung chuyển (Cloudflare Worker).
// Chỉ trung chuyển: tìm video, trang kênh, video liên quan (trình duyệt không gọi thẳng YouTube được vì CORS).
// KHÔNG lưu dữ liệu người dùng. Khoá API nằm ở "secret" của Worker (YT_API_KEY — tuỳ chọn), không nằm trong mã.

const VER = "1.0.0";
const WEB = { clientName: "WEB", clientVersion: "2.20261020.01.00" }; // không đặt ngôn ngữ / quốc gia: kết quả chỉ theo chủ đề
// ------------------------------------------------------------------ tiện ích
const J = (o, st = 200, h = {}) => new Response(JSON.stringify(o), { status: st, headers: { "content-type": "application/json; charset=utf-8", ...h } });
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const okId = (s) => /^[\w-]{11}$/.test(s || "");
async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b).slice(0, 10)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
function walk(o, key, out = [], lim = 400) {
  if (!o || typeof o !== "object" || out.length >= lim) return out;
  if (Array.isArray(o)) { for (const x of o) walk(x, key, out, lim); return out; }
  for (const k in o) { if (k === key) out.push(o[k]); else walk(o[k], key, out, lim); }
  return out;
}
const txt = (x) => !x ? "" : typeof x === "string" ? x : x.simpleText || x.content || (x.runs || []).map((r) => r.text).join("") || "";
const num = (s) => { s = String(s || "").replace(/[, ]/g, ""); const m = s.match(/([\d.]+)\s*([KMB])?/i); if (!m) return 0; return Math.round(parseFloat(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[(m[2] || "").toLowerCase()] || 1)); };
const hms = (s) => { if (!s) return 0; const p = String(s).split(":").map(Number); return p.some(isNaN) ? 0 : p.reduce((a, b) => a * 60 + b, 0); };
const isoDur = (s) => { const m = String(s || "").match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); return m ? (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0) : 0; };

// ------------------------------------------------------------------ bộ đệm: Cache API (nhanh, theo trung tâm dữ liệu) + KV (bền, toàn cầu)
async function cget(env, key) {
  const u = "https://cache.vtc/" + encodeURIComponent(key);
  try { const r = await caches.default.match(u); if (r) return await r.json(); } catch (_) {}
  if (env.KV) { try { const v = await env.KV.get(key, "json"); if (v != null) return v; } catch (_) {} }
  return null;
}
async function cput(env, ctx, key, val, ttl, kv = true) {
  const u = "https://cache.vtc/" + encodeURIComponent(key);
  const body = JSON.stringify(val);
  const job = (async () => {
    try { await caches.default.put(u, new Response(body, { headers: { "cache-control": "max-age=" + ttl, "content-type": "application/json" } })); } catch (_) {}
    if (kv && env.KV) { try { await env.KV.put(key, body, { expirationTtl: Math.max(60, ttl) }); } catch (_) {} } // hết hạn mức ghi KV miễn phí: bỏ qua
  })();
  if (ctx && ctx.waitUntil) ctx.waitUntil(job); else await job;
  return val;
}

// ------------------------------------------------------------------ giới hạn tốc độ theo IP (trong bộ nhớ của mỗi máy chủ Cloudflare; có binding thì dùng thêm)
const hits = new Map();
function memLimit(ip, bucket, max, winMs = 60000) {
  const k = bucket + "|" + ip, t = Date.now();
  let h = hits.get(k);
  if (!h || t - h.t > winMs) { h = { t, n: 0 }; hits.set(k, h); }
  h.n++;
  if (hits.size > 5000) for (const [kk, v] of hits) if (t - v.t > winMs) hits.delete(kk);
  return h.n <= max;
}
async function limited(env, ip, bucket) {
  const max = +(env.LIMIT_PER_MIN || 120);
  if (!memLimit(ip, bucket, max)) return true;
  const b = env.LIMIT;
  if (b && b.limit) { try { const { success } = await b.limit({ key: bucket + ":" + ip }); return !success; } catch (_) {} }
  return false;
}

// ------------------------------------------------------------------ YouTube nội bộ (innertube)
async function yti(ep, body, client = WEB, ua = "") {
  const r = await fetch(`https://www.youtube.com/youtubei/v1/${ep}?prettyPrint=false`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(ua ? { "user-agent": ua } : { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36" }) },
    body: JSON.stringify({ context: { client }, ...body }),
  });
  if (!r.ok) throw new Error("youtube " + ep + " " + r.status);
  return r.json();
}
function fromVR(v, ch) { // videoRenderer / gridVideoRenderer -> mục video
  if (!v || !okId(v.videoId)) return null;
  const own = (v.ownerText || v.shortBylineText || v.longBylineText || {}).runs || [];
  const be = (own[0] && own[0].navigationEndpoint && own[0].navigationEndpoint.browseEndpoint) || {};
  const url = (((v.navigationEndpoint || {}).commandMetadata || {}).webCommandMetadata || {}).url || "";
  const ov = walk(v.thumbnailOverlays, "thumbnailOverlayTimeStatusRenderer")[0];
  const durT = txt(v.lengthText) || (ov && txt(ov.text)) || "";
  const av = walk(v.channelThumbnailSupportedRenderers, "thumbnails")[0];
  const short = url.includes("/shorts/") || !!(ov && ov.style === "SHORTS");
  ch = ch || {};
  return { id: v.videoId, title: txt(v.title), short, ch: (own[0] && own[0].text) || ch.name || "",
    chId: be.browseId || ch.id || "", chUrl: be.canonicalBaseUrl ? "https://www.youtube.com" + be.canonicalBaseUrl : (ch.url || ""),
    dur: hms(durT), views: num(txt(v.viewCountText)), ago: txt(v.publishedTimeText), av: av && av[0] ? av[0].url : (ch.avatar || ""),
    thumb: short ? `https://i.ytimg.com/vi/${v.videoId}/oar2.jpg` : `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg` };
}
function fromReel(r) { // Shorts trong kết quả tìm (reelItemRenderer / shortsLockupViewModel)
  const id = r.videoId || (((r.onTap || {}).innertubeCommand || {}).reelWatchEndpoint || {}).videoId;
  if (!okId(id)) return null;
  const title = txt(r.headline) || ((r.overlayMetadata || {}).primaryText || {}).content || r.accessibilityText || "";
  return { id, title: String(title).replace(/,\s*[\d.,]+\s*[KMB]?\s*views.*$/i, ""), short: true, ch: "", chId: "", chUrl: "", dur: 0,
    views: num(((r.overlayMetadata || {}).secondaryText || {}).content || txt(r.viewCountText)), ago: "", av: "", thumb: `https://i.ytimg.com/vi/${id}/oar2.jpg` };
}
function fromLockup(l) { // lockupViewModel (dạng mới ở trang xem / liên quan)
  if (!l || l.contentType !== "LOCKUP_CONTENT_TYPE_VIDEO" || !okId(l.contentId)) return null;
  const md = ((l.metadata || {}).lockupMetadataViewModel) || {};
  const rows = walk(md.metadata, "metadataParts").flat().map((p) => (p.text || {}).content || "").filter(Boolean);
  const badges = walk(l.contentImage, "thumbnailBadgeViewModel").map((b) => b.text || "");
  const durT = badges.find((b) => /^\d+:\d+/.test(b)) || "";
  const be = walk(md, "browseEndpoint")[0] || {};
  return { id: l.contentId, title: (md.title || {}).content || "", short: false, ch: rows[0] || "", chId: be.browseId || "",
    chUrl: be.canonicalBaseUrl ? "https://www.youtube.com" + be.canonicalBaseUrl : "", dur: hms(durT), views: num(rows.find((r) => /view/i.test(r))), ago: rows.find((r) => /ago/i.test(r)) || "",
    av: "", thumb: `https://i.ytimg.com/vi/${l.contentId}/mqdefault.jpg` };
}
const contTok = (d) => { const c = walk(d, "continuationCommand")[0]; return c ? c.token : ""; };

async function itSearch(q, kind, cont) {
  const params = kind === "video" ? "EgIQAQ%3D%3D" : kind === "long" ? "EgIYAg%3D%3D" : kind === "new" ? "EgQIBBAB" : "";
  const body = cont ? { continuation: cont } : { query: q, ...(params ? { params: decodeURIComponent(params) } : {}) };
  const d = await yti("search", body);
  const items = [];
  for (const v of walk(d, "videoRenderer")) { const x = fromVR(v); if (x) items.push(x); }
  if (kind !== "video" && kind !== "long") {
    for (const r of [...walk(d, "reelItemRenderer"), ...walk(d, "shortsLockupViewModel")]) { const x = fromReel(r); if (x) items.push(x); }
  }
  return { items, next: contTok(d) };
}
async function resolveCh(ref) { // @tên / đường dẫn -> UC…
  const m = String(ref).match(/UC[\w-]{22}/); if (m) return m[0];
  let url = String(ref).trim(); if (url.startsWith("@")) url = "https://www.youtube.com/" + url;
  const d = await yti("navigation/resolve_url", { url });
  const be = walk(d, "browseEndpoint")[0];
  if (!be || !be.browseId) throw new Error("không tìm thấy kênh");
  return be.browseId;
}
async function itChannel(ref, tab, cont) {
  const id = await resolveCh(ref);
  const d = await yti("browse", cont ? { continuation: cont } : { browseId: id, params: tab === "shorts" ? "EgZzaG9ydHPyBgUKA5oBAA%3D%3D" : "EgZ2aWRlb3PyBgQKAjoA" });
  const meta = walk(d, "channelMetadataRenderer")[0] || {};
  const pageH = walk(d, "pageHeaderViewModel")[0];
  const avs = walk(meta.avatar, "thumbnails")[0] || walk(pageH, "sources")[0] || [];
  const ch = { name: meta.title || "", id, url: meta.vanityChannelUrl || ("https://www.youtube.com/channel/" + id), avatar: avs[0] ? avs[0].url : "" };
  const items = [];
  for (const v of [...walk(d, "videoRenderer"), ...walk(d, "gridVideoRenderer")]) { const x = fromVR(v, ch); if (x) items.push(x); }
  for (const l of walk(d, "lockupViewModel")) { const x = fromLockup(l); if (x) { x.ch = ch.name; x.chId = id; x.chUrl = ch.url; x.av = ch.avatar; items.push(x); } }
  for (const r of [...walk(d, "reelItemRenderer"), ...walk(d, "shortsLockupViewModel")]) { const x = fromReel(r); if (x) { x.ch = ch.name; x.chId = id; x.chUrl = ch.url; items.push(x); } }
  const subsT = walk(pageH, "metadataParts").flat().map((p) => (p.text || {}).content || "").find((s) => /subscriber/i.test(s)) || "";
  return { ...ch, subs: num(subsT), desc: (meta.description || "").slice(0, 300), country: "", items, next: contTok(d) };
}

// ------------------------------------------------------------------ YouTube Data API v3 (khi có khoá)
const qx = { dead: 0 }; // hết hạn mức ngày -> dùng innertube tới hết ngày (giờ Thái Bình Dương)
async function yd(env, path, params) {
  if (!env.YT_API_KEY || Date.now() < qx.dead) return null;
  const u = new URL("https://www.googleapis.com/youtube/v3/" + path);
  for (const [k, v] of Object.entries(params)) if (v != null && v !== "") u.searchParams.set(k, v);
  u.searchParams.set("key", env.YT_API_KEY);
  const r = await fetch(u.toString());
  if (r.status === 403 || r.status === 429) { qx.dead = Date.now() + 3 * 3600e3; return null; }
  if (!r.ok) return null;
  return r.json();
}
async function ydVideos(env, ids) { // thời lượng + lượt xem
  const out = {};
  if (!ids.length) return out;
  const d = await yd(env, "videos", { part: "contentDetails,statistics", id: ids.slice(0, 50).join(","), maxResults: 50 });
  for (const v of (d && d.items) || []) out[v.id] = { dur: isoDur(v.contentDetails && v.contentDetails.duration), views: +((v.statistics || {}).viewCount || 0) };
  return out;
}
async function ydChannels(env, ids) { // ảnh kênh + quốc gia (1 đơn vị hạn mức cho tối đa 50 kênh)
  const out = {};
  if (!ids.length) return out;
  const d = await yd(env, "channels", { part: "snippet", id: ids.slice(0, 50).join(","), maxResults: 50 });
  for (const c of (d && d.items) || []) out[c.id] = { av: ((c.snippet.thumbnails || {}).default || {}).url || "", country: c.snippet.country || "", name: c.snippet.title };
  return d ? out : null;
}
function ydItem(s, id) {
  const sn = s.snippet || {};
  return { id, title: decodeEnt(sn.title || ""), short: false, ch: decodeEnt(sn.channelTitle || ""), chId: sn.channelId || "", chUrl: sn.channelId ? "https://www.youtube.com/channel/" + sn.channelId : "",
    dur: 0, views: 0, ago: (sn.publishedAt || "").slice(0, 10), av: "", thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` };
}
const decodeEnt = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
async function ydChannel(env, ref) { // dự phòng trang kênh bằng Data API: kênh -> danh sách tải lên (≈3 đơn vị)
  const m = String(ref).match(/UC[\w-]{22}/), h = String(ref).match(/@[\w.-]+/);
  const c = await yd(env, "channels", { part: "snippet,contentDetails,statistics", ...(m ? { id: m[0] } : h ? { forHandle: h[0] } : { forUsername: ref }) });
  const ch = c && c.items && c.items[0];
  if (!ch) return null;
  const up = ((ch.contentDetails || {}).relatedPlaylists || {}).uploads;
  const pl = up ? await yd(env, "playlistItems", { part: "snippet", playlistId: up, maxResults: 30 }) : null;
  const items = ((pl && pl.items) || []).map((x) => ydItem(x, ((x.snippet || {}).resourceId || {}).videoId)).filter((x) => okId(x.id));
  const meta = await ydVideos(env, items.map((x) => x.id));
  const av = ((ch.snippet.thumbnails || {}).default || {}).url || "";
  for (const x of items) { const mm = meta[x.id]; if (mm) { x.dur = mm.dur; x.views = mm.views; } x.short = x.dur > 0 && x.dur <= 60; x.av = av; }
  return { name: ch.snippet.title, id: ch.id, url: "https://www.youtube.com/channel/" + ch.id, avatar: av, subs: +((ch.statistics || {}).subscriberCount || 0), desc: (ch.snippet.description || "").slice(0, 300), items, next: "" };
}
async function ydSearch(env, q, kind, cont) {
  const p = { part: "snippet", type: "video", q, maxResults: 25, pageToken: cont || "", safeSearch: "moderate" };
  if (kind === "long") p.videoDuration = "long"; else if (kind === "video") p.videoDuration = "medium";
  else if (kind === "shorts") p.videoDuration = "short";
  else if (kind === "new") p.publishedAfter = new Date(Date.now() - 30 * 86400e3).toISOString();
  const d = await yd(env, "search", p);
  if (!d) return null;
  const items = (d.items || []).filter((x) => x.id && okId(x.id.videoId)).map((x) => ydItem(x, x.id.videoId));
  const meta = await ydVideos(env, items.map((x) => x.id));
  for (const x of items) { const m = meta[x.id]; if (m) { x.dur = m.dur; x.views = m.views; } x.short = x.dur > 0 && x.dur <= 60; if (x.short) x.thumb = `https://i.ytimg.com/vi/${x.id}/oar2.jpg`; }
  return { items, next: d.nextPageToken || "" };
}

async function fillAvatars(env, items) { // Data API: kết quả tìm không có ảnh kênh -> channels.list (1 đơn vị / 50 kênh)
  const need = [...new Set(items.filter((x) => !x.av && x.chId).map((x) => x.chId))];
  if (!need.length) return;
  const m = await ydChannels(env, need);
  if (m) for (const x of items) if (!x.av && m[x.chId]) x.av = m[x.chId].av;
}
// "Chỉ chủ đề này": giữ video có chữ của chủ đề trong tiêu đề / tên kênh (so cả bản bỏ dấu)
const fold = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
function strictFilter(items, topic) {
  const words = fold(topic).split(/[^a-z0-9]+/).filter((w) => w.length >= 2);
  if (!words.length) return items;
  const need = Math.max(1, Math.ceil(words.length / 2));
  const keep = items.filter((x) => { const t = fold(x.title + " " + x.ch); return words.filter((w) => t.includes(w)).length >= need; });
  return keep.length >= 3 ? keep : items; // lọc quá tay (chủ đề tiếng Việt, video tiếng Anh) thì thôi
}

// ------------------------------------------------------------------ các đường
async function rSearch(env, ctx, u) {
  const q = (u.searchParams.get("q") || "").trim().slice(0, 120);
  if (!q) return { items: [] };
  const kind = u.searchParams.get("kind") || "all", cont = u.searchParams.get("cont") || "";
  const topic = (u.searchParams.get("topic") || "").slice(0, 80), strict = u.searchParams.get("strict") === "1";
  const key = `s6|${kind}|${strict ? topic.toLowerCase() : ""}|${q.toLowerCase()}|${cont.slice(-48)}`;
  const hit = await cget(env, key); if (hit) return hit;
  // innertube trước (không tốn hạn mức), lỗi / bị chặn thì dùng YouTube Data API (nếu có khoá). Token trang sau: "i:" / "a:"
  let res = null, src = "it";
  if (!cont.startsWith("a:")) {
    try { res = await itSearch(q, kind === "shorts" ? "all" : kind, cont.replace(/^i:/, "")); if (kind === "shorts") res.items = res.items.filter((x) => x.short); } catch (_) { res = null; }
    if (res && !res.items.length && !cont) res = null;
  }
  if (!res) { src = "api"; res = await ydSearch(env, q, kind, cont.replace(/^a:/, "")); if (res) await fillAvatars(env, res.items); }
  if (!res) throw new Error("YouTube đang bận, thử lại sau ít phút");
  let items = res.items;
  if (strict && topic) items = strictFilter(items, topic);
  res.next = res.next ? (src === "it" ? "i:" : "a:") + res.next : "";
  return cput(env, ctx, key, { items, next: res.next || "", src }, 6 * 3600);
}
async function rChannel(env, ctx, u) {
  const ref = (u.searchParams.get("ref") || "").trim(), tab = u.searchParams.get("tab") === "shorts" ? "shorts" : "videos", cont = u.searchParams.get("cont") || "";
  if (!ref) throw new Error("thiếu kênh");
  const key = `c3|${tab}|${ref.toLowerCase()}|${cont.slice(-40)}`;
  const hit = await cget(env, key); if (hit) return hit;
  let d = null;
  try { d = await itChannel(ref, tab, cont); } catch (e) { d = cont ? null : await ydChannel(env, ref); if (!d) throw e; }
  return cput(env, ctx, key, d, 3 * 3600);
}
const STOP = new Set("the a an and or of to in on for with how what why is are this that my your i you we our 2024 2025 2026 official video full hd 4k ep part".split(" "));
async function rRelated(env, ctx, u) {
  const id = u.searchParams.get("id") || "", title = (u.searchParams.get("title") || "").slice(0, 200), ch = u.searchParams.get("ch") || "", vi = u.searchParams.get("vi") === "1";
  if (!okId(id)) throw new Error("id sai");
  const key = `r3|${id}|${vi ? 1 : 0}`;
  const hit = await cget(env, key); if (hit) return hit;
  let a = [];
  try { const d = await yti("next", { videoId: id }); a = [...walk(d, "lockupViewModel").map(fromLockup), ...walk(d, "compactVideoRenderer").map((v) => fromVR(v))].filter(Boolean); } catch (_) {}
  if (a.length < 6) {
    const words = (title.match(/[\wÀ-ỹ]+/g) || []).filter((w) => !STOP.has(w.toLowerCase()));
    const q = words.slice(0, 7).join(" ");
    if (q) { try { a = a.concat((await itSearch(q, "all")).items); } catch (_) {} }
  }
  let b = [];
  if (ch) { try { b = (await itChannel(ch, "videos")).items.slice(0, 10); } catch (_) {} }
  const out = [], seen = new Set([id]);
  for (let i = 0; i < Math.max(a.length, b.length); i++) for (const x of [a[i], i % 2 === 0 ? b[i >> 1] : null]) if (x && !seen.has(x.id)) { seen.add(x.id); out.push(x); }
  const items = out.slice(0, 30);
  return cput(env, ctx, key, { items }, 12 * 3600);
}

function cors(env, origin) {
  const allow = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = origin && (allow.includes(origin) || (env.ALLOW_LOCALHOST === "1" && /^http:\/\/(localhost|127\.0\.0\.1|[\w-]+\.local)(:\d+)?$/.test(origin)));
  return ok ? { "access-control-allow-origin": origin, "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400", vary: "Origin" } : null;
}

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url), origin = req.headers.get("origin") || "";
    const ch = cors(env, origin);
    if (req.method === "OPTIONS") return new Response(null, { status: ch ? 204 : 403, headers: ch || {} });
    if (!ch) return J({ error: "Không được phép (chỉ dùng từ trang VũTube.cơm)." }, 403);
    const ip = req.headers.get("cf-connecting-ip") || "local";
    const p = u.pathname.replace(/\/+$/, "") || "/";
    if (await limited(env, ip, "all")) return J({ error: "Bạn thao tác nhanh quá, đợi 1 phút nhé." }, 429, { ...ch, "retry-after": "60" });
    try {
      let out;
      if (p === "/" || p === "/health") out = { ok: true, ver: VER, yt: !!env.YT_API_KEY };
      else if (p === "/search") out = await rSearch(env, ctx, u);
      else if (p === "/channel") out = await rChannel(env, ctx, u);
      else if (p === "/related") out = await rRelated(env, ctx, u);
      else return J({ error: "không có đường này" }, 404, ch);
      return J(out, 200, { ...ch, "cache-control": "no-store" });
    } catch (e) {
      return J({ error: String((e && e.message) || e).slice(0, 200) }, 502, ch);
    }
  },
};
