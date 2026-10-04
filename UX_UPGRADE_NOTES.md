# B-Quadrant OS — UX navigation upgrade

This is a focused navigation and dashboard experience upgrade to the **existing** B-Quadrant OS. It is not a replacement for your financial engines, AI features, or stored data.

## Changes included

1. An action-first **Overview** dashboard. It opens with an understandable financial snapshot and prominent shortcuts to record income, expenses, and transfers.
2. Relevant destination cards lead to the existing financial modules: income statements, assets/liabilities, goals, ownership, analytics, advisor, quadrant, notifications, learning, settings and data backup.
3. The **original detailed dashboard** is still available behind a clearly labelled expandable section. Open/closed preference is remembered on this device.
4. Pending submissions and unread notifications get a prominent alert on Overview. Pending submissions open the existing approval queue in the detailed dashboard.
5. Sidebar sections are grouped into Money, Plan & Understand, Guidance and Your Workspace, instead of one long unstructured list.
6. A keyboard-accessible **Go to a feature** search is available from the top bar (`Ctrl/Cmd + K`). Role-restricted destinations are omitted.
7. Mobile users have a persistent bottom navigation row for Overview, Income, Expense, Assets and More; the existing sidebar and controls remain.
8. A one-tap Overview breadcrumb makes it easier to return from deeper pages. Visible keyboard focus indicators were added and mobile pinch-to-zoom was restored.

## What was deliberately *not* changed

- All financial engines and formulas.
- User accounts, roles, profile and company structures.
- Local storage financial data key (`gapFinancialData`), import/export, sync protocol, or server/API behaviour.
- Existing pages, the AI assistant, the ownership graph, the tour system, settings, or financial reports.
- Your currently deployed site and GitHub default branch.

## Safe deployment

**Important:** This is source code. Do not upload the source ZIP to Vercel as if it were a prebuilt static site, or upload a ZIP into GitHub expecting it to unpack automatically.

1. Back up your existing B-Quadrant data from Settings and keep a safe copy of your original repository.
2. On a computer with Node.js installed, unzip the full project and run `npm ci` then `npm run build`.
3. Preview with `npm run preview` (or your established local server) and verify Income, Expense, Transfer, dashboard Details, Settings backup and your existing live data import workflow **using a disposable backup/test profile**.
4. Apply this version in a **separate Git branch** and deploy it to a Vercel **preview** deployment. Keep the existing production branch unchanged until you're satisfied.
5. Merge/redeploy only after verifying your own financial data and team permission workflow.

### If you prefer applying only the changed files

The separate `B-Quadrant-OS-UX-Changed-Files.zip` has the two new components plus the three existing files changed by this update. Copy them onto the same paths in your original repository. Preserve your own environment configuration.

### Note on environment and testing

The supplied repository uses Vite/React and Vercel serverless functionality. Existing AI functionality may require its already configured API environment variable. This upgrade does not add API keys or change those integrations. New/changed TSX files passed **TypeScript syntactic transpilation**, and a 12-check static navigation/compatibility test passed. After installing dependencies, repeat with `node ux-smoke.cjs`. A complete `npm run build` and authenticated/live app acceptance test are required before production: this workspace could not complete dependency installation, so production runtime validation has not been claimed.
