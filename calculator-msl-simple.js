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

/**
 * Escape user-supplied strings before inserting into innerHTML.
 */
function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const debouncedUpdate = debounce(updateAllCalculations, 60);

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

// ===================================
// HELPERS
// ===================================

/**
 * Returns rating label for a given MSL score.
 * Uses floating-point-safe boundaries (>200, >=100, else).
 */
function getMSLRating(score) {
  if (score > 200) return 'More Than Expected';
  if (score >= 100) return 'Expected';
  return 'Less Than Expected';
}

/**
 * Returns the current academic school year string (e.g. "2026-2027").
 * A new school year starts on July 1 (month >= 6).
 */
function getCurrentSchoolYear() {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

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
  const rows = document.querySelectorAll('.msl-measure-row:not(.is-removing)');
  if (rows.length === 0) {
    return { score: 0, rating: '—', percentage: 0, measures: [], totalWeight: 0, weightsValid: false, goalsValid: false, valid: false };
  }

  let totalWeight = 0;
  let totalWeightedScore = 0;
  const measures = [];
  let allFilled = true;
  let allGoalsSet = true;

  rows.forEach(row => {
    const idx = row.dataset.index;
    const isIPR = row.classList.contains('ipr-row') || idx == 1;
    const nameEl = document.getElementById(`msl-name-${idx}`);
    const weightEl = document.getElementById(`msl-weight-${idx}`);
    const goalEl = document.getElementById(`msl-goal-${idx}`);
    const maxEl = document.getElementById(`msl-max-${idx}`);
    const actualEl = document.getElementById(`msl-actual-${idx}`);

    const descEl = document.getElementById(`msl-desc-${idx}`);
    const desc = descEl ? descEl.value.trim() : '';

    const name = nameEl ? nameEl.value : `Measure ${idx}`;
    const weight = parseFloat(weightEl?.value) || 0;
    const goalScore = isIPR ? 50 : parseFloat(goalEl?.value);
    const maxScore = isIPR ? 100 : parseFloat(maxEl?.value);
    const minScore = 2 * goalScore - maxScore;
    const actualRaw = actualEl?.value;
    const actual = parseFloat(actualRaw);

    totalWeight += weight;

    const hasGoalAndMax = isIPR || (!isNaN(goalScore) && goalEl?.value !== '' && !isNaN(maxScore) && maxEl?.value !== '' && maxScore > goalScore);
    const hasActual = !isNaN(actual) && actualRaw !== '';
    const invalidRange = !isIPR && !isNaN(goalScore) && !isNaN(maxScore) && maxScore <= goalScore;

    if (!hasGoalAndMax || weight <= 0) {
      allGoalsSet = false;
    }

    if (!hasGoalAndMax || !hasActual || weight <= 0) {
      allFilled = false;
      measures.push({
        name, desc, weight, goalScore: isNaN(goalScore) ? 0 : goalScore,
        maxScore: isNaN(maxScore) ? 0 : maxScore, minScore: isNaN(minScore) ? 0 : minScore,
        actual: hasActual ? actual : 0, hasActual, hasGoalAndMax, isIPR,
        normalized: 0, scaled300: 0, weighted: 0, filled: false, invalidRange
      });
      return;
    }

    const normalized = normalize(actual, minScore, maxScore);
    const scaled300 = round2(normalized * MSL_MAX_SCALED);
    const weighted = round2(scaled300 * (weight / MSL_TOTAL_WEIGHT));

    totalWeightedScore += weighted;

    measures.push({
      name,
      desc,
      weight,
      goalScore,
      minScore,
      maxScore,
      actual,
      hasActual: true,
      hasGoalAndMax: true,
      isIPR,
      normalized: round2(normalized),
      percentage: round2(normalized * 100),
      scaled300,
      weighted,
      filled: true,
      invalidRange: false
    });
  });

  const weightsValid = Math.abs(totalWeight - MSL_TOTAL_WEIGHT) < 0.01;
  const goalsValid = weightsValid && allGoalsSet && rows.length >= 1;
  const valid = allFilled && weightsValid && rows.length >= 1;
  const mslScore = round2(totalWeightedScore);

  const rating = valid ? getMSLRating(mslScore) : '—';

  return {
    score: mslScore,
    rating,
    percentage: round2((mslScore / MSL_MAX_SCALED) * 100),
    measures,
    totalWeight: round2(totalWeight),
    weightsValid,
    goalsValid,
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
        const isIPRRow = row.classList.contains('ipr-row') || row.dataset.index == 1;
        if (isIPRRow) {
          feedbackEl.textContent = `${m.percentage}% of IPR range (0–100) → ${m.scaled300} / 300 scale → contributes ${m.weighted} pts`;
        } else {
          feedbackEl.textContent = `${m.percentage}% of range (Min: ${m.minScore}, Goal: ${m.goalScore}, Max: ${m.maxScore}) → ${m.scaled300} / 300 scale → contributes ${m.weighted} pts`;
        }
        feedbackEl.className = 'measure-feedback visible';
      } else if (m.invalidRange) {
        feedbackEl.textContent = `⚠ Max Score (${m.maxScore}) must be greater than Goal Score (${m.goalScore})`;
        feedbackEl.className = 'measure-feedback visible validation-error';
      } else {
        feedbackEl.textContent = '';
        feedbackEl.className = 'measure-feedback';
      }
    }

    // Visual Range Bar
    const marker = row.querySelector('.measure-range-marker');
    const minLabel = row.querySelector('.measure-range-label-min');
    const maxLabel = row.querySelector('.measure-range-label-max');
    
    if (minLabel) minLabel.textContent = !m.filled ? 'Min' : `Min (${m.minScore})`;
    if (maxLabel) maxLabel.textContent = !m.filled ? 'Max' : `Max (${m.maxScore})`;
    
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
  const summaryOverlayContent = document.getElementById('summary-overlay-content');
  const summaryMarker = document.getElementById('summary-score-marker');
  const summaryRanda = document.getElementById('summary-randa-score');
  const printBadge = document.getElementById('print-mode-badge');

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
    
    // Guided placeholder overlay
    const filledCount = result.measures.filter(m => m.hasActual).length;
    const totalCount = result.measures.length;
    let guideMsg = '';
    
    if (!result.weightsValid) {
      guideMsg = `📋 Set total MSL weight to 30.0% (currently ${result.totalWeight.toFixed(1)}%)`;
    } else if (!result.goalsValid) {
      guideMsg = `📋 Enter Goal Score and Max Score for all measures`;
    } else {
      guideMsg = `📋 Enter score achieved for all measures (${filledCount}/${totalCount} entered)`;
    }

    if (summaryOverlayContent) {
      summaryOverlayContent.innerHTML = `<p>${guideMsg}</p>`;
    }
    if (summaryOverlay) summaryOverlay.style.display = 'flex';
    if (summaryMarker) summaryMarker.style.display = 'none';
  }

  // Update live print document status badge
  if (printBadge) {
    if (result.valid) {
      printBadge.textContent = '📄 EOY Final Evaluation Report (Ready)';
      printBadge.className = 'print-mode-badge badge-eoy';
    } else if (result.goalsValid) {
      printBadge.textContent = '📄 BOY Goal Plan & Agreement (Ready)';
      printBadge.className = 'print-mode-badge badge-boy';
    } else {
      printBadge.textContent = '⚠️ Configuration Incomplete';
      printBadge.className = 'print-mode-badge badge-incomplete';
    }
  }

  // Update print-only summary table
  updatePrintSummary(result);

  // Save
  saveState();
}

