# MSL-Only Calculator - Precise Cutscore Method

A simplified version of the RANDA Scoring Weight Web Tool that focuses exclusively on calculating Measures of Student Learning (MSL) scores using the precise cutscore-based method.

## Overview

This calculator removes all Professional Practices rubric components and provides a streamlined interface for calculating MSL scores only. It uses the same precise cutscore-based methodology as the full calculator but simplifies the workflow by focusing on a single component.

## Key Differences from Full Calculator

### What's Removed
- **Professional Practices Section**: No Standard 1-4 element ratings
- **70:30 Split**: Since there's no PP component, MSL is the only score
- **Complex Progress Indicators**: Simplified to focus on MSL completion only

### What's Changed
- **MSL Weights**: Display as totaling **30%** (matching the convention from the full calculator where MSL is 30% of the overall score)
  - *Note: Internally, calculations are scaled appropriately, but the UI shows 30% to match staff expectations*
- **Final Score**: Displayed as MSL score out of 300 (not combined with PP)
- **Simplified UI**: Cleaner interface with fewer steps

### What's Kept
- **Precise Cutscore Method**: Same interpolation algorithm for mapping actual scores to 300-point scale
- **IPR Requirement**: First measure must still be IPR with pre-filled cutscores
- **2-5 Measures**: Same requirement for number of MSL measures
- **Auto-save**: State is saved to localStorage
- **Calculation Details**: Modal showing detailed breakdown
- **Copy Summary**: Export results to clipboard

## How to Use

1. **Open the Calculator**: Open `index-msl-only.html` in any modern web browser
2. **Configure MSL Measures**:
   - The first measure (IPR) is pre-configured with standard cutscores
   - Add 1-4 additional measures using the "+ Add Measure" button
   - For each measure:
     - Enter a descriptive name
     - Set the weight (must total 30% across all measures)
     - Define cutscores for performance ranges
     - Enter the actual score achieved
3. **View Results**: Your MSL score and rating will calculate automatically

## Scoring Methodology

### MSL Score Calculation (300 points)

For each measure:
1. **Map actual score to 300-point scale** using linear interpolation between cutscores:
   - Less Than Expected range (0 to lessUpperLimit) → 0 to 100
   - Expected range (lessUpperLimit to higherThreshold) → 100 to 200
   - More Than Expected range (higherThreshold to maxScore) → 201 to 300

2. **Weight the scaled score** by the measure's percentage

3. **Sum all weighted scores** → Final MSL Score (out of 300)

### Rating Ranges
- **More Than Expected**: 201-300 points
- **Expected**: 100-200 points
- **Less Than Expected**: 0-99 points

## Files

- `index-msl-only.html` - Main HTML page
- `calculator-msl-only.js` - JavaScript logic
- `styles.css` - Shared CSS (same as full calculator)

## Use Cases

This simplified calculator is ideal for:
- **MSL-Only Evaluations**: When Professional Practices are evaluated separately
- **Training**: Teaching the cutscore-based MSL methodology without PP complexity
- **Quick Calculations**: When you only need to calculate MSL scores
- **Testing**: Validating MSL scoring logic independently

## Technical Notes

- No server required - runs entirely in the browser
- Data is saved to localStorage (not transmitted anywhere)
- Compatible with all modern browsers
- Responsive design works on desktop and mobile

## Disclaimer

This calculator is for **informational purposes only**. Always verify calculations with official evaluation documentation and use organization-approved tools for official evaluations.
