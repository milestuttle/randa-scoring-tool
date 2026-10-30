// Command-line tests for the MSL Simple calculator.
// Loads the real calculator-msl-simple.js with a minimal stand-in for the page,
// so these tests fail if the shipped code changes. Run: node smoke-test-runner.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

const source = fs.readFileSync(path.join(__dirname, 'calculator-msl-simple.js'), 'utf8');

/**
 * Loads a fresh copy of the calculator. `now` sets the date the code sees.
 */
function loadCalculator(now = new Date(2026, 9, 15)) {
  const elements = {};
  const rows = [];
  const storage = {};

  class FixedDate extends Date {
    constructor(...args) {
      if (args.length) super(...args);
      else super(now.getTime());
    }
  }

  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    Date: FixedDate,
    localStorage: {
      getItem: key => (key in storage ? storage[key] : null),
      setItem: (key, value) => { storage[key] = value; },
      removeItem: key => { delete storage[key]; }
    },
    document: {
      readyState: 'loading', // keeps init() from running against the stand-in page
      addEventListener() {},
      getElementById: id => elements[id] || null,
      querySelectorAll: () => rows
    }
  });
  vm.runInContext(source, context);

  // Each measure: { w, g, x, a }. The first is IPR, which has a fixed scale.
  context.setMeasures = measures => {
    rows.length = 0;
    measures.forEach((m, i) => {
      const index = String(i + 1);
      const isIPR = i === 0;
      rows.push({ dataset: { index }, classList: { contains: cls => isIPR && cls === 'ipr-row' } });
      const field = (name, value) => {
        elements[`msl-${name}-${index}`] = { value: value === undefined ? '' : String(value) };
      };
      field('name', isIPR ? 'IPR' : `Measure ${index}`);
      field('desc', '');
      field('weight', m.w);
      if (!isIPR) {
        field('goal', m.g);
        field('max', m.x);
      }
      field('actual', m.a);
    });
    return context.calculateMSL();
  };
  context.storage = storage;
  return context;
}

const calc = loadCalculator();
const ipr = (a, w = 10) => ({ w, a });
const measure = (a, w = 20, g = 85, x = 100) => ({ w, g, x, a });

// 1. Escaping
console.log('Escaping');
assert('escapeHTML handles scripts', calc.escapeHTML('<script>alert(1)</script>') === '&lt;script&gt;alert(1)&lt;/script&gt;');
assert('escapeHTML handles quotes and ampersands', calc.escapeHTML('A & B "C"') === 'A &amp; B &quot;C&quot;');
assert('escapeHTML handles null/undefined', calc.escapeHTML(null) === '' && calc.escapeHTML(undefined) === '');

// 2. Rating
console.log('\nRating');
[
  [0, 'Less Than Expected'],
  [99, 'Less Than Expected'],
  [99.99, 'Less Than Expected'],
  [100, 'Expected'],
  [150, 'Expected'],
  [200, 'Expected'],
  [200.01, 'More Than Expected'],
  [300, 'More Than Expected']
].forEach(([score, rating]) => {
  const got = calc.getMSLRating(score);
  assert(`${score} -> ${rating}`, got === rating, `Got: ${got}`);
});

// 3. School year
console.log('\nSchool year');
[
  [new Date(2026, 7, 15), '2026-2027'],
  [new Date(2026, 6, 1), '2026-2027'],
  [new Date(2026, 5, 30), '2025-2026'],
  [new Date(2027, 0, 15), '2026-2027']
].forEach(([date, expected]) => {
  const got = loadCalculator(date).getCurrentSchoolYear();
  assert(`${date.toDateString()} -> ${expected}`, got === expected, `Got: ${got}`);
});

const saver = loadCalculator();
saver.setMeasures([ipr(50), measure(85)]);
saver.saveState();
const savedState = JSON.parse(saver.storage[vm.runInContext('STORAGE_KEY', saver)]);
assert('Saved data records the school year', savedState.schoolYear === '2026-2027', `Got: ${savedState.schoolYear}`);

// 4. Scoring through the real calculateMSL
console.log('\nScoring');
const flagship = calc.setMeasures([ipr(85), measure(92)]);
assert('Explainer example: 85.00 + 146.67 = 231.67', flagship.score === 231.67 && flagship.measures[1].weighted === 146.67, `Got: ${flagship.score}`);
assert('Explainer example: 73.33% of range', flagship.measures[1].percentage === 73.33, `Got: ${flagship.measures[1].percentage}`);
assert('Min = 2 x Goal - Max', flagship.measures[1].minScore === 70, `Got: ${flagship.measures[1].minScore}`);

const atGoal = calc.setMeasures([ipr(50), measure(85)]);
assert('Every measure at Goal = 150', atGoal.score === 150 && atGoal.rating === 'Expected', `Got: ${atGoal.score}, ${atGoal.rating}`);

const atMax = calc.setMeasures([ipr(100), measure(100)]);
assert('Every measure at Max = 300', atMax.score === 300 && atMax.rating === 'More Than Expected', `Got: ${atMax.score}, ${atMax.rating}`);

const atMin = calc.setMeasures([ipr(0), measure(70)]);
assert('Every measure at Min = 0', atMin.score === 0 && atMin.rating === 'Less Than Expected', `Got: ${atMin.score}, ${atMin.rating}`);

const threeMeasures = calc.setMeasures([ipr(50), measure(70, 10), measure(100, 10)]);
assert('Three measures add up', threeMeasures.valid && threeMeasures.score === 150, `Got: ${threeMeasures.score}`);

// 5. Scores outside the range are legitimate and count at the limit
console.log('\nScores outside the range');
const aboveMax = calc.setMeasures([ipr(85), measure(120)]);
assert('Above Max earns full points and no more', aboveMax.valid && aboveMax.measures[1].weighted === 200, `Got: ${aboveMax.measures[1].weighted}`);
const belowMin = calc.setMeasures([ipr(85), measure(50)]);
assert('Below Min earns zero', belowMin.valid && belowMin.measures[1].weighted === 0, `Got: ${belowMin.measures[1].weighted}`);

// 6. Structure rules
console.log('\nStructure rules');
assert('IPR alone is not valid', !calc.setMeasures([ipr(50, 30)]).valid);
assert('IPR above 10% is not valid', !calc.setMeasures([ipr(50, 11), measure(85, 19)]).valid);
assert('IPR below 1% is not valid', !calc.setMeasures([ipr(50, 0.5), measure(85, 29.5)]).valid);
assert('IPR at 1% is valid', calc.setMeasures([ipr(50, 1), measure(85, 29)]).valid);
assert('Four measures are not valid', !calc.setMeasures([ipr(50), measure(85, 10), measure(85, 5), measure(85, 5)]).valid);
assert('Weights under 30% are not valid', !calc.setMeasures([ipr(50), measure(85, 15)]).valid);
assert('Weights over 30% are not valid', !calc.setMeasures([ipr(50), measure(85, 25)]).valid);
assert('Max at or below Goal is not valid', !calc.setMeasures([ipr(50), measure(85, 20, 85, 85)]).valid);
assert('Missing score is not valid', !calc.setMeasures([ipr(50), measure(undefined)]).valid);

console.log(`\n========================================`);
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
