## Concepts

API v2 is the REST interface for provisioning and operating the NGCP platform. Compared to API v1 it adds bulk provisioning, strict validation of every request, where unknown fields and query parameters are rejected instead of ignored, and extended features. It is described by an OpenAPI 3 document, which this page is generated from.

### Base URLs

| Account | Base URL |
| --- | --- |
| Administrator, of any role (e.g. reseller, customer care) | `https://ngcp.example.com:1443/api/v2` |
| Subscriber, of any role (subscriber, subscriber admin) | `https://ngcp.example.com/api/v2` |

The OpenAPI document itself is available at `<base URL>/swagger.json` and `<base URL>/swagger.yaml`, for code generators and API tools.

### Requests

Send `Accept: application/json` with every request. Without it, responses use HAL+JSON (`_links`, `_embedded`), which is the default. Request bodies are JSON (`Content-Type: application/json`), except for PATCH, which takes a JSON Patch document (`application/json-patch+json`).

Some collections, such as phonebooks, can also be exchanged as CSV files. Ask for CSV with `Accept: text/csv`:

```shell
curl -u 'administrator:secret' -H 'Accept: text/csv' -o phonebook.csv \
  https://ngcp.example.com:1443/api/v2/customers/3/phonebook
```

To import a CSV file, upload it as `multipart/form-data` in a part named `file`. Its columns are the fields of the items:

```shell
curl -u 'administrator:secret' -H 'Accept: application/json' \
  -F 'file=@phonebook.csv;type=text/csv' \
  https://ngcp.example.com:1443/api/v2/customers/3/phonebook
```

### Responses

A collection returns one page of items and the number of all items that match:

```json
{
  "total_count": 2,
  "data": [
    {"id": 7, "email": "alice@example.com", "firstname": "Alice", "status": "active"},
    {"id": 9, "email": "bob@example.com", "firstname": "Bob", "status": "active"}
  ]
}
```

The `Prefer` header controls what a write request returns. Without it, POST of one item returns the created item in `data`, and PUT, PATCH and DELETE return 204 without a body. Creating a contact with each `Prefer` value:

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

### Paging, sorting and filtering

| Parameter | Meaning |
| --- | --- |
| `page`, `rows` | Page number, starting at 1, and page size (default 10). |
| `order_by`, `order_by_direction` | Sort field and `asc` (default) or `desc`. |
| any field of the collection | Filter. Values match exactly, `*` is a wildcard and a comma separates alternatives. |
| `search_or=true` | Combine several filters with OR instead of AND. |

The filters a collection supports are listed with its GET operation below. Unknown query parameters are rejected with 400.

```http
GET /api/v2/customercontacts?email=*@example.com,*@example.org&status=active&order_by=id&rows=50&page=2
```

Filtering by `id` returns a collection, too, which is a way to read several items in one request:

```http
GET /api/v2/customercontacts?id=1,3,5
GET /api/v2/admins?login=alice,bob,carol*
```

### Related resources

Reference fields such as `reseller_id` or `contract_id` can be resolved in the same request with `expand`, a comma separated list of fields. The referenced item is added as `<field>_expand`, and a dot goes one level deeper. It is the same item the referenced collection returns to you, and a collection is resolved with one read per field. The expandable fields are listed with the `expand` parameter of each operation, `all` expands all of them:

```http
GET /api/v2/resellers/1?expand=contract_id.contact_id
GET /api/v2/subscribers?expand=customer_id,domain_id
```

A field that cannot be expanded returns 422, a referenced item you may not read 403. With `soft_expand=true` you get only what can be expanded instead: such fields and items are left out. A malformed path such as `a..b` returns 400 in any case.

`expand` and `soft_expand` are accepted on GET requests with a JSON response only, e.g. not on writes, on `/auth` or with `Accept: text/csv`: there they return 400, unless `soft_expand=true` is given.

Collections can also be filtered by the fields of referenced items: `<field>.<filter of the referenced collection>=<value>`, at any depth. Only referenced items you may read match, and the filter is combined with the others with AND, also with `search_or=true`:

```http
GET /api/v2/customers?contact_id.email=*@example.com
GET /api/v2/subscribers?customer_id.contact_id.email=*@example.com&status=active
```

Such a filter returns 422 when the referenced collection does not know the filter, when it matches too many referenced items (10000 by default), or when the collection cannot apply it. `order_by` takes no such fields.

### Lazy fields

