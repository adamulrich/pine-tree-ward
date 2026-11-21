# Codex handoff — Pine Tree Ward Elders Quorum

Last updated: 2026-11-20

## Project

- Local folder: `D:\repo\pine-tree-ward`
- GitHub repository: `https://github.com/adamulrich/pine-tree-ward`
- Branch: `main`
- Production site: `https://pinetreeward.org`
- Stack: Vite + vanilla HTML/CSS/JavaScript; no runtime Node server.
- The RS project is separate in `D:\repo\pine-tree-ward-rs`.

## Current site features

- Mobile-first, high-contrast Pine Tree Ward Elders Quorum one-page site.
- Published Google Sheets CSV feeds for announcements, service opportunities, lesson schedule, recurring schedule, and banner.
- EQ lesson schedule displays the instructor before the lesson text when the `Instructor` column is populated.
- Come, Follow Me selects the current Monday-through-Sunday lesson from the checked-in official 2026 Old Testament data.
- Bulletin archive is implemented but currently hidden on the website. Newsletter archive remains visible and shows the two newest newsletters initially with an expander for older ones.
- PWA manifest, PNG icons, service worker, and install guidance are in `static/`.
- Temple and Family History and Missionary Efforts sections are currently placeholders.

## Main files

- `index.html` — page structure, navigation, section markup.
- `src/main.js` — feed URLs, rendering, expandable lists, PWA install behavior.
- `src/data.js` — standard sheet row normalization and optional instructor formatting.
- `src/schedule.js` — recurring schedule parsing/occurrence logic.
- `src/come-follow-me.js` — generated Come, Follow Me data and date selection.
- `styles/styles.css` — EQ green/gold theme and responsive styles.
- `static/manifest.webmanifest`, `static/sw.js`, `static/icons/` — PWA assets.
- `scripts/update-come-follow-me.js` — refreshes generated Come, Follow Me data.
- `.github/workflows/deploy-pages.yml` — GitHub Pages deployment.
- `BulletinArchiver.gs` — Gmail-to-GitHub archive script, including EQ newsletter handling.

## Published sheet configuration

The current EQ spreadsheet publication ID is:

`2PACX-1vRBCs8631vmwVW7lFBpljj9qe6jX1ixsyBTQMGzymRQJzipcmEIJB1-fEtiFjFZkc_c4RsK88vPLclH`

Configured gids in `src/main.js`:

- `0` — announcements
- `1654438872` — service opportunities
- `1834157588` — lesson schedule, including optional `Instructor`
- `97794274` — recurring schedule
- `1494821455` — banner

The site reads published CSVs at runtime; spreadsheet edits do not require a build or push. The published sheet must remain publicly readable.

## Spreadsheet columns

Announcements, service opportunities, and lessons use:

- `Display Date` — date shown on the site.
- `Expires On` — last date visible; the item disappears the following day.
- `Text` — displayed item text.
- `Link` — optional full URL.
- `Instructor` — optional lesson instructor; prepended to lesson text in the lesson schedule.

Recurring schedule uses `Title`, `Description`, `Frequency`, `Week of Month`, `Day of Week`, `Time`, `Starts On`, `Expires On`, and optional `Link`. Monthly events support weeks 1–5; weekly events support comma-separated weekdays.

## Local development and verification

```bash
npm install
npm run dev
npm test
npm run build
```

Do not open `index.html` directly; use Vite so modules and remote data requests work correctly.

## Come, Follow Me updater

```bash
npm run update:come-follow-me
```

To switch manuals, pass a year and manual slug, for example:

```bash
npm run update:come-follow-me -- --year 2027 --manual come-follow-me-for-home-and-church-new-testament-2027
```

## Deployment

Pushes to `main` trigger `.github/workflows/deploy-pages.yml`. GitHub Pages is configured for Actions and publishes to `https://pinetreeward.org`; `static/CNAME` contains `pinetreeward.org`.

Namecheap DNS uses the GitHub Pages apex records:

```text
A      @    185.199.108.153
A      @    185.199.109.153
A      @    185.199.110.153
A      @    185.199.111.153
CNAME  www  adamulrich.github.io
```

## Important conventions

- Use `apply_patch` for source edits.
- Preserve the existing feed URLs and column names unless explicitly asked to change them.
- Run `npm test` before pushing changes.
- Avoid changing the separate RS repository unless the user explicitly asks for an RS change.
