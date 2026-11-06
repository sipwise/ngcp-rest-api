## Konzepte

API v2 ist die REST-Schnittstelle für die Provisionierung und den Betrieb der NGCP-Plattform. Gegenüber API v1 bietet sie Bulk-Provisionierung, eine strikte Validierung jeder Anfrage, bei der unbekannte Felder und Query-Parameter abgelehnt statt ignoriert werden, sowie erweiterte Funktionen. Sie ist durch ein OpenAPI-3-Dokument beschrieben, aus dem diese Seite erzeugt wird.

### Basis-URLs

| Konto | Basis-URL |
| --- | --- |
| Administrator mit beliebiger Rolle (z. B. Reseller, Customer Care) | `https://ngcp.example.com:1443/api/v2` |
| Subscriber mit beliebiger Rolle (Subscriber, Subscriber-Admin) | `https://ngcp.example.com/api/v2` |

Das OpenAPI-Dokument selbst steht für Codegeneratoren und API-Werkzeuge unter `<base URL>/swagger.json` und `<base URL>/swagger.yaml` bereit.

### Anfragen

Senden Sie mit jeder Anfrage `Accept: application/json`. Ohne diesen Header verwenden Antworten HAL+JSON (`_links`, `_embedded`), das Standardformat. Anfrage-Bodys sind JSON (`Content-Type: application/json`), außer bei PATCH, das ein JSON-Patch-Dokument erwartet (`application/json-patch+json`).

Einige Collections, etwa Telefonbücher, lassen sich auch als CSV-Dateien austauschen. CSV fordern Sie mit `Accept: text/csv` an:

```shell
curl -u 'administrator:secret' -H 'Accept: text/csv' -o phonebook.csv \
  https://ngcp.example.com:1443/api/v2/customers/3/phonebook
```

Um eine CSV-Datei zu importieren, laden Sie sie als `multipart/form-data` in einem Teil namens `file` hoch. Ihre Spalten sind die Felder der Einträge:

```shell
curl -u 'administrator:secret' -H 'Accept: application/json' \
  -F 'file=@phonebook.csv;type=text/csv' \
  https://ngcp.example.com:1443/api/v2/customers/3/phonebook
```

### Antworten

Eine Collection liefert eine Seite mit Einträgen sowie die Anzahl aller passenden Einträge:

```json
{
  "total_count": 2,
  "data": [
    {"id": 7, "email": "alice@example.com", "firstname": "Alice", "status": "active"},
    {"id": 9, "email": "bob@example.com", "firstname": "Bob", "status": "active"}
  ]
}
```

Der Header `Prefer` steuert, was eine schreibende Anfrage zurückgibt. Ohne ihn liefert ein POST für einen Eintrag den erstellten Eintrag in `data`, PUT, PATCH und DELETE liefern 204 ohne Body. Anlegen eines Kontakts mit jedem `Prefer`-Wert:

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

### Paging, Sortieren und Filtern

| Parameter | Bedeutung |
| --- | --- |
| `page`, `rows` | Seitennummer, beginnend bei 1, und Seitengröße (Standard 10). |
| `order_by`, `order_by_direction` | Sortierfeld und `asc` (Standard) oder `desc`. |
| jedes Feld der Collection | Filter. Werte müssen exakt übereinstimmen, `*` ist ein Platzhalter, ein Komma trennt Alternativen. |
| `search_or=1` | Mehrere Filter mit OR statt AND verknüpfen. |

Die Filter, die eine Collection unterstützt, sind unten bei ihrer GET-Operation aufgeführt. Unbekannte Query-Parameter werden mit 400 abgelehnt.

```http
GET /api/v2/customercontacts?email=*@example.com,*@example.org&status=active&order_by=id&rows=50&page=2
```

Auch ein Filter auf `id` liefert eine Collection; so lassen sich mehrere Einträge mit einer Anfrage lesen:

