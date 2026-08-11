// ===================================
// RANDA Scoring Weight Calculator
// 70:30 Teacher Evaluation Scoring
// (70% Professional Practices / 30% Measures of Student Learning)
// Uses simple proportional MSL calculation
// ===================================

// ===================================
// LOCAL CONSTANTS
// ===================================

const MSL_TOTAL_WEIGHT = 30;
const IPR_WEIGHT = 10;
const IPR_MIN = 0;
const IPR_MAX = 100;
const MAX_ADDITIONAL_MEASURES = 3;

// Create debounced version of updateAllCalculations
const debouncedUpdate = debounce(updateAllCalculations, 150);

// ===================================
// VALIDATION FUNCTIONS
// ===================================

function isStep3Valid() {
  const rows = document.querySelectorAll('.msl-measure-row');
  if (rows.length < 2) return false;

  const weights = [];
  let allFieldsFilled = true;

  rows.forEach(row => {
    const idx = row.dataset.index;
    const weightEl = document.getElementById(`msl-weight-${idx}`);
    const minEl = document.getElementById(`msl-min-${idx}`);
    const maxEl = document.getElementById(`msl-max-${idx}`);
    const actualEl = document.getElementById(`msl-actual-${idx}`);

    if (weightEl) weights.push(parseNum(weightEl.value));

    if (!weightEl?.value || !minEl?.value || !maxEl?.value || !actualEl?.value ||
        minEl.value === '' || maxEl.value === '' || actualEl.value === '') {
      allFieldsFilled = false;
    }
  });

  return allFieldsFilled && validateWeights(weights, 30).valid;
}

// ===================================
// MSL CALCULATIONS - SIMPLE PROPORTIONAL
// ===================================

/**
 * Normalize an actual score within a min-max range to 0-1.
 * Clamps to [0, 1] if actual is outside bounds.
 */
function normalize(actual, min, max) {
  if (max <= min) return 0;
  return clamp((actual - min) / (max - min), 0, 1);
}

function calculateMSLScore() {
  const rows = document.querySelectorAll('.msl-measure-row');
  if (rows.length === 0) {
    return { base: 0, score: 0, percentage: 0, rating: '—', measures: [], totalWeight: 0, weightsValid: false, goalsValid: false, valid: false };
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
        normalized: 0, percentage: 0, scaled300: 0, weighted: 0, filled: false, invalidRange
      });
      return;
    }

    const norm = normalize(actual, minScore, maxScore);
    const scaled300 = round2(norm * MSL_MAX_SCORE);
    const weighted = round2(scaled300 * (weight / MSL_TOTAL_WEIGHT));

    totalWeightedScore += weighted;

    measures.push({
      name, desc, weight, goalScore, minScore, maxScore, actual,
      hasActual: true, hasGoalAndMax: true, isIPR,
      normalized: round2(norm),
      percentage: round2(norm * 100),
      scaled300, weighted, filled: true, invalidRange: false
    });
  });

  const weightsValid = Math.abs(totalWeight - MSL_TOTAL_WEIGHT) < EPSILON;
  const goalsValid = weightsValid && allGoalsSet && rows.length >= 1;
  const valid = allFilled && weightsValid && rows.length >= 1;
  const mslScore = round2(totalWeightedScore);
  const mslBase = round2(mslScore / MSL_MULTIPLIER);
  const mslPct = pct(mslScore / MSL_MAX_SCORE);

  let rating = '—';
  if (valid) {
    rating = getRatingLabel(mslScore, MSL_RATING_RANGES);
  }

  return {
    base: mslBase, score: mslScore, percentage: mslPct, rating,
    measures, totalWeight: round2(totalWeight), weightsValid, goalsValid, valid
  };
}

// ===================================
// FINAL EFFECTIVENESS CALCULATIONS
// ===================================

function calculateFinalRating(ppScore700, mslScore300, mslRating) {
  const total = round2(ppScore700 + mslScore300);
  let rating = getRatingLabel(total, FINAL_RATING_RANGES);

  // Apply MSL constraint: if MSL is "Less Than Expected", cap at "Effective"
  if (mslRating === 'Less Than Expected' && rating === 'Highly Effective') {
    rating = 'Effective';
  }

  return { total, rating };
}

// ===================================
// UI UPDATE FUNCTIONS
// ===================================

