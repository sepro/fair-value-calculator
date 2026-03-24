# Fair Value Calculator

An interactive 5-year fair value stock calculator that projects EPS growth to estimate intrinsic value and find your ideal entry price.

![Screenshot](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-6-purple) ![License](https://img.shields.io/badge/License-MIT-green)

## Features

- Project future stock price based on EPS growth assumptions
- Calculate annualised return from current price
- Find the entry price needed to hit your desired return
- Visual chart of projected fair price over 5 years
- Year-by-year EPS and price breakdown table
- Download the chart as SVG
- Verdict badge (Strong Buy / Fair Value / Slightly Overvalued / Overvalued)

## Quick Start

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build
```

## Deploy to GitHub Pages

### Option A: Automatic (GitHub Actions)

1. Create a new repo on GitHub (e.g. `fair-value-calculator`)
2. Push this project to it:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/fair-value-calculator.git
   git push -u origin main
   ```

3. Go to **Settings → Pages** in your repo
4. Under **Build and deployment**, set **Source** to **GitHub Actions**
5. The included workflow (`.github/workflows/deploy.yml`) will build and deploy automatically on every push to `main`
6. Your site will be live at `https://<your-username>.github.io/fair-value-calculator/`

### Option B: Manual (`gh-pages` branch)

```bash
npm run build
npm run deploy
```

Then set **Source** to **Deploy from a branch** → `gh-pages` / `/ (root)`.

## Configuration

If your repository name is different from `fair-value-calculator`, update the `repoBasePath` variable in `vite.config.js`:

```js
const repoBasePath = "/<your-repo-name>/";
```

The config automatically uses this path when building for production and `/` when running locally, so no other changes are needed.

## License

MIT