```http
GET /api/v2/customercontacts?id=1,3,5
GET /api/v2/admins?login=alice,bob,carol*
```

### Verknüpfte Ressourcen

Referenzfelder wie `reseller_id` oder `contract_id` lassen sich mit `expand` in derselben Anfrage auflösen. Der referenzierte Eintrag wird als `<field>_expand` hinzugefügt, ein Punkt geht eine Ebene tiefer:

```http
GET /api/v2/resellers/1?expand=contract_id.contact_id
```

Ein Feld, das nicht expandiert werden kann, führt zu 422. Mit `soft_expand=1` werden solche Felder stattdessen übersprungen.

### Daten anlegen und ändern

Jede Methode arbeitet auf einem Eintrag oder, auf dem Collection-Pfad, auf mehreren Einträgen in einer Anfrage:

| Methode | Ein Eintrag | Mehrere Einträge | Erfolg |
| --- | --- | --- | --- |
| POST | `/resource` mit einem Objekt | `/resource` mit einem Array von Objekten | 201 |
| PUT | `/resource/{id}` mit dem vollständigen Objekt | `/resource` mit Objekten, nach id indiziert | 204 |
| PATCH | `/resource/{id}` mit JSON-Patch-Operationen | `/resource` mit Operationen, nach id indiziert | 204 |
| DELETE | `/resource/{id}` | `/resource` mit einem Array von ids | 204 |

