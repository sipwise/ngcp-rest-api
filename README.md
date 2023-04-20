# NGCP API

NGCP API is a RESTful based provider for working with the NGCP databases and micro services.

## Installation

### As a package

Use the package manager to install the ngcp-api package

```bash
apt install ngcp-rest-api
```

### Manual

Clone the repository

```bash
git clone ngcp-rest-api && cd ngcp-rest-api
```

Node Version
> Note that `node 18` is required.

Install `systemd` development files required for `sd-notify` to work properly

```bash
apt install libsystemd-dev
```

Fetch the required nodejs modules

```bash
yarnpkg install
```

## Configuration

To change the configuration the local file `etc/api.conf` can be edited.

### SSL keys

For local development generate self-signed SSL keys in `./etc/ssl`

```bash
node tools/generate-self-signed-keys.js --destdir ./etc/ssl
```

### Env

The following Env variables can be set to configure the API.

- `API_DB_USER`
- `API_DB_PASS`
- `API_DB_HOST`
- `API_DB_PORT`

### Database connection for local development

Allow `root` access to `API_DB_HOST`

Run the following command on the `API_DB_HOST`:
```bash
mysql -e "grant all privileges on *.* to root@'%';; flush privileges;"
```

## Usage

Server runs at `https://localhost:2443` by default

### Production mode

```bash
yarnpkg start:prod
```

### Development mode

```bash
yarnpkg start:dev
```

## Testing

### Unit tests

These tests require no database connection and test the internal service logic with mocked repositories.

```bash
yarnpkg test
```

### e2e Tests

These tests require a working database connection and test the controller part of the API

```bash
yarnpkg test:e2e
```

## Lint check

```bash
yarnpkg lint
```

## Running server behind nginx to reroute certain endpoints from API v1 to API v2

Create a customtt from '/etc/ngcp-config/templates/etc/nginx/sites-available/ngcp-panel_admin_api.tt2'

```bash
cd /etc/ngcp-config/templates/etc/nginx/sites-available/ &&
cp ngcp-panel_admin_api.tt2 ngcp-panel_admin_api.customtt.tt2
```

To reroute /api/admins and /api/domains

```bash
@@ -41,6 +44,15 @@
        root  /usr/share/ngcp-panel;
    }

+    # API v2
+    location ~ ^/api/(admins|domains) {
+        proxy_set_header X-Real-IP $remote_addr;
+        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
+        proxy_set_header Host $http_host;
+        proxy_pass http://localhost:1441;
+    }
+
+    # API v1
    [%- IF is_mgmt %]
    location ~ ^/api {
    [%- ELSE %]
```

```bash
ngcp-service restart nginx
```

Now the default API port(1443) + SSL can be used to transparently access the rerouted endpoints

```bash
curl -i -X GET  -H 'Content-Type: application/json' -k -uadministrator:administrator 'https://10.30.40.109:1443/api/domains/'
```

## Currently supported

* [ORM](https://sequelize.org) supporting provisioning domains and admins
* JSON HAL data representation (backward compatibility with APIv1)
* Bcrypt authorization
* Input data validation
* Develompent mode
* Self testing
* Link checking

## License

[GPL-3+](https://spdx.org/licenses/GPL-3.0-or-later.html)
