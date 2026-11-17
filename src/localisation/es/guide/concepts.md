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
| `search_or=true` | Combina varios filtros con OR en lugar de AND. |

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

Los campos de referencia como `reseller_id` o `contract_id` pueden resolverse en la misma solicitud con `expand`, una lista de campos separados por comas. El elemento referenciado se añade como `<field>_expand`, y un punto baja un nivel más. Es el mismo elemento que la colección referenciada le devuelve, y una colección se resuelve con una lectura por campo. Los campos expandibles se indican con el parámetro `expand` de cada operación, `all` los expande todos:

```http
GET /api/v2/resellers/1?expand=contract_id.contact_id
GET /api/v2/subscribers?expand=customer_id,domain_id
```

Un campo que no se puede expandir devuelve 422, un elemento referenciado que usted no puede leer 403. Con `soft_expand=true` obtiene en su lugar solo lo que se puede expandir: esos campos y elementos se omiten. Una ruta mal formada como `a..b` devuelve 400 en cualquier caso.

`expand` y `soft_expand` solo se admiten en peticiones GET con respuesta JSON, por ejemplo no en escrituras, en `/auth` ni con `Accept: text/csv`: allí devuelven 400, salvo con `soft_expand=true`.

Las colecciones también pueden filtrarse por los campos de los elementos referenciados: `<field>.<filtro de la colección referenciada>=<valor>`, a cualquier profundidad. Solo coinciden los elementos referenciados que usted puede leer, y el filtro se combina con los demás mediante AND, también con `search_or=true`:

```http
GET /api/v2/customers?contact_id.email=*@example.com
GET /api/v2/subscribers?customer_id.contact_id.email=*@example.com&status=active
```

Un filtro así devuelve 422 si la colección referenciada no conoce el filtro, si coincide con demasiados elementos referenciados (10000 por defecto) o si la colección no puede aplicarlo. `order_by` no admite estos campos.

### Campos diferidos

Los campos de lista de un elemento pueden contener muchas entradas, por ejemplo los `alias_numbers` de un suscriptor o los `billing_profiles` de un cliente. Por defecto se devuelven como un enlace con el número de entradas:

```json
{
  "id": 5,
  "alias_numbers": {"type": "link", "url": "/api/v2/subscribers/5/@alias_numbers", "total_count": 3}
}
```

El enlace apunta al campo como colección: la ruta del elemento, `/@` y el nombre del campo. Se lee solo con GET y se pagina, ordena y filtra como cualquier otra colección, con los filtros indicados en su operación. Las entradas que son valores simples, como los ids de `pbx_group_ids`, se devuelven allí como `{"value": 12}` y se filtran y ordenan por `value`. Estas colecciones existen solo por elemento, no hay `/subscribers/@alias_numbers`.

```http
GET /api/v2/subscribers/5/@alias_numbers?order_by=sn&rows=100&page=2
GET /api/v2/subscribers/5/@pbx_group_ids?value=12
```

`inline` devuelve en su lugar los campos diferidos como datos, en elementos individuales y en colecciones. Los campos diferidos de una respuesta se indican con el parámetro `inline` de su operación.

| Valor | Devuelto como datos |
| --- | --- |
| nombres de campos, separados por comas | los campos nombrados |
| `all` | todos los campos diferidos |
| `auto` | por elemento, cada campo con 1000 entradas como máximo, en el orden de la página mientras la respuesta no supere 10000 entradas incluidas; los demás siguen siendo enlaces |

```http
GET /api/v2/subscribers/5?inline=alias_numbers
GET /api/v2/subscribers?customer_id=3&inline=auto
```

Un campo nombrado, o incluido por `all`, con más de 1000 entradas devuelve 422 con la URL de su colección: léalo allí, página a página. Lo mismo ocurre con campos nombrados que juntos tienen más de 10000 entradas en una respuesta (cuentan todos los elementos de una lista y los elementos expandidos): lea menos filas o use `auto`. Los límites son los ajustes de plataforma `performance.lazy_load.inline_max_items` (1000 por defecto) y `performance.lazy_load.inline_max_hard_limit` (10000 por defecto). Un nombre que no es un campo diferido de la respuesta devuelve 422, `all` y `auto` juntos 400. Algunos campos son solo enlaces (`vars` y `preview` de las plantillas de factura): no tienen `total_count` y no pueden incluirse.

