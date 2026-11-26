# Staff authentication

Cloudflare Access signs the staff identity assertion. The Worker verifies the RS256 signature with the Access team's public keys, cached in memory for five minutes. It checks the issuer, audience, expiration and not-before claims and uses the verified `sub` to look up `academy.staff.auth_subject`. The lookup reads `id`, `auth_subject`, `role` and `active`. Active staff with the `teacher`, `reviewer` or `admin` role can establish a session.

## Runtime configuration

- Protect `/staff` and `/api/staff`, including their nested paths, with the same Cloudflare Access application and staff policy. Staff open `/staff/login` in the browser, complete Access sign-in and select **Continue to workspace**.
- Set `CF_ACCESS_TEAM_DOMAIN` to the exact issuer origin, such as `https://your-team.cloudflareaccess.com`. Set `CF_ACCESS_AUD` to the Access application's audience tag. [Cloudflare Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- Set `DATABASE_URL` as a Worker runtime secret with a restricted Neon login that can read the four staff columns. For the isolated development check, use branch `br-lucky-cloud-be62md6i`.
- Set `STAFF_SESSION_SECRET` as a Worker runtime secret with a cryptographically random value. Use a distinct secret per environment.
- Set `STAFF_DEV_IDENTITY` only in local development or tests when a synthetic subject is needed. The subject still needs an active staff mapping. Providing the variable at all, including an empty value, makes the auth module fail to load in production.

## Session endpoints

`GET /api/staff/session` exchanges the validated identity and active staff mapping for a 15-minute `__Host-staff_session` cookie. It uses `HttpOnly`, `Secure`, `SameSite=Lax` and `Path=/`. Session version 2 carries the staff ID, subject, role, active flag and Unix-millisecond expiry, signed with the existing HMAC helper. Existing version 1 cookies require a fresh sign-in.

`GET /api/staff/me` reads the signed application session. Both GET endpoints return only the actor's ID and role. `POST /api/staff/logout` expires the application cookie and leaves the upstream Access session in place. Staff authorization is checked against the database when issuing a cookie and when protected cookie-based routes consume it. A missing, inactive, replaced or role-changed mapping invalidates the session; lookup failure denies access. Re-establish a session after a role change. Live preview verification remains required.

The integration gate is a successful sign-in on an authorized Access-protected preview using the restricted Neon login and a synthetic staff mapping. Verify the supported roles, rejection of unknown and inactive subjects, logout, and private draft access before production configuration.
