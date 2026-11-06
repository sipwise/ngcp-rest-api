## Conceptos

La API v2 es la interfaz REST para el aprovisionamiento y la operación de la plataforma NGCP. En comparación con la API v1, añade aprovisionamiento masivo, validación estricta de cada solicitud, en la que los campos y parámetros de consulta desconocidos se rechazan en lugar de ignorarse, y funciones ampliadas. Se describe mediante un documento OpenAPI 3, a partir del cual se genera esta página.

### URL base

| Cuenta | URL base |
| --- | --- |
| Administrador, de cualquier rol (p. ej., revendedor, atención al cliente) | `https://ngcp.example.com:1443/api/v2` |
| Suscriptor, de cualquier rol (suscriptor, administrador de suscriptores) | `https://ngcp.example.com/api/v2` |

El propio documento OpenAPI está disponible en `<base URL>/swagger.json` y `<base URL>/swagger.yaml`, para generadores de código y herramientas de API.

### Solicitudes

Envíe `Accept: application/json` con cada solicitud. Sin esta cabecera, las respuestas usan HAL+JSON (`_links`, `_embedded`), que es el formato predeterminado. Los cuerpos de las solicitudes son JSON (`Content-Type: application/json`), excepto en PATCH, que recibe un documento JSON Patch (`application/json-patch+json`).

Algunas colecciones, como las agendas telefónicas, también pueden intercambiarse como archivos CSV. Solicite CSV con `Accept: text/csv`:

```shell
curl -u 'administrator:secret' -H 'Accept: text/csv' -o phonebook.csv \
  https://ngcp.example.com:1443/api/v2/customers/3/phonebook
```

Para importar un archivo CSV, súbalo como `multipart/form-data` en una parte llamada `file`. Sus columnas son los campos de los elementos:

```shell
curl -u 'administrator:secret' -H 'Accept: application/json' \
  -F 'file=@phonebook.csv;type=text/csv' \
  https://ngcp.example.com:1443/api/v2/customers/3/phonebook
```

### Respuestas

Una colección devuelve una página de elementos y el número total de elementos que coinciden:

```json
{
  "total_count": 2,
  "data": [
    {"id": 7, "email": "alice@example.com", "firstname": "Alice", "status": "active"},
    {"id": 9, "email": "bob@example.com", "firstname": "Bob", "status": "active"}
  ]
}
```

La cabecera `Prefer` controla lo que devuelve una solicitud de escritura. Sin ella, un POST de un elemento devuelve el elemento creado en `data`, y PUT, PATCH y DELETE devuelven 204 sin cuerpo. Creación de un contacto con cada valor de `Prefer`:

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

### Paginación, ordenación y filtrado

| Parámetro | Significado |
| --- | --- |
| `page`, `rows` | Número de página, a partir de 1, y tamaño de página (predeterminado 10). |
| `order_by`, `order_by_direction` | Campo de ordenación y `asc` (predeterminado) o `desc`. |
| cualquier campo de la colección | Filtro. Los valores deben coincidir exactamente, `*` es un comodín y una coma separa alternativas. |
| `search_or=1` | Combina varios filtros con OR en lugar de AND. |

Los filtros que admite una colección se indican más abajo en su operación GET. Los parámetros de consulta desconocidos se rechazan con 400.

```http
GET /api/v2/customercontacts?email=*@example.com,*@example.org&status=active&order_by=id&rows=50&page=2
```

Filtrar por `id` también devuelve una colección, lo que permite leer varios elementos en una sola solicitud:

```http
GET /api/v2/customercontacts?id=1,3,5
GET /api/v2/admins?login=alice,bob,carol*
```

### Recursos relacionados

Los campos de referencia como `reseller_id` o `contract_id` pueden resolverse en la misma solicitud con `expand`. El elemento referenciado se añade como `<field>_expand`, y un punto baja un nivel más:

```http
GET /api/v2/resellers/1?expand=contract_id.contact_id
```

Un campo que no se puede expandir devuelve 422. Añada `soft_expand=1` para omitir esos campos.

### Creación y modificación de datos

Cada método actúa sobre un elemento o, en la ruta de la colección, sobre varios elementos en una sola solicitud:

| Método | Un elemento | Varios elementos | Éxito |
| --- | --- | --- | --- |
| POST | `/resource` con un objeto | `/resource` con un array de objetos | 201 |
| PUT | `/resource/{id}` con el objeto completo | `/resource` con objetos indexados por id | 204 |
| PATCH | `/resource/{id}` con operaciones JSON Patch | `/resource` con operaciones indexadas por id | 204 |
| DELETE | `/resource/{id}` | `/resource` con un array de ids | 204 |

