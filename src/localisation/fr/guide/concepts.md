## Concepts

L'API v2 est l'interface REST de provisionnement et d'exploitation de la plateforme NGCP. Par rapport à l'API v1, elle ajoute le provisionnement en masse, une validation stricte de chaque requête, qui rejette les champs et paramètres de requête inconnus au lieu de les ignorer, ainsi que des fonctionnalités étendues. Elle est décrite par un document OpenAPI 3, à partir duquel cette page est générée.

### URL de base

| Compte | URL de base |
| --- | --- |
| Administrateur, quel que soit son rôle (p. ex. revendeur, service client) | `https://ngcp.example.com:1443/api/v2` |
| Abonné, quel que soit son rôle (abonné, administrateur d'abonnés) | `https://ngcp.example.com/api/v2` |

Le document OpenAPI lui-même est disponible sous `<base URL>/swagger.json` et `<base URL>/swagger.yaml`, pour les générateurs de code et les outils API.

### Requêtes

Envoyez `Accept: application/json` avec chaque requête. Sans cet en-tête, les réponses utilisent HAL+JSON (`_links`, `_embedded`), le format par défaut. Les corps de requête sont en JSON (`Content-Type: application/json`), sauf pour PATCH, qui attend un document JSON Patch (`application/json-patch+json`).

Certaines collections, comme les annuaires, peuvent aussi être échangées sous forme de fichiers CSV. Demandez du CSV avec `Accept: text/csv` :

```shell
curl -u 'administrator:secret' -H 'Accept: text/csv' -o phonebook.csv \
  https://ngcp.example.com:1443/api/v2/customers/3/phonebook
```

Pour importer un fichier CSV, envoyez-le en `multipart/form-data` dans une partie nommée `file`. Ses colonnes sont les champs des éléments :

```shell
curl -u 'administrator:secret' -H 'Accept: application/json' \
  -F 'file=@phonebook.csv;type=text/csv' \
  https://ngcp.example.com:1443/api/v2/customers/3/phonebook
```

### Réponses

Une collection renvoie une page d'éléments et le nombre total d'éléments correspondants :

```json
{
  "total_count": 2,
  "data": [
    {"id": 7, "email": "alice@example.com", "firstname": "Alice", "status": "active"},
    {"id": 9, "email": "bob@example.com", "firstname": "Bob", "status": "active"}
  ]
}
```

L'en-tête `Prefer` détermine ce que renvoie une requête d'écriture. Sans lui, un POST d'un seul élément renvoie l'élément créé dans `data`, et PUT, PATCH et DELETE renvoient 204 sans corps. Création d'un contact avec chaque valeur de `Prefer` :

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

### Pagination, tri et filtrage

| Paramètre | Signification |
| --- | --- |
| `page`, `rows` | Numéro de page, à partir de 1, et taille de page (10 par défaut). |
| `order_by`, `order_by_direction` | Champ de tri et `asc` (par défaut) ou `desc`. |
| tout champ de la collection | Filtre. Les valeurs doivent correspondre exactement, `*` est un caractère générique et une virgule sépare les alternatives. |
| `search_or=1` | Combine plusieurs filtres avec OR au lieu de AND. |

Les filtres pris en charge par une collection sont indiqués avec son opération GET ci-dessous. Les paramètres de requête inconnus sont rejetés avec 400.

```http
GET /api/v2/customercontacts?email=*@example.com,*@example.org&status=active&order_by=id&rows=50&page=2
```

Le filtrage par `id` renvoie lui aussi une collection, ce qui permet de lire plusieurs éléments en une seule requête :

```http
GET /api/v2/customercontacts?id=1,3,5
GET /api/v2/admins?login=alice,bob,carol*
```

### Ressources liées

Les champs de référence tels que `reseller_id` ou `contract_id` peuvent être résolus dans la même requête avec `expand`, une liste de champs séparés par des virgules. L'élément référencé est ajouté sous `<field>_expand`, et un point descend d'un niveau supplémentaire. C'est le même élément que la collection référencée vous renvoie, et une collection est résolue avec une lecture par champ. Les champs développables sont indiqués avec le paramètre `expand` de chaque opération, `all` les développe tous :

```http
GET /api/v2/resellers/1?expand=contract_id.contact_id
GET /api/v2/subscribers?expand=customer_id,domain_id
```

Un champ qui ne peut pas être développé renvoie 422, un élément référencé que vous ne pouvez pas lire 403. Avec `soft_expand=1`, vous obtenez à la place uniquement ce qui peut être développé : ces champs et éléments sont omis. Un chemin mal formé comme `a..b` renvoie 400 dans tous les cas.

`expand` et `soft_expand` ne sont acceptés que sur les requêtes GET avec une réponse JSON, par exemple pas sur les écritures, sous `/auth` ni avec `Accept: text/csv` : ils y renvoient 400, sauf avec `soft_expand=1`.

Les collections peuvent aussi être filtrées selon les champs des éléments référencés : `<field>.<filtre de la collection référencée>=<valeur>`, à n'importe quelle profondeur. Seuls les éléments référencés que vous pouvez lire correspondent, et le filtre est combiné aux autres avec AND, même avec `search_or=1` :

```http
GET /api/v2/customers?contact_id.email=*@example.com
GET /api/v2/subscribers?customer_id.contact_id.email=*@example.com&status=active
```

Un tel filtre renvoie 422 si la collection référencée ne connaît pas le filtre, s'il correspond à trop d'éléments référencés (10000 par défaut) ou si la collection ne peut pas l'appliquer. `order_by` n'accepte pas ces champs.

### Création et modification de données

Chaque méthode s'applique à un élément ou, sur le chemin de la collection, à plusieurs éléments en une seule requête :

| Méthode | Un élément | Plusieurs éléments | Succès |
| --- | --- | --- | --- |
| POST | `/resource` avec un objet | `/resource` avec un tableau d'objets | 201 |
| PUT | `/resource/{id}` avec l'objet complet | `/resource` avec des objets indexés par id | 204 |
| PATCH | `/resource/{id}` avec des opérations JSON Patch | `/resource` avec des opérations indexées par id | 204 |
| DELETE | `/resource/{id}` | `/resource` avec un tableau d'id | 204 |

PUT remplace l'élément, les champs omis sont donc réinitialisés. PATCH ([RFC 6902](https://www.rfc-editor.org/rfc/rfc6902)) ne modifie que les champs qu'il désigne.

#### Éléments individuels

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

#### En masse

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

Un POST en masse sans `Prefer` renvoie 204 ; demandez donc `return=id` ou `return=representation` pour obtenir les nouveaux id.

### Date/heure et fuseaux horaires

Il existe deux types de champs date/heure. Les schémas ci-dessous marquent chaque champ avec `x-timezone` :

| Type | Champs | Format | Schéma |
| --- | --- | --- | --- |
| Date/heure | `create_timestamp`, `sent_date` et tous les autres instants | RFC 3339 avec décalage et millisecondes, `2026-12-01T00:00:00.000+01:00` (`…Z` pour UTC) | `format: date-time`, `x-timezone: user` |
| Local (plateforme) | valeurs de facturation : `billing_profiles` du client `start`, `stop`, `effective_start_time` ; facture `period_start`, `period_end` | heure de la plateforme telle que stockée, sans décalage, `2026-12-01 00:00:00` | `format: local-date-time` ou `local-time`, `x-timezone: platform` |

Le paramètre de requête `tz` sélectionne le fuseau horaire des valeurs date/heure, sur chaque route et chaque méthode :

| `tz` | Valeurs date/heure | Valeurs locales |
| --- | --- | --- |
| non défini | le fuseau horaire de l'utilisateur | heure de la plateforme, telle que stockée |
| nom IANA, p. ex. `Europe/Vienna`, `UTC` | ce fuseau horaire | heure de la plateforme, telle que stockée |
| `owner` | chaque élément dans le fuseau horaire de son propriétaire (clients, factures), les objets développés dans celui de leur propre propriétaire ; le fuseau horaire de l'utilisateur pour les autres ressources | heure de la plateforme, telle que stockée |

Toute autre valeur est rejetée avec 400 (`errors[].parameter` vaut `tz`).

Le fuseau horaire de l'utilisateur est celui du compte authentifié :

- abonné, administrateur d'abonnés : contact de l'abonné, sinon contact du client, sinon contact du revendeur, sinon celui de la plateforme
- administrateur lié à un revendeur : contact du revendeur, sinon celui de la plateforme
- autres administrateurs et requêtes sans authentification : celui de la plateforme

Le fuseau horaire du propriétaire des clients et des factures est celui du contact du client, sinon du contact du revendeur, sinon celui de la plateforme. Le champ `timezone` des contacts et des abonnés accepte des noms IANA ou null.

```http
GET /api/v2/customers/7                 "create_timestamp": "2026-11-06T11:31:33.000+01:00"   (system admin)
GET /api/v2/customers/7                 "create_timestamp": "2026-11-06T05:31:33.000-05:00"   (reseller admin in New York)
GET /api/v2/customers/7?tz=owner        "create_timestamp": "2026-11-06T19:31:33.000+09:00"   (customer in Tokyo)
GET /api/v2/customers/7?tz=UTC          "create_timestamp": "2026-11-06T10:31:33.000Z"
```

Les valeurs locales représentent l'heure de la plateforme pour tout le monde et ne changent jamais avec `tz`, de sorte que la facturation fonctionne comme pour la tarification et l'émission des factures. Les dates invalides ou nulles stockées dans la base de données sont renvoyées comme null.

Les calculs de facturation utilisent le fuseau horaire de facturation du client : son propre fuseau (comme pour `tz=owner`) si son forfait de profils a le mode de début d'intervalle de solde `1st_tz` ou `create_tz`, sinon celui de la plateforme, comme pour la tarification. Il détermine le mois d'une `period` de facture et de son numéro de série, les dates et heures imprimées dans le PDF de la facture et le début du premier intervalle de solde d'un nouveau client. Les valeurs stockées et renvoyées restent en heure de la plateforme.

La saisie suit les mêmes règles. Une valeur date/heure sans décalage, dans un corps de requête ou un filtre, est lue dans le fuseau horaire que la réponse utilise pour ce champ ; une valeur avec décalage ou annotation de zone est prise telle quelle. Une valeur locale sans décalage est stockée telle que fournie ; avec un décalage, elle est convertie en heure de la plateforme :

| Sans décalage | Avec décalage ou zone |
| --- | --- |
| `2026-12-01 00:00:00`, `2026-12-01 00:00:00.123`, `2026-12-01T00:00:00`, `2026-12-01T00:00` | `2026-12-01T00:00:00Z`, `2026-12-01T00:00:00+09:00`, `+0900`, `+09` |
| `2026-12-01` (00:00), `2026-12` (premier jour, 00:00), `20261201T000000`, `20261201` | `2026-12-01T00:00:00[Asia/Tokyo]`, `2026-12-01T00:00:00+09:00[Asia/Tokyo]` |

Jusqu'à 9 chiffres décimaux sont acceptés. Les champs locaux contenant uniquement l'heure acceptent `18:00:00` ou `18:00` sans décalage. Les dates de semaine, les dates ordinales et `24:00:00` sont rejetées. Une valeur date/heure sans décalage qui n'existe pas ou existe deux fois dans son fuseau horaire (changements d'heure d'été) est rejetée : envoyez-la avec un décalage, p. ex. `2026-10-25T02:30:00+01:00`. Une valeur locale qui ne peut pas être enregistrée en heure de la plateforme est également rejetée : sans décalage, dans l'heure que les horloges de la plateforme sautent, ou avec décalage, dans l'heure répétée d'automne de la plateforme. Dans les chaînes de requête, encodez le `+` d'un décalage en `%2B`.

```http
PUT /api/v2/customers/7    "billing_profiles": [{"profile_id": 2, "start": "2026-12-01 05:00"}]            stored as 2026-12-01 05:00:00
PUT /api/v2/customers/7    "billing_profiles": [{"profile_id": 2, "start": "2026-12-01T05:00:00+09:00"}]   stored as 2026-11-30 21:00:00
GET /api/v2/invoices?period_start_ge=2026-12-01                                                          platform time, as listed
POST /api/v2/invoices      "period": "2026-12"   (customer in Tokyo, 1st_tz package)                     period_start 2026-11-30 16:00:00 (Vienna)
```

Les valeurs de requête invalides (`tz`, une valeur de filtre non analysable ou ambiguë, `*` sur un filtre date/heure) renvoient 400 avec `errors[].parameter` ; les valeurs de corps invalides renvoient 422 avec `errors[].pointer`.

Conservez le même `tz` pour un GET et pour le PUT ou PATCH qui le suit, y compris pour les opérations PATCH `test`, qui comparent la valeur telle qu'elle est restituée. Les intégrations et exports qui ont besoin de valeurs stables utilisent `tz=UTC`. Les entrées du journal conservent `timestamp` sous forme de nombre d'époque Unix et stockent `content` en UTC.

Différences avec API v1 :

- v1 renvoie `YYYY-MM-DD HH:MM:SS` à l'heure du serveur sans décalage ; v2 renvoie du RFC 3339 avec décalage, par défaut dans le fuseau horaire de l'utilisateur. Les valeurs locales conservent le format v1.
- v1 prend en charge `tz` sur quelques ressources seulement, v2 sur toutes, y compris pour les écritures et les filtres. `use_owner_tz=1` correspond à `tz=owner` (`use_owner_tz` est rejeté comme paramètre inconnu).
- v1 lit les valeurs date/heure sans décalage à l'heure du serveur, v2 dans le fuseau horaire de l'utilisateur. Les valeurs locales sont à l'heure de la plateforme dans les deux.
- Un `tz` invalide renvoie 400 (v1 : 422 ou ignoré). Les valeurs de filtre avec décalage sont converties correctement, et les valeurs date/heure ambiguës à cause de l'heure d'été sont rejetées au lieu d'être résolues silencieusement.
- Les périodes de facture (`period`), les numéros de série et les dates du PDF suivent le fuseau horaire de facturation du client, et le premier intervalle de solde d'un client avec un forfait `1st_tz`/`create_tz` commence à minuit dans son fuseau (v1 : heure du serveur ou UTC).

### Erreurs

Toutes les erreurs ont le même corps JSON :

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

- `tx` identifie la requête dans le journal du serveur (`/var/log/ngcp/rest-api.log`). Indiquez-le lorsque vous signalez un problème.
- `error` est le texte du statut HTTP, `message` un texte lisible.
- `errorCode` est le code de l'erreur, lisible par une machine : `VALIDATION_FAILED` (corps invalide), `INVALID_PARAMETER` (paramètre de chemin ou de requête invalide), `INVALID_JSON` (le corps n'est pas du JSON), `INVALID_JSON_PATCH` (JSON Patch mal formé), `JSON_PATCH_CONFLICT` (le JSON Patch ne s'applique pas à l'élément), un code spécifique tel que `RESELLER_ID_INVALID`, ou sinon le nom du statut, tel que `NOT_FOUND` ou `FORBIDDEN`.
- `errors` liste les échecs individuels, une entrée par contrôle échoué, dans l'ordre de la requête. Le champ est omis s'il n'y en a aucun. Par défaut, 100 entrées au maximum sont renvoyées ; `message` indique alors leur nombre total.

