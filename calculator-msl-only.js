// ===================================
// MSL-Only Calculator - Precise Cutscore Method
// Simplified version focusing only on MSL calculation
// ===================================

// ===================================
// UTILITY FUNCTIONS
// ===================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Create debounced version of updateAllCalculations
const debouncedUpdate = debounce(updateAllCalculations, 150);

// ===================================
// VALIDATION FUNCTIONS
// ===================================

function isMSLValid() {
    const measures = document.querySelectorAll('.msl-measure-row');
    if (measures.length < 2 || measures.length > 5) return false;

    let totalWeight = 0;
    for (const measure of measures) {
        const index = measure.dataset.index;
        const weight = parseFloat(document.getElementById(`msl-weight-${index}`)?.value || 0);
        const actualScore = parseFloat(document.getElementById(`msl-actual-${index}`)?.value || '');

        if (isNaN(actualScore) || actualScore === '') return false;
        totalWeight += weight;
    }

    return Math.abs(totalWeight - 30) < 0.01;
}

// ===================================
// MSL CALCULATIONS - CUTSCORE-BASED
// ===================================

// Maps actual score to 300-point scale using cutscores and linear interpolation
// minScore: the floor of the measure's raw score range (default 0)
// expectedScore is computed as the midpoint of (lessUpperLimit + higherThreshold) / 2
function mapScoreTo300Scale(actualScore, maxScore, higherThreshold, lessUpperLimit, minScore = 0) {
    // Validate inputs
    if (actualScore < minScore || actualScore > maxScore) {
        console.warn(`Actual score ${actualScore} is out of range [${minScore}, ${maxScore}]`);
        return 0;
    }

    // Less Than Expected range: minScore to lessUpperLimit → maps to 0 to 100
    if (actualScore <= lessUpperLimit) {
        const range = lessUpperLimit - minScore;
        return range === 0 ? 0 : ((actualScore - minScore) / range) * 100;
    }

    // Expected range: lessUpperLimit to higherThreshold → maps to 100 to 200 (single linear interpolation)
    if (actualScore <= higherThreshold) {
        const range = higherThreshold - lessUpperLimit;
        const position = actualScore - lessUpperLimit;
        return 100 + (position / range) * 100;
    }

    // Higher Than Expected range: higherThreshold to maxScore → maps to 201 to 300
    const range = maxScore - higherThreshold;
    const position = actualScore - higherThreshold;
    return 201 + (position / range) * 99;
}

function calculateMSLScore() {
    const measures = document.querySelectorAll('.msl-measure-row');
    if (measures.length === 0) {
        return { baseScore: 0, scaledScore: 0, percentage: 0, rating: '—', valid: false };
    }

    let totalWeightedScore = 0;
    let totalWeight = 0;
    const measureDetails = [];

    for (const measure of measures) {
        const index = measure.dataset.index;
        const name = document.getElementById(`msl-name-${index}`)?.value || `Measure ${index}`;
        const weight = parseFloat(document.getElementById(`msl-weight-${index}`)?.value || 0);
        const minScore = parseFloat(document.getElementById(`msl-min-${index}`)?.value || 0);
        const maxScore = parseFloat(document.getElementById(`msl-max-${index}`)?.value || 100);
        const higherThreshold = parseFloat(document.getElementById(`msl-higher-${index}`)?.value || 90);
        const lessUpperLimit = parseFloat(document.getElementById(`msl-less-${index}`)?.value || 30);
        const actualScore = parseFloat(document.getElementById(`msl-actual-${index}`)?.value || '');

        if (isNaN(actualScore) || actualScore === '') {
            return { baseScore: 0, scaledScore: 0, percentage: 0, rating: '—', valid: false };
        }

        // Map actual score to 300-point scale
        const scaledScore = mapScoreTo300Scale(actualScore, maxScore, higherThreshold, lessUpperLimit, minScore);

        // Weight this measure's contribution (scale from 30% to 100% for calculation)
        const normalizedWeight = (weight / 30) * 100;
        const weightedScore = scaledScore * (normalizedWeight / 100);
        totalWeightedScore += weightedScore;
        totalWeight += weight;

        measureDetails.push({
            name,
            weight,
            actualScore,
            minScore,
            maxScore,
            scaledScore,
            weightedScore
        });
    }

    // Validate total weight (should be 30%)
    if (Math.abs(totalWeight - 30) > 0.01) {
        return { baseScore: 0, scaledScore: 0, percentage: 0, rating: '—', valid: false, details: measureDetails };
    }

    const mslScore = Math.round(totalWeightedScore);
    const percentage = (mslScore / 300) * 100;

    // Determine rating
    let rating;
    if (mslScore >= 201) rating = 'More Than Expected';
    else if (mslScore >= 100) rating = 'Expected';
    else rating = 'Less Than Expected';

    return {
        baseScore: totalWeightedScore / 100, // Base score out of 3
        scaledScore: mslScore,
        percentage: percentage,
        rating: rating,
        valid: true,
        details: measureDetails
    };
}

