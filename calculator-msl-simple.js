// ===================================
// MSL Score Calculator — Simple Proportional Method
// For COPMS RANDA MSL score entry
// ===================================

// ===================================
// UTILITY FUNCTIONS
// ===================================

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

const debouncedUpdate = debounce(updateAllCalculations, 150);

// ===================================
// CONSTANTS
// ===================================

const MSL_TOTAL_WEIGHT = 30;
const MSL_MAX_SCALED = 300;
const IPR_WEIGHT = 10;
const IPR_MIN = 0;
const IPR_MAX = 100;
const MAX_ADDITIONAL_MEASURES = 3;
const STORAGE_KEY = 'msl_simple_calc_v1';

const MSL_RATING_RANGES = [
  { min: 201, max: 300, label: 'More Than Expected' },
  { min: 100, max: 200, label: 'Expected' },
  { min: 0, max: 99, label: 'Less Than Expected' }
];

// ===================================
// CALCULATION
// ===================================

/**
 * Normalize an actual score within a min–max range to 0–1.
 * Clamps to [0, 1] if actual is outside bounds.
 */
function normalize(actual, min, max) {
  if (max <= min) return 0;
  return clamp((actual - min) / (max - min), 0, 1);
}

/**
 * Calculate MSL score from all measures.
 * Returns { score, rating, percentage, measures[], valid }
 */
function calculateMSL() {
  const rows = document.querySelectorAll('.msl-measure-row');
  if (rows.length === 0) {
    return { score: 0, rating: '—', percentage: 0, measures: [], valid: false };
  }

  let totalWeight = 0;
  let totalWeightedScore = 0;
  const measures = [];
  let allFilled = true;

  rows.forEach(row => {
    const idx = row.dataset.index;
    const nameEl = document.getElementById(`msl-name-${idx}`);
    const weightEl = document.getElementById(`msl-weight-${idx}`);
    const minEl = document.getElementById(`msl-min-${idx}`);
    const maxEl = document.getElementById(`msl-max-${idx}`);
    const actualEl = document.getElementById(`msl-actual-${idx}`);

    const name = nameEl ? nameEl.value : `Measure ${idx}`;
    const weight = parseFloat(weightEl?.value) || 0;
    const minScore = parseFloat(minEl?.value);
    const maxScore = parseFloat(maxEl?.value);
    const actual = parseFloat(actualEl?.value);

    totalWeight += weight;

    if (isNaN(actual) || actualEl?.value === '' ||
        isNaN(minScore) || minEl?.value === '' ||
        isNaN(maxScore) || maxEl?.value === '') {
      allFilled = false;
      measures.push({ name, weight, minScore: 0, maxScore: 0, actual: 0, normalized: 0, scaled300: 0, weighted: 0, filled: false });
      return;
    }

    const normalized = normalize(actual, minScore, maxScore);
    const scaled300 = round2(normalized * MSL_MAX_SCALED);
    const weighted = round2(scaled300 * (weight / MSL_TOTAL_WEIGHT));

    totalWeightedScore += weighted;

    measures.push({
      name,
      weight,
      minScore,
      maxScore,
      actual,
      normalized: round2(normalized),
      percentage: round2(normalized * 100),
      scaled300,
      weighted,
      filled: true
    });
  });

  const weightsValid = Math.abs(totalWeight - MSL_TOTAL_WEIGHT) < 0.01;
  const valid = allFilled && weightsValid && rows.length >= 1;
  const mslScore = round2(totalWeightedScore);

  let rating = '—';
  if (valid) {
    for (const range of MSL_RATING_RANGES) {
      if (mslScore >= range.min && mslScore <= range.max) {
        rating = range.label;
        break;
      }
    }
  }

  return {
    score: mslScore,
    rating,
    percentage: round2((mslScore / MSL_MAX_SCALED) * 100),
    measures,
    totalWeight: round2(totalWeight),
    weightsValid,
    valid
  };
}

// ===================================
// UI UPDATES
// ===================================

