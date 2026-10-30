# MSL Score Calculator

A calculator for Measures of Student Learning (MSL) scores, used for COPMS RANDA entry at Cañon City Schools. It's published at https://msl.canoncityschools.org.

It runs entirely in the browser, with no server or login. Entries are saved only in that browser until someone clicks Reset All, and nothing is sent anywhere.

## How scoring works

See [SCORING_REFERENCE.md](SCORING_REFERENCE.md) for the rules and a worked example.

## Files

| File | Purpose |
|---|---|
| `index.html` | Redirects to the calculator |
| `index-msl-simple.html`, `calculator-msl-simple.js`, `styles.css` | The calculator |
| `scoring-explainer.js` | The "How Scoring Works" walkthrough |
| `msl-scoring-one-pager.html`, `MSL-Scoring-One-Pager.pdf` | One-page scoring handout |
| `MSL-Scoring-Explainer.mp4`, `explainer-video-source.html` | Explainer video and its source |
| `index-standard.html`, `index-preciseMSL.html`, `index-msl-only.html`, `landing.html` | Redirects from retired addresses to the calculator |

## Running it locally

```
python3 -m http.server 8777
```

Then open http://localhost:8777.

## Tests

- **Command line:** `node smoke-test-runner.js`
- **Browser:** with the local server running, open http://localhost:8777/test-smoke-msl-simple.html

## Archived tools

Older calculators and their docs are kept on the `archive/legacy-tools` branch and the `legacy-tools-2026-10-30` tag. These include the full 70:30 calculators, the Precise MSL calculator, and the MSL-only calculator. The website doesn't publish them.

To see them:

```
git switch archive/legacy-tools
```
