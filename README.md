# RANDA Scoring Weight Web Tool

A web-based calculator for teacher evaluation implementing the 70:30 scoring methodology (70% Professional Practices / 30% Measures of Student Learning).

## Purpose

This calculator helps administrators and teachers compute teacher effectiveness ratings by:
- Assigning weights to Professional Practices standards
- Rating element-level proficiency
- Calculating Measures of Student Learning scores
- Determining Overall Effectiveness ratings

## How to Use

1. **Open the Calculator**
   - Simply open `index.html` in any modern web browser
   - No installation, server, or internet connection required

2. **Complete the 4-Step Process**

### Step 1: Weights for Professional Practices
- Assign percentage weights to each of the 4 Quality Standards
- **Total must equal 100%**
- Typical distribution: 25% each, but can be customized based on district priorities

### Step 2: Element Level Proficiency
- Rate each of the 17 elements across all standards (Level 1-5)
  - Standard 1: 3 elements (a, b, c)
  - Standard 2: 4 elements (a, b, c, d)
  - Standard 3: 6 elements (a, b, c, d, e, f)
  - Standard 4: 4 elements (a, b, c, d)
- Each element contributes points based on its level:
  - Level 1 = 0 points
  - Level 2 = 1 point
  - Level 3 = 2 points
  - Level 4 = 3 points
  - Level 5 = 4 points (maximum per element)
- View per-standard and overall Professional Practices ratings in real-time

### Step 3: Measures of Student Learning (MSL)
- Add 2-5 MSL measures using the "+ Add Measure" button
- For each measure:
  - Assign a weight (percentage of 30%)
  - Select a rating: Less Than Expected, Expected, or More Than Expected
- **Total weights must equal 30%**

### Step 4: Overall Effectiveness Rating
- Once Steps 1-3 are complete and valid, your final rating will automatically calculate
- View breakdown of Professional Practices and MSL scores
- See your Overall Effectiveness rating (Ineffective, Partially Effective, Effective, or Highly Effective)

3. **Print or Save Results**
   - Use your browser's print function (Ctrl/Cmd + P) to save results as PDF
   - The print layout is optimized for clean, professional output

4. **Reset**
   - Click "Reset All" to clear all inputs and start over

## Scoring Methodology

### Professional Practices (700 points, 70% of final score)

**Calculation:**
1. For each standard: `(Elements Earned / Elements Possible) × (Standard Weight / 100) × 20`
2. Sum all 4 standards → Professional Practices Base Score (out of 20)
3. Scale to 700: `Base Score × 35`

**Rating Ranges (700-point scale):**
- **Exemplary**: 657-700
- **Accomplished**: 482-656
- **Proficient**: 307-481 (meets state standard)
- **Partially Proficient**: 132-306
- **Basic**: 0-131

### Measures of Student Learning (300 points, 30% of final score)

**Calculation:**
1. For each measure: `Rating Value × (Measure Weight / 30) × 3`
   - Less Than Expected = 0
   - Expected = 1.5
   - More Than Expected = 3
2. Sum all measures → MSL Base Score (out of 3)
3. Scale to 300: `Base Score × 100`

**Rating Ranges (300-point scale):**
- **More Than Expected**: 201-300
- **Expected**: 100-200 (meets state standard)
- **Less Than Expected**: 0-99

### Final Effectiveness Rating (1000 points)

**Calculation:**
`Final Score = Professional Practices Score + MSL Score`

**Rating Ranges (1000-point scale):**
- **Highly Effective**: 801-1000
- **Effective**: 407-800 (meets state standard)
- **Partially Effective**: 188-406
- **Ineffective**: 0-187

**Important Constraint:**
If MSL rating is "Less Than Expected," the maximum Final Effectiveness rating is capped at "Effective," even if the point total falls in the "Highly Effective" range.

## Quality Standards Overview

### Standard 1: Content Knowledge
Teachers demonstrate mastery of and pedagogical expertise in the content they teach.