Le document OpenAPI (`swagger.json`, `swagger.yaml`) décrit ce corps par le schéma `ErrorResponse`, avec des entrées `ErrorEntry` ; les réponses `4XX` et `5XX` de chaque opération y font référence.

Basez votre logique sur `errorCode` et sur le `code` des entrées, jamais sur `message` : les textes peuvent changer. Les valeurs de `code` sont les noms des contrôles échoués (`isEnum`, `isNotEmpty`, `whitelistValidation` pour un champ qui ne doit pas être envoyé, `containsNumber`), l'erreur JSON Patch (`TEST_OPERATION_FAILED`) ou un code spécifique.

Une entrée désigne la valeur en échec avec `pointer`, un [JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901) dans le corps de la requête, ou nomme le `parameter` en échec du chemin ou de la chaîne de requête :

| Requête | Pointer |
| --- | --- |
| POST, PUT d'un élément | `/email`, imbriqué `/rules/1/match_pattern` |
| POST en bulk (tableau) | `/<index>/email` |
| PUT, PATCH en bulk (indexé par id) | `/<id>/email` |
| PATCH, valeur invalide (422) | le champ dans l'élément modifié, par exemple `/email` |
| PATCH, opération mal formée ou en conflit (400, 409) | le membre de l'opération dans le document de patch : `/0/op`, `/0/path`, `/0/value` ; en bulk `/<id>/0/path` |
| Import CSV | `/<row>/email`, lignes comptées à partir de 0 après l'en-tête |

