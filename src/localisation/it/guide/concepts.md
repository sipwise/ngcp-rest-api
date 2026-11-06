## Concetti

API v2 è l'interfaccia REST per il provisioning e la gestione della piattaforma NGCP. Rispetto ad API v1 aggiunge il provisioning in blocco, la validazione rigorosa di ogni richiesta, in cui campi e parametri di query sconosciuti vengono rifiutati anziché ignorati, e funzionalità estese. È descritta da un documento OpenAPI 3, da cui viene generata questa pagina.

### URL di base

| Account | URL di base |
| --- | --- |
| Amministratore, con qualsiasi ruolo (ad es. reseller, customer care) | `https://ngcp.example.com:1443/api/v2` |
| Abbonato, con qualsiasi ruolo (subscriber, subscriber admin) | `https://ngcp.example.com/api/v2` |

Il documento OpenAPI stesso è disponibile in `<base URL>/swagger.json` e `<base URL>/swagger.yaml`, per generatori di codice e strumenti API.

### Richieste

Inviare `Accept: application/json` con ogni richiesta. In sua assenza, le risposte usano HAL+JSON (`_links`, `_embedded`), che è il formato predefinito. I corpi delle richieste sono in JSON (`Content-Type: application/json`), tranne che per PATCH, che accetta un documento JSON Patch (`application/json-patch+json`).

Alcune collezioni, come le rubriche, possono essere scambiate anche come file CSV. Per richiedere il formato CSV, usare `Accept: text/csv`:

```shell
curl -u 'administrator:secret' -H 'Accept: text/csv' -o phonebook.csv \
  https://ngcp.example.com:1443/api/v2/customers/3/phonebook
```

Per importare un file CSV, caricarlo come `multipart/form-data` in una parte denominata `file`. Le sue colonne corrispondono ai campi degli elementi:

```shell
curl -u 'administrator:secret' -H 'Accept: application/json' \
  -F 'file=@phonebook.csv;type=text/csv' \
  https://ngcp.example.com:1443/api/v2/customers/3/phonebook
```

### Risposte

Una collezione restituisce una pagina di elementi e il numero totale degli elementi corrispondenti:

```json
{
  "total_count": 2,
  "data": [
    {"id": 7, "email": "alice@example.com", "firstname": "Alice", "status": "active"},
    {"id": 9, "email": "bob@example.com", "firstname": "Bob", "status": "active"}
  ]
}
```

L'header `Prefer` determina cosa restituisce una richiesta di scrittura. In sua assenza, una POST di un singolo elemento restituisce l'elemento creato in `data`, mentre PUT, PATCH e DELETE restituiscono 204 senza corpo. Creazione di un contatto con ciascun valore di `Prefer`:

```http return=representation
POST /api/v2/customercontacts
Content-Type: application/json
Prefer: return=representation

{"reseller_id": 1, "email": "alice@example.com", "status": "active"}

HTTP/1.1 201 Created
Location: /api/v2/customercontacts/19

{"total_count": 1, "data": [{"id": 19, "email": "alice@example.com", "status": "active", "firstname": null}]}
```

```http return=id
POST /api/v2/customercontacts
Content-Type: application/json
Prefer: return=id

{"reseller_id": 1, "email": "alice@example.com", "status": "active"}

HTTP/1.1 201 Created
Location: /api/v2/customercontacts/19

{"total_count": 1, "ids": [19]}
```

```http return=link
POST /api/v2/customercontacts
Content-Type: application/json
Prefer: return=link

{"reseller_id": 1, "email": "alice@example.com", "status": "active"}

HTTP/1.1 201 Created
Location: /api/v2/customercontacts/19

{"total_count": 1, "links": ["/api/v2/customercontacts/19"]}
```

```http return=minimal
POST /api/v2/customercontacts
Content-Type: application/json
Prefer: return=minimal

{"reseller_id": 1, "email": "alice@example.com", "status": "active"}

HTTP/1.1 204 No Content
```

### Paginazione, ordinamento e filtri

| Parametro | Significato |
| --- | --- |
| `page`, `rows` | Numero di pagina, a partire da 1, e dimensione della pagina (predefinita 10). |
| `order_by`, `order_by_direction` | Campo di ordinamento e `asc` (predefinito) o `desc`. |
| qualsiasi campo della collezione | Filtro. I valori devono corrispondere esattamente, `*` è un carattere jolly e la virgola separa le alternative. |
| `search_or=1` | Combina più filtri con OR anziché AND. |

I filtri supportati da una collezione sono elencati più sotto, nella relativa operazione GET. I parametri di query sconosciuti vengono rifiutati con 400.

```http
GET /api/v2/customercontacts?email=*@example.com,*@example.org&status=active&order_by=id&rows=50&page=2
```

Anche il filtro per `id` restituisce una collezione, il che consente di leggere più elementi con un'unica richiesta:

```http
GET /api/v2/customercontacts?id=1,3,5
GET /api/v2/admins?login=alice,bob,carol*
```

### Risorse correlate

