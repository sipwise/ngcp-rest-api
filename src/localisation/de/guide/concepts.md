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
| `page`, `rows` | Seitennummer, beginnend bei 1, und Seitengröße (Standard 10, höchstens 10000). |
| `order_by`, `order_by_direction` | Sortierfeld und `asc` (Standard) oder `desc`. |
| jedes Feld der Collection | Filter. Werte müssen exakt übereinstimmen, `*` ist ein Platzhalter, ein Komma trennt Alternativen. |
| `search_or=true` | Mehrere Filter mit OR statt AND verknüpfen. |

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

Referenzfelder wie `reseller_id` oder `contract_id` lassen sich mit `expand`, einer kommagetrennten Liste von Feldern, in derselben Anfrage auflösen. Der referenzierte Eintrag wird als `<field>_expand` hinzugefügt, ein Punkt geht eine Ebene tiefer. Es ist derselbe Eintrag, den die referenzierte Collection Ihnen liefert, und eine Collection wird mit einem Lesezugriff pro Feld aufgelöst. Die expandierbaren Felder stehen beim Parameter `expand` jeder Operation, `all` expandiert alle:

```http
GET /api/v2/resellers/1?expand=contract_id.contact_id
GET /api/v2/subscribers?expand=customer_id,domain_id
```

Ein Feld, das nicht expandiert werden kann, führt zu 422, ein referenzierter Eintrag, den Sie nicht lesen dürfen, zu 403. Mit `soft_expand=true` erhalten Sie stattdessen nur, was expandiert werden kann: solche Felder und Einträge fehlen dann. Ein fehlerhafter Pfad wie `a..b` führt in jedem Fall zu 400.

`expand` und `soft_expand` gibt es nur bei GET-Anfragen mit JSON-Antwort, also z. B. nicht bei schreibenden Anfragen, unter `/auth` oder mit `Accept: text/csv`: dort führen sie zu 400, außer mit `soft_expand=true`.

Collections lassen sich auch nach Feldern referenzierter Einträge filtern: `<field>.<Filter der referenzierten Collection>=<Wert>`, in beliebiger Tiefe. Es treffen nur referenzierte Einträge zu, die Sie lesen dürfen, und der Filter wird mit den übrigen per AND verknüpft, auch mit `search_or=true`:

```http
GET /api/v2/customers?contact_id.email=*@example.com
GET /api/v2/subscribers?customer_id.contact_id.email=*@example.com&status=active
```

Ein solcher Filter führt zu 422, wenn die referenzierte Collection den Filter nicht kennt, wenn er zu viele referenzierte Einträge trifft (standardmäßig 10000) oder wenn die Collection ihn nicht anwenden kann. `order_by` nimmt keine solchen Felder.

### Lazy-Felder

Listenfelder eines Eintrags können viele Einträge enthalten, z. B. die `alias_numbers` eines Subscribers oder die `billing_profiles` eines Kunden. Standardmäßig werden sie als Link mit der Anzahl der Einträge geliefert:

```json
{
  "id": 5,
  "alias_numbers": {"type": "link", "url": "/api/v2/subscribers/5/@alias_numbers", "total_count": 3}
}
```

Der Link zeigt auf das Feld als Collection: Pfad des Eintrags, `/@` und Feldname. Sie wird nur mit GET gelesen und unterstützt Paging, Sortieren und Filtern wie jede andere Collection, mit den Filtern, die bei ihrer Operation aufgeführt sind. Einträge, die einfache Werte sind, etwa die IDs in `pbx_group_ids`, werden dort als `{"value": 12}` geliefert und nach `value` gefiltert und sortiert. Diese Collections gibt es nur pro Eintrag, ein `/subscribers/@alias_numbers` gibt es nicht.

```http
GET /api/v2/subscribers/5/@alias_numbers?order_by=sn&rows=100&page=2
GET /api/v2/subscribers/5/@pbx_group_ids?value=12
```

`inline` liefert Lazy-Felder stattdessen als Daten, bei einzelnen Einträgen und bei Collections. Die Lazy-Felder einer Antwort sind beim Parameter `inline` ihrer Operation aufgeführt.

| Wert | Als Daten geliefert |
| --- | --- |
| Feldnamen, kommagetrennt | die genannten Felder |
| `all` | jedes Lazy-Feld |
| `auto` | pro Eintrag jedes Feld mit höchstens 1000 Einträgen, in Seitenreihenfolge, solange die Antwort höchstens 10000 eingebettete Einträge hat; die übrigen bleiben Links |

```http
GET /api/v2/subscribers/5?inline=alias_numbers
GET /api/v2/subscribers?customer_id=3&inline=auto
```