// ===================================
// UI UPDATE FUNCTIONS
// ===================================

function updateMSLUI(mslResult) {
    document.getElementById('msl-base').textContent = mslResult.baseScore.toFixed(2);
    document.getElementById('msl-score').textContent = mslResult.scaledScore;
    document.getElementById('msl-percentage').textContent = mslResult.percentage.toFixed(1) + '%';
    document.getElementById('msl-rating').textContent = mslResult.rating;

    const mslResults = document.getElementById('msl-results');
    const mslOverlay = document.getElementById('msl-overlay');

    if (mslResult.valid) {
        mslResults.classList.remove('disabled');
        mslOverlay.style.display = 'none';
    } else {
        mslResults.classList.add('disabled');
        mslOverlay.style.display = 'flex';
    }
}

function updateSummaryUI(mslResult) {
    const summaryScore = document.getElementById('summary-total-score');
    const summaryRating = document.getElementById('summary-rating');
    const summaryOverlay = document.getElementById('summary-overlay');
    const summaryMarker = document.getElementById('summary-score-marker');

    if (mslResult.valid) {
        summaryScore.textContent = mslResult.scaledScore;
        summaryRating.textContent = mslResult.rating;
        summaryOverlay.style.display = 'none';

        // Position marker
        const percentage = (mslResult.scaledScore / 300) * 100;
        summaryMarker.style.left = percentage + '%';
        summaryMarker.style.display = 'block';
    } else {
        summaryScore.textContent = '—';
        summaryRating.textContent = '—';
        summaryOverlay.style.display = 'flex';
        summaryMarker.style.display = 'none';
    }
}

// ===================================
// MAIN CALCULATION UPDATE
// ===================================

function updateAllCalculations() {
    // Calculate MSL
    const mslResult = calculateMSLScore();

    // Update UI
    updateMSLUI(mslResult);
    updateSummaryUI(mslResult);

    // Update per-measure band bars
    updateMeasureBandBars();

    // Update weight validation
    updateWeightValidation();
}

// Updates the visual band bar for every measure row
function updateMeasureBandBars() {
    const measures = document.querySelectorAll('.msl-measure-row');
    measures.forEach(measure => {
        const index = measure.dataset.index;
        updateMeasureBandBar(index);
    });
}

