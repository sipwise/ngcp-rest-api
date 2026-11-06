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
| `search_or=1` | Combine several filters with OR instead of AND. |

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

Reference fields such as `reseller_id` or `contract_id` can be resolved in the same request with `expand`. The referenced item is added as `<field>_expand`, and a dot goes one level deeper:

```http
GET /api/v2/resellers/1?expand=contract_id.contact_id
```

A field that cannot be expanded returns 422. Add `soft_expand=1` to skip such fields instead.

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
