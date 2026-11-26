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
| `page`, `rows` | Numero di pagina, a partire da 1, e dimensione della pagina (predefinita 10, al massimo 10000). |
| `order_by`, `order_by_direction` | Campo di ordinamento e `asc` (predefinito) o `desc`. |
| qualsiasi campo della collezione | Filtro. I valori devono corrispondere esattamente, `*` è un carattere jolly e la virgola separa le alternative. |
| `search_or=true` | Combina più filtri con OR anziché AND. |

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

I campi di riferimento come `reseller_id` o `contract_id` possono essere risolti nella stessa richiesta con `expand`, un elenco di campi separati da virgole. L'elemento referenziato viene aggiunto come `<field>_expand`, e un punto scende di un livello. È lo stesso elemento che la collezione referenziata vi restituisce, e una collezione viene risolta con una lettura per campo. I campi espandibili sono elencati con il parametro `expand` di ogni operazione, `all` li espande tutti:

```http
GET /api/v2/resellers/1?expand=contract_id.contact_id
GET /api/v2/subscribers?expand=customer_id,domain_id
```

Un campo che non può essere espanso restituisce 422, un elemento referenziato che non potete leggere 403. Con `soft_expand=true` ottenete invece solo ciò che può essere espanso: tali campi ed elementi vengono omessi. Un percorso malformato come `a..b` restituisce 400 in ogni caso.

`expand` e `soft_expand` sono accettati solo nelle richieste GET con risposta JSON, ad esempio non nelle scritture, sotto `/auth` né con `Accept: text/csv`: lì restituiscono 400, salvo con `soft_expand=true`.

Le collezioni possono anche essere filtrate per i campi degli elementi referenziati: `<field>.<filtro della collezione referenziata>=<valore>`, a qualsiasi profondità. Corrispondono solo gli elementi referenziati che potete leggere, e il filtro viene combinato con gli altri in AND, anche con `search_or=true`:

```http
GET /api/v2/customers?contact_id.email=*@example.com
GET /api/v2/subscribers?customer_id.contact_id.email=*@example.com&status=active
```

Un tale filtro restituisce 422 se la collezione referenziata non conosce il filtro, se corrisponde a troppi elementi referenziati (10000 per impostazione predefinita) o se la collezione non può applicarlo. `order_by` non accetta tali campi.

### Campi differiti

I campi lista di un elemento possono contenere molte voci, ad esempio gli `alias_numbers` di un abbonato o i `billing_profiles` di un cliente. Per impostazione predefinita vengono restituiti come link con il numero di voci:

```json
{
  "id": 5,
  "alias_numbers": {"type": "link", "url": "/api/v2/subscribers/5/@alias_numbers", "total_count": 3}
}
```

Il link punta al campo come collezione: il percorso dell'elemento, `/@` e il nome del campo. Si legge solo con GET e supporta paginazione, ordinamento e filtri come ogni altra collezione, con i filtri indicati nella sua operazione. Le voci che sono valori semplici, come gli id in `pbx_group_ids`, vi vengono restituite come `{"value": 12}` e si filtrano e ordinano per `value`. Queste collezioni esistono solo per singolo elemento, non esiste `/subscribers/@alias_numbers`.

```http
GET /api/v2/subscribers/5/@alias_numbers?order_by=sn&rows=100&page=2
GET /api/v2/subscribers/5/@pbx_group_ids?value=12
```

`inline` restituisce invece i campi differiti come dati, sia per i singoli elementi sia per le collezioni. I campi differiti di una risposta sono indicati nel parametro `inline` della sua operazione.

| Valore | Restituito come dati |
| --- | --- |
| nomi di campi, separati da virgole | i campi indicati |
| `all` | tutti i campi differiti |
| `auto` | per elemento, ogni campo con al massimo 1000 voci, nell'ordine della pagina finché la risposta resta entro 10000 voci incluse; gli altri restano link |

```http
GET /api/v2/subscribers/5?inline=alias_numbers
GET /api/v2/subscribers?customer_id=3&inline=auto
```