function updateAllCalculations() {
  const result = calculateMSL();

  // Weight validation display
  const weightTotal = document.getElementById('total-msl-weight');
  const weightMsg = document.getElementById('msl-weight-message');
  if (weightTotal) weightTotal.textContent = result.totalWeight.toFixed(1);
  if (weightMsg) {
    if (result.weightsValid) {
      weightMsg.textContent = '✓ Total equals 30%';
      weightMsg.className = 'validation-success';
    } else if (result.totalWeight > MSL_TOTAL_WEIGHT) {
      weightMsg.textContent = `⚠ Total exceeds 30% (currently ${result.totalWeight.toFixed(1)}%)`;
      weightMsg.className = 'validation-error';
    } else {
      const rowCount = document.querySelectorAll('.msl-measure-row').length;
      if (rowCount <= 1) {
        weightMsg.textContent = `Add measures to reach 30% (currently ${result.totalWeight.toFixed(1)}%)`;
        weightMsg.className = 'validation-info';
      } else {
        weightMsg.textContent = `⚠ Total must equal 30% (currently ${result.totalWeight.toFixed(1)}%)`;
        weightMsg.className = 'validation-error';
      }
    }
  }

  // Update Status Checklist
  const statusWeights = document.getElementById('status-weights');
  const statusScores = document.getElementById('status-scores');
  
  if (statusWeights) {
    statusWeights.className = `status-item ${result.weightsValid ? 'complete' : 'incomplete'}`;
    statusWeights.querySelector('.status-icon').textContent = result.weightsValid ? '✓' : '⚖️';
  }
  
  if (statusScores) {
    const allFilled = result.measures.every(m => m.filled);
    statusScores.className = `status-item ${allFilled ? 'complete' : 'incomplete'}`;
    statusScores.querySelector('.status-icon').textContent = allFilled ? '✓' : '🎯';
  }

  // Per-measure feedback
  result.measures.forEach((m, i) => {
    const row = document.querySelectorAll('.msl-measure-row')[i];
    if (!row) return;
    
    // Text feedback
    const feedbackEl = row.querySelector('.measure-feedback');
    if (feedbackEl) {
      if (m.filled) {
        feedbackEl.textContent = `${m.percentage}% of range → ${m.scaled300} / 300 scale → contributes ${m.weighted} pts`;
        feedbackEl.className = 'measure-feedback visible';
      } else {
        feedbackEl.textContent = '';
        feedbackEl.className = 'measure-feedback';
      }
    }

    // Visual Range Bar
    const marker = row.querySelector('.measure-range-marker');
    const minLabel = row.querySelector('.measure-range-label-min');
    const maxLabel = row.querySelector('.measure-range-label-max');
    
    if (minLabel) minLabel.textContent = isNaN(parseFloat(m.minScore)) ? 'Min' : m.minScore;
    if (maxLabel) maxLabel.textContent = isNaN(parseFloat(m.maxScore)) ? 'Max' : m.maxScore;
    
    if (marker) {
      if (m.filled) {
        marker.style.left = `${m.normalized * 100}%`;
        marker.style.opacity = '1';
      } else {
        marker.style.left = '0%';
        marker.style.opacity = '0.3';
      }
    }
  });

  // MSL results summary
  const mslResults = document.getElementById('msl-results');
  const randaEl = document.getElementById('msl-randa-score');
  if (randaEl) randaEl.textContent = result.valid ? (result.score / 100).toFixed(2) : '—';

  // Handle results section "dimming" instead of full overlay
  if (result.valid) {
    mslResults?.classList.remove('disabled');
  } else {
    mslResults?.classList.add('disabled');
  }

  // Top summary card
  const summaryScore = document.getElementById('summary-total-score');
  const summaryRating = document.getElementById('summary-rating');
  const summaryOverlay = document.getElementById('summary-overlay');
  const summaryMarker = document.getElementById('summary-score-marker');
  const summaryRanda = document.getElementById('summary-randa-score');

  if (result.valid) {
    if (summaryScore) summaryScore.textContent = result.score;
    if (summaryRanda) summaryRanda.textContent = (result.score / 100).toFixed(2);
    if (summaryRating) {
      summaryRating.textContent = result.rating;
      stripRatingClasses(summaryRating);
      const cls = ratingToClass(result.rating);
      if (cls) summaryRating.classList.add(cls);
    }
    if (summaryOverlay) summaryOverlay.style.display = 'none';
    if (summaryMarker) {
      summaryMarker.style.left = clamp(result.score / MSL_MAX_SCALED * 100, 2, 98) + '%';
      summaryMarker.style.display = 'block';
    }
  } else {
    if (summaryScore) summaryScore.textContent = '—';
    if (summaryRanda) summaryRanda.textContent = '—';
    if (summaryRating) {
      summaryRating.textContent = '—';
      stripRatingClasses(summaryRating);
    }
    if (summaryOverlay) summaryOverlay.style.display = 'flex';
    if (summaryMarker) summaryMarker.style.display = 'none';
  }

  // Save
  saveState();
}

// ===================================
// RATING CLASS HELPERS
// ===================================

