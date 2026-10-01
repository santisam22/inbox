# Inbox: Supabase user log

Inbox records every install in a Supabase table. You see the list in the dashboard; the app itself can only add or remove its own entry.

## One-time setup

1. **Create the project.**
   supabase.com → **New project** → name it `inbox`. Pick any region and save the database password somewhere private (Inbox doesn't need it).

2. **Create the user log.**
   **SQL Editor** (left sidebar) → **New query** → paste everything from `setup.sql` (in this folder) → **Run**.
   It should say "Success. No rows returned".

3. **Give Inbox the project's address and public key.**
   **Project Settings → API Keys** → copy the **Publishable key** (`sb_publishable_…`).
   **Project Settings → Data API** → copy the **Project URL** (`https://xxxx.supabase.co`).
   These go into `app_config.json` at the top of this project:
   ```json
   { "supabase_url": "https://xxxx.supabase.co", "supabase_key": "sb_publishable_…" }
   ```
   Then rebuild with `./build.sh`.

## Seeing your users

**Table Editor → inbox_users**. Each row is one Mac:

| Column | Meaning |
|---|---|
| `email` | The iCloud address they signed in with |
| `app_version` | The Inbox version they're running, useful to see who has updated |
| `macos_version` | Their macOS version |
| `first_seen` / `last_seen` | When they first connected and when Inbox last checked in (once a day while it's open) |

When someone signs out of Inbox, their row is deleted.

## Keys

- The app contains only the **publishable** key. It's safe to ship, because the database refuses to let it read, list or change anything except through the two functions in `setup.sql`.
- Never put the **secret** key (`sb_secret_…`) or the database password in the app or this repository.
