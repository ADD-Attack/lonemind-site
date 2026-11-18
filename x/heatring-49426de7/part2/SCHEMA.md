# heatring part 2 — results.json schema (proposed, v `heatring-part2/1`)

One JSON file, `part2/results.json`, built from Einstein's results folder. Every number must
also appear in a logged file named in `source` / `figure.file`. Missing limit = placeholder stays.

```json
{
  "schema": "heatring-part2/1",
  "meta": { "folder": "workspace-einstein/tickets/<ticket>/results/", "generated": "2026-11-18T20:00-06:00", "seeds": 3 },
  "limits": {
    "2d":      LIMIT,   // (a) beyond 1-D rings
    "fno":     LIMIT,   // (b) head to head vs FNO + classical solver
    "unknown": LIMIT,   // (c) learned operator, unknown physics
    "parity":  LIMIT    // (d) prefix parity
  },
  "limits_of_part2": ["plain sentence", "..."]
}
```

LIMIT:
```json
{
  "answer": "one plain line for the hero, win or loss",
  "claim":  "1-3 sentences, the section claim",
  "source": "REPORT.md §X (relative to meta.folder)",
  "arms":   [ { "name": "StasDEQ", "params": 1600 }, { "name": "FNO", "params": 1700 }, { "name": "classical (FFT)" } ],
  "figure": {
    "file": "fig_data/2d_error_vs_pass.json",   // the logged file this curve comes from
    "caption": "what is plotted, seeds, split",
    "xlabel": "ring size", "ylog": true,
    "x": [64, 128, 256, 512],                    // also the slider/Play steps
    "steps": [64, 128, 256, 512],                // optional: slider labels (defaults to x)
    "series": [ { "arm": "StasDEQ", "y": [0.01, 0.012, 0.013, 0.015] } ]  // one per arm, same order as arms
  },
  "table": {
    "columns": ["arm", "params", "rel. L2 64", "rel. L2 256", "wall ms"],
    "rows": [ ["StasDEQ", "1.6k", "0.012 ± 0.002", "0.013 ± 0.003", "4.1"] ],
    "win": [[0, 2]]                              // [row, col] cells to highlight (best)
  }
}
```

Notes:
- Numbers in `table.rows` are pre-formatted strings (mean ± spread over seeds, as in part 1).
- `figure.series[i].y` is per-x mean; `null` allowed for missing points.
- For "2d", an optional `"field": {"n": 32, "frames": [[...n*n floats...], ...], "exact": [...]}` lets the
  figure show the 2-D field pass by pass; without it, a curve is shown.
- For "parity", y is accuracy in [0,1]; the page draws chance = 0.5.
- For "fno", include the classical solver's wall time and error (expected ~machine precision) in the table.