const RATING_CLASS_MAP = {
  'more than expected': 'rating-more-than-expected',
  'expected': 'rating-expected',
  'less than expected': 'rating-less-than-expected'
};

function ratingToClass(rating) {
  return RATING_CLASS_MAP[(rating || '').toLowerCase().trim()] || null;
}

function stripRatingClasses(el) {
  if (!el) return;
  Array.from(el.classList).forEach(cls => {
    if (cls.startsWith('rating-')) el.classList.remove(cls);
  });
}

// ===================================
// ROW MANAGEMENT
// ===================================

let rowCounter = 1; // IPR is always 1

function createMeasureRow(index, isIPR = false) {
  const row = document.createElement('div');
  row.className = `msl-measure-row animate-fade-in-up ${isIPR ? 'ipr-row' : ''}`;
  row.dataset.index = index;

  const name = isIPR ? 'Instructional Program Review (IPR)' : '';
  const weight = isIPR ? IPR_WEIGHT : '';
  const minVal = isIPR ? IPR_MIN : '';
  const maxVal = isIPR ? IPR_MAX : '';
  const readonlyAttr = isIPR ? 'readonly class="readonly-field"' : '';
  const weightReadonly = ''; // No longer readonly for IPR

  row.innerHTML = `
    <div class="msl-measure-header">
      <span class="msl-measure-number">
        ${isIPR ? 'Measure 1 — IPR <span class="ipr-badge">Foundational</span>' : `Measure ${index}`}
      </span>
      ${!isIPR ? `<button type="button" class="btn-remove" onclick="removeMeasure(${index})" aria-label="Remove measure">Remove</button>` : ''}
    </div>

    <div class="msl-grid-inputs measure-fields">
      <div class="form-group" style="grid-column: 1 / -1;">
        <label for="msl-name-${index}">Measure Name</label>
        <input type="text" id="msl-name-${index}" value="${name}" ${isIPR ? readonlyAttr : `placeholder="e.g., CMAS, DIBELS, AP Mean Score"`}>
      </div>

      ${!isIPR ? `
      <div class="form-group" style="grid-column: 1 / -1;">
        <label for="msl-desc-${index}">Description <span style="font-weight: normal; color: var(--color-text-muted);">(optional)</span></label>
        <textarea id="msl-desc-${index}" class="msl-desc" rows="2" placeholder="Brief note about this measure, e.g. district benchmark, grade level, subject"></textarea>
      </div>
      ` : ''}

      <div class="form-group field-weight">
        <label for="msl-weight-${index}">⚖️ Weight (%)</label>
        <input type="number" id="msl-weight-${index}" min="0" max="30" step="0.1" value="${weight}" ${weightReadonly} placeholder="0">
      </div>

      <div class="form-group field-range">
        <label for="msl-min-${index}">Min Score</label>
        <input type="number" id="msl-min-${index}" step="any" value="${minVal}" ${isIPR ? readonlyAttr : `placeholder="0"`}>
      </div>

      <div class="form-group field-range">
        <label for="msl-max-${index}">Max Score</label>
        <input type="number" id="msl-max-${index}" step="any" value="${maxVal}" ${isIPR ? readonlyAttr : `placeholder="100"`}>
      </div>

      <div class="form-group field-actual">
        <label for="msl-actual-${index}">🎯 Score Achieved</label>
        <input type="number" id="msl-actual-${index}" step="any" placeholder="Enter score">
      </div>
    </div>

    <div class="measure-visual-feedback">
      <div class="measure-range-bar-container">
        <div class="measure-range-bar"></div>
        <div class="measure-range-marker" style="left: 0%; opacity: 0.3;"></div>
        <span class="measure-range-label-min">${minVal || 'Min'}</span>
        <span class="measure-range-label-max">${maxVal || 'Max'}</span>
      </div>
      <div class="measure-feedback"></div>
    </div>
  `;

  // Attach listeners
  row.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', debouncedUpdate);
  });
  // Textarea doesn't affect calculations but we save on input
  row.querySelector('.msl-desc')?.addEventListener('input', saveState);

  return row;
}

function addMeasure() {
  const container = document.getElementById('msl-list');
  const currentCount = container.querySelectorAll('.msl-measure-row').length;
  if (currentCount >= 1 + MAX_ADDITIONAL_MEASURES) {
    return; // Max 4 total (1 IPR + 3 additional)
  }

  rowCounter++;
  const row = createMeasureRow(rowCounter, false);
  container.appendChild(row);
  setTimeout(() => row.classList.add('visible'), 10);

  row.querySelector(`#msl-name-${rowCounter}`)?.focus();
  updateAddButton();
  updateRemoveButtons();
  debouncedUpdate();
}

