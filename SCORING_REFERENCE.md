# MSL Scoring Reference

How the MSL Score Calculator turns measures into a score, a rating, and a RANDA entry.

## Measure rules

- Weights must total 30%.
- IPR is the school's collective measure. It must be 1–10%, and it defaults to 10%.
- At least one individual measure is required.
- Three measures are allowed in total, per district decision.

The collective weight limit and the individual measure requirement come from CDE's District/BOCES Guide to Creating MSLs/MSOs (Summer 2023). That guide allows 2–5 measures in RANDA, and the district caps that at three.

## Formula

```
Min = 2 × Goal − Max
Weighted Points = (Weight ÷ 30) × 300
Measure Score = ((Score − Min) ÷ (Max − Min)) × Weighted Points
MSL Score = sum of all Measure Scores
RANDA Entry = MSL Score ÷ 100
```

- IPR uses a fixed scale: Goal 50, Max 100, and Min 0.
- A score above Max earns full points and no more. A score below Min earns zero. These scores can be legitimate, so the calculator doesn't warn about them.

## Rating ranges (300-point scale)

| Rating | Points |
|---|---|
| More Than Expected | 201–300 |
| Expected | 100–200 |
| Less Than Expected | 0–99 |

If the MSL rating is Less Than Expected, the Final Effectiveness rating is capped at Effective.

## Worked example

IPR at 10% with a score of 85, plus a 20% measure with Goal 85, Max 100, and a score of 92:

| Step | Result |
|---|---|
| IPR | 85% of 100 points = 85.00 |
| Measure Min | 2 × 85 − 100 = 70 |
| Measure position | (92 − 70) ÷ (100 − 70) = 73.33% |
| Measure Score | 73.33% of 200 points = 146.67 |
| MSL Score | 85.00 + 146.67 = 231.67 |
| RANDA Entry | 2.32 |
| Rating | More Than Expected |

## Source

The rating ranges and cap come from [CDE SB22-070 SMES Revised Scoring and Cut Points (May 2023)](https://www.cde.state.co.us/educatoreffectiveness/smes-revised-scoring-cut-points-pdf). The sliding-scale method is a district decision and isn't defined by CDE. The older three-rating method is kept on the `archive/legacy-tools` branch.
