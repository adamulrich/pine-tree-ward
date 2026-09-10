# Pine Tree Ward Elders Quorum website

A mobile-first one-page website driven by three published Google Sheets CSV feeds, with a ward bulletin archive generated from `bulletins/manifest.json`.

The Temple and Family History and Missionary Efforts sections are placeholders for future ward goals and plans.

## Recurring schedule

Recurring events come from the published `Recurring Schedule` Google Sheets tab. The feed URL is configured in `src/main.js`, and changes appear without rebuilding the website.

Keep these column names unchanged:

| Column | Use |
| --- | --- |
| Title | Short event name. |
| Description | Optional additional information. |
| Frequency | `Monthly` or `Weekly`. |
| Week of Month | For monthly events, a number from 1 through 5. Leave blank for weekly events. |
| Day of Week | Full weekday name. Weekly events can contain comma-separated days. |
| Time | Event time, such as `10:30 AM`. |
| Starts On | Optional first active date. |
| Expires On | Optional last active date. |
| Link | Optional full web address. |

The site displays each event's next occurrence in the visitor's local time. It removes an event when no occurrence remains on or before its `Expires On` date.

## Come, Follow Me

The Come, Follow Me section selects the current Monday-through-Sunday lesson from the official 2026 Old Testament schedule using the visitor's current date. Lesson and scripture links are stored locally because the Church study site does not allow the browser to read its pages across origins.

Refresh the checked-in lesson titles and scripture links from the currently configured official manual with:

```bash
npm run update:come-follow-me
```

To switch to a newly published manual, provide its year and either its URL slug or full URL:

```bash
npm run update:come-follow-me -- --year 2027 --manual come-follow-me-for-home-and-church-new-testament-2027
```

The updater discovers the weekly pages from the manual contents, downloads at most six pages concurrently, retries temporary server errors, validates the result, and replaces only the marked generated data block in `src/come-follow-me.js`.

## Bulletin archive

The archive groups the Digital and Printout PDFs in `bulletins/manifest.json` by date and displays the newest bulletin first. The production build copies the `bulletins` directory into `dist`, so each automated commit to `main` publishes both the updated manifest and PDFs through the existing GitHub Pages workflow.

## Update site content

The published Google spreadsheet contains three sheets:

- `Announcements`
- `Service Opportunities`
- `Lesson Schedule`

Keep these column names unchanged:

| Column | Use |
| --- | --- |
| Display Date | Date shown on the website. |
| Expires On | Last date the item remains visible. It disappears the following day. |
| Text | The item text shown to visitors. |
| Link | Optional full web address. Leave blank when no link is needed. |

The website only reads the published CSV feeds and never writes back to Google Sheets. No workbook or CSV snapshot is included in the production build.

The elders quorum lesson schedule initially shows the next four current entries. The bulletin archive initially shows the four newest bulletin dates. Visitors can expand or collapse either list with its Show all button.

## Google Sheets data

The three published CSV URLs are configured in `src/main.js`. They correspond to `Announcements`, `Service Opportunities`, and `Lesson Schedule`.

Each published sheet must keep these column names unchanged. Google Sheets updates are loaded directly by visitors, so content changes do not require a new website deployment. Google may take a few minutes to update a published CSV feed.

## Run locally

```bash
npm install
npm run dev
```

Open the local address shown by Vite. Opening `index.html` directly is not supported because the site uses JavaScript modules and remote data requests.

## Verify and build

```bash
npm test
```

The production site is created in `dist`.

## Deploy with GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds and publishes the site whenever `main` is updated. In the GitHub repository, open **Settings → Pages** and select **GitHub Actions** as the source.

The deployment workflow publishes the site at `https://pine-tree-ward.ulrichlabs.dev` and sets the Vite base path to `/` for that custom domain. Local builds use relative asset paths so the `dist` folder also works with an ordinary static server.
