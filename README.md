# Pine Tree Ward Elders Quorum website

A mobile-first one-page website driven by three published Google Sheets CSV feeds.

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

The deployment workflow sets the GitHub Pages base path to `/pine-tree-ward/`. Change `VITE_BASE_PATH` in the workflow if the repository has a different name or the site uses a custom domain. Local builds use relative asset paths so the `dist` folder also works with an ordinary static server.
