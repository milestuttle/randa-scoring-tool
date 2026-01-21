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
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Safe setText helper
function safeTextContent(el, value) {
    if (el) {
        el.textContent = value == null ? '' : String(value);
    }
}