function updateMeasureBandBar(index) {
    const minScore    = parseFloat(document.getElementById(`msl-min-${index}`)?.value ?? 0);
    const maxScore    = parseFloat(document.getElementById(`msl-max-${index}`)?.value ?? 100);
    const lessLimit   = parseFloat(document.getElementById(`msl-less-${index}`)?.value ?? '');
    const higherThresh = parseFloat(document.getElementById(`msl-higher-${index}`)?.value ?? '');
    const actualScore = parseFloat(document.getElementById(`msl-actual-${index}`)?.value ?? '');

    const segLess     = document.getElementById(`msl-band-less-${index}`);
    const segExpected = document.getElementById(`msl-band-expected-${index}`);
    const segHigher   = document.getElementById(`msl-band-higher-${index}`);
    const marker      = document.getElementById(`msl-band-marker-${index}`);
    const markerLabel = document.getElementById(`msl-band-marker-label-${index}`);
    const scaleMin    = document.getElementById(`msl-band-scale-min-${index}`);
    const scaleMax    = document.getElementById(`msl-band-scale-max-${index}`);
    const scaleCut1   = document.getElementById(`msl-band-scale-cut1-${index}`);
    const scaleCut2   = document.getElementById(`msl-band-scale-cut2-${index}`);

    if (!segLess || !segExpected || !segHigher) return;

    const totalRange = maxScore - minScore;
    if (isNaN(minScore) || isNaN(maxScore) || totalRange <= 0) return;

    // Update scale labels
    if (scaleMin) scaleMin.textContent = minScore;
    if (scaleMax) scaleMax.textContent = maxScore;

    // Compute segment widths as percentages of totalRange
    const lessValid    = !isNaN(lessLimit)   && lessLimit   >= minScore && lessLimit   <= maxScore;
    const higherValid  = !isNaN(higherThresh) && higherThresh >= minScore && higherThresh <= maxScore;

    let lessWidth, expectedWidth, higherWidth;

    if (lessValid && higherValid && lessLimit < higherThresh) {
        lessWidth     = ((lessLimit   - minScore) / totalRange) * 100;
        expectedWidth = ((higherThresh - lessLimit) / totalRange) * 100;
        higherWidth   = ((maxScore    - higherThresh) / totalRange) * 100;
    } else if (lessValid) {
        // Only less cutscore defined
        lessWidth     = ((lessLimit - minScore) / totalRange) * 100;
        expectedWidth = 100 - lessWidth;
        higherWidth   = 0;
    } else if (higherValid) {
        // Only higher cutscore defined
        lessWidth     = 0;
        expectedWidth = ((higherThresh - minScore) / totalRange) * 100;
        higherWidth   = 100 - expectedWidth;
    } else {
        // No valid cutscores — equal thirds
        lessWidth = expectedWidth = higherWidth = 33.33;
    }

    segLess.style.width     = lessWidth     + '%';
    segExpected.style.width = expectedWidth + '%';
    segHigher.style.width   = higherWidth   + '%';

    // Update cutscore tick labels
    if (scaleCut1) {
        if (lessValid) {
            scaleCut1.textContent = lessLimit;
            scaleCut1.style.left  = ((lessLimit - minScore) / totalRange * 100) + '%';
            scaleCut1.style.display = 'block';
        } else {
            scaleCut1.style.display = 'none';
        }
    }
    if (scaleCut2) {
        if (higherValid) {
            scaleCut2.textContent = higherThresh;
            scaleCut2.style.left  = ((higherThresh - minScore) / totalRange * 100) + '%';
            scaleCut2.style.display = 'block';
        } else {
            scaleCut2.style.display = 'none';
        }
    }

    // Position the score marker
    if (!isNaN(actualScore) && actualScore >= minScore && actualScore <= maxScore && marker) {
        const pct = ((actualScore - minScore) / totalRange) * 100;
        marker.style.left    = pct + '%';
        marker.style.display = 'block';
        if (markerLabel) markerLabel.textContent = actualScore;

        // Highlight the active band segment
        segLess.classList.remove('msl-band-active');
        segExpected.classList.remove('msl-band-active');
        segHigher.classList.remove('msl-band-active');

        if (lessValid && actualScore <= lessLimit) {
            segLess.classList.add('msl-band-active');
        } else if (higherValid && actualScore >= higherThresh) {
            segHigher.classList.add('msl-band-active');
        } else {
            segExpected.classList.add('msl-band-active');
        }
    } else if (marker) {
        marker.style.display = 'none';
        segLess.classList.remove('msl-band-active');
        segExpected.classList.remove('msl-band-active');
        segHigher.classList.remove('msl-band-active');
    }
}

function updateWeightValidation() {
    const measures = document.querySelectorAll('.msl-measure-row');
    let totalWeight = 0;

    for (const measure of measures) {
        const index = measure.dataset.index;
        const weight = parseFloat(document.getElementById(`msl-weight-${index}`)?.value || 0);
        totalWeight += weight;
    }

    const totalWeightSpan = document.getElementById('total-msl-weight');
    const messageDiv = document.getElementById('msl-weight-message');

    totalWeightSpan.textContent = totalWeight.toFixed(1);

    if (Math.abs(totalWeight - 30) < 0.01) {
        messageDiv.textContent = '✓ Weight total is valid';
        messageDiv.className = 'validation-success';
    } else {
        messageDiv.textContent = '⚠ Total must equal 30%';
        messageDiv.className = 'validation-error';
    }
}

// ===================================
// MSL ROW MANAGEMENT
// ===================================

let mslRowCounter = 2;

function addMSLMeasure() {
    const mslList = document.getElementById('msl-list');
    const currentCount = mslList.querySelectorAll('.msl-measure-row').length;

    if (currentCount >= 5) {
        alert('Maximum of 5 MSL measures allowed');
        return;
    }

    const newRow = createMSLRow(mslRowCounter, false);
    mslList.appendChild(newRow);

    setTimeout(() => newRow.classList.add('visible'), 10);

    mslRowCounter++;
    updateRemoveButtons();
    debouncedUpdate();
}

