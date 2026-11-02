## Autenticación

Cada solicitud requiere credenciales. Los usuarios y roles son los mismos que en el panel de administración.

| Método | Disponible para | Adecuado para |
| --- | --- | --- |
| HTTP Basic | todos | Pruebas, llamadas ocasionales. |
| Access Token | todos | Scripts y aplicaciones. |
| Auth Token (JWT) | todos excepto interceptación legal | Tareas desatendidas; se intercambia por un Access Token. |
| Certificado de cliente | administradores | Acceso máquina a máquina en el puerto 1443. |

Los usuarios con autenticación de dos factores también necesitan un código TOTP para obtener un Access Token. `GET /auth/userinfo` muestra el usuario y el rol con los que se autentica una solicitud.

### HTTP Basic

Los administradores usan su inicio de sesión del panel en el puerto 1443. Los suscriptores usan `username@domain` y su contraseña web en el puerto 443.

```shell
curl -u 'administrator:secret' -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/auth/userinfo

curl -u 'alice@voip.example.com:secret' -H 'Accept: application/json' \
  https://ngcp.example.com/api/v2/auth/userinfo
```

La comprobación de la contraseña es lenta a propósito y tarda alrededor de un segundo por solicitud. Para más de unas pocas llamadas, obtenga un Access Token una vez y envíe ese en su lugar.

### Access Token

`POST /auth/jwt` devuelve un Access Token, un JSON Web Token (JWT) para el usuario autenticado:

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

Envíelo como Bearer token hasta que caduque:

```shell
curl -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/customers
```

Un Access Token es válido durante 24 horas. Solicite una validez más corta con un cuerpo como `{"expires_in": 600}` (segundos). No se puede revocar, así que mantenga la validez tan corta como su uso lo permita.

### Auth Tokens

Un Auth Token es un JWT con nombre y una validez de hasta 30 días, pensado para tareas que no deben guardar una contraseña. Solo lo acepta `POST /auth/jwt`, por lo que una tarea lo intercambia por un Access Token de corta duración y usa este para el trabajo real.

Créelo con un Access Token. La respuesta lo contiene en `auth_token`; no se vuelve a mostrar.

```shell
curl -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"identifier": "billing-sync", "expires_in": 2592000}' \
  https://ngcp.example.com:1443/api/v2/auth/tokens
```

En la tarea, intercámbielo por un Access Token:

```shell
curl -X POST -H "Authorization: Bearer $NGCP_TOKEN" \
  -H 'Content-Type: application/json' -d '{"expires_in": 600}' \
  https://ngcp.example.com:1443/api/v2/auth/jwt
```

Liste sus Auth Tokens. La lista muestra sus ids, nombres y caducidad, no los tokens en sí:

```shell
curl -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/auth/tokens
```

Revoque uno por su id. Deja de funcionar inmediatamente:

```shell
curl -X DELETE -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://ngcp.example.com:1443/api/v2/auth/tokens/cb5019ef-c7f9-44bb-bf13-eb1cf9e5b0d7
```

### 2FA, autenticación de dos factores (TOTP)

Los usuarios con la autenticación de dos factores activada necesitan una contraseña de un solo uso basada en el tiempo (TOTP) de su aplicación de autenticación para obtener un Access Token con su contraseña. Envíe el código actual en `X-TOTP`:

```shell
curl -u 'administrator:secret' -H 'X-TOTP: 492039' -X POST \
  https://ngcp.example.com:1443/api/v2/auth/jwt
```

El código solo se necesita aquí. Las solicitudes con el Access Token, el intercambio de un Auth Token y los certificados de cliente no lo piden. Sin código, la solicitud falla con 403 `Missing OTP`; con uno incorrecto, con 403 `Invalid OTP`.

Para configurar la aplicación de autenticación, obtenga el secreto con `GET /auth/otp`, o un código QR para escanear con `GET /auth/otp?qr=true`. Hasta que se haya usado el primer código, el error `Missing OTP` remite a este endpoint, que funciona sin código.

```shell
curl -u 'administrator:secret' -o otp.png \
  'https://ngcp.example.com:1443/api/v2/auth/otp?qr=true'
```

### Certificados de cliente

Los administradores pueden autenticarse con un certificado de cliente X.509 en el puerto 1443. Cree el certificado de un administrador en el panel de administración, en Administrators. La descarga contiene un archivo PEM para programas y un archivo P12 para navegadores.

```shell
curl --cert NGCP-API-client-certificate-1793370542.pem -H 'Accept: application/json' \
  https://ngcp.example.com:1443/api/v2/auth/userinfo
```

### Reglas de la cuenta

- Tras varios inicios de sesión fallidos seguidos, el inicio de sesión se bloquea durante un tiempo y las solicitudes fallan con 403 hasta que el bloqueo termina o se levanta con `DELETE /bans/admins/{id}` o `DELETE /bans/subscribers/{id}`.
- Una contraseña más antigua que la antigüedad máxima configurada se rechaza con 403. Establezca una nueva con `POST /auth/password/change`, que sigue aceptando la contraseña anterior.
- Los usuarios marcados como de solo lectura solo pueden enviar solicitudes GET.
