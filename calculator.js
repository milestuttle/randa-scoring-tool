// ===================================
// RANDA Scoring Weight Web Tool
// 70:30 Teacher Evaluation Scoring
// (70% Professional Practices / 30% Measures of Student Learning)
// ===================================



// MSL Rating Values
const MSL_VALUES = {
  'Less Than Expected': 0,
  'Expected': 1.5,
  'More Than Expected': 3
};

// ===================================
// UTILITY FUNCTIONS
// ===================================

// Create debounced version of updateAllCalculations
const debouncedUpdate = debounce(updateAllCalculations, 150);

// ===================================
// VALIDATION FUNCTIONS
// ===================================

function isStep3Valid() {
  const rows = document.querySelectorAll('.msl-measure-row');
  if (rows.length < 2 || rows.length > 5) return false;

  const weights = [];
  let allRated = true;

  rows.forEach(row => {
    const weightInput = row.querySelector('.msl-weight');
    const ratingSelect = row.querySelector('.msl-rating');

    if (weightInput) weights.push(parseNum(weightInput.value));
    if (ratingSelect && !ratingSelect.value) allRated = false;
  });

  return allRated && validateWeights(weights, 30).valid;
}

// ===================================
// MSL CALCULATIONS
// ===================================

function calculateMSLScore() {
  const rows = document.querySelectorAll('.msl-measure-row');
  const measures = [];
  let mslScore300 = 0;

  rows.forEach(row => {
    const weightInput = row.querySelector('.msl-weight');
    const ratingSelect = row.querySelector('.msl-rating');

    if (weightInput && ratingSelect && ratingSelect.value) {
      const weight = parseNum(weightInput.value);
      const ratingValue = MSL_VALUES[ratingSelect.value] || 0;
      // Per CDE formula: Weighted MSL Score = (Weight / 30) × Earned Score × 100
      const weightedScore300 = (weight / 30) * ratingValue * MSL_MULTIPLIER;

      measures.push({
        weight,
        rating: ratingSelect.value,
        value: ratingValue,
        weightedScore300: round2(weightedScore300)
      });

      mslScore300 += weightedScore300;
    }
  });

  // Calculate base score (out of 3) for display
  const mslBase = mslScore300 / MSL_MULTIPLIER;
  const mslPct = mslScore300 / MSL_MAX_SCORE;
  const mslRating = getRatingLabel(mslScore300, MSL_RATING_RANGES);

  return {
    base: round2(mslBase),
    score: round2(mslScore300),
    percentage: pct(mslPct),
    rating: mslRating,
    measures
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

  // Step 3: Validate MSL weights and calculate
  const rows = document.querySelectorAll('.msl-measure-row');
  const mslWeights = [];
  rows.forEach(row => {
    const weightInput = row.querySelector('.msl-weight');
    if (weightInput) mslWeights.push(parseNum(weightInput.value));
  });

  const mslWeightValidation = validateWeights(mslWeights, 30);
  const mslWeightTotal = document.getElementById('total-msl-weight');
  if (mslWeightTotal) mslWeightTotal.textContent = mslWeightValidation.sum.toFixed(1);

  setValidationUI(
    'msl-weight-message',
    mslWeightValidation.valid,
    mslWeightValidation.valid ? '✓ Total equals 30%' : `⚠ Total must equal 30% (currently ${mslWeightValidation.sum.toFixed(1)}%)`
  );

  const mslResult = calculateMSLScore();
  updateMSLUI(mslResult);

  // Step 4: Check if all steps are valid
  const step1Valid = isStep1Valid(parseNum);
  const step2Complete = isStep2Complete();
  const step3Valid = isStep3Valid();

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

    // Update summary marker position
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

    // Hide sticky footer if incomplete
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

  // Save state (debounced by caller, but good to have here)
  saveState(STORAGE_KEY_STANDARD);
}

// ===================================
// MSL ROW MANAGEMENT
// ===================================

let mslRowCounter = 2;

function addMSLMeasure() {
  const container = document.getElementById('msl-list');
  if (!container) return;

  const rows = container.querySelectorAll('.msl-measure-row');
  if (rows.length >= 5) return;

  mslRowCounter++;
  const row = createMSLRow(mslRowCounter);
  container.appendChild(row);

  // Animate in
  setTimeout(() => row.classList.add('visible'), 10);

  // Focus first input
  row.querySelector('.msl-weight')?.focus();

  updateRemoveButtons();
  updateAllCalculations();
}

function removeMSLMeasure(index) {
  const container = document.getElementById('msl-list');
  if (!container) return;

  const rows = container.querySelectorAll('.msl-measure-row');
  if (rows.length <= 2) return;

  const row = container.querySelector(`[data-index="${index}"]`);
  if (row) {
    row.classList.remove('visible');
    setTimeout(() => {
      row.remove();
      updateRemoveButtons();
      updateAllCalculations();
    }, 300);
  }
}

function createMSLRow(index) {
  const row = document.createElement('div');
  row.className = 'msl-measure-row';
  row.setAttribute('data-index', index);

  row.innerHTML = `
    <div class="msl-measure-number">Measure ${index}</div>
    <div class="msl-inputs">
      <div class="form-group">
        <label for="msl-weight-${index}">Weight (% of 30)</label>
        <input type="number" id="msl-weight-${index}" class="msl-weight" 
               min="0" max="30" step="0.1" placeholder="0.0">
      </div>
      <div class="form-group">
        <label for="msl-rating-${index}">Rating</label>
        <select id="msl-rating-${index}" class="msl-rating">
          <option value="">Select rating</option>
          <option value="Less Than Expected">Less Than Expected</option>
          <option value="Expected">Expected</option>
          <option value="More Than Expected">More Than Expected</option>
        </select>
      </div>
      <button type="button" class="btn-remove" onclick="removeMSLMeasure(${index})" aria-label="Remove measure ${index}">
        Remove
      </button>
    </div>
  `;

  // Attach listeners with debouncing and negative prevention
  const weightInput = row.querySelector('.msl-weight');
  if (weightInput) {
    weightInput.addEventListener('input', (e) => {
      // Prevent negative values
      if (parseFloat(e.target.value) < 0) {
        e.target.value = 0;
      }
      debouncedUpdate();
    });
    // Also prevent negatives on paste
    weightInput.addEventListener('paste', (e) => {
      setTimeout(() => {
        if (parseFloat(e.target.value) < 0) {
          e.target.value = 0;
        }
      }, 0);
    });
  }

  // Rating dropdown doesn't need debouncing (instant selection)
  row.querySelector('.msl-rating')?.addEventListener('change', updateAllCalculations);

  return row;
}

function updateRemoveButtons() {
  const rows = document.querySelectorAll('.msl-measure-row');
  const buttons = document.querySelectorAll('.btn-remove');
  buttons.forEach(btn => {
    btn.disabled = rows.length <= 2;
  });
}

// ===================================
// RESET FUNCTIONALITY
// ===================================

function resetAll() {
  if (!confirm('Are you sure you want to reset all inputs? This cannot be undone.')) {
    return;
  }

  // Reset PP weights
  [1, 2, 3, 4].forEach(i => {
    const input = document.getElementById(`pp-weight-s${i}`);
    if (input) input.value = '';
  });

  // Reset all element dropdowns
  document.querySelectorAll('[id$="-level"]').forEach(select => {
    select.value = '';
  });

  // Reset MSL to 2 blank rows
  const container = document.getElementById('msl-list');
  if (container) {
    container.innerHTML = '';
    mslRowCounter = 0;
    for (let i = 1; i <= 2; i++) {
      mslRowCounter++;
      const row = createMSLRow(mslRowCounter);
      row.classList.add('visible');
      container.appendChild(row);
    }
  }

  updateRemoveButtons();
  updateAllCalculations();
  clearState(STORAGE_KEY_STANDARD);
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
          ${!step3Valid ? '<li>Step 3: MSL weights must total 30% and have ratings</li>' : ''}
        </ul>
      </div>
    `;
  } else {
    // Generate detailed breakdown
    const ppResult = calculatePPScore();
    const mslResult = calculateMSLScore();
    const finalResult = calculateFinalRating(ppResult.score, mslResult.score, mslResult.rating);

    let html = `
      <div class="calc-section">
        <h3>Professional Practices (PP)</h3>
        <p><strong>Base Formula per Standard:</strong> (Earned / Possible) × (Weight / 100) × 700</p>
        <table class="calc-table">
          <thead>
            <tr>
              <th>Standard</th>
              <th>Earned</th>
              <th>Possible</th>
              <th>Weight</th>
              <th>Score (700 scale)</th>
            </tr>
          </thead>
          <tbody>
    `;

    ppResult.standards.forEach((std, i) => {
      const weight = parseNum(document.getElementById(`pp-weight-s${i + 1}`)?.value);
      html += `
        <tr>
          <td>${std.standard.name}</td>
          <td>${std.earned}</td>
          <td>${std.possible}</td>
          <td>${weight}%</td>
          <td>${std.weightedScore700}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
          <tfoot>
            <tr>
              <th colspan="4">Total PP Score</th>
              <th>${ppResult.score}</th>
            </tr>
          </tfoot>
        </table>
        <p><strong>PP Rating:</strong> <span class="rating-badge ${ratingToClass(ppResult.rating)}">${ppResult.rating}</span></p>
      </div>
      
      <div class="calc-section">
        <h3>Measures of Student Learning (MSL)</h3>
        <p><strong>Formula per Measure:</strong> Rating Value × (Weight / 30) × 100</p>
        <p>Values: Less Than Expected = 0, Expected = 1.5, More Than Expected = 3</p>
        <table class="calc-table">
          <thead>
            <tr>
              <th>Measure</th>
              <th>Rating</th>
              <th>Rating Value</th>
              <th>Weight</th>
              <th>Score (300 scale)</th>
            </tr>
          </thead>
          <tbody>
    `;

    mslResult.measures.forEach((measure, i) => {
      html += `
        <tr>
          <td>Measure ${i + 1}</td>
          <td><span class="rating-badge ${ratingToClass(measure.rating)}">${measure.rating}</span></td>
          <td>${measure.value}</td>
          <td>${measure.weight}%</td>
          <td>${measure.weightedScore300}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
          <tfoot>
            <tr>
              <th colspan="4">Total MSL Score</th>
              <th>${mslResult.score}</th>
            </tr>
          </tfoot>
        </table>
        <p><strong>MSL Rating:</strong> <span class="rating-badge ${ratingToClass(mslResult.rating)}">${mslResult.rating}</span></p>
      </div>
      
      <div class="calc-section">
        <h3>Final Effectiveness Rating</h3>
        <p><strong>Formula:</strong> PP Score + MSL Score</p>
        <div class="final-calc-box">
          <div class="calc-row">
            <span>Professional Practices:</span>
            <span>${ppResult.score}</span>
          </div>
          <div class="calc-row">
            <span>Measures of Student Learning:</span>
            <span>+ ${mslResult.score}</span>
          </div>
          <div class="calc-row total">
            <span>Total Score:</span>
            <span>${finalResult.total} / 1000</span>
          </div>
          <div class="calc-row result">
            <span>Rating:</span>
            <span class="${ratingToClass(finalResult.rating)}">${finalResult.rating}</span>
          </div>
          ${(mslResult.rating === 'Less Than Expected' && calculateFinalRating(ppResult.score, mslResult.score, 'Expected').rating === 'Highly Effective') ?
        `<div class="calc-warning">
              <strong>Note:</strong> Final rating capped at "Effective" because MSL rating is "Less Than Expected".
             </div>` : ''}
        </div>
      </div>
    `;

    details.innerHTML = html;
  }

  modal.style.display = 'flex';
  // Allow closing by clicking overlay
  overlay.onclick = closeModal;
}

function closeModal() {
  const modal = document.getElementById('calculation-modal');
  if (modal) modal.style.display = 'none';
}

// ===================================
// INITIALIZATION
// ===================================

// Helper to recover dynamic MSL rows during load
function recoverMissingMSL(id) {
  const match = id.match(/msl-(?:weight|rating)-(\d+)/);
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

  // Input listeners
  // PP Weights
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

  // Add first 2 MSL rows
  updateRemoveButtons();
  if (document.querySelectorAll('.msl-measure-row').length === 0) {
    const container = document.getElementById('msl-list');
    if (container) {
      for (let i = 1; i <= 2; i++) {
        container.appendChild(createMSLRow(i));
        // Need to manually increment since we're bypassing addMSLMeasure
      }
      mslRowCounter = 2;
    }
  }

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
  document.getElementById('btn-print')?.addEventListener('click', () => window.print());
  document.getElementById('btn-show-calculations')?.addEventListener('click', showCalculationDetails);
  document.getElementById('modal-close')?.addEventListener('click', closeModal);

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
  loadState(STORAGE_KEY_STANDARD, updateAllCalculations, recoverMissingMSL);

  // If no state loaded, we should run initial calc to set defaults
  if (!localStorage.getItem(STORAGE_KEY_STANDARD)) {
    updateAllCalculations();
  }
}

function loadSampleData() {
  if (!confirm('This will overwrite current values with sample data. Continue?')) return;

  // Weights (Equal)
  [1, 2, 3, 4].forEach(i => document.getElementById(`pp-weight-s${i}`).value = 25);

  // Elements (Mix of 3 and 4)
  const elements = [
    's1a', 's1b', 's1c',
    's2a', 's2b', 's2c', 's2d',
    's3a', 's3b', 's3c', 's3d', 's3e', 's3f',
    's4a', 's4b', 's4c', 's4d'
  ];

  elements.forEach((id, idx) => {
    const el = document.getElementById(`${id}-level`);
    if (el) el.value = (idx % 3 === 0) ? 4 : 3; // Mix of Level 4 and 3
  });

  // MSL
  const container = document.getElementById('msl-list');
  container.innerHTML = '';
  mslRowCounter = 0;

  // Add 2 measures
  addMSLMeasure();
  const row1 = document.querySelector('[data-index="1"]');
  if (row1) {
    row1.querySelector('.msl-weight').value = 15;
    row1.querySelector('.msl-rating').value = 'Expected';
  }

  addMSLMeasure();
  const row2 = document.querySelector('[data-index="2"]');
  if (row2) {
    row2.querySelector('.msl-weight').value = 15;
    row2.querySelector('.msl-rating').value = 'More Than Expected';
  }

  updateAllCalculations();
}

// Helper to recover dynamic MSL rows during load
function recoverMissingMSL(id) {
  const match = id.match(/msl-(?:weight|rating)-(\d+)/);
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

  // Load saved state
  loadState(STORAGE_KEY_STANDARD, updateAllCalculations, recoverMissingMSL);

  // Event Listeners for Validation
  // ... existing listeners ...
  const inputs = document.querySelectorAll('input, select');
  const debouncedUpdate = debounce(updateAllCalculations, 300);

  inputs.forEach(input => {
    input.addEventListener('input', debouncedUpdate);
  });

  // Element Level listeners
  document.querySelectorAll('[id$="-level"]').forEach(select => {
    select.addEventListener('change', updateAllCalculations);
  });

  // Add first 2 MSL rows (if empty)
  updateRemoveButtons();
  if (document.querySelectorAll('.msl-measure-row').length === 0) {
    const container = document.getElementById('msl-list');
    if (container) {
      for (let i = 1; i <= 2; i++) {
        container.appendChild(createMSLRow(i));
      }
      mslRowCounter = 2;
    }
  }

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
  document.getElementById('btn-print')?.addEventListener('click', () => window.print());
  document.getElementById('btn-show-calculations')?.addEventListener('click', showCalculationDetails);
  document.getElementById('modal-close')?.addEventListener('click', closeModal);

  // Tooltip toggles for mobile
  document.querySelectorAll('.tooltip-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const tooltipId = 'tooltip-' + trigger.dataset.tooltip;
      const tooltip = document.getElementById(tooltipId);
      document.querySelectorAll('.tooltip').forEach(t => {
        if (t.id !== tooltipId) t.style.display = 'none';
      });
      if (tooltip) {
        tooltip.style.display = tooltip.style.display === 'block' ? 'none' : 'block';
      }
    });
  });

  document.body.addEventListener('click', () => {
    document.querySelectorAll('.tooltip').forEach(t => t.style.display = 'none');
  });

  // existing listener logic is actually inside updateAllCalculations calls or specific listeners?
  // The original code had:
  // document.querySelectorAll('input, select').forEach(el => {
  //   el.addEventListener('input', debounce(updateAllCalculations, 300));
  // });
  // The original code loops inputs in init. I should find where that loop is and keep it or assume it's there.
  // I will just rely on updateAllCalculations being called.

  // Re-attach listeners because loadState might have populated values but we need fresh listeners on dynamic elements?
  // Actually, static elements listeners are fine. Dynamic MSL elements add listeners on creation.

  // Initial calculation
  // updateAllCalculations(); // Removed, handled by loadState callback

  // If no state loaded, we should still run initial calc
  if (!localStorage.getItem(STORAGE_KEY_STANDARD)) {
    updateAllCalculations();
  }
}
// Note: I'll use a targeted replace for init to avoid rewriting the whole file logic.
// The file view showed init at the end. I will replace the end of file carefully.

// Make functions global for HTML onclick attributes
window.removeMSLMeasure = removeMSLMeasure;

// Run init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