function removeMeasure(index) {
  const row = document.querySelector(`.msl-measure-row[data-index="${index}"]`);
  if (!row) return;

  row.classList.remove('visible');
  setTimeout(() => {
    row.remove();
    updateAddButton();
    updateRemoveButtons();
    updateAllCalculations();
  }, 300);
}

function updateRemoveButtons() {
  const rows = document.querySelectorAll('.msl-measure-row');
  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.disabled = rows.length <= 1; // Always keep at least IPR
  });
}

function updateAddButton() {
  const btn = document.getElementById('btn-add-measure');
  const count = document.querySelectorAll('.msl-measure-row').length;
  if (btn) {
    btn.disabled = count >= 1 + MAX_ADDITIONAL_MEASURES;
    btn.textContent = count >= 1 + MAX_ADDITIONAL_MEASURES
      ? 'Maximum Measures Reached'
      : '+ Add Measure';
  }
}

// ===================================
// RESET
// ===================================

function resetAll() {
  const container = document.getElementById('msl-list');
  container.innerHTML = '';
  rowCounter = 1;

  const iprRow = createMeasureRow(1, true);
  container.appendChild(iprRow);
  setTimeout(() => iprRow.classList.add('visible'), 10);

  localStorage.removeItem(STORAGE_KEY);
  updateAddButton();
  updateRemoveButtons();
  updateAllCalculations();
}

// ===================================
// CALCULATION DETAILS MODAL
// ===================================

function showCalculationDetails() {
  const result = calculateMSL();
  const details = document.getElementById('calculation-details');
  const modal = document.getElementById('calculation-modal');

  if (!result.valid) {
    details.innerHTML = `
      <div class="modal-alert">
        <p>Please complete all measures and ensure weights total 30%.</p>
      </div>
    `;
    modal.style.display = 'flex';
    return;
  }

  let html = '<div class="calc-section">';
  html += '<h3>MSL Score Calculation</h3>';
  html += '<p><strong>Method:</strong> Each actual score is normalized within its min–max range, scaled to 300, then weighted.</p>';
  html += '<p><strong>Formula per measure:</strong> <code>((Actual − Min) / (Max − Min)) × 300 × (Weight / 30)</code></p>';

  html += '<table class="calc-table"><thead><tr>';
  html += '<th>Measure</th><th>Actual</th><th>Range</th><th>Normalized</th><th>Scaled (300)</th><th>Weight</th><th>Weighted</th>';
  html += '</tr></thead><tbody>';

  result.measures.forEach(m => {
    html += `<tr>
      <td>${m.name || '—'}</td>
      <td>${m.actual}</td>
      <td>${m.minScore} – ${m.maxScore}</td>
      <td>${(m.normalized * 100).toFixed(1)}%</td>
      <td>${m.scaled300}</td>
      <td>${m.weight}%</td>
      <td>${m.weighted}</td>
    </tr>`;
  });

  html += '</tbody></table>';

  html += '<div class="final-calc-box">';
  html += `<div class="calc-row total"><span>Total MSL Score:</span><span>${result.score} / 300</span></div>`;
  html += `<div class="calc-row"><span>Percentage:</span><span>${result.percentage.toFixed(1)}%</span></div>`;
  html += `<div class="calc-row randa"><span>COPMS RANDA Entry Value:</span><span class="randa-value">${(result.score / 100).toFixed(2)}</span></div>`;
  html += `<div class="calc-row result"><span>Rating:</span><span>${result.rating}</span></div>`;
  html += '</div></div>';

  details.innerHTML = html;
  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('calculation-modal').style.display = 'none';
}

function openAboutModal() {
  document.getElementById('about-modal').style.display = 'flex';
}

function closeAboutModal() {
  document.getElementById('about-modal').style.display = 'none';
}

// ===================================
// COPY SUMMARY
// ===================================

function copySummary() {
  const result = calculateMSL();
  if (!result.valid) {
    alert('Please complete all measures before copying.');
    return;
  }

  let text = 'MSL Score Summary\n';
  text += '=================\n\n';
  text += `MSL Score: ${result.score} / 300\n`;
  text += `COPMS RANDA Entry Value: ${(result.score / 100).toFixed(2)}\n`;
  text += `Rating: ${result.rating}\n`;
  text += `Percentage: ${result.percentage.toFixed(1)}%\n\n`;
  text += 'Measures:\n';

  result.measures.forEach(m => {
    text += `  • ${m.name}: ${m.actual} (range ${m.minScore}–${m.maxScore}), weight ${m.weight}% → ${m.weighted} pts\n`;
  });

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('btn-copy-summary');
    const orig = btn.innerHTML;
    btn.innerHTML = '✅ Copied!';
    setTimeout(() => btn.innerHTML = orig, 2000);
  }).catch(() => alert('Could not copy to clipboard.'));
}

