# Security and data privacy

What Larpworks does to protect user data, what the platform provides, and
what is deliberately left for later. Written for the project owner as much as
for contributors; if you change any of the mechanisms below, update this file
in the same commit.

## What we store about people

Accounts hold an email address, a display name, and a password hash. Projects
hold game content, membership, and per-member access roles. Characters hold
names and purchases. There is no payment data, no address data, and no
tracking or analytics of any kind.

## In transit

- TLS terminates at the Railway edge; every public URL is HTTPS.
- The app sends `Strict-Transport-Security` (one year, includeSubDomains) on
  HTTPS responses, so browsers refuse to downgrade.
- Any plain-HTTP request that reaches the app through the proxy in production
  is redirected to HTTPS before it goes further (`security.ts`).
- The session cookie is `HttpOnly` (no script access), `Secure` in
  production, and `SameSite=Lax` on the same-origin deploy, which covers CSRF
  for cookie-carried requests without a separate token.

## At rest

- Railway encrypts customer data at rest at the disk level, for both services
  and the managed Postgres.
- Passwords are hashed with scrypt (memory-hard, from `node:crypto`) with a
  per-user random salt, and verified with a timing-safe comparison. Raw
  passwords are never stored or logged.
- Session tokens and invite tokens are stored only as SHA-256 hashes. A
  leaked database yields no usable session and no joinable invite link.
- Sessions expire after 30 days, expiry is enforced at lookup, and expired
  rows are swept on an interval so the table does not accumulate history.

## Application measures

- **Least exposure of personal data.** Member email addresses are returned
  only to callers who can manage the project; ordinary members see display
  names only. The admin accounts page is restricted to app admins.
- **Content Security Policy.** Scripts run only from our own origin plus a
  hash of the one legitimate inline script (the theme restore), computed from
  the served `index.html` at boot. Objects, framing, and foreign form targets
  are refused; styles and fonts are limited to our origin and Google Fonts.
- **Headers.** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and a minimal
  `Permissions-Policy`.
- **Login throttling.** Failed sign-ins are rate limited per IP and email
  pair, and the failure message does not reveal whether the email exists.
- **Authorization discipline.** A project a caller cannot see answers 404,
  not 403, so project ids cannot be confirmed by probing. Access-role
  filtering happens server side; hidden content is not sent and then hidden.
- **No secret material in responses or logs.** Tokens appear once, in the
  response that creates them; errors are logged server side and reported to
  clients as generic messages.
- **Data export and account deletion.** The account page offers a JSON
  download of everything the account owns (account record, owned projects
  with rules and story, memberships, owned characters), and permanent
  deletion. Deletion requires the password again, is rate limited, and
  removes the account with everything hanging off it -- sessions,
  memberships, owned projects, and characters -- via `ON DELETE CASCADE`.

## Known limits, held deliberately

- **Registration reveals existing emails.** Sign-up says when an email is
  already registered. Fixing this properly needs email verification flows;
  until the app sends email at all, the honest error is more useful than a
  fake success. Sign-up attempts are rate limited per IP so the answer
  cannot be used to sweep for registered addresses in bulk.
- **No field-level encryption in the database.** Disk-level encryption plus
  hashed credentials covers the realistic threats for this app today.
  Field-level encryption of emails would break login lookups for little gain
  while the database also holds the keys.
- **Session per login, no device management.** Signing out revokes the one
  session; there is no "sign out everywhere" yet.

## Reporting

If you find a security problem, open a private report to the repository owner
rather than a public issue.
