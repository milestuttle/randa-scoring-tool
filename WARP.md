# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **client-side web application** for calculating teacher effectiveness ratings using the 70:30 scoring methodology (70% Professional Practices / 30% Measures of Student Learning). The application implements Colorado Department of Education's SB22-070 Revised Scoring methodology.

**Technology Stack:** Pure HTML, CSS, and JavaScript (no frameworks, no build process, no dependencies)

## Development Commands

### Running the Application
Open `index.html` or `index-preciseMSL.html` directly in a browser:
```bash
open index.html
# or on Linux
xdg-open index.html
```

No server or build process is required. All calculations are client-side.

### Testing
Open the smoke test in a browser:
```bash
open test-smoke.html
```

The smoke test validates:
- Action button visibility (Print, Reset, Show Calculations)
- Button functionality
- DOM element existence

### Version Control
Check recent changes:
```bash
git --no-pager log --oneline -10
git --no-pager diff
```

## Code Architecture

### File Structure
```
smes-calculator/
├── index.html                  # Main application (standard MSL)
├── index-preciseMSL.html       # Precise MSL version (percentage-based scoring)
├── calculator.js               # Core calculation logic (standard version)
├── calculator-preciseMSL.js    # Core calculation logic (precise MSL)
├── styles.css                  # All styling (responsive, print-optimized)
├── test-smoke.html             # Visual smoke tests for UI elements
├── README.md                   # User documentation
├── SCORING_REFERENCE.md        # Scoring methodology reference
└── .gitignore                  # Git ignore rules
```

### Two Versions of the Application

There are **two parallel implementations** in this codebase:

1. **Standard Version** (`index.html` + `calculator.js`):
   - Uses simplified MSL rating selection (Less Than Expected / Expected / More Than Expected)
   - Automatically calculates scores based on rating categories
   
2. **Precise MSL Version** (`index-preciseMSL.html` + `calculator-preciseMSL.js`):
   - Uses detailed MSL input fields (Max Score, Expected Score, Higher Threshold, Less Upper Limit, Actual Score)
   - Allows percentage-based MSL scoring with precise cutscores
   - More complex UI with additional validation

When making changes, consider whether they should be applied to **both versions** or just one.

### Key JavaScript Functions

All calculations follow the Colorado Department of Education's scoring formulas documented in `SCORING_REFERENCE.md`.

**Professional Practices (PP) Calculations:**
- `calculateStandardScore(elements, weight, standardIndex)` - Computes per-standard scores (0-175 points per standard)
  - Formula: `(Earned / Possible) × (Weight / 100) × 700`
  - Returns weighted score on 700-point scale
- `calculatePPScore()` - Aggregates all 4 standards to get total PP score (0-700)
- Rating ranges: Basic (0-131), Partially Proficient (132-306), Proficient (307-481), Accomplished (482-656), Exemplary (657-700)

**Measures of Student Learning (MSL) Calculations:**
- `calculateMSLScore()` - Computes MSL score (0-300)
  - **Standard version**: Uses rating values (Less=0, Expected=1.5, More=3) × weights
  - **Precise version**: Uses cutscores to determine rating from actual scores, then calculates weighted total
- Rating ranges: Less Than Expected (0-99), Expected (100-200), More Than Expected (201-300)

**Final Rating:**
- `calculateFinalRating()` - Determines Overall Effectiveness (0-1000)
  - Sums PP + MSL scores
  - **Critical constraint**: If MSL is "Less Than Expected," final rating is capped at "Effective" even if point total would be "Highly Effective"
- Rating ranges: Ineffective (0-187), Partially Effective (188-406), Effective (407-800), Highly Effective (801-1000)

**Orchestration:**
- `updateAllCalculations()` - Main coordination function that:
  1. Validates all inputs
  2. Calculates PP, MSL, and final scores
  3. Updates UI with results
  4. Manages validation messages
  5. Controls step completion indicators

**Performance:**
- `debounce(func, delay)` - Prevents excessive recalculations
- `debouncedUpdate` - Debounced version of `updateAllCalculations` (150ms delay)

### Data Flow

1. **User Input** → HTML form elements (weights, element ratings, MSL measures)
2. **Validation** → `isStep1Valid()`, `isStep2Complete()`, `isStep3Valid()`
3. **Calculation** → `calculateStandardScore()` → `calculatePPScore()` → `calculateMSLScore()` → `calculateFinalRating()`
4. **UI Update** → DOM manipulation to display scores, ratings, and validation messages
5. **Live Updates** → Debounced recalculation on every input change

### Constants and Configuration

Key constants in both calculator files:
```javascript
const POINTS_PER_ELEMENT = 4;      // Each element max: 4 points (Level 5)
const PP_MAX_SCORE = 700;          // Professional Practices maximum
const MSL_MAX_SCORE = 300;         // Measures of Student Learning maximum
const TOTAL_MAX_SCORE = 1000;      // Final score maximum
const EPSILON = 0.01;              // Floating-point comparison tolerance
```