Ein genanntes oder durch `all` eingebettetes Feld mit mehr als 1000 Einträgen führt zu 422 mit der URL seiner Collection: lesen Sie es dort seitenweise. Ebenso genannte Felder, die zusammen mehr als 10000 Einträge in einer Antwort haben (alle Einträge einer Liste und expandierte Einträge zählen): lesen Sie weniger Zeilen oder verwenden Sie `auto`. Die Limits sind die Plattform-Einstellungen `performance.lazy_load.inline_max_items` (Standard 1000) und `performance.lazy_load.inline_max_hard_limit` (Standard 10000). Ein Name, der kein Lazy-Feld der Antwort ist, führt zu 422, `all` und `auto` zusammen zu 400. Manche Felder sind nur Links (`vars` und `preview` von Rechnungsvorlagen): sie haben kein `total_count` und lassen sich nicht einbetten.

Schreibende Anfragen mit `Prefer: return=representation` liefern ihre Einträge wie GET, daher nehmen auch sie `inline`. Ein Link ist kein Wert: PUT ersetzt den ganzen Eintrag und lehnt einen zurückgeschickten Link mit 422 ab. Lesen Sie den Eintrag mit `inline=all`, bevor Sie ihn mit PUT ändern, oder ändern Sie einzelne Felder mit PATCH. Nicht jedes eingebettete Feld hat die Form der Anfrage: entfernen Sie `effective_start_time` aus den Einträgen der Kunden-`billing_profiles` und senden Sie die `values` von Conditions als einfache Strings statt als `{"id", "value"}`-Objekte.

`expand` eines Lazy-Felds bettet es ein, mit denselben Limits. `expand=all` überspringt Lazy-Felder, die nicht eingebettet sind, sie behalten ihren Link. `all` und `auto` gelten auch für expandierte Einträge, z. B. liefert `expand=customer_id&inline=auto` die `billing_profiles` des Kunden als Daten. Bei einer `@<field>`-Collection beziehen sich `inline` und `expand` auf die Felder ihrer Einträge; Collections einfacher Werte nehmen kein `expand` (400).

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

### Anfragelimits

Jede Anfrage ist begrenzt, damit eine einzelne Anfrage die anderen oder die Plattform nicht aufhält. Die Limits sind Plattform-Einstellungen der API:

| Einstellung | Standard | Begrenzt | Darüber |
| --- | --- | --- | --- |
| `performance.read_rows_limit` | `10000` | `rows` einer GET-Anfrage mit JSON-Antwort | 400 `INVALID_PARAMETER` |
| `performance.write_items_limit` | `10000` | Einträge einer Bulk-Anfrage: POST-Array, PUT oder PATCH nach ID, DELETE-IDs; Zeilen eines CSV-Imports; Events eines iCalendar-Imports | 413 `BULK_TOO_LARGE`, CSV-Import 413 `CSV_TOO_MANY_ROWS` |
| `performance.write_body_limit` | `20mb` | JSON-Request-Body | 413 `BODY_TOO_LARGE` |
| `performance.write_file_limit` | `50mb` | Hochgeladene Datei: CSV-Import, iCalendar, Rechnungsvorlage | 413 `FILE_TOO_LARGE` |
| `fileshare.limits.upload_size` | `10485760` | Fileshare-Upload, in Bytes (10 MB), `0` = kein Limit | 413 `FILE_TOO_LARGE` |
| `performance.read_file_limit` | `50mb` | CSV-Export (`Accept: text/csv`) | 422 `EXPORT_TOO_LARGE` |
| `performance.lazy_load.inline_max_items` | `1000` | Einträge eines eingebetteten Lazy-Felds, auch die Schwelle von `inline=auto` | 422 `INLINE_TOO_LARGE` |
| `performance.lazy_load.inline_max_hard_limit` | `10000` | Eingebettete Einträge einer Antwort, über alle ihre Einträge und expandierten Einträge | 422 `INLINE_TOO_LARGE` |
| `expand.filter_max_ids` | `10000` | Verknüpfte Einträge, auf die ein Filter auf ein verknüpftes Feld passen darf | 422 `EXPAND_NOT_POSSIBLE` |

Anzahlen sind ganze Zahlen ab 1. Größen sind eine Zahl mit der Einheit `b`, `kb`, `mb` oder `gb` (Vielfache von 1024, Groß-/Kleinschreibung egal, Dezimalzahlen erlaubt wie `1.5mb`); `fileshare.limits.upload_size` ist eine reine Anzahl Bytes. Eine nicht gesetzte Einstellung hat ihren Standardwert. Die Fehlermeldung nennt das eingestellte Limit, z. B. `The file is larger than the 50mb allowed`.

