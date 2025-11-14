// ===================================
// RANDA Scoring Weight Web Tool
// 70:30 Teacher Evaluation Scoring
// (70% Professional Practices / 30% Measures of Student Learning)
// ===================================

// ===================================
// DATA MODELS & CONSTANTS
// ===================================

const STANDARDS = [
  { id: 's1', name: 'Standard 1', elements: ['a', 'b', 'c'] },
  { id: 's2', name: 'Standard 2', elements: ['a', 'b', 'c', 'd'] },
  { id: 's3', name: 'Standard 3', elements: ['a', 'b', 'c', 'd', 'e', 'f'] },
  { id: 's4', name: 'Standard 4', elements: ['a', 'b', 'c', 'd'] }
];

const POINTS_PER_ELEMENT = 4;
const PP_BASE_MAX = 20;
const PP_MULTIPLIER = 35;
const PP_MAX_SCORE = 700;
const MSL_BASE_MAX = 3;
const MSL_MULTIPLIER = 100;
const MSL_MAX_SCORE = 300;
const TOTAL_MAX_SCORE = 1000;
const EPSILON = 0.01;

// Standard Rating Ranges (0-20 scale per standard)
const STANDARD_RATING_RANGES = [
  { min: 18.75, max: 20, label: 'Exemplary' },
  { min: 13.75, max: 18.74, label: 'Accomplished' },
  { min: 8.75, max: 13.74, label: 'Proficient' },
  { min: 3.75, max: 8.74, label: 'Partially Proficient' },
  { min: 0, max: 3.74, label: 'Basic' }
];

// Professional Practices Rating Ranges (700 scale)
const PP_RATING_RANGES = [
  { min: 657, max: 700, label: 'Exemplary' },
  { min: 482, max: 656, label: 'Accomplished' },
  { min: 307, max: 481, label: 'Proficient' },
  { min: 132, max: 306, label: 'Partially Proficient' },
  { min: 0, max: 131, label: 'Basic' }
];

// MSL Rating Ranges (300 scale)
const MSL_RATING_RANGES = [
  { min: 201, max: 300, label: 'More Than Expected' },
  { min: 100, max: 200, label: 'Expected' },
  { min: 0, max: 99, label: 'Less Than Expected' }
];

// Final Effectiveness Rating Ranges (1000 scale)
const FINAL_RATING_RANGES = [
  { min: 801, max: 1000, label: 'Highly Effective' },
  { min: 407, max: 800, label: 'Effective' },
  { min: 188, max: 406, label: 'Partially Effective' },
  { min: 0, max: 187, label: 'Ineffective' }
];

// MSL Rating Values
const MSL_VALUES = {
  'Less Than Expected': 0,
  'Expected': 1.5,
  'More Than Expected': 3
};

// ===================================
// UTILITY FUNCTIONS
// ===================================

function parseNum(value, fallback = 0) {
  const num = parseFloat(value);
  return isNaN(num) ? fallback : num;
}

