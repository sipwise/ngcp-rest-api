## Authentication

Every request needs credentials. The users and roles are the same as in the admin panel.

| Method | Available to | Good for |
| --- | --- | --- |
| HTTP Basic | everyone | Trying things out, occasional calls. |
| Access Token | everyone | Scripts and applications. |
| Auth Token (JWT) | everyone except lawful interception | Unattended jobs; exchanged for an Access Token. |
| Client certificate | administrators | Machine-to-machine access on port 1443. |

Users with two-factor authentication also need a TOTP code to get an Access Token. `GET /auth/userinfo` shows the user and role a request is authenticated as.

### HTTP Basic

Administrators use their panel login on port 1443. Subscribers use `username@domain` and their web password on port 443.

```shell
curl -u 'administrator:secret' -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/auth/userinfo

curl -u 'alice@voip.example.com:secret' -H 'Accept: application/json' \
  https://ngcp.example.com/api/v2/auth/userinfo
```

The password check is slow on purpose and takes around a second per request. For more than a few calls, get an Access Token once and send that instead.

### Access Token

`POST /auth/jwt` returns an Access Token, a JSON Web Token (JWT) for the authenticated user:

```shell
curl -u 'administrator:secret' -X POST https://ngcp.example.com:1443/api/v2/auth/jwt
```

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "created_at": "2026-10-30T15:17:36.423Z",
  "expires_at": "2026-10-31T15:17:36.423Z"
}
```

Send it as a Bearer token until it expires:

```shell
curl -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/customers
```

An Access Token is valid for 24 hours. Ask for a shorter lifetime with a body such as `{"expires_in": 600}` (seconds). It cannot be revoked, so keep lifetimes as short as your use allows.

### Auth Tokens

An Auth Token is a named JWT with a lifetime of up to 30 days, meant for jobs that should not hold a password. It is accepted only by `POST /auth/jwt`, so a job exchanges it for a short-lived Access Token and uses that for the actual work.

Create one with an Access Token. The response contains it in `auth_token`; it is not shown again.

```shell
curl -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"identifier": "billing-sync", "expires_in": 2592000}' \
  https://ngcp.example.com:1443/api/v2/auth/tokens
```

In the job, exchange it for an Access Token:

```shell
curl -X POST -H "Authorization: Bearer $NGCP_TOKEN" \
  -H 'Content-Type: application/json' -d '{"expires_in": 600}' \
  https://ngcp.example.com:1443/api/v2/auth/jwt
```

List your Auth Tokens. The list shows their ids, names and expiry, not the tokens themselves:

```shell
curl -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/auth/tokens
```

Revoke one by its id. It stops working immediately:

```shell
curl -X DELETE -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://ngcp.example.com:1443/api/v2/auth/tokens/cb5019ef-c7f9-44bb-bf13-eb1cf9e5b0d7
```

### 2FA, Two-factor authentication (TOTP)

Users with two-factor authentication enabled need a time-based one-time password (TOTP) from their authenticator app to get an Access Token with their password. Send the current code in `X-TOTP`:

```shell
curl -u 'administrator:secret' -H 'X-TOTP: 492039' -X POST \
  https://ngcp.example.com:1443/api/v2/auth/jwt
```

The code is needed only here. Requests with the Access Token, the exchange of an Auth Token and client certificates do not ask for it. Without a code the request fails with 403 `Missing OTP`, with a wrong one with 403 `Invalid OTP`.

To set up the authenticator app, get the secret with `GET /auth/otp`, or a QR code to scan with `GET /auth/otp?qr=true`. Until the first code has been used, the `Missing OTP` error refers to this endpoint, which works without a code.

```shell
curl -u 'administrator:secret' -o otp.png \
  'https://ngcp.example.com:1443/api/v2/auth/otp?qr=true'
```

### Client certificates

Administrators can authenticate with an X.509 client certificate on port 1443. Create the certificate for an administrator in the admin panel, under Administrators. The download contains a PEM file for programs and a P12 file for browsers.

```shell
curl --cert NGCP-API-client-certificate-1793370542.pem -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/auth/userinfo
```

### Account rules

- After several failed logins in a row the login is banned for a while, and requests fail with 403 until the ban ends or is lifted with `DELETE /bans/admins/{id}` or `DELETE /bans/subscribers/{id}`.
- A password older than the configured maximum age is rejected with 403. Set a new one with `POST /auth/password/change`, which still accepts the old password.
- Users flagged as read-only can only send GET requests.