/**
 * Dynamically generate a clean, high-contrast B&W print document for BOY Goal Plan or EOY Evaluation
 */
function updatePrintSummary(result) {
  const container = document.getElementById('print-measures-table-container');
  if (!container) return;

  const docTitleEl = document.getElementById('print-doc-title');

  // Case 1: Incomplete configuration (weights != 30% or missing Goal/Max scores)
  if (!result.goalsValid && !result.valid) {
    if (docTitleEl) docTitleEl.textContent = 'Measures of Student Learning (MSL) — Configuration Incomplete';
    container.innerHTML = `
      <div class="print-card" style="border: 1px solid #000000; padding: 15px; text-align: center; font-weight: bold; margin: 15px 0; background: #ffffff;">
        ⚠️ Configuration incomplete: Ensure total MSL weight equals 30.0% and Goal/Max scores are set for all measures to generate print document.
      </div>
    `;
    return;
  }

  // Case 2: End of Year (EOY) Final Evaluation Report (All scores entered)
  if (result.valid) {
    if (docTitleEl) docTitleEl.textContent = 'Measures of Student Learning (MSL) — Final Evaluation Report';

    let html = `
      <div class="print-summary-box">
        <div class="print-summary-item">
          <div class="print-summary-label">Final MSL Score</div>
          <div class="print-summary-value">${result.score.toFixed(2)} / 300.00</div>
        </div>
        <div class="print-summary-item">
          <div class="print-summary-label">COPMS RANDA Entry Value</div>
          <div class="print-summary-value">${(result.score / 100).toFixed(2)}</div>
        </div>
        <div class="print-summary-item">
          <div class="print-summary-label">Final MSL Rating</div>
          <div class="print-summary-value">${result.rating}</div>
        </div>
      </div>

      <table class="results-table">
        <thead>
          <tr>
            <th style="text-align: left;">Measure Name</th>
            <th style="width: 10%;">Weight</th>
            <th style="width: 12%;">Goal Score</th>
            <th style="width: 12%;">Max Score</th>
            <th style="width: 18%;">Calculated Range (Min–Max)</th>
            <th style="width: 14%;">Score Achieved</th>
            <th style="width: 12%;">% of Range</th>
            <th style="width: 12%;">Contribution</th>
          </tr>
        </thead>
        <tbody>
    `;

    result.measures.forEach((m, idx) => {
      const displayName = escapeHTML(m.name ? m.name.trim() : `Measure ${idx + 1}`);
      const descText = escapeHTML(m.desc ? m.desc.trim() : '');

      html += `
        <tr>
          <td style="text-align: left; font-weight: bold;">${displayName}</td>
          <td style="text-align: center;">${m.weight.toFixed(1)}%</td>
          <td style="text-align: center;">${m.goalScore}</td>
          <td style="text-align: center;">${m.maxScore}</td>
          <td style="text-align: center;">${m.minScore} – ${m.maxScore}</td>
          <td style="text-align: center; font-weight: bold;">${m.actual}</td>
          <td style="text-align: center;">${m.percentage.toFixed(1)}%</td>
          <td style="text-align: center; font-weight: bold;">${m.weighted.toFixed(2)} pts</td>
        </tr>
      `;

      if (descText) {
        html += `
          <tr>
            <td colspan="8" style="text-align: left; font-size: 8.5pt; color: #333333; background: #fafafa; padding: 4px 8px 6px 16px; font-style: italic; border-top: none;">
              <strong>Description:</strong> ${descText}
            </td>
          </tr>
        `;
      }
    });

    html += `
        </tbody>
        <tfoot>
          <tr>
            <td style="text-align: left;">Total Weight / Final MSL Score</td>
            <td style="text-align: center;">${result.totalWeight.toFixed(1)}%</td>
            <td style="text-align: center;" colspan="5"></td>
            <td style="text-align: center;">${result.score.toFixed(2)} / 300.00</td>
          </tr>
        </tfoot>
      </table>

      <div class="print-footnote">
        <strong>Scoring Methodology:</strong> Each measure's score achieved is linearly normalized within its range [Min, Max], scaled to 300 points, and weighted by its contribution to the 30% MSL evaluation total. Minimum Score is calculated at an equal distance below Goal Score: <code>Min = 2 × Goal − Max</code>.
      </div>
    `;

    container.innerHTML = html;
    return;
  }

  // Case 3: Beginning of Year (BOY) Goal Plan & Agreement (Weights = 30%, Goals/Max set, Actual scores pending)
  if (docTitleEl) docTitleEl.textContent = 'Measures of Student Learning (MSL) — Goal Plan & Agreement';

  let html = `
    <div class="print-summary-box">
      <div class="print-summary-item">
        <div class="print-summary-label">Target Evaluation Weight</div>
        <div class="print-summary-value">${result.totalWeight.toFixed(1)}% of Overall Evaluation</div>
      </div>
      <div class="print-summary-item">
        <div class="print-summary-label">Configured Measures</div>
        <div class="print-summary-value">${result.measures.length} Measures Established</div>
      </div>
      <div class="print-summary-item">
        <div class="print-summary-label">Document Status</div>
        <div class="print-summary-value">Goal Plan Established</div>
      </div>
    </div>

    <table class="results-table">
      <thead>
        <tr>
          <th style="text-align: left;">Measure Name</th>
          <th style="width: 10%;">Weight</th>
          <th style="width: 13%;">Goal Score (Midpoint)</th>
          <th style="width: 13%;">Max Score (Upper)</th>
          <th style="width: 20%;">Calculated Min (Floor)*</th>
          <th style="width: 18%;">Score Achieved</th>
          <th style="width: 12%;">Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  result.measures.forEach((m, idx) => {
    const displayName = escapeHTML(m.name ? m.name.trim() : `Measure ${idx + 1}`);
    const descText = escapeHTML(m.desc ? m.desc.trim() : '');

    html += `
      <tr>
        <td style="text-align: left; font-weight: bold;">${displayName}</td>
        <td style="text-align: center;">${m.weight.toFixed(1)}%</td>
        <td style="text-align: center;">${m.goalScore}</td>
        <td style="text-align: center;">${m.maxScore}</td>
        <td style="text-align: center;">${m.minScore}</td>
        <td style="text-align: center; color: #555;">__________________</td>
        <td style="text-align: center; font-weight: bold;">Goal Set</td>
      </tr>
    `;

    if (descText) {
      html += `
        <tr>
          <td colspan="7" style="text-align: left; font-size: 8.5pt; color: #333333; background: #fafafa; padding: 4px 8px 6px 16px; font-style: italic; border-top: none;">
            <strong>Description:</strong> ${descText}
          </td>
        </tr>
      `;
    } else {
      html += `
        <tr>
          <td colspan="7" style="text-align: left; font-size: 8.5pt; color: #666666; background: #fafafa; padding: 4px 8px 6px 16px; font-style: italic; border-top: none;">
            <strong>Description:</strong> ____________________________________________________________________________________
          </td>
        </tr>
      `;
    }
  });

  html += `
      </tbody>
      <tfoot>
        <tr>
          <td style="text-align: left;">Total Configured Weight</td>
          <td style="text-align: center;">${result.totalWeight.toFixed(1)}%</td>
          <td style="text-align: center;" colspan="4"></td>
          <td style="text-align: center;">Pending EOY</td>
        </tr>
      </tfoot>
    </table>

    <div class="print-footnote">
      * <strong>Note:</strong> The Minimum Score represents the score range floor and is automatically calculated at an equal distance below Goal Score: <code>Min = Goal − (Max − Goal) = 2 × Goal − Max</code>. Score Achieved will be documented and evaluated at the End of Year evaluation meeting.
    </div>
  `;

  container.innerHTML = html;
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
  const goalVal = isIPR ? 50 : '';
  const maxVal = isIPR ? IPR_MAX : '';
  const readonlyAttr = isIPR ? 'readonly class="readonly-field"' : '';
  const weightReadonly = ''; // No longer readonly for IPR

  row.innerHTML = `
    <div class="msl-measure-header">
      <span class="msl-measure-number">
        ${isIPR ? 'Measure 1 — IPR <span class="ipr-badge">Foundational</span>' : `Measure ${index}`}
      </span>
      ${!isIPR ? `<button type="button" class="btn-remove" data-remove-index="${index}" aria-label="Remove measure">Remove</button>` : ''}
    </div>

    <div class="measure-fields">
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

      ${!isIPR ? `
      <div class="form-group field-range">
        <label for="msl-goal-${index}">🎯 Goal Score</label>
        <input type="number" id="msl-goal-${index}" step="any" value="${goalVal}" placeholder="85">
      </div>

      <div class="form-group field-range">
        <label for="msl-max-${index}">Max Score</label>
        <input type="number" id="msl-max-${index}" step="any" value="${maxVal}" placeholder="100">
      </div>
      ` : ''}

      <div class="form-group field-actual">
        <label for="msl-actual-${index}">📊 Score Achieved</label>
        <input type="number" id="msl-actual-${index}" step="any" placeholder="Enter score">
      </div>
    </div>

    <div class="measure-visual-feedback">
      <div class="measure-range-bar-container">
        <div class="measure-range-bar"></div>
        <div class="measure-range-marker" style="left: 0%; opacity: 0.3;"></div>
        <span class="measure-range-label-min">${isIPR ? 'Min (0)' : 'Min'}</span>
        <span class="measure-range-label-max">${isIPR ? 'Max (100)' : 'Max'}</span>
      </div>
      <div class="measure-feedback"></div>
    </div>
  `;

  // Attach listeners to all inputs and textareas
  row.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', debouncedUpdate);
  });

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
  if (!row || row.classList.contains('is-removing')) return;

  row.classList.add('is-removing');
  row.classList.remove('visible');
  updateAddButton();
  updateRemoveButtons();
  updateAllCalculations();

  setTimeout(() => {
    row.remove();
    updateAddButton();
    updateRemoveButtons();
    updateAllCalculations();
  }, 300);
}

function updateRemoveButtons() {
  const rows = document.querySelectorAll('.msl-measure-row:not(.is-removing)');
  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.disabled = rows.length <= 1; // Always keep at least IPR
  });
}

function updateAddButton() {
  const btn = document.getElementById('btn-add-measure');
  const count = document.querySelectorAll('.msl-measure-row:not(.is-removing)').length;
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
  if (!confirm('Are you sure you want to reset all MSL measures and calculations?')) {
    return;
  }

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
  showToast('✓ All measures reset to default.');
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
  html += '<p><strong>Method:</strong> Each measure is configured with a <strong>Goal Score</strong> (the midpoint) and a <strong>Max Score</strong>. The Minimum Score is calculated at an equal distance below Goal Score: <code>Min = 2 × Goal − Max</code>. The actual score is normalized within the resulting [Min, Max] range, scaled to 300, and weighted.</p>';
  html += '<p><strong>Formula per measure:</strong> <code>((Actual − Min) / (Max − Min)) × 300 × (Weight / 30)</code></p>';

  html += '<div class="table-scroll"><table class="calc-table"><thead><tr>';
  html += '<th>Measure</th><th>Actual</th><th>Goal (Midpoint)</th><th>Max</th><th>Calculated Min</th><th>% of Range</th><th>Scaled (300)</th><th>Weight</th><th>Weighted</th>';
  html += '</tr></thead><tbody>';

  result.measures.forEach(m => {
    html += `<tr>
      <td>${escapeHTML(m.name || '—')}</td>
      <td>${m.actual}</td>
      <td>${m.goalScore}</td>
      <td>${m.maxScore}</td>
      <td>${m.minScore}</td>
      <td>${(m.normalized * 100).toFixed(1)}%</td>
      <td>${m.scaled300}</td>
      <td>${m.weight}%</td>
      <td>${m.weighted}</td>
    </tr>`;
  });

  html += '</tbody></table></div>';

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
// TOAST NOTIFICATIONS
// ===================================

function showToast(message) {
  const toast = document.getElementById('toast-notification');
  const toastMsg = document.getElementById('toast-message');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  toast.classList.add('visible');

  if (toast._timeout) clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2800);
}

// ===================================
// COPY SUMMARY
// ===================================

/**
 * Fallback clipboard copy for non-secure contexts (e.g. file:// URLs).
 */
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { /* ignore */ }
  document.body.removeChild(ta);
  return ok;
}

function copySummary() {
  const result = calculateMSL();
  if (!result.valid) {
    showToast('⚠️ Complete all measures before copying.');
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
    text += `  • ${m.name}: ${m.actual} (Goal ${m.goalScore}, Max ${m.maxScore}, Min ${m.minScore}), weight ${m.weight}% → ${m.weighted} pts\n`;
  });

  const onSuccess = () => {
    const btn = document.getElementById('btn-copy-summary');
    const orig = btn.innerHTML;
    btn.innerHTML = '✅ Copied!';
    showToast('✓ MSL summary copied to clipboard!');
    setTimeout(() => btn.innerHTML = orig, 2000);
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
      if (fallbackCopy(text)) onSuccess();
      else showToast('⚠️ Could not copy to clipboard.');
    });
  } else if (fallbackCopy(text)) {
    onSuccess();
  } else {
    showToast('⚠️ Could not copy to clipboard.');
  }
}

// ===================================
// AUTO-SAVE / LOAD
// ===================================

function saveState() {
  const rows = document.querySelectorAll('.msl-measure-row:not(.is-removing)');
  const state = { measures: [] };

  rows.forEach(row => {
    const idx = row.dataset.index;
    state.measures.push({
      index: idx,
      name: document.getElementById(`msl-name-${idx}`)?.value || '',
      desc: document.getElementById(`msl-desc-${idx}`)?.value || '',
      weight: document.getElementById(`msl-weight-${idx}`)?.value || '',
      goal: document.getElementById(`msl-goal-${idx}`)?.value || '',
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
    if (!state.measures || state.measures.length === 0) return false;
    const container = document.getElementById('msl-list');
    container.innerHTML = '';

    state.measures.forEach((m, i) => {
      const isIPR = i === 0;
      const row = createMeasureRow(m.index, isIPR);
      container.appendChild(row);

      // Restore values (non-readonly fields)
      const nameEl = document.getElementById(`msl-name-${m.index}`);
      const weightEl = document.getElementById(`msl-weight-${m.index}`);
      const goalEl = document.getElementById(`msl-goal-${m.index}`);
      const maxEl = document.getElementById(`msl-max-${m.index}`);
      const actualEl = document.getElementById(`msl-actual-${m.index}`);

      if (nameEl && !isIPR) nameEl.value = m.name;
      const descEl = document.getElementById(`msl-desc-${m.index}`);
      if (descEl) descEl.value = m.desc || '';
      if (weightEl) weightEl.value = m.weight;
      if (goalEl && !isIPR) {
        if (m.goal !== undefined && m.goal !== '') {
          goalEl.value = m.goal;
        } else if (m.min !== undefined && m.max !== undefined && m.min !== '' && m.max !== '') {
          goalEl.value = (parseFloat(m.min) + parseFloat(m.max)) / 2;
        }
      }
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

  // Delegated remove-measure handler — avoids inline onclick and global window export
  document.getElementById('msl-list')?.addEventListener('click', e => {
    const btn = e.target.closest('.btn-remove');
    if (btn) removeMeasure(btn.dataset.removeIndex);
  });

  // Set dynamic school year in print header
  const schoolYearEl = document.getElementById('print-school-year');
  if (schoolYearEl) schoolYearEl.textContent = getCurrentSchoolYear();

  // Modal close
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-overlay')?.addEventListener('click', closeModal);
  document.getElementById('about-modal-close')?.addEventListener('click', closeAboutModal);
  document.getElementById('about-modal-overlay')?.addEventListener('click', closeAboutModal);

  // Close modals on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeAboutModal();
    }
  });

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