function clamp(x, min, max) {
  return Math.min(Math.max(x, min), max);
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

function pct(x) {
  return Math.round(x * 1000) / 10;
}

function sum(array) {
  return array.reduce((acc, val) => acc + val, 0);
}

function getRatingLabel(score, ranges) {
  for (const range of ranges) {
    if (score >= range.min && score <= range.max) {
      return range.label;
    }
  }
  return 'N/A';
}

// Debounce function to prevent excessive recalculations
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Create debounced version of updateAllCalculations
const debouncedUpdate = debounce(updateAllCalculations, 150);

// ===================================
// VALIDATION FUNCTIONS
// ===================================

function validateWeights(weights, target) {
  const total = sum(weights);
  const delta = Math.abs(total - target);
  const valid = delta < EPSILON;
  return { valid, sum: total, delta };
}

function isStep1Valid() {
  const weights = [1, 2, 3, 4].map(i => 
    parseNum(document.getElementById(`pp-weight-s${i}`)?.value)
  );
  return validateWeights(weights, 100).valid;
}

function isStep2Complete() {
  let count = 0;
  for (const std of STANDARDS) {
    for (const elem of std.elements) {
      const select = document.getElementById(`${std.id}${elem}-level`);
      if (select && select.value) {
        count++;
      }
    }
  }
  return count === 17;
}

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

function setValidationUI(elementId, valid, message) {
  const elem = document.getElementById(elementId);
  if (!elem) return;
  
  elem.textContent = message;
  elem.className = valid ? 'validation-success' : 'validation-error';
  
  // Set ARIA attributes for live announcements
  if (!valid) {
    elem.setAttribute('role', 'alert');
    elem.setAttribute('aria-live', 'polite');
  } else {
    elem.removeAttribute('role');
    elem.setAttribute('aria-live', 'polite');
  }
}

// ===================================
// PROFESSIONAL PRACTICES CALCULATIONS
// ===================================

function calculateStandardScore(elements, weight, standardIndex) {
  const earned = sum(elements);
  const possible = elements.length * POINTS_PER_ELEMENT;
  const ratio = possible > 0 ? earned / possible : 0;
  const ratioClamped = clamp(ratio, 0, 1);
  // Direct calculation to 700-point scale per CDE formula:
  // Weighted Score = (Earned / Possible) × (Weight / 100) × 700
  const weightedScore700 = ratioClamped * (weight / 100) * PP_MAX_SCORE;
  
  // For display purposes, also calculate the base contribution (out of 20)
  const baseContribution = ratioClamped * (weight / 100) * PP_BASE_MAX;
  
  // Rating thresholds from Excel cells K91-K95, M91-M95, O91-O95, Q91-Q95
  // These are earned point thresholds specific to each standard
  const thresholds = [
    [1, 4, 7, 10, 12],    // Standard 1 (3 elements, max 12 points)
    [2, 6, 10, 14, 16],   // Standard 2 (4 elements, max 16 points)
    [3, 9, 15, 21, 24],   // Standard 3 (6 elements, max 24 points)
    [2, 6, 10, 14, 16]    // Standard 4 (4 elements, max 16 points)
  ];
  
  const t = thresholds[standardIndex];
  let standardRating;
  
  if (earned <= t[0]) {
    standardRating = 'Basic';
  } else if (earned <= t[1]) {
    standardRating = 'Partially Proficient';
  } else if (earned <= t[2]) {
    standardRating = 'Proficient';
  } else if (earned <= t[3]) {
    standardRating = 'Accomplished';
  } else if (earned <= t[4]) {
    standardRating = 'Exemplary';
  } else {
    standardRating = 'ERROR';
  }
  
  return {
    earned,
    possible,
    ratio: ratioClamped,
    weightedScore700: round2(weightedScore700),
    baseContribution: round2(baseContribution),
    rating: standardRating
  };
}

function calculatePPScore() {
  const standardScores = [];
  let ppScore700 = 0;
  let ppBase = 0;
  
  for (let i = 0; i < STANDARDS.length; i++) {
    const std = STANDARDS[i];
    const weight = parseNum(document.getElementById(`pp-weight-s${i + 1}`)?.value);
    
    const elements = std.elements.map(elem => {
      const select = document.getElementById(`${std.id}${elem}-level`);
      const level = select ? parseNum(select.value) : 0;
      // Convert level (1-5) to points (0-4): Level 1=0pts, Level 2=1pt, Level 3=2pts, Level 4=3pts, Level 5=4pts
      return level > 0 ? level - 1 : 0;
    });
    
    const score = calculateStandardScore(elements, weight, i);
    standardScores.push({ ...score, standard: std });
    ppScore700 += score.weightedScore700;
    ppBase += score.baseContribution;
  }
  
  const ppPct = ppScore700 / PP_MAX_SCORE;
  const ppRating = getRatingLabel(ppScore700, PP_RATING_RANGES);
  
  return {
    base: round2(ppBase),
    score: round2(ppScore700),
    percentage: pct(ppPct),
    rating: ppRating,
    standards: standardScores
  };
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

function updatePPUI(ppResult) {
  // Update per-standard summaries
  ppResult.standards.forEach((stdScore, idx) => {
    const std = stdScore.standard;
    safeTextContent(document.getElementById(`${std.id}-earned`), stdScore.earned.toString());
    safeTextContent(document.getElementById(`${std.id}-possible`), stdScore.possible.toString());
    safeTextContent(document.getElementById(`${std.id}-weighted`), stdScore.baseContribution.toString());
    
    const ratingEl = document.getElementById(`${std.id}-rating`);
    safeTextContent(ratingEl, stdScore.rating);
    applyRatingClass(ratingEl, stdScore.rating, true);
    
    // Apply color tint to standard section
    const standardSection = ratingEl?.closest('.standard-section');
    if (standardSection) {
      // Remove previous rating classes
      standardSection.classList.remove('rating-exemplary', 'rating-accomplished', 'rating-proficient', 'rating-partially-proficient', 'rating-basic');
      // Add new rating class
      const ratingClass = ratingToClass(stdScore.rating);
      if (ratingClass) {
        standardSection.classList.add(ratingClass);
      }
    }
  });
  
  // Update overall PP summary
  safeTextContent(document.getElementById('pp-base'), ppResult.base.toString());
  safeTextContent(document.getElementById('pp-score'), ppResult.score.toString());
  safeTextContent(document.getElementById('pp-percentage'), ppResult.percentage.toFixed(1) + '%');
  
  const ppRatingEl = document.getElementById('pp-rating');
  safeTextContent(ppRatingEl, ppResult.rating);
  applyRatingClass(ppRatingEl, ppResult.rating, true);
  
  // Update progress indicator
  updateProgressIndicator();
}

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

function updateFinalUI(finalResult, ppResult, mslResult) {
  // Professional Practices row
  safeTextContent(document.getElementById('final-pp-score'), ppResult.score.toString());
  safeTextContent(document.getElementById('final-pp-pct'), ppResult.percentage.toFixed(1) + '%');
  
  const finalPpRatingEl = document.getElementById('final-pp-rating');
  safeTextContent(finalPpRatingEl, ppResult.rating);
  applyRatingClass(finalPpRatingEl, ppResult.rating, true);
  
  // MSL row
  safeTextContent(document.getElementById('final-msl-score'), mslResult.score.toString());
  safeTextContent(document.getElementById('final-msl-pct'), mslResult.percentage.toFixed(1) + '%');
  
  const finalMslRatingEl = document.getElementById('final-msl-rating');
  safeTextContent(finalMslRatingEl, mslResult.rating);
  applyRatingClass(finalMslRatingEl, mslResult.rating, true);
  
  // Overall row
  safeTextContent(document.getElementById('final-total-score'), finalResult.total.toString());
  safeTextContent(document.getElementById('final-total-pct'), pct(finalResult.total / TOTAL_MAX_SCORE).toFixed(1) + '%');
  
  const finalRatingEl = document.getElementById('final-rating');
  safeTextContent(finalRatingEl, finalResult.rating);
  applyRatingClass(finalRatingEl, finalResult.rating, true);
  
  // Update progress indicator
  updateProgressIndicator();
  
  // Update score range visualization
  updateScoreRangeVisualization(finalResult.total, finalResult.rating);
}

// ===================================
// SCORE RANGE VISUALIZATION
// ===================================

function updateScoreRangeVisualization(score, rating) {
  const scoreMarker = document.getElementById('score-marker');
  const markerScore = document.getElementById('marker-score');
  const markerRating = document.getElementById('marker-rating');
  const rangeInsights = document.getElementById('range-insights');
  const insightText = document.getElementById('insight-text');
  
  if (!scoreMarker || !markerScore || !markerRating) return;
  
  // Show marker
  scoreMarker.style.display = 'block';
  
  // Calculate position (0-1000 scale)
  const percentage = (score / 1000) * 100;
  scoreMarker.style.left = percentage + '%';
  
  // Update marker text
  markerScore.textContent = Math.round(score);
  markerRating.textContent = rating;
  
  // Calculate insights
  if (rangeInsights && insightText) {
    let insight = '';
    
    if (score >= 801) {
      const pointsAbove = Math.round(score - 801);
      insight = `You are ${pointsAbove} points above the minimum for Highly Effective (801).`;
    } else if (score >= 407) {
      const pointsToNext = Math.round(801 - score);
      const pointsAbove = Math.round(score - 407);
      insight = `You are ${pointsAbove} points above the minimum for Effective (407). You need ${pointsToNext} more points to reach Highly Effective.`;
    } else if (score >= 188) {
      const pointsToNext = Math.round(407 - score);
      const pointsAbove = Math.round(score - 188);
      insight = `You are ${pointsAbove} points above the minimum for Partially Effective (188). You need ${pointsToNext} more points to reach Effective.`;
    } else {
      const pointsToNext = Math.round(188 - score);
      insight = `You need ${pointsToNext} more points to reach Partially Effective (188).`;
    }
    
    insightText.textContent = insight;
    rangeInsights.style.display = 'block';
  }
}

// Safe setText helper
function safeTextContent(el, value) {
  if (el) {
    el.textContent = value == null ? '' : String(value);
  }
}

// ===================================
// RATING CLASS HELPERS
// ===================================

const RATING_CLASS_MAP = {
  'highly effective': 'rating-highly-effective',
  'exemplary': 'rating-exemplary',
  'effective': 'rating-effective',
  'accomplished': 'rating-accomplished',
  'proficient': 'rating-proficient',
  'partially effective': 'rating-partially-effective',
  'partially proficient': 'rating-partially-proficient',
  'ineffective': 'rating-ineffective',
  'basic': 'rating-basic',
  'expected': 'rating-expected',
  'more than expected': 'rating-more-than-expected',
  'less than expected': 'rating-less-than-expected'
};

function normalizeRating(str) {
  return (str || '').toString().trim().toLowerCase();
}

function ratingToClass(rating) {
  return RATING_CLASS_MAP[normalizeRating(rating)] || null;
}

function stripRatingClasses(el) {
  if (!el) return;
  // Remove any class that starts with "rating-"
  const classes = Array.from(el.classList);
  classes.forEach(cls => {
    if (cls.indexOf('rating-') === 0) el.classList.remove(cls);
  });
}

function applyRatingClass(el, rating, asBadge = false) {
  if (!el) return;
  stripRatingClasses(el);
  const cls = ratingToClass(rating);
  if (cls) {
    el.classList.add(cls);
    if (asBadge) el.classList.add('rating-badge');
  }
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
  updatePPUI(ppResult);
  
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
  const step1Valid = isStep1Valid();
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
    updateFinalUI(finalResult, ppResult, mslResult);
    
    if (step4Overlay) step4Overlay.style.display = 'none';
    if (step4Section) step4Section.classList.remove('disabled');
  } else {
    if (step4Overlay) step4Overlay.style.display = 'flex';
    if (step4Section) step4Section.classList.add('disabled');
  }
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
  const step1Valid = isStep1Valid();
  const step2Complete = isStep2Complete();
  const step3Valid = isStep3Valid();
  const allValid = step1Valid && step2Complete && step3Valid;
  
  const step1El = document.getElementById('step-indicator-1');
  const step2El = document.getElementById('step-indicator-2');
  const step3El = document.getElementById('step-indicator-3');
  const step4El = document.getElementById('step-indicator-4');
  
  // Step 1: PP Weights
  if (step1El) {
    step1El.classList.toggle('is-complete', step1Valid);
    step1El.classList.toggle('is-current', !step1Valid);
    if (step1Valid && !previousStates.step1) {
      announce('Step 1 complete: Professional Practice weights set.');
      previousStates.step1 = true;
    }
  }
  
  // Step 2: Element Ratings
  if (step2El) {
    step2El.classList.toggle('is-complete', step2Complete);
    step2El.classList.toggle('is-current', step1Valid && !step2Complete);
    if (step2Complete && !previousStates.step2) {
      announce('Step 2 complete: All element ratings assigned.');
      previousStates.step2 = true;
    }
  }
  
  // Step 3: MSL
  if (step3El) {
    step3El.classList.toggle('is-complete', step3Valid);
    step3El.classList.toggle('is-current', step1Valid && step2Complete && !step3Valid);
    if (step3Valid && !previousStates.step3) {
      announce('Step 3 complete: Measures of Student Learning configured.');
      previousStates.step3 = true;
    }
  }
  
  // Step 4: Final Rating
  if (step4El) {
    step4El.classList.toggle('is-complete', allValid);
    step4El.classList.toggle('is-current', step1Valid && step2Complete && step3Valid && !allValid);
    if (allValid && !previousStates.step4) {
      announce('All steps complete: Final effectiveness rating calculated.');
      previousStates.step4 = true;
    }
  }
  
  // Reset states if validation becomes invalid
  if (!step1Valid) previousStates.step1 = false;
  if (!step2Complete) previousStates.step2 = false;
  if (!step3Valid) previousStates.step3 = false;
  if (!allValid) previousStates.step4 = false;
}

// ===================================
// ACCESSIBILITY HELPERS
// ===================================

// Create screen reader live region for announcements
function ensureLiveRegion() {
  if (document.getElementById('sr-announce')) return;
  const live = document.createElement('div');
  live.id = 'sr-announce';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.className = 'sr-only';
  document.body.appendChild(live);
}

function announce(msg) {
  const live = document.getElementById('sr-announce');
  if (live) live.textContent = msg;
}

// Wrap tables in scrollable containers for mobile
function wrapScrollableTables() {
  document.querySelectorAll('.results-table').forEach(tbl => {
    if (tbl.parentElement && tbl.parentElement.classList.contains('table-scroll')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'table-scroll';
    wrapper.setAttribute('tabindex', '0');
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Scrollable results table');
    tbl.parentNode.insertBefore(wrapper, tbl);
    wrapper.appendChild(tbl);
  });
}

// Connect validation messages to inputs
function attachValidationAria() {
  // PP weight validation
  const ppWeightMsg = document.getElementById('pp-weight-message');
  if (ppWeightMsg && !ppWeightMsg.id) {
    ppWeightMsg.id = 'pp-weight-message';
  }
  [1, 2, 3, 4].forEach(i => {
    const input = document.getElementById(`pp-weight-s${i}`);
    if (input && ppWeightMsg) {
      const describedBy = input.getAttribute('aria-describedby') || '';
      if (!describedBy.includes('pp-weight-message')) {
        input.setAttribute('aria-describedby', describedBy ? `${describedBy} pp-weight-message` : 'pp-weight-message');
      }
    }
  });
  
  // MSL weight validation
  const mslWeightMsg = document.getElementById('msl-weight-message');
  if (mslWeightMsg && !mslWeightMsg.id) {
    mslWeightMsg.id = 'msl-weight-message';
  }
}

// ===================================
// CALCULATION MODAL
// ===================================

function generateCalculationBreakdown() {
  if (!isStep1Valid() || !isStep2Complete() || !isStep3Valid()) {
    return '<p class="modal-empty-state">Complete all steps to see detailed calculation breakdown.</p>';
  }
  
  const ppResult = calculatePPScore();
  const mslResult = calculateMSLScore();
  const finalResult = calculateFinalRating(ppResult.score, mslResult.score, mslResult.rating);
  
  let html = '';
  
  // Professional Practices Section
  html += '<div class="calc-section">';
  html += '<h3>Professional Practices Calculation (70% of Final Score)</h3>';
  
  ppResult.standards.forEach((stdScore, idx) => {
    const std = stdScore.standard;
    const weight = parseNum(document.getElementById(`pp-weight-s${idx + 1}`)?.value);
    
    html += `<div class="calc-step"><strong>${std.name}:</strong></div>`;
    html += `<div class="calc-formula">Earned Points: ${stdScore.earned} / ${stdScore.possible}</div>`;
    html += `<div class="calc-formula">Ratio: ${stdScore.earned} ÷ ${stdScore.possible} = ${stdScore.ratio.toFixed(4)}</div>`;
    html += `<div class="calc-formula">Weighted Score (700-scale): ${stdScore.ratio.toFixed(4)} × (${weight}% ÷ 100) × 700 = ${stdScore.weightedScore700}</div>`;
    html += `<div class="calc-result">Standard Rating: ${stdScore.rating}</div>`;
  });
  
  html += `<div class="calc-result" style="margin-top: var(--spacing-lg); background: var(--rating-blue-bg);">`;
  html += `<strong>Total Professional Practices Score: ${ppResult.score} / 700</strong><br>`;
  html += `Rating: <span class="rating-badge ${ratingToClass(ppResult.rating)}">${ppResult.rating}</span>`;
  html += `</div>`;
  html += '</div>';
  
  // MSL Section
  html += '<div class="calc-section">';
  html += '<h3>Measures of Student Learning Calculation (30% of Final Score)</h3>';
  
  mslResult.measures.forEach((measure, idx) => {
    html += `<div class="calc-step"><strong>Measure ${idx + 1}:</strong></div>`;
    html += `<div class="calc-formula">Rating: ${measure.rating} = ${measure.value} points</div>`;
    html += `<div class="calc-formula">Weighted Score: (${measure.weight}% ÷ 30%) × ${measure.value} × 100 = ${measure.weightedScore300}</div>`;
  });
  
  html += `<div class="calc-result" style="margin-top: var(--spacing-lg); background: var(--rating-blue-bg);">`;
  html += `<strong>Total MSL Score: ${mslResult.score} / 300</strong><br>`;
  html += `Rating: <span class="rating-badge ${ratingToClass(mslResult.rating)}">${mslResult.rating}</span>`;
  html += `</div>`;
  html += '</div>';
  
  // Final Rating Section
  html += '<div class="calc-section">';
  html += '<h3>Final Effectiveness Rating</h3>';
  html += `<div class="calc-formula">Total Score: ${ppResult.score} + ${mslResult.score} = ${finalResult.total} / 1000</div>`;
  html += `<div class="calc-formula">Percentage: ${((finalResult.total / 1000) * 100).toFixed(1)}%</div>`;
  
  if (mslResult.rating === 'Less Than Expected' && finalResult.total > 800) {
    html += `<div class="calc-step" style="color: var(--color-warning); font-weight: 600;">`;
    html += `⚠️ MSL Constraint Applied: Since MSL rating is "Less Than Expected", final rating is capped at "Effective"`;
    html += `</div>`;
  }
  
  html += `<div class="calc-result" style="margin-top: var(--spacing-lg); background: var(--rating-green-bg);">`;
  html += `<strong style="font-size: 1.125rem;">Final Effectiveness Rating</strong><br>`;
  html += `<span class="rating-badge ${ratingToClass(finalResult.rating)}" style="font-size: 1rem; padding: 0.5rem 1rem; margin-top: 0.5rem;">${finalResult.rating}</span>`;
  html += `</div>`;
  html += '</div>';
  
  return html;
}

function openCalculationModal() {
  const modal = document.getElementById('calculation-modal');
  const modalBody = document.getElementById('calculation-details');
  
  if (modal && modalBody) {
    modalBody.innerHTML = generateCalculationBreakdown();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Focus the close button for accessibility
    document.getElementById('modal-close')?.focus();
  }
}

function closeCalculationModal() {
  const modal = document.getElementById('calculation-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
    
    // Return focus to the button that opened the modal
    document.getElementById('btn-show-calculations')?.focus();
  }
}

// ===================================
// TOOLTIP FUNCTIONALITY
// ===================================

function initializeTooltips() {
  const triggers = document.querySelectorAll('.tooltip-trigger');
  
  triggers.forEach(trigger => {
    const tooltipId = trigger.getAttribute('data-tooltip');
    const tooltip = document.getElementById(`tooltip-${tooltipId}`);
    
    if (!tooltip) return;
    
    // Show on click (works for touch and mouse)
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Hide all other tooltips
      document.querySelectorAll('.tooltip').forEach(t => {
        if (t !== tooltip) t.style.display = 'none';
      });
      
      // Toggle this tooltip
      const isVisible = tooltip.style.display === 'block';
      tooltip.style.display = isVisible ? 'none' : 'block';
    });
    
    // Also show on hover for desktop
    trigger.addEventListener('mouseenter', () => {
      // Hide all other tooltips first
      document.querySelectorAll('.tooltip').forEach(t => {
        if (t !== tooltip) t.style.display = 'none';
      });
      tooltip.style.display = 'block';
    });
    
    trigger.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
  });
  
  // Hide tooltips when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.tooltip-trigger') && !e.target.closest('.tooltip')) {
      document.querySelectorAll('.tooltip').forEach(t => {
        t.style.display = 'none';
      });
    }
  });
  
  // Hide tooltips on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.tooltip').forEach(t => {
        t.style.display = 'none';
      });
    }
  });
}