### Standard 2: Learning Environment
Teachers establish a safe, inclusive, and respectful learning environment for a diverse population of students.

### Standard 3: Facilitation of Learning
Teachers plan and deliver effective instruction and create an environment that facilitates learning for their students.

### Standard 4: Professionalism
Teachers demonstrate professionalism through ethical conduct, reflection, and leadership.

## Technical Details

- **Technology**: Pure HTML, CSS, and JavaScript (no frameworks or dependencies)
- **Data Storage**: None - all calculations are client-side and session-only
- **Browser Compatibility**: Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- **Responsive**: Optimized for desktop, tablet, and mobile devices
- **Accessibility**: WCAG AA compliant with ARIA labels and keyboard navigation
- **File Size**: ~70KB total (HTML + CSS + JS)

## Resources

This tool implements a standardized 70:30 evaluation methodology for Professional Practices and Measures of Student Learning.

## Disclaimer

This calculator is for **informational purposes only**. It implements a 70:30 scoring methodology for teacher evaluation.

**Important Notes:**
- No data is stored, transmitted, or saved
- Always verify calculations with official evaluation documentation
- Organizations may have additional requirements or modifications to this methodology
- This tool should be used in conjunction with, not as a replacement for, official evaluation processes
- For official evaluations, use organization-approved tools and procedures

## Testing & Verification

### Known Test Cases

**Test Case 1: All Level 3 (Proficient) with Equal Weights & Expected MSL**
- PP Weights: 25% each standard
- Elements: All Level 3
- MSL: Two measures, 15% each, both "Expected"
- **Expected Result**: PP = Proficient (~350/700), MSL = Expected (150/300), Final = Effective (~500/1000)

**Test Case 2: Maximum Scores**
- PP Weights: 25% each standard
- Elements: All Level 5
- MSL: Two measures, 15% each, both "More Than Expected"
- **Expected Result**: PP = Exemplary (700/700), MSL = More Than Expected (300/300), Final = Highly Effective (1000/1000)

**Test Case 3: MSL Constraint**
- PP Weights: 25% each standard
- Elements: All Level 5 (PP = 700)
- MSL: Two measures, 15% each, both "Less Than Expected" (MSL = 0)
- **Expected Result**: PP = Exemplary, MSL = Less Than Expected, Final = **Effective (capped)**, NOT Highly Effective despite 700 points

### Validation Checks

The calculator validates:
- ✅ PP weights sum to 100%
- ✅ All 17 elements are rated before showing final results
- ✅ MSL has 2-5 measures
- ✅ MSL weights sum to 30%
- ✅ All MSL measures have ratings
- ✅ Calculations follow the 70:30 scoring methodology

## Development

### Project Structure
```
smes-calculator/
├── index.html      # Main HTML structure
├── styles.css      # Styling and responsive design
├── calculator.js   # All calculation logic
└── README.md       # This file
```

### Key Functions (calculator.js)
- `calculateStandardScore()` - Computes per-standard scores
- `calculatePPScore()` - Aggregates Professional Practices
- `calculateMSLScore()` - Computes Measures of Student Learning
- `calculateFinalRating()` - Determines Overall Effectiveness with MSL constraint
- `updateAllCalculations()` - Main orchestration function

## License & Credits

**Created:** 2024  
**Methodology:** 70:30 Teacher Evaluation Scoring (70% Professional Practices / 30% Measures of Student Learning)  
**Author:** RANDA Educational Tools  

This is an educational resource. Please verify all calculations with official evaluation documentation.

## Support

For questions about the **calculator tool**:
- Review this README
- Check the official CDE resources linked above

For questions about **official SMES evaluation procedures**:
- Contact your district's Educator Effectiveness office
- Visit the [CDE Educator Effectiveness Office](https://www.cde.state.co.us/educatoreffectiveness)

---

**Version:** 1.0  
**Last Updated:** November 2024  
**Compatible with:** SB22-070 Revised Scoring (2023-24 school year and beyond)