Rating range constants: `STANDARD_RATING_RANGES`, `PP_RATING_RANGES`, `MSL_RATING_RANGES`, `FINAL_RATING_RANGES`

### Standards Structure

The application evaluates 4 Quality Standards with 17 total elements:
- **Standard 1** (Content Knowledge): 3 elements (a, b, c)
- **Standard 2** (Learning Environment): 4 elements (a, b, c, d)
- **Standard 3** (Facilitation of Learning): 6 elements (a, b, c, d, e, f)
- **Standard 4** (Professionalism): 4 elements (a, b, c, d)

Each element is rated Level 1-5, with point values:
- Level 1 = 0 points (Not demonstrating)
- Level 2 = 1 point (Partially demonstrating)
- Level 3 = 2 points (Proficient)
- Level 4 = 3 points (Accomplished)
- Level 5 = 4 points (Exemplary)

### Validation Rules

**Step 1 Validation:**
- All 4 PP weights must sum to exactly 100% (within EPSILON tolerance)

**Step 2 Validation:**
- All 17 elements must have a level selected (Levels 1-5)

**Step 3 Validation:**
- Must have 2-5 MSL measures
- MSL weights must sum to exactly 30% (within EPSILON tolerance)
- **Standard version**: All measures must have a rating selected
- **Precise version**: All measures must have all 6 fields filled (weight, max score, expected score, higher threshold, less upper limit, actual score)

**Step 4 Display:**
- Only shows final rating when Steps 1-3 are all valid

## UI Features and Patterns

### Progress Indicators
- 4-step visual progress bar at top of page
- Steps auto-complete when validation passes
- `step-indicator-X` IDs control step highlighting

### Validation Feedback
- Real-time validation messages with color coding
- Success: green, Error: red
- ARIA live regions for accessibility

### Interactive Elements
- **Quick Actions**: "Equal Weights" button, "Load Sample Data" button
- **Show Calculations Modal**: Displays detailed calculation breakdowns
- **Print Optimization**: Clean print layout via `@media print` CSS
- **Reset All**: Clears all inputs and returns to initial state
- **Tooltips**: Help text for each major section (ⓘ icon)

### Responsive Design
- Mobile-first CSS with responsive breakpoints
- Grid layouts for weights and elements
- Collapsible sections for smaller screens

### Accessibility
- WCAG AA compliant
- ARIA labels and roles throughout
- Keyboard navigation support
- Screen reader announcements for live updates

## Testing and Verification

### Known Test Cases
Documented in `README.md` and `SCORING_REFERENCE.md`:

1. **All Level 3 (Proficient)**: PP ≈350, MSL ≈150, Final ≈500 (Effective)
2. **All Level 5 (Exemplary)**: PP = 700, MSL = 300, Final = 1000 (Highly Effective)
3. **MSL Constraint Test**: PP = 700, MSL = 0 → Final rating capped at "Effective" (not Highly Effective)

### Manual Testing Checklist
- Weight totals validation (must equal 100% and 30%)
- Element selection completeness (all 17 elements)
- MSL measure min/max (2-5 measures)
- Final rating calculation accuracy
- Print layout appearance
- Browser compatibility (Chrome, Firefox, Safari, Edge)

## Common Development Tasks

### Adding a New Standard
1. Update `STANDARDS` array in calculator JS
2. Add HTML section in index.html for elements
3. Update total element count validation in `isStep2Complete()`
4. Add rating threshold arrays if per-element earned thresholds differ

### Modifying Rating Ranges
1. Update range constants: `PP_RATING_RANGES`, `MSL_RATING_RANGES`, `FINAL_RATING_RANGES`
2. Update corresponding HTML visualization ranges in Step 4 summary
3. Update documentation in `README.md` and `SCORING_REFERENCE.md`

### Changing Calculation Formulas
1. Locate the relevant function: `calculateStandardScore()`, `calculateMSLScore()`, or `calculateFinalRating()`
2. Update formula per CDE documentation
3. Update test cases in README.md
4. Verify with manual calculations against reference spreadsheet

### Styling Changes
All styles are in `styles.css`:
- Main layout and cards: lines 1-200
- Form elements: lines 200-400
- Responsive breakpoints: check `@media` queries
- Print styles: `@media print` section at end of file
- Color scheme: CSS custom properties at top

## Important Constraints and Edge Cases

1. **MSL Rating Cap**: If MSL is "Less Than Expected" (< 100 points), final effectiveness rating is capped at "Effective" regardless of total score
2. **Floating Point Precision**: Use `EPSILON` constant for weight sum comparisons (not exact equality)
3. **No Data Persistence**: Application is fully client-side with no storage - all data is session-only
4. **Browser Compatibility**: Target modern browsers only (no IE11 support)

## Resources and References

- **Colorado Department of Education**: SB22-070 SMES Revised Scoring (May 2023)
- **Methodology Documentation**: See `SCORING_REFERENCE.md` for formulas and ranges
- **User Guide**: See `README.md` for complete user instructions