// ===================================
// INITIALIZATION
// ===================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize accessibility features
  ensureLiveRegion();
  attachValidationAria();
  
  // Set print date
  const footer = document.querySelector('.app-footer');
  if (footer) {
    footer.setAttribute('data-print-date', new Date().toLocaleDateString());
  }
  
  // Add print handler
  window.addEventListener('beforeprint', () => {
    const footer = document.querySelector('.app-footer');
    if (footer) {
      footer.setAttribute('data-print-date', new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString());
    }
  });
  
  // Wrap tables for mobile scrolling
  wrapScrollableTables();
  
  // Attach listeners to PP weights with debouncing and negative prevention
  [1, 2, 3, 4].forEach(i => {
    const input = document.getElementById(`pp-weight-s${i}`);
    if (input) {
      input.addEventListener('input', (e) => {
        // Prevent negative values
        if (parseFloat(e.target.value) < 0) {
          e.target.value = 0;
        }
        debouncedUpdate();
      });
      // Also prevent negatives on paste
      input.addEventListener('paste', (e) => {
        setTimeout(() => {
          if (parseFloat(e.target.value) < 0) {
            e.target.value = 0;
          }
        }, 0);
      });
    }
  });
  
  // Attach listeners to all element dropdowns
  document.querySelectorAll('[id$="-level"]').forEach(select => {
    select.addEventListener('change', updateAllCalculations);
  });
  
  // Initialize MSL rows
  const container = document.getElementById('msl-list');
  if (container) {
    for (let i = 1; i <= 2; i++) {
      const row = createMSLRow(i);
      row.classList.add('visible');
      container.appendChild(row);
    }
  }
  
  // Attach reset button
  document.getElementById('btn-reset')?.addEventListener('click', resetAll);
  
  // Attach print button
  document.getElementById('btn-print')?.addEventListener('click', () => window.print());
  
  // Attach add measure button
  document.getElementById('btn-add-measure')?.addEventListener('click', addMSLMeasure);
  
  // Attach modal button
  document.getElementById('btn-show-calculations')?.addEventListener('click', openCalculationModal);
  
  // Attach modal close handlers
  document.getElementById('modal-close')?.addEventListener('click', closeCalculationModal);
  document.getElementById('modal-overlay')?.addEventListener('click', closeCalculationModal);
  
  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('calculation-modal');
      if (modal && modal.style.display !== 'none') {
        closeCalculationModal();
      }
    }
  });
  
  // Initialize tooltips
  initializeTooltips();
  
  // Attach quick fill buttons
  document.getElementById('btn-equal-weights')?.addEventListener('click', setEqualWeights);
  document.getElementById('btn-sample-data')?.addEventListener('click', loadSampleData);
  
  // Add keyboard navigation
  setupKeyboardNavigation();
  
  // Setup scroll collapse for summary card
  setupSummaryCollapse();
  
  updateRemoveButtons();
  updateAllCalculations();
});