- Eine Bulk-Anfrage oder ein CSV-Import über dem Eintragslimit wird abgelehnt, bevor ihre Einträge validiert werden, und nichts davon wird geschrieben: teilen Sie sie auf mehrere Anfragen auf. Eine CSV-Datei wird nur bis zur ersten Zeile über dem Limit gelesen.
- `rows` ist 10, wenn nicht angegeben. Es hatte bisher keine Obergrenze: lesen Sie größere Collections seitenweise.
- Ein CSV-Export enthält alle Zeilen, die den Suchfiltern entsprechen, gelesen als ein konsistenter Stand; `rows` und `page` gelten für ihn nicht. Ein Export über dem Limit wird abgelehnt, bevor etwas gesendet wird: schränken Sie ihn mit Suchfiltern ein.
- Lazy-Felder und Filter auf verknüpfte Felder: siehe „Lazy-Felder“ und „Verknüpfte Ressourcen“ oben.

### Datum/Uhrzeit und Zeitzonen

Es gibt zwei Arten von Datum/Uhrzeit-Feldern. Die Schemas unten kennzeichnen jedes Feld mit `x-timezone`:

| Art | Felder | Format | Schema |
| --- | --- | --- | --- |
| Datum/Uhrzeit | `create_timestamp`, `sent_date` und alle anderen Zeitpunkte | RFC 3339 mit Offset und Millisekunden, `2026-12-01T00:00:00.000+01:00` (`…Z` für UTC) | `format: date-time`, `x-timezone: user` |
| Lokal (Plattform) | Abrechnungswerte: Customer `billing_profiles` `start`, `stop`, `effective_start_time`; Rechnung `period_start`, `period_end` | Plattformzeit wie gespeichert, ohne Offset, `2026-12-01 00:00:00` | `format: local-date-time` oder `local-time`, `x-timezone: platform` |

Der Query-Parameter `tz` wählt die Zeitzone der Datum/Uhrzeit-Werte, bei jeder Route und Methode:

| `tz` | Datum/Uhrzeit-Werte | Lokale Werte |
| --- | --- | --- |
| nicht gesetzt | die Zeitzone des Benutzers | Plattformzeit, wie gespeichert |
| IANA-Name, z. B. `Europe/Vienna`, `UTC` | diese Zeitzone | Plattformzeit, wie gespeichert |
| `owner` | jeder Eintrag in der Zeitzone seines Eigentümers (Customers, Rechnungen), expandierte Objekte in der ihres eigenen Eigentümers; die Zeitzone des Benutzers bei anderen Ressourcen | Plattformzeit, wie gespeichert |

Jeder andere Wert wird mit 400 abgelehnt (`errors[].parameter` ist `tz`).

Die Zeitzone des Benutzers ist die Zeitzone des authentifizierten Accounts:

- Subscriber, Subscriber-Admin: Subscriber-Kontakt, sonst Customer-Kontakt, sonst Reseller-Kontakt, sonst die der Plattform
- Administrator, der an einen Reseller gebunden ist: Reseller-Kontakt, sonst die der Plattform
- andere Administratoren und Anfragen ohne Authentifizierung: die der Plattform

Die Zeitzone des Eigentümers von Customers und Rechnungen ist die des Customer-Kontakts, sonst des Reseller-Kontakts, sonst die der Plattform. Das Feld `timezone` von Kontakten und Subscribern akzeptiert IANA-Namen oder null.

```http
GET /api/v2/customers/7                 "create_timestamp": "2026-11-06T11:31:33.000+01:00"   (system admin)
GET /api/v2/customers/7                 "create_timestamp": "2026-11-06T05:31:33.000-05:00"   (reseller admin in New York)
GET /api/v2/customers/7?tz=owner        "create_timestamp": "2026-11-06T19:31:33.000+09:00"   (customer in Tokyo)
GET /api/v2/customers/7?tz=UTC          "create_timestamp": "2026-11-06T10:31:33.000Z"
```

Lokale Werte bedeuten für alle Plattformzeit und ändern sich nie mit `tz`, sodass die Abrechnung wie beim Rating und bei der Rechnungsstellung funktioniert. Ungültige oder Null-Datumswerte in der Datenbank werden als null zurückgegeben.

Abrechnungsberechnungen verwenden die Abrechnungszeitzone des Kunden: seine eigene Zeitzone (wie bei `tz=owner`), wenn sein Profilpaket den Startmodus des Guthabenintervalls `1st_tz` oder `create_tz` hat, sonst die der Plattform, wie beim Rating. Sie bestimmt den Monat eines Rechnungs-`period` und seiner Seriennummer, die im Rechnungs-PDF gedruckten Datums- und Uhrzeitwerte und den Beginn des ersten Guthabenintervalls eines neuen Kunden. Gespeicherte und zurückgegebene Werte bleiben Plattformzeit.