I campi di riferimento come `reseller_id` o `contract_id` possono essere risolti nella stessa richiesta con `expand`. L'elemento referenziato viene aggiunto come `<field>_expand`, e un punto scende di un livello:

```http
GET /api/v2/resellers/1?expand=contract_id.contact_id
```

Un campo che non può essere espanso restituisce 422. Aggiungere `soft_expand=1` per ignorare invece tali campi.

### Creazione e modifica dei dati

Ogni metodo opera su un singolo elemento oppure, sul percorso della collezione, su più elementi con un'unica richiesta:

| Metodo | Un elemento | Più elementi | Esito positivo |
| --- | --- | --- | --- |
| POST | `/resource` con un oggetto | `/resource` con un array di oggetti | 201 |
| PUT | `/resource/{id}` con l'oggetto completo | `/resource` con oggetti indicizzati per id | 204 |
| PATCH | `/resource/{id}` con operazioni JSON Patch | `/resource` con operazioni indicizzate per id | 204 |
| DELETE | `/resource/{id}` | `/resource` con un array di id | 204 |

PUT sostituisce l'elemento, quindi i campi omessi vengono reimpostati. PATCH ([RFC 6902](https://www.rfc-editor.org/rfc/rfc6902)) modifica solo i campi indicati.

#### Singoli elementi

```http POST
POST /api/v2/customercontacts
Content-Type: application/json

{"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "status": "active"}
```

```http PUT
PUT /api/v2/customercontacts/7
Content-Type: application/json

{"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active"}
```

```http PATCH
PATCH /api/v2/customercontacts/7
Content-Type: application/json-patch+json

[
  {"op": "replace", "path": "/firstname", "value": "Alice"},
  {"op": "add", "path": "/company", "value": "Example Ltd"},
  {"op": "remove", "path": "/faxnumber"}
]
```

```http DELETE
DELETE /api/v2/customercontacts/7
```

#### Operazioni in blocco

```http POST
POST /api/v2/customercontacts
Content-Type: application/json
Prefer: return=id

[
  {"reseller_id": 1, "email": "alice@example.com", "status": "active"},
  {"reseller_id": 1, "email": "bob@example.com", "status": "active"}
]
```

```http PUT
PUT /api/v2/customercontacts
Content-Type: application/json

{
  "7": {"reseller_id": 1, "email": "alice@example.com", "status": "active"},
  "9": {"reseller_id": 1, "email": "bob@example.com", "status": "terminated"}
}
```

```http PATCH
PATCH /api/v2/customercontacts
Content-Type: application/json-patch+json

{
  "7": [{"op": "replace", "path": "/city", "value": "Graz"}],
  "9": [{"op": "replace", "path": "/city", "value": "Linz"}]
}
```

```http DELETE
DELETE /api/v2/customercontacts
Content-Type: application/json

[7, 9]
```

Una POST in blocco senza `Prefer` restituisce 204, quindi richiedere `return=id` o `return=representation` per ottenere i nuovi id.

### Errori

Ogni errore ha lo stesso corpo JSON:

```json
{
  "tx": "725d5b49f5674d719db795cf2f81262e",
  "statusCode": 422,
  "path": "/api/v2/customercontacts",
  "method": "POST",
  "error": "Unprocessable Entity",
  "errorCode": "VALIDATION_FAILED",
  "message": "Validation failed",
  "errors": [
    {"pointer": "/1/status", "code": "isEnum", "message": "status must be one of the following values: active, terminated"},
    {"pointer": "/1/email", "code": "isEmail", "message": "email must be an email"}
  ]
}
```

- `tx` identifica la richiesta nel log del server (`/var/log/ngcp/rest-api.log`). Indicarlo quando si segnala un problema.
- `error` è il testo dello stato HTTP, `message` un testo leggibile.
- `errorCode` è il codice dell'errore leggibile da una macchina: `VALIDATION_FAILED` (corpo non valido), `INVALID_PARAMETER` (parametro di percorso o di query non valido), `INVALID_JSON` (il corpo non è JSON), `INVALID_JSON_PATCH` (JSON Patch malformato), `JSON_PATCH_CONFLICT` (il JSON Patch non è applicabile all'elemento), un codice specifico come `RESELLER_ID_INVALID` oppure, altrimenti, il nome dello stato, come `NOT_FOUND` o `FORBIDDEN`.
- `errors` elenca i singoli errori, una voce per controllo non superato, nell'ordine della richiesta. Viene omesso se non ce ne sono. Per impostazione predefinita vengono restituite al massimo 100 voci; `message` indica allora quante sono.

Il documento OpenAPI (`swagger.json`, `swagger.yaml`) descrive questo corpo con lo schema `ErrorResponse`, con voci `ErrorEntry`; le risposte `4XX` e `5XX` di ogni operazione vi fanno riferimento.

Basare la logica su `errorCode` e sul `code` delle voci, mai su `message`: i testi possono cambiare. I valori di `code` sono i nomi dei controlli non superati (`isEnum`, `isNotEmpty`, `whitelistValidation` per un campo che non deve essere inviato, `containsNumber`), l'errore di JSON Patch (`TEST_OPERATION_FAILED`) o un codice specifico.

