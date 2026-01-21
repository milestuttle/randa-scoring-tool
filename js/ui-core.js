

// ===================================
// VALIDATION FUNCTIONS
// ===================================

function validateWeights(weights, target) {
    const total = sum(weights);
    const delta = Math.abs(total - target);
    const valid = delta < EPSILON;
    return { valid, sum: total, delta };
}

function isStep1Valid(parseNum) {
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
// UI UPDATE FUNCTIONS
// ===================================

function updatePPUI(ppResult, updateProgressIndicator) {
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
        // Update progress bar
        const progressBar = document.getElementById(`${std.id}-progress`);
        if (progressBar) {
            progressBar.style.width = pct(stdScore.ratio * 100) + '%';

            // Remove previous rating classes from progress bar parent
            const progressContainer = progressBar.parentElement;
            stripRatingClasses(progressContainer);

            // Add rating class to color it
            const ratingClass = ratingToClass(stdScore.rating);
            if (ratingClass) {
                progressContainer.classList.add(ratingClass);
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
    if (updateProgressIndicator) updateProgressIndicator();
}

function updateFinalUI(finalResult, ppResult, mslResult, TOTAL_MAX_SCORE, updateProgressIndicator) {
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
    if (updateProgressIndicator) updateProgressIndicator();

    // Update score range visualization
    updateScoreRangeVisualization(finalResult.total, finalResult.rating);

    // Update sticky footer
    const footer = document.getElementById('sticky-footer');
    if (footer) {
        footer.classList.add('visible');
        safeTextContent(document.getElementById('footer-total-score'), finalResult.total.toString());

        const footerRatingEl = document.getElementById('footer-rating');
        if (footerRatingEl) {
            safeTextContent(footerRatingEl, finalResult.rating);
            // Re-apply badge styling
            const footerBadge = document.getElementById('footer-rating-badge');
            if (footerBadge) {
                stripRatingClasses(footerBadge); // Strip from container if mistakenly applied
            }
            stripRatingClasses(footerRatingEl); // Strip from span
            applyRatingClass(footerRatingEl, finalResult.rating, true);
        }
    }
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
        if (asBadge) el.classList.add('rating-badge');
    }
}

// ===================================
// AUTO-SAVE FUNCTIONALITY
// ===================================

function saveState(storageKey) {
    if (!storageKey) return;
    const data = {};
    // Save all inputs and selects
    document.querySelectorAll('input, select').forEach(el => {
        if (el.id) {
            data[el.id] = el.value;
        }
    });
    localStorage.setItem(storageKey, JSON.stringify(data));
}

function loadState(storageKey, updateCallback, onMissingElement) {
    if (!storageKey) return;
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    try {
        const data = JSON.parse(saved);

        // Sort keys to ensure structural elements (if any dependency) are handled, 
        // though usually we just need to ensure rows exist.
        // MSL indices increase, so standard sorting might work if IDs are comparable.
        // Actually, just loop.

        Object.keys(data).forEach(id => {
            let el = document.getElementById(id);
            if (!el && onMissingElement) {
                // Try to recover missing element (e.g. create row)
                onMissingElement(id);
                el = document.getElementById(id); // Check again
            }

            if (el) {
                el.value = data[id];
            }
        });
        if (updateCallback) updateCallback();
        console.log('Loaded saved state');
    } catch (e) {
        console.error('Failed to load state', e);
    }
}

function clearState(storageKey) {
    if (storageKey) localStorage.removeItem(storageKey);
    console.log('State cleared');
}

// ===================================
// ACCORDION FUNCTIONALITY
// ===================================

function setupAccordion() {
    document.querySelectorAll('.standard-section').forEach((section, index) => {
        const header = section.querySelector('h3');
        if (!header) return;

        header.classList.add('accordion-header');

        // Add toggle behavior
        header.onclick = () => {
            section.classList.toggle('collapsed');
        };

        // Default: Collapse all except first (standard 1)
        if (index > 0) {
            section.classList.add('collapsed');
        }
    });
}

// ===================================
// COPY SUMMARY FUNCTIONALITY
// ===================================

function setupCopyButton() {
    const btn = document.getElementById('btn-copy-summary');
    if (!btn) return;

    btn.onclick = () => {
        const total = document.getElementById('final-total-score')?.textContent || '0';
        const rating = document.getElementById('final-rating')?.textContent || 'Incomplete';
        const pp = document.getElementById('final-pp-score')?.textContent || '0';
        const msl = document.getElementById('final-msl-score')?.textContent || '0';

        const text = `RANDA Score: ${total} (${rating})\nProfessional Practices: ${pp}\nStudent Learning: ${msl}`;

        navigator.clipboard.writeText(text).then(() => {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Copied!';
            setTimeout(() => btn.innerHTML = originalText, 2000);
        }).catch(err => {
            console.error('Failed to copy', err);
            alert('Could not copy to clipboard');
        });
    };
}
