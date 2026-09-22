# White Glove Monitor — Prototype V1.1

This version upgrades the first WGM prototype from a Maria-only demonstration to a **multi-employee / multi-employer test environment** designed around your real Scrin setup: one Scrin account containing several VAs who work for different employers.

## What V1.1 adds

- Sync employees from one Scrin API v2 connection.
- Normalize Scrin `employmentId` records into WGM employees.
- Keep **WGM employer mapping separate from the Scrin account/company**.
- Select any synced VA for monitoring or report generation.
- Store an employee baseline: employer, expected hours, schedule, timezone, monthly context.
- Select any reporting period.
- Live period-data endpoint that calls:
  - `POST /api/v2/GetCommonData`
  - `POST /api/v2/GetActivities`
  - `POST /api/v2/GetScreenshots`
- WGM calculation layer for tracked hours, active days, coverage and project allocation.
- Screenshot metadata aggregation for activity level and applications/URLs.
- Human-review workflow and `Approved → Released` delivery event.
- GHL and payment remain intentionally unconnected.

## Important prototype behavior

In **DEMO_MODE=true**, the UI seeds three employees:

1. Maria Gadin — known August benchmark.
2. VA 2 — placeholder until live Scrin sync reveals the actual record.
3. VA 3 — placeholder until live Scrin sync reveals the actual record.

When live Scrin is connected, click **Sync employees from Scrin**. WGM replaces the placeholder set with the employment records authorized by the token. Because the employees may all live under one Scrin company/account but serve different White Glove clients, use **Settings → Scrin → WGM employer mapping** to assign each employee to the correct employer.

## Connect the real Scrin account

1. Rotate/regenerate the token that appeared in an earlier screenshot.
2. From the project folder:

```bash
npm install
npx wrangler secret put SCRIN_TOKEN
```

3. Change `DEMO_MODE` in `wrangler.toml` to `"false"`.
4. Run:

```bash
npm run dev
```

5. Open **Settings → Sync employees from Scrin**.
6. Confirm the three real employment records appear.
7. Map each one to the correct WGM employer and expected monthly hours.

The Scrin token is read only by the Worker and sent as the `X-SSM-Token` header. It is never exposed to frontend JavaScript.

## First live acceptance test

Use Maria first because there is a known August result to reconcile against:

- Reporting period: August 1–31, 2026
- Expected hours: 160
- Known approved report benchmark: 161h 25m tracked, 100% capped schedule coverage, 20 active workdays.

The prototype should retrieve Maria's activities by her `employmentId`, calculate the period, retrieve screenshot metadata, aggregate projects/apps, generate a draft, and place it into Human Review.

Only after Maria reconciles should you test VA 2 and VA 3, then enable live batch generation.

## OpenAI

Set these as server-side configuration when ready:

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put OPENAI_MODEL
```

`OPENAI_MODEL` should be a currently supported Responses API model that supports Structured Outputs. The prototype intentionally does not hard-code a model name.

## GHL / CRM

GHL is not needed for this prototype. The integration contract is simply modeled:

`Human Review → Approved → Released → delivery event queued`

Later the GHL consultant can consume that event to send the employer email/SMS, log the communication, and run follow-up automations.

## Production notes

- Browser localStorage is used only to preserve prototype employer mappings/context. Production should move this to the WGM database.
- Screenshot URLs should not be permanently copied until Scrin's retention/data-processing terms are agreed.
- The first version retrieves screenshot metadata for report evidence. Selective image-level AI review can be added later for exceptions.