Die Eingabe folgt denselben Regeln. Ein Datum/Uhrzeit-Wert ohne Offset, in einem Request-Body oder einem Filter, wird in der Zeitzone gelesen, die die Antwort für dieses Feld verwendet; ein Wert mit Offset oder Zonenangabe wird unverändert übernommen. Ein lokaler Wert ohne Offset wird wie angegeben gespeichert; mit Offset wird er in Plattformzeit umgerechnet:

| Ohne Offset | Mit Offset oder Zone |
| --- | --- |
| `2026-12-01 00:00:00`, `2026-12-01 00:00:00.123`, `2026-12-01T00:00:00`, `2026-12-01T00:00` | `2026-12-01T00:00:00Z`, `2026-12-01T00:00:00+09:00`, `+0900`, `+09` |
| `2026-12-01` (00:00), `2026-12` (erster Tag, 00:00), `20261201T000000`, `20261201` | `2026-12-01T00:00:00[Asia/Tokyo]`, `2026-12-01T00:00:00+09:00[Asia/Tokyo]` |

Bis zu 9 Nachkommastellen werden akzeptiert. Lokale Felder nur mit Uhrzeit nehmen `18:00:00` oder `18:00` ohne Offset. Wochendaten, Ordinaldaten und `24:00:00` werden abgelehnt. Ein Datum/Uhrzeit-Wert ohne Offset, der in seiner Zeitzone nicht existiert oder doppelt vorkommt (Sommerzeitwechsel), wird abgelehnt: Senden Sie ihn mit Offset, z. B. `2026-10-25T02:30:00+01:00`. Ebenso abgelehnt wird ein lokaler Wert, der sich nicht als Plattformzeit speichern lässt: ohne Offset in der Zeit, die die Uhren der Plattform überspringen, oder mit Offset in der doppelten Herbststunde der Plattform. In Query-Strings wird das `+` eines Offsets als `%2B` kodiert.

```http
PUT /api/v2/customers/7    "billing_profiles": [{"profile_id": 2, "start": "2026-12-01 05:00"}]            stored as 2026-12-01 05:00:00
PUT /api/v2/customers/7    "billing_profiles": [{"profile_id": 2, "start": "2026-12-01T05:00:00+09:00"}]   stored as 2026-11-30 21:00:00
GET /api/v2/invoices?period_start_ge=2026-12-01                                                          platform time, as listed
POST /api/v2/invoices      "period": "2026-12"   (customer in Tokyo, 1st_tz package)                     period_start 2026-11-30 16:00:00 (Vienna)
```

Ungültige Query-Werte (`tz`, ein nicht auswertbarer oder mehrdeutiger Filterwert, `*` bei einem Datum/Uhrzeit-Filter) liefern 400 mit `errors[].parameter`; ungültige Body-Werte liefern 422 mit `errors[].pointer`.

Verwenden Sie für ein GET und das darauf folgende PUT oder PATCH dasselbe `tz`, auch bei PATCH-`test`-Operationen, die den Wert so vergleichen, wie er dargestellt wird. Integrationen und Exporte, die stabile Werte benötigen, verwenden `tz=UTC`. Journal-Einträge behalten `timestamp` als Unix-Epoch-Zahl und speichern `content` in UTC.

Unterschiede zu API v1:

- v1 liefert `YYYY-MM-DD HH:MM:SS` in Serverzeit ohne Offset; v2 liefert RFC 3339 mit Offset, standardmäßig in der Zeitzone des Benutzers. Lokale Werte behalten das v1-Format.
- v1 unterstützt `tz` nur bei wenigen Ressourcen, v2 bei allen, auch bei Schreibzugriffen und Filtern. `use_owner_tz=1` entspricht `tz=owner` (`use_owner_tz` wird als unbekannter Parameter abgelehnt).
- v1 liest Datum/Uhrzeit-Werte ohne Offset in Serverzeit, v2 in der Zeitzone des Benutzers. Lokale Werte sind in beiden Plattformzeit.
- Ein ungültiges `tz` liefert 400 (v1: 422 oder ignoriert). Filterwerte mit Offset werden korrekt umgerechnet, und Datum/Uhrzeit-Werte, die wegen der Sommerzeit mehrdeutig sind, werden abgelehnt, statt stillschweigend aufgelöst zu werden.
- Rechnungszeiträume (`period`), Seriennummern und PDF-Datumswerte folgen der Abrechnungszeitzone des Kunden, und das erste Guthabenintervall eines Kunden mit einem `1st_tz`/`create_tz`-Paket beginnt um Mitternacht in seiner Zeitzone (v1: Serverzeit oder UTC).

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