Un campo indicato, o incluso da `all`, con più di 1000 voci restituisce 422 con l'URL della sua collezione: leggetelo lì, pagina per pagina. Lo stesso vale per campi indicati che insieme hanno più di 10000 voci in una risposta (contano tutti gli elementi di una lista e gli elementi espansi): leggete meno righe o usate `auto`. I limiti sono le impostazioni di piattaforma `performance.lazy_load.inline_max_items` (predefinito 1000) e `performance.lazy_load.inline_max_hard_limit` (predefinito 10000). Un nome che non è un campo differito della risposta restituisce 422, `all` e `auto` insieme 400. Alcuni campi sono solo link (`vars` e `preview` dei modelli di fattura): non hanno `total_count` e non possono essere inclusi.

Le scritture con `Prefer: return=representation` restituiscono i loro elementi come GET, quindi accettano anche `inline`. Un link non è un valore: PUT sostituisce l'intero elemento e rifiuta con 422 un link rimandato. Leggete l'elemento con `inline=all` prima di modificarlo con PUT, oppure modificate singoli campi con PATCH. Non tutti i campi inclusi hanno la forma della richiesta: togliete `effective_start_time` dalle voci dei `billing_profiles` di un cliente e inviate i `values` delle condizioni come semplici stringhe invece che come oggetti `{"id", "value"}`.

`expand` di un campo differito lo include, con gli stessi limiti. `expand=all` salta i campi differiti non inclusi, che mantengono il loro link. `all` e `auto` valgono anche per gli elementi espansi, ad esempio `expand=customer_id&inline=auto` restituisce i `billing_profiles` del cliente come dati. In una collezione `@<field>`, `inline` ed `expand` si riferiscono ai campi delle sue voci; le collezioni di valori semplici non accettano `expand` (400).

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

### Limiti delle richieste

Ogni richiesta è limitata, così che una singola richiesta non possa trattenere le altre né la piattaforma. I limiti sono impostazioni di piattaforma dell'API:

| Impostazione | Predefinito | Limita | Oltre |
| --- | --- | --- | --- |
| `performance.read_rows_limit` | `10000` | `rows` di una richiesta GET con risposta JSON | 400 `INVALID_PARAMETER` |
| `performance.write_items_limit` | `10000` | Elementi di una richiesta in blocco: array POST, PUT o PATCH per id, id DELETE; righe di un import CSV; eventi di un import iCalendar | 413 `BULK_TOO_LARGE`, import CSV 413 `CSV_TOO_MANY_ROWS` |
| `performance.write_body_limit` | `20mb` | Corpo JSON della richiesta | 413 `BODY_TOO_LARGE` |
| `performance.write_file_limit` | `50mb` | File caricato: import CSV, iCalendar, modello di fattura | 413 `FILE_TOO_LARGE` |
| `fileshare.limits.upload_size` | `10485760` | Caricamento fileshare, in byte (10 MB), `0` = nessun limite | 413 `FILE_TOO_LARGE` |
| `performance.read_file_limit` | `50mb` | Export CSV (`Accept: text/csv`) | 422 `EXPORT_TOO_LARGE` |
| `performance.lazy_load.inline_max_items` | `1000` | Voci di un campo differito incluso, anche la soglia di `inline=auto` | 422 `INLINE_TOO_LARGE` |
| `performance.lazy_load.inline_max_hard_limit` | `10000` | Voci incluse di una risposta, su tutti i suoi elementi e gli elementi espansi | 422 `INLINE_TOO_LARGE` |
| `expand.filter_max_ids` | `10000` | Elementi referenziati a cui un filtro su un campo referenziato può corrispondere | 422 `EXPAND_NOT_POSSIBLE` |

I conteggi sono numeri interi da 1. Le dimensioni sono un numero con l'unità `b`, `kb`, `mb` o `gb` (multipli di 1024, maiuscole o minuscole, decimali ammessi come `1.5mb`); `fileshare.limits.upload_size` è un semplice numero di byte. Un'impostazione non definita ha il suo valore predefinito. Il messaggio di errore indica il limite configurato, ad es. `The file is larger than the 50mb allowed`.

