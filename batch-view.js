/* In-app batch page: Lectures / Notes / About -> Subjects -> Topics -> items, with LecturePlayer */
(function () {
  const ICON = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    chev: '<svg class="bv-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3z"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z"/></svg>'
  };
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

  let root, player, playerBox, batch, data, tab = "lectures", path = [], playing = null, lp = null, ready = false;

  function build() {
    if (ready) return;
    root = document.createElement("div");
    root.id = "batchView";
    root.innerHTML = `<div class="bv-top"><button class="bv-back" type="button" aria-label="Back">${ICON.back}</button><h1 id="bvTitle"></h1></div><div class="bv-scroll" id="bvScroll"><div class="bv-wrap" id="bvBody"></div></div>`;
    document.body.appendChild(root);
    player = document.createElement("div");
    player.id = "cxPlayer";
    player.innerHTML = `<div class="cxp-box"><div id="cxpMount"></div></div><div class="cxp-meta"><h2 id="cxpTitle"></h2><small id="cxpSub"></small><div class="cxp-list" id="cxpList"></div></div>`;
    document.body.appendChild(player);
    root.querySelector(".bv-back").addEventListener("click", () => history.back());
    window.addEventListener("popstate", onPop);
    ready = true;
  }

  /* history: one entry per level so the phone's back button walks up */
  function pushLevel(kind) { try { history.pushState({ cxbv: kind }, ""); } catch (e) {} }
  function onPop() {
    if (!root || !root.classList.contains("open")) return;
    if (playing) { closePlayer(); return render(); }
    if (path.length) { path.pop(); return render(); }
    closeView();
  }

  function counts(kind) {
    const key = kind === "notes" ? "notes" : "lectures";
    return data.subjects.map((s) => s.topics.reduce((a, t) => a + t[key].length, 0));
  }

  function render() {
    const body = document.getElementById("bvBody");
    const title = document.getElementById("bvTitle");
    const scroller = document.getElementById("bvScroll");
    const totalLec = counts("lectures").reduce((a, b) => a + b, 0);
    const totalNotes = counts("notes").reduce((a, b) => a + b, 0);
    let head = "";
    if (!path.length) {
      title.textContent = batch.name;
      head = `<div class="bv-hero"><img src="${esc(batch.previewImage)}" alt="${esc(batch.name)}" referrerpolicy="no-referrer"><div class="bv-hero-body"><h2>${esc(batch.name)}</h2><p>${esc(batch.byName || "")}</p><div class="bv-badges"><span class="bv-badge on">Recorded</span><span class="bv-badge">${plural(totalLec, "lecture")}</span><span class="bv-badge">${plural(totalNotes, "note")}</span></div></div></div>
        <div class="bv-tabs">${["lectures", "notes", "about"].map((t) => `<button type="button" class="bv-tab${tab === t ? " active" : ""}" data-tab="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div>`;
    }
    let content = "";
    if (tab === "about" && !path.length) {
      content = `<div class="bv-about"><h3>${esc(batch.name)}</h3>${esc(batch.byName || "")} — recorded lectures with PDF notes, organised subject-wise.<ul>${data.subjects.map((s) => `<li>${esc(s.name)}: ${plural(s.topics.reduce((a, t) => a + t.lectures.length, 0), "lecture")}, ${plural(s.topics.reduce((a, t) => a + t.notes.length, 0), "note")}</li>`).join("")}</ul></div>`;
    } else {
      const key = tab === "notes" ? "notes" : "lectures";
      const unit = key === "notes" ? "note" : "lecture";
      const icon = key === "notes" ? ICON.note : ICON.video;
      if (path.length === 0) {
        const cs = counts(tab);
        content = `<div class="bv-list">${data.subjects.map((s, i) => `<button class="bv-card" type="button" data-s="${i}"><span class="bv-ico">${icon}</span><span class="bv-info"><b>${esc(s.name)}</b><span>${plural(cs[i], unit)}</span></span>${ICON.chev}</button>`).join("")}</div>`;
      } else if (path.length === 1) {
        const s = data.subjects[path[0]];
        title.textContent = s.name;
        const topics = s.topics.map((t, i) => ({ t, i })).filter((x) => x.t[key].length);
        content = topics.length ? `<div class="bv-list">${topics.map(({ t, i }) => `<button class="bv-card" type="button" data-t="${i}"><span class="bv-ico">${icon}</span><span class="bv-info"><b>${esc(t.name)}</b><span>${plural(t[key].length, unit)}</span></span>${ICON.chev}</button>`).join("")}</div>` : `<div class="bv-empty">Nothing here yet.</div>`;
      } else {
        const s = data.subjects[path[0]], t = s.topics[path[1]];
        title.textContent = t.name;
        content = `<div class="bv-list">${t[key].map((it, i) => key === "lectures"
          ? `<button class="bv-card bv-row" type="button" data-l="${i}"><span class="bv-ico">${ICON.play}</span><span class="bv-info"><b>${esc(it.title)}</b></span>${ICON.chev}</button>`
          : `<div class="bv-card bv-row"><span class="bv-ico">${ICON.note}</span><span class="bv-info"><b>${esc(it.title)}</b></span><a class="bv-act" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">View</a></div>`).join("")}</div>`;
      }
    }
    body.innerHTML = head + content;
    body.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; path = []; render(); }));
    body.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => { path = [+b.dataset.s]; pushLevel("s"); render(); scroller.scrollTop = 0; }));
    body.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", () => { path = [path[0], +b.dataset.t]; pushLevel("t"); render(); scroller.scrollTop = 0; }));
    body.querySelectorAll("[data-l]").forEach((b) => b.addEventListener("click", () => playLecture(path[0], path[1], +b.dataset.l)));
    if (!path.length) title.textContent = batch.name;
  }

  /* ---- player ---- */
  function flatList() {
    const out = [];
    data.subjects.forEach((s, si) => s.topics.forEach((t, ti) => t.lectures.forEach((l, li) => out.push({ si, ti, li, id: `${si}:${ti}:${li}`, title: l.title, url: l.url, topic: t.name, subject: s.name }))));
    return out;
  }

  function lectureData(item, flat) {
    const idx = flat.findIndex((x) => x.id === item.id);
    const toRef = (x) => (x ? { id: x.id, title: x.title } : null);
    return {
      id: item.id, title: item.title, videoUrl: item.url, downloadUrl: item.url,
      previousLecture: toRef(flat[idx - 1]), nextLecture: toRef(flat[idx + 1]),
      course: {
        title: batch.name,
        subjects: data.subjects.map((s, si) => ({ title: s.name, chapters: s.topics.filter((t) => t.lectures.length).map((t) => ({ title: t.name, lectures: t.lectures.map((l, li) => ({ id: `${si}:${data.subjects[si].topics.indexOf(t)}:${li}`, title: l.title })) })) }))
      },
      attachments: (data.subjects[item.si].topics[item.ti].notes || []).map((n) => ({ title: n.title, url: n.url }))
    };
  }

  function playLecture(si, ti, li, fromPlayer) {
    if (typeof window.LecturePlayer !== "function") { window.showToast && window.showToast("Player is still loading, try again."); return; }
    const flat = flatList();
    const item = flat.find((x) => x.id === `${si}:${ti}:${li}`);
    if (!item) return;
    const d = lectureData(item, flat);
    const wasPlaying = !!playing;
    playing = item;
    player.classList.add("open");
    if (!wasPlaying) pushLevel("p");
    document.getElementById("cxpTitle").textContent = item.title;
    document.getElementById("cxpSub").textContent = `${item.subject} · ${item.topic}`;
    const nav = (n) => { const [a, b, c] = String(n.id).split(":").map(Number); playLecture(a, b, c, true); };
    if (lp) { lp.load(d); }
    else {
      lp = new window.LecturePlayer(document.getElementById("cxpMount"), d, { onBack: () => history.back(), onNavigate: nav, onSelectLecture: nav });
    }
    const list = data.subjects[si].topics[ti].lectures;
    document.getElementById("cxpList").innerHTML = list.map((l, i) => `<button type="button" class="cxp-item${i === li ? " on" : ""}" data-i="${i}">${esc(l.title)}</button>`).join("");
    document.querySelectorAll("#cxpList .cxp-item").forEach((b) => b.addEventListener("click", () => playLecture(si, ti, +b.dataset.i, true)));
    player.scrollTop = 0;
  }

  function closePlayer() {
    if (lp) { try { lp.destroy(); } catch (e) {} lp = null; }
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
    playing = null;
    player.classList.remove("open");
  }

  function closeView() {
    closePlayer();
    root.classList.remove("open");
    document.body.classList.remove("modal-open");
    path = [];
  }

  async function open(b) {
    build();
    batch = b;
    if (!data) {
      try {
        const res = await fetch(b.dataFile || "nirman-data.json", { cache: "no-cache" });
        if (!res.ok) throw new Error("bad status");
        data = await res.json();
      } catch (e) {
        window.showToast && window.showToast("Batch content could not be loaded. Check your connection.");
        return;
      }
    }
    tab = "lectures"; path = [];
    root.classList.add("open");
    document.body.classList.add("modal-open");
    document.querySelectorAll(".overlay.visible").forEach((m) => m.classList.remove("visible"));
    pushLevel("b");
    render();
    document.getElementById("bvScroll").scrollTop = 0;
  }

  window.CXBatchView = { open };
})();
