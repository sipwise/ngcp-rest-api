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

Fetch the required nodejs modules

```bash
yarnpkg install
```

## Usage

Server runs at http://localhost:1441

### Production mode

```bash
yarnpkg start
```

### Development mode

```bash
yarnpkg dev
```

### Test mode

```bash
yarnpkg test
```

### Lint check

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
## Generating NestJS entities from database
### Example
```bash
 yarnpkg stg -h localhost -D mysql -u root -d accounting -t api_journal_objects -o src/modules/journalV2/generated
```
