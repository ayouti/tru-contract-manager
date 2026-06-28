# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is
TRU Contract Manager is an Appsmith application for receiving, reviewing, and archiving loan contracts. Staff scan/search contracts into shipments (Receive page), perform a first-pass discrepancy review (First Review page), a second-pass review on archived shipments (Archive page), and view all pending contracts (Pending Contracts page). Data comes from a Postgres "Automation DB" and a Metabase instance; n8n workflows (hosted at trufinance.app.n8n.cloud) handle backend automation triggered via webhooks called from Appsmith queries.

This repo is a git-synced export of the Appsmith application (not a standalone codebase you build/run/test locally) — Appsmith pulls/pushes this repo's contents directly.

## Tech stack
- **Frontend:** Appsmith (self-hosted/cloud), JS Objects for client-side logic
- **Backend workflows:** n8n (trufinance.app.n8n.cloud), triggered via webhooks
- **Database:** PostgreSQL ("Automation DB" datasource, schema `production`)
- **Other datasources:** Metabase (analytics queries), Google Drive ("Automation GDrive")
- **Version control:** GitHub — Appsmith git sync enabled

## Sync model
```
Appsmith editor
    ↕ (push/pull via Appsmith git sync)
GitHub repo
    ↕ (pull/push via Claude Code git CLI)
Local clone
    ↑
Claude Code works here
```

Changes flow:
- Claude edits locally → git commit + push → manual pull in Appsmith
- Appsmith editor changes → push from Appsmith → git pull locally
  → Claude reads diff to understand what changed

There is no build/lint/test tooling in this repo — it is a JSON/JS export tree, not an installable app. "Testing" a change means reasoning through the JS Object logic and query bindings by reading the affected files, then verifying after a round-trip through Appsmith.

## Repository structure
Standard Appsmith git-sync export format:
- `application.json`, `metadata.json`, `theme.json` — app-level config
- `datasources/*.json` — datasource configs (no credentials; just `pluginId`/`name`/`gitSyncId`)
- `pages/<Page Name>/<Page Name>.json` — page layout/DSL
- `pages/<Page Name>/widgets/` — one JSON file per widget, nested by container/modal
- `pages/<Page Name>/queries/<Name>/` — each query is a folder with `metadata.json` plus a `.txt` body (SQL/REST config) for plain queries; JS Object actions show only `metadata.json` (the logic lives in the JS Object file, not here)
- `pages/<Page Name>/jsobjects/<ModuleName>/<ModuleName>.js` — JS Object source

### Pages
- **Receive** (default page) — main intake flow: search/add contracts to a shipment, manage a staged shipment, finalize/submit it. Core JS Objects: `App` (init/reset), `Contracts` (search index, filtering, staging, comments), `Shipments` (start/submit shipment), `Auth`.
- **First Review** — first-pass discrepancy review of submitted contracts, with category/subcategory issue tracking and a review-history modal. Core JS Object: `ReviewState` (large state machine: init, start/cancel editing, toggle issue, handle main action/release).
- **Archive** — second-pass review of archived shipments, similar discrepancy-tracking pattern. Core JS Objects: `SecondReview`, `Shipments`, `Auth`.
- **Pending Contracts** — read-only table of all pending contracts; uses `Auth` for permission-gated visibility.
- **RESTRICTED** — placeholder/access-denied page.

Several queries/JS Object actions across pages are legacy duplicates left over from refactors (e.g. plain queries like `get_pending_contracts`, `get_shipments`, `get_user_permissions` alongside newer JS Object–driven equivalents like `Contracts-*`, `Shipments-*`, `Auth-*`). When editing one of these areas, check whether the page still calls the legacy query or has fully migrated to the JS Object before assuming which one is live — look at what the widgets/other JS Objects actually invoke.

## Naming conventions
Read `.claude/conventions.md` for the complete naming ruleset (widget prefixes, query/JS Object casing, modal-open conventions). Apply these on every read, write, and review operation, and flag violations using the format defined in that file.

## n8n integration
Webhook URLs are hardcoded in query JSON/`.txt` files. Two resources for understanding n8n workflows:

1. `.claude/n8n-registry.md` — maps each webhook URL to the workflow JSON filename and a one-line description. All four webhooks currently in use across the app are documented.
2. `.claude/n8n-workflows/*.json.md` — exported workflow definitions (Markdown-wrapped JSON exports of node graphs). Read these to understand what a workflow does when a query calls its webhook.

If a webhook URL appears in a query but is not in the registry, flag it as undocumented before proceeding (see "Undocumented webhooks" section in the registry file for the reporting format).

`.claude/n8n-workflows/` is read-only reference material — never edit these files; they are exports from n8n and must only be refreshed by re-exporting from n8n directly.

To refresh workflow exports automatically, see the n8n API section at the bottom of n8n-registry.md.

## What Claude can do in this project
- Read and explain any page, widget, query, or JS Object
- Read n8n workflow JSON files to understand automation logic
- Identify naming convention violations and propose fixes
- Make changes to widget JSON, query definitions, and JS Objects
- Commit and push changes to GitHub via git CLI

## Commit message format
```
type: short description of what changed and why
```

Types: `feat` / `fix` / `refactor` / `rename` / `docs` / `sync`

Examples:
```
feat: add merchant filter to table_contracts
fix: rename btn_submit to btn_saveContract per conventions
refactor: extract validation logic into FormValidators JS object
sync: pull Appsmith changes — updated get_contracts query
docs: update n8n-registry with new invoice webhook
```

## Safety rules
- Never push directly to master without confirming with the user
  if the change is structural (new page, deleted widget,
  datasource change)
- Never change webhook URLs without checking n8n-registry.md first
- Never rename a widget referenced in a JS Object or another
  widget's binding without updating all references in the same commit
- Always verify widget name changes against conventions.md
  before committing
- Never overwrite n8n workflow JSON files — these are exports
  from n8n and are read-only reference material

## Session start protocol
Before any other action at the start of every session:
1. Run `git pull origin master`
2. Run `git diff HEAD~1 HEAD --stat` to show what changed
3. If changes exist, read the changed files and summarise
   in plain English: which pages changed, which widgets were
   added, modified, or removed, which queries changed, and
   flag any naming convention violations introduced

## Understanding Appsmith push changes
When Appsmith has pushed changes to GitHub and you have pulled,
run this analysis:

```
Read the diff from the previous commit. Summarise in plain
English: which pages changed, which widgets were added,
modified, or removed, which queries changed, and flag any
naming convention violations introduced.
```
