## Introduction

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

Les champs de référence tels que `reseller_id` ou `contract_id` peuvent être résolus dans la même requête avec `expand`. L'élément référencé est ajouté sous `<field>_expand`, et un point descend d'un niveau supplémentaire :

```http
GET /api/v2/resellers/1?expand=contract_id.contact_id
```

Un champ qui ne peut pas être développé renvoie 422. Ajoutez `soft_expand=1` pour ignorer ces champs à la place.

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

### Erreurs

Les erreurs ont un corps JSON. `message` est un texte ou, en cas d'échec de la validation, une liste des champs rejetés avec les contrôles qui ont échoué :

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

`tx` identifie la requête dans le journal du serveur (`/var/log/ngcp/rest-api.log`). Indiquez-le lorsque vous signalez un problème.

| Code | Cause typique |
| --- | --- |
| 400 | Requête mal formée, paramètre de requête inconnu, JSON Patch invalide. |
| 401 | Identifiants manquants ou incorrects. |
| 403 | Non autorisé pour votre rôle, utilisateur en lecture seule, mot de passe expiré, connexion bloquée, TOTP manquant ou invalide. |
| 404 | L'élément n'existe pas ou ne vous est pas visible. |
| 415 | Le corps n'est pas du JSON valide. |
| 422 | Échec de la validation, valeur en double, champ impossible à développer. |
| 423 | L'élément est encore utilisé, par exemple un contact lié à un contrat. |
| 500, 503 | Problème côté serveur. Signalez-le avec le `tx`. |

### Journalisation

Les modifications effectuées via l'API sont journalisées. `GET /<resource>/{id}/journal` liste les modifications d'un élément : qui les a faites, quand, l'opération et les données résultantes. `GET /journals` effectue une recherche dans le journal de toutes les ressources.
