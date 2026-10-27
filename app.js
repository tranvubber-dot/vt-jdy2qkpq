/* VũTube.cơm — bản chia sẻ. Mọi cá nhân hoá lưu trên máy người dùng (localStorage), không tài khoản. */
(() => {
  "use strict";
  if (window.__desk) return; // máy tính: app chạy trong khung điện thoại (iframe) ở giữa màn
  const VER = "1.0.2";
  const $ = (id) => document.getElementById(id);
  const TEST = /[?&]thu=1\b/.test(location.search); // chạy thử: luôn tắt tiếng video
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fold = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pickR = (a) => a[Math.floor(Math.random() * a.length)];
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // ---------- lưu trên máy (khoá có tiền tố riêng: chung tên miền với trang khác) ----------
  const NS = "vtc.";
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { if (v == null) localStorage.removeItem(NS + k); else localStorage.setItem(NS + k, JSON.stringify(v)); } catch (_) {} },
  };
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (_) {}

  // ---------- chủ đề có sẵn (trung tính; câu tìm trộn Việt + Anh cho đa dạng) ----------
  const PRESETS = [
    { e: "🍳", n: "Nấu ăn", q: ["nấu ăn ngon dễ làm", "cooking recipes", "street food"], near: ["làm bánh", "ẩm thực các nước"] },
    { e: "🔬", n: "Khoa học", q: ["khoa học thú vị", "science explained", "space documentary"], near: ["vũ trụ", "phát minh"] },
    { e: "💼", n: "Kinh doanh", q: ["kinh doanh khởi nghiệp", "business case study", "entrepreneur interview"], near: ["marketing", "câu chuyện thương hiệu"] },
    { e: "✈️", n: "Du lịch", q: ["du lịch khám phá", "travel vlog", "walking tour"], near: ["ẩm thực đường phố", "văn hoá các nước"] },
    { e: "💻", n: "Công nghệ", q: ["công nghệ mới", "tech review", "AI tools"], near: ["điện thoại", "trí tuệ nhân tạo"] },
    { e: "💪", n: "Sức khoẻ", q: ["sức khoẻ bác sĩ chia sẻ", "healthy lifestyle", "workout at home"], near: ["giấc ngủ", "dinh dưỡng"] },
    { e: "📜", n: "Lịch sử", q: ["lịch sử thế giới", "history documentary"], near: ["khảo cổ", "nền văn minh cổ đại"] },
    { e: "🐾", n: "Động vật", q: ["thế giới động vật", "wildlife documentary", "cute animals"], near: ["thú cưng", "đại dương"] },
    { e: "🌿", n: "Thiên nhiên", q: ["thiên nhiên đẹp", "nature documentary 4k"], near: ["núi rừng", "đại dương"] },
    { e: "💰", n: "Tài chính", q: ["tài chính cá nhân", "personal finance tips"], near: ["tiết kiệm", "kinh tế"] },
    { e: "🧠", n: "Phát triển bản thân", q: ["phát triển bản thân", "self improvement", "psychology explained"], near: ["thói quen tốt", "đọc sách"] },
    { e: "🎵", n: "Âm nhạc", q: ["âm nhạc live", "music live performance"], near: ["nhạc cụ", "acoustic cover"] },
    { e: "🎬", n: "Phim & review", q: ["review phim", "movie explained"], near: ["hậu trường phim", "phim hoạt hình"] },
    { e: "⚽", n: "Thể thao", q: ["bóng đá", "sports highlights"], near: ["thể hình", "chạy bộ"] },
    { e: "🎮", n: "Game", q: ["game hay", "gaming"], near: ["esports", "game mobile"] },
    { e: "🚗", n: "Xe cộ", q: ["review xe", "car review"], near: ["xe điện", "xe máy"] },
    { e: "🏡", n: "Nhà cửa", q: ["cải tạo nhà", "home renovation", "tiny house"], near: ["trang trí nhà", "làm vườn"] },
    { e: "👶", n: "Nuôi dạy con", q: ["nuôi dạy con", "parenting tips"], near: ["đồ chơi cho bé", "sức khoẻ trẻ em"] },
    { e: "🛠️", n: "Tự làm (DIY)", q: ["tự làm đồ handmade", "DIY projects"], near: ["sửa chữa đồ", "thủ công"] },
    { e: "😂", n: "Giải trí", q: ["video hài", "funny videos"], near: ["thử thách", "vlog đời thường"] },
  ];
  const presetOf = (n) => PRESETS.find((p) => p.n === n);
  const EMO = ["🌟", "🎯", "🔥", "🌈", "🍀", "🎈", "🧩", "🪄"];

  // ---------- trạng thái ----------
  let cfg = Object.assign({ cc: true, hideShorts: false, autoNext: true, topic: 0, strict: {}, rot2: false }, LS.get("cfg", {}));
  let topics = LS.get("topics", null); // [{e,n,q,near}]
  let liked = LS.get("liked", []), later = LS.get("later", []), hist = LS.get("hist", []), follows = LS.get("follows", []);
  let blocked = LS.get("blocked", []), kws = LS.get("kws", []), taste = LS.get("taste", {}), recentQ = LS.get("recentQ", []);
  const saveCfg = () => LS.set("cfg", cfg);
  const saveAll = () => { LS.set("cfg", cfg); LS.set("topics", topics); LS.set("liked", liked); LS.set("later", later); LS.set("hist", hist); LS.set("follows", follows); LS.set("blocked", blocked); LS.set("kws", kws); LS.set("taste", taste); LS.set("recentQ", recentQ); };
  const pick = (it) => ({ id: it.id, title: it.title || "", ch: it.ch || "", chId: it.chId || "", chUrl: it.chUrl || "", dur: it.dur || 0, short: !!it.short, av: it.av || "", views: it.views || 0, ago: it.ago || "" });

  // so kênh theo mọi dạng: UC…, @tên, đường dẫn kênh, tên kênh
  const chKeys = (...v) => { const k = new Set(); v.forEach((x) => { x = String(x || "").trim(); if (!x) return; k.add(x.toLowerCase().replace(/^https?:\/\/(www\.|m\.)?/, "").replace(/\/+$/, ""));
    const m = x.match(/UC[\w-]{20,}/); if (m) k.add(m[0].toLowerCase()); const h = x.match(/@[\w.-]+/); if (h) k.add(h[0].toLowerCase()); }); return k; };
  const sameCh = (a, b) => { const A = chKeys(a.chUrl || a.url, a.chId || a.id); for (const k of chKeys(b.chUrl || b.url, b.chId || b.id)) if (A.has(k)) return true;
    const na = String(a.ch || a.name || "").trim().toLowerCase(), nb = String(b.ch || b.name || "").trim().toLowerCase(); return !!na && na === nb; };
  const isFollow = (it) => follows.some((f) => sameCh(f, it));
  const isBlocked = (it) => !!it && blocked.some((b) => sameCh(b, it));
  const kwHit = (it) => { if (!kws.length) return false; const t = fold(it.title + " " + it.ch); return kws.some((k) => k && t.includes(fold(k))); };
  const okItem = (it) => it && it.id && !isBlocked(it) && !kwHit(it) && !(cfg.hideShorts && it.short);
  const isLiked = (id) => liked.some((x) => x.id === id);
  const isLater = (id) => later.some((x) => x.id === id);

  // sở thích phai dần (14 ngày) — dùng cho "Dành cho bạn"
  const HALF = 14 * 86400e3;
  const tasteOf = (n) => { const t = taste[n]; return t ? t.w * Math.pow(0.5, (Date.now() - t.at) / HALF) : 0; };
  function addTaste(n, w = 1) { if (!n) return; taste[n] = { w: tasteOf(n) + w, at: Date.now() }; LS.set("taste", taste); }

  // ---------- giao diện chung ----------
  const P = (d) => `<svg class="i" viewBox="0 0 24 24">${d}</svg>`;
  const I = {
    heart: P('<path d="M12 20.5s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.6c0 5.7-7.5 10.3-7.5 10.3z"/>'),
    heartOn: P('<path d="M12 20.5s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.6c0 5.7-7.5 10.3-7.5 10.3z" fill="currentColor"/>'),
    bm: P('<path d="M6.5 4h11v16l-5.5-4-5.5 4z"/>'), bmOn: P('<path d="M6.5 4h11v16l-5.5-4-5.5 4z" fill="currentColor"/>'),
    cc: P('<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M10.5 10.2a2.4 2.4 0 1 0 0 3.6M17 10.2a2.4 2.4 0 1 0 0 3.6"/>'),
    ccOff: P('<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M10.5 10.2a2.4 2.4 0 1 0 0 3.6M17 10.2a2.4 2.4 0 1 0 0 3.6"/><path d="M3 21L21 3" stroke="#ff6b7d" stroke-width="2.4"/>'),
    dots: P('<circle cx="12" cy="5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/>'),
    dotsH: P('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'),
    chev: '<svg class="i chev" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
    land: P('<rect x="2.5" y="6.5" width="19" height="11" rx="2.5"/><path d="M6 3.5h3M15 20.5h3"/>'),
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
    share: P('<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12"/>'),
    x: P('<path d="M6 6l12 12M18 6L6 18"/>'), check: P('<path d="M5 12.5l4.5 4.5L19 7"/>'),
    ban: P('<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>'), user: P('<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>'),
    yt: P('<rect x="3" y="5.5" width="18" height="13" rx="4"/><path d="M10.5 9.5v5l4-2.5z" fill="currentColor"/>'),
    next: P('<path d="M6 5.5v13l9-6.5z" fill="currentColor"/><path d="M18 5v14"/>'), up: P('<path d="M6 15l6-6 6 6"/>'), down: P('<path d="M6 9l6 6 6-6"/>'),
    vol: P('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'), pen: P('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
    plus: P('<path d="M12 5v14M5 12h14"/>'), trash: P('<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'), clock: P('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    home: P('<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5h-6v5H5.5A1.5 1.5 0 0 1 4 19z"/>'), reel: P('<rect x="6.5" y="3" width="11" height="18" rx="3"/><path d="M10.5 9.5v5l4-2.5z" fill="currentColor"/>'),
    gear: P('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'),
    spark: P('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/>'),
  };
  let toastT = 0;
  function toast(text, btn, fn, ms = 2600) {
    $("tt").textContent = text; const b = $("tb"); b.textContent = btn || ""; b.style.display = btn ? "" : "none";
    b.onclick = () => { $("toast").classList.remove("on"); fn && fn(); };
    $("toast").classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => $("toast").classList.remove("on"), ms);
  }
  function sheet(title, items) {
    const sh = $("sheet"); sh.innerHTML = "";
    const box = document.createElement("div"); box.className = "shb";
    if (title) { const h = document.createElement("h5"); h.textContent = title; box.append(h); }
    for (const it of items) {
      const b = document.createElement("button"); b.className = "si" + (it.on ? " on" : "") + (it.red ? " red" : "");
      b.innerHTML = (it.icon || "") + "<span></span>" + (it.on != null ? (it.on ? I.check.replace('class="i"', 'class="i ck"') : "") : "");
      b.querySelector("span").textContent = it.label;
      b.onclick = () => { closeSheet(); setTimeout(() => it.fn && it.fn(), 60); };
      box.append(b);
    }
    const c = document.createElement("button"); c.className = "shc"; c.textContent = "Huỷ"; c.onclick = closeSheet;
    sh.append(box, c);
    requestAnimationFrame(() => { sh.classList.add("on"); $("scrim").classList.add("on"); });
  }
  function closeSheet() { $("sheet").classList.remove("on"); $("scrim").classList.remove("on"); }
  $("scrim").onclick = closeSheet;
  const COLORS = ["#7b4dff", "#ff4fa3", "#ff8a3d", "#2fbf8f", "#3d8bff", "#c64cff", "#e8b100"];
  const ini = (n) => esc((String(n || "?").replace(/^@/, "").trim()[0] || "?").toUpperCase());
  const colorOf = (n) => { let h = 0; for (const c of String(n || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; };
  const avHtml = (name, url, cls = "av") => url ? `<div class="${cls}" style="background-image:url('${esc(url)}')"></div>` : `<div class="${cls}" style="background:${colorOf(name)}">${ini(name)}</div>`;
  const fmtT = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); };
  const fmtDur = (s) => { s = Math.round(s || 0); if (!s) return ""; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0"); };
  const fmtViews = (n) => !n ? "" : n >= 1e9 ? (n / 1e9).toFixed(1).replace(".", ",").replace(",0", "") + " tỷ lượt xem" : n >= 1e6 ? (n / 1e6).toFixed(1).replace(".", ",").replace(",0", "") + " Tr lượt xem" : n >= 1e3 ? Math.round(n / 1e3) + "N lượt xem" : n + " lượt xem";
  const UNIT = { second: "giây", minute: "phút", hour: "giờ", day: "ngày", week: "tuần", month: "tháng", year: "năm", y: "năm", mo: "tháng", w: "tuần", d: "ngày", h: "giờ", m: "phút", s: "giây" };
  const viAgo = (s) => { s = String(s || ""); let m = s.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s+ago/i) || s.match(/(\d+)\s*(mo|y|w|d|h|m|s)\s+ago/i);
    if (m) return m[1] + " " + UNIT[m[2].toLowerCase()] + " trước"; m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) return `${+m[3]}/${+m[2]}/${m[1]}`; return /ago/i.test(s) ? "" : s; };
  const subLine = (it) => [it.ch, fmtViews(it.views), viAgo(it.ago)].filter(Boolean).join(" · ");
  const thumb = (it) => it.short ? `https://i.ytimg.com/vi/${it.id}/oar2.jpg` : `https://i.ytimg.com/vi/${it.id}/mqdefault.jpg`;
  const bigThumb = (it) => `https://i.ytimg.com/vi/${it.id}/hqdefault.jpg`;
  const posOf = (id) => { const h = hist.find((x) => x.id === id); return h ? h.pos || 0 : 0; };
  function imgTag(src) { return `<img loading="lazy" decoding="async" src="${esc(src)}" alt="" onload="this.classList.add('ok')" onerror="this.onerror=null;this.src=this.src.replace('oar2','hqdefault')">`; }
  function thHtml(it) {
    const p = posOf(it.id), pct = it.dur && p ? Math.min(100, 100 * p / it.dur) : 0;
    return `<div class="th">${imgTag(it.short ? bigThumb(it) : thumb(it))}${it.short ? '<span class="dur sh">Shorts</span>' : it.dur ? `<span class="dur">${fmtDur(it.dur)}</span>` : ""}${pct > 2 ? `<i class="pb" style="width:${pct.toFixed(1)}%"></i>` : ""}</div>`;
  }
  function card(it, onOpen) {
    const d = document.createElement("div"); d.className = "card"; d.dataset.id = it.id;
    d.innerHTML = thHtml(it) + `<div class="meta">${it.ch ? avHtml(it.ch, it.av) : ""}<div class="mt"><b></b><small></small></div><button class="more" aria-label="Thêm">${I.dots}</button></div>`;
    d.querySelector("b").textContent = it.title; d.querySelector("small").textContent = subLine(it);
    d.onclick = (e) => { if (e.target.closest(".more")) { e.stopPropagation(); itemMenu(it); return; } if (e.target.closest(".av") && (it.chId || it.chUrl)) { e.stopPropagation(); openChannel(it); return; } onOpen(); };
    return d;
  }
  function row(it, onOpen, onX) {
    const d = document.createElement("div"); d.className = "row";
    d.innerHTML = thHtml(it) + `<div class="mt"><b></b><small></small></div>` + (onX ? `<button class="more" aria-label="Bỏ">${I.x}</button>` : `<button class="more" aria-label="Thêm">${I.dots}</button>`);
    d.querySelector("b").textContent = it.title; d.querySelector("small").textContent = subLine(it);
    d.onclick = (e) => { if (e.target.closest(".more")) { e.stopPropagation(); onX ? onX(d) : itemMenu(it); return; } onOpen(); };
    return d;
  }
  function mini(it, onOpen) {
    const d = document.createElement("button"); d.className = "mini";
    d.innerHTML = thHtml(it) + "<b></b><small></small>"; d.querySelector("b").textContent = it.title; d.querySelector("small").textContent = it.ch;
    d.onclick = onOpen; return d;
  }
  function skeleton(box, n = 3) { for (let i = 0; i < n; i++) { const s = document.createElement("div"); s.className = "skc"; s.innerHTML = '<div class="t skel"></div><div class="l skel"></div><div class="l2 skel"></div>'; box.append(s); } }
  function itemMenu(it, list, idx) {
    sheet(it.title, [
      { icon: I.reel, label: "Lướt từ video này", fn: () => openFeed(list || [it], idx || 0, null) },
      { icon: isLater(it.id) ? I.bmOn : I.bm, label: isLater(it.id) ? "Bỏ khỏi Xem sau" : "Lưu xem sau", fn: () => toggleLater(it) },
      ...(it.chId || it.chUrl ? [{ icon: I.user, label: "Mở kênh " + (it.ch || ""), fn: () => openChannel(it) }] : []),
      { icon: I.share, label: "Chia sẻ", fn: () => share(it) },
      ...(it.chId || it.chUrl ? [{ icon: I.ban, label: "Chặn kênh " + (it.ch || "này"), red: true, fn: () => blockChannel(it) }] : []),
    ]);
  }
  function toggleLater(it, force) {
    const on = force != null ? force : !isLater(it.id);
    later = on ? [Object.assign(pick(it), { at: Date.now() }), ...later.filter((x) => x.id !== it.id)].slice(0, 300) : later.filter((x) => x.id !== it.id);
    LS.set("later", later); toast(on ? "Đã lưu vào Xem sau" : "Đã bỏ khỏi Xem sau");
  }
  async function share(it) {
    const url = "https://youtu.be/" + it.id;
    try { if (navigator.share) { await navigator.share({ title: it.title, url }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(url); toast("Đã chép link video"); } catch (_) { prompt("Link video:", url); }
  }
  function blockChannel(it, after) {
    sheet("Chặn kênh " + (it.ch || "") + "?", [{ icon: I.ban, label: "Chặn — không hiện video kênh này nữa", red: true, fn: () => {
      const b = { name: it.ch || it.name || "", chId: it.chId || it.id || "", chUrl: it.chUrl || it.url || "", at: Date.now() };
      blocked = [b, ...blocked.filter((x) => !sameCh(x, b))]; LS.set("blocked", blocked);
      follows = follows.filter((f) => !sameCh(f, b)); LS.set("follows", follows);
      document.querySelectorAll(".card,.row").forEach((c) => { const x = cardItem.get(c); if (x && isBlocked(x)) c.remove(); });
      toast("Đã chặn " + (b.name || "kênh"), "Hoàn tác", () => { blocked = blocked.filter((x) => x !== b); LS.set("blocked", blocked); }, 6000);
      if (after) after(); else if (view === "luot") luotDropBlocked();
    } }]);
  }
  const cardItem = new WeakMap();

  // ---------- máy chủ trung chuyển ----------
  const qsRelay = new URLSearchParams(location.search).get("relay");
  if (qsRelay != null) LS.set("relay", qsRelay || null);
  const RELAY = () => String(LS.get("relay", "") || (window.VTC_CONFIG && window.VTC_CONFIG.relay) || "").replace(/\/+$/, "");
  let relayOk = null;
  const CACHE_MAX = 60;
  function cacheGet(k, ttl) { const c = LS.get("cache", {}); const v = c[k]; return v && Date.now() - v.t < ttl ? v.d : null; }
  function cachePut(k, d) { const c = LS.get("cache", {}); c[k] = { t: Date.now(), d }; const ks = Object.keys(c); if (ks.length > CACHE_MAX) ks.sort((a, b) => c[a].t - c[b].t).slice(0, ks.length - CACHE_MAX).forEach((x) => delete c[x]); LS.set("cache", c); }
  async function api(path, params = {}, ttl = 2 * 3600e3) {
    const base = RELAY(); if (!base) throw Object.assign(new Error("norelay"), { norelay: 1 });
    const u = new URL(base + path); for (const [k, v] of Object.entries(params)) if (v != null && v !== "") u.searchParams.set(k, v);
    const key = u.pathname + u.search, hit = ttl ? cacheGet(key, ttl) : null; if (hit) return hit;
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 25000);
    try {
      const r = await fetch(u, { signal: ac.signal });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || ("Máy chủ lỗi " + r.status));
      setRelay(true); if (ttl) cachePut(key, d); return d;
    } catch (e) { if (e.name === "AbortError" || e instanceof TypeError) setRelay(false); throw e; } finally { clearTimeout(to); }
  }
  function setRelay(ok) { relayOk = ok; document.body.classList.toggle("norelay", !ok); }
  let seed = null;
  async function seedAll() { if (!seed) { try { seed = await (await fetch("seed.json?v=" + VER)).json(); } catch (_) { seed = {}; } } return seed; }
  async function seedFor(topic) { const s = await seedAll(); const all = Object.values(s).flat(); return shuffle(topic ? (s[topic] || all.filter((x) => fold(x.title).includes(fold(topic)))) : all); }
  async function search(q, opt = {}) {
    try { return await api("/search", { q, kind: opt.kind || "", cont: opt.cont || "", topic: opt.topic || "", strict: opt.strict ? 1 : "" }); }
    catch (e) { if (!e.norelay && relayOk !== false) throw e; const items = await seedFor(opt.topicName || ""); const f = fold(q); const m = items.filter((x) => fold(x.title + " " + x.ch).includes(f)); return { items: (opt.topicName ? items : m.length ? m : items).slice(0, 24), next: "", seed: 1 }; }
  }
  const tag = (items, tp) => items.map((x) => (tp ? Object.assign({}, x, { _tp: tp }) : x));

  // ---------- điều hướng ----------
  let view = "home";
  function show(v, push = true) {
    if (view === "luot" && v !== "luot") leaveLuot();
    view = v;
    document.querySelectorAll(".view").forEach((s) => s.classList.toggle("on", s.id === "v" + v[0].toUpperCase() + v.slice(1)));
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.t === v || (v === "kenh" && b.dataset.t === "home") || (v === "search" && b.dataset.t === "home")));
    $("chips").classList.toggle("hide", v !== "home"); $("strictRow").classList.toggle("hide", v !== "home" || cfg.topic === 0);
    document.body.classList.toggle("inluot", v === "luot");
    if (push) try { history.pushState({ v }, ""); } catch (_) {}
    if (v !== "luot") scrollTo(0, 0);
   
  }
  addEventListener("popstate", (e) => {
    if (document.body.classList.contains("full")) { setFull(false, true); return; }
    const v = (e.state && e.state.v) || "home";
    if ($("sheet").classList.contains("on")) closeSheet();
    show(v, false);
    if (v === "lib") renderLib(); else if (v === "set") renderSet();
  });
  try { history.replaceState({ v: "home" }, ""); } catch (_) {}
  $("tabs").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; go(b.dataset.t); };
  function go(t) {
    if (t === "home") { if (view === "home") { scrollTo({ top: 0, behavior: "smooth" }); return; } show("home"); }
    else if (t === "luot") openFeed(homeList.length ? homeList : [], 0, homeSrc);
    else if (t === "lib") { show("lib"); renderLib(); }
    else if (t === "set") { show("set"); renderSet(); }
  }

  // ---------- trang chủ ----------
  const FORYOU = { e: "✨", n: "Dành cho bạn", foryou: true };
  let homeList = [], homeSrc = null, homeTok = 0;
  function renderChips() {
    const box = $("chips"); box.innerHTML = "";
    [FORYOU, ...topics].forEach((t, i) => {
      const b = document.createElement("button"); b.className = "chip" + (cfg.topic === i ? " on" : ""); b.innerHTML = `<span>${esc(t.e || "")}</span>`; b.append(t.n);
      b.onclick = () => { if (cfg.topic === i) return; cfg.topic = i; saveCfg(); renderChips(); loadHome(); };
      if (i > 0) b.oncontextmenu = (e) => { e.preventDefault(); topicMenu(i - 1); };
      box.append(b);
    });
    const ed = document.createElement("button"); ed.className = "chip ed"; ed.innerHTML = I.pen; ed.title = "Sửa chủ đề"; ed.onclick = () => { show("set"); renderSet("topics"); }; box.append(ed);
    const on = box.querySelector(".chip.on"); if (on) on.scrollIntoView({ block: "nearest", inline: "center" });
    const tp = topics[cfg.topic - 1];
    $("strictRow").classList.toggle("hide", !tp || view !== "home");
    if (tp) { $("strictSw").classList.toggle("on", !!cfg.strict[tp.n]); $("strictT").textContent = "Chỉ chủ đề “" + tp.n + "”"; }
  }
  $("strictSw").onclick = () => { const tp = topics[cfg.topic - 1]; if (!tp) return; cfg.strict[tp.n] = !cfg.strict[tp.n]; saveCfg(); renderChips(); loadHome(); };
  function topicMenu(i) {
    const t = topics[i];
    sheet(t.e + " " + t.n, [
      { icon: I.up, label: "Đưa lên trước", fn: () => { if (i > 0) { [topics[i - 1], topics[i]] = [topics[i], topics[i - 1]]; LS.set("topics", topics); renderChips(); } } },
      { icon: I.down, label: "Đưa xuống sau", fn: () => { if (i < topics.length - 1) { [topics[i + 1], topics[i]] = [topics[i], topics[i + 1]]; LS.set("topics", topics); renderChips(); } } },
      { icon: I.trash, label: "Xoá chủ đề này", red: true, fn: () => removeTopic(i) },
    ]);
  }
  function removeTopic(i) {
    const t = topics[i]; topics.splice(i, 1); LS.set("topics", topics); if (cfg.topic > topics.length) { cfg.topic = 0; saveCfg(); }
    renderChips(); if (view === "set") renderSet("topics");
    toast("Đã xoá “" + t.n + "”", "Hoàn tác", () => { topics.splice(i, 0, t); LS.set("topics", topics); renderChips(); if (view === "set") renderSet("topics"); }, 6000);
  }
  function addTopicByName(name) {
    name = String(name || "").trim().slice(0, 40); if (!name) return false;
    if (topics.some((t) => fold(t.n) === fold(name))) { toast("Đã có chủ đề này"); return false; }
    const p = presetOf(name) || PRESETS.find((x) => fold(x.n) === fold(name));
    topics.push(p ? Object.assign({}, p) : { e: pickR(EMO), n: name, q: [name], near: [] }); LS.set("topics", topics); return true;
  }
  // nguồn video cho 1 chủ đề / "Dành cho bạn": trộn ngẫu nhiên nhiều câu tìm cho đa dạng
  function topicSource(tp) {
    const st = { qs: shuffle(tp.q || [tp.n]), i: 0, cont: {}, done: false };
    return { name: tp.n, async more() {
      if (st.done) return [];
      const strict = !!cfg.strict[tp.n];
      const q = st.qs[st.i % st.qs.length], c = st.cont[q] || "";
      st.i++;
      const d = await search(q, { cont: c, topic: tp.n, strict, topicName: tp.n });
      if (d.seed) st.done = true;
      st.cont[q] = d.next || ""; if (!d.next && st.i >= st.qs.length && st.qs.every((x) => st.cont[x] === "")) st.done = true;
      return tag(shuffle(d.items), tp.n);
    } };
  }
  function forYouSource() {
    let round = 0;
    return { name: "Dành cho bạn", async more() {
      round++;
      const ws = topics.map((t) => ({ t, w: 1 + tasteOf(t.n) * 2 + Math.random() }));
      ws.sort((a, b) => b.w - a.w);
      const tps = ws.slice(0, 3).map((x) => x.t);
      const jobs = tps.map((t) => search(pickR(t.q || [t.n]), { topicName: t.n }).then((d) => tag(d.items, t.n)).catch(() => []));
      // khám phá: chủ đề GẦN sở thích (không lấy chủ đề chung chung)
      const nearAll = topics.flatMap((t) => (t.near || []).map((q) => ({ q, n: t.n })));
      if (nearAll.length) { const x = pickR(nearAll); jobs.push(search(x.q, { topicName: x.n }).then((d) => tag(d.items.slice(0, 8), x.n)).catch(() => [])); }
      if (recentQ.length) { const q = pickR(recentQ.slice(0, 5)); jobs.push(search(q).then((d) => tag(d.items.slice(0, 8), "")).catch(() => [])); }
      if (follows.length && relayOk !== false) for (const f of shuffle(follows).slice(0, 2)) jobs.push(api("/channel", { ref: f.id || f.url }, 6 * 3600e3).then((d) => d.items.slice(0, 6)).catch(() => []));
      const lists = (await Promise.all(jobs)).map(shuffle);
      const out = [];
      for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (l[i]) out.push(l[i]);
      return round > 8 ? [] : out;
    } };
  }
  function buffered(src) { // mỗi lần lấy tối đa 24 video, phần dư để lần sau (đỡ nặng máy)
    let buf = [], seen = new Set();
    return { name: src.name, async more() {
      let tries = 0;
      while (buf.length < 24 && tries++ < 2) { const got = (await src.more()).filter((x) => x && !seen.has(x.id) && (seen.add(x.id), true)); if (!got.length) break; buf.push(...got); }
      return buf.splice(0, 24);
    } };
  }
  const curSource = () => buffered(cfg.topic === 0 || !topics[cfg.topic - 1] ? forYouSource() : topicSource(topics[cfg.topic - 1]));
  let homeMore = null, homeSeen = new Set(), homeBusy = false;
  async function loadHome() {
    const tok = ++homeTok, box = $("vHome"); box.innerHTML = "";
    if (cfg.topic > topics.length) cfg.topic = 0;
    renderChips();
    // xem tiếp
    const cont = hist.filter((h) => h.pos > 15 && (!h.dur || h.pos < h.dur - 20) && okItem(h)).slice(0, 12);
    if (cont.length && cfg.topic === 0) {
      const s = document.createElement("div"); s.className = "sec"; s.innerHTML = `<h3>Xem tiếp</h3><div class="hrow"></div>`;
      cont.forEach((it, i) => s.querySelector(".hrow").append(mini(it, () => openFeed(cont, i, null))));
      box.append(s);
    }
    const sec = document.createElement("div"); sec.className = "sec"; sec.innerHTML = `<div class="grid"></div><div class="sent" style="height:40px"></div>`; box.append(sec);
    const grid = sec.querySelector(".grid"); skeleton(grid, 3);
    homeList = []; homeSeen = new Set(); homeSrc = curSource(); homeMore = async () => {
      if (homeBusy) return; homeBusy = true;
      try {
        const items = (await homeSrc.more()).filter((x) => okItem(x) && !homeSeen.has(x.id));
        if (tok !== homeTok) return;
        grid.querySelectorAll(".skc").forEach((x) => x.remove());
        if (!items.length && !homeList.length) grid.innerHTML = `<div class="empty"><span class="big">🍚</span>Chưa có video. Thử chủ đề khác hoặc tắt “Chỉ chủ đề này”.</div>`;
        for (const it of items) { homeSeen.add(it.id); const idx = homeList.length; homeList.push(it); const c = card(it, () => openFeed(homeList, idx, homeSrc)); cardItem.set(c, it); grid.append(c); }
      } catch (e) { if (tok === homeTok) { grid.querySelectorAll(".skc").forEach((x) => x.remove()); if (!homeList.length) grid.innerHTML = `<div class="empty"><span class="big">🙈</span>${esc(e.message || "Không tải được")}<br><button class="pill" style="margin-top:14px" id="retry">Thử lại</button></div>`; const r = $("retry"); if (r) r.onclick = loadHome; } }
      finally { homeBusy = false; }
    };
    await homeMore();
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && tok === homeTok && view === "home") homeMore(); }, { rootMargin: "600px" });
    io.observe(sec.querySelector(".sent"));
  }

  // ---------- tìm ----------
  let sKind = "";
  $("sf").onsubmit = (e) => { e.preventDefault(); const q = $("q").value.trim(); $("q").blur(); if (q) doSearch(q); };
  $("q").addEventListener("focus", () => { if (view !== "search") { show("search"); renderSearchHome(); } });
  function renderSearchHome() {
    const box = $("vSearch"); box.innerHTML = "";
    if (!recentQ.length) { box.innerHTML = `<div class="empty"><span class="big">🔎</span>Gõ thứ bạn muốn xem: món ăn, nơi du lịch, kênh yêu thích…</div>`; return; }
    const s = document.createElement("div"); s.className = "set"; s.innerHTML = `<h4>Tìm gần đây</h4><div class="box"></div>`;
    recentQ.slice(0, 10).forEach((q) => { const b = document.createElement("div"); b.className = "li"; b.innerHTML = `${I.clock}<span></span><button class="x" aria-label="Xoá">${I.x}</button>`; b.querySelector("span").textContent = q;
      b.onclick = (e) => { if (e.target.closest(".x")) { recentQ = recentQ.filter((x) => x !== q); LS.set("recentQ", recentQ); renderSearchHome(); return; } $("q").value = q; doSearch(q); }; s.querySelector(".box").append(b); });
    box.append(s);
  }
  async function doSearch(q, kind = sKind) {
    sKind = kind; if (view !== "search") show("search");
    recentQ = [q, ...recentQ.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 20); LS.set("recentQ", recentQ);
    const box = $("vSearch"); box.innerHTML = "";
    const seg = document.createElement("div"); seg.className = "seg";
    [["", "Tất cả"], ["video", "Video"], ["long", "Dài > 20 phút"], ["new", "Mới đăng"], ["shorts", "Shorts"]].forEach(([k, n]) => { const b = document.createElement("button"); b.className = "chip" + (k === kind ? " on" : ""); b.textContent = n; b.onclick = () => doSearch(q, k); seg.append(b); });
    const grid = document.createElement("div"); grid.className = "grid"; skeleton(grid, 3);
    const sent = document.createElement("div"); sent.style.height = "40px";
    box.append(seg, grid, sent);
    const list = []; let next = "", busy = false, tok = Symbol();
    box._tok = tok;
    const more = async (first) => {
      if (busy || (!first && !next)) return; busy = true;
      try {
        const d = await search(q, { kind, cont: first ? "" : next }); if (box._tok !== tok) return;
        next = d.next || ""; grid.querySelectorAll(".skc").forEach((x) => x.remove());
        const items = d.items.filter((x) => okItem(x) && !list.some((y) => y.id === x.id));
        if (first && !items.length) grid.innerHTML = `<div class="empty"><span class="big">🤔</span>Không thấy video nào cho “${esc(q)}”.</div>`;
        for (const it of items) { const idx = list.length; list.push(it); const c = card(it, () => openFeed(list, idx, { name: q, more: async () => { if (!next) return []; const d2 = await search(q, { kind, cont: next }); next = d2.next || ""; return d2.items; } })); cardItem.set(c, it); grid.append(c); }
      } catch (e) { grid.innerHTML = `<div class="empty"><span class="big">🙈</span>${esc(e.message)}</div>`; } finally { busy = false; }
    };
    await more(true);
    new IntersectionObserver((es) => { if (es[0].isIntersecting && box._tok === tok) more(false); }, { rootMargin: "600px" }).observe(sent);
  }

  // ---------- trang kênh ----------
  async function openChannel(it, tab = "videos") {
    const ref = it.chId || it.chUrl || it.id || it.url; if (!ref) return;
    if (view !== "kenh") show("kenh");
    const box = $("vKenh"); box.innerHTML = ""; const tok = Symbol(); box._tok = tok;
    const head = document.createElement("div"); head.className = "chhead"; head.innerHTML = avHtml(it.ch || it.name, it.av || it.avatar) + `<div><h2></h2><small></small></div>`;
    head.querySelector("h2").textContent = it.ch || it.name || "Kênh";
    const btns = document.createElement("div"); btns.className = "chbtns";
    const seg = document.createElement("div"); seg.className = "seg";
    const grid = document.createElement("div"); grid.className = "grid"; skeleton(grid, 2);
    box.append(head, btns, seg, grid);
    let d;
    try { d = await api("/channel", { ref, tab }, 3 * 3600e3); } catch (e) { grid.innerHTML = `<div class="empty"><span class="big">🙈</span>${e.norelay ? "Trang kênh cần máy chủ (đang chờ)." : esc(e.message)}</div>`; return; }
    if (box._tok !== tok) return;
    const ch = { name: d.name || it.ch, id: d.id, url: d.url, av: d.avatar };
    head.innerHTML = avHtml(ch.name, ch.av) + `<div><h2></h2><small></small></div>`; head.querySelector("h2").textContent = ch.name; head.querySelector("small").textContent = d.subs ? fmtViews(d.subs).replace("lượt xem", "người theo dõi") : "";
    const paint = () => {
      const fo = isFollow({ chId: ch.id, chUrl: ch.url, ch: ch.name });
      btns.innerHTML = `<button class="pill${fo ? " ghost" : ""}" id="cFo">${fo ? I.check + "Đang theo dõi" : I.plus + "Theo dõi"}</button><button class="pill ghost" id="cBl">${I.ban}Chặn</button>`;
      $("cFo").onclick = () => { setFollow(ch, !fo); paint(); };
      $("cBl").onclick = () => blockChannel({ ch: ch.name, chId: ch.id, chUrl: ch.url }, () => history.back());
    };
    paint();
    seg.innerHTML = ""; [["videos", "Video"], ["shorts", "Shorts"]].forEach(([k, n]) => { const b = document.createElement("button"); b.className = "chip" + (k === tab ? " on" : ""); b.textContent = n; b.onclick = () => openChannel({ ...it, chId: ch.id, chUrl: ch.url, ch: ch.name, av: ch.av }, k); seg.append(b); });
    grid.innerHTML = "";
    const list = d.items.filter(okItem).map((x) => Object.assign(x, { ch: x.ch || ch.name, av: x.av || ch.av }));
    let next = d.next || "";
    const src = { name: ch.name, more: async () => { if (!next) return []; const d2 = await api("/channel", { ref: ch.id, tab, cont: next }, 3600e3); next = d2.next || ""; return d2.items.map((x) => Object.assign(x, { ch: x.ch || ch.name, av: x.av || ch.av })); } };
    if (!list.length) grid.innerHTML = `<div class="empty"><span class="big">📭</span>Kênh chưa có video ở mục này.</div>`;
    list.forEach((x, i) => { const c = card(x, () => openFeed(list, i, src)); cardItem.set(c, x); grid.append(c); });
  }
  function setFollow(ch, on) {
    const f = { id: ch.id || ch.chId || "", url: ch.url || ch.chUrl || "", name: ch.name || ch.ch || "", av: ch.av || ch.avatar || "", at: Date.now() };
    follows = on ? [f, ...follows.filter((x) => !sameCh(x, f))] : follows.filter((x) => !sameCh(x, f));
    LS.set("follows", follows); toast(on ? "Đã theo dõi " + f.name : "Đã bỏ theo dõi " + f.name);
  }

  // ---------- của tôi ----------
  let libTab = "liked";
  function renderLib() {
    const box = $("vLib"); box.innerHTML = "";
    const seg = document.createElement("div"); seg.className = "seg"; seg.style.paddingTop = "14px";
    const tabs = [["liked", "♥ Đã thích", liked], ["later", "🔖 Xem sau", later], ["hist", "🕘 Lịch sử", hist], ["follows", "📺 Kênh theo dõi", follows]];
    tabs.forEach(([k, n, arr]) => { const b = document.createElement("button"); b.className = "chip" + (k === libTab ? " on" : ""); b.textContent = n + (arr.length ? " · " + arr.length : ""); b.onclick = () => { libTab = k; renderLib(); }; seg.append(b); });
    box.append(seg);
    const wrap = document.createElement("div"); wrap.style.paddingTop = "6px"; box.append(wrap);
    if (libTab === "follows") {
      if (!follows.length) { wrap.innerHTML = `<div class="empty"><span class="big">📺</span>Chạm ＋ trên ảnh kênh khi lướt để theo dõi.</div>`; return; }
      const s = document.createElement("div"); s.className = "set"; s.innerHTML = `<div class="box"></div>`;
      follows.forEach((f) => { const b = document.createElement("div"); b.className = "li"; b.innerHTML = avHtml(f.name, f.av) + `<span></span><button class="x" aria-label="Bỏ theo dõi">${I.x}</button>`; b.querySelector("span").textContent = f.name;
        b.onclick = (e) => { if (e.target.closest(".x")) { setFollow(f, false); renderLib(); return; } openChannel({ chId: f.id, chUrl: f.url, ch: f.name, av: f.av }); }; s.querySelector(".box").append(b); });
      wrap.append(s); return;
    }
    const arr = { liked, later, hist }[libTab].filter((x) => !isBlocked(x));
    if (!arr.length) { wrap.innerHTML = `<div class="empty"><span class="big">${{ liked: "💗", later: "🔖", hist: "🕘" }[libTab]}</span>${{ liked: "Nhấn đúp vào video để thả tim.", later: "Bấm 🔖 trên video để lưu xem sau.", hist: "Video bạn xem sẽ hiện ở đây." }[libTab]}</div>`; return; }
    arr.forEach((it, i) => { const r = row(it, () => openFeed(arr, i, null), (el) => {
      const key = libTab; const before = { liked, later, hist }[key].slice();
      const nw = before.filter((x) => x.id !== it.id); if (key === "liked") liked = nw; else if (key === "later") later = nw; else hist = nw; LS.set(key, nw); el.remove();
      toast("Đã bỏ", "Hoàn tác", () => { if (key === "liked") liked = before; else if (key === "later") later = before; else hist = before; LS.set(key, before); renderLib(); }, 5000);
    }); cardItem.set(r, it); wrap.append(r); });
    if (libTab === "hist") { const c = document.createElement("button"); c.className = "linkbtn"; c.textContent = "Xoá toàn bộ lịch sử"; c.onclick = () => sheet("Xoá toàn bộ lịch sử xem?", [{ icon: I.trash, label: "Xoá lịch sử", red: true, fn: () => { hist = []; LS.set("hist", hist); renderLib(); } }]); wrap.append(c); }
  }

  // ---------- cài đặt ----------
  function li(html, fn) { const b = document.createElement("div"); b.className = "li"; b.innerHTML = html; if (fn) { b.style.cursor = "pointer"; b.onclick = fn; } return b; }
  function swLi(label, sub, on, fn) { const b = li(`<span>${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ""}</span><button class="sw${on ? " on" : ""}" aria-label="${esc(label)}"></button>`); b.onclick = () => { fn(); b.querySelector(".sw").classList.toggle("on"); }; return b; }
  function renderSet(focus) {
    const box = $("vSet"); box.innerHTML = "";
    const s = document.createElement("div"); s.className = "set"; box.append(s);
    const sec = (title, id) => { const h = document.createElement("h4"); h.textContent = title; if (id) h.id = "set-" + id; const b = document.createElement("div"); b.className = "box"; s.append(h, b); return b; };
    // chủ đề
    const tb = sec("Chủ đề của bạn", "topics");
    topics.forEach((t, i) => {
      const r = li(`<span class="em">${esc(t.e)}</span><span></span><button class="x" data-a="up" aria-label="Lên">${I.up}</button><button class="x" data-a="dn" aria-label="Xuống">${I.down}</button><button class="x" data-a="rm" aria-label="Xoá">${I.x}</button>`);
      r.querySelectorAll("span")[1].textContent = t.n;
      r.onclick = (e) => { const a = e.target.closest("[data-a]"); if (!a) return; const k = a.dataset.a;
        if (k === "rm") { removeTopic(i); return; }
        const j = k === "up" ? i - 1 : i + 1; if (j < 0 || j >= topics.length) return; [topics[i], topics[j]] = [topics[j], topics[i]]; LS.set("topics", topics); renderSet("topics"); renderChips(); };
      tb.append(r);
    });
    const ar = document.createElement("form"); ar.className = "inrow"; ar.innerHTML = `<input placeholder="Thêm chủ đề: vd. cắm trại, cờ vua…" maxlength="40"><button>Thêm</button>`;
    ar.onsubmit = (e) => { e.preventDefault(); const v = ar.querySelector("input").value; if (addTopicByName(v)) { renderSet("topics"); renderChips(); toast("Đã thêm “" + v.trim() + "”"); } };
    tb.append(ar);
    const sug = PRESETS.filter((p) => !topics.some((t) => t.n === p.n));
    if (sug.length) { const k = document.createElement("div"); k.className = "kwrow"; sug.forEach((p) => { const b = document.createElement("button"); b.className = "chip"; b.textContent = p.e + " " + p.n; b.onclick = () => { addTopicByName(p.n); renderSet("topics"); renderChips(); }; k.append(b); }); tb.append(k); }
    // xem
    const xb = sec("Khi xem");
    xb.append(swLi("Phụ đề tiếng Việt", "Hiện khi video có sẵn phụ đề Việt", cfg.cc, () => { cfg.cc = !cfg.cc; saveCfg(); }),
      swLi("Ẩn Shorts", "Không hiện video ngắn dọc", cfg.hideShorts, () => { cfg.hideShorts = !cfg.hideShorts; saveCfg(); }),
      swLi("Tự sang video kế khi hết", "", cfg.autoNext, () => { cfg.autoNext = !cfg.autoNext; saveCfg(); }));
    // chặn
    const bb = sec("Kênh đã chặn");
    if (!blocked.length) bb.append(li(`<span><small>Chưa chặn kênh nào. Bấm ⋯ trên video → Chặn kênh.</small></span>`));
    blocked.forEach((b) => { const r = li(`<span class="em">🚫</span><span></span><button class="x" aria-label="Bỏ chặn">${I.x}</button>`); r.querySelectorAll("span")[1].textContent = b.name || b.chUrl || b.chId;
      r.querySelector(".x").onclick = () => { blocked = blocked.filter((x) => x !== b); LS.set("blocked", blocked); toast("Đã bỏ chặn " + (b.name || "kênh")); renderSet(); }; bb.append(r); });
    const kb = sec("Từ khoá không muốn thấy");
    const kr = document.createElement("div"); kr.className = "kwrow";
    if (!kws.length) kr.innerHTML = `<span style="color:var(--mut);font-size:13px">Video có từ này trong tiêu đề sẽ bị ẩn.</span>`;
    kws.forEach((k) => { const c = document.createElement("span"); c.className = "kw"; c.textContent = k; const x = document.createElement("button"); x.innerHTML = I.x; x.onclick = () => { kws = kws.filter((y) => y !== k); LS.set("kws", kws); renderSet(); }; c.append(x); kr.append(c); });
    const kf = document.createElement("form"); kf.className = "inrow"; kf.innerHTML = `<input placeholder="vd. kinh dị, drama…" maxlength="30"><button>Chặn</button>`;
    kf.onsubmit = (e) => { e.preventDefault(); const v = kf.querySelector("input").value.trim(); if (!v) return; kws = [...new Set([...kws, v])]; LS.set("kws", kws); renderSet(); };
    kb.append(kr, kf);
    // dữ liệu
    const db = sec("Chuyển sang máy khác");
    db.append(li(`<span class="em">📤</span><span>Xuất cài đặt<small>Lưu 1 tệp: chủ đề, tim, xem sau, kênh theo dõi…</small></span>`, exportAll),
      li(`<span class="em">📥</span><span>Nhập cài đặt<small>Mở tệp đã xuất từ máy khác</small></span>`, () => $("fileIn").click()));
    // hướng dẫn
    const gb = sec("Hướng dẫn");
    const g = document.createElement("div"); g.className = "guide";
    [["1-man-hinh-chinh.jpg", "Thêm vào Màn hình chính"], ["2-chon-chu-de.jpg", "Chọn chủ đề"], ["3-luot.jpg", "Lướt, thả tim, theo dõi"], ["4-phu-de.jpg", "Phụ đề, xem ngang, chặn kênh"]].forEach(([f, n]) => {
      const im = document.createElement("img"); im.loading = "lazy"; im.src = "huong-dan/" + f; im.alt = n; im.onclick = () => { $("zoom").querySelector("img").src = im.src; $("zoom").classList.add("on"); }; g.append(im); });
    gb.append(g);
    // máy chủ
    const mb = sec("Máy chủ");
    const st = li(`<span class="dot ${relayOk ? "ok" : relayOk === false ? "bad" : ""}"></span><span>${relayOk ? "Đang chạy" : RELAY() ? (relayOk === false ? "Chưa kết nối được" : "Đang kiểm tra…") : "Đang chờ máy chủ (dùng video mẫu)"}<small>${esc(RELAY() || "chưa cài")}</small></span>`);
    mb.append(st);
    const ver = document.createElement("div"); ver.className = "ver"; ver.textContent = "VũTube.cơm · phiên bản " + VER + " · dữ liệu chỉ lưu trên máy này"; s.append(ver);
    if (focus) { const el = $("set-" + focus); if (el) setTimeout(() => el.scrollIntoView({ block: "start", behavior: "smooth" }), 60); }
  }
  $("zoom").onclick = () => $("zoom").classList.remove("on");

  // ---------- xuất / nhập (chuyển máy) ----------
  async function exportAll() {
    const data = { app: "vutube.com", v: 1, at: new Date().toISOString(), cfg, topics, liked, later, hist, follows, blocked, kws, taste, recentQ };
    const name = "VuTube-cai-dat-" + new Date().toISOString().slice(0, 10) + ".json";
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    try { const f = new File([blob], name, { type: "application/json" }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "Cài đặt VũTube.cơm" }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    toast("Đã lưu tệp " + name);
  }
  $("fileIn").onchange = async () => {
    const f = $("fileIn").files[0]; $("fileIn").value = ""; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d.app !== "vutube.com") throw new Error("Tệp không phải của VũTube.cơm");
      sheet("Nhập cài đặt từ tệp này? (thay cho cài đặt hiện tại)", [{ icon: I.check, label: "Nhập", fn: () => {
        cfg = Object.assign(cfg, d.cfg || {}); topics = Array.isArray(d.topics) && d.topics.length ? d.topics : topics;
        liked = d.liked || []; later = d.later || []; hist = d.hist || []; follows = d.follows || []; blocked = d.blocked || []; kws = d.kws || []; taste = d.taste || {}; recentQ = d.recentQ || [];
        saveAll(); $("welcome").classList.add("hide"); toast("Đã nhập cài đặt"); show("home"); loadHome();
      } }]);
    } catch (e) { toast(e.message || "Tệp hỏng"); }
  };

  // ---------- chào lần đầu: chọn chủ đề ----------
  function welcome() {
    const w = $("welcome"); w.classList.remove("hide");
    const sel = new Set(), custom = [];
    w.innerHTML = `<div class="hero"><img src="icons/icon-512.png" alt=""><h1>Vũ<span>Tube</span>.cơm</h1><p>Lướt video theo đúng thứ bạn thích. Không tài khoản — mọi thứ lưu ngay trên máy bạn.</p></div>
      <h2>Bạn thích xem gì? <small style="color:var(--mut);font-weight:600">(chọn vài cái)</small></h2><div class="tiles" id="wTiles"></div>
      <form class="addt" id="wAdd"><input placeholder="Hoặc tự gõ: cắm trại, cờ vua…" maxlength="40"><button>Thêm</button></form>
      <button class="linkbtn" id="wImp">Đã dùng ở máy khác? Nhập cài đặt</button>
      <div class="wfoot"><button class="bigbtn" id="wGo" disabled>Chọn ít nhất 1 chủ đề</button></div>`;
    const tiles = $("wTiles");
    const paintGo = () => { const n = sel.size; $("wGo").disabled = !n; $("wGo").textContent = n ? `Bắt đầu lướt (${n} chủ đề) 🚀` : "Chọn ít nhất 1 chủ đề"; };
    const tile = (t, on) => { const b = document.createElement("button"); b.className = "tile" + (on ? " on" : ""); b.style.animationDelay = (tiles.children.length * 25) + "ms";
      b.innerHTML = `<span class="em">${esc(t.e)}</span><span></span><i class="ck">✓</i>`; b.querySelectorAll("span")[1].textContent = t.n;
      b.onclick = () => { if (sel.has(t.n)) sel.delete(t.n); else sel.add(t.n); b.classList.toggle("on", sel.has(t.n)); paintGo(); try { navigator.vibrate && navigator.vibrate(8); } catch (_) {} };
      tiles.append(b); if (on) sel.add(t.n); };
    PRESETS.forEach((p) => tile(p, false));
    $("wAdd").onsubmit = (e) => { e.preventDefault(); const inp = $("wAdd").querySelector("input"), v = inp.value.trim().slice(0, 40); if (!v) return;
      if ([...PRESETS, ...custom].some((t) => fold(t.n) === fold(v))) { const p = [...PRESETS, ...custom].find((t) => fold(t.n) === fold(v)); sel.add(p.n); [...tiles.children].forEach((b) => b.classList.toggle("on", sel.has(b.querySelectorAll("span")[1].textContent))); paintGo(); inp.value = ""; return; }
      const t = { e: pickR(EMO), n: v, q: [v], near: [] }; custom.push(t); tile(t, true); paintGo(); inp.value = ""; };
    $("wImp").onclick = () => $("fileIn").click();
    $("wGo").onclick = () => {
      topics = [...PRESETS, ...custom].filter((t) => sel.has(t.n)).map((t) => Object.assign({}, t));
      LS.set("topics", topics); cfg.topic = 0; saveCfg();
      w.classList.add("hide"); show("home", false); loadHome();
    };
    paintGo();
  }

  // ================= LƯỚT kiểu mạng xã hội =================
  let lList = [], lIdx = -1, lSrc = null, lMoreBusy = false;
  let Pl = null; // video đang phát: {slide, it, player, state, ...}
  let ytP = null;
  function loadYT() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (!ytP) ytP = new Promise((res, rej) => { const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { prev && prev(); res(window.YT); };
      const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; s.onerror = () => { ytP = null; rej(new Error("Không vào được YouTube")); }; document.head.append(s); });
    return ytP;
  }
  let gestured = false;
  addEventListener("pointerdown", () => { gestured = true; }, { capture: true });
  addEventListener("keydown", () => { gestured = true; }, { capture: true });
  async function openFeed(list, idx, src) {
    if (!list || !list.length) {
      show("luot"); $("lfeed").innerHTML = `<div class="slide"><div class="empty" style="padding-top:40vh"><span class="big">🍚</span>Đang tìm video…</div></div>`;
      lSrc = src || curSource(); const items = (await lSrc.more().catch(() => [])).filter(okItem);
      if (!items.length) { $("lfeed").innerHTML = `<div class="slide"><div class="empty" style="padding-top:40vh"><span class="big">🙈</span>Chưa có video để lướt.</div></div>`; return; }
      list = items; idx = 0; src = lSrc;
    }
    if (view !== "luot") show("luot");
    stopP();
    lList = []; lIdx = -1; lSrc = src;
    const feed = $("lfeed"); feed.innerHTML = "";
    $("lTitle").innerHTML = esc(src && src.name ? src.name : "Lướt");
    const start = list.slice(idx).filter(okItem), before = list.slice(0, idx).filter(okItem);
    luotAdd([...start, ...before]);
    feed.scrollTop = 0;
    activate(0);
  }
  function luotAdd(items, at) {
    const feed = $("lfeed"), seen = new Set(lList.map((x) => x.id));
    const add = items.filter((x) => x && x.id && !seen.has(x.id) && okItem(x) && (seen.add(x.id), true));
    add.forEach((it, k) => { const pos = at == null ? lList.length : at + k; lList.splice(pos, 0, it); feed.insertBefore(slideEl(it), feed.children[pos] || null); });
    [...feed.children].forEach((c, i) => { c.dataset.i = i; });
    return add.length;
  }
  async function luotFill() {
    if (lMoreBusy) return; lMoreBusy = true;
    try {
      let items = [];
      if (lSrc && lSrc.more) items = await lSrc.more().catch(() => []);
      const cur = lList[lIdx];
      if (items.filter(okItem).length < 4 && cur) { const r = await related(cur).catch(() => []); items = items.concat(r); }
      luotAdd(shuffle(items).slice(0, 20));
    } finally { lMoreBusy = false; }
  }
  async function related(it) {
    try { const d = await api("/related", { id: it.id, title: it.title, ch: it.chUrl || it.chId }, 6 * 3600e3); return d.items.filter(okItem).map((x) => (it._tp ? Object.assign(x, { _tp: it._tp }) : x)); }
    catch (e) { if (e.norelay) return (await seedFor(it._tp || "")).filter((x) => x.id !== it.id).slice(0, 10); throw e; }
  }
  const HEART_S = '<svg class="i" viewBox="0 0 24 24" style="color:#ff4d8d;width:18px;height:18px"><path d="M12 20.5s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.6c0 5.7-7.5 10.3-7.5 10.3z" fill="currentColor"/></svg>';
  function slideEl(it) {
    const d = document.createElement("div"); d.className = "slide " + (it.short ? "v" : "h");
    const fo = isFollow(it);
    d.innerHTML = `<div class="bgb" style="background-image:url('${bigThumb(it)}')"></div>
      <div class="pw" style="background-image:url('${bigThumb(it)}')"><div class="pcov" style="background-image:url('${bigThumb(it)}')"><div class="ld"></div><span>${I.play}</span></div></div>
      <div class="tapz"></div>
      <button class="unmute">${I.vol}Chạm để bật tiếng</button>
      <div class="sinfo"><div class="chn">${avHtml(it.ch, it.av).replace('class="av"', 'class="av" style="width:26px;height:26px;font-size:12px;' + (it.av ? `background-image:url('${esc(it.av)}')` : "background:" + colorOf(it.ch)) + '"')}<span></span></div><b></b><small></small></div>
      <button class="landbtn" data-a="land">${I.land}Xem ngang</button>
      <div class="srail2"><div class="rgrp">
        <div class="avb${fo ? " fo" : ""}${it.chId || it.chUrl ? "" : " noch"}" data-a="ch" title="${esc(it.ch || "")}">${avHtml(it.ch, it.av)}<b data-a="fo">${fo ? "✓" : "+"}</b></div>
        <button class="rb${isLiked(it.id) ? " on" : ""}" data-a="like" data-r="like" title="Thích (nhấn đúp video)">${isLiked(it.id) ? I.heartOn : I.heart}</button>
        <button class="rb sv${isLater(it.id) ? " on" : ""}" data-a="later" data-r="later" title="Xem sau">${isLater(it.id) ? I.bmOn : I.bm}</button>
        <button class="rb${cfg.cc ? "" : " off"}" data-a="cc" data-r="cc" title="Phụ đề tiếng Việt">${cfg.cc ? I.cc : I.ccOff}</button>
        <button class="rb" data-a="more" title="Thêm">${I.dotsH}</button>
      </div><button class="rb rtog" data-a="tog" aria-label="Mở nút">${isLiked(it.id) ? HEART_S : I.chev}</button></div>
      <div class="lpb"><em><i></i><b class="kn"></b></em><span class="lt"></span></div>`;
    d.querySelector(".sinfo span").textContent = it.ch ? "@" + it.ch.replace(/^@/, "") : "";
    if (!it.ch) d.querySelector(".sinfo .chn").style.display = "none";
    d.querySelector(".sinfo b").textContent = it.title; d.querySelector(".sinfo small").textContent = [fmtViews(it.views), viAgo(it.ago), it.dur && !it.short ? fmtDur(it.dur) : ""].filter(Boolean).join(" · ");
    d.querySelector(".sinfo .chn").onclick = (e) => { e.stopPropagation(); if (it.chId || it.chUrl) openChannel(it); };
    const rail = d.querySelector(".srail2");
    rail.onclick = (e) => { const b = e.target.closest("[data-a]"); if (!b) return; e.stopPropagation(); if (b.dataset.a === "tog") { railOpen(rail, !rail.classList.contains("open") || performance.now() - (rail._hov || 0) < 600); return; } railOpen(rail, true); act(it, b.dataset.a, d); };
    rail.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { if (!rail.classList.contains("open")) rail._hov = performance.now(); railOpen(rail, true); } }); rail.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") railClose(rail, 1500); }); // chạm trên điện thoại cũng sinh sự kiện chuột giả: chỉ mở khi là chuột thật
    d.querySelector(".landbtn").onclick = (e) => { e.stopPropagation(); act(it, "land", d); };
    d.querySelector(".unmute").onclick = (e) => { e.stopPropagation(); if (Pl && Pl.slide === d && Pl.player) unmuteNow(); };
    let lastTap = 0, tapT = 0;
    d.querySelector(".tapz").addEventListener("click", (e) => {
      const t = performance.now();
      if (t - lastTap < 300) { clearTimeout(tapT); lastTap = 0; heartAt(e.clientX, e.clientY); if (!isLiked(it.id)) act(it, "like", d); return; }
      lastTap = t;
      tapT = setTimeout(() => togglePlay(d), 260);
    });
    { // thanh tua: chạm / kéo để tua, thả tay mới tua thật; khi kéo hoặc dừng: vạch dày + núm + giờ
      const pb = d.querySelector(".lpb"), bar = pb.querySelector("i"), kn = pb.querySelector(".kn"), lt = pb.querySelector(".lt"); let drag = false;
      const frac = (e) => { const r = pb.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); };
      const durOf = () => { const s = Pl; return s && s.slide === d && s.player && s.player.getDuration ? s.player.getDuration() || 0 : 0; };
      const paint = (f) => { const dur = durOf(); bar.style.width = (f * 100).toFixed(2) + "%"; kn.style.left = (f * 100).toFixed(2) + "%";
        lt.textContent = fmtT(f * dur) + " / " + fmtT(dur); lt.style.left = Math.min(84, Math.max(16, f * 100)).toFixed(1) + "%"; };
      pb.addEventListener("pointerdown", (e) => { const s = Pl; if (!s || s.slide !== d || !s.player) return; e.preventDefault(); e.stopPropagation(); drag = true; pb.classList.add("drag"); try { pb.setPointerCapture(e.pointerId); } catch (_) {} paint(frac(e)); });
      pb.addEventListener("pointermove", (e) => { if (drag) { e.preventDefault(); paint(frac(e)); } });
      const end = (e) => { if (!drag) return; drag = false; pb.classList.remove("drag"); const s = Pl, dur = durOf(); if (!s || !dur) return;
        s.player.seekTo(dur * frac(e), true); if (!s.userPaused) s.player.playVideo(); };
      pb.addEventListener("pointerup", end); pb.addEventListener("pointercancel", () => { drag = false; pb.classList.remove("drag"); });
      pb.addEventListener("click", (e) => e.stopPropagation()); pb._drag = () => drag; pb._paint = paint;
    }
    return d;
  }
  function togglePlay(d) {
    const s = Pl; if (!s || s.slide !== d) return;
    if (!s.player) return;
    if (d.classList.contains("tap") || s.state !== 1) { d.classList.remove("tap"); s.userPaused = false; if (ypMuted) unmuteNow(); s.player.playVideo(); }
    else if (ypMuted && !TEST) unmuteNow(); // đang câm: chạm = bật tiếng (như mạng xã hội), chạm lần nữa mới dừng
    else { s.userPaused = true; s.player.pauseVideo(); }
  }
  function heartAt(x, y) {
    const h = document.createElement("div"); h.className = "heartfx"; h.innerHTML = I.heartOn.replace('class="i"', 'width="96" height="96"');
    h.style.left = x + "px"; h.style.top = y + "px"; document.body.append(h);
    const rot = (Math.random() * 30 - 15).toFixed(0);
    h.animate([{ transform: `scale(.2) rotate(${rot}deg)`, opacity: 0 }, { transform: `scale(1.15) rotate(${rot}deg)`, opacity: 1, offset: .25 }, { transform: `scale(1) rotate(${rot}deg)`, opacity: 1, offset: .55 },
      { transform: `translateY(-120px) scale(.7) rotate(${rot}deg)`, opacity: 0 }], { duration: 900, easing: "cubic-bezier(.2,.8,.2,1)" }).onfinish = () => h.remove();
    try { navigator.vibrate && navigator.vibrate(18); } catch (_) {}
  }
  function paintRails(fn) { document.querySelectorAll("#lfeed .slide").forEach((sl, i) => { const x = lList[i]; if (x) fn(sl, x); }); }
  function act(it, a, d) {
    if (a === "like") {
      const on = !isLiked(it.id);
      liked = on ? [Object.assign(pick(it), { at: Date.now() }), ...liked.filter((x) => x.id !== it.id)].slice(0, 500) : liked.filter((x) => x.id !== it.id);
      LS.set("liked", liked);
      const r = d.querySelector('[data-r="like"]'); r.classList.toggle("on", on); r.innerHTML = on ? I.heartOn : I.heart;
      r.animate([{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(1)" }], { duration: 380, easing: "cubic-bezier(.3,1.4,.5,1)" });
      d.querySelector(".rtog").innerHTML = on ? HEART_S : I.chev;
      if (on) addTaste(it._tp, 2);
    } else if (a === "later") {
      toggleLater(it); const on = isLater(it.id), r = d.querySelector('[data-r="later"]'); r.classList.toggle("on", on); r.innerHTML = on ? I.bmOn : I.bm;
    } else if (a === "cc") {
      cfg.cc = !cfg.cc; saveCfg();
      paintRails((sl) => { const b = sl.querySelector('[data-r="cc"]'); b.innerHTML = cfg.cc ? I.cc : I.ccOff; b.classList.toggle("off", !cfg.cc); });
      if (Pl && Pl.slide === d) applyCc(Pl, true);
    } else if (a === "fo") {
      const on = !isFollow(it);
      const doIt = () => { setFollow({ id: it.chId, url: it.chUrl, name: it.ch, av: it.av }, on); paintRails((sl, x) => { if (!sameCh(x, it)) return; const v = sl.querySelector(".avb"); v.classList.toggle("fo", on); const bb = v.querySelector("b"); bb.textContent = on ? "✓" : "+"; bb.animate([{ transform: "scale(.4) rotate(-90deg)" }, { transform: "none" }], { duration: 380, easing: "cubic-bezier(.3,1.4,.5,1)" }); }); if (on) addTaste(it._tp, 1); };
      if (on) doIt(); else sheet("Bỏ theo dõi " + (it.ch || "kênh") + "?", [{ icon: I.x, label: "Bỏ theo dõi", fn: doIt }]);
    } else if (a === "ch") { if (it.chId || it.chUrl) openChannel(it); }
    else if (a === "more") sheet(it.title, [
      { icon: I.share, label: "Chia sẻ", fn: () => share(it) },
      { icon: I.yt, label: "Mở trên YouTube", fn: () => { const t = Pl && Pl.slide === d && Pl.player && Pl.player.getCurrentTime ? Math.floor(Pl.player.getCurrentTime()) : 0; open("https://www.youtube.com/watch?v=" + it.id + (t > 5 ? "&t=" + t + "s" : ""), "_blank", "noopener"); } },
      { icon: I.next, label: "Tự sang video kế khi hết", on: cfg.autoNext, fn: () => { cfg.autoNext = !cfg.autoNext; saveCfg(); } },
      ...(it.chId || it.chUrl ? [{ icon: I.ban, label: "Chặn kênh " + (it.ch || "này"), red: true, fn: () => blockChannel(it) }] : []),
    ]);
    else if (a === "land") { if (Pl && Pl.slide === d) setFull(true); }
  }
  function luotDropBlocked() {
    const curBlocked = isBlocked(lList[lIdx]);
    if (curBlocked) luotGo(1);
    setTimeout(() => {
      const feed = $("lfeed"), keep = Pl && Pl.slide;
      for (let i = lList.length - 1; i >= 0; i--) if (isBlocked(lList[i]) && feed.children[i] !== keep) { lList.splice(i, 1); feed.children[i].remove(); }
      [...feed.children].forEach((c, i) => { c.dataset.i = i; });
      lIdx = Math.max(0, [...feed.children].indexOf(keep));
      if (keep) keep.scrollIntoView({ block: "start" });
    }, curBlocked ? 1200 : 0);
  }
  function railOpen(r, on) { clearTimeout(r._t); r.classList.toggle("open", on); if (on) r._t = setTimeout(() => r.classList.remove("open"), 3500); }
  function railClose(r, ms) { clearTimeout(r._t); r._t = setTimeout(() => r.classList.remove("open"), ms || 0); }
  document.addEventListener("pointerdown", (e) => { if (view !== "luot") return; document.querySelectorAll(".srail2.open").forEach((r) => { if (!r.contains(e.target)) railClose(r, 0); }); });

  function activate(i) {
    if (view !== "luot") return;
    const slide = $("lfeed").children[i], it = lList[i];
    if (!slide || !it || (Pl && Pl.slide === slide)) return;
    lIdx = i;
    if (it.short && document.body.classList.contains("full")) setFull(false);
    play(slide, it);
    if (i >= lList.length - 3) luotFill();
  }
  // cuộn: thẻ nằm đúng chỗ là phát ngay (không chờ IntersectionObserver + trễ); khung phát dùng chung trượt theo thẻ đang phát
  let scT = 0, scRaf = 0;
  $("lfeed").addEventListener("scroll", () => {
    if (!scRaf) scRaf = requestAnimationFrame(() => { scRaf = 0; plFollow(); });
    const f = $("lfeed"), h = f.clientHeight || 1, k = Math.round(f.scrollTop / h);
    clearTimeout(scT);
    if (Math.abs(f.scrollTop - k * h) < 2) activate(k); // đã dừng đúng thẻ
    else scT = setTimeout(() => activate(Math.round(f.scrollTop / h)), 120); // dự phòng khi cuộn dừng lệch
  }, { passive: true });
  // ---- 1 trình phát YouTube DÙNG CHUNG cho mọi thẻ: đổi bài bằng loadVideoById (không tạo iframe mới) -> phát nhanh,
  //      iPhone giữ quyền tự phát + giữ tiếng đã bật cho bài sau. Khung phát nằm dưới danh sách thẻ, trượt theo thẻ đang phát.
  let YP = null, ypReady = false, ypMuted = true, ypMaking = null;
  const PL = $("pl");
  function plFollow() {
    if (!Pl || document.body.classList.contains("full")) { PL.style.transform = ""; return; }
    const f = $("lfeed"); PL.style.transform = `translate3d(0,${Pl.slide.offsetTop - f.scrollTop}px,0)`;
  }
  function makeYP() {
    if (ypMaking) return ypMaking;
    ypMaking = loadYT().then((YT) => new Promise((res) => {
      YP = new YT.Player("ytHost", {
        host: "https://www.youtube.com", width: "100%", height: "100%",
        playerVars: { playsinline: 1, controls: 0, rel: 0, modestbranding: 1, autoplay: 1, mute: 1, fs: 0, iv_load_policy: 3, cc_load_policy: 0, disablekb: 1, origin: location.origin, hl: "vi", cc_lang_pref: "vi" },
        events: {
          onReady: () => { ypReady = true; YP.mute(); res(YP); },
          onStateChange: (e) => { const s = Pl; if (s && s.player) onState(s, e.data); },
          onError: (e) => { const s = Pl; if (s && s.player) noEmbed(s, e.data); },
        },
      });
    }));
    ypMaking.catch(() => { ypMaking = null; });
    return ypMaking;
  }
  function stopP() {
    const s = Pl; Pl = null; if (!s) return;
    clearInterval(s.tick); clearInterval(s.noEmbT); clearTimeout(s.t1); clearTimeout(s.t2); savePos(s, true);
    s.slide.classList.remove("noemb", "playing", "paused", "tap", "muted", "act"); s.slide.querySelectorAll(".blk").forEach((x) => x.remove());
    s.slide.querySelector(".lpb i").style.width = "0";
    s.player = null;
  }
  function unmuteNow() { // chỉ gọi trong cú chạm: iPhone cho bật tiếng khi có thao tác của người dùng, giữ cho các bài sau
    if (!YP || TEST) return;
    try { YP.unMute(); YP.setVolume(100); ypMuted = false; YP.playVideo(); } catch (_) {}
    document.querySelectorAll("#lfeed .slide.muted").forEach((x) => x.classList.remove("muted"));
  }
  async function play(slide, it) {
    stopP();
    const s = Pl = { slide, it, player: null, state: -1, userPaused: false, t0: performance.now(), ccTried: 0 };
    slide.classList.add("act");
    PL.className = "pl " + (it.short ? "v" : "h"); PL.querySelector(".bgb").style.backgroundImage = `url('${bigThumb(it)}')`; plFollow();
    const prev = hist.find((h) => h.id === it.id);
    hist = [Object.assign(pick(it), { pos: prev ? prev.pos || 0 : 0, at: Date.now() }), ...hist.filter((h) => h.id !== it.id)].slice(0, 300); LS.set("hist", hist);
    const start = prev && prev.pos > 15 && (!it.dur || prev.pos < it.dur - 20) ? Math.floor(prev.pos) : 0;
    try { await makeYP(); } catch (e) { toast("Điện thoại chưa vào được YouTube — kiểm tra mạng"); return; }
    if (Pl !== s) return;
    s.player = YP;
    if (ypMuted || TEST) slide.classList.add("muted");
    try { YP.loadVideoById({ videoId: it.id, startSeconds: start }); } catch (_) {}
    s.t1 = setTimeout(() => { if (Pl === s && s.state !== 1 && !s.userPaused) try { YP.playVideo(); } catch (_) {} }, 2500); // mạng chậm: thử phát lại
    s.t2 = setTimeout(() => { if (Pl === s && s.state !== 1 && !s.userPaused) slide.classList.add("tap"); }, 6000);
    if (start) toast("Xem tiếp từ " + fmtDur(start), "Từ đầu", () => { if (Pl === s) YP.seekTo(0, true); }, 4000);
    s.tick = setInterval(() => tick(s), 250);
  }
  // video chủ kênh cấm nhúng / không có sẵn: che màn lỗi của YouTube bằng khung gọn của mình + nút mở YouTube, tự sang bài kế
  function noEmbed(s, code) {
    if (Pl !== s || s.slide.querySelector(".blk")) return;
    const d = s.slide, it = s.it; d.classList.remove("playing", "tap"); d.classList.add("noemb");
    const gone = code === 100 || code === 2, t = Math.floor(posOf(it.id) || 0);
    const box = document.createElement("div"); box.className = "blk";
    box.innerHTML = `<div class="bi">${gone ? "🙈" : "🔒"}</div><b>${gone ? "Video không còn trên YouTube" : "Chủ kênh chỉ cho xem trên YouTube"}</b>
      ${gone ? "" : `<button class="pill" data-a="yt">${I.yt}Xem trên YouTube</button>`}
      <small><span class="cd">Tự sang video kế sau 6 giây</span> · <button data-a="stay">Ở lại</button></small>`;
    d.append(box);
    let n = 6; const cd = box.querySelector(".cd");
    const tm = setInterval(() => { if (Pl !== s) { clearInterval(tm); return; } n--; cd.textContent = n > 0 ? `Tự sang video kế sau ${n} giây` : "Đang sang video kế…"; if (n <= 0) { clearInterval(tm); luotGo(1); } }, 1000);
    s.noEmbT = tm;
    box.onclick = (e) => { e.stopPropagation(); const b = e.target.closest("[data-a]"); if (!b) return;
      clearInterval(tm); cd.textContent = "Đã dừng tự sang";
      if (b.dataset.a === "yt") open("https://www.youtube.com/watch?v=" + it.id + (t > 5 ? "&t=" + t + "s" : ""), "_blank", "noopener"); // iPhone có app YouTube: tự mở app
    };
  }
  function onState(s, st) {
    if (Pl !== s) return;
    try { const vd = YP.getVideoData && YP.getVideoData(); if (vd && vd.video_id && vd.video_id !== s.it.id) return; } catch (_) {} // sự kiện còn sót của bài trước
    s.state = st;
    const d = s.slide;
    if (st === 1) { d.classList.add("playing"); d.classList.remove("paused", "tap"); if (!s.ccTried++) setTimeout(() => applyCc(s), 1200); if (!TEST && !ypMuted) d.classList.remove("muted"); }
    if (st === 2) { if (s.userPaused) d.classList.add("paused"); savePos(s, true); }
    if (st === 0) { savePos(s, true); if (cfg.autoNext) setTimeout(() => Pl === s && luotGo(1), 400); else { d.classList.add("paused"); s.userPaused = true; } }
  }
  function tick(s) {
    if (Pl !== s || !s.player || !s.player.getDuration) return;
    const dur = s.player.getDuration() || 0, t = s.player.getCurrentTime ? s.player.getCurrentTime() || 0 : 0;
    const pb = s.slide.querySelector(".lpb"); if (pb && !pb._drag()) pb._paint(dur ? t / dur : 0);
    s.slide.classList.toggle("paused", s.state === 2 && s.userPaused);
    if (dur > 5 && t > dur - 0.8 && !s.autoNexted && s.state === 1) { s.autoNexted = true; if (cfg.autoNext) luotGo(1); else { s.player.pauseVideo(); s.userPaused = true; } } // không để màn kết thúc của YouTube hiện
    if (performance.now() - (s.posAt || 0) > 5000) savePos(s);
  }
  function savePos(s, force) {
    if (!s || !s.player || !s.player.getCurrentTime) return;
    let t = 0; try { t = s.player.getCurrentTime() || 0; } catch (_) { return; }
    s.posAt = performance.now();
    const h = hist.find((x) => x.id === s.it.id); if (!h) return;
    h.pos = Math.floor(t); try { const d = s.player.getDuration(); if (d) h.dur = Math.round(d); } catch (_) {}
    if (force || true) LS.set("hist", hist);
  }
  // phụ đề: chỉ dùng phụ đề tiếng Việt CÓ SẴN của video; không có thì tắt hẳn (không hiện phụ đề tiếng khác)
  function applyCc(s, fromBtn) {
    if (!s || !s.player || Pl !== s) return;
    const p = s.player;
    if (!cfg.cc) { try { p.setOption("captions", "track", {}); p.unloadModule("captions"); p.unloadModule("cc"); } catch (_) {} return; }
    try { p.loadModule("captions"); } catch (_) {}
    let n = 0;
    const tryVi = () => {
      if (Pl !== s) return;
      let tl = []; try { tl = p.getOption("captions", "tracklist") || []; } catch (_) {}
      const vi = tl.find((t) => /^vi/i.test(t.languageCode || "") && !/asr/.test(t.kind || ""));
      if (vi) { try { p.setOption("captions", "track", { languageCode: vi.languageCode }); s.hasVi = true; } catch (_) {} if (fromBtn) toast("Đã bật phụ đề tiếng Việt"); return; }
      if (++n < 4) { setTimeout(tryVi, 900); return; }
      s.hasVi = false; try { p.setOption("captions", "track", {}); p.unloadModule("captions"); } catch (_) {}
      if (fromBtn) toast("Video này chưa có phụ đề tiếng Việt");
    };
    setTimeout(tryVi, 700);
  }
  function luotGo(dlt) { const f = $("lfeed"), n = f.children[Math.max(0, lIdx + dlt)]; if (n) n.scrollIntoView({ behavior: "smooth", block: "start" }); }
  function leaveLuot() { stopP(); try { YP && YP.stopVideo(); } catch (_) {} PL.className = "pl off"; if (document.body.classList.contains("full")) setFull(false, true); }
  $("lBack").onclick = () => { if (history.state && history.state.v === "luot") history.back(); else show("home"); };
  // ---------- xem ngang giả: máy khoá xoay vẫn xem ngang được ----------
  let fsT = 0, fsAuto = false;
  const portrait = () => innerHeight > innerWidth;
  function setFull(on, fromPop) {
    const b = document.body;
    if (on && !b.classList.contains("full")) { try { history.pushState({ v: "luot", full: 1 }, ""); } catch (_) {} }
    if (!on && b.classList.contains("full") && !fromPop && history.state && history.state.full) { try { history.back(); } catch (_) {} return; }
    b.classList.toggle("full", on);
    const rot = on && portrait() && !(Pl && Pl.it.short);
    b.classList.toggle("rot", rot); b.classList.toggle("rot2", rot && !!cfg.rot2);
    if (!on) fsAuto = false;
    if (on) dimFs();
    plFollow();
  }
  function dimFs() { $("fsx").classList.remove("dim"); clearTimeout(fsT); fsT = setTimeout(() => $("fsx").classList.add("dim"), 3000); }
  $("fsOut").onclick = () => setFull(false);
  $("fsRot").onclick = () => { const b = document.body; if (b.classList.contains("rot")) { b.classList.toggle("rot2"); cfg.rot2 = b.classList.contains("rot2"); saveCfg(); } dimFs(); };
  (() => { // trong xem ngang: vuốt theo chiều đang cầm để sang bài; chạm = dừng/phát; chạm đúp = tim
    const z = $("fswipe"); let x0 = 0, y0 = 0, t0 = 0, last = 0, tapT = 0;
    z.addEventListener("touchstart", (e) => { const T = e.touches[0]; x0 = T.clientX; y0 = T.clientY; t0 = performance.now(); }, { passive: true });
    const end = (cx, cy) => {
      const dx = cx - x0, dy = cy - y0, b = document.body;
      const up = b.classList.contains("rot") ? (b.classList.contains("rot2") ? -dx : dx) : -dy;
      if (Math.abs(up) > 60 && performance.now() - t0 < 700) { setFull(false); setTimeout(() => luotGo(up > 0 ? 1 : -1), 350); return; }
      const n = performance.now(); dimFs();
      if (n - last < 300) { clearTimeout(tapT); last = 0; heartAt(cx, cy); if (Pl && !isLiked(Pl.it.id)) act(Pl.it, "like", Pl.slide); return; }
      last = n; tapT = setTimeout(() => Pl && togglePlay(Pl.slide), 260);
    };
    z.addEventListener("touchend", (e) => { const T = e.changedTouches[0]; e.preventDefault(); end(T.clientX, T.clientY); });
    z.addEventListener("mousedown", (e) => { x0 = e.clientX; y0 = e.clientY; t0 = performance.now(); });
    z.addEventListener("mouseup", (e) => end(e.clientX, e.clientY));
  })();
  addEventListener("resize", () => { // máy mở khoá xoay: xoay ngang ở video ngang -> tự xem ngang; xoay dọc lại -> về khung lướt
    const b = document.body;
    if (b.classList.contains("full")) b.classList.toggle("rot", portrait() && !(Pl && Pl.it.short));
    if (view !== "luot" || !Pl) return;
    const land = innerWidth > innerHeight;
    if (land && !Pl.it.short && !b.classList.contains("full")) { setFull(true); fsAuto = true; }
    else if (!land && fsAuto && b.classList.contains("full")) setFull(false);
  });

  // ---------- bật ----------
  async function boot() {
    setTimeout(() => loadYT().catch(() => {}), 1200);
    if (RELAY()) api("/health", {}, 0).catch(() => {}); else setRelay(false);
    if (!topics || !topics.length) { topics = []; welcome(); } else loadHome();
   
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost") && !TEST) navigator.serviceWorker.register("sw.js").catch(() => {});
    document.addEventListener("visibilitychange", () => { if (document.hidden && Pl) savePos(Pl, true); });
    addEventListener("pagehide", () => { if (Pl) savePos(Pl, true); });
  }
  window.__vtc = { get list() { return lList; }, get idx() { return lIdx; }, get pl() { return Pl; }, go: luotGo, noEmbed: (c) => Pl && noEmbed(Pl, c), ver: VER };
  boot();
})();