Les index commencent à 0 : l'élément d'un POST en bulk (`/0` est le premier élément), l'opération d'un JSON Patch (`/0/op`), l'id dans la liste d'ids d'un DELETE en bulk et la ligne de données CSV sans l'en-tête.

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

Un champ imbriqué est désigné par son chemin complet, ici la deuxième règle intégrée d'un nouveau rewrite rule set :

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

Les vérifications par rapport aux données enregistrées, par exemple un `reseller_id` inconnu ou un nom déjà existant, renvoient les mêmes entrées avec le code spécifique comme `code`. Le pointeur désigne le champ, ou l'élément dans son ensemble (`/<index>`, `/<id>`, le pointeur vide pour un élément unique). Chaque élément en échec est listé avec son propre code ; `errorCode` et `message` sont ceux de la première entrée.

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

Les ids d'un PUT, PATCH ou DELETE en masse qui n'existent pas ou ne vous sont pas visibles renvoient 422 `ENTRY_NOT_FOUND` avec une entrée par id : `/<id>` dans un corps PUT ou PATCH, `/<index>` dans une liste d'ids DELETE. Un élément désigné par son id dans le chemin renvoie 404.

400 signifie que la requête ne peut pas être interprétée (JSON ou JSON Patch mal formé, paramètre invalide), 409 qu'un JSON Patch bien formé ne s'applique pas à l'élément actuel (`test` échoué, chemin inexistant), 422 qu'un contenu bien formé n'est pas valide.

| Code | Cause typique |
| --- | --- |
| 400 | JSON ou JSON Patch mal formé, paramètre inconnu ou invalide. |
| 401 | Identifiants manquants ou incorrects. |
| 403 | Non autorisé pour votre rôle, utilisateur en lecture seule, mot de passe expiré, connexion bloquée, TOTP manquant ou invalide. |
| 404 | L'élément n'existe pas ou ne vous est pas visible. |
| 409 | Le JSON Patch ne s'applique pas à l'élément. |
| 415 | Pas de `Content-Type` et le corps n'est pas du JSON. |
| 422 | Échec de la validation, valeur en double, champ impossible à développer. |
| 423 | L'élément est encore utilisé, par exemple un contact lié à un contrat. |
| 500, 503 | Problème côté serveur. Signalez-le avec le `tx`. |

### Journalisation

Les modifications effectuées via l'API sont journalisées. `GET /<resource>/{id}/journal` liste les modifications d'un élément : qui les a faites, quand, l'opération et les données résultantes. `GET /journals` effectue une recherche dans le journal de toutes les ressources.
