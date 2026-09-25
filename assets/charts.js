(function () {
  const D = window.RAVEN;
  // 中英两页共用本文件：按 <html lang> 取文案，数字与数据完全相同
  const EN = (document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (zh, en) => (EN ? en : zh);
  // 浅色主题：warm = 强调色（Raven 的结果），cool = 背景记录灰
  const C = { ink: "#0b0b0b", ink2: "#50545a", line: "#e6e6e1", warm: "#2a78d6", cool: "#a3a7ac", bad: "#c4402c", bg: "#fcfcfb" };
  const baseStyle = { background: "transparent", color: C.ink2, fontSize: "14px", overflow: "visible" };
  const tipOpts = { fill: "#ffffff", stroke: C.line, textPadding: 10, fontSize: 14 };
  const fmt = (v, d = 6) => v.toFixed(d);
  const roundName = r => L(`第 ${r} 轮`, `Round ${r}`);

  // ---------- nanochat ----------
  const ORDER = ["start", "R1", "R2", "R3", "R4", "R5", "R6", "R7"];
  const LABEL = Object.fromEntries(ORDER.map((r, i) => [r, i === 0 ? L("起点", "Start") : roundName(i)]));
  const idx = r => ORDER.indexOf(r);
  const trials = D.nanochat.trials.map((t, i) => ({
    ...t, x: idx(t.round) + (((i * 0.6180339) % 1) - 0.5) * 0.42,
    label: LABEL[t.round], name: t.variant || L("起点候选", "starting candidate")
  }));
  const best = D.nanochat.best;
  const official = best[0];
  const line = best.slice(1).map(b => ({ ...b, x: idx(b.round), label: LABEL[b.round] }));
  const final = line[line.length - 1];

  function nano(el) {
    const w = el.clientWidth, narrow = w < 600;
    const SHORT = { start: L("起点", "Start"), R1: "1", R2: "2", R3: "3", R4: "4", R5: "5", R6: "6", R7: "7" };
    return Plot.plot({
      width: w, height: narrow ? 360 : Math.max(340, Math.min(420, w * 0.36)), marginLeft: narrow ? 50 : 64, marginRight: narrow ? 64 : 90, marginTop: 30, marginBottom: 44,
      style: baseStyle,
      x: { domain: [-0.5, 7.5], ticks: ORDER.map((_, i) => i), tickFormat: i => narrow ? SHORT[ORDER[i]] : LABEL[ORDER[i]], label: narrow ? L("轮次", "Round") : null, labelAnchor: "right", tickSize: 0 },
      y: { label: L("val_bpb ↓ 越低越好", "val_bpb ↓ lower is better"), grid: true, tickFormat: ".3f", nice: true },
      marks: [
        Plot.gridY({ stroke: C.line, strokeOpacity: 1 }),
        Plot.ruleY([official.mean], { stroke: C.ink2, strokeDasharray: "5,5" }),
        Plot.text([official], { x: 7.5, y: "mean", text: () => L("官方 train.py 0.9956", "official train.py 0.9956"), textAnchor: "end", dy: -9, fill: C.ink2, fontSize: 14 }),
        Plot.dot(trials, { x: "x", y: "v", r: 3.4, fill: C.cool, fillOpacity: 0.75,
          channels: { [L("轮次", "Round")]: "label", [L("候选", "Candidate")]: "name", [L("种子", "Seed")]: "seed", val_bpb: d => fmt(d.v) },
          tip: { ...tipOpts, format: { x: false, y: false } } }),
        Plot.ruleX(line, { x: "x", y1: d => d.mean - d.sd, y2: d => d.mean + d.sd, stroke: C.warm, strokeWidth: 2 }),
        Plot.line(line, { x: "x", y: "mean", stroke: C.warm, strokeWidth: 2.5 }),
        Plot.dot(line, { x: "x", y: "mean", r: 5, fill: C.warm, stroke: C.bg, strokeWidth: 1.5,
          channels: { [L("轮次", "Round")]: "label", [L("最好方案", "Best recipe")]: "winner", [L("均值", "Mean")]: d => fmt(d.mean), [L("标准差", "SD")]: d => fmt(d.sd), [L("种子数", "Seeds")]: "seeds" },
          tip: { ...tipOpts, format: { x: false, y: false } } }),
        Plot.text([final], { x: "x", y: "mean", text: () => "0.9381", dx: 10, textAnchor: "start", fill: C.warm, fontSize: narrow ? 16 : 20, fontWeight: 700 }),
        narrow ? null : Plot.text([line[0]], { x: "x", y: "mean", text: () => L("每步 batch 减半", "half the batch per step"), dx: 10, dy: 16, textAnchor: "start", fill: C.ink2, fontSize: 13 })
      ]
    });
  }
  const tb = document.querySelector("#tbl-nano tbody");
  const nanoRows = [official, ...best.slice(1)];
  // 中文沿用任务书 round_best 表的写法；英文取 round_best.csv 原文（-> 与 x 换成 → 与 ×）
  const ZH = ["官方 train.py", "TBS 2^18（每步 batch 减半）", "r1-02（没有候选过判据）", "r2-08 可学习的哈希 token-pair 表，10×→100×",
    "r3-04 MATRIX_LR 0.04→0.02", "r4-01 短窗 1024→256、ASPECT_RATIO 64→80、浅层注入", "r5-01", "r6-04", "r7-02（最终）"];
  const enWinner = s => s.replace(/->/g, "→").replace(/(\d)x\b/g, "$1×");
  tb.innerHTML = nanoRows.map((b, i) => {
    const shown = EN ? (i === nanoRows.length - 1 ? `${enWinner(b.winner)} (final)` : enWinner(b.winner)) : ZH[i];
    return `<tr class="${b.round === "R7" ? "best" : ""}"><td>${LABEL[b.round]}</td><td>${shown}</td><td class="n">${fmt(b.mean)} ± ${fmt(b.sd)}</td><td class="n">${b.seeds}</td><td class="n">${b.gpu == null ? L("同上", "same run") : Math.round(b.gpu)}</td></tr>`;
  }).join("");

  // ---------- CFD ----------
  const cfdA = D.cfd.filter(d => d.phase === "A");
  const cfdB = D.cfd.filter(d => d.phase === "B");
  function cfdAChart(el) {
    const w = el.clientWidth, narrow = w < 460;
    const lab = d => narrow ? L(`${d.cells} 格`, `${d.cells}`)
      : (d.cells === 0 ? L("0 格 · 跑到终点", "0\nran to the end") : L(`${d.cells} 格 · t=${d.stop} 停`, `${d.cells}\nstopped at t=${d.stop}`));
    return Plot.plot({
      width: w, height: 210, marginLeft: 56, marginTop: 26, marginBottom: 36, style: baseStyle,
      x: { domain: cfdA.map(d => d.r), tickFormat: roundName, label: null, tickSize: 0, padding: 0.35 },
      y: { label: L("越界的格子数", "out-of-bounds cells"), grid: true, domain: [0, EN ? 4900 : 4400] },
      marks: [
        Plot.gridY({ stroke: C.line, strokeOpacity: 1 }),
        Plot.barY(cfdA, { x: "r", y: "cells", fill: d => d.cells === 0 ? C.cool : C.bad }),
        Plot.ruleY([0], { stroke: C.ink2 }),
        Plot.text(cfdA, { x: "r", y: "cells", text: lab, dy: -10, lineAnchor: "bottom", lineHeight: 1.25, fill: C.ink, fontSize: 14 })
      ]
    });
  }
  function cfdBChart(el) {
    const w = el.clientWidth;
    return Plot.plot({
      width: w, height: 210, marginLeft: 56, marginRight: 30, marginTop: 26, marginBottom: 36, style: baseStyle,
      x: { domain: cfdB.map(d => d.r), tickFormat: roundName, label: null, tickSize: 0, padding: 0.5 },
      y: { type: "log", label: L("越界幅度（对数刻度，越低越好）", "out-of-bounds size (log scale, lower is better)"), grid: true, domain: [5e-11, 1e-6], ticks: [1e-10, 1e-9, 1e-8, 1e-7, 1e-6], tickFormat: d => d.toExponential(0) },
      marks: [
        Plot.gridY([1e-10, 1e-9, 1e-8, 1e-7, 1e-6], { stroke: C.line, strokeOpacity: 1 }),
        Plot.line(cfdB, { x: "r", y: "mag", stroke: C.warm, strokeWidth: 2 }),
        Plot.dot(cfdB, { x: "r", y: "mag", r: 6, fill: C.warm, stroke: C.bg }),
        // 统一写成幅度：第 4 轮源表记为 alpha 最小值 −1.97e-07，幅度即 1.97e-07；表格保留原文
        Plot.text(cfdB.slice(0, -1), { x: "r", y: "mag", text: d => String(d.label).replace(/^[−-]/, ""), dy: -16, fill: C.ink, fontSize: 14 }),
        Plot.text(cfdB.slice(-1), { x: "r", y: "mag", text: d => String(d.label).replace(/^[−-]/, ""), dx: -12, textAnchor: "end", fill: C.ink, fontSize: 14 })
      ]
    });
  }
  // 英文表格：参数名保持原样，其余按 cfd-fea/README 的每轮对照表译出
  const CFD_EN = {
    0: ["maxCo 1", "Ran to the end (t=1.0), 0 cells out of bounds"],
    1: ["maxCo 20, cAlpha 1", "241 cells out of bounds, stopped at t=0.4"],
    2: ["maxCo 100, cAlpha 0.5", "3877 cells out of bounds, stopped at t=0.5"],
    3: ["maxCo 500, cAlpha 0", "1241 cells out of bounds, stopped at t=0.65"],
    4: ["maxCo 1, output 10× more often", "Ran to the end, water volume conserved, alpha minimum −1.97e-07"],
    5: ["cAlpha 1→0.5, nAlphaSubCycles 2→4", "Out-of-bounds down to 6.0e-08, blurrier water surface"],
    6: ["nAlphaCorr 2→4, MULESCorr off", "Out-of-bounds down to 1.36e-10"]
  };
  document.querySelector("#tbl-cfd tbody").innerHTML = D.cfd.map(d => {
    const [chg, res] = EN ? CFD_EN[d.r] : [d.change, d.result];
    return `<tr><td class="n">${d.r}</td><td>${chg}</td><td>${res}</td></tr>`;
  }).join("");

  // ---------- FEA ----------
  const MT = { 0: "20.0", 1: "15.3", 2: "15.5", 3: "15.5", 4: "21.5", 5: "17.5", 6: "16.0", 7: "17.5" }; // cfd-fea/README.md 机时列
  const fea = D.fea.map(d => ({ ...d, t: MT[d.r] }));
  const okName = ok => ok ? L("收敛", "converged") : L("不收敛", "did not converge");
  // 每轮之后"最大的算得出"与"最小的算不出"之间的区间
  const brackets = [];
  let lo = null, hi = null;
  fea.forEach(d => { if (d.ok) lo = lo == null ? d.load : Math.max(lo, d.load); else hi = hi == null ? d.load : Math.min(hi, d.load);
    if (lo != null && hi != null) brackets.push({ r: d.r, lo, hi }); });
  const lastB = brackets[brackets.length - 1];
  // 区间画成逐轮收窄的阶梯带（上下两条边线 + 浅色填充），不画成从顶部挂下来的柱子
  const band = brackets.flatMap(b => [{ x: b.r - 0.5, lo: b.lo, hi: b.hi }, { x: b.r + 0.5, lo: b.lo, hi: b.hi }]);
  function feaChart(el) {
    const w = el.clientWidth, narrow = w < 460;
    // 窄屏只标起点、第一次回落与最终两端（第 0、1、5、7 轮），其余看表格
    const edgeR = [lastB.lo, lastB.hi].map(v => fea.find(d => d.load === v).r);
    const keep = d => !narrow || [0, 1, ...edgeR].includes(d.r);
    return Plot.plot({
      width: w, height: narrow ? 300 : 340, marginLeft: 64, marginRight: 20, marginTop: 30, marginBottom: 36, style: baseStyle,
      x: { domain: [-0.5, 7.5], ticks: [0, 1, 2, 3, 4, 5, 6, 7], tickFormat: r => narrow ? `${r}` : roundName(r), label: narrow ? L("轮次 →", "Round →") : null, labelAnchor: "right", tickSize: 0 },
      y: { label: L("载荷 (kN)", "load (kN)"), grid: true, domain: [1780, 2020] },
      marks: [
        Plot.gridY({ stroke: C.line, strokeOpacity: 1 }),
        Plot.areaY(band, { x: "x", y1: "lo", y2: "hi", fill: C.warm, fillOpacity: 0.12 }),
        Plot.line(band, { x: "x", y: "lo", stroke: C.warm, strokeWidth: 1.5 }),
        Plot.line(band, { x: "x", y: "hi", stroke: C.warm, strokeWidth: 1.5 }),
        Plot.dot(fea, { x: "r", y: "load", r: 7, symbol: d => d.ok ? "circle" : "times", stroke: d => d.ok ? C.cool : C.bad, fill: d => d.ok ? C.cool : "none", strokeWidth: 2.5,
          channels: { [L("轮次", "Round")]: d => roundName(d.r), [L("载荷", "Load")]: d => `${d.load} kN`, [L("结果", "Result")]: d => okName(d.ok), [L("机时", "Run time")]: "t" },
          tip: { ...tipOpts, format: { x: false, y: false, symbol: false, stroke: false, fill: false } } }),
        Plot.text(fea.filter(d => d.ok && keep(d)), { x: "r", y: "load", text: d => `${d.load}`, dy: 18, fill: C.ink, fontSize: 13 }),
        Plot.text(fea.filter(d => !d.ok && keep(d)), { x: "r", y: "load", text: d => `${d.load}`, dy: -16, fill: C.ink, fontSize: 13 }),
        Plot.text(narrow ? [] : [lastB], { x: 7.4, y: 1815, text: () => L(`临界点在 ${lastB.lo} – ${lastB.hi} kN 之间`, `The limit lies between ${lastB.lo} and ${lastB.hi} kN`), textAnchor: "end", fill: C.warm, fontSize: 15, fontWeight: 700 })
      ]
    });
  }
  document.querySelector("#tbl-fea tbody").innerHTML = fea.map(d =>
    `<tr><td class="n">${d.r}</td><td class="n">${d.load}</td><td class="${d.ok ? "ok" : "fail"}">${okName(d.ok)}</td><td class="n">${d.t}</td></tr>`).join("");

  // ---------- AI4AI ----------
  // 单一维度：只高亮 Raven · V4.1；其他 Raven 组合为灰色实心；Claude Code 为空心圈（对照）
  // 源数据写作小写 "raven"，显示统一为 "Raven"
  const who = s => s.replace(/\s*·\s*/, " · ").replace(/^raven\b/, "Raven");
  const isV41 = s => s.includes("V4.1"), isCC = s => s.startsWith("Claude");
  const GREY = "#8a8f95";
  const inkOf = s => isV41(s) ? C.warm : (isCC(s) ? C.ink : GREY);
  // ann：每个点的标签位置。ly 缺省 = 点本身的 y；link = 画引线（数据点不挪动）
  function aiChart(el, rows, xdom, ydom, ann, cap) {
    const w = el.clientWidth, narrow = w < 460;
    const data = rows.map(r => ({ ...r, name: who(r.who) }));
    const labs = data.map(d => {
      const a = ann[d.who] || {};
      const txt = `${narrow && isCC(d.who) ? "Claude Code" : d.name}  ${d.bpb.toFixed(3)}`;
      return { ...d, txt, lx: a.lx ?? d.cost_v, ly: a.ly ?? d.bpb, side: a.side || "left", link: !!a.link };
    });
    const ch = { [L("框架", "Setup")]: "name", [L("耗时", "Time")]: "time", [L("token", "Tokens")]: "tokens", [L("成本", "Cost")]: "cost", BPB: "bpb" };
    return Plot.plot({
      width: w, height: narrow ? 270 : 290, marginLeft: 56, marginRight: 24, marginTop: 24, marginBottom: 44, style: baseStyle,
      x: { type: "log", domain: xdom, label: L("成本（美元，对数刻度） →", "cost (USD, log scale) →"), tickFormat: d => `$${d}`, ticks: [0.5, 1, 2, 5, 10, 20, 50, 100].filter(t => t >= xdom[0] && t <= xdom[1]) },
      y: { label: L("BPB ↓ 越低越好", "BPB ↓ lower is better"), grid: true, domain: ydom, tickFormat: ".3f" },
      marks: [
        Plot.gridY({ stroke: C.line, strokeOpacity: 1 }),
        cap ? Plot.ruleX([cap], { stroke: C.ink2, strokeDasharray: "4,4" }) : null,
        cap ? Plot.text([cap], { x: d => d, y: ydom[1], text: () => L("50 美元额度", "$50 budget"), dx: -6, dy: 2, textAnchor: "end", lineAnchor: "top", fill: C.ink2, fontSize: 13 }) : null,
        Plot.link(labs.filter(d => d.link), { x1: "lx", y1: "ly", x2: "cost_v", y2: "bpb", stroke: C.ink2, strokeWidth: 1 }),
        Plot.dot(data.filter(d => !isCC(d.who)), { x: "cost_v", y: "bpb", r: 7, fill: d => inkOf(d.who), stroke: C.bg, strokeWidth: 1.5,
          channels: ch, tip: { ...tipOpts, format: { x: false, y: false, fill: false } } }),
        Plot.dot(data.filter(d => isCC(d.who)), { x: "cost_v", y: "bpb", r: 6.5, fill: C.bg, stroke: C.ink, strokeWidth: 2,
          channels: ch, tip: { ...tipOpts, format: { x: false, y: false } } }),
        // dx / fontWeight 只接受常量，按组拆成多个 mark
        Plot.text(labs.filter(d => d.side === "left" && d.link), { x: "lx", y: "ly", text: "txt", dx: -4, textAnchor: "end", fill: d => inkOf(d.who), fontSize: 13 }),
        Plot.text(labs.filter(d => d.side === "left" && !d.link), { x: "lx", y: "ly", text: "txt", dx: -12, textAnchor: "end", fill: d => inkOf(d.who), fontSize: 13 }),
        Plot.text(labs.filter(d => d.side === "right" && !narrow), { x: "lx", y: "ly", text: "txt", dx: 12, textAnchor: "start", fill: d => inkOf(d.who), fontSize: 13, fontWeight: 700 }),
        Plot.text(labs.filter(d => d.side === "right" && narrow), { x: "lx", y: "ly", text: "txt", dx: -8, dy: 19, textAnchor: "start", fill: d => inkOf(d.who), fontSize: 13, fontWeight: 700 })
      ]
    });
  }
  const A5 = D.ai4ai.limit_5h, A50 = D.ai4ai.limit_50usd;
  const byName = (rows, f) => rows.find(r => f(r.who)).who;
  const ann5h = { [byName(A5, isV41)]: { side: "right" } };
  const ann50 = {
    [byName(A50, isV41)]: { side: "right" },
    [byName(A50, s => s.includes("Opus") && !isCC(s))]: { lx: 30, ly: 0.978, link: true },
    [byName(A50, isCC)]: { lx: 30, ly: 1.003, link: true }
  };
  const rowsHTML = rows => rows.map(r => `<tr class="${isV41(r.who) ? "best" : ""}"><td>${who(r.who)}</td><td class="n">${r.time}</td><td class="n">${r.tokens}</td><td class="n">${r.cost}</td><td class="n">${r.bpb.toFixed(3)}</td></tr>`).join("");
  document.querySelector("#tbl-ai-5h tbody").innerHTML = rowsHTML(A5);
  document.querySelector("#tbl-ai-50 tbody").innerHTML = rowsHTML(A50);

  // ---------- 动画弹窗：原生 <dialog>，打开时才开始加载 ----------
  document.querySelectorAll("[data-dialog]").forEach(btn => {
    const dlg = document.getElementById(btn.dataset.dialog);
    const v = dlg.querySelector("video");
    btn.addEventListener("click", () => { dlg.showModal(); v.play().catch(() => {}); });
    dlg.addEventListener("close", () => v.pause());
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  });

  // ---------- render ----------
  const jobs = [
    ["chart-nano", nano], ["chart-cfd-a", cfdAChart], ["chart-cfd-b", cfdBChart], ["chart-fea", feaChart],
    ["chart-ai-5h", el => aiChart(el, A5, [0.5, 120], [1.025, 1.058], ann5h)],
    ["chart-ai-50", el => aiChart(el, A50, [3, 120], [0.955, 1.025], ann50, 50)]
  ];
  function render() { for (const [id, f] of jobs) { const el = document.getElementById(id); el.replaceChildren(f(el)); } }
  render();
  let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(render, 150); });
})();