- Una richiesta in blocco o un import CSV oltre il limite di elementi viene rifiutato prima della validazione dei suoi elementi e non ne viene scritto nulla: suddividetelo in più richieste. Un file CSV viene letto solo fino alla prima riga oltre il limite.
- `rows` vale 10 se non indicato. Non aveva prima un limite superiore: leggete le collezioni grandi pagina per pagina.
- Un export CSV contiene tutte le righe che corrispondono ai filtri di ricerca, lette come uno stato coerente; `rows` e `page` non vi si applicano. Un export oltre il limite viene rifiutato prima di inviare qualsiasi cosa: restringetelo con i filtri di ricerca.
- Campi differiti e filtri su campi referenziati: vedete «Campi differiti» e «Risorse correlate» sopra.

### Data/ora e fusi orari

Esistono due tipi di campi data/ora. Gli schemi qui sotto contrassegnano ogni campo con `x-timezone`:

| Tipo | Campi | Formato | Schema |
| --- | --- | --- | --- |
| Data/ora | `create_timestamp`, `sent_date` e tutti gli altri istanti | RFC 3339 con offset e millisecondi, `2026-12-01T00:00:00.000+01:00` (`…Z` per UTC) | `format: date-time`, `x-timezone: user` |
| Locale (piattaforma) | valori di fatturazione: `billing_profiles` del cliente `start`, `stop`, `effective_start_time`; fattura `period_start`, `period_end` | ora della piattaforma come memorizzata, senza offset, `2026-12-01 00:00:00` | `format: local-date-time` o `local-time`, `x-timezone: platform` |

Il parametro di query `tz` seleziona il fuso orario dei valori data/ora, su ogni route e metodo:

| `tz` | Valori data/ora | Valori locali |
| --- | --- | --- |
| non impostato | il fuso orario dell'utente | ora della piattaforma, come memorizzata |
| nome IANA, ad es. `Europe/Vienna`, `UTC` | quel fuso orario | ora della piattaforma, come memorizzata |
| `owner` | ogni elemento nel fuso orario del suo proprietario (clienti, fatture), gli oggetti espansi in quello del proprio proprietario; il fuso orario dell'utente per le altre risorse | ora della piattaforma, come memorizzata |

Qualsiasi altro valore viene rifiutato con 400 (`errors[].parameter` è `tz`).

Il fuso orario dell'utente è quello dell'account autenticato:

- subscriber, subscriber admin: contatto del subscriber, altrimenti contatto del cliente, altrimenti contatto del reseller, altrimenti quello della piattaforma
- amministratore associato a un reseller: contatto del reseller, altrimenti quello della piattaforma
- altri amministratori e richieste senza autenticazione: quello della piattaforma

Il fuso orario del proprietario di clienti e fatture è quello del contatto del cliente, altrimenti del contatto del reseller, altrimenti quello della piattaforma. Il campo `timezone` di contatti e subscriber accetta nomi IANA o null.

```http
GET /api/v2/customers/7                 "create_timestamp": "2026-11-06T11:31:33.000+01:00"   (system admin)
GET /api/v2/customers/7                 "create_timestamp": "2026-11-06T05:31:33.000-05:00"   (reseller admin in New York)
GET /api/v2/customers/7?tz=owner        "create_timestamp": "2026-11-06T19:31:33.000+09:00"   (customer in Tokyo)
GET /api/v2/customers/7?tz=UTC          "create_timestamp": "2026-11-06T10:31:33.000Z"
```

I valori locali significano ora della piattaforma per tutti e non cambiano mai con `tz`, così la fatturazione funziona come nel rating e nell'emissione delle fatture. Le date non valide o pari a zero memorizzate nel database vengono restituite come null.

I calcoli di fatturazione usano il fuso orario di fatturazione del cliente: il suo fuso orario (come con `tz=owner`) se il suo pacchetto di profili ha la modalità di inizio dell'intervallo di saldo `1st_tz` o `create_tz`, altrimenti quello della piattaforma, come nel rating. Determina il mese di un `period` di fattura e del suo numero di serie, le date e gli orari stampati nel PDF della fattura e l'inizio del primo intervallo di saldo di un nuovo cliente. I valori memorizzati e restituiti restano ora della piattaforma.