PUT ersetzt den Eintrag, weggelassene Felder werden also zurückgesetzt. PATCH ([RFC 6902](https://www.rfc-editor.org/rfc/rfc6902)) ändert nur die angegebenen Felder.

#### Einzelne Einträge

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

#### Bulk

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

Ein Bulk-POST ohne `Prefer` liefert 204; fordern Sie daher `return=id` oder `return=representation` an, um die neuen ids zu erhalten.

### Fehler

Jeder Fehler hat denselben JSON-Body:

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

- `tx` identifiziert die Anfrage im Server-Log (`/var/log/ngcp/rest-api.log`). Geben Sie diesen Wert an, wenn Sie ein Problem melden.
- `error` ist der Text des HTTP-Status, `message` ein lesbarer Text.
- `errorCode` ist der maschinenlesbare Code des Fehlers: `VALIDATION_FAILED` (ungültiger Body), `INVALID_PARAMETER` (ungültiger Pfad- oder Query-Parameter), `INVALID_JSON` (der Body ist kein JSON), `INVALID_JSON_PATCH` (fehlerhafter JSON Patch), `JSON_PATCH_CONFLICT` (der JSON Patch lässt sich nicht auf den Eintrag anwenden), ein spezifischer Code wie `RESELLER_ID_INVALID` oder sonst der Name des Status, z. B. `NOT_FOUND` oder `FORBIDDEN`.
- `errors` listet die einzelnen Fehler auf, ein Eintrag pro fehlgeschlagener Prüfung, in der Reihenfolge der Anfrage. Ohne Fehler entfällt das Feld. Standardmäßig werden höchstens 100 Einträge zurückgegeben; `message` nennt dann die Gesamtzahl.

Das OpenAPI-Dokument (`swagger.json`, `swagger.yaml`) beschreibt diesen Body als Schema `ErrorResponse` mit Einträgen vom Typ `ErrorEntry`; die Antworten `4XX` und `5XX` jeder Operation verweisen darauf.

Werten Sie `errorCode` und den `code` der Einträge aus, nie `message`: Die Texte können sich ändern. Die `code`-Werte sind die Namen der fehlgeschlagenen Prüfungen (`isEnum`, `isNotEmpty`, `whitelistValidation` für ein Feld, das nicht gesendet werden darf, `containsNumber`), der JSON-Patch-Fehler (`TEST_OPERATION_FAILED`) oder ein spezifischer Code.

Ein Eintrag verweist mit `pointer` auf den fehlerhaften Wert, einen [JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901) in den Request-Body, oder nennt den fehlerhaften `parameter` des Pfads oder Query-Strings:

| Anfrage | Pointer |
| --- | --- |
| POST, PUT eines Eintrags | `/email`, verschachtelt `/rules/1/match_pattern` |
| Bulk-POST (Array) | `/<index>/email` |
| Bulk-PUT, -PATCH (nach id indiziert) | `/<id>/email` |
| PATCH, ungültiger Wert (422) | das Feld im geänderten Eintrag, z. B. `/email` |
| PATCH, fehlerhafte oder in Konflikt stehende Operation (400, 409) | das Member der Operation im Patch-Dokument: `/0/op`, `/0/path`, `/0/value`; bei Bulk `/<id>/0/path` |
| CSV-Import | `/<row>/email`, Zeilen ab 0 nach der Kopfzeile gezählt |

Indizes zählen ab 0: das Element eines Bulk-POST (`/0` ist das erste Element), die Operation eines JSON Patch (`/0/op`), die Id in der Id-Liste eines Bulk-DELETE und die CSV-Datenzeile ohne die Kopfzeile.

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

Ein verschachteltes Feld wird mit seinem vollständigen Pfad adressiert, hier die zweite eingebettete Regel eines neuen Rewrite-Rule-Sets:

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

Prüfungen gegen gespeicherte Daten, etwa eine unbekannte `reseller_id` oder ein bereits vorhandener Name, liefern dieselben Einträge mit dem spezifischen Code als `code`. Der Pointer nennt das Feld oder den Eintrag als Ganzes (`/<index>`, `/<id>`, der leere Pointer bei einem einzelnen Eintrag). Jeder fehlerhafte Eintrag wird mit seinem eigenen Code aufgeführt; `errorCode` und `message` sind die des ersten Eintrags.

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

IDs eines Bulk-PUT, -PATCH oder -DELETE, die nicht existieren oder für Sie nicht sichtbar sind, liefern 422 `ENTRY_NOT_FOUND` mit einem Eintrag pro ID: `/<id>` in einem PUT- oder PATCH-Body, `/<index>` in einer DELETE-ID-Liste. Ein über seine ID im Pfad angesprochener Eintrag liefert 404.

400 bedeutet, dass die Anfrage nicht interpretiert werden kann (fehlerhaftes JSON oder JSON Patch, ungültiger Parameter), 409, dass sich ein wohlgeformter JSON Patch nicht auf den aktuellen Eintrag anwenden lässt (fehlgeschlagener `test`, nicht vorhandener Pfad), 422, dass wohlgeformter Inhalt nicht gültig ist.

| Code | Typische Ursache |
| --- | --- |
| 400 | Fehlerhaftes JSON oder JSON Patch, unbekannter oder ungültiger Parameter. |
| 401 | Fehlende oder falsche Zugangsdaten. |
| 403 | Für Ihre Rolle nicht erlaubt, Benutzer nur mit Lesezugriff, Passwort abgelaufen, Login gesperrt, TOTP fehlt oder ungültig. |
| 404 | Der Eintrag existiert nicht oder ist für Sie nicht sichtbar. |
| 409 | Der JSON Patch lässt sich nicht auf den Eintrag anwenden. |
| 415 | Kein `Content-Type` und der Body ist kein JSON. |
| 422 | Validierung fehlgeschlagen, doppelter Wert, Feld kann nicht expandiert werden. |
| 423 | Der Eintrag wird noch verwendet, z. B. ein Kontakt, der an einen Vertrag gebunden ist. |
| 500, 503 | Serverseitiges Problem. Melden Sie es mit dem `tx`. |

### Journal

Über die API vorgenommene Änderungen werden protokolliert. `GET /<resource>/{id}/journal` listet die Änderungen eines Eintrags auf: wer sie wann vorgenommen hat, die Operation und die resultierenden Daten. `GET /journals` durchsucht das Journal aller Ressourcen.
