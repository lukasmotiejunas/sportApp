# SportApp

## Conventions

### Date formatting

- Always render user-facing dates in `YYYY/MM/DD` format (e.g. `2026/08/28`).
- Use `formatDateSlash` from `src/utils/dates.ts`. Do not introduce the older `Pn, 4 Rug` style (Lithuanian day-of-week + short month) anywhere in the UI.
- `relativeDay` may still return `Šiandien` / `Rytoj` / `Vakar` / weekday names for near-future dates; its fallback for further-out dates uses `formatDateSlash`.
- `formatDateLong` (e.g. `Pirmadienis, 4 Rugpjūčio 2026`) is still allowed for prominent single-date headers (training detail eyebrows, profile summary). It is not a substitute for `formatDateSlash` in lists, tables, or inline metadata.
