// ===================================
// Scoring Explainer — "How Scoring Works" modal
// Interactive walkthrough of the goal-anchored sliding scale.
// ===================================

(function () {
  const DEMO_WEIGHT = 20;              // demo measure weight (%), pairs with 10% IPR
  const DEMO_POOL = (DEMO_WEIGHT / 30) * 300; // 200 pts
  const IPR_EXAMPLE = 85;              // IPR 0–100 scale, 1 pt per point at 10%

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const state = { goal: 85, max: 100, actual: 92 };
  let lastTrigger = null;

  const $ = id => document.getElementById(id);
  const fmt = n => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const fmt2 = n => n.toFixed(2);

  function derive() {
    const { goal, max } = state;
    const min = 2 * goal - max;
    const actual = Math.min(Math.max(state.actual, min), max);
    const pct = (actual - min) / (max - min);
    const newPts = pct * DEMO_POOL;
    return { goal, max, min, actual, pct, newPts };
  }

  function el(tag, attrs, text) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
    if (text != null) node.textContent = text;
    return node;
  }

  // ---------- Number line: Min · Goal · Max ----------
  function drawNumberLine(d) {
    const svg = $('ex-numberline');
    svg.replaceChildren();
    const L = 36, R = 524, Y = 58;
    const x = v => L + ((v - d.min) / (d.max - d.min)) * (R - L);

    svg.append(el('line', { x1: L, y1: Y, x2: R, y2: Y, class: 'ex-track' }));
    svg.append(el('line', { x1: L, y1: Y, x2: x(d.actual), y2: Y, class: 'ex-track-fill' }));

    [
      { v: d.min, label: 'Min', pts: `0% · 0 pts` },
      { v: d.goal, label: 'Goal', pts: `50% · ${fmt(DEMO_POOL / 2)} pts` },
      { v: d.max, label: 'Max', pts: `100% · ${fmt(DEMO_POOL)} pts` }
    ].forEach(t => {
      const tx = x(t.v);
      svg.append(el('line', { x1: tx, y1: Y - 12, x2: tx, y2: Y + 12, class: 'ex-tick' }));
      svg.append(el('text', { x: tx, y: Y + 32, class: 'ex-tick-value' }, fmt(t.v)));
      svg.append(el('text', { x: tx, y: Y + 48, class: 'ex-tick-label' }, t.label));
      svg.append(el('text', { x: tx, y: Y + 70, class: 'ex-tick-pts' }, t.pts));
    });

    const ax = x(d.actual);
    svg.append(el('line', { x1: ax, y1: Y - 22, x2: ax, y2: Y + 8, class: 'ex-marker-stem' }));
    svg.append(el('circle', { cx: ax, cy: Y, r: 7, class: 'ex-marker' }));
    svg.append(el('text', { x: ax, y: Y - 28, class: 'ex-marker-label' }, `You: ${fmt(d.actual)}`));
  }

  // ---------- 300-point roll-up ----------
  function drawRollup(d) {
    const total = IPR_EXAMPLE + d.newPts;
    $('ex-roll-ipr-fill').style.width = `${IPR_EXAMPLE}%`;
    $('ex-roll-m2-fill').style.width = `${d.pct * 100}%`;
    $('ex-roll-m2-pts').textContent = `${fmt2(d.newPts)} / ${fmt2(DEMO_POOL)}`;
    $('ex-roll-total').textContent = fmt2(total);
    $('ex-roll-randa').textContent = (total / 100).toFixed(2);
    $('ex-roll-rating').textContent =
      total > 200 ? 'More Than Expected' : total >= 100 ? 'Expected' : 'Less Than Expected';
  }

  function render() {
    const valid = Number.isFinite(state.goal) && Number.isFinite(state.max) && state.max > state.goal;
    $('ex-error').hidden = valid;
    $('ex-live').hidden = !valid;
    if (!valid) return;

    const d = derive();
    const slider = $('ex-actual');
    slider.min = d.min;
    slider.max = d.max;
    slider.step = (d.max - d.min) >= 20 ? 1 : 0.5;
    slider.value = d.actual;
    $('ex-actual-out').textContent = fmt(d.actual);
    $('ex-min-out').textContent = fmt(d.min);
    $('ex-min-formula').textContent = `2 × ${fmt(d.goal)} − ${fmt(d.max)} = ${fmt(d.min)}`;

    $('ex-new-pts').textContent = `${fmt2(d.newPts)} / ${fmt2(DEMO_POOL)}`;

    $('ex-why-title').textContent = `Why isn't ${fmt(d.actual)} worth ${fmt(d.actual)}%?`;
    const span = d.max - d.min;
    const up = d.actual - d.min;
    $('ex-why').innerHTML =
      `The scale for this measure runs <strong>${fmt(d.min)} → ${fmt(d.max)}</strong>, not 0 → 100. ` +
      `A score of ${fmt(d.actual)} is <strong>${fmt(up)} of the ${fmt(span)} points</strong> up that scale: ` +
      `<code>(${fmt(d.actual)} − ${fmt(d.min)}) ÷ (${fmt(d.max)} − ${fmt(d.min)}) = ${(d.pct * 100).toFixed(1)}%</code> ` +
      `of ${fmt(DEMO_POOL)} points = <strong>${fmt2(d.newPts)}</strong>.`;

    drawNumberLine(d);
    drawRollup(d);
  }

  function readInputs() {
    state.goal = parseFloat($('ex-goal').value);
    state.max = parseFloat($('ex-max').value);
    render();
  }

  function open(e) {
    lastTrigger = e?.currentTarget || document.activeElement;
    const about = $('about-modal');
    if (about) about.style.display = 'none';
    $('explainer-modal').style.display = 'flex';
    render();
    $('explainer-modal-close').focus();
  }

  function close() {
    const modal = $('explainer-modal');
    if (modal.style.display === 'none') return;
    modal.style.display = 'none';
    lastTrigger?.focus?.();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('explainer-modal')) return;
    document.querySelectorAll('[data-open-explainer]').forEach(btn => btn.addEventListener('click', open));
    $('explainer-modal-close').addEventListener('click', close);
    $('explainer-modal-overlay').addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    $('ex-goal').addEventListener('input', readInputs);
    $('ex-max').addEventListener('input', readInputs);
    $('ex-actual').addEventListener('input', e => {
      state.actual = parseFloat(e.target.value);
      render();
    });
    $('ex-reset').addEventListener('click', () => {
      state.goal = 85; state.max = 100; state.actual = 92;
      $('ex-goal').value = 85;
      $('ex-max').value = 100;
      render();
    });
  });
})();