List fields of an item can hold many entries, e.g. the `alias_numbers` of a subscriber or the `billing_profiles` of a customer. By default they are returned as a link with the number of entries:

```json
{
  "id": 5,
  "alias_numbers": {"type": "link", "url": "/api/v2/subscribers/5/@alias_numbers", "total_count": 3}
}
```

The link points to the field as a collection: the item path, `/@` and the field name. It is read with GET only and pages, sorts and filters like any other collection, with the filters listed with its operation. Entries that are plain values, such as the ids in `pbx_group_ids`, are returned as `{"value": 12}` there and are filtered and sorted by `value`. These collections exist per item only, there is no `/subscribers/@alias_numbers`.

```http
GET /api/v2/subscribers/5/@alias_numbers?order_by=sn&rows=100&page=2
GET /api/v2/subscribers/5/@pbx_group_ids?value=12
```

`inline` returns lazy fields as data instead, on single items and on collections. The lazy fields of a response are listed with the `inline` parameter of its operation.

| Value | Returned as data |
| --- | --- |
| field names, comma separated | the named fields |
| `all` | every lazy field |
| `auto` | per item, each field with at most 1000 entries, in page order while the response stays within 10000 inlined entries; the others stay links |

```http
GET /api/v2/subscribers/5?inline=alias_numbers
GET /api/v2/subscribers?customer_id=3&inline=auto
```

A named field, or one inlined by `all`, with more than 1000 entries returns 422 with the url of its collection: read it from there, page by page. So do named fields that together have more than 10000 entries in one response (all items of a list and expanded items count): read fewer rows or use `auto`. The limits are the platform settings `performance.lazy_load.inline_max_items` (default 1000) and `performance.lazy_load.inline_max_hard_limit` (default 10000). A name that is not a lazy field of the response returns 422, `all` and `auto` together 400. Some fields are links only (`vars` and `preview` of invoice templates): they have no `total_count` and cannot be inlined.

Write requests with `Prefer: return=representation` return their items like GET, so they take `inline` as well. A link is not a value: PUT replaces the whole item and rejects a link it gets back with 422. Read the item with `inline=all` before changing it with PUT, or change single fields with PATCH. Not every inlined field has the shape of the request: drop `effective_start_time` from the entries of customer `billing_profiles`, and send condition `values` as plain strings instead of `{"id", "value"}` objects.

`expand` of a lazy field inlines it, with the same limits. `expand=all` skips lazy fields that are not inlined, they keep their link. `all` and `auto` also apply to expanded items, e.g. `expand=customer_id&inline=auto` returns the customer's `billing_profiles` as data. On a `@<field>` collection, `inline` and `expand` refer to the fields of its entries; collections of plain values take no `expand` (400).

### Creating and changing data

Every method works on one item or, on the collection path, on several items in one request:

| Method | One item | Several items | Success |
| --- | --- | --- | --- |
| POST | `/resource` with an object | `/resource` with an array of objects | 201 |
| PUT | `/resource/{id}` with the complete object | `/resource` with objects keyed by id | 204 |
| PATCH | `/resource/{id}` with JSON Patch operations | `/resource` with operations keyed by id | 204 |
| DELETE | `/resource/{id}` | `/resource` with an array of ids | 204 |

