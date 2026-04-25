# Documentation

This directory contains project documentation, including daily development logs.

## Daily Logs (`dailies/`)

The `dailies/` folder contains a chronological record of development work. Each file follows the naming convention:

```
daily_summary_YYYYMMDD_HHMM.md
```

### Required Sections

Every daily log must include the following sections:

- **Date** — The calendar date of the work session.
- **Branch** — Git branch(es) used during the session.
- **PRs Pushed** — Links or descriptions of pull requests merged or opened.
- **Issues Ran Into** — Problems, blockers, or unexpected behavior encountered.
- **Solutions** — How each issue was resolved (or mitigation applied).
- **Lessons Learned** — Insights, gotchas, or patterns discovered.
- **Features Built & Delivered** — What was shipped, fixed, or improved.

### Creating a New Entry

When wrapping up a work session, create a new file from the template below:

```bash
cp docs/dailies/TEMPLATE.md docs/dailies/daily_summary_$(date +%Y%m%d)_$(date +%H%M).md
```

Then fill in each section with specific, actionable detail.
