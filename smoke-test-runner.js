// Headless Smoke Test Runner for MSL Simple Engine
const fs = require('fs');
const path = require('path');

console.log('🧪 Running CLI Smoke Tests for MSL Simple Engine...\n');

let passed = 0;
let failed = 0;

function assert(name, condition, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name} — ${details}`);
    failed++;
  }
}

// 1. Test XSS escaping
function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

assert('escapeHTML handles scripts', escapeHTML('<script>alert(1)</script>') === '&lt;script&gt;alert(1)&lt;/script&gt;');
assert('escapeHTML handles quotes and ampersands', escapeHTML('A & B "C"') === 'A &amp; B &quot;C&quot;');
assert('escapeHTML handles null/undefined', escapeHTML(null) === '' && escapeHTML(undefined) === '');

// 2. Test getMSLRating with continuous boundary checks
function getMSLRating(score) {
  if (score > 200) return 'More Than Expected';
  if (score >= 100) return 'Expected';
  return 'Less Than Expected';
}

assert('Rating 0 -> Less Than Expected', getMSLRating(0) === 'Less Than Expected');
assert('Rating 99 -> Less Than Expected', getMSLRating(99) === 'Less Than Expected');
assert('Rating 99.5 -> Less Than Expected (no float gap)', getMSLRating(99.5) === 'Less Than Expected');
assert('Rating 99.99 -> Less Than Expected', getMSLRating(99.99) === 'Less Than Expected');
assert('Rating 100 -> Expected', getMSLRating(100) === 'Expected');
assert('Rating 150 -> Expected', getMSLRating(150) === 'Expected');
assert('Rating 200 -> Expected', getMSLRating(200) === 'Expected');
assert('Rating 200.01 -> More Than Expected', getMSLRating(200.01) === 'More Than Expected');
assert('Rating 300 -> More Than Expected', getMSLRating(300) === 'More Than Expected');

// 3. Test School Year helper
function getCurrentSchoolYear(dateObj) {
  const now = dateObj || new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

assert('School Year in August 2026 -> 2026-2027', getCurrentSchoolYear(new Date(2026, 7, 15)) === '2026-2027');
assert('School Year on July 1, 2026 -> 2026-2027', getCurrentSchoolYear(new Date(2026, 6, 1)) === '2026-2027');
assert('School Year on June 30, 2026 -> 2025-2026', getCurrentSchoolYear(new Date(2026, 5, 30)) === '2025-2026');
assert('School Year on January 15, 2027 -> 2026-2027', getCurrentSchoolYear(new Date(2027, 0, 15)) === '2026-2027');

// 4. Test Calculation Formula & Normalization
function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }
function normalize(actual, min, max) {
  if (max <= min) return 0;
  return clamp((actual - min) / (max - min), 0, 1);
}
function round2(x) { return Math.round(x * 100) / 100; }

// Scenario A: Standard 3 measures balanced to 30%
// IPR (weight 10%): goal=50, max=100 -> min=0. Actual=50 -> norm=0.5 -> 150 scale -> 50 pts
// M2 (weight 10%): goal=85, max=100 -> min=70. Actual=85 -> norm=0.5 -> 150 scale -> 50 pts
// M3 (weight 10%): goal=75, max=90 -> min=60. Actual=75 -> norm=0.5 -> 150 scale -> 50 pts
const sA_ipr = round2(round2(normalize(50, 0, 100) * 300) * (10 / 30));
const sA_m2  = round2(round2(normalize(85, 70, 100) * 300) * (10 / 30));
const sA_m3  = round2(round2(normalize(75, 60, 90) * 300) * (10 / 30));
const totalScoreA = sA_ipr + sA_m2 + sA_m3;

assert('Scenario A: Total score at midpoint goals = 150.00', totalScoreA === 150, `Got: ${totalScoreA}`);
assert('Scenario A: COPMS RANDA entry = 1.50', (totalScoreA / 100).toFixed(2) === '1.50');
assert('Scenario A: Rating = Expected', getMSLRating(totalScoreA) === 'Expected');

// Scenario B: High Performance (All at max)
const sB_ipr = round2(round2(normalize(100, 0, 100) * 300) * (10 / 30));
const sB_m2  = round2(round2(normalize(100, 70, 100) * 300) * (10 / 30));
const sB_m3  = round2(round2(normalize(90, 60, 90) * 300) * (10 / 30));
const totalScoreB = sB_ipr + sB_m2 + sB_m3;
assert('Scenario B: Total score at max = 300.00', totalScoreB === 300, `Got: ${totalScoreB}`);
assert('Scenario B: Rating = More Than Expected', getMSLRating(totalScoreB) === 'More Than Expected');

// Scenario C: Clamping below min / above max
const sC_low = normalize(50, 70, 100); // 50 is below min 70
const sC_high = normalize(110, 70, 100); // 110 is above max 100
assert('Scenario C: Score below min clamps to 0', sC_low === 0);
assert('Scenario C: Score above max clamps to 1', sC_high === 1);

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