PUT reemplaza el elemento, por lo que los campos omitidos se restablecen. PATCH ([RFC 6902](https://www.rfc-editor.org/rfc/rfc6902)) modifica solo los campos que indica.

#### Elementos individuales

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

#### Operaciones masivas

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

Un POST masivo sin `Prefer` devuelve 204, así que solicite `return=id` o `return=representation` para obtener los nuevos ids.

### Errores

Todos los errores tienen el mismo cuerpo JSON:

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

- `tx` identifica la solicitud en el registro del servidor (`/var/log/ngcp/rest-api.log`). Inclúyalo cuando informe de un problema.
- `error` es el texto del estado HTTP, `message` un texto legible.
- `errorCode` es el código del error legible por máquina: `VALIDATION_FAILED` (cuerpo no válido), `INVALID_PARAMETER` (parámetro de ruta o de consulta no válido), `INVALID_JSON` (el cuerpo no es JSON), `INVALID_JSON_PATCH` (JSON Patch mal formado), `JSON_PATCH_CONFLICT` (el JSON Patch no se puede aplicar al elemento), un código específico como `RESELLER_ID_INVALID` o, en otro caso, el nombre del estado, como `NOT_FOUND` o `FORBIDDEN`.
- `errors` enumera los fallos individuales, una entrada por comprobación fallida, en el orden de la solicitud. Se omite si no hay ninguno. De forma predeterminada se devuelven como máximo 100 entradas; `message` indica entonces cuántas hay.

El documento OpenAPI (`swagger.json`, `swagger.yaml`) describe este cuerpo con el esquema `ErrorResponse`, con entradas `ErrorEntry`; las respuestas `4XX` y `5XX` de cada operación hacen referencia a él.

Base la lógica de su cliente en `errorCode` y en el `code` de las entradas, nunca en `message`: los textos pueden cambiar. Los valores de `code` son los nombres de las comprobaciones fallidas (`isEnum`, `isNotEmpty`, `whitelistValidation` para un campo que no debe enviarse, `containsNumber`), el error de JSON Patch (`TEST_OPERATION_FAILED`) o un código específico.

Una entrada señala el valor erróneo con `pointer`, un [JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901) dentro del cuerpo de la solicitud, o nombra el `parameter` erróneo de la ruta o de la cadena de consulta:

| Solicitud | Pointer |
| --- | --- |
| POST, PUT de un elemento | `/email`, anidado `/rules/1/match_pattern` |
| POST en bulk (array) | `/<index>/email` |
| PUT, PATCH en bulk (indexado por id) | `/<id>/email` |
| PATCH, valor no válido (422) | el campo del elemento modificado, por ejemplo `/email` |
| PATCH, operación mal formada o en conflicto (400, 409) | el miembro de la operación en el documento de patch: `/0/op`, `/0/path`, `/0/value`; en bulk `/<id>/0/path` |
| Importación CSV | `/<row>/email`, filas contadas desde 0 después de la cabecera |

Los índices cuentan desde 0: el elemento de un POST en bulk (`/0` es el primer elemento), la operación de un JSON Patch (`/0/op`), el id en la lista de ids de un DELETE en bulk y la fila de datos CSV sin la cabecera.

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

Un campo anidado se indica con su ruta completa, aquí la segunda regla incrustada de un nuevo rewrite rule set:

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

Las comprobaciones con los datos almacenados, por ejemplo un `reseller_id` desconocido o un nombre que ya existe, devuelven las mismas entradas con el código específico como `code`. El puntero indica el campo o el elemento completo (`/<index>`, `/<id>`, el puntero vacío para un elemento único). Cada elemento fallido aparece con su propio código; `errorCode` y `message` son los de la primera entrada.

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

Los ids de un PUT, PATCH o DELETE masivo que no existen o no son visibles para usted devuelven 422 `ENTRY_NOT_FOUND` con una entrada por id: `/<id>` en un cuerpo PUT o PATCH, `/<index>` en una lista de ids de DELETE. Un elemento indicado por su id en la ruta devuelve 404.

400 significa que la solicitud no se puede interpretar (JSON o JSON Patch mal formado, parámetro no válido), 409 que un JSON Patch bien formado no se puede aplicar al elemento actual (`test` fallido, ruta inexistente) y 422 que un contenido bien formado no es válido.

| Código | Causa habitual |
| --- | --- |
| 400 | JSON o JSON Patch mal formado, parámetro desconocido o no válido. |
| 401 | Credenciales ausentes o incorrectas. |
| 403 | No permitido para su rol, usuario de solo lectura, contraseña caducada, inicio de sesión bloqueado, TOTP ausente o no válido. |
| 404 | El elemento no existe o no es visible para usted. |
| 409 | El JSON Patch no se puede aplicar al elemento. |
| 415 | Sin `Content-Type` y el cuerpo no es JSON. |
| 422 | Validación fallida, valor duplicado, el campo no se puede expandir. |
| 423 | El elemento sigue en uso, por ejemplo un contacto vinculado a un contrato. |
| 500, 503 | Problema en el servidor. Infórmelo junto con el `tx`. |

### Registro de cambios

Los cambios realizados a través de la API quedan registrados. `GET /<resource>/{id}/journal` enumera los cambios de un elemento: quién los hizo, cuándo, la operación y los datos resultantes. `GET /journals` busca en el registro de cambios de todos los recursos.
