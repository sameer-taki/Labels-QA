# Local Active Directory sign-in (LDAPS)

Golden QA can authenticate users against your **on-premises Active Directory** — no internet
required, ideal for the shop floor. Users sign in on the normal username + password screen; the
server verifies the credentials against a domain controller over **LDAPS** and maps the user's **AD
security groups** to an app role. A local **break-glass admin** always works even if the DC is down.

This replaces the cloud Microsoft Entra (Azure AD) SSO. To use Entra instead, see
[ENTRA-SSO-SETUP.md](ENTRA-SSO-SETUP.md).

---

## 1. What you need from AD

1. **A domain controller reachable over LDAPS (port 636).** LDAPS needs a certificate on the DC
   (AD Certificate Services issues one automatically in most domains). Plain LDAP (389) is only
   acceptable on a fully trusted, isolated LAN — prefer LDAPS.
2. **A read-only service account** (e.g. `svc-goldenqa`). The app binds as this account to look a
   user up before checking their password. A normal, non-privileged user account is fine.
3. **Four security groups**, one per app role, e.g.:
   | AD group | App role |
   |----------|----------|
   | `GoldenQA-Admins` | Administrator |
   | `GoldenQA-Managers` | Quality Manager |
   | `GoldenQA-Supervisors` | Supervisor |
   | `GoldenQA-Officers` | QA Officer |

   Put each employee in exactly the group(s) that match their responsibility. A user in several
   groups gets the **highest** role. A user in **none** of them is denied access.

---

## 2. Configure the app

**Secrets and connection go in the environment** (`.env` next to the compose file, or the Portainer
stack environment). Never put the service-account password in `config.json`.

```
LDAP_ENABLED=true
LDAP_URL=ldaps://dc.golden.local:636
LDAP_BASE_DN=DC=golden,DC=local
LDAP_BIND_DN=CN=svc-goldenqa,OU=Service Accounts,DC=golden,DC=local
LDAP_BIND_PASSWORD=<the service account password>
```

`LDAP_BIND_DN` may also be a UPN (`svc-goldenqa@golden.local`).

**The group → role mapping goes in `config.json` → `ldap.roleGroups`.** List each group by its full
DN or just its CN:

```json
"ldap": {
  "roleGroups": {
    "Administrator":    ["GoldenQA-Admins"],
    "Quality Manager":  ["GoldenQA-Managers"],
    "Supervisor":       ["GoldenQA-Supervisors"],
    "QA Officer":       ["GoldenQA-Officers"]
  },
  "usernameAttribute": "sAMAccountName",
  "defaultRole": "",
  "stageGroups": {},
  "tls": { "rejectUnauthorized": true, "caFile": "" }
}
```

- `usernameAttribute` — what people type to sign in. `sAMAccountName` (e.g. `jsmith`) is the usual
  choice; use `userPrincipalName` if you want them to type `jsmith@golden.local`.
- `defaultRole` — leave empty to **deny** users who are in none of the role groups (recommended).
  Set it to e.g. `"QA Officer"` to instead give any valid domain user least-privilege access.
- `stageGroups` — optional. Map AD groups to stage sign-off competencies, e.g.
  `{ "1": ["GoldenQA-Printing"], "4": ["GoldenQA-Finishing"] }`. Leave empty to qualify AD users
  for all stages (competency enforcement is off unless you turn it on in Admin → Settings).
- `tls.rejectUnauthorized` — keep `true`. If the DC uses a private CA, point `tls.caFile` at the CA
  certificate (PEM) so the chain validates instead of disabling verification.

---

## 3. How sign-in behaves

- **AD users** type their AD username + password. On success their role and stage competencies are
  read from AD group membership **every login** (AD is the source of truth), and their account is
  created/refreshed in the app automatically. They have no local password.
- **Break-glass admin** — the local account seeded from `ADMIN_USERNAME` / `ADMIN_PASSWORD` keeps a
  local password and is checked locally, so an administrator can always get in (initial setup, or if
  the DC is unreachable). Keep its password strong and stored safely.
- Repeated wrong passwords are rate-limited (brute-force lockout) exactly as for local accounts.
- A user with no matching role group is refused with a clear message; add them to a group in AD.

The startup log shows the active mode, e.g. `[auth: Active Directory (LDAPS) + local]`.

---

## 4. Verify

1. Set the env + `config.json` above and restart the stack.
2. Sign in as a member of `GoldenQA-Managers` — you should land in the app as **Quality Manager**.
3. Sign in as someone in none of the groups — you should be refused.
4. Sign in as the break-glass admin — should always work.
5. Check the audit trail (Admin → Audit): AD logins are recorded as `login … via Active Directory`.

---

## 5. Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Everyone gets "Invalid username or password" | Wrong `LDAP_URL`/port, DC unreachable, or the service account `LDAP_BIND_DN`/`LDAP_BIND_PASSWORD` is wrong. Check the server log. |
| Valid users get "not authorized for Golden QA" | Their AD groups don't match `ldap.roleGroups` (check the exact CN/DN), or they aren't in any role group. |
| TLS / certificate errors on connect | The DC's LDAPS certificate isn't trusted — set `ldap.tls.caFile` to your CA, or fix the DC cert. Don't disable verification in production. |
| Wrong role after a group change | Roles refresh on next login; have the user sign out and back in. |
