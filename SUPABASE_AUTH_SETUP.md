# VETRONIX — Supabase Auth Connected

This package keeps the existing VETRONIX frontend design, CSS, HTML structure, and FastAPI model endpoints intact while connecting authentication and Supabase data access securely.

## What was changed

- Added the Supabase JS Auth client to `frontend/index.html`.
- Replaced the old browser-only `localStorage` password login with Supabase Email Authentication.
- Added Supabase signup/login/logout/session restoration.
- Added Supabase email OTP password reset using the existing OTP UI.
- Connected the authenticated Supabase Auth user to `farmers.auth_user_id`.
- Updated FastAPI Supabase endpoints to require a Supabase Bearer access token.
- Updated FastAPI Supabase REST calls to forward the user's access token so Supabase RLS applies to the authenticated user.
- Replaced the previous open `anon` RLS policies with authenticated farmer-scoped RLS.
- Kept the existing frontend -> FastAPI backend connection at `http://127.0.0.1:8000`.
- Kept the existing website visual design, CSS, colors, layout and HTML UI unchanged.

## Supabase configuration

URL:
`https://uyqratuxyjfnxeerhlbg.supabase.co`

The supplied `sb_publishable_...` key is used as the browser publishable key and as the backend `SUPABASE_KEY` default.

## Required Supabase step

In Supabase Dashboard:

1. Authentication -> Providers -> Email: enable Email.
2. Run `supabase_setup.sql` in the Supabase SQL Editor.
3. For signup without immediate verification, you may disable email confirmation. If email confirmation is enabled, users must click the verification email before their first login.
4. If using the existing OTP password-reset UI, make sure your Supabase email OTP template sends the 6-digit token.

## Run locally

### Backend

From the `backend` folder:

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

Open `frontend/index.html` from a local web server rather than `file://`.

For example:

```bash
python -m http.server 5500
```

Then open:

`http://127.0.0.1:5500/frontend/`

The frontend continues to call the existing FastAPI server at:

`http://127.0.0.1:8000`

If the backend is deployed later, change only `API_URL` in `frontend/app.js`.

## Authentication/data flow

Browser
-> Supabase Auth
-> Supabase access token
-> existing FastAPI backend
-> Supabase REST API with the user's token
-> authenticated RLS
-> farmer-owned cattle/sensor/prediction records

Each authenticated user is linked to exactly one `farmers.auth_user_id`, and cattle/prediction records are accessible only through that farmer relationship.

## Important note about phone login

The supplied Supabase setup uses Email Authentication. The existing VETRONIX form still displays its original "Mobile Number or Email Address" label, but the active authentication path uses email because the Supabase Phone provider/SMS configuration was not enabled. No fake phone-to-email accounts are created.

## Validation performed

- Python backend syntax check: passed.
- JavaScript syntax check: passed.
- Website CSS and visual files were not modified.
