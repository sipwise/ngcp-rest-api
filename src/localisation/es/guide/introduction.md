## Introducción

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

Los errores tienen un cuerpo JSON. `message` es un texto o, cuando falla la validación, una lista de los campos rechazados con las comprobaciones que no superaron:

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

`tx` identifica la solicitud en el registro del servidor (`/var/log/ngcp/rest-api.log`). Inclúyalo cuando informe de un problema.

| Código | Causa habitual |
| --- | --- |
| 400 | Solicitud mal formada, parámetro de consulta desconocido, JSON Patch no válido. |
| 401 | Credenciales ausentes o incorrectas. |
| 403 | No permitido para su rol, usuario de solo lectura, contraseña caducada, inicio de sesión bloqueado, TOTP ausente o no válido. |
| 404 | El elemento no existe o no es visible para usted. |
| 415 | El cuerpo no es JSON válido. |
| 422 | Validación fallida, valor duplicado, el campo no se puede expandir. |
| 423 | El elemento sigue en uso, por ejemplo un contacto vinculado a un contrato. |
| 500, 503 | Problema en el servidor. Infórmelo junto con el `tx`. |

### Registro de cambios

Los cambios realizados a través de la API quedan registrados. `GET /<resource>/{id}/journal` enumera los cambios de un elemento: quién los hizo, cuándo, la operación y los datos resultantes. `GET /journals` busca en el registro de cambios de todos los recursos.
