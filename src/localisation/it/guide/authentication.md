## Autenticazione

Ogni richiesta deve includere le credenziali. Utenti e ruoli sono gli stessi del pannello di amministrazione.

| Metodo | Disponibile per | Indicato per |
| --- | --- | --- |
| HTTP Basic | tutti | Prove, chiamate occasionali. |
| Access Token | tutti | Script e applicazioni. |
| Auth Token (JWT) | tutti tranne il ruolo lawful interception | Job non presidiati; da scambiare con un Access Token. |
| Certificato client | amministratori | Accesso machine-to-machine sulla porta 1443. |

Gli utenti con autenticazione a due fattori necessitano anche di un codice TOTP per ottenere un Access Token. `GET /auth/userinfo` mostra l'utente e il ruolo con cui una richiesta è autenticata.

### HTTP Basic

Gli amministratori usano le credenziali di accesso al pannello sulla porta 1443. Gli abbonati usano `username@domain` e la propria password web sulla porta 443.

```shell
curl -u 'administrator:secret' -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/auth/userinfo

curl -u 'alice@voip.example.com:secret' -H 'Accept: application/json' \
  https://ngcp.example.com/api/v2/auth/userinfo
```

La verifica della password è volutamente lenta e richiede circa un secondo per richiesta. Per più di qualche chiamata, ottenere un Access Token una sola volta e inviare quello.

### Access Token

`POST /auth/jwt` restituisce un Access Token, un JSON Web Token (JWT) per l'utente autenticato:

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

Inviarlo come Bearer token fino alla scadenza:

```shell
curl -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/customers
```

Un Access Token è valido per 24 ore. Per una durata inferiore, inviare un corpo come `{"expires_in": 600}` (secondi). Non può essere revocato, quindi mantenere la durata più breve possibile compatibilmente con l'uso previsto.

### Auth Token

Un Auth Token è un JWT con nome e una durata massima di 30 giorni, pensato per job che non devono conservare una password. È accettato solo da `POST /auth/jwt`: un job lo scambia quindi con un Access Token di breve durata e usa quest'ultimo per il lavoro effettivo.

Per crearne uno occorre un Access Token. La risposta lo contiene in `auth_token`; non viene mostrato di nuovo.

```shell
curl -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"identifier": "billing-sync", "expires_in": 2592000}' \
  https://ngcp.example.com:1443/api/v2/auth/tokens
```

Nel job, scambiarlo con un Access Token:

```shell
curl -X POST -H "Authorization: Bearer $NGCP_TOKEN" \
  -H 'Content-Type: application/json' -d '{"expires_in": 600}' \
  https://ngcp.example.com:1443/api/v2/auth/jwt
```

Elencare i propri Auth Token. L'elenco mostra id, nomi e scadenza, non i token stessi:

```shell
curl -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/auth/tokens
```

Revocarne uno tramite il suo id. Smette di funzionare immediatamente:

```shell
curl -X DELETE -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://ngcp.example.com:1443/api/v2/auth/tokens/cb5019ef-c7f9-44bb-bf13-eb1cf9e5b0d7
```

### 2FA, autenticazione a due fattori (TOTP)

Gli utenti con l'autenticazione a due fattori attivata necessitano di una password monouso basata sul tempo (TOTP), generata dalla propria app di autenticazione, per ottenere un Access Token con la propria password. Inviare il codice corrente in `X-TOTP`:

```shell
curl -u 'administrator:secret' -H 'X-TOTP: 492039' -X POST \
  https://ngcp.example.com:1443/api/v2/auth/jwt
```

Il codice è richiesto solo in questo caso. Le richieste con l'Access Token, lo scambio di un Auth Token e i certificati client non lo richiedono. Senza codice la richiesta fallisce con 403 `Missing OTP`, con un codice errato con 403 `Invalid OTP`.

Per configurare l'app di autenticazione, ottenere il segreto con `GET /auth/otp`, oppure un codice QR da scansionare con `GET /auth/otp?qr=true`. Finché non è stato usato il primo codice, l'errore `Missing OTP` rimanda a questo endpoint, che funziona senza codice.

```shell
curl -u 'administrator:secret' -o otp.png \
  'https://ngcp.example.com:1443/api/v2/auth/otp?qr=true'
```

### Certificati client

Gli amministratori possono autenticarsi con un certificato client X.509 sulla porta 1443. Il certificato di un amministratore si crea nel pannello di amministrazione, alla voce Administrators. Il download contiene un file PEM per i programmi e un file P12 per i browser.

```shell
curl --cert NGCP-API-client-certificate-1793370542.pem -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/auth/userinfo
```

### Regole dell'account

- Dopo diversi accessi consecutivi non riusciti, il login viene bloccato per un certo periodo e le richieste falliscono con 403 finché il blocco non scade o non viene rimosso con `DELETE /bans/admins/{id}` o `DELETE /bans/subscribers/{id}`.
- Una password più vecchia della durata massima configurata viene rifiutata con 403. Impostarne una nuova con `POST /auth/password/change`, che accetta ancora la vecchia password.
- Gli utenti contrassegnati come di sola lettura possono inviare solo richieste GET.