L'input segue le stesse regole. Un valore data/ora senza offset, nel corpo di una richiesta o in un filtro, viene letto nel fuso orario che la risposta usa per quel campo; un valore con offset o annotazione di zona viene preso così com'è. Un valore locale senza offset viene memorizzato come fornito; con un offset viene convertito in ora della piattaforma:

| Senza offset | Con offset o zona |
| --- | --- |
| `2026-12-01 00:00:00`, `2026-12-01 00:00:00.123`, `2026-12-01T00:00:00`, `2026-12-01T00:00` | `2026-12-01T00:00:00Z`, `2026-12-01T00:00:00+09:00`, `+0900`, `+09` |
| `2026-12-01` (00:00), `2026-12` (primo giorno, 00:00), `20261201T000000`, `20261201` | `2026-12-01T00:00:00[Asia/Tokyo]`, `2026-12-01T00:00:00+09:00[Asia/Tokyo]` |

Sono accettate fino a 9 cifre frazionarie. I campi locali con solo l'ora accettano `18:00:00` o `18:00` senza offset. Le date settimanali, le date ordinali e `24:00:00` vengono rifiutate. Un valore data/ora senza offset che non esiste o esiste due volte nel suo fuso orario (cambi dell'ora legale) viene rifiutato: inviatelo con un offset, ad es. `2026-10-25T02:30:00+01:00`. Viene rifiutato anche un valore locale che non può essere salvato come ora della piattaforma: senza offset, nell'ora che gli orologi della piattaforma saltano, o con offset, nell'ora ripetuta d'autunno della piattaforma. Nelle query string, codificate il `+` di un offset come `%2B`.

```http
PUT /api/v2/customers/7    "billing_profiles": [{"profile_id": 2, "start": "2026-12-01 05:00"}]            stored as 2026-12-01 05:00:00
PUT /api/v2/customers/7    "billing_profiles": [{"profile_id": 2, "start": "2026-12-01T05:00:00+09:00"}]   stored as 2026-11-30 21:00:00
GET /api/v2/invoices?period_start_ge=2026-12-01                                                          platform time, as listed
POST /api/v2/invoices      "period": "2026-12"   (customer in Tokyo, 1st_tz package)                     period_start 2026-11-30 16:00:00 (Vienna)
```

I valori di query non validi (`tz`, un valore di filtro non interpretabile o ambiguo, `*` su un filtro data/ora) restituiscono 400 con `errors[].parameter`; i valori del corpo non validi restituiscono 422 con `errors[].pointer`.

Mantenete lo stesso `tz` per un GET e per il PUT o PATCH che lo segue, anche per le operazioni `test` di PATCH, che confrontano il valore così come è reso. Le integrazioni e le esportazioni che richiedono valori stabili usano `tz=UTC`. Le voci del journal mantengono `timestamp` come numero epoch Unix e memorizzano `content` in UTC.

Differenze rispetto ad API v1:

- v1 restituisce `YYYY-MM-DD HH:MM:SS` nell'ora del server senza offset; v2 restituisce RFC 3339 con offset, per impostazione predefinita nel fuso orario dell'utente. I valori locali mantengono il formato v1.
- v1 supporta `tz` solo su poche risorse, v2 su tutte, anche per le scritture e i filtri. `use_owner_tz=1` equivale a `tz=owner` (`use_owner_tz` viene rifiutato come parametro sconosciuto).
- v1 legge i valori data/ora senza offset nell'ora del server, v2 nel fuso orario dell'utente. I valori locali sono ora della piattaforma in entrambe.
- Un `tz` non valido restituisce 400 (v1: 422 o ignorato). I valori di filtro con offset vengono convertiti correttamente, e i valori data/ora ambigui a causa dell'ora legale vengono rifiutati anziché risolti silenziosamente.
- I periodi di fattura (`period`), i numeri di serie e le date del PDF seguono il fuso orario di fatturazione del cliente, e il primo intervallo di saldo di un cliente con un pacchetto `1st_tz`/`create_tz` inizia a mezzanotte nel suo fuso orario (v1: ora del server o UTC).

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
