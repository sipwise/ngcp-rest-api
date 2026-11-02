## Authentification

Chaque requête nécessite des identifiants. Les utilisateurs et les rôles sont les mêmes que dans le panneau d'administration.

| Méthode | Disponible pour | Adaptée à |
| --- | --- | --- |
| HTTP Basic | tous | Essais, appels occasionnels. |
| Access Token | tous | Scripts et applications. |
| Auth Token (JWT) | tous sauf l'interception légale | Tâches automatisées ; échangé contre un Access Token. |
| Certificat client | administrateurs | Accès de machine à machine sur le port 1443. |

Les utilisateurs ayant activé l'authentification à deux facteurs ont en outre besoin d'un code TOTP pour obtenir un Access Token. `GET /auth/userinfo` indique l'utilisateur et le rôle sous lesquels une requête est authentifiée.

### HTTP Basic

Les administrateurs utilisent leurs identifiants du panneau sur le port 1443. Les abonnés utilisent `username@domain` et leur mot de passe web sur le port 443.

```shell
curl -u 'administrator:secret' -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/auth/userinfo

curl -u 'alice@voip.example.com:secret' -H 'Accept: application/json' \
  https://ngcp.example.com/api/v2/auth/userinfo
```

La vérification du mot de passe est volontairement lente et prend environ une seconde par requête. Au-delà de quelques appels, obtenez une fois un Access Token et envoyez-le à la place.

### Access Token

`POST /auth/jwt` renvoie un Access Token, un JSON Web Token (JWT) pour l'utilisateur authentifié :

```shell
curl -u 'administrator:secret' -X POST https://ngcp.example.com:1443/api/v2/auth/jwt
```

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "created_at": "2026-10-30T15:17:36.423Z",
  "expires_at": "2026-10-31T15:17:36.423Z"
}
```

Envoyez-le comme Bearer token jusqu'à son expiration :

```shell
curl -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/customers
```

Un Access Token est valable 24 heures. Demandez une durée de vie plus courte avec un corps tel que `{"expires_in": 600}` (en secondes). Il ne peut pas être révoqué ; choisissez donc des durées de vie aussi courtes que votre usage le permet.

### Auth Tokens

Un Auth Token est un JWT nommé d'une durée de vie maximale de 30 jours, destiné aux tâches qui ne doivent pas détenir de mot de passe. Il n'est accepté que par `POST /auth/jwt` : une tâche l'échange donc contre un Access Token de courte durée et utilise ce dernier pour le travail proprement dit.

Créez-en un avec un Access Token. La réponse le contient dans `auth_token` ; il n'est plus affiché par la suite.

```shell
curl -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"identifier": "billing-sync", "expires_in": 2592000}' \
  https://ngcp.example.com:1443/api/v2/auth/tokens
```

Dans la tâche, échangez-le contre un Access Token :

```shell
curl -X POST -H "Authorization: Bearer $NGCP_TOKEN" \
  -H 'Content-Type: application/json' -d '{"expires_in": 600}' \
  https://ngcp.example.com:1443/api/v2/auth/jwt
```

Listez vos Auth Tokens. La liste affiche leurs id, noms et dates d'expiration, mais pas les tokens eux-mêmes :

```shell
curl -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/auth/tokens
```

Révoquez-en un par son id. Il cesse immédiatement de fonctionner :

```shell
curl -X DELETE -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://ngcp.example.com:1443/api/v2/auth/tokens/cb5019ef-c7f9-44bb-bf13-eb1cf9e5b0d7
```

### 2FA, authentification à deux facteurs (TOTP)

Les utilisateurs ayant activé l'authentification à deux facteurs ont besoin d'un mot de passe à usage unique basé sur le temps (TOTP), fourni par leur application d'authentification, pour obtenir un Access Token avec leur mot de passe. Envoyez le code actuel dans `X-TOTP` :

```shell
curl -u 'administrator:secret' -H 'X-TOTP: 492039' -X POST \
  https://ngcp.example.com:1443/api/v2/auth/jwt
```

Le code n'est nécessaire qu'ici. Les requêtes avec l'Access Token, l'échange d'un Auth Token et les certificats clients ne le demandent pas. Sans code, la requête échoue avec 403 `Missing OTP` ; avec un code erroné, avec 403 `Invalid OTP`.

Pour configurer l'application d'authentification, obtenez le secret avec `GET /auth/otp`, ou un QR code à scanner avec `GET /auth/otp?qr=true`. Tant que le premier code n'a pas été utilisé, l'erreur `Missing OTP` renvoie à cet endpoint, qui fonctionne sans code.

```shell
curl -u 'administrator:secret' -o otp.png \
  'https://ngcp.example.com:1443/api/v2/auth/otp?qr=true'
```

### Certificats clients

Les administrateurs peuvent s'authentifier avec un certificat client X.509 sur le port 1443. Créez le certificat d'un administrateur dans le panneau d'administration, sous Administrators. Le téléchargement contient un fichier PEM pour les programmes et un fichier P12 pour les navigateurs.

```shell
curl --cert NGCP-API-client-certificate-1793370542.pem -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/auth/userinfo
```

### Règles de compte

- Après plusieurs échecs de connexion consécutifs, la connexion est bloquée pendant un certain temps et les requêtes échouent avec 403 jusqu'à la fin du blocage ou sa levée avec `DELETE /bans/admins/{id}` ou `DELETE /bans/subscribers/{id}`.
- Un mot de passe plus ancien que la durée maximale configurée est rejeté avec 403. Définissez-en un nouveau avec `POST /auth/password/change`, qui accepte encore l'ancien mot de passe.
- Les utilisateurs marqués en lecture seule ne peuvent envoyer que des requêtes GET.
