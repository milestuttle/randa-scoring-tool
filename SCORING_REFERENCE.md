# SMES Scoring Quick Reference

## Element Level to Points Mapping

| Level | Points per Element |
|-------|-------------------|
| Level 1 | 0 points |
| Level 2 | 1 point |
| Level 3 | 2 points |
| Level 4 | 3 points |
| Level 5 | 4 points (max) |

## Professional Practices Calculation

### Formula (per CDE document page 3):
```
Weighted Standard Score = (Earned Points / Possible Points) × (Weight % / 100) × 700

Total PP Score = Sum of all 4 standard scores
```

### Example: Standard 1 (3 elements, 25% weight)
- **All Level 5s**: (12/12) × 0.25 × 700 = **175 points**
- **All Level 4s**: (9/12) × 0.25 × 700 = **131.25 points**
- **All Level 3s**: (6/12) × 0.25 × 700 = **87.5 points**
- **All Level 2s**: (3/12) × 0.25 × 700 = **43.75 points**
- **All Level 1s**: (0/12) × 0.25 × 700 = **0 points**

### PP Rating Ranges (700-point scale):
| Rating | Points Range |
|--------|-------------|
| Exemplary | 657 - 700 |
| Accomplished | 482 - 656 |
| Proficient ⭐ | 307 - 481 |
| Partially Proficient | 132 - 306 |
| Basic | 0 - 131 |

⭐ = Meets state standard

### Standard Rating Ranges (20-point base scale):
Used for per-standard ratings displayed in Step 2:

| Rating | Base Points Range |
|--------|------------------|
| Exemplary | 18.75 - 20 |
| Accomplished | 13.75 - 18.74 |
| Proficient ⭐ | 8.75 - 13.74 |
| Partially Proficient | 3.75 - 8.74 |
| Basic | 0 - 3.74 |

## Measures of Student Learning Calculation

### Formula (per CDE document page 4):
```
Weighted MSL Score = (Weight % / 30) × Rating Value × 100

Total MSL Score = Sum of all measure scores
```

### Rating Values:
- **Less Than Expected** = 0
- **Expected** = 1.5
- **More Than Expected** = 3

### Example: Two measures at 15% each
- **Both "Expected"**: (15/30 × 1.5 × 100) + (15/30 × 1.5 × 100) = **150 points**
- **Both "More Than Expected"**: (15/30 × 3 × 100) + (15/30 × 3 × 100) = **300 points**
- **Both "Less Than Expected"**: (15/30 × 0 × 100) + (15/30 × 0 × 100) = **0 points**

### MSL Rating Ranges (300-point scale):
| Rating | Points Range |
|--------|-------------|
| More Than Expected | 201 - 300 |
| Expected ⭐ | 100 - 200 |
| Less Than Expected | 0 - 99 |

⭐ = Meets state standard

## Final Effectiveness Rating

### Formula:
```
Final Score = PP Score + MSL Score
Maximum = 700 + 300 = 1000 points
```

### Final Rating Ranges (1000-point scale):
| Rating | Points Range |
|--------|-------------|
| Highly Effective | 801 - 1000 |
| Effective ⭐ | 407 - 800 |
| Partially Effective | 188 - 406 |
| Ineffective | 0 - 187 |

⭐ = Meets state standard

### Special Constraint:
**If MSL rating is "Less Than Expected", the maximum Final Effectiveness rating is capped at "Effective" regardless of point total.**

## Test Examples

### Test 1: All Level 3s, Equal Weights
- **Inputs**: All elements Level 3, all weights 25%
- **PP Calculation**:
  - Standard 1: (6/12) × 0.25 × 700 = 87.5
  - Standard 2: (8/16) × 0.25 × 700 = 87.5
  - Standard 3: (12/24) × 0.25 × 700 = 87.5
  - Standard 4: (8/16) × 0.25 × 700 = 87.5
  - **Total PP: 350 points (Proficient)**
- **MSL**: Two measures, 15% each, both "Expected" = **150 points (Expected)**
- **Final**: 350 + 150 = **500 points (Effective)**

### Test 2: All Level 5s, Equal Weights
- **Inputs**: All elements Level 5, all weights 25%
- **PP**: 175 + 175 + 175 + 175 = **700 points (Exemplary)**
- **MSL**: Two measures, 15% each, both "More Than Expected" = **300 points**
- **Final**: 700 + 300 = **1000 points (Highly Effective)**

### Test 3: MSL Constraint
- **Inputs**: All Level 5s (PP = 700), MSL "Less Than Expected" (0 points)
- **PP**: **700 points (Exemplary)**
- **MSL**: **0 points (Less Than Expected)**
- **Final**: 700 + 0 = 700 points
- **Rating**: **Effective** (capped, NOT Highly Effective)

## Source
Based on: [CDE SB22-070 SMES Revised Scoring and Cut Points (May 2023)](https://www.cde.state.co.us/educatoreffectiveness/smes-revised-scoring-cut-points-pdf)
