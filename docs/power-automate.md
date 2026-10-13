# Sending email through Power Automate

The app can send all of its email (registration confirmations, admin notifications and crawl reminders) through Microsoft Power Automate, so messages come from a Microsoft 365 mailbox instead of SendGrid.

The setup has two flows:

| Flow | Trigger | What it does |
|---|---|---|
| **1. D79 Crawls – Email relay** | The app calls it | Sends one email (to, subject, HTML body) from an Outlook mailbox |
| **2. D79 Crawls – Reminder scheduler** | Daily schedule | Asks the app to send reminders for sessions happening in 2 days |

The app decides who gets which email. Flow 1 only delivers, and Flow 2 only keeps time. Email wording stays in the code ([src/lib/email.ts](../src/lib/email.ts)).

## Before you start

- **License:** the *When an HTTP request is received* trigger (Flow 1) and the *HTTP* action (Flow 2) are **Premium** connectors. The person who owns the flows needs a Power Automate Premium license.
- **Sending mailbox:** decide which mailbox the email comes from. Use either your own mailbox, or a shared mailbox such as a D79 events address that the flow owner has **Send As** permission on.
- **Sending limit:** Exchange Online allows about **30 messages per minute** per mailbox. The app already paces itself (one email about every 2 seconds) and sends reminders in batches of 25. Don't change Flow 1's concurrency settings to make it faster.

## Flow 1: Email relay

1. In Power Automate, choose **Create → Instant cloud flow**, skip the wizard, and name it **D79 Crawls – Email relay**.
2. Add the trigger **Request → When an HTTP request is received**.
   - **Who can trigger the flow:** *Anyone*. The app is not a Microsoft 365 user. The secret signature (`sig=`) in the URL protects the flow, so treat the URL like a password.
   - **Method:** POST.
   - **Request Body JSON Schema:**

     ```json
     {
       "type": "object",
       "properties": {
         "to": { "type": "string" },
         "subject": { "type": "string" },
         "html": { "type": "string" }
       },
       "required": ["to", "subject", "html"]
     }
     ```
3. Add **Office 365 Outlook → Send an email (V2)**. To send from a shared mailbox, use **Send an email from a shared mailbox (V2)** instead and enter the shared mailbox address.
   - **To:** dynamic content `to`
   - **Subject:** dynamic content `subject`
   - **Body:** dynamic content `html`. The app sends ready-made HTML, so add nothing else to the body.
4. Add **Request → Response** after the send step.
   - **Status Code:** `200`
   - **Body:** `{ "ok": true }`

   With this step, the app learns whether the email was actually sent. If the send step fails, the app records an error, and for reminders it retries that person on the next scheduled run.
5. **Save**. Copy the **HTTP URL** that now appears in the trigger. You'll need it for `POWER_AUTOMATE_EMAIL_URL`.

**Test it.** Run this in a terminal (macOS/Linux), replacing the URL and address:

```bash
curl -X POST "<HTTP URL from step 5>" \
  -H "Content-Type: application/json" \
  -d '{"to":"you@schools.nyc.gov","subject":"Flow test","html":"<p>Hello from the <b>D79 Crawls</b> flow</p>"}'
```

You should get `{"ok":true}` and the email in your inbox.

## Flow 2: Reminder scheduler

Each run asks the app to email every attendee of the sessions happening **2 days from today** (New York time) who hasn't been reminded yet. For a session on **Friday, November 6**, reminders go out on **Wednesday, November 4**. On other days the app finds nothing to send and the run does nothing.

1. Choose **Create → Scheduled cloud flow** and name it **D79 Crawls – Reminder scheduler**.
2. Set the **Recurrence** trigger:
   - **Interval:** 1, **Frequency:** Day
   - **Time zone:** (UTC-05:00) Eastern Time (US & Canada)
   - **At these hours:** 8, 9, 10, 11, 12
   - **At these minutes:** 0

   Each run sends at most 25 reminders. Five runs that morning cover up to 125 attendees, which is more than all locations combined. A run that has nothing left to send does nothing.
3. Add **HTTP → HTTP**:
   - **Method:** POST
   - **URI:** `https://<your production domain>/api/integrations/reminders`
   - **Headers:**
     - `Authorization`: `Bearer <REMINDERS_API_KEY>`
     - `Content-Type`: `application/json`
   - **Body:** `{ "daysAhead": 2 }`
4. Optional: get an email if any reminder fails.
   - Add **Condition**: `body('HTTP')?['failures']` *is greater than* `0`.
   - Under **True**, add **Send an email (V2)** to yourself with subject `D79 reminder failures` and body `body('HTTP')?['message']`.
5. **Save.**

**Test it without sending anything.** Temporarily change the HTTP body to `{ "daysAhead": 2, "dryRun": true }` and click **Test → Manually**. The response lists the sessions that would get reminders that day and how many emails would go out (`wouldSend`). Change the body back afterwards.

The response from a real run looks like:

```json
{
  "success": true,
  "today": "2026-11-04",
  "targetDate": "2026-11-06",
  "message": "Sent 25 reminder(s) for 2 session(s) on 2026-11-06, 70 still to send",
  "emailsSent": 25,
  "failures": 0,
  "remaining": 70
}
```

### Endpoint options

`POST /api/integrations/reminders` accepts these body fields, all optional:

| Field | Default | Meaning |
|---|---|---|
| `daysAhead` | `2` | Remind attendees of active sessions this many days from today (0–14) |
| `limit` | `25` | Most emails to send in this call (1–200) |
| `dryRun` | `false` | Only report what would be sent |

Each attendee is reminded **once**. The app records `reminderSentAt` on the registration, and later runs skip that person. This also covers the dashboard: if an admin presses **Send reminders** on the Reminders tab first, the scheduler won't email those people again. The Reminders tab shows how many attendees have already been reminded.

## Turning it on in Vercel

Add these environment variables to the Vercel project (Production), then redeploy:

| Variable | Value |
|---|---|
| `EMAIL_SERVICE` | `power-automate` |
| `POWER_AUTOMATE_EMAIL_URL` | The HTTP URL from Flow 1, step 5 |
| `REMINDERS_API_KEY` | A long random secret. Generate one with `openssl rand -hex 32` and put the same value in Flow 2's `Authorization` header |
| `ADMIN_EMAIL` | Optional. Gets a "New registration" email for every sign-up |

Once everything works, the `SENDGRID_API_KEY` and SMTP variables are no longer needed. To switch back to SendGrid, set `EMAIL_SERVICE` to `sendgrid` and redeploy.

Notes:

- `ADMIN_EMAIL` doubles the number of emails per registration. If many people register right after an announcement, leaving it unset keeps you further from the 30-per-minute limit.
- Point Flow 2 at the **production** domain. Vercel preview deployments are usually behind Vercel login, which Power Automate can't get past.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Registrations work but no confirmation email arrives | `EMAIL_SERVICE` or `POWER_AUTOMATE_EMAIL_URL` isn't set in Vercel, or Flow 1 is turned off. Check Flow 1's run history. |
| App logs show `Power Automate flow returned 401/403` | The flow URL was regenerated or the trigger isn't set to *Anyone*. Copy the URL again into Vercel. |
| Flow 2 run fails with 401 | The `Authorization` header doesn't match `REMINDERS_API_KEY`. It must be `Bearer ` followed by the key. |
| Flow 2 says `Scheduled reminders are not configured` | `REMINDERS_API_KEY` isn't set in Vercel. |
| Some reminders failed | They'll be retried on the next scheduled run that day. Check Flow 1's run history for the Outlook error. |