Las escrituras con `Prefer: return=representation` devuelven sus elementos como GET, por lo que también admiten `inline`. Un enlace no es un valor: PUT reemplaza el elemento completo y rechaza con 422 un enlace devuelto. Lea el elemento con `inline=all` antes de modificarlo con PUT, o modifique campos sueltos con PATCH. No todos los campos incluidos tienen la forma de la solicitud: quite `effective_start_time` de las entradas de los `billing_profiles` de un cliente y envíe los `values` de las condiciones como cadenas simples en lugar de objetos `{"id", "value"}`.

`expand` de un campo diferido lo incluye, con los mismos límites. `expand=all` omite los campos diferidos que no están incluidos, que conservan su enlace. `all` y `auto` se aplican también a los elementos expandidos, por ejemplo `expand=customer_id&inline=auto` devuelve los `billing_profiles` del cliente como datos. En una colección `@<field>`, `inline` y `expand` se refieren a los campos de sus entradas; las colecciones de valores simples no admiten `expand` (400).

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

### Fecha/hora y zonas horarias

Hay dos tipos de campos de fecha/hora. Los esquemas de abajo marcan cada campo con `x-timezone`:

| Tipo | Campos | Formato | Esquema |
| --- | --- | --- | --- |
| Fecha/hora | `create_timestamp`, `sent_date` y todos los demás instantes | RFC 3339 con desfase y milisegundos, `2026-12-01T00:00:00.000+01:00` (`…Z` para UTC) | `format: date-time`, `x-timezone: user` |
| Local (plataforma) | valores de facturación: `billing_profiles` del cliente `start`, `stop`, `effective_start_time`; factura `period_start`, `period_end` | hora de la plataforma tal como se almacena, sin desfase, `2026-12-01 00:00:00` | `format: local-date-time` o `local-time`, `x-timezone: platform` |

El parámetro de consulta `tz` selecciona la zona horaria de los valores de fecha/hora, en todas las rutas y métodos:

| `tz` | Valores de fecha/hora | Valores locales |
| --- | --- | --- |
| no definido | la zona horaria del usuario | hora de la plataforma, tal como se almacena |
| nombre IANA, p. ej. `Europe/Vienna`, `UTC` | esa zona horaria | hora de la plataforma, tal como se almacena |
| `owner` | cada elemento en la zona horaria de su propietario (clientes, facturas), los objetos expandidos en la de su propio propietario; la zona horaria del usuario en los demás recursos | hora de la plataforma, tal como se almacena |

Cualquier otro valor se rechaza con 400 (`errors[].parameter` es `tz`).

La zona horaria del usuario es la de la cuenta autenticada:

- suscriptor, administrador de suscriptores: contacto del suscriptor, si no contacto del cliente, si no contacto del revendedor, si no la de la plataforma
- administrador vinculado a un revendedor: contacto del revendedor, si no la de la plataforma
- otros administradores y solicitudes sin autenticación: la de la plataforma

La zona horaria del propietario de clientes y facturas es la del contacto del cliente, si no la del contacto del revendedor, si no la de la plataforma. El campo `timezone` de contactos y suscriptores admite nombres IANA o null.

```http
GET /api/v2/customers/7                 "create_timestamp": "2026-11-06T11:31:33.000+01:00"   (system admin)
GET /api/v2/customers/7                 "create_timestamp": "2026-11-06T05:31:33.000-05:00"   (reseller admin in New York)
GET /api/v2/customers/7?tz=owner        "create_timestamp": "2026-11-06T19:31:33.000+09:00"   (customer in Tokyo)
GET /api/v2/customers/7?tz=UTC          "create_timestamp": "2026-11-06T10:31:33.000Z"
```

Los valores locales significan hora de la plataforma para todos y nunca cambian con `tz`, de modo que la facturación funciona igual que en la tarificación y la emisión de facturas. Las fechas inválidas o cero almacenadas en la base de datos se devuelven como null.

Los cálculos de facturación usan la zona horaria de facturación del cliente: su propia zona horaria (como con `tz=owner`) si su paquete de perfiles tiene el modo de inicio del intervalo de saldo `1st_tz` o `create_tz`, si no la de la plataforma, como en la tarificación. Determina el mes de un `period` de factura y de su número de serie, las fechas y horas impresas en el PDF de la factura y el inicio del primer intervalo de saldo de un cliente nuevo. Los valores almacenados y devueltos siguen siendo hora de la plataforma.