Una voce indica il valore errato con `pointer`, un [JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901) nel corpo della richiesta, oppure nomina il `parameter` errato del percorso o della query string:

| Richiesta | Pointer |
| --- | --- |
| POST, PUT di un elemento | `/email`, annidato `/rules/1/match_pattern` |
| POST in bulk (array) | `/<index>/email` |
| PUT, PATCH in bulk (indicizzato per id) | `/<id>/email` |
| PATCH, valore non valido (422) | il campo nell'elemento modificato, ad esempio `/email` |
| PATCH, operazione malformata o in conflitto (400, 409) | il membro dell'operazione nel documento di patch: `/0/op`, `/0/path`, `/0/value`; in bulk `/<id>/0/path` |
| Importazione CSV | `/<row>/email`, righe contate da 0 dopo l'intestazione |

Gli indici partono da 0: l'elemento di un POST in bulk (`/0` è il primo elemento), l'operazione di un JSON Patch (`/0/op`), l'id nella lista di id di un DELETE in bulk e la riga di dati CSV senza l'intestazione.

```json
{
  "tx": "0c6f3e4ab4f04a4c9d1b6f0e8d0d6a51",
  "statusCode": 400,
  "path": "/api/v2/customercontacts?colour=blue",
  "method": "GET",
  "error": "Bad Request",
  "errorCode": "INVALID_PARAMETER",
  "message": "Validation failed",
  "errors": [
    {"parameter": "colour", "code": "whitelistValidation", "message": "parameter colour should not exist"}
  ]
}
```

Un campo annidato è indicato dal suo percorso completo, qui la seconda regola incorporata di un nuovo rewrite rule set:

```json
{
  "tx": "9d4c2b7e1a3f4c6d8e0f1a2b3c4d5e6f",
  "statusCode": 422,
  "path": "/api/v2/rewrite-rules/sets",
  "method": "POST",
  "error": "Unprocessable Entity",
  "errorCode": "VALIDATION_FAILED",
  "message": "Validation failed",
  "errors": [
    {"pointer": "/rules/1/replace_pattern", "code": "containsSpaces", "message": "replace_pattern cannot contain spaces"},
    {"pointer": "/rules/1/direction", "code": "isEnum", "message": "direction must be one of the following values: in, out, lnp"}
  ]
}
```

I controlli sui dati memorizzati, per esempio un `reseller_id` sconosciuto o un nome già esistente, restituiscono le stesse voci con il codice specifico come `code`. Il puntatore indica il campo o l'elemento nel suo insieme (`/<index>`, `/<id>`, il puntatore vuoto per un singolo elemento). Ogni elemento non valido è elencato con il proprio codice; `errorCode` e `message` sono quelli della prima voce.

```json
{
  "tx": "3b9e6f1c2d7a4e5f8a0b1c2d3e4f5a6b",
  "statusCode": 422,
  "path": "/api/v2/domains",
  "method": "POST",
  "error": "Unprocessable Entity",
  "errorCode": "DOMAIN_ALREADY_EXISTS",
  "message": "Domain 'sip.example.org' already exists",
  "errors": [
    {"pointer": "/0/domain", "code": "DOMAIN_ALREADY_EXISTS", "message": "domain 'sip.example.org' already exists"},
    {"pointer": "/2/reseller_id", "code": "RESELLER_ID_INVALID", "message": "invalid reseller_id"}
  ]
}
```

Gli id di un PUT, PATCH o DELETE in blocco che non esistono o non sono visibili restituiscono 422 `ENTRY_NOT_FOUND` con una voce per id: `/<id>` in un corpo PUT o PATCH, `/<index>` in un elenco di id DELETE. Un elemento indicato dal suo id nel percorso restituisce 404.

400 significa che la richiesta non può essere interpretata (JSON o JSON Patch malformato, parametro non valido), 409 che un JSON Patch ben formato non è applicabile all'elemento corrente (`test` non superato, percorso inesistente), 422 che un contenuto ben formato non è valido.

| Codice | Causa tipica |
| --- | --- |
| 400 | JSON o JSON Patch malformato, parametro sconosciuto o non valido. |
| 401 | Credenziali mancanti o errate. |
| 403 | Non consentito per il proprio ruolo, utente in sola lettura, password scaduta, login bloccato, TOTP mancante o non valido. |
| 404 | L'elemento non esiste o non è visibile all'utente. |
| 409 | Il JSON Patch non è applicabile all'elemento. |
| 415 | Nessun `Content-Type` e il corpo non è JSON. |
| 422 | Validazione non riuscita, valore duplicato, campo non espandibile. |
| 423 | L'elemento è ancora in uso, ad esempio un contatto associato a un contratto. |
| 500, 503 | Problema lato server. Segnalarlo indicando il `tx`. |

### Registro delle modifiche

Le modifiche effettuate tramite l'API vengono registrate. `GET /<resource>/{id}/journal` elenca le modifiche di un elemento: chi le ha effettuate, quando, l'operazione e i dati risultanti. `GET /journals` esegue ricerche nel registro di tutte le risorse.
