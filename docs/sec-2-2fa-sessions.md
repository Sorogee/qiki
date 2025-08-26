# SEC‑2 — 2FA & Sessions

This adds:
- **TOTP** (Google Authenticator, 1Password, etc.)
- **Passkeys** (WebAuthn) for passwordless/2nd‑factor
- **Device sessions list** and **Sign‑out everywhere**

## Server env
```
WEBAUTHN_RP_ID=yourdomain.com
WEBAUTHN_ORIGIN=https://yourdomain.com
```
(Defaults derive from `DOMAIN` when using the free/prod‑lite compose.)

## API
- `GET /api/security/status` → { totpEnabled, passkeys, sessions[] }
- `POST /api/security/totp/start` → { secret, otpauth }
- `POST /api/security/totp/verify` → enables TOTP
- `DELETE /api/security/totp` → disables TOTP
- `GET /api/security/webauthn/register/options`
- `POST /api/security/webauthn/register/verify`
- `POST /api/security/webauthn/auth/options` (for login)
- `GET /api/sessions` / `POST /api/sessions/revoke` / `POST /api/sessions/revoke_all`
- `POST /auth2/login` → if 2FA enabled returns `{ requires2fa, challengeId }` otherwise `{ token }`
- `POST /auth2/login/complete` with `{ challengeId, method:'totp'|'webauthn',  }` → `{ token }`

## UI
- **Login** now uses `/auth2` flow when 2FA is enabled.
- **Settings → Security** page to enable TOTP, register passkeys, and manage sessions.

## Notes
- Emails still go to **console** in FREE_MODE.
- Session revocation applies to tokens issued via `/auth2/login` (they include a `jti` stored in DB).
- To enforce revocation on additional routes, import `ensureSessionActive` middleware where needed.
