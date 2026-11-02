## Introduzione

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

Gli errori hanno un corpo JSON. `message` è un testo oppure, se la validazione non riesce, un elenco dei campi rifiutati con i controlli non superati:

```json
{
  "tx": "725d5b49f5674d719db795cf2f81262e",
  "statusCode": 422,
  "path": "/api/v2/customercontacts/5",
  "method": "PATCH",
  "error": "Unprocessable Entity",
  "message": [
    {"status": [{"isEnum": "status must be one of the following values: active, terminated"}]}
  ]
}
```

`tx` identifica la richiesta nel log del server (`/var/log/ngcp/rest-api.log`). Indicarlo quando si segnala un problema.

| Codice | Causa tipica |
| --- | --- |
| 400 | Richiesta malformata, parametro di query sconosciuto, JSON Patch non valido. |
| 401 | Credenziali mancanti o errate. |
| 403 | Non consentito per il proprio ruolo, utente in sola lettura, password scaduta, login bloccato, TOTP mancante o non valido. |
| 404 | L'elemento non esiste o non è visibile all'utente. |
| 415 | Il corpo non è un JSON valido. |
| 422 | Validazione non riuscita, valore duplicato, campo non espandibile. |
| 423 | L'elemento è ancora in uso, ad esempio un contatto associato a un contratto. |
| 500, 503 | Problema lato server. Segnalarlo indicando il `tx`. |

### Registro delle modifiche

Le modifiche effettuate tramite l'API vengono registrate. `GET /<resource>/{id}/journal` elenca le modifiche di un elemento: chi le ha effettuate, quando, l'operazione e i dati risultanti. `GET /journals` esegue ricerche nel registro di tutte le risorse.