La entrada sigue las mismas reglas. Un valor de fecha/hora sin desfase, en el cuerpo de una solicitud o en un filtro, se lee en la zona horaria que la respuesta usa para ese campo; un valor con desfase o anotación de zona se toma tal cual. Un valor local sin desfase se almacena tal como se da; con desfase se convierte a hora de la plataforma:

| Sin desfase | Con desfase o zona |
| --- | --- |
| `2026-12-01 00:00:00`, `2026-12-01 00:00:00.123`, `2026-12-01T00:00:00`, `2026-12-01T00:00` | `2026-12-01T00:00:00Z`, `2026-12-01T00:00:00+09:00`, `+0900`, `+09` |
| `2026-12-01` (00:00), `2026-12` (primer día, 00:00), `20261201T000000`, `20261201` | `2026-12-01T00:00:00[Asia/Tokyo]`, `2026-12-01T00:00:00+09:00[Asia/Tokyo]` |

Se aceptan hasta 9 dígitos fraccionarios. Los campos locales que solo contienen la hora admiten `18:00:00` o `18:00` sin desfase. Las fechas de semana, las fechas ordinales y `24:00:00` se rechazan. Un valor de fecha/hora sin desfase que no existe o existe dos veces en su zona horaria (cambios de horario de verano) se rechaza: envíelo con desfase, p. ej. `2026-10-25T02:30:00+01:00`. También se rechaza un valor local que no se puede guardar como hora de la plataforma: sin desfase, en la hora que los relojes de la plataforma saltan, o con desfase, en la hora repetida de otoño de la plataforma. En las cadenas de consulta, codifique el `+` de un desfase como `%2B`.

```http
PUT /api/v2/customers/7    "billing_profiles": [{"profile_id": 2, "start": "2026-12-01 05:00"}]            stored as 2026-12-01 05:00:00
PUT /api/v2/customers/7    "billing_profiles": [{"profile_id": 2, "start": "2026-12-01T05:00:00+09:00"}]   stored as 2026-11-30 21:00:00
GET /api/v2/invoices?period_start_ge=2026-12-01                                                          platform time, as listed
POST /api/v2/invoices      "period": "2026-12"   (customer in Tokyo, 1st_tz package)                     period_start 2026-11-30 16:00:00 (Vienna)
```

Los valores de consulta inválidos (`tz`, un valor de filtro que no se puede interpretar o es ambiguo, `*` en un filtro de fecha/hora) devuelven 400 con `errors[].parameter`; los valores de cuerpo inválidos devuelven 422 con `errors[].pointer`.

Mantenga el mismo `tz` para un GET y para el PUT o PATCH que lo sigue, también para las operaciones `test` de PATCH, que comparan el valor tal como se muestra. Las integraciones y exportaciones que necesitan valores estables usan `tz=UTC`. Las entradas del diario conservan `timestamp` como número de época Unix y almacenan `content` en UTC.

Diferencias con API v1:

- v1 devuelve `YYYY-MM-DD HH:MM:SS` en hora del servidor sin desfase; v2 devuelve RFC 3339 con desfase, por defecto en la zona horaria del usuario. Los valores locales conservan el formato de v1.
- v1 admite `tz` solo en unos pocos recursos, v2 en todos, también para escrituras y filtros. `use_owner_tz=1` equivale a `tz=owner` (`use_owner_tz` se rechaza como parámetro desconocido).
- v1 lee los valores de fecha/hora sin desfase en hora del servidor, v2 en la zona horaria del usuario. Los valores locales son hora de la plataforma en ambas.
- Un `tz` inválido devuelve 400 (v1: 422 o se ignora). Los valores de filtro con desfase se convierten correctamente, y los valores de fecha/hora que son ambiguos por el horario de verano se rechazan en lugar de resolverse en silencio.
- Los periodos de factura (`period`), los números de serie y las fechas del PDF siguen la zona horaria de facturación del cliente, y el primer intervalo de saldo de un cliente con un paquete `1st_tz`/`create_tz` empieza a medianoche en su zona horaria (v1: hora del servidor o UTC).

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