function removeMSLMeasure(index) {
    const row = document.querySelector(`.msl-measure-row[data-index="${index}"]`);
    if (!row) return;

    row.classList.remove('visible');
    setTimeout(() => {
        row.remove();
        updateRemoveButtons();
        debouncedUpdate();
    }, 300);
}

function createMSLRow(index, isIPR = false) {
    const row = document.createElement('div');
    row.className = 'msl-measure-row';
    row.dataset.index = index;

    const defaultName = isIPR ? 'IPR (Instructional Program Review)' : `Measure ${index}`;
    const defaultMax = 100;
    const defaultLess = isIPR ? 30 : 30;
    const defaultHigher = isIPR ? 90 : 90;
    const defaultWeight = isIPR ? 15 : 15;

    row.innerHTML = `
    <div class="msl-measure-header">
      <div class="msl-measure-number">MSL Measure ${index}</div>
      ${!isIPR ? `<button type="button" class="btn-remove" onclick="removeMSLMeasure(${index})" aria-label="Remove measure ${index}">Remove</button>` : ''}
    </div>

    <div class="msl-section msl-identification">
      <div class="form-group">
        <label for="msl-name-${index}">Measure Name</label>
        <input type="text" id="msl-name-${index}" value="${defaultName}" ${isIPR ? 'readonly class="readonly-field"' : ''}>
      </div>
    </div>

    <div class="msl-section msl-weight-section">
      <div class="form-group">
        <label for="msl-weight-${index}">Weight (% of 30%)</label>
        <input type="number" id="msl-weight-${index}" min="0" max="30" step="0.1" value="${defaultWeight}">
      </div>
    </div>

    <div class="msl-section msl-cutscores">
      <div class="msl-cutscores-header">Cutscore Configuration</div>
      <div class="msl-cutscores-grid">
        <div class="form-group">
          <label for="msl-min-${index}">Minimum Score</label>
          <input type="number" id="msl-min-${index}" min="0" step="1" value="0" ${isIPR ? 'readonly class="readonly-field"' : ''}>
        </div>
        <div class="form-group">
          <label for="msl-less-${index}"><span class="range-indicator less-range">●</span>Less Than Expected Upper Limit</label>
          <input type="number" id="msl-less-${index}" min="0" step="0.1" value="${defaultLess}" ${isIPR ? 'readonly class="readonly-field"' : ''}>
        </div>
        <div class="form-group">
          <label for="msl-higher-${index}"><span class="range-indicator higher-range">●</span>Higher Than Expected Threshold</label>
          <input type="number" id="msl-higher-${index}" min="0" step="0.1" value="${defaultHigher}" ${isIPR ? 'readonly class="readonly-field"' : ''}>
        </div>
        <div class="form-group">
          <label for="msl-max-${index}">Maximum Score</label>
          <input type="number" id="msl-max-${index}" min="1" step="1" value="${defaultMax}" ${isIPR ? 'readonly class="readonly-field"' : ''}>
        </div>
      </div>
    </div>

    <div class="msl-section msl-actual-section">
      <div class="form-group">
        <label for="msl-actual-${index}">Actual Score Achieved</label>
        <input type="number" id="msl-actual-${index}" min="0" step="0.1" placeholder="Enter score">
      </div>
    </div>

    <div class="msl-section msl-band-viz" id="msl-band-viz-${index}">
      <div class="msl-band-header">Score Band Placement</div>
      <div class="msl-band-bar-wrap">
        <div class="msl-band-bar" id="msl-band-bar-${index}">
          <div class="msl-band-segment msl-band-less" id="msl-band-less-${index}">
            <span class="msl-band-label">Less Than Expected</span>
          </div>
          <div class="msl-band-segment msl-band-expected" id="msl-band-expected-${index}">
            <span class="msl-band-label">Expected</span>
          </div>
          <div class="msl-band-segment msl-band-higher" id="msl-band-higher-${index}">
            <span class="msl-band-label">Higher Than Expected</span>
          </div>
        </div>
        <div class="msl-band-marker-row">
          <div class="msl-band-marker" id="msl-band-marker-${index}" style="display:none;">
            <div class="msl-band-marker-arrow"></div>
            <div class="msl-band-marker-label" id="msl-band-marker-label-${index}"></div>
          </div>
        </div>
      </div>
      <div class="msl-band-scale" id="msl-band-scale-${index}">
        <span class="msl-band-scale-min" id="msl-band-scale-min-${index}">0</span>
        <span class="msl-band-scale-cut1" id="msl-band-scale-cut1-${index}"></span>
        <span class="msl-band-scale-cut2" id="msl-band-scale-cut2-${index}"></span>
        <span class="msl-band-scale-max" id="msl-band-scale-max-${index}">100</span>
      </div>
    </div>
  `;

    // Add event listeners
    const inputs = row.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', debouncedUpdate);
    });

    return row;
}

