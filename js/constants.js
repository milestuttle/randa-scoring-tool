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

// Local Storage Keys
const STORAGE_KEY_STANDARD = 'smes_calc_standard_v1';
const STORAGE_KEY_PRECISE = 'smes_calc_precise_v1';
