

// ===================================
// PROFESSIONAL PRACTICES CALCULATIONS
// ===================================

function calculateStandardScore(elements, weight, standardIndex) {
    const earned = sum(elements);
    const possible = elements.length * POINTS_PER_ELEMENT;
    const ratio = possible > 0 ? earned / possible : 0;
    const ratioClamped = clamp(ratio, 0, 1);
    // Direct calculation to 700-point scale per CDE formula:
    // Weighted Score = (Earned / Possible) × (Weight / 100) × 700
    const weightedScore700 = ratioClamped * (weight / 100) * PP_MAX_SCORE;

    // For display purposes, also calculate the base contribution (out of 20)
    const baseContribution = ratioClamped * (weight / 100) * PP_BASE_MAX;

    // Rating thresholds from Excel cells K91-K95, M91-M95, O91-O95, Q91-Q95
    // These are earned point thresholds specific to each standard
    const thresholds = [
        [1, 4, 7, 10, 12],    // Standard 1 (3 elements, max 12 points)
        [2, 6, 10, 14, 16],   // Standard 2 (4 elements, max 16 points)
        [3, 9, 15, 21, 24],   // Standard 3 (6 elements, max 24 points)
        [2, 6, 10, 14, 16]    // Standard 4 (4 elements, max 16 points)
    ];

    const t = thresholds[standardIndex];
    let standardRating;

    if (earned <= t[0]) {
        standardRating = 'Basic';
    } else if (earned <= t[1]) {
        standardRating = 'Partially Proficient';
    } else if (earned <= t[2]) {
        standardRating = 'Proficient';
    } else if (earned <= t[3]) {
        standardRating = 'Accomplished';
    } else if (earned <= t[4]) {
        standardRating = 'Exemplary';
    } else {
        standardRating = 'ERROR';
    }

    return {
        earned,
        possible,
        ratio: ratioClamped,
        weightedScore700: round2(weightedScore700),
        baseContribution: round2(baseContribution),
        rating: standardRating
    };
}

function calculatePPScore() {
    const standardScores = [];
    let ppScore700 = 0;
    let ppBase = 0;

    for (let i = 0; i < STANDARDS.length; i++) {
        const std = STANDARDS[i];
        const weight = parseNum(document.getElementById(`pp-weight-s${i + 1}`)?.value);

        const elements = std.elements.map(elem => {
            const select = document.getElementById(`${std.id}${elem}-level`);
            const level = select ? parseNum(select.value) : 0;
            // Convert level (1-5) to points (0-4): Level 1=0pts, Level 2=1pt, Level 3=2pts, Level 4=3pts, Level 5=4pts
            return level > 0 ? level - 1 : 0;
        });

        const score = calculateStandardScore(elements, weight, i);
        standardScores.push({ ...score, standard: std });
        ppScore700 += score.weightedScore700;
        ppBase += score.baseContribution;
    }

    const ppPct = ppScore700 / PP_MAX_SCORE;
    const ppRating = getRatingLabel(ppScore700, PP_RATING_RANGES);

    return {
        base: round2(ppBase),
        score: round2(ppScore700),
        percentage: pct(ppPct),
        rating: ppRating,
        standards: standardScores
    };
}
