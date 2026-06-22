# Microsoft Entra ID (Azure AD) SSO — Setup Guide

This guide wires the Golden QA App to **Microsoft Entra ID** so staff sign in with
their `@golden.com.fj` Microsoft 365 account instead of a username & password.

How it works end-to-end:

1. The browser (front-end) uses **MSAL.js** to sign the user in interactively and
   obtain an **`id_token`** (a signed JWT) from Entra ID.
2. The browser POSTs that token to the app: `POST /api/login` with body
   `{ "mode": "sso", "idToken": "<the id_token>" }`.
3. The server calls `integrations/entraId.verifyIdToken(CFG, idToken)`, which:
   - parses the JWT and rejects anything not signed with **RS256**,
   - downloads the tenant signing keys (JWKS) and caches them ~1 hour,
   - verifies the **RS256 signature** with the matching key (by `kid`),
   - validates `exp` / `nbf` (±120 s skew), `aud` (= your **Client ID**),
     `iss` (= `https://login.microsoftonline.com/<tenantId>/v2.0`), and `tid`,
   - extracts the e-mail / UPN and enforces the `@golden.com.fj` domain.
4. On success the server issues its own session token, exactly like password login.

No npm packages are used — verification is done with Node's built-in `crypto`
and `https` modules only.

---

## Part A — Register the application in the Azure / Entra portal

1. Sign in to the **Microsoft Entra admin center** (https://entra.microsoft.com)
   or the **Azure portal** (https://portal.azure.com) with an account that can
   register applications.
2. Go to **Identity > Applications > App registrations** and click
   **+ New registration**.
3. **Name:** `Golden QA App` (any friendly name).
4. **Supported account types:** choose
   **Accounts in this organizational directory only (Single tenant)**.
   This matches the single-tenant issuer the server validates.
5. **Redirect URI:** select platform **Single-page application (SPA)** and enter
   the URL the QA app is served from, for example:
   - `https://qa.golden.com.fj/` (production), and/or
   - `http://localhost:3000/` (local testing).
   You can add more redirect URIs later under **Authentication**.
6. Click **Register**.

### Capture the IDs (you will paste these into config.json)

On the app's **Overview** page, copy:

- **Application (client) ID**  -> this is `sso.clientId`
- **Directory (tenant) ID**    -> this is `sso.tenantId`

### Enable the ID token (implicit / hybrid)

1. Open **Authentication** (left menu).
2. Confirm the **Single-page application** platform shows your redirect URI(s).
3. Under **Implicit grant and hybrid flows**, tick **ID tokens
   (used for implicit and hybrid flows)** and **Save**.
   - Note: with the modern **SPA + Authorization Code + PKCE** flow that MSAL.js
     uses, MSAL returns the `id_token` from the token endpoint and this checkbox
     is generally **not** required. Enable it only if your MSAL configuration
     requests the id_token via the implicit/hybrid flow.

### (Recommended) Token / optional claims

1. Open **Token configuration**.
2. Click **+ Add optional claim**, choose **ID** token type, and add
   **email** (and **upn** if available). This guarantees an e-mail-style claim
   is present so the domain check (`@golden.com.fj`) works even for accounts
   whose `preferred_username` is not an e-mail.

### (Optional) Restrict who can sign in

If you want only specific users/groups to use the app, go to the matching
**Enterprise application** > **Properties** > set **Assignment required = Yes**,
then add users/groups under **Users and groups**. The server additionally
enforces the e-mail domain regardless of this setting.

---

## Part B — Configure the app (config.json)

Edit `config.json` and replace the `sso` block with the shape below, pasting the
two GUIDs you copied. Keep `allowedDomain` as your Microsoft 365 domain.

```json
"sso": {
  "enabled": true,
  "tenantId": "00000000-0000-0000-0000-000000000000",
  "clientId": "11111111-1111-1111-1111-111111111111",
  "allowedDomain": "golden.com.fj",
  "note": "Real Microsoft Entra ID id_token validation via integrations/entraId.js. tenantId = Directory (tenant) ID, clientId = Application (client) ID from the App registration."
}
```

Field reference:

| Key                | Value                                                              |
| ------------------ | ------------------------------------------------------------------ |
| `sso.enabled`      | `true` to allow SSO login.                                         |
| `sso.tenantId`     | **Directory (tenant) ID** GUID from the App registration Overview. |
| `sso.clientId`     | **Application (client) ID** GUID from the same Overview page.      |
| `sso.allowedDomain`| Company e-mail domain users must have, e.g. `golden.com.fj`.       |

After editing `config.json`, restart the Node server so the new config is loaded.

---

## Part C — Front-end (MSAL.js) — wired by the orchestrator

The browser side is handled separately; for reference, the SPA must:

1. Load MSAL.js and create a `PublicClientApplication` with:
   - `auth.clientId`  = `sso.clientId`
   - `auth.authority` = `https://login.microsoftonline.com/<sso.tenantId>`
   - `auth.redirectUri` = the registered SPA redirect URI.
2. Call `loginPopup({ scopes: ["openid","profile","email"] })`
   (or `loginRedirect`) and read `response.idToken`.
3. POST it to the app:

   ```js
   await fetch('/api/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ mode: 'sso', idToken: response.idToken })
   });
   ```

The server returns `{ token, user }` exactly as for password login; store `token` and
send it as `x-token` (or `Authorization: Bearer`) on subsequent API calls.

---

## Troubleshooting

- **`Issuer mismatch`** — `sso.tenantId` does not match the token's tenant, or the
  app was registered as multi-tenant. Use the single-tenant Directory (tenant) ID.
- **`Audience mismatch`** — `sso.clientId` is wrong, or the front-end requested a
  token for a different resource. The `id_token` `aud` must equal your Client ID.
- **`E-mail domain not allowed`** — the signed-in account is not `@golden.com.fj`,
  or no e-mail/UPN claim is present (add the **email** optional claim, Part B).
- **`Signing key not found for kid`** — transient during Entra key rotation; the
  module auto-refreshes the JWKS cache and retries once. Retry the login.
- **`Token expired`** — client clock is far out of sync, or the cached `id_token`
  is stale; acquire a fresh token via MSAL.