function updateMSLUI(mslResult) {
  safeTextContent(document.getElementById('msl-base'), mslResult.base.toString());
  safeTextContent(document.getElementById('msl-score'), mslResult.score.toString());
  safeTextContent(document.getElementById('msl-percentage'), mslResult.percentage.toFixed(1) + '%');

  const mslRatingEl = document.getElementById('msl-rating');
  safeTextContent(mslRatingEl, mslResult.rating);
  applyRatingClass(mslRatingEl, mslResult.rating, true);

  // Update progress indicator
  updateProgressIndicator();
}

// ===================================
// MAIN CALCULATION UPDATE
// ===================================

function updateAllCalculations() {
  // Step 1: Validate PP weights
  const ppWeights = [1, 2, 3, 4].map(i =>
    parseNum(document.getElementById(`pp-weight-s${i}`)?.value)
  );
  const ppWeightValidation = validateWeights(ppWeights, 100);
  const ppWeightTotal = document.getElementById('total-pp-weight');
  if (ppWeightTotal) ppWeightTotal.textContent = ppWeightValidation.sum.toFixed(1);

  setValidationUI(
    'pp-weight-message',
    ppWeightValidation.valid,
    ppWeightValidation.valid ? '✓ Total equals 100%' : `⚠ Total must equal 100% (currently ${ppWeightValidation.sum.toFixed(1)}%)`
  );

  // Add visual feedback to weight inputs
  [1, 2, 3, 4].forEach(i => {
    const input = document.getElementById(`pp-weight-s${i}`);
    if (input) {
      input.classList.remove('valid', 'invalid');
      if (input.value && parseNum(input.value) > 0) {
        input.classList.add(ppWeightValidation.valid ? 'valid' : 'invalid');
      }
    }
  });

  // Step 2: Calculate PP scores
  const ppResult = calculatePPScore();
  updatePPUI(ppResult, updateProgressIndicator);

  // Step 3: Calculate MSL (includes weight validation)
  const mslResult = calculateMSLScore();

  // MSL Weight validation display
  const mslWeightTotal = document.getElementById('total-msl-weight');
  const mslWeightMsg = document.getElementById('msl-weight-message');
  if (mslWeightTotal) mslWeightTotal.textContent = mslResult.totalWeight.toFixed(1);
  if (mslWeightMsg) {
    if (mslResult.weightsValid) {
      mslWeightMsg.textContent = '✓ Total equals 30%';
      mslWeightMsg.className = 'validation-success';
    } else {
      mslWeightMsg.textContent = `⚠ Total must equal 30% (currently ${mslResult.totalWeight.toFixed(1)}%)`;
      mslWeightMsg.className = 'validation-error';
    }
  }

  // Update Status Checklist
  const statusWeights = document.getElementById('status-weights');
  const statusScores = document.getElementById('status-scores');
  if (statusWeights) {
    statusWeights.className = `status-item ${mslResult.weightsValid ? 'complete' : 'incomplete'}`;
    statusWeights.querySelector('.status-icon').textContent = mslResult.weightsValid ? '✓' : '⚖️';
  }
  if (statusScores) {
    const allFilled = mslResult.measures.every(m => m.filled);
    statusScores.className = `status-item ${allFilled ? 'complete' : 'incomplete'}`;
    statusScores.querySelector('.status-icon').textContent = allFilled ? '✓' : '🎯';
  }

  // Per-measure feedback
  mslResult.measures.forEach((m, i) => {
    const row = document.querySelectorAll('.msl-measure-row')[i];
    if (!row) return;

    const feedbackEl = row.querySelector('.measure-feedback');
    if (feedbackEl) {
      if (m.filled) {
        const isIPRRow = row.classList.contains('ipr-row') || row.getAttribute('data-index') == 1;
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

  updateMSLUI(mslResult);

  // Step 4: Check if all steps are valid
  const step1Valid = isStep1Valid(parseNum);
  const step2Complete = isStep2Complete();
  const step3Valid = mslResult.valid;

  const allValid = step1Valid && step2Complete && step3Valid;

  // Update summary box
  const summaryOverlay = document.getElementById('summary-overlay');
  const summaryTotalScore = document.getElementById('summary-total-score');
  const summaryRating = document.getElementById('summary-rating');
  const summaryScoreMarker = document.getElementById('summary-score-marker');

  if (allValid) {
    const finalResult = calculateFinalRating(ppResult.score, mslResult.score, mslResult.rating);
    if (summaryTotalScore) summaryTotalScore.textContent = finalResult.total.toString();
    if (summaryRating) {
      summaryRating.textContent = finalResult.rating;
      applyRatingClass(summaryRating, finalResult.rating, false);
    }
    if (summaryOverlay) summaryOverlay.style.display = 'none';
    if (summaryScoreMarker) {
      const percentage = (finalResult.total / 1000) * 100;
      summaryScoreMarker.style.left = percentage + '%';
      summaryScoreMarker.style.display = 'block';
    }
  } else {
    if (summaryTotalScore) summaryTotalScore.textContent = '—';
    if (summaryRating) {
      summaryRating.textContent = '—';
      stripRatingClasses(summaryRating);
    }
    if (summaryOverlay) summaryOverlay.style.display = 'flex';
    if (summaryScoreMarker) summaryScoreMarker.style.display = 'none';
    const footer = document.getElementById('sticky-footer');
    if (footer) footer.classList.remove('visible');
  }

  // Update PP overlay
  const ppValid = step1Valid && step2Complete;
  const ppSection = document.getElementById('pp-results');
  const ppOverlay = document.getElementById('pp-overlay');
  if (ppValid) {
    if (ppOverlay) ppOverlay.style.display = 'none';
    if (ppSection) ppSection.classList.remove('disabled');
  } else {
    if (ppOverlay) ppOverlay.style.display = 'flex';
    if (ppSection) ppSection.classList.add('disabled');
  }

  // Update MSL overlay
  const mslSection = document.getElementById('msl-results');
  const mslOverlay = document.getElementById('msl-overlay');
  if (step3Valid) {
    if (mslOverlay) mslOverlay.style.display = 'none';
    if (mslSection) mslSection.classList.remove('disabled');
  } else {
    if (mslOverlay) mslOverlay.style.display = 'flex';
    if (mslSection) mslSection.classList.add('disabled');
  }

  // Update Step 4 overlay
  const step4Section = document.getElementById('step4-results');
  const step4Overlay = document.getElementById('step4-overlay');
  if (allValid) {
    const finalResult = calculateFinalRating(ppResult.score, mslResult.score, mslResult.rating);
    updateFinalUI(finalResult, ppResult, mslResult, TOTAL_MAX_SCORE, updateProgressIndicator);
    if (step4Overlay) step4Overlay.style.display = 'none';
    if (step4Section) step4Section.classList.remove('disabled');
  } else {
    if (step4Overlay) step4Overlay.style.display = 'flex';
    if (step4Section) step4Section.classList.add('disabled');
  }

  // Update print-only summary table
  updatePrintSummary(mslResult);

  // Save state
  saveState(STORAGE_KEY_PRECISE);
}

/**
 * Dynamically generate a clean, high-contrast B&W print document for BOY Goal Plan or EOY Evaluation
 */
function updatePrintSummary(result) {
  const container = document.getElementById('print-measures-table-container');
  if (!container) return;

  const docTitleEl = document.getElementById('print-doc-title');

  if (!result.goalsValid && !result.valid) {
    if (docTitleEl) docTitleEl.textContent = 'Measures of Student Learning (MSL) — Configuration Incomplete';
    container.innerHTML = `
      <div class="print-card" style="border: 1px solid #000000; padding: 15px; text-align: center; font-weight: bold; margin: 15px 0; background: #ffffff;">
        ⚠️ Configuration incomplete: Ensure total MSL weight equals 30.0% and Goal/Max scores are set for all measures to generate print document.
      </div>
    `;
    return;
  }

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
      const displayName = m.name ? m.name.trim() : `Measure ${idx + 1}`;
      const descText = m.desc ? m.desc.trim() : '';

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
    const displayName = m.name ? m.name.trim() : `Measure ${idx + 1}`;
    const descText = m.desc ? m.desc.trim() : '';

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
// MSL ROW MANAGEMENT
// ===================================

let mslRowCounter = 2;

function addMSLMeasure() {
  const container = document.getElementById('msl-list');
  if (!container) return;

  const currentCount = container.querySelectorAll('.msl-measure-row').length;
  if (currentCount >= 1 + MAX_ADDITIONAL_MEASURES) return;

  mslRowCounter++;
  const row = createMSLRow(mslRowCounter, false);
  container.appendChild(row);
  setTimeout(() => row.classList.add('visible'), 10);

  row.querySelector(`#msl-name-${mslRowCounter}`)?.focus();
  updateAddButton();
  updateRemoveButtons();
  debouncedUpdate();
}

function removeMSLMeasure(index) {
  // Prevent removing IPR (index 1)
  if (index === 1) return;

  const container = document.getElementById('msl-list');
  if (!container) return;

  const rows = container.querySelectorAll('.msl-measure-row');
  if (rows.length <= 2) return;

  const row = container.querySelector(`[data-index="${index}"]`);
  if (row) {
    row.classList.remove('visible');
    setTimeout(() => {
      row.remove();
      updateAddButton();
      updateRemoveButtons();
      updateAllCalculations();
    }, 300);
  }
}

function createMSLRow(index, isIPR = false) {
  const row = document.createElement('div');
  row.className = `msl-measure-row animate-fade-in-up ${isIPR ? 'ipr-row' : ''}`;
  row.setAttribute('data-index', index);

  const name = isIPR ? 'Instructional Program Review (IPR)' : '';
  const weight = isIPR ? IPR_WEIGHT : '';
  const goalVal = isIPR ? 50 : '';
  const maxVal = isIPR ? IPR_MAX : '';
  const readonlyAttr = isIPR ? 'readonly class="readonly-field"' : '';

  row.innerHTML = `
    <div class="msl-measure-header">
      <span class="msl-measure-number">
        ${isIPR ? 'Measure 1 — IPR <span class="ipr-badge">Foundational</span>' : `Measure ${index}`}
      </span>
      ${!isIPR ? `<button type="button" class="btn-remove" onclick="removeMSLMeasure(${index})" aria-label="Remove measure">Remove</button>` : ''}
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
        <input type="number" id="msl-weight-${index}" min="0" max="30" step="0.1" value="${weight}" placeholder="0">
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
        <label for="msl-actual-${index}">🎯 Score Achieved</label>
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

  // Attach listeners
  row.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', debouncedUpdate);
  });
  row.querySelector('.msl-desc')?.addEventListener('input', () => saveState(STORAGE_KEY_PRECISE));

  return row;
}

function updateRemoveButtons() {
  const rows = document.querySelectorAll('.msl-measure-row');
  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.disabled = rows.length <= 2;
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
// RESET FUNCTIONALITY
// ===================================

function resetAll() {

  // Reset PP weights
  [1, 2, 3, 4].forEach(i => {
    const input = document.getElementById(`pp-weight-s${i}`);
    if (input) input.value = '';
  });

  // Reset all element dropdowns
  document.querySelectorAll('[id$="-level"]').forEach(select => {
    select.value = '';
  });

  // Reset MSL to IPR + 1 blank row
  const container = document.getElementById('msl-list');
  if (container) {
    container.innerHTML = '';
    mslRowCounter = 0;

    // Add Measure 1 (IPR)
    mslRowCounter++;
    const row1 = createMSLRow(mslRowCounter, true);
    container.appendChild(row1);
    setTimeout(() => row1.classList.add('visible'), 10);

    // Add Measure 2 (blank)
    mslRowCounter++;
    const row2 = createMSLRow(mslRowCounter, false);
    container.appendChild(row2);
    setTimeout(() => row2.classList.add('visible'), 10);
  }

  updateAddButton();
  updateRemoveButtons();
  updateAllCalculations();
  clearState(STORAGE_KEY_PRECISE);
}

// ===================================
// PROGRESS INDICATOR
// ===================================

// Track previous completion states for announcements
let previousStates = {
  step1: false,
  step2: false,
  step3: false,
  step4: false
};

function updateProgressIndicator() {
  const step1 = isStep1Valid(parseNum);
  const step2 = isStep2Complete();
  const step3 = isStep3Valid();
  const step4 = step1 && step2 && step3;

  const indicators = [
    { id: 'step-indicator-1', status: step1 },
    { id: 'step-indicator-2', status: step2 },
    { id: 'step-indicator-3', status: step3 },
    { id: 'step-indicator-4', status: step4 }
  ];

  indicators.forEach(ind => {
    const el = document.getElementById(ind.id);
    if (!el) return;

    // Remove all status classes
    el.classList.remove('is-complete', 'is-current', 'is-pending');

    // Add appropriate class
    if (ind.status) {
      el.classList.add('is-complete');
    } else {
      // Find the first non-complete step to mark as current
      const firstIncomplete = indicators.find(i => !i.status);
      if (firstIncomplete && firstIncomplete.id === ind.id) {
        el.classList.add('is-current');
      } else {
        el.classList.add('is-pending');
      }
    }
  });

  // Live announcements for completion (accessibility)
  // Only announce if state changed from false to true
  if (step1 && !previousStates.step1) announceStatus("Step 1 complete");
  if (step2 && !previousStates.step2) announceStatus("Step 2 complete");
  if (step3 && !previousStates.step3) announceStatus("Step 3 complete. Calculating Final Rating.");

  // Update stored states
  previousStates = { step1, step2, step3, step4 };
}

function announceStatus(message) {
  // Create or reuse a live region
  let region = document.getElementById('a11y-announcer');
  if (!region) {
    region = document.createElement('div');
    region.id = 'a11y-announcer';
    region.setAttribute('aria-live', 'polite');
    region.style.position = 'absolute';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';
    region.style.clip = 'rect(1px, 1px, 1px, 1px)';
    document.body.appendChild(region);
  }

  // Update content to trigger announcement
  region.textContent = '';
  setTimeout(() => {
    region.textContent = message;
  }, 100);
}

// ===================================
// SHOW CALCS MODAL
// ===================================

function showCalculationDetails() {
  const modal = document.getElementById('calculation-modal');
  const details = document.getElementById('calculation-details');
  const overlay = document.getElementById('modal-overlay');

  if (!modal || !details) return;

  // Check if we have valid data to show
  const step1Valid = isStep1Valid(parseNum);
  const step2Complete = isStep2Complete();
  const step3Valid = isStep3Valid();

  if (!step1Valid || !step2Complete || !step3Valid) {
    details.innerHTML = `
      <div class="modal-alert">
        <p>Please complete all steps to see calculation breakdown:</p>
        <ul>
          ${!step1Valid ? '<li>Step 1: PP weights must total 100%</li>' : ''}
          ${!step2Complete ? '<li>Step 2: All 17 elements must be rated</li>' : ''}
          ${!step3Valid ? '<li>Step 3: All measures need weights, min/max, and actual scores; weights must total 30%</li>' : ''}
        </ul>
      </div>
    `;
  } else {
    const ppResult = calculatePPScore();
    const mslResult = calculateMSLScore();
    const finalResult = calculateFinalRating(ppResult.score, mslResult.score, mslResult.rating);

    let html = `
      <div class="calc-section">
        <h3>Professional Practices (PP)</h3>
        <p><strong>Base Formula per Standard:</strong> (Earned / Possible) × (Weight / 100) × 700</p>
        <table class="calc-table">
          <thead><tr><th>Standard</th><th>Earned</th><th>Possible</th><th>Weight</th><th>Score (700 scale)</th></tr></thead>
          <tbody>
    `;

    ppResult.standards.forEach((std, i) => {
      const weight = parseNum(document.getElementById(`pp-weight-s${i + 1}`)?.value);
      html += `<tr><td>${std.standard.name}</td><td>${std.earned}</td><td>${std.possible}</td><td>${weight}%</td><td>${std.weightedScore700}</td></tr>`;
    });

    html += `
          </tbody>
          <tfoot><tr><th colspan="4">Total PP Score</th><th>${ppResult.score}</th></tr></tfoot>
        </table>
        <p><strong>PP Rating:</strong> <span class="rating-badge ${ratingToClass(ppResult.rating)}">${ppResult.rating}</span></p>
      </div>
      
      <div class="calc-section">
        <h3>Measures of Student Learning (MSL)</h3>
        <p><strong>Method:</strong> Each measure is configured with a <strong>Goal Score</strong> (the midpoint) and a <strong>Max Score</strong>. The Minimum Score is calculated at an equal distance below Goal Score: <code>Min = 2 × Goal − Max</code>. The actual score is normalized within the resulting [Min, Max] range, scaled to 300, and weighted.</p>
        <p><strong>Formula per measure:</strong> <code>((Actual − Min) / (Max − Min)) × 300 × (Weight / 30)</code></p>
        <table class="calc-table">
          <thead><tr><th>Measure</th><th>Actual</th><th>Goal (Midpoint)</th><th>Max</th><th>Calculated Min</th><th>Normalized</th><th>Scaled (300)</th><th>Weight</th><th>Weighted</th></tr></thead>
          <tbody>
    `;

    mslResult.measures.forEach(m => {
      html += `<tr><td>${m.name || '—'}</td><td>${m.actual}</td><td>${m.goalScore}</td><td>${m.maxScore}</td><td>${m.minScore}</td><td>${(m.normalized * 100).toFixed(1)}%</td><td>${m.scaled300}</td><td>${m.weight}%</td><td>${m.weighted}</td></tr>`;
    });

    html += `
          </tbody>
          <tfoot><tr><th colspan="8">Total MSL Score</th><th>${mslResult.score}</th></tr></tfoot>
        </table>
        <p><strong>MSL Rating:</strong> <span class="rating-badge ${ratingToClass(mslResult.rating)}">${mslResult.rating}</span></p>
      </div>
      
      <div class="calc-section">
        <h3>Final Effectiveness Rating</h3>
        <p><strong>Formula:</strong> PP Score + MSL Score</p>
        <div class="final-calc-box">
          <div class="calc-row"><span>Professional Practices:</span><span>${ppResult.score}</span></div>
          <div class="calc-row"><span>Measures of Student Learning:</span><span>+ ${mslResult.score}</span></div>
          <div class="calc-row total"><span>Total Score:</span><span>${finalResult.total} / 1000</span></div>
          <div class="calc-row result"><span>Rating:</span><span class="${ratingToClass(finalResult.rating)}">${finalResult.rating}</span></div>
          ${(mslResult.rating === 'Less Than Expected' && calculateFinalRating(ppResult.score, mslResult.score, 'Expected').rating === 'Highly Effective') ?
        `<div class="calc-warning"><strong>Note:</strong> Final rating capped at "Effective" because MSL rating is "Less Than Expected".</div>` : ''}
        </div>
      </div>
    `;

    details.innerHTML = html;
  }

  modal.style.display = 'flex';
  overlay.onclick = closeModal;
}

function closeModal() {
  const modal = document.getElementById('calculation-modal');
  if (modal) modal.style.display = 'none';
}

function openAboutModal() {
  const modal = document.getElementById('about-modal');
  if (modal) modal.style.display = 'flex';
}

function closeAboutModal() {
  const modal = document.getElementById('about-modal');
  if (modal) modal.style.display = 'none';
}


// ===================================
// INITIALIZATION
// ===================================

// Helper to recover dynamic MSL rows during load
function recoverMissingMSL(id) {
  const match = id.match(/msl-(?:weight|rating|goal|min|max)-(\d+)/);
  if (match) {
    const index = parseInt(match[1]);
    while (mslRowCounter < index) {
      addMSLMeasure();
    }
  }
}

function init() {
  // Init UI Enhancements
  setupAccordion();
  setupCopyButton();

  // PP Weight listeners
  [1, 2, 3, 4].forEach(i => {
    const el = document.getElementById(`pp-weight-s${i}`);
    if (el) {
      el.addEventListener('input', () => {
        // Prevent negative values
        if (parseFloat(el.value) < 0) el.value = 0;
        debouncedUpdate();
      });
    }
  });

  // Element Level listeners
  document.querySelectorAll('[id$="-level"]').forEach(select => {
    select.addEventListener('change', updateAllCalculations);
  });

  // Initialize MSL with IPR + 1 blank measure
  updateRemoveButtons();
  if (document.querySelectorAll('.msl-measure-row').length === 0) {
    const container = document.getElementById('msl-list');
    if (container) {
      // Measure 1: IPR (default weight 10%)
      mslRowCounter = 1;
      const row1 = createMSLRow(mslRowCounter, true);
      container.appendChild(row1);
      setTimeout(() => row1.classList.add('visible'), 10);

      // Measure 2: Blank, ready to fill
      mslRowCounter = 2;
      const row2 = createMSLRow(mslRowCounter, false);
      container.appendChild(row2);
      setTimeout(() => row2.classList.add('visible'), 50);
    }
  }

  updateAddButton();

  // Button listeners
  document.getElementById('btn-add-measure')?.addEventListener('click', addMSLMeasure);
  document.getElementById('btn-equal-weights')?.addEventListener('click', () => {
    [1, 2, 3, 4].forEach(i => {
      const el = document.getElementById(`pp-weight-s${i}`);
      if (el) el.value = 25;
    });
    updateAllCalculations();
  });

  document.getElementById('btn-sample-data')?.addEventListener('click', loadSampleData);
  document.getElementById('btn-reset')?.addEventListener('click', resetAll);
  document.getElementById('btn-reset-top')?.addEventListener('click', resetAll);
  document.getElementById('btn-print')?.addEventListener('click', () => {
    const dateEl = document.getElementById('print-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    window.print();
  });
  document.getElementById('btn-show-calculations')?.addEventListener('click', showCalculationDetails);
  document.getElementById('modal-close')?.addEventListener('click', closeModal);

  // About modal listeners
  document.getElementById('btn-about-tool')?.addEventListener('click', openAboutModal);
  document.getElementById('about-modal-close')?.addEventListener('click', closeAboutModal);
  document.getElementById('about-modal-overlay')?.addEventListener('click', closeAboutModal);


  // Tooltip toggles for mobile
  document.querySelectorAll('.tooltip-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent closing immediately
      const tooltipId = 'tooltip-' + trigger.dataset.tooltip;
      const tooltip = document.getElementById(tooltipId);

      // Close all other tooltips
      document.querySelectorAll('.tooltip').forEach(t => {
        if (t.id !== tooltipId) t.style.display = 'none';
      });

      // Toggle current
      if (tooltip) {
        tooltip.style.display = tooltip.style.display === 'block' ? 'none' : 'block';
      }
    });
  });

  // Close tooltips when clicking body
  document.body.addEventListener('click', () => {
    document.querySelectorAll('.tooltip').forEach(t => {
      t.style.display = 'none';
    });
  });

  // Load saved state (this triggers updateAllCalculations if data exists)
  loadState(STORAGE_KEY_PRECISE, updateAllCalculations, recoverMissingMSL);

  // If no state loaded, we should run initial calc to set defaults
  if (!localStorage.getItem(STORAGE_KEY_PRECISE)) {
    updateAllCalculations();
  }
}

function loadSampleData() {

  // Clear any stale saved state so it doesn't overwrite sample values
  clearState(STORAGE_KEY_PRECISE);

  // PP Weights: equal at 25% each
  [1, 2, 3, 4].forEach(i => {
    const el = document.getElementById(`pp-weight-s${i}`);
    if (el) el.value = 25;
  });

  // PP Elements: all 17 at Level 3
  const elements = [
    's1a', 's1b', 's1c',
    's2a', 's2b', 's2c', 's2d',
    's3a', 's3b', 's3c', 's3d', 's3e', 's3f',
    's4a', 's4b', 's4c', 's4d'
  ];
  elements.forEach(id => {
    const el = document.getElementById(`${id}-level`);
    if (el) el.value = 3; // Level 3 = Proficient
  });

  // MSL: IPR (10%) + DIBELS Composite (20%) = 30% total
  const container = document.getElementById('msl-list');
  container.innerHTML = '';

  // Measure 1: IPR at 10%
  mslRowCounter = 1;
  const row1 = createMSLRow(mslRowCounter, true);
  container.appendChild(row1);
  setTimeout(() => row1.classList.add('visible'), 10);
  document.getElementById('msl-actual-1').value = 78;
  // weight (10), goal (50), max (100) are already set by createMSLRow defaults

  // Measure 2: DIBELS Composite at 20%
  mslRowCounter = 2;
  const row2 = createMSLRow(mslRowCounter, false);
  container.appendChild(row2);
  setTimeout(() => row2.classList.add('visible'), 50);
  document.getElementById('msl-name-2').value = 'DIBELS Composite';
  document.getElementById('msl-weight-2').value = 20;
  document.getElementById('msl-goal-2').value = 420;
  document.getElementById('msl-max-2').value = 500;
  document.getElementById('msl-actual-2').value = 420;

  updateAddButton();
  updateRemoveButtons();
  updateAllCalculations();
}

// Make functions global for HTML onclick attributes
window.removeMSLMeasure = removeMSLMeasure;

// Run init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