function updateRemoveButtons() {
    const rows = document.querySelectorAll('.msl-measure-row');
    const removeButtons = document.querySelectorAll('.btn-remove');

    removeButtons.forEach(btn => {
        btn.disabled = rows.length <= 2;
    });
}

// ===================================
// RESET FUNCTIONALITY
// ===================================

function resetAll() {
    if (!confirm('Are you sure you want to reset all data? This cannot be undone.')) {
        return;
    }

    // Clear MSL measures
    const mslList = document.getElementById('msl-list');
    mslList.innerHTML = '';

    // Reset counter
    mslRowCounter = 2;

    // Add default IPR measure
    const iprRow = createMSLRow(1, true);
    mslList.appendChild(iprRow);
    setTimeout(() => iprRow.classList.add('visible'), 10);

    // Clear localStorage
    localStorage.removeItem('mslOnlyCalculatorState');

    // Update calculations
    updateAllCalculations();
}

// ===================================
// SHOW CALCS MODAL
// ===================================

function showCalculationDetails() {
    const mslResult = calculateMSLScore();

    if (!mslResult.valid) {
        alert('Please complete all MSL measures before viewing calculation details.');
        return;
    }

    let html = '<div class="calc-section">';
    html += '<h3>MSL Calculation Breakdown</h3>';

    html += '<h4>Individual Measures</h4>';
    html += '<table class="calc-table"><thead><tr>';
    html += '<th>Measure</th><th>Actual Score</th><th>Max Score</th><th>Scaled (0-300)</th><th>Weight</th><th>Weighted Score</th>';
    html += '</tr></thead><tbody>';

    mslResult.details.forEach(detail => {
        html += '<tr>';
        html += `<td>${detail.name}</td>`;
        html += `<td>${detail.actualScore.toFixed(1)}</td>`;
        html += `<td>${detail.maxScore}</td>`;
        html += `<td>${detail.scaledScore.toFixed(2)}</td>`;
        html += `<td>${detail.weight.toFixed(1)}%</td>`;
        html += `<td>${detail.weightedScore.toFixed(2)}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';

    html += '<h4>Final MSL Score</h4>';
    html += '<table class="calc-table"><tbody>';
    html += `<tr><td>Total Weighted Score</td><td><strong>${mslResult.scaledScore}</strong> / 300</td></tr>`;
    html += `<tr><td>Percentage</td><td><strong>${mslResult.percentage.toFixed(1)}%</strong></td></tr>`;
    html += `<tr><td>MSL Rating</td><td><strong>${mslResult.rating}</strong></td></tr>`;
    html += '</tbody></table>';

    html += '</div>';

    document.getElementById('calculation-details').innerHTML = html;
    document.getElementById('calculation-modal').style.display = 'flex';
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
    const mslResult = calculateMSLScore();

    if (!mslResult.valid) {
        alert('Please complete all MSL measures before copying summary.');
        return;
    }

    let summary = 'MSL Calculator - Summary\n';
    summary += '========================\n\n';

    summary += 'MSL Score: ' + mslResult.scaledScore + ' / 300\n';
    summary += 'MSL Rating: ' + mslResult.rating + '\n';
    summary += 'Percentage: ' + mslResult.percentage.toFixed(1) + '%\n\n';

    summary += 'Individual Measures:\n';
    mslResult.details.forEach(detail => {
        summary += `- ${detail.name}: ${detail.actualScore}/${detail.maxScore} (${detail.weight}% weight) → ${detail.scaledScore.toFixed(2)}/300\n`;
    });

    navigator.clipboard.writeText(summary).then(() => {
        alert('Summary copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy summary. Please try again.');
    });
}

// ===================================
// PRINT FUNCTIONALITY
// ===================================

function printResults() {
    window.print();
}

// ===================================
// AUTO-SAVE AND LOAD
// ===================================

function saveState() {
    const measures = document.querySelectorAll('.msl-measure-row');
    const state = {
        measures: []
    };

    measures.forEach(measure => {
        const index = measure.dataset.index;
        state.measures.push({
            index: index,
            name: document.getElementById(`msl-name-${index}`)?.value || '',
            weight: document.getElementById(`msl-weight-${index}`)?.value || '',
            min: document.getElementById(`msl-min-${index}`)?.value || '0',
            max: document.getElementById(`msl-max-${index}`)?.value || '',
            less: document.getElementById(`msl-less-${index}`)?.value || '',
            expected: document.getElementById(`msl-expected-${index}`)?.value || '',
            higher: document.getElementById(`msl-higher-${index}`)?.value || '',
            actual: document.getElementById(`msl-actual-${index}`)?.value || ''
        });
    });

    localStorage.setItem('mslOnlyCalculatorState', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('mslOnlyCalculatorState');
    if (!saved) return false;

    try {
        const state = JSON.parse(saved);
        const mslList = document.getElementById('msl-list');

        // Clear existing measures
        mslList.innerHTML = '';

        // Recreate measures
        state.measures.forEach((measure, idx) => {
            const isIPR = idx === 0;
            const row = createMSLRow(measure.index, isIPR);
            mslList.appendChild(row);

            // Restore values
            if (document.getElementById(`msl-name-${measure.index}`)) {
                document.getElementById(`msl-name-${measure.index}`).value = measure.name;
            }
            if (document.getElementById(`msl-weight-${measure.index}`)) {
                document.getElementById(`msl-weight-${measure.index}`).value = measure.weight;
            }
            if (document.getElementById(`msl-min-${measure.index}`)) {
                document.getElementById(`msl-min-${measure.index}`).value = measure.min ?? '0';
            }
            if (document.getElementById(`msl-max-${measure.index}`)) {
                document.getElementById(`msl-max-${measure.index}`).value = measure.max;
            }
            if (document.getElementById(`msl-less-${measure.index}`)) {
                document.getElementById(`msl-less-${measure.index}`).value = measure.less;
            }
            if (document.getElementById(`msl-expected-${measure.index}`)) {
                document.getElementById(`msl-expected-${measure.index}`).value = measure.expected;
            }
            if (document.getElementById(`msl-higher-${measure.index}`)) {
                document.getElementById(`msl-higher-${measure.index}`).value = measure.higher;
            }
            if (document.getElementById(`msl-actual-${measure.index}`)) {
                document.getElementById(`msl-actual-${measure.index}`).value = measure.actual;
            }

            setTimeout(() => row.classList.add('visible'), 10);
        });

        // Update counter
        const maxIndex = Math.max(...state.measures.map(m => parseInt(m.index)));
        mslRowCounter = maxIndex + 1;

        return true;
    } catch (e) {
        console.error('Failed to load state:', e);
        return false;
    }
}

// ===================================
// INITIALIZATION
// ===================================

function init() {
    // Try to load saved state
    const loaded = loadState();

    // If no saved state, create default IPR measure
    if (!loaded) {
        const mslList = document.getElementById('msl-list');
        const iprRow = createMSLRow(1, true);
        mslList.appendChild(iprRow);
        setTimeout(() => iprRow.classList.add('visible'), 10);
    }

    // Event listeners
    document.getElementById('btn-add-measure')?.addEventListener('click', addMSLMeasure);
    document.getElementById('btn-reset')?.addEventListener('click', resetAll);
    document.getElementById('btn-show-calculations')?.addEventListener('click', showCalculationDetails);
    document.getElementById('btn-copy-summary')?.addEventListener('click', copySummary);
    document.getElementById('btn-print')?.addEventListener('click', printResults);
    document.getElementById('btn-about-tool')?.addEventListener('click', openAboutModal);

    // Modal close buttons
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modal-overlay')?.addEventListener('click', closeModal);
    document.getElementById('about-modal-close')?.addEventListener('click', closeAboutModal);
    document.getElementById('about-modal-overlay')?.addEventListener('click', closeAboutModal);

    // Tooltip functionality
    document.querySelectorAll('.tooltip-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const tooltipId = 'tooltip-' + trigger.dataset.tooltip;
            const tooltip = document.getElementById(tooltipId);
            if (tooltip) {
                tooltip.style.display = tooltip.style.display === 'none' ? 'block' : 'none';
            }
        });
    });

    // Close tooltips when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.tooltip-trigger')) {
            document.querySelectorAll('.tooltip').forEach(tooltip => {
                tooltip.style.display = 'none';
            });
        }
    });

    // Auto-save on input
    document.addEventListener('input', (e) => {
        if (e.target.matches('input, select')) {
            saveState();
        }
    });

    // Initial calculation
    updateAllCalculations();
    updateRemoveButtons();
}

// Make functions global for HTML onclick attributes
window.removeMSLMeasure = removeMSLMeasure;

// Run init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