// ===================================
// AUTO-SAVE / LOAD
// ===================================

function saveState() {
  const rows = document.querySelectorAll('.msl-measure-row');
  const state = { measures: [] };

  rows.forEach(row => {
    const idx = row.dataset.index;
    state.measures.push({
      index: idx,
      name: document.getElementById(`msl-name-${idx}`)?.value || '',
      desc: document.getElementById(`msl-desc-${idx}`)?.value || '',
      weight: document.getElementById(`msl-weight-${idx}`)?.value || '',
      min: document.getElementById(`msl-min-${idx}`)?.value || '',
      max: document.getElementById(`msl-max-${idx}`)?.value || '',
      actual: document.getElementById(`msl-actual-${idx}`)?.value || ''
    });
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return false;

  try {
    const state = JSON.parse(saved);
    const container = document.getElementById('msl-list');
    container.innerHTML = '';

    state.measures.forEach((m, i) => {
      const isIPR = i === 0;
      const row = createMeasureRow(m.index, isIPR);
      container.appendChild(row);

      // Restore values (non-readonly fields)
      const nameEl = document.getElementById(`msl-name-${m.index}`);
      const weightEl = document.getElementById(`msl-weight-${m.index}`);
      const minEl = document.getElementById(`msl-min-${m.index}`);
      const maxEl = document.getElementById(`msl-max-${m.index}`);
      const actualEl = document.getElementById(`msl-actual-${m.index}`);

      if (nameEl && !isIPR) nameEl.value = m.name;
      const descEl = document.getElementById(`msl-desc-${m.index}`);
      if (descEl) descEl.value = m.desc || '';
      if (weightEl) weightEl.value = m.weight;
      if (minEl && !isIPR) minEl.value = m.min;
      if (maxEl && !isIPR) maxEl.value = m.max;
      if (actualEl) actualEl.value = m.actual;

      setTimeout(() => row.classList.add('visible'), 10);
    });

    rowCounter = Math.max(...state.measures.map(m => parseInt(m.index)), 1);
    return true;
  } catch (e) {
    console.error('Failed to load state:', e);
    return false;
  }
}

// ===================================
// INIT
// ===================================

function init() {
  const loaded = loadState();

  if (!loaded) {
    const container = document.getElementById('msl-list');
    const iprRow = createMeasureRow(1, true);
    container.appendChild(iprRow);
    setTimeout(() => {
      iprRow.classList.add('visible');
      document.getElementById('msl-actual-1')?.focus();
    }, 150);
  }

  // Event listeners
  document.getElementById('btn-add-measure')?.addEventListener('click', addMeasure);
  document.getElementById('btn-reset')?.addEventListener('click', resetAll);
  document.getElementById('btn-show-calculations')?.addEventListener('click', showCalculationDetails);
  document.getElementById('btn-copy-summary')?.addEventListener('click', copySummary);
  document.getElementById('btn-print')?.addEventListener('click', () => {
    const dateEl = document.getElementById('print-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    window.print();
  });

  document.getElementById('btn-about-tool')?.addEventListener('click', openAboutModal);

  // Modal close
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-overlay')?.addEventListener('click', closeModal);
  document.getElementById('about-modal-close')?.addEventListener('click', closeAboutModal);
  document.getElementById('about-modal-overlay')?.addEventListener('click', closeAboutModal);

  // Tooltip
  document.querySelectorAll('.tooltip-trigger').forEach(trigger => {
    trigger.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const tooltipId = 'tooltip-' + trigger.dataset.tooltip;
      const tooltip = document.getElementById(tooltipId);
      document.querySelectorAll('.tooltip').forEach(t => {
        if (t.id !== tooltipId) t.style.display = 'none';
      });
      if (tooltip) tooltip.style.display = tooltip.style.display === 'block' ? 'none' : 'block';
    });
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.tooltip-trigger')) {
      document.querySelectorAll('.tooltip').forEach(t => t.style.display = 'none');
    }
  });

  updateAddButton();
  updateRemoveButtons();
  updateAllCalculations();
}

// Global for onclick attributes
window.removeMeasure = removeMeasure;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
