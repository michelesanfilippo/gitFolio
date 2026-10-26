# Accounts and saved templates (Supabase)

gitFolio works without any account. Logging in is optional and only adds: saving up to **5 templates**, a
**Dashboard**, a **default photo** for new CVs, **sharing a template's design** with friends and **Import from LinkedIn**
(name, email, photo). Everything else stays in the browser.

Accounts are stored by [Supabase](https://supabase.com) (open source, free tier). The site is static (GitHub Pages),
so the browser talks to Supabase directly; security comes from Postgres **row level security** (see `docs/supabase/schema.sql`),
not from hiding the `anon` key (it is public by design).

If the two environment variables below are missing, the site still builds and runs: the Login button just says that
accounts are not enabled.

## 1. Create the project

1. <https://supabase.com> > **New project** (free plan). Pick the region closest to your users. Save the database password.
2. **Project Settings > API**: copy the **Project URL** and the **anon public** key.

## 2. Create the tables

**SQL Editor > New query**, paste the whole content of [`docs/supabase/schema.sql`](./supabase/schema.sql), **Run**.
It creates `profiles` and `templates`, row level security policies (each user only sees their own rows), a
database-enforced limit of 5 templates per user, a trigger that creates the profile on sign-up and the `shared_design`
function used by share links. The script is safe to run again: after updating gitFolio, re-run it to add new columns.

## 3. Redirect URLs

**Authentication > URL Configuration**

- **Site URL**: `https://michelesanfilippo.github.io/gitFolio/`
- **Redirect URLs** (add both):
  - `https://michelesanfilippo.github.io/gitFolio/**`
  - `http://localhost:3000/**` (local development)

## 4. Login providers

**Authentication > Providers**

- **Email**: enabled by default. Keep "Confirm email" on (recommended).
- **GitHub**
  1. GitHub > Settings > Developer settings > OAuth Apps > **New OAuth App**.
  2. Homepage URL: `https://michelesanfilippo.github.io/gitFolio/`
  3. Authorization callback URL: the one shown in Supabase (`https://<ref>.supabase.co/auth/v1/callback`).
  4. Copy Client ID + a new Client secret into Supabase > Providers > GitHub > Enable.
- **Google**
  1. <https://console.cloud.google.com> > APIs & Services > Credentials > **Create OAuth client ID** (Web application).
  2. Authorized redirect URI: the same Supabase callback URL (`https://<ref>.supabase.co/auth/v1/callback`).
  3. Copy Client ID + Client secret into Supabase > Providers > Google > Enable.
- **LinkedIn (OIDC)** (also used by **Import from LinkedIn** in the editor)
  1. <https://www.linkedin.com/developers/apps> > **Create app** (it must be linked to a LinkedIn Page; verify it in the app Settings).
  2. **Products**: request **Sign In with LinkedIn using OpenID Connect**. The scopes `openid`, `profile`, `email` then appear under **Auth**.
  3. **Auth > Authorized redirect URLs**: the Supabase callback URL (`https://<ref>.supabase.co/auth/v1/callback`).
  4. Copy Client ID + Primary Client Secret into Supabase > Providers > **LinkedIn (OIDC)** > Enable.
  5. Optional: **Authentication > Sign In / Providers > Allow manual linking**, so a user already logged in with Google or
     GitHub can connect LinkedIn to the same account (Import from LinkedIn does this).

LinkedIn only gives third-party apps the name, email and profile photo: experience and the rest of the profile cannot be imported.

## 5. Give the site its keys

**GitHub repo > Settings > Secrets and variables > Actions > Variables > New repository variable** (variables, not secrets):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |

Then re-run **Actions > Deploy to GitHub Pages** (or push to `main`).

Local development: copy `.env.example` to `.env.local` and fill the same two values.

## What is stored

| Where | What | Who can read it |
|---|---|---|
| `auth.users` (Supabase) | email, provider, password hash | nobody but the user (and you as project owner) |
| `profiles` | username, optional default photo | the user |
| `templates` | name, design settings, CV content, photo, small preview image | the user |
| `templates` via `shared_design()` | **only** template name + design settings, for templates the user chose to share | anyone with the share link |

Sharing: **Dashboard > Share** creates a secret link (`/editor/?share=<id>`). Whoever opens it gets the design applied to
their own CV; content, photo, contacts and preview image are never exposed. **Stop sharing** disables the link at once.

Users can delete a template from the Dashboard at any time. Deleting an auth user removes their rows (`on delete cascade`).
Anonymous use (no login) stores nothing on any server.

## Limits worth knowing

- Free plan projects pause after a week of inactivity; the first request afterwards is slow. Unpausing is one click.
- Password reset by email is not built in the UI yet (Supabase supports it; planned).
- The 5-template limit is enforced by a database trigger, so it cannot be bypassed from the browser.
