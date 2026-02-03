# Quick Comparison: Full Calculator vs MSL-Only Calculator

## Feature Comparison

| Feature | Full Calculator (index-preciseMSL.html) | MSL-Only Calculator (index-msl-only.html) |
|---------|----------------------------------------|-------------------------------------------|
| **Professional Practices** | ✅ Yes - 4 Standards, 17 Elements | ❌ No - Removed entirely |
| **MSL Measures** | ✅ Yes - 2-5 measures | ✅ Yes - 2-5 measures |
| **MSL Weight Total** | 30% (of overall score) | 30% (displayed to match convention) |
| **Final Score Scale** | 1000 points (700 PP + 300 MSL) | 300 points (MSL only) |
| **Progress Steps** | 4 steps (PP Weights, Elements, MSL, Final) | 1 step (MSL only) |
| **IPR Required** | ✅ Yes | ✅ Yes |
| **Cutscore Method** | ✅ Precise interpolation | ✅ Precise interpolation |
| **Auto-save** | ✅ Yes | ✅ Yes |
| **Sample Data** | ✅ Yes | ❌ No |
| **Calculation Modal** | ✅ Yes | ✅ Yes |
| **Copy Summary** | ✅ Yes | ✅ Yes |

## Rating Scales

### Full Calculator
- **Overall Effectiveness** (1000 points):
  - Highly Effective: 801-1000
  - Effective: 407-800
  - Partially Effective: 188-406
  - Ineffective: 0-187

- **Professional Practices** (700 points):
  - Exemplary: 657-700
  - Accomplished: 482-656
  - Proficient: 307-481
  - Partially Proficient: 132-306
  - Basic: 0-131

- **MSL** (300 points):
  - More Than Expected: 201-300
  - Expected: 100-200
  - Less Than Expected: 0-99

### MSL-Only Calculator
- **MSL** (300 points):
  - More Than Expected: 201-300
  - Expected: 100-200
  - Less Than Expected: 0-99

## When to Use Each Calculator

### Use Full Calculator When:
- Conducting complete teacher evaluations
- Need both Professional Practices and MSL scores
- Following the official 70:30 methodology
- Generating comprehensive evaluation reports

### Use MSL-Only Calculator When:
- Only calculating MSL scores
- Professional Practices evaluated separately
- Training on cutscore-based MSL methodology
- Quick MSL calculations needed
- Testing MSL scoring logic independently

## File Locations

```
smes-calculator/
├── index.html                    # Original calculator (simple MSL method)
├── index-preciseMSL.html         # Full calculator (precise MSL method)
├── index-msl-only.html          # MSL-only calculator (precise method)
├── calculator.js                 # Logic for original calculator
├── calculator-preciseMSL.js     # Logic for full precise calculator
├── calculator-msl-only.js       # Logic for MSL-only calculator
├── styles.css                    # Shared styles for all calculators
├── README.md                     # Main documentation
├── README-MSL-ONLY.md           # MSL-only documentation
└── COMPARISON.md                # This file
```