PUT replaces the item, so fields left out are reset. PATCH ([RFC 6902](https://www.rfc-editor.org/rfc/rfc6902)) changes only the fields it names.

#### Single items

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

A bulk POST without `Prefer` returns 204, so ask for `return=id` or `return=representation` to get the new ids.

### Date/time and timezones

There are two kinds of date/time fields. The schemas below mark each field with `x-timezone`:

| Kind | Fields | Format | Schema |
| --- | --- | --- | --- |
| Date/time | `create_timestamp`, `sent_date` and all other instants | RFC 3339 with offset and milliseconds, `2026-12-01T00:00:00.000+01:00` (`…Z` for UTC) | `format: date-time`, `x-timezone: user` |
| Local (platform) | billing values: customer `billing_profiles` `start`, `stop`, `effective_start_time`; invoice `period_start`, `period_end` | platform time as stored, without offset, `2026-12-01 00:00:00` | `format: local-date-time` or `local-time`, `x-timezone: platform` |

The query parameter `tz` selects the timezone of date/time values, on every route and method:

| `tz` | Date/time values | Local values |
| --- | --- | --- |
| not set | the user's timezone | platform time, as stored |
| IANA name, e.g. `Europe/Vienna`, `UTC` | that timezone | platform time, as stored |
| `owner` | each item in its owner's timezone (customers, invoices), expanded objects in their own owner's; the user's timezone for other resources | platform time, as stored |

Any other value is rejected with 400 (`errors[].parameter` is `tz`).

The user's timezone is the timezone of the authenticated account:

- subscriber, subscriber admin: subscriber contact, else customer contact, else reseller contact, else the platform's
- administrator bound to a reseller: reseller contact, else the platform's
- other administrators and requests without authentication: the platform's

The owner's timezone of customers and invoices is that of the customer contact, else the reseller contact, else the platform's. The `timezone` of contacts and subscribers takes IANA names or null.

```http
GET /api/v2/customers/7                 "create_timestamp": "2026-11-06T11:31:33.000+01:00"   (system admin)
GET /api/v2/customers/7                 "create_timestamp": "2026-11-06T05:31:33.000-05:00"   (reseller admin in New York)
GET /api/v2/customers/7?tz=owner        "create_timestamp": "2026-11-06T19:31:33.000+09:00"   (customer in Tokyo)
GET /api/v2/customers/7?tz=UTC          "create_timestamp": "2026-11-06T10:31:33.000Z"
```

Local values mean platform time for everyone and never change with `tz`, so billing works as in rating and invoicing. Invalid or zero dates stored in the database are returned as null.

Billing computations use the customer's billing timezone: the customer's own timezone (as for `tz=owner`) if its profile package has the balance interval start mode `1st_tz` or `create_tz`, else the platform's, as in rating. It sets the month of an invoice `period` and of its serial, the dates and times printed in the invoice PDF, and the start of a new customer's first balance interval. Stored and returned values stay platform time.

Input follows the same rules. A date/time value without an offset, in a request body or a filter, is read in the timezone the response uses for that field; a value with an offset or a zone annotation is taken as is. A local value without an offset is stored as given; with an offset it is converted to platform time:

| Without an offset | With an offset or zone |
| --- | --- |
| `2026-12-01 00:00:00`, `2026-12-01 00:00:00.123`, `2026-12-01T00:00:00`, `2026-12-01T00:00` | `2026-12-01T00:00:00Z`, `2026-12-01T00:00:00+09:00`, `+0900`, `+09` |
| `2026-12-01` (00:00), `2026-12` (first day, 00:00), `20261201T000000`, `20261201` | `2026-12-01T00:00:00[Asia/Tokyo]`, `2026-12-01T00:00:00+09:00[Asia/Tokyo]` |

Up to 9 fractional digits are accepted. Time-only local fields take `18:00:00` or `18:00` without an offset. Week dates, ordinal dates and `24:00:00` are rejected. A date/time value without an offset that does not exist or exists twice in its timezone (daylight saving time changes) is rejected: send it with an offset, e.g. `2026-10-25T02:30:00+01:00`. A local value that cannot be stored as platform time is rejected as well: one without an offset that the platform's clocks skip, or one with an offset that falls into the platform's repeated autumn hour. In query strings, encode the `+` of an offset as `%2B`.

```http
PUT /api/v2/customers/7    "billing_profiles": [{"profile_id": 2, "start": "2026-12-01 05:00"}]            stored as 2026-12-01 05:00:00
PUT /api/v2/customers/7    "billing_profiles": [{"profile_id": 2, "start": "2026-12-01T05:00:00+09:00"}]   stored as 2026-11-30 21:00:00
GET /api/v2/invoices?period_start_ge=2026-12-01                                                          platform time, as listed
POST /api/v2/invoices      "period": "2026-12"   (customer in Tokyo, 1st_tz package)                     period_start 2026-11-30 16:00:00 (Vienna)
```

Invalid query values (`tz`, an unparsable or ambiguous filter value, `*` on a date/time filter) return 400 with `errors[].parameter`; invalid body values return 422 with `errors[].pointer`.

Keep the same `tz` for a GET and the PUT or PATCH that follows it, also for PATCH `test` operations, which compare the value as rendered. Integrations and exports that need stable values use `tz=UTC`. Journal entries keep `timestamp` as a Unix epoch number and store `content` in UTC.

Differences from API v1:

- v1 returns `YYYY-MM-DD HH:MM:SS` in server time without an offset; v2 returns RFC 3339 with an offset, in the user's timezone by default. Local values keep the v1 format.
- v1 supports `tz` on a few resources only, v2 on all of them, also for writes and filters. `use_owner_tz=1` is `tz=owner` (`use_owner_tz` is rejected as an unknown parameter).
- v1 reads date/time values without an offset in server time, v2 in the user's timezone. Local values are platform time in both.
- An invalid `tz` returns 400 (v1: 422 or ignored). Filter values with an offset are converted correctly, and date/time values that are ambiguous because of daylight saving time are rejected instead of silently resolved.
- Invoice periods (`period`), serials and PDF dates follow the customer's billing timezone, and the first balance interval of a customer with a `1st_tz`/`create_tz` package starts at midnight in its timezone (v1: server time or UTC).

### Errors

Every error has the same JSON body:

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

- `tx` identifies the request in the server log (`/var/log/ngcp/rest-api.log`). Include it when you report a problem.
- `error` is the HTTP status text, `message` a human-readable text.
- `errorCode` is the machine-readable code of the error: `VALIDATION_FAILED` (invalid body), `INVALID_PARAMETER` (invalid path or query parameter), `INVALID_JSON` (the body is not JSON), `INVALID_JSON_PATCH` (malformed JSON Patch), `JSON_PATCH_CONFLICT` (the JSON Patch does not apply to the item), a specific code such as `RESELLER_ID_INVALID`, or otherwise the name of the status, such as `NOT_FOUND` or `FORBIDDEN`.
- `errors` lists the single failures, one entry per failed check, in request order. It is left out when there are none. By default at most 100 entries are returned; `message` then says how many there are.

The OpenAPI document (`swagger.json`, `swagger.yaml`) describes this body as the `ErrorResponse` schema with `ErrorEntry` entries; the `4XX` and `5XX` responses of every operation refer to it.

Branch on `errorCode` and on the `code` of the entries, never on `message`: the texts may change. The `code` values are the names of the failed checks (`isEnum`, `isNotEmpty`, `whitelistValidation` for a field that must not be sent, `containsNumber`), the JSON Patch error (`TEST_OPERATION_FAILED`) or a specific code.

An entry points to the failed value with `pointer`, a [JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901) into the request body, or names the failed `parameter` of the path or query string:

| Request | Pointer |
| --- | --- |
| POST, PUT of one item | `/email`, nested `/rules/1/match_pattern` |
| Bulk POST (array) | `/<index>/email` |
| Bulk PUT, PATCH (keyed by id) | `/<id>/email` |
| PATCH, invalid value (422) | the field in the patched item, for example `/email` |
| PATCH, malformed or conflicting operation (400, 409) | the member of the operation in the patch document: `/0/op`, `/0/path`, `/0/value`; bulk `/<id>/0/path` |
| CSV import | `/<row>/email`, rows counted from 0 after the header |

Indexes count from 0: the item of a bulk POST (`/0` is the first item), the operation of a JSON Patch (`/0/op`), the id in a bulk DELETE id list and the CSV data row without the header.

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

A nested field is addressed by its full path, here the second embedded rule of a new rewrite rule set:

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

Checks against stored data, such as an unknown `reseller_id` or a name that exists already, return the same entries with the specific code as `code`. The pointer names the field, or the item as a whole (`/<index>`, `/<id>`, the empty pointer for a single item). Every failing item is listed with its own code; `errorCode` and `message` are those of the first entry.

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

Ids of a bulk PUT, PATCH or DELETE that do not exist or are not visible to you return 422 `ENTRY_NOT_FOUND` with one entry per id: `/<id>` in a PUT or PATCH body, `/<index>` in a DELETE id list. An item addressed by its id in the path returns 404.

400 means the request can't be interpreted (malformed JSON or JSON Patch, invalid parameter), 409 that a well-formed JSON Patch does not apply to the current item (failed `test`, path that does not exist), 422 that well-formed content is not valid.

| Code | Typical cause |
| --- | --- |
| 400 | Malformed JSON or JSON Patch, unknown or invalid parameter. |
| 401 | Missing or wrong credentials. |
| 403 | Not allowed for your role, read-only user, password expired, login banned, missing or invalid TOTP. |
| 404 | The item does not exist or is not visible to you. |
| 409 | The JSON Patch does not apply to the item. |
| 415 | No `Content-Type` and the body is not JSON. |
| 422 | Validation failed, duplicate value, field cannot be expanded. |
| 423 | The item is still in use, for example a contact bound to a contract. |
| 500, 503 | Server-side problem. Report it with the `tx`. |

### Journaling

Changes made through the API are journaled. `GET /<resource>/{id}/journal` lists the changes of an item: who made them, when, the operation and the resulting data. `GET /journals` searches the journal of all resources.
