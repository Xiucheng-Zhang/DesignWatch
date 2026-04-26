# Sample task: "Check my ranking in the user group"

Four anonymized user screen recordings + designer-expected workflow + familiarity labels for each user, lifted from the original UIST 2024 dataset (Task 6a, trimmed from 20 users to 4 to keep the repo small).

## Files

| File | Purpose |
|---|---|
| `scenario.txt` | One-line description of the task the user was given |
| `videos/*.mp4` | Raw screen recordings (one per user) |
| `ground_truth/*.jpg` | The designer's expected page-flow, one screenshot per page |
| `familiar.csv` | One row per video, `1` = familiar with the app, `0` = not |

The order of `familiar.csv` rows must match the alphabetical order of `videos/*.mp4`.
