## Introduction

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

Errors have a JSON body. `message` is a text or, when validation fails, a list of the rejected fields with the checks they failed:

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

`tx` identifies the request in the server log (`/var/log/ngcp/rest-api.log`). Include it when you report a problem.

| Code | Typical cause |
| --- | --- |
| 400 | Malformed request, unknown query parameter, invalid JSON Patch. |
| 401 | Missing or wrong credentials. |
| 403 | Not allowed for your role, read-only user, password expired, login banned, missing or invalid TOTP. |
| 404 | The item does not exist or is not visible to you. |
| 415 | The body is not valid JSON. |
| 422 | Validation failed, duplicate value, field cannot be expanded. |
| 423 | The item is still in use, for example a contact bound to a contract. |
| 500, 503 | Server-side problem. Report it with the `tx`. |

### Journaling

Changes made through the API are journaled. `GET /<resource>/{id}/journal` lists the changes of an item: who made them, when, the operation and the resulting data. `GET /journals` searches the journal of all resources.