// ===================================
// SUMMARY CARD COLLAPSE ON SCROLL
// ===================================

function setupSummaryCollapse() {
  const summaryCard = document.getElementById('overall-summary');
  if (!summaryCard) return;
  
  let lastScrollTop = 0;
  const scrollThreshold = 100; // Collapse after scrolling 100px down
  
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > scrollThreshold) {
      summaryCard.classList.add('collapsed');
    } else {
      summaryCard.classList.remove('collapsed');
    }
    
    lastScrollTop = scrollTop;
  }, { passive: true });
}

// ===================================
// QUICK FILL FUNCTIONS
// ===================================

function setEqualWeights() {
  [1, 2, 3, 4].forEach(i => {
    const input = document.getElementById(`pp-weight-s${i}`);
    if (input) input.value = '25';
  });
  updateAllCalculations();
}

function loadSampleData() {
  // Set equal weights
  setEqualWeights();
  
  // Set all elements to Level 4 (3 points each - a good "Accomplished" example)
  const sampleLevels = {
    's1a': '4', 's1b': '4', 's1c': '4',
    's2a': '4', 's2b': '4', 's2c': '4', 's2d': '4',
    's3a': '4', 's3b': '4', 's3c': '4', 's3d': '4', 's3e': '4', 's3f': '4',
    's4a': '4', 's4b': '4', 's4c': '4', 's4d': '4'
  };
  
  Object.keys(sampleLevels).forEach(id => {
    const select = document.getElementById(`${id}-level`);
    if (select) select.value = sampleLevels[id];
  });
  
  // Set up 2 MSL measures with sample data
  const container = document.getElementById('msl-list');
  if (container) {
    // Clear existing
    container.innerHTML = '';
    mslRowCounter = 0;
    
    // Add two sample measures
    for (let i = 1; i <= 2; i++) {
      mslRowCounter++;
      const row = createMSLRow(mslRowCounter);
      row.classList.add('visible');
      container.appendChild(row);
    }
    
    // Fill in sample values
    setTimeout(() => {
      const weight1 = document.getElementById('msl-weight-1');
      const rating1 = document.getElementById('msl-rating-1');
      const weight2 = document.getElementById('msl-weight-2');
      const rating2 = document.getElementById('msl-rating-2');
      
      if (weight1) weight1.value = '15';
      if (rating1) rating1.value = 'Expected';
      if (weight2) weight2.value = '15';
      if (rating2) rating2.value = 'More Than Expected';
      
      updateRemoveButtons();
      updateAllCalculations();
    }, 50);
  }
  
  updateAllCalculations();
  
  // Scroll to summary
  document.getElementById('overall-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===================================
// KEYBOARD NAVIGATION
// ===================================

function setupKeyboardNavigation() {
  // Make progress steps clickable
  document.querySelectorAll('.progress-step').forEach((step, index) => {
    step.style.cursor = 'pointer';
    step.setAttribute('tabindex', '0');
    step.addEventListener('click', () => scrollToStep(index + 1));
    step.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        scrollToStep(index + 1);
      }
    });
  });
}

function scrollToStep(stepNum) {
  const stepId = `step${stepNum}`;
  const element = document.getElementById(stepId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
