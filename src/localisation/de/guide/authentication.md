## Authentifizierung

Jede Anfrage benötigt Zugangsdaten. Benutzer und Rollen sind dieselben wie im Admin-Panel.

| Methode | Verfügbar für | Geeignet für |
| --- | --- | --- |
| HTTP Basic | alle | Ausprobieren, gelegentliche Aufrufe. |
| Access Token | alle | Skripte und Anwendungen. |
| Auth Token (JWT) | alle außer Lawful Interception | Unbeaufsichtigte Jobs; wird gegen ein Access Token getauscht. |
| Client-Zertifikat | Administratoren | Maschine-zu-Maschine-Zugriff auf Port 1443. |

Benutzer mit Zwei-Faktor-Authentifizierung benötigen für ein Access Token zusätzlich einen TOTP-Code. `GET /auth/userinfo` zeigt, als welcher Benutzer und mit welcher Rolle eine Anfrage authentifiziert ist.

### HTTP Basic

Administratoren verwenden ihren Panel-Login auf Port 1443. Subscriber verwenden `username@domain` und ihr Web-Passwort auf Port 443.

```shell
curl -u 'administrator:secret' -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/auth/userinfo

curl -u 'alice@voip.example.com:secret' -H 'Accept: application/json' \
  https://ngcp.example.com/api/v2/auth/userinfo
```

Die Passwortprüfung ist absichtlich langsam und dauert etwa eine Sekunde pro Anfrage. Für mehr als ein paar Aufrufe holen Sie einmal ein Access Token und senden stattdessen dieses.

### Access Token

`POST /auth/jwt` liefert ein Access Token, ein JSON Web Token (JWT) für den authentifizierten Benutzer:

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

Senden Sie es als Bearer token, bis es abläuft:

```shell
curl -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/customers
```

Ein Access Token ist 24 Stunden gültig. Eine kürzere Laufzeit fordern Sie mit einem Body wie `{"expires_in": 600}` (Sekunden) an. Es kann nicht widerrufen werden, halten Sie die Laufzeit also so kurz, wie es Ihr Anwendungsfall zulässt.

### Auth Tokens

Ein Auth Token ist ein benanntes JWT mit einer Laufzeit von bis zu 30 Tagen, gedacht für Jobs, die kein Passwort speichern sollen. Es wird nur von `POST /auth/jwt` akzeptiert; ein Job tauscht es also gegen ein kurzlebiges Access Token und verwendet dieses für die eigentliche Arbeit.

Erstellen Sie es mit einem Access Token. Die Antwort enthält es in `auth_token`; es wird nicht erneut angezeigt.

```shell
curl -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"identifier": "billing-sync", "expires_in": 2592000}' \
  https://ngcp.example.com:1443/api/v2/auth/tokens
```

Tauschen Sie es im Job gegen ein Access Token:

```shell
curl -X POST -H "Authorization: Bearer $NGCP_TOKEN" \
  -H 'Content-Type: application/json' -d '{"expires_in": 600}' \
  https://ngcp.example.com:1443/api/v2/auth/jwt
```

Ihre Auth Tokens auflisten. Die Liste zeigt ihre ids, Namen und Ablaufzeit, nicht die Tokens selbst:

```shell
curl -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/auth/tokens
```

Ein Token anhand seiner id widerrufen. Es ist sofort ungültig:

```shell
curl -X DELETE -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://ngcp.example.com:1443/api/v2/auth/tokens/cb5019ef-c7f9-44bb-bf13-eb1cf9e5b0d7
```

### 2FA, Zwei-Faktor-Authentifizierung (TOTP)

Benutzer mit aktivierter Zwei-Faktor-Authentifizierung benötigen ein zeitbasiertes Einmalpasswort (TOTP) aus ihrer Authenticator-App, um mit ihrem Passwort ein Access Token zu erhalten. Senden Sie den aktuellen Code in `X-TOTP`:

```shell
curl -u 'administrator:secret' -H 'X-TOTP: 492039' -X POST \
  https://ngcp.example.com:1443/api/v2/auth/jwt
```

Der Code wird nur hier benötigt. Anfragen mit dem Access Token, der Tausch eines Auth Tokens und Client-Zertifikate verlangen ihn nicht. Ohne Code schlägt die Anfrage mit 403 `Missing OTP` fehl, mit einem falschen mit 403 `Invalid OTP`.

Zum Einrichten der Authenticator-App holen Sie das Secret mit `GET /auth/otp` oder einen QR-Code zum Scannen mit `GET /auth/otp?qr=true`. Bis der erste Code verwendet wurde, verweist der Fehler `Missing OTP` auf diesen Endpoint, der ohne Code funktioniert.

```shell
curl -u 'administrator:secret' -o otp.png \
  'https://ngcp.example.com:1443/api/v2/auth/otp?qr=true'
```

### Client-Zertifikate

Administratoren können sich auf Port 1443 mit einem X.509-Client-Zertifikat authentifizieren. Erstellen Sie das Zertifikat für einen Administrator im Admin-Panel unter Administrators. Der Download enthält eine PEM-Datei für Programme und eine P12-Datei für Browser.

```shell
curl --cert NGCP-API-client-certificate-1793370542.pem -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/auth/userinfo
```

### Kontoregeln

- Nach mehreren fehlgeschlagenen Logins in Folge wird der Login für eine Weile gesperrt, und Anfragen schlagen mit 403 fehl, bis die Sperre abläuft oder mit `DELETE /bans/admins/{id}` bzw. `DELETE /bans/subscribers/{id}` aufgehoben wird.
- Ein Passwort, das älter als das konfigurierte Höchstalter ist, wird mit 403 abgelehnt. Setzen Sie mit `POST /auth/password/change` ein neues; dieser Endpoint akzeptiert das alte Passwort weiterhin.
- Als schreibgeschützt markierte Benutzer können nur GET-Anfragen senden.
