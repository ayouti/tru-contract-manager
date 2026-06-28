# n8n Workflow Registry

Maps every webhook URL referenced in Appsmith queries to its exported workflow JSON file in `.claude/n8n-workflows/`.

Claude reads this file to locate the right workflow definition, then reads the JSON file itself to understand the full logic.

---

## How to maintain this file

When you add or change an n8n workflow:

1. Export the workflow JSON from n8n editor (Workflow menu → Export → Download)
2. Save the JSON to `.claude/n8n-workflows/[workflow-name].json.md`
3. Add or update the row in the registry table below
4. Commit both files together

When you remove an n8n workflow:

1. Delete the `.json.md` file from `.claude/n8n-workflows/`
2. Remove the row from the registry
3. Note which Appsmith queries still reference the old URL and flag them for update

---

## Webhook registry

|Webhook URL|Workflow file|Called from|What it does|
|---|---|---|---|
|`https://trufinance.app.n8n.cloud/webhook/e0a33232-ac5e-44a5-a7b6-7d1e0caa3cc7`|`Receive Contracts.json.md`|Receive / `get_pending_contracts`|Pulls Metabase question 11703 (all outstanding contracts) and Postgres `received_contracts` rows already in a drawer, merges keeping only Metabase rows not already drawered — powers the Receive page search index|
|`https://trufinance.app.n8n.cloud/webhook/68238952-7aa4-4be3-97d8-b15ef0340117`|`Get Pending Contracts.json.md`|Pending Contracts / `get_all_pending_contracts`|Pulls Metabase question 11703, strips `national_id`, enriches every row with shipment/drawer/received-by info from Postgres — powers the Pending Contracts read-only table|
|`https://trufinance.app.n8n.cloud/webhook/5cffcefd-0c4b-47bb-9957-25277b1f5bc6`|`First Review Actions.json.md`|First Review / `fetch_discrepancies` AND Archive / `fetch_discrepancies`|Switches on `body.action == "get_discrepancies"`, reads the Discrepancies Google Sheet, strips `row_number` — shared workflow backing discrepancy catalog on both First Review and Archive pages|
|`https://trufinance.app.n8n.cloud/webhook/acdb5e98-fb04-462b-aa76-21c9aaec7537`|`Archive Contracts.json.md`|Archive / `get_shipment_details`|Switches on `body.action`; for `get_shipment` it looks up all contracts for the given shipment/drawer in Postgres, enriches them with PN Revision IDs pulled from a Metabase query, and merges/returns the combined list — powers the Archive page's shipment detail table|

---

## Undocumented webhooks

None currently outstanding.

---

## Workflow file naming note

Workflow files in `.claude/n8n-workflows/` use the `.json.md` extension so they open natively in Obsidian without plugins. The filename matches the n8n workflow name.

Note: the workflow filenames don't map intuitively to pages:

- "Receive Contracts" backs the Receive page's pending-contracts search
- "Get Pending Contracts" backs the Pending Contracts page Consider renaming in n8n if these workflows are ever rebuilt.

---

## n8n API refresh (future automation)

When ready to automate workflow exports, n8n exposes a REST API:

```bash
# List all workflows
curl -H "X-N8N-API-KEY: $N8N_API_KEY" \
  https://trufinance.app.n8n.cloud/api/v1/workflows

# Export a single workflow by ID
curl -H "X-N8N-API-KEY: $N8N_API_KEY" \
  https://trufinance.app.n8n.cloud/api/v1/workflows/[id] \
  > .claude/n8n-workflows/[name].json.md
```

Add `N8N_API_KEY` to your `.env` file when ready. Claude can run these at session start to refresh all workflow definitions automatically before reading them.