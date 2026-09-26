# VETRONIX phone OTP development mode

This ZIP uses a **development-only local phone OTP fallback** because Supabase Phone Auth/SMS is not configured yet.

- Test OTP for every phone account: `123456`
- Each phone number creates a separate farmer account.
- Cattle data is isolated using that farmer's unique demo user ID in browser localStorage.
- Email accounts continue to use real Supabase Auth and Supabase-backed farmer records.
- No SMS is sent in this mode.

When a real SMS provider is available, set `PHONE_OTP_DEMO_MODE` to `false` and replace the fallback with Supabase Phone Auth.
