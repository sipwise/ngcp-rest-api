## Utilizzo

Gli esempi leggono l'URL di base e le credenziali da variabili d'ambiente:

```shell
export NGCP_URL=https://ngcp.example.com:1443/api/v2
export NGCP_USER=administrator
export NGCP_PASS=secret
# certificate examples: the PEM file of the client certificate download
export NGCP_CERT=NGCP-API-client-certificate-1793370542.pem
# Java and Rust load the P12 file of the same download, its password is in the included README.txt
export NGCP_CERT_P12=NGCP-API-client-certificate-1793370542.p12
export NGCP_CERT_PASS=cert_secret
# 2FA example: the current code of the authenticator app
export NGCP_OTP=492039
```

Scegliere un linguaggio e il metodo di autenticazione. Gli esempi mostrano solo le richieste; la prima riga indica ciò che serve a ciascuna.

### Certificato del server autofirmato

I client rifiutano un certificato del server autofirmato. Negli ambienti di laboratorio che ne usano uno, aggiungere agli esempi la modifica del proprio linguaggio riportata sotto; disattiva la verifica del certificato del server. Non usarla mai in produzione: lì il server ha bisogno di un certificato di una CA attendibile, oppure il client si fida del certificato della piattaforma (per esempio con `curl --cacert`).

```shell
# curl: add -k (--insecure) to the examples
curl -sS --fail-with-body -k -u "$NGCP_USER:$NGCP_PASS" "$NGCP_URL/auth/userinfo"
```

```javascript
// Node.js: before the first request, or start it with NODE_TLS_REJECT_UNAUTHORIZED=0 node list.mjs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
```

```typescript
// TypeScript: before the first request, or start it with NODE_TLS_REJECT_UNAUTHORIZED=0 node list.ts
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
```

```python
# Python 3 with requests: verify=False in each request, without the warning urllib3 prints for it
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

res = requests.get(f"{url}/auth/userinfo", auth=(os.environ["NGCP_USER"], os.environ["NGCP_PASS"]), verify=False)
```

```go
// Go: before the first request, for the examples with http.DefaultClient
import "crypto/tls"

http.DefaultTransport.(*http.Transport).TLSClientConfig = &tls.Config{InsecureSkipVerify: true}

// the certificate examples set it in the TLS config of their client
client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{Certificates: []tls.Certificate{cert}, InsecureSkipVerify: true}}}
```

```java
// Java: an SSLContext that accepts any server certificate and host name
import java.net.Socket;
import java.security.cert.X509Certificate;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLEngine;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509ExtendedTrustManager;

TrustManager[] trustAll = {new X509ExtendedTrustManager() {
    public void checkClientTrusted(X509Certificate[] chain, String authType) {}
    public void checkClientTrusted(X509Certificate[] chain, String authType, Socket socket) {}
    public void checkClientTrusted(X509Certificate[] chain, String authType, SSLEngine engine) {}
    public void checkServerTrusted(X509Certificate[] chain, String authType) {}
    public void checkServerTrusted(X509Certificate[] chain, String authType, Socket socket) {}
    public void checkServerTrusted(X509Certificate[] chain, String authType, SSLEngine engine) {}
    public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
}};
SSLContext ssl = SSLContext.getInstance("TLS");
// the certificate examples pass their key managers: ssl.init(keys.getKeyManagers(), trustAll, null)
ssl.init(null, trustAll, null);
HttpClient http = HttpClient.newBuilder().sslContext(ssl).build();
```

```csharp
// .NET 8: a handler that accepts any server certificate, the certificate examples set it on their handler
var handler = new HttpClientHandler
{
    ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator,
};
var http = new HttpClient(handler);
```

```rust
// Rust with reqwest: build the client with danger_accept_invalid_certs
let http = Client::builder().danger_accept_invalid_certs(true).build()?;

// the certificate examples add it to their builder
let http = Client::builder()
    .identity(Identity::from_pkcs12_der(&p12, &env::var("NGCP_CERT_PASS")?)?)
    .danger_accept_invalid_certs(true)
    .build()?;
```

```c
/* libcurl: switch off both checks on the handle, before curl_easy_perform */
curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);
```

```cpp
// libcurl: switch off both checks on the handle, before curl_easy_perform
curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);
curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);
```

```perl
# Perl with LWP::UserAgent: the certificate examples add both options to their ssl_opts
use IO::Socket::SSL qw(SSL_VERIFY_NONE);

my $ua = LWP::UserAgent->new(ssl_opts => {verify_hostname => 0, SSL_verify_mode => SSL_VERIFY_NONE});
```

```elixir
# Elixir with Req: in each request, the certificate examples add it next to certfile and keyfile
res = Req.get!("#{url}/auth/userinfo",
  auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")},
  connect_options: [transport_opts: [verify: :verify_none]]
)
```

### Leggere una collezione (GET)

Legge i primi 50 contatti con un indirizzo `@example.com`, ordinati per id.

```shell Basic Auth
# curl
curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -H 'Accept: application/json' \
  "$NGCP_URL/customercontacts?email=*@example.com&order_by=id&rows=50&page=1"
```

```shell Access Token
# curl and jq
token=$(curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -X POST "$NGCP_URL/auth/jwt" | jq -r .access_token)

curl -sS --fail-with-body -H "Authorization: Bearer $token" -H 'Accept: application/json' \
  "$NGCP_URL/customercontacts?email=*@example.com&order_by=id&rows=50&page=1"
```

```shell Certificate
# curl
curl -sS --fail-with-body --cert "$NGCP_CERT" -H 'Accept: application/json' \
  "$NGCP_URL/customercontacts?email=*@example.com&order_by=id&rows=50&page=1"
```

```javascript Basic Auth
// Node.js 18 or later, save as list.mjs
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env
const auth = 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')

const res = await fetch(`${NGCP_URL}/customercontacts?email=*@example.com&order_by=id&rows=50&page=1`, {
  headers: {Authorization: auth, Accept: 'application/json'},
})
console.log(res.status, await res.text())
```

```javascript Access Token
// Node.js 18 or later, save as list.mjs
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')}})
const {access_token} = await login.json()
const auth = `Bearer ${access_token}`

const res = await fetch(`${NGCP_URL}/customercontacts?email=*@example.com&order_by=id&rows=50&page=1`, {
  headers: {Authorization: auth, Accept: 'application/json'},
})
console.log(res.status, await res.text())
```

```javascript Certificate
// Node.js 20 or later with undici (npm install undici), save as list.mjs
import {readFileSync} from 'node:fs'
import {Agent, fetch} from 'undici'

const {NGCP_URL, NGCP_CERT} = process.env
const pem = readFileSync(NGCP_CERT)
const dispatcher = new Agent({connect: {cert: pem, key: pem}})

const res = await fetch(`${NGCP_URL}/customercontacts?email=*@example.com&order_by=id&rows=50&page=1`, {
  headers: {Accept: 'application/json'}, dispatcher,
})
console.log(res.status, await res.text())
```

```typescript Basic Auth
// TypeScript, run with Node.js 23.6 or later: node list.ts
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env
const auth = 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')

const res = await fetch(`${NGCP_URL}/customercontacts?email=*@example.com&order_by=id&rows=50&page=1`, {
  headers: {Authorization: auth, Accept: 'application/json'},
})
console.log(res.status, await res.text())
```

```typescript Access Token
// TypeScript, run with Node.js 23.6 or later: node list.ts
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')}})
const {access_token} = await login.json() as {access_token: string}
const auth = `Bearer ${access_token}`

const res = await fetch(`${NGCP_URL}/customercontacts?email=*@example.com&order_by=id&rows=50&page=1`, {
  headers: {Authorization: auth, Accept: 'application/json'},
})
console.log(res.status, await res.text())
```

```typescript Certificate
// TypeScript with undici (npm install undici), run with Node.js 23.6 or later: node list.ts
import {readFileSync} from 'node:fs'
import {Agent, fetch} from 'undici'

const {NGCP_URL, NGCP_CERT = ''} = process.env
const pem = readFileSync(NGCP_CERT)
const dispatcher = new Agent({connect: {cert: pem, key: pem}})

const res = await fetch(`${NGCP_URL}/customercontacts?email=*@example.com&order_by=id&rows=50&page=1`, {
  headers: {Accept: 'application/json'}, dispatcher,
})
console.log(res.status, await res.text())
```

```python Basic Auth
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]

res = requests.get(f"{url}/customercontacts", params={"email": "*@example.com", "order_by": "id", "rows": 50, "page": 1},
                   auth=(os.environ["NGCP_USER"], os.environ["NGCP_PASS"]), headers={"Accept": "application/json"})
res.raise_for_status()
print(res.json())
```

```python Access Token
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
token = requests.post(f"{url}/auth/jwt", auth=(os.environ["NGCP_USER"], os.environ["NGCP_PASS"])).json()["access_token"]

res = requests.get(f"{url}/customercontacts", params={"email": "*@example.com", "order_by": "id", "rows": 50, "page": 1},
                   headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
res.raise_for_status()
print(res.json())
```

```python Certificate
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]

res = requests.get(f"{url}/customercontacts", params={"email": "*@example.com", "order_by": "id", "rows": 50, "page": 1},
                   cert=os.environ["NGCP_CERT"], headers={"Accept": "application/json"})
res.raise_for_status()
print(res.json())
```

```go Basic Auth
// Go, standard library only
package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	url := os.Getenv("NGCP_URL")
	req, _ := http.NewRequest("GET", url+"/customercontacts?email=*@example.com&order_by=id&rows=50&page=1", nil)
	req.Header.Set("Accept", "application/json")
	req.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	fmt.Println(res.Status, string(body))
}
```

```go Access Token
// Go, standard library only
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	url := os.Getenv("NGCP_URL")
	login, _ := http.NewRequest("POST", url+"/auth/jwt", nil)
	login.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	out, err := http.DefaultClient.Do(login)
	if err != nil {
		panic(err)
	}
	var jwt struct {
		AccessToken string `json:"access_token"`
	}
	json.NewDecoder(out.Body).Decode(&jwt)
	out.Body.Close()

	req, _ := http.NewRequest("GET", url+"/customercontacts?email=*@example.com&order_by=id&rows=50&page=1", nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+jwt.AccessToken)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	fmt.Println(res.Status, string(body))
}
```

```go Certificate
// Go, standard library only
package main

import (
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	url := os.Getenv("NGCP_URL")
	cert, err := tls.LoadX509KeyPair(os.Getenv("NGCP_CERT"), os.Getenv("NGCP_CERT"))
	if err != nil {
		panic(err)
	}
	client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{Certificates: []tls.Certificate{cert}}}}

	req, _ := http.NewRequest("GET", url+"/customercontacts?email=*@example.com&order_by=id&rows=50&page=1", nil)
	req.Header.Set("Accept", "application/json")
	res, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	fmt.Println(res.Status, string(body))
}
```

```java Basic Auth
// Java 17 or later
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

public class ListContacts {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();
        String auth = "Basic " + Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());

        HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts?email=*@example.com&order_by=id&rows=50&page=1"))
            .header("Accept", "application/json")
            .header("Authorization", auth)
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(res.statusCode() + " " + res.body());
    }
}
```

```java Access Token
// Java 17 or later with Jackson (com.fasterxml.jackson.core:jackson-databind)
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

public class ListContacts {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();
        String credentials = Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());
        HttpResponse<String> login = http.send(HttpRequest.newBuilder(URI.create(url + "/auth/jwt"))
            .header("Authorization", "Basic " + credentials)
            .POST(HttpRequest.BodyPublishers.noBody())
            .build(), HttpResponse.BodyHandlers.ofString());
        String auth = "Bearer " + new ObjectMapper().readTree(login.body()).get("access_token").asText();

        HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts?email=*@example.com&order_by=id&rows=50&page=1"))
            .header("Accept", "application/json")
            .header("Authorization", auth)
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(res.statusCode() + " " + res.body());
    }
}
```

```java Certificate
// Java 17 or later
import java.io.FileInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyStore;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;

public class ListContacts {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        char[] password = System.getenv("NGCP_CERT_PASS").toCharArray();
        KeyStore store = KeyStore.getInstance("PKCS12");
        try (FileInputStream in = new FileInputStream(System.getenv("NGCP_CERT_P12"))) {
            store.load(in, password);
        }
        KeyManagerFactory keys = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        keys.init(store, password);
        SSLContext ssl = SSLContext.getInstance("TLS");
        ssl.init(keys.getKeyManagers(), null, null);
        HttpClient http = HttpClient.newBuilder().sslContext(ssl).build();

        HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts?email=*@example.com&order_by=id&rows=50&page=1"))
            .header("Accept", "application/json")
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(res.statusCode() + " " + res.body());
    }
}
```

```csharp Basic Auth
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Text;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

http.DefaultRequestHeaders.Accept.ParseAdd("application/json");
var res = await http.GetAsync($"{url}/customercontacts?email=*@example.com&order_by=id&rows=50&page=1");
Console.WriteLine($"{(int)res.StatusCode} {await res.Content.ReadAsStringAsync()}");
```

```csharp Access Token
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
var login = new HttpRequestMessage(HttpMethod.Post, $"{url}/auth/jwt");
login.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
var jwt = await (await http.SendAsync(login)).Content.ReadFromJsonAsync<JsonElement>();
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt.GetProperty("access_token").GetString());

http.DefaultRequestHeaders.Accept.ParseAdd("application/json");
var res = await http.GetAsync($"{url}/customercontacts?email=*@example.com&order_by=id&rows=50&page=1");
Console.WriteLine($"{(int)res.StatusCode} {await res.Content.ReadAsStringAsync()}");
```

```csharp Certificate
// .NET 8, no extra packages
using System.Security.Cryptography.X509Certificates;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var handler = new HttpClientHandler();
handler.ClientCertificates.Add(X509Certificate2.CreateFromPemFile(Environment.GetEnvironmentVariable("NGCP_CERT")!));
var http = new HttpClient(handler);

http.DefaultRequestHeaders.Accept.ParseAdd("application/json");
var res = await http.GetAsync($"{url}/customercontacts?email=*@example.com&order_by=id&rows=50&page=1");
Console.WriteLine($"{(int)res.StatusCode} {await res.Content.ReadAsStringAsync()}");
```

```rust Basic Auth
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking"] }
use reqwest::blocking::Client;
use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();

    let res = http
        .get(format!("{url}/customercontacts?email=*@example.com&order_by=id&rows=50&page=1"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .header("Accept", "application/json")
        .send()?;
    println!("{} {}", res.status(), res.text()?);
    Ok(())
}
```

```rust Access Token
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "json"] }, serde_json = "1"
use reqwest::blocking::Client;
use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();
    let jwt: serde_json::Value = http
        .post(format!("{url}/auth/jwt"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .send()?
        .json()?;
    let token = jwt["access_token"].as_str().unwrap_or_default();

    let res = http
        .get(format!("{url}/customercontacts?email=*@example.com&order_by=id&rows=50&page=1"))
        .bearer_auth(token)
        .header("Accept", "application/json")
        .send()?;
    println!("{} {}", res.status(), res.text()?);
    Ok(())
}
```

```rust Certificate
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "native-tls"] }
use reqwest::blocking::Client;
use reqwest::Identity;
use std::{env, fs};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let p12 = fs::read(env::var("NGCP_CERT_P12")?)?;
    let http = Client::builder().identity(Identity::from_pkcs12_der(&p12, &env::var("NGCP_CERT_PASS")?)?).build()?;

    let res = http
        .get(format!("{url}/customercontacts?email=*@example.com&order_by=id&rows=50&page=1"))
        .header("Accept", "application/json")
        .send()?;
    println!("{} {}", res.status(), res.text()?);
    Ok(())
}
```

```c Basic Auth
/* libcurl: cc list.c -o list -lcurl */
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>

int main(void)
{
    char url[512], userpwd[256];
    CURL *curl = curl_easy_init();
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);

    struct curl_slist *headers = curl_slist_append(NULL, "Accept: application/json");
    snprintf(url, sizeof url, "%s/customercontacts?email=*%%40example.com&order_by=id&rows=50&page=1", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    CURLcode rc = curl_easy_perform(curl);  /* writes the response body to stdout */
    if (rc != CURLE_OK)
        fprintf(stderr, "%s\n", curl_easy_strerror(rc));

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```c Access Token
/* libcurl and cJSON: cc list.c -o list -lcurl -lcjson */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include <cjson/cJSON.h>

/* appends the response body to the buffer */
static size_t save(char *data, size_t size, size_t n, void *body)
{
    size_t room = 4095 - strlen(body);
    strncat(body, data, size * n < room ? size * n : room);
    return size * n;
}

int main(void)
{
    char url[512], userpwd[256], body[4096] = "";
    CURL *curl = curl_easy_init();
    snprintf(url, sizeof url, "%s/auth/jwt", getenv("NGCP_URL"));
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, body);
    curl_easy_perform(curl);
    cJSON *jwt = cJSON_Parse(body);
    curl_easy_reset(curl);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, cJSON_GetObjectItem(jwt, "access_token")->valuestring);
    cJSON_Delete(jwt);

    struct curl_slist *headers = curl_slist_append(NULL, "Accept: application/json");
    snprintf(url, sizeof url, "%s/customercontacts?email=*%%40example.com&order_by=id&rows=50&page=1", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    CURLcode rc = curl_easy_perform(curl);  /* writes the response body to stdout */
    if (rc != CURLE_OK)
        fprintf(stderr, "%s\n", curl_easy_strerror(rc));

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```c Certificate
/* libcurl: cc list.c -o list -lcurl */
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>

int main(void)
{
    char url[512];
    CURL *curl = curl_easy_init();
    curl_easy_setopt(curl, CURLOPT_SSLCERT, getenv("NGCP_CERT"));
    curl_easy_setopt(curl, CURLOPT_SSLKEY, getenv("NGCP_CERT"));

    struct curl_slist *headers = curl_slist_append(NULL, "Accept: application/json");
    snprintf(url, sizeof url, "%s/customercontacts?email=*%%40example.com&order_by=id&rows=50&page=1", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    CURLcode rc = curl_easy_perform(curl);  /* writes the response body to stdout */
    if (rc != CURLE_OK)
        fprintf(stderr, "%s\n", curl_easy_strerror(rc));

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```cpp Basic Auth
// libcurl: c++ -std=c++17 list.cpp -o list -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>

int main()
{
    std::string url = std::getenv("NGCP_URL");
    CURL* curl = curl_easy_init();
    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());

    curl_slist* headers = curl_slist_append(nullptr, "Accept: application/json");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts?email=*%40example.com&order_by=id&rows=50&page=1").c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    CURLcode rc = curl_easy_perform(curl);  // writes the response body to stdout
    if (rc != CURLE_OK)
        std::cerr << curl_easy_strerror(rc) << '\n';

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```cpp Access Token
// libcurl and nlohmann/json: c++ -std=c++17 list.cpp -o list -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

// appends the response body to a std::string
static size_t save(char* data, size_t size, size_t n, void* body)
{
    static_cast<std::string*>(body)->append(data, size * n);
    return size * n;
}

int main()
{
    std::string url = std::getenv("NGCP_URL"), body;
    CURL* curl = curl_easy_init();
    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/auth/jwt").c_str());
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
    curl_easy_perform(curl);
    std::string token = nlohmann::json::parse(body)["access_token"];
    body.clear();
    curl_easy_reset(curl);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, token.c_str());

    curl_slist* headers = curl_slist_append(nullptr, "Accept: application/json");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts?email=*%40example.com&order_by=id&rows=50&page=1").c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    CURLcode rc = curl_easy_perform(curl);  // writes the response body to stdout
    if (rc != CURLE_OK)
        std::cerr << curl_easy_strerror(rc) << '\n';

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```cpp Certificate
// libcurl: c++ -std=c++17 list.cpp -o list -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>

int main()
{
    std::string url = std::getenv("NGCP_URL");
    CURL* curl = curl_easy_init();
    curl_easy_setopt(curl, CURLOPT_SSLCERT, std::getenv("NGCP_CERT"));
    curl_easy_setopt(curl, CURLOPT_SSLKEY, std::getenv("NGCP_CERT"));

    curl_slist* headers = curl_slist_append(nullptr, "Accept: application/json");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts?email=*%40example.com&order_by=id&rows=50&page=1").c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    CURLcode rc = curl_easy_perform(curl);  // writes the response body to stdout
    if (rc != CURLE_OK)
        std::cerr << curl_easy_strerror(rc) << '\n';

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```perl Basic Auth
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;
$ua->default_headers->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});

my $res = $ua->get("$ENV{NGCP_URL}/customercontacts?email=*\@example.com&order_by=id&rows=50&page=1",
    Accept => 'application/json');
print $res->code, ' ', $res->content, "\n";
```

```perl Access Token
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use JSON::PP qw(decode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;
my $login = HTTP::Request->new(POST => "$ENV{NGCP_URL}/auth/jwt");
$login->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});
my $token = decode_json($ua->request($login)->content)->{access_token};
$ua->default_header(Authorization => "Bearer $token");

my $res = $ua->get("$ENV{NGCP_URL}/customercontacts?email=*\@example.com&order_by=id&rows=50&page=1",
    Accept => 'application/json');
print $res->code, ' ', $res->content, "\n";
```

```perl Certificate
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use LWP::UserAgent;

my $ua = LWP::UserAgent->new(ssl_opts => {SSL_cert_file => $ENV{NGCP_CERT}, SSL_key_file => $ENV{NGCP_CERT}});

my $res = $ua->get("$ENV{NGCP_URL}/customercontacts?email=*\@example.com&order_by=id&rows=50&page=1",
    Accept => 'application/json');
print $res->code, ' ', $res->content, "\n";
```

```elixir Basic Auth
# Elixir with Req, run with: elixir list.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

res =
  Req.get!("#{url}/customercontacts",
    auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")},
    headers: [accept: "application/json"],
    params: [email: "*@example.com", order_by: "id", rows: 50, page: 1]
  )

IO.inspect({res.status, res.body})
```

```elixir Access Token
# Elixir with Req, run with: elixir list.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

%{body: %{"access_token" => token}} =
  Req.post!("#{url}/auth/jwt", auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")})

res =
  Req.get!("#{url}/customercontacts",
    auth: {:bearer, token},
    headers: [accept: "application/json"],
    params: [email: "*@example.com", order_by: "id", rows: 50, page: 1]
  )

IO.inspect({res.status, res.body})
```

```elixir Certificate
# Elixir with Req, run with: elixir list.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

res =
  Req.get!("#{url}/customercontacts",
    connect_options: [transport_opts: [certfile: System.fetch_env!("NGCP_CERT"), keyfile: System.fetch_env!("NGCP_CERT")]],
    headers: [accept: "application/json"],
    params: [email: "*@example.com", order_by: "id", rows: 50, page: 1]
  )

IO.inspect({res.status, res.body})
```

### Leggere un elemento (GET)

Legge il contatto con id 7.

```shell Basic Auth
# curl
curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -H 'Accept: application/json' \
  "$NGCP_URL/customercontacts/7"
```

```shell Access Token
# curl and jq
token=$(curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -X POST "$NGCP_URL/auth/jwt" | jq -r .access_token)

curl -sS --fail-with-body -H "Authorization: Bearer $token" -H 'Accept: application/json' \
  "$NGCP_URL/customercontacts/7"
```

```shell Certificate
# curl
curl -sS --fail-with-body --cert "$NGCP_CERT" -H 'Accept: application/json' \
  "$NGCP_URL/customercontacts/7"
```

```javascript Basic Auth
// Node.js 18 or later, save as get.mjs
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env
const auth = 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')

const res = await fetch(`${NGCP_URL}/customercontacts/7`, {
  headers: {Authorization: auth, Accept: 'application/json'},
})
console.log(res.status, await res.text())
```

```javascript Access Token
// Node.js 18 or later, save as get.mjs
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')}})
const {access_token} = await login.json()
const auth = `Bearer ${access_token}`

const res = await fetch(`${NGCP_URL}/customercontacts/7`, {
  headers: {Authorization: auth, Accept: 'application/json'},
})
console.log(res.status, await res.text())
```

```javascript Certificate
// Node.js 20 or later with undici (npm install undici), save as get.mjs
import {readFileSync} from 'node:fs'
import {Agent, fetch} from 'undici'

const {NGCP_URL, NGCP_CERT} = process.env
const pem = readFileSync(NGCP_CERT)
const dispatcher = new Agent({connect: {cert: pem, key: pem}})

const res = await fetch(`${NGCP_URL}/customercontacts/7`, {
  headers: {Accept: 'application/json'}, dispatcher,
})
console.log(res.status, await res.text())
```

```typescript Basic Auth
// TypeScript, run with Node.js 23.6 or later: node get.ts
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env
const auth = 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')

const res = await fetch(`${NGCP_URL}/customercontacts/7`, {
  headers: {Authorization: auth, Accept: 'application/json'},
})
console.log(res.status, await res.text())
```

```typescript Access Token
// TypeScript, run with Node.js 23.6 or later: node get.ts
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')}})
const {access_token} = await login.json() as {access_token: string}
const auth = `Bearer ${access_token}`

const res = await fetch(`${NGCP_URL}/customercontacts/7`, {
  headers: {Authorization: auth, Accept: 'application/json'},
})
console.log(res.status, await res.text())
```

```typescript Certificate
// TypeScript with undici (npm install undici), run with Node.js 23.6 or later: node get.ts
import {readFileSync} from 'node:fs'
import {Agent, fetch} from 'undici'

const {NGCP_URL, NGCP_CERT = ''} = process.env
const pem = readFileSync(NGCP_CERT)
const dispatcher = new Agent({connect: {cert: pem, key: pem}})

const res = await fetch(`${NGCP_URL}/customercontacts/7`, {
  headers: {Accept: 'application/json'}, dispatcher,
})
console.log(res.status, await res.text())
```

```python Basic Auth
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]

res = requests.get(f"{url}/customercontacts/7",
                   auth=(os.environ["NGCP_USER"], os.environ["NGCP_PASS"]), headers={"Accept": "application/json"})
res.raise_for_status()
print(res.json())
```

```python Access Token
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
token = requests.post(f"{url}/auth/jwt", auth=(os.environ["NGCP_USER"], os.environ["NGCP_PASS"])).json()["access_token"]

res = requests.get(f"{url}/customercontacts/7",
                   headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
res.raise_for_status()
print(res.json())
```

```python Certificate
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]

res = requests.get(f"{url}/customercontacts/7",
                   cert=os.environ["NGCP_CERT"], headers={"Accept": "application/json"})
res.raise_for_status()
print(res.json())
```

```go Basic Auth
// Go, standard library only
package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	url := os.Getenv("NGCP_URL")
	req, _ := http.NewRequest("GET", url+"/customercontacts/7", nil)
	req.Header.Set("Accept", "application/json")
	req.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	fmt.Println(res.Status, string(body))
}
```

```go Access Token
// Go, standard library only
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	url := os.Getenv("NGCP_URL")
	login, _ := http.NewRequest("POST", url+"/auth/jwt", nil)
	login.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	out, err := http.DefaultClient.Do(login)
	if err != nil {
		panic(err)
	}
	var jwt struct {
		AccessToken string `json:"access_token"`
	}
	json.NewDecoder(out.Body).Decode(&jwt)
	out.Body.Close()

	req, _ := http.NewRequest("GET", url+"/customercontacts/7", nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+jwt.AccessToken)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	fmt.Println(res.Status, string(body))
}
```

```go Certificate
// Go, standard library only
package main

import (
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	url := os.Getenv("NGCP_URL")
	cert, err := tls.LoadX509KeyPair(os.Getenv("NGCP_CERT"), os.Getenv("NGCP_CERT"))
	if err != nil {
		panic(err)
	}
	client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{Certificates: []tls.Certificate{cert}}}}

	req, _ := http.NewRequest("GET", url+"/customercontacts/7", nil)
	req.Header.Set("Accept", "application/json")
	res, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	fmt.Println(res.Status, string(body))
}
```

```java Basic Auth
// Java 17 or later
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

public class GetContact {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();
        String auth = "Basic " + Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());

        HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts/7"))
            .header("Accept", "application/json")
            .header("Authorization", auth)
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(res.statusCode() + " " + res.body());
    }
}
```

```java Access Token
// Java 17 or later with Jackson (com.fasterxml.jackson.core:jackson-databind)
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

public class GetContact {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();
        String credentials = Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());
        HttpResponse<String> login = http.send(HttpRequest.newBuilder(URI.create(url + "/auth/jwt"))
            .header("Authorization", "Basic " + credentials)
            .POST(HttpRequest.BodyPublishers.noBody())
            .build(), HttpResponse.BodyHandlers.ofString());
        String auth = "Bearer " + new ObjectMapper().readTree(login.body()).get("access_token").asText();

        HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts/7"))
            .header("Accept", "application/json")
            .header("Authorization", auth)
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(res.statusCode() + " " + res.body());
    }
}
```

```java Certificate
// Java 17 or later
import java.io.FileInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyStore;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;

public class GetContact {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        char[] password = System.getenv("NGCP_CERT_PASS").toCharArray();
        KeyStore store = KeyStore.getInstance("PKCS12");
        try (FileInputStream in = new FileInputStream(System.getenv("NGCP_CERT_P12"))) {
            store.load(in, password);
        }
        KeyManagerFactory keys = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        keys.init(store, password);
        SSLContext ssl = SSLContext.getInstance("TLS");
        ssl.init(keys.getKeyManagers(), null, null);
        HttpClient http = HttpClient.newBuilder().sslContext(ssl).build();

        HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts/7"))
            .header("Accept", "application/json")
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(res.statusCode() + " " + res.body());
    }
}
```

```csharp Basic Auth
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Text;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

http.DefaultRequestHeaders.Accept.ParseAdd("application/json");
var res = await http.GetAsync($"{url}/customercontacts/7");
Console.WriteLine($"{(int)res.StatusCode} {await res.Content.ReadAsStringAsync()}");
```

```csharp Access Token
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
var login = new HttpRequestMessage(HttpMethod.Post, $"{url}/auth/jwt");
login.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
var jwt = await (await http.SendAsync(login)).Content.ReadFromJsonAsync<JsonElement>();
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt.GetProperty("access_token").GetString());

http.DefaultRequestHeaders.Accept.ParseAdd("application/json");
var res = await http.GetAsync($"{url}/customercontacts/7");
Console.WriteLine($"{(int)res.StatusCode} {await res.Content.ReadAsStringAsync()}");
```

```csharp Certificate
// .NET 8, no extra packages
using System.Security.Cryptography.X509Certificates;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var handler = new HttpClientHandler();
handler.ClientCertificates.Add(X509Certificate2.CreateFromPemFile(Environment.GetEnvironmentVariable("NGCP_CERT")!));
var http = new HttpClient(handler);

http.DefaultRequestHeaders.Accept.ParseAdd("application/json");
var res = await http.GetAsync($"{url}/customercontacts/7");
Console.WriteLine($"{(int)res.StatusCode} {await res.Content.ReadAsStringAsync()}");
```

```rust Basic Auth
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking"] }
use reqwest::blocking::Client;
use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();

    let res = http
        .get(format!("{url}/customercontacts/7"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .header("Accept", "application/json")
        .send()?;
    println!("{} {}", res.status(), res.text()?);
    Ok(())
}
```

```rust Access Token
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "json"] }, serde_json = "1"
use reqwest::blocking::Client;
use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();
    let jwt: serde_json::Value = http
        .post(format!("{url}/auth/jwt"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .send()?
        .json()?;
    let token = jwt["access_token"].as_str().unwrap_or_default();

    let res = http
        .get(format!("{url}/customercontacts/7"))
        .bearer_auth(token)
        .header("Accept", "application/json")
        .send()?;
    println!("{} {}", res.status(), res.text()?);
    Ok(())
}
```

```rust Certificate
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "native-tls"] }
use reqwest::blocking::Client;
use reqwest::Identity;
use std::{env, fs};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let p12 = fs::read(env::var("NGCP_CERT_P12")?)?;
    let http = Client::builder().identity(Identity::from_pkcs12_der(&p12, &env::var("NGCP_CERT_PASS")?)?).build()?;

    let res = http
        .get(format!("{url}/customercontacts/7"))
        .header("Accept", "application/json")
        .send()?;
    println!("{} {}", res.status(), res.text()?);
    Ok(())
}
```

```c Basic Auth
/* libcurl: cc get.c -o get -lcurl */
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>

int main(void)
{
    char url[512], userpwd[256];
    CURL *curl = curl_easy_init();
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);

    struct curl_slist *headers = curl_slist_append(NULL, "Accept: application/json");
    snprintf(url, sizeof url, "%s/customercontacts/7", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    CURLcode rc = curl_easy_perform(curl);  /* writes the response body to stdout */
    if (rc != CURLE_OK)
        fprintf(stderr, "%s\n", curl_easy_strerror(rc));

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```c Access Token
/* libcurl and cJSON: cc get.c -o get -lcurl -lcjson */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include <cjson/cJSON.h>

/* appends the response body to the buffer */
static size_t save(char *data, size_t size, size_t n, void *body)
{
    size_t room = 4095 - strlen(body);
    strncat(body, data, size * n < room ? size * n : room);
    return size * n;
}

int main(void)
{
    char url[512], userpwd[256], body[4096] = "";
    CURL *curl = curl_easy_init();
    snprintf(url, sizeof url, "%s/auth/jwt", getenv("NGCP_URL"));
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, body);
    curl_easy_perform(curl);
    cJSON *jwt = cJSON_Parse(body);
    curl_easy_reset(curl);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, cJSON_GetObjectItem(jwt, "access_token")->valuestring);
    cJSON_Delete(jwt);

    struct curl_slist *headers = curl_slist_append(NULL, "Accept: application/json");
    snprintf(url, sizeof url, "%s/customercontacts/7", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    CURLcode rc = curl_easy_perform(curl);  /* writes the response body to stdout */
    if (rc != CURLE_OK)
        fprintf(stderr, "%s\n", curl_easy_strerror(rc));

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```c Certificate
/* libcurl: cc get.c -o get -lcurl */
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>

int main(void)
{
    char url[512];
    CURL *curl = curl_easy_init();
    curl_easy_setopt(curl, CURLOPT_SSLCERT, getenv("NGCP_CERT"));
    curl_easy_setopt(curl, CURLOPT_SSLKEY, getenv("NGCP_CERT"));

    struct curl_slist *headers = curl_slist_append(NULL, "Accept: application/json");
    snprintf(url, sizeof url, "%s/customercontacts/7", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    CURLcode rc = curl_easy_perform(curl);  /* writes the response body to stdout */
    if (rc != CURLE_OK)
        fprintf(stderr, "%s\n", curl_easy_strerror(rc));

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```cpp Basic Auth
// libcurl: c++ -std=c++17 get.cpp -o get -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>

int main()
{
    std::string url = std::getenv("NGCP_URL");
    CURL* curl = curl_easy_init();
    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());

    curl_slist* headers = curl_slist_append(nullptr, "Accept: application/json");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts/7").c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    CURLcode rc = curl_easy_perform(curl);  // writes the response body to stdout
    if (rc != CURLE_OK)
        std::cerr << curl_easy_strerror(rc) << '\n';

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```cpp Access Token
// libcurl and nlohmann/json: c++ -std=c++17 get.cpp -o get -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

// appends the response body to a std::string
static size_t save(char* data, size_t size, size_t n, void* body)
{
    static_cast<std::string*>(body)->append(data, size * n);
    return size * n;
}

int main()
{
    std::string url = std::getenv("NGCP_URL"), body;
    CURL* curl = curl_easy_init();
    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/auth/jwt").c_str());
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
    curl_easy_perform(curl);
    std::string token = nlohmann::json::parse(body)["access_token"];
    body.clear();
    curl_easy_reset(curl);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, token.c_str());

    curl_slist* headers = curl_slist_append(nullptr, "Accept: application/json");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts/7").c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    CURLcode rc = curl_easy_perform(curl);  // writes the response body to stdout
    if (rc != CURLE_OK)
        std::cerr << curl_easy_strerror(rc) << '\n';

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```cpp Certificate
// libcurl: c++ -std=c++17 get.cpp -o get -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>

int main()
{
    std::string url = std::getenv("NGCP_URL");
    CURL* curl = curl_easy_init();
    curl_easy_setopt(curl, CURLOPT_SSLCERT, std::getenv("NGCP_CERT"));
    curl_easy_setopt(curl, CURLOPT_SSLKEY, std::getenv("NGCP_CERT"));

    curl_slist* headers = curl_slist_append(nullptr, "Accept: application/json");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts/7").c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    CURLcode rc = curl_easy_perform(curl);  // writes the response body to stdout
    if (rc != CURLE_OK)
        std::cerr << curl_easy_strerror(rc) << '\n';

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```perl Basic Auth
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;
$ua->default_headers->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});

my $res = $ua->get("$ENV{NGCP_URL}/customercontacts/7",
    Accept => 'application/json');
print $res->code, ' ', $res->content, "\n";
```

```perl Access Token
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use JSON::PP qw(decode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;
my $login = HTTP::Request->new(POST => "$ENV{NGCP_URL}/auth/jwt");
$login->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});
my $token = decode_json($ua->request($login)->content)->{access_token};
$ua->default_header(Authorization => "Bearer $token");

my $res = $ua->get("$ENV{NGCP_URL}/customercontacts/7",
    Accept => 'application/json');
print $res->code, ' ', $res->content, "\n";
```

```perl Certificate
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use LWP::UserAgent;

my $ua = LWP::UserAgent->new(ssl_opts => {SSL_cert_file => $ENV{NGCP_CERT}, SSL_key_file => $ENV{NGCP_CERT}});

my $res = $ua->get("$ENV{NGCP_URL}/customercontacts/7",
    Accept => 'application/json');
print $res->code, ' ', $res->content, "\n";
```

```elixir Basic Auth
# Elixir with Req, run with: elixir get.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

res =
  Req.get!("#{url}/customercontacts/7",
    auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")},
    headers: [accept: "application/json"]
  )

IO.inspect({res.status, res.body})
```

```elixir Access Token
# Elixir with Req, run with: elixir get.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

%{body: %{"access_token" => token}} =
  Req.post!("#{url}/auth/jwt", auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")})

res =
  Req.get!("#{url}/customercontacts/7",
    auth: {:bearer, token},
    headers: [accept: "application/json"]
  )

IO.inspect({res.status, res.body})
```

```elixir Certificate
# Elixir with Req, run with: elixir get.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

res =
  Req.get!("#{url}/customercontacts/7",
    connect_options: [transport_opts: [certfile: System.fetch_env!("NGCP_CERT"), keyfile: System.fetch_env!("NGCP_CERT")]],
    headers: [accept: "application/json"]
  )

IO.inspect({res.status, res.body})
```

### Creare (POST)

Crea un contatto cliente e ne stampa l'id.

```shell Basic Auth
# curl
curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -H 'Content-Type: application/json' \
  -d '{"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "status": "active"}' \
  "$NGCP_URL/customercontacts"
```

```shell Access Token
# curl and jq
token=$(curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -X POST "$NGCP_URL/auth/jwt" | jq -r .access_token)

curl -sS --fail-with-body -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d '{"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "status": "active"}' \
  "$NGCP_URL/customercontacts"
```

```shell Certificate
# curl
curl -sS --fail-with-body --cert "$NGCP_CERT" -H 'Content-Type: application/json' \
  -d '{"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "status": "active"}' \
  "$NGCP_URL/customercontacts"
```

```javascript Basic Auth
// Node.js 18 or later, save as create.mjs
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env
const auth = 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')

const created = await fetch(`${NGCP_URL}/customercontacts`, {
  method: 'POST',
  headers: {Authorization: auth, 'Content-Type': 'application/json'},
  body: JSON.stringify({reseller_id: 1, email: 'alice@example.com', firstname: 'Alice', status: 'active'}),
})
const id = (await created.json()).data[0].id
console.log(created.status, id)
```

```javascript Access Token
// Node.js 18 or later, save as create.mjs
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')}})
const {access_token} = await login.json()
const auth = `Bearer ${access_token}`

const created = await fetch(`${NGCP_URL}/customercontacts`, {
  method: 'POST',
  headers: {Authorization: auth, 'Content-Type': 'application/json'},
  body: JSON.stringify({reseller_id: 1, email: 'alice@example.com', firstname: 'Alice', status: 'active'}),
})
const id = (await created.json()).data[0].id
console.log(created.status, id)
```

```javascript Certificate
// Node.js 20 or later with undici (npm install undici), save as create.mjs
import {readFileSync} from 'node:fs'
import {Agent, fetch} from 'undici'

const {NGCP_URL, NGCP_CERT} = process.env
const pem = readFileSync(NGCP_CERT)
const dispatcher = new Agent({connect: {cert: pem, key: pem}})

const created = await fetch(`${NGCP_URL}/customercontacts`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'}, dispatcher,
  body: JSON.stringify({reseller_id: 1, email: 'alice@example.com', firstname: 'Alice', status: 'active'}),
})
const id = (await created.json()).data[0].id
console.log(created.status, id)
```

```typescript Basic Auth
// TypeScript, run with Node.js 23.6 or later: node create.ts
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env
const auth = 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')

const created = await fetch(`${NGCP_URL}/customercontacts`, {
  method: 'POST',
  headers: {Authorization: auth, 'Content-Type': 'application/json'},
  body: JSON.stringify({reseller_id: 1, email: 'alice@example.com', firstname: 'Alice', status: 'active'}),
})
const id = (await created.json() as {data: {id: number}[]}).data[0].id
console.log(created.status, id)
```

```typescript Access Token
// TypeScript, run with Node.js 23.6 or later: node create.ts
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')}})
const {access_token} = await login.json() as {access_token: string}
const auth = `Bearer ${access_token}`

const created = await fetch(`${NGCP_URL}/customercontacts`, {
  method: 'POST',
  headers: {Authorization: auth, 'Content-Type': 'application/json'},
  body: JSON.stringify({reseller_id: 1, email: 'alice@example.com', firstname: 'Alice', status: 'active'}),
})
const id = (await created.json() as {data: {id: number}[]}).data[0].id
console.log(created.status, id)
```

```typescript Certificate
// TypeScript with undici (npm install undici), run with Node.js 23.6 or later: node create.ts
import {readFileSync} from 'node:fs'
import {Agent, fetch} from 'undici'

const {NGCP_URL, NGCP_CERT = ''} = process.env
const pem = readFileSync(NGCP_CERT)
const dispatcher = new Agent({connect: {cert: pem, key: pem}})

const created = await fetch(`${NGCP_URL}/customercontacts`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'}, dispatcher,
  body: JSON.stringify({reseller_id: 1, email: 'alice@example.com', firstname: 'Alice', status: 'active'}),
})
const id = (await created.json() as {data: {id: number}[]}).data[0].id
console.log(created.status, id)
```

```python Basic Auth
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
auth = (os.environ["NGCP_USER"], os.environ["NGCP_PASS"])

res = requests.post(f"{url}/customercontacts", auth=auth, json={
    "reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "status": "active",
})
res.raise_for_status()
contact_id = res.json()["data"][0]["id"]
print(contact_id)
```

```python Access Token
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
token = requests.post(f"{url}/auth/jwt", auth=(os.environ["NGCP_USER"], os.environ["NGCP_PASS"])).json()["access_token"]
auth = {"Authorization": f"Bearer {token}"}

res = requests.post(f"{url}/customercontacts", headers=auth, json={
    "reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "status": "active",
})
res.raise_for_status()
contact_id = res.json()["data"][0]["id"]
print(contact_id)
```

```python Certificate
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
cert = os.environ["NGCP_CERT"]

res = requests.post(f"{url}/customercontacts", cert=cert, json={
    "reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "status": "active",
})
res.raise_for_status()
contact_id = res.json()["data"][0]["id"]
print(contact_id)
```

```go Basic Auth
// Go, standard library only
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
)

func main() {
	url := os.Getenv("NGCP_URL")
	req, _ := http.NewRequest("POST", url+"/customercontacts",
		strings.NewReader(`{"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "status": "active"}`))
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	var created struct {
		Data []struct {
			ID int `json:"id"`
		} `json:"data"`
	}
	json.NewDecoder(res.Body).Decode(&created)
	res.Body.Close()
	fmt.Println(res.Status, created.Data[0].ID)
}
```

```go Access Token
// Go, standard library only
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
)

func main() {
	url := os.Getenv("NGCP_URL")
	login, _ := http.NewRequest("POST", url+"/auth/jwt", nil)
	login.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	out, err := http.DefaultClient.Do(login)
	if err != nil {
		panic(err)
	}
	var jwt struct {
		AccessToken string `json:"access_token"`
	}
	json.NewDecoder(out.Body).Decode(&jwt)
	out.Body.Close()

	req, _ := http.NewRequest("POST", url+"/customercontacts",
		strings.NewReader(`{"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "status": "active"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+jwt.AccessToken)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	var created struct {
		Data []struct {
			ID int `json:"id"`
		} `json:"data"`
	}
	json.NewDecoder(res.Body).Decode(&created)
	res.Body.Close()
	fmt.Println(res.Status, created.Data[0].ID)
}
```

```go Certificate
// Go, standard library only
package main

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
)

func main() {
	url := os.Getenv("NGCP_URL")
	cert, err := tls.LoadX509KeyPair(os.Getenv("NGCP_CERT"), os.Getenv("NGCP_CERT"))
	if err != nil {
		panic(err)
	}
	client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{Certificates: []tls.Certificate{cert}}}}

	req, _ := http.NewRequest("POST", url+"/customercontacts",
		strings.NewReader(`{"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "status": "active"}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	var created struct {
		Data []struct {
			ID int `json:"id"`
		} `json:"data"`
	}
	json.NewDecoder(res.Body).Decode(&created)
	res.Body.Close()
	fmt.Println(res.Status, created.Data[0].ID)
}
```

```java Basic Auth
// Java 17 or later with Jackson (com.fasterxml.jackson.core:jackson-databind)
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

public class CreateContact {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();
        String auth = "Basic " + Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());

        HttpResponse<String> created = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts"))
            .header("Authorization", auth)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString("""
                {"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "status": "active"}"""))
            .build(), HttpResponse.BodyHandlers.ofString());
        int id = new ObjectMapper().readTree(created.body()).get("data").get(0).get("id").asInt();
        System.out.println(created.statusCode() + " " + id);
    }
}
```

```java Access Token
// Java 17 or later with Jackson (com.fasterxml.jackson.core:jackson-databind)
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

public class CreateContact {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();
        String credentials = Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());
        HttpResponse<String> login = http.send(HttpRequest.newBuilder(URI.create(url + "/auth/jwt"))
            .header("Authorization", "Basic " + credentials)
            .POST(HttpRequest.BodyPublishers.noBody())
            .build(), HttpResponse.BodyHandlers.ofString());
        String auth = "Bearer " + new ObjectMapper().readTree(login.body()).get("access_token").asText();

        HttpResponse<String> created = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts"))
            .header("Authorization", auth)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString("""
                {"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "status": "active"}"""))
            .build(), HttpResponse.BodyHandlers.ofString());
        int id = new ObjectMapper().readTree(created.body()).get("data").get(0).get("id").asInt();
        System.out.println(created.statusCode() + " " + id);
    }
}
```

```java Certificate
// Java 17 or later with Jackson (com.fasterxml.jackson.core:jackson-databind)
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.FileInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyStore;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;

public class CreateContact {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        char[] password = System.getenv("NGCP_CERT_PASS").toCharArray();
        KeyStore store = KeyStore.getInstance("PKCS12");
        try (FileInputStream in = new FileInputStream(System.getenv("NGCP_CERT_P12"))) {
            store.load(in, password);
        }
        KeyManagerFactory keys = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        keys.init(store, password);
        SSLContext ssl = SSLContext.getInstance("TLS");
        ssl.init(keys.getKeyManagers(), null, null);
        HttpClient http = HttpClient.newBuilder().sslContext(ssl).build();

        HttpResponse<String> created = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString("""
                {"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "status": "active"}"""))
            .build(), HttpResponse.BodyHandlers.ofString());
        int id = new ObjectMapper().readTree(created.body()).get("data").get(0).get("id").asInt();
        System.out.println(created.statusCode() + " " + id);
    }
}
```

```csharp Basic Auth
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

var created = await http.PostAsJsonAsync($"{url}/customercontacts",
    new { reseller_id = 1, email = "alice@example.com", firstname = "Alice", status = "active" });
var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data")[0].GetProperty("id");
Console.WriteLine($"{(int)created.StatusCode} {id}");
```

```csharp Access Token
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
var login = new HttpRequestMessage(HttpMethod.Post, $"{url}/auth/jwt");
login.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
var jwt = await (await http.SendAsync(login)).Content.ReadFromJsonAsync<JsonElement>();
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt.GetProperty("access_token").GetString());

var created = await http.PostAsJsonAsync($"{url}/customercontacts",
    new { reseller_id = 1, email = "alice@example.com", firstname = "Alice", status = "active" });
var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data")[0].GetProperty("id");
Console.WriteLine($"{(int)created.StatusCode} {id}");
```

```csharp Certificate
// .NET 8, no extra packages
using System.Net.Http.Json;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var handler = new HttpClientHandler();
handler.ClientCertificates.Add(X509Certificate2.CreateFromPemFile(Environment.GetEnvironmentVariable("NGCP_CERT")!));
var http = new HttpClient(handler);

var created = await http.PostAsJsonAsync($"{url}/customercontacts",
    new { reseller_id = 1, email = "alice@example.com", firstname = "Alice", status = "active" });
var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data")[0].GetProperty("id");
Console.WriteLine($"{(int)created.StatusCode} {id}");
```

```rust Basic Auth
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "json"] }, serde_json = "1"
use reqwest::blocking::Client;
use std::env;
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();

    let created: serde_json::Value = http
        .post(format!("{url}/customercontacts"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .json(&json!({"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "status": "active"}))
        .send()?
        .error_for_status()?
        .json()?;
    let id = &created["data"][0]["id"];
    println!("{id}");
    Ok(())
}
```

```rust Access Token
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "json"] }, serde_json = "1"
use reqwest::blocking::Client;
use std::env;
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();
    let jwt: serde_json::Value = http
        .post(format!("{url}/auth/jwt"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .send()?
        .json()?;
    let token = jwt["access_token"].as_str().unwrap_or_default();

    let created: serde_json::Value = http
        .post(format!("{url}/customercontacts"))
        .bearer_auth(token)
        .json(&json!({"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "status": "active"}))
        .send()?
        .error_for_status()?
        .json()?;
    let id = &created["data"][0]["id"];
    println!("{id}");
    Ok(())
}
```

```rust Certificate
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "json", "native-tls"] }, serde_json = "1"
use reqwest::blocking::Client;
use reqwest::Identity;
use std::{env, fs};
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let p12 = fs::read(env::var("NGCP_CERT_P12")?)?;
    let http = Client::builder().identity(Identity::from_pkcs12_der(&p12, &env::var("NGCP_CERT_PASS")?)?).build()?;

    let created: serde_json::Value = http
        .post(format!("{url}/customercontacts"))
        .json(&json!({"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "status": "active"}))
        .send()?
        .error_for_status()?
        .json()?;
    let id = &created["data"][0]["id"];
    println!("{id}");
    Ok(())
}
```

```c Basic Auth
/* libcurl and cJSON: cc create.c -o create -lcurl -lcjson */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include <cjson/cJSON.h>

/* appends the response body to the buffer */
static size_t save(char *data, size_t size, size_t n, void *body)
{
    size_t room = 4095 - strlen(body);
    strncat(body, data, size * n < room ? size * n : room);
    return size * n;
}

int main(void)
{
    char url[512], body[4096] = "", userpwd[256];
    CURL *curl = curl_easy_init();
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);

    struct curl_slist *json = curl_slist_append(NULL, "Content-Type: application/json");
    snprintf(url, sizeof url, "%s/customercontacts", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, json);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "{\"reseller_id\": 1, \"email\": \"alice@example.com\", \"firstname\": \"Alice\", \"status\": \"active\"}");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, body);
    curl_easy_perform(curl);
    cJSON *created = cJSON_Parse(body);
    int id = cJSON_GetObjectItem(cJSON_GetArrayItem(cJSON_GetObjectItem(created, "data"), 0), "id")->valueint;
    printf("%d\n", id);
    cJSON_Delete(created);

    curl_slist_free_all(json);
    curl_easy_cleanup(curl);
    return 0;
}
```

```c Access Token
/* libcurl and cJSON: cc create.c -o create -lcurl -lcjson */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include <cjson/cJSON.h>

/* appends the response body to the buffer */
static size_t save(char *data, size_t size, size_t n, void *body)
{
    size_t room = 4095 - strlen(body);
    strncat(body, data, size * n < room ? size * n : room);
    return size * n;
}

int main(void)
{
    char url[512], body[4096] = "", userpwd[256];
    CURL *curl = curl_easy_init();
    snprintf(url, sizeof url, "%s/auth/jwt", getenv("NGCP_URL"));
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, body);
    curl_easy_perform(curl);
    cJSON *jwt = cJSON_Parse(body);
    curl_easy_reset(curl);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, cJSON_GetObjectItem(jwt, "access_token")->valuestring);
    cJSON_Delete(jwt);
    body[0] = 0;

    struct curl_slist *json = curl_slist_append(NULL, "Content-Type: application/json");
    snprintf(url, sizeof url, "%s/customercontacts", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, json);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "{\"reseller_id\": 1, \"email\": \"alice@example.com\", \"firstname\": \"Alice\", \"status\": \"active\"}");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, body);
    curl_easy_perform(curl);
    cJSON *created = cJSON_Parse(body);
    int id = cJSON_GetObjectItem(cJSON_GetArrayItem(cJSON_GetObjectItem(created, "data"), 0), "id")->valueint;
    printf("%d\n", id);
    cJSON_Delete(created);

    curl_slist_free_all(json);
    curl_easy_cleanup(curl);
    return 0;
}
```

```c Certificate
/* libcurl and cJSON: cc create.c -o create -lcurl -lcjson */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include <cjson/cJSON.h>

/* appends the response body to the buffer */
static size_t save(char *data, size_t size, size_t n, void *body)
{
    size_t room = 4095 - strlen(body);
    strncat(body, data, size * n < room ? size * n : room);
    return size * n;
}

int main(void)
{
    char url[512], body[4096] = "";
    CURL *curl = curl_easy_init();
    curl_easy_setopt(curl, CURLOPT_SSLCERT, getenv("NGCP_CERT"));
    curl_easy_setopt(curl, CURLOPT_SSLKEY, getenv("NGCP_CERT"));

    struct curl_slist *json = curl_slist_append(NULL, "Content-Type: application/json");
    snprintf(url, sizeof url, "%s/customercontacts", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, json);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "{\"reseller_id\": 1, \"email\": \"alice@example.com\", \"firstname\": \"Alice\", \"status\": \"active\"}");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, body);
    curl_easy_perform(curl);
    cJSON *created = cJSON_Parse(body);
    int id = cJSON_GetObjectItem(cJSON_GetArrayItem(cJSON_GetObjectItem(created, "data"), 0), "id")->valueint;
    printf("%d\n", id);
    cJSON_Delete(created);

    curl_slist_free_all(json);
    curl_easy_cleanup(curl);
    return 0;
}
```

```cpp Basic Auth
// libcurl and nlohmann/json: c++ -std=c++17 create.cpp -o create -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

// appends the response body to a std::string
static size_t save(char* data, size_t size, size_t n, void* body)
{
    static_cast<std::string*>(body)->append(data, size * n);
    return size * n;
}

int main()
{
    std::string url = std::getenv("NGCP_URL"), body;
    CURL* curl = curl_easy_init();
    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());

    curl_slist* json = curl_slist_append(nullptr, "Content-Type: application/json");
    std::string contact = nlohmann::json({
        {"reseller_id", 1}, {"email", "alice@example.com"}, {"firstname", "Alice"}, {"status", "active"}}).dump();
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts").c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, json);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, contact.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
    curl_easy_perform(curl);
    std::string id = nlohmann::json::parse(body)["data"][0]["id"].dump();
    std::cout << id << '\n';

    curl_slist_free_all(json);
    curl_easy_cleanup(curl);
}
```

```cpp Access Token
// libcurl and nlohmann/json: c++ -std=c++17 create.cpp -o create -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

// appends the response body to a std::string
static size_t save(char* data, size_t size, size_t n, void* body)
{
    static_cast<std::string*>(body)->append(data, size * n);
    return size * n;
}

int main()
{
    std::string url = std::getenv("NGCP_URL"), body;
    CURL* curl = curl_easy_init();
    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/auth/jwt").c_str());
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
    curl_easy_perform(curl);
    std::string token = nlohmann::json::parse(body)["access_token"];
    body.clear();
    curl_easy_reset(curl);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, token.c_str());

    curl_slist* json = curl_slist_append(nullptr, "Content-Type: application/json");
    std::string contact = nlohmann::json({
        {"reseller_id", 1}, {"email", "alice@example.com"}, {"firstname", "Alice"}, {"status", "active"}}).dump();
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts").c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, json);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, contact.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
    curl_easy_perform(curl);
    std::string id = nlohmann::json::parse(body)["data"][0]["id"].dump();
    std::cout << id << '\n';

    curl_slist_free_all(json);
    curl_easy_cleanup(curl);
}
```

```cpp Certificate
// libcurl and nlohmann/json: c++ -std=c++17 create.cpp -o create -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

// appends the response body to a std::string
static size_t save(char* data, size_t size, size_t n, void* body)
{
    static_cast<std::string*>(body)->append(data, size * n);
    return size * n;
}

int main()
{
    std::string url = std::getenv("NGCP_URL"), body;
    CURL* curl = curl_easy_init();
    curl_easy_setopt(curl, CURLOPT_SSLCERT, std::getenv("NGCP_CERT"));
    curl_easy_setopt(curl, CURLOPT_SSLKEY, std::getenv("NGCP_CERT"));

    curl_slist* json = curl_slist_append(nullptr, "Content-Type: application/json");
    std::string contact = nlohmann::json({
        {"reseller_id", 1}, {"email", "alice@example.com"}, {"firstname", "Alice"}, {"status", "active"}}).dump();
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts").c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, json);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, contact.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
    curl_easy_perform(curl);
    std::string id = nlohmann::json::parse(body)["data"][0]["id"].dump();
    std::cout << id << '\n';

    curl_slist_free_all(json);
    curl_easy_cleanup(curl);
}
```

```perl Basic Auth
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use JSON::PP qw(decode_json encode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;
$ua->default_headers->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});

my $req = HTTP::Request->new(POST => "$ENV{NGCP_URL}/customercontacts", ['Content-Type' => 'application/json'],
    encode_json({reseller_id => 1, email => 'alice@example.com', firstname => 'Alice', status => 'active'}));
my $id = decode_json($ua->request($req)->content)->{data}[0]{id};
print "$id\n";
```

```perl Access Token
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use JSON::PP qw(decode_json encode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;
my $login = HTTP::Request->new(POST => "$ENV{NGCP_URL}/auth/jwt");
$login->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});
my $token = decode_json($ua->request($login)->content)->{access_token};
$ua->default_header(Authorization => "Bearer $token");

my $req = HTTP::Request->new(POST => "$ENV{NGCP_URL}/customercontacts", ['Content-Type' => 'application/json'],
    encode_json({reseller_id => 1, email => 'alice@example.com', firstname => 'Alice', status => 'active'}));
my $id = decode_json($ua->request($req)->content)->{data}[0]{id};
print "$id\n";
```

```perl Certificate
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use JSON::PP qw(decode_json encode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new(ssl_opts => {SSL_cert_file => $ENV{NGCP_CERT}, SSL_key_file => $ENV{NGCP_CERT}});

my $req = HTTP::Request->new(POST => "$ENV{NGCP_URL}/customercontacts", ['Content-Type' => 'application/json'],
    encode_json({reseller_id => 1, email => 'alice@example.com', firstname => 'Alice', status => 'active'}));
my $id = decode_json($ua->request($req)->content)->{data}[0]{id};
print "$id\n";
```

```elixir Basic Auth
# Elixir with Req, run with: elixir create.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

req = Req.new(base_url: url, auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")})

%{body: %{"data" => [%{"id" => id}]}} =
  Req.post!(req, url: "/customercontacts",
    json: %{reseller_id: 1, email: "alice@example.com", firstname: "Alice", status: "active"}
  )

IO.inspect(id)
```

```elixir Access Token
# Elixir with Req, run with: elixir create.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

%{body: %{"access_token" => token}} =
  Req.post!("#{url}/auth/jwt", auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")})

req = Req.new(base_url: url, auth: {:bearer, token})

%{body: %{"data" => [%{"id" => id}]}} =
  Req.post!(req, url: "/customercontacts",
    json: %{reseller_id: 1, email: "alice@example.com", firstname: "Alice", status: "active"}
  )

IO.inspect(id)
```

```elixir Certificate
# Elixir with Req, run with: elixir create.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

req = Req.new(base_url: url, connect_options: [transport_opts: [certfile: System.fetch_env!("NGCP_CERT"), keyfile: System.fetch_env!("NGCP_CERT")]])

%{body: %{"data" => [%{"id" => id}]}} =
  Req.post!(req, url: "/customercontacts",
    json: %{reseller_id: 1, email: "alice@example.com", firstname: "Alice", status: "active"}
  )

IO.inspect(id)
```

### Sostituire (PUT)

Sostituisce il contatto 7 con l'oggetto completo nel corpo della richiesta.

```shell Basic Auth
# curl
curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -X PUT -H 'Content-Type: application/json' \
  -d '{"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active"}' \
  "$NGCP_URL/customercontacts/7"
```

```shell Access Token
# curl and jq
token=$(curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -X POST "$NGCP_URL/auth/jwt" | jq -r .access_token)

curl -sS --fail-with-body -H "Authorization: Bearer $token" -X PUT -H 'Content-Type: application/json' \
  -d '{"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active"}' \
  "$NGCP_URL/customercontacts/7"
```

```shell Certificate
# curl
curl -sS --fail-with-body --cert "$NGCP_CERT" -X PUT -H 'Content-Type: application/json' \
  -d '{"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active"}' \
  "$NGCP_URL/customercontacts/7"
```

```javascript Basic Auth
// Node.js 18 or later, save as replace.mjs
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env
const auth = 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')

const replaced = await fetch(`${NGCP_URL}/customercontacts/7`, {
  method: 'PUT',
  headers: {Authorization: auth, 'Content-Type': 'application/json'},
  body: JSON.stringify({reseller_id: 1, email: 'alice@example.com', firstname: 'Alice', lastname: 'Smith', status: 'active'}),
})
console.log(replaced.status)
```

```javascript Access Token
// Node.js 18 or later, save as replace.mjs
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')}})
const {access_token} = await login.json()
const auth = `Bearer ${access_token}`

const replaced = await fetch(`${NGCP_URL}/customercontacts/7`, {
  method: 'PUT',
  headers: {Authorization: auth, 'Content-Type': 'application/json'},
  body: JSON.stringify({reseller_id: 1, email: 'alice@example.com', firstname: 'Alice', lastname: 'Smith', status: 'active'}),
})
console.log(replaced.status)
```

```javascript Certificate
// Node.js 20 or later with undici (npm install undici), save as replace.mjs
import {readFileSync} from 'node:fs'
import {Agent, fetch} from 'undici'

const {NGCP_URL, NGCP_CERT} = process.env
const pem = readFileSync(NGCP_CERT)
const dispatcher = new Agent({connect: {cert: pem, key: pem}})

const replaced = await fetch(`${NGCP_URL}/customercontacts/7`, {
  method: 'PUT',
  headers: {'Content-Type': 'application/json'}, dispatcher,
  body: JSON.stringify({reseller_id: 1, email: 'alice@example.com', firstname: 'Alice', lastname: 'Smith', status: 'active'}),
})
console.log(replaced.status)
```

```typescript Basic Auth
// TypeScript, run with Node.js 23.6 or later: node replace.ts
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env
const auth = 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')

const replaced = await fetch(`${NGCP_URL}/customercontacts/7`, {
  method: 'PUT',
  headers: {Authorization: auth, 'Content-Type': 'application/json'},
  body: JSON.stringify({reseller_id: 1, email: 'alice@example.com', firstname: 'Alice', lastname: 'Smith', status: 'active'}),
})
console.log(replaced.status)
```

```typescript Access Token
// TypeScript, run with Node.js 23.6 or later: node replace.ts
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')}})
const {access_token} = await login.json() as {access_token: string}
const auth = `Bearer ${access_token}`

const replaced = await fetch(`${NGCP_URL}/customercontacts/7`, {
  method: 'PUT',
  headers: {Authorization: auth, 'Content-Type': 'application/json'},
  body: JSON.stringify({reseller_id: 1, email: 'alice@example.com', firstname: 'Alice', lastname: 'Smith', status: 'active'}),
})
console.log(replaced.status)
```

```typescript Certificate
// TypeScript with undici (npm install undici), run with Node.js 23.6 or later: node replace.ts
import {readFileSync} from 'node:fs'
import {Agent, fetch} from 'undici'

const {NGCP_URL, NGCP_CERT = ''} = process.env
const pem = readFileSync(NGCP_CERT)
const dispatcher = new Agent({connect: {cert: pem, key: pem}})

const replaced = await fetch(`${NGCP_URL}/customercontacts/7`, {
  method: 'PUT',
  headers: {'Content-Type': 'application/json'}, dispatcher,
  body: JSON.stringify({reseller_id: 1, email: 'alice@example.com', firstname: 'Alice', lastname: 'Smith', status: 'active'}),
})
console.log(replaced.status)
```

```python Basic Auth
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
auth = (os.environ["NGCP_USER"], os.environ["NGCP_PASS"])

requests.put(f"{url}/customercontacts/7", auth=auth, json={
    "reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active",
}).raise_for_status()
```

```python Access Token
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
token = requests.post(f"{url}/auth/jwt", auth=(os.environ["NGCP_USER"], os.environ["NGCP_PASS"])).json()["access_token"]
auth = {"Authorization": f"Bearer {token}"}

requests.put(f"{url}/customercontacts/7", headers=auth, json={
    "reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active",
}).raise_for_status()
```

```python Certificate
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
cert = os.environ["NGCP_CERT"]

requests.put(f"{url}/customercontacts/7", cert=cert, json={
    "reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active",
}).raise_for_status()
```

```go Basic Auth
// Go, standard library only
package main

import (
	"fmt"
	"net/http"
	"os"
	"strings"
)

func main() {
	url := os.Getenv("NGCP_URL")
	req, _ := http.NewRequest("PUT", url+"/customercontacts/7",
		strings.NewReader(`{"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active"}`))
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	res.Body.Close()
	fmt.Println(res.Status)
}
```

```go Access Token
// Go, standard library only
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
)

func main() {
	url := os.Getenv("NGCP_URL")
	login, _ := http.NewRequest("POST", url+"/auth/jwt", nil)
	login.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	out, err := http.DefaultClient.Do(login)
	if err != nil {
		panic(err)
	}
	var jwt struct {
		AccessToken string `json:"access_token"`
	}
	json.NewDecoder(out.Body).Decode(&jwt)
	out.Body.Close()

	req, _ := http.NewRequest("PUT", url+"/customercontacts/7",
		strings.NewReader(`{"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+jwt.AccessToken)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	res.Body.Close()
	fmt.Println(res.Status)
}
```

```go Certificate
// Go, standard library only
package main

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"os"
	"strings"
)

func main() {
	url := os.Getenv("NGCP_URL")
	cert, err := tls.LoadX509KeyPair(os.Getenv("NGCP_CERT"), os.Getenv("NGCP_CERT"))
	if err != nil {
		panic(err)
	}
	client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{Certificates: []tls.Certificate{cert}}}}

	req, _ := http.NewRequest("PUT", url+"/customercontacts/7",
		strings.NewReader(`{"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active"}`))
	req.Header.Set("Content-Type", "application/json")
	res, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	res.Body.Close()
	fmt.Println(res.Status)
}
```

```java Basic Auth
// Java 17 or later
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

public class ReplaceContact {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();
        String auth = "Basic " + Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());

        HttpResponse<String> replaced = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts/7"))
            .header("Authorization", auth)
            .header("Content-Type", "application/json")
            .PUT(HttpRequest.BodyPublishers.ofString("""
                {"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active"}"""))
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(replaced.statusCode() + " " + replaced.body());
    }
}
```

```java Access Token
// Java 17 or later with Jackson (com.fasterxml.jackson.core:jackson-databind)
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

public class ReplaceContact {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();
        String credentials = Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());
        HttpResponse<String> login = http.send(HttpRequest.newBuilder(URI.create(url + "/auth/jwt"))
            .header("Authorization", "Basic " + credentials)
            .POST(HttpRequest.BodyPublishers.noBody())
            .build(), HttpResponse.BodyHandlers.ofString());
        String auth = "Bearer " + new ObjectMapper().readTree(login.body()).get("access_token").asText();

        HttpResponse<String> replaced = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts/7"))
            .header("Authorization", auth)
            .header("Content-Type", "application/json")
            .PUT(HttpRequest.BodyPublishers.ofString("""
                {"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active"}"""))
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(replaced.statusCode() + " " + replaced.body());
    }
}
```

```java Certificate
// Java 17 or later
import java.io.FileInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyStore;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;

public class ReplaceContact {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        char[] password = System.getenv("NGCP_CERT_PASS").toCharArray();
        KeyStore store = KeyStore.getInstance("PKCS12");
        try (FileInputStream in = new FileInputStream(System.getenv("NGCP_CERT_P12"))) {
            store.load(in, password);
        }
        KeyManagerFactory keys = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        keys.init(store, password);
        SSLContext ssl = SSLContext.getInstance("TLS");
        ssl.init(keys.getKeyManagers(), null, null);
        HttpClient http = HttpClient.newBuilder().sslContext(ssl).build();

        HttpResponse<String> replaced = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts/7"))
            .header("Content-Type", "application/json")
            .PUT(HttpRequest.BodyPublishers.ofString("""
                {"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active"}"""))
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(replaced.statusCode() + " " + replaced.body());
    }
}
```

```csharp Basic Auth
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

var replaced = await http.PutAsJsonAsync($"{url}/customercontacts/7",
    new { reseller_id = 1, email = "alice@example.com", firstname = "Alice", lastname = "Smith", status = "active" });
Console.WriteLine((int)replaced.StatusCode);
```

```csharp Access Token
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
var login = new HttpRequestMessage(HttpMethod.Post, $"{url}/auth/jwt");
login.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
var jwt = await (await http.SendAsync(login)).Content.ReadFromJsonAsync<JsonElement>();
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt.GetProperty("access_token").GetString());

var replaced = await http.PutAsJsonAsync($"{url}/customercontacts/7",
    new { reseller_id = 1, email = "alice@example.com", firstname = "Alice", lastname = "Smith", status = "active" });
Console.WriteLine((int)replaced.StatusCode);
```

```csharp Certificate
// .NET 8, no extra packages
using System.Net.Http.Json;
using System.Security.Cryptography.X509Certificates;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var handler = new HttpClientHandler();
handler.ClientCertificates.Add(X509Certificate2.CreateFromPemFile(Environment.GetEnvironmentVariable("NGCP_CERT")!));
var http = new HttpClient(handler);

var replaced = await http.PutAsJsonAsync($"{url}/customercontacts/7",
    new { reseller_id = 1, email = "alice@example.com", firstname = "Alice", lastname = "Smith", status = "active" });
Console.WriteLine((int)replaced.StatusCode);
```

```rust Basic Auth
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "json"] }, serde_json = "1"
use reqwest::blocking::Client;
use std::env;
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();

    let res = http.put(format!("{url}/customercontacts/7"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .json(&json!({"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active"}))
        .send()?
        .error_for_status()?;
    println!("{}", res.status());
    Ok(())
}
```

```rust Access Token
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "json"] }, serde_json = "1"
use reqwest::blocking::Client;
use std::env;
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();
    let jwt: serde_json::Value = http
        .post(format!("{url}/auth/jwt"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .send()?
        .json()?;
    let token = jwt["access_token"].as_str().unwrap_or_default();

    let res = http.put(format!("{url}/customercontacts/7"))
        .bearer_auth(token)
        .json(&json!({"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active"}))
        .send()?
        .error_for_status()?;
    println!("{}", res.status());
    Ok(())
}
```

```rust Certificate
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "json", "native-tls"] }, serde_json = "1"
use reqwest::blocking::Client;
use reqwest::Identity;
use std::{env, fs};
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let p12 = fs::read(env::var("NGCP_CERT_P12")?)?;
    let http = Client::builder().identity(Identity::from_pkcs12_der(&p12, &env::var("NGCP_CERT_PASS")?)?).build()?;

    let res = http.put(format!("{url}/customercontacts/7"))
        .json(&json!({"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active"}))
        .send()?
        .error_for_status()?;
    println!("{}", res.status());
    Ok(())
}
```

```c Basic Auth
/* libcurl: cc replace.c -o replace -lcurl */
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>

int main(void)
{
    char url[512], userpwd[256];
    CURL *curl = curl_easy_init();
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);

    struct curl_slist *json = curl_slist_append(NULL, "Content-Type: application/json");
    snprintf(url, sizeof url, "%s/customercontacts/7", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PUT");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, json);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "{\"reseller_id\": 1, \"email\": \"alice@example.com\", \"firstname\": \"Alice\", \"lastname\": \"Smith\", \"status\": \"active\"}");
    curl_easy_perform(curl);

    curl_slist_free_all(json);
    curl_easy_cleanup(curl);
    return 0;
}
```

```c Access Token
/* libcurl and cJSON: cc replace.c -o replace -lcurl -lcjson */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include <cjson/cJSON.h>

/* appends the response body to the buffer */
static size_t save(char *data, size_t size, size_t n, void *body)
{
    size_t room = 4095 - strlen(body);
    strncat(body, data, size * n < room ? size * n : room);
    return size * n;
}

int main(void)
{
    char url[512], body[4096] = "", userpwd[256];
    CURL *curl = curl_easy_init();
    snprintf(url, sizeof url, "%s/auth/jwt", getenv("NGCP_URL"));
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, body);
    curl_easy_perform(curl);
    cJSON *jwt = cJSON_Parse(body);
    curl_easy_reset(curl);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, cJSON_GetObjectItem(jwt, "access_token")->valuestring);
    cJSON_Delete(jwt);
    body[0] = 0;

    struct curl_slist *json = curl_slist_append(NULL, "Content-Type: application/json");
    snprintf(url, sizeof url, "%s/customercontacts/7", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PUT");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, json);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "{\"reseller_id\": 1, \"email\": \"alice@example.com\", \"firstname\": \"Alice\", \"lastname\": \"Smith\", \"status\": \"active\"}");
    curl_easy_perform(curl);

    curl_slist_free_all(json);
    curl_easy_cleanup(curl);
    return 0;
}
```

```c Certificate
/* libcurl: cc replace.c -o replace -lcurl */
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>

int main(void)
{
    char url[512];
    CURL *curl = curl_easy_init();
    curl_easy_setopt(curl, CURLOPT_SSLCERT, getenv("NGCP_CERT"));
    curl_easy_setopt(curl, CURLOPT_SSLKEY, getenv("NGCP_CERT"));

    struct curl_slist *json = curl_slist_append(NULL, "Content-Type: application/json");
    snprintf(url, sizeof url, "%s/customercontacts/7", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PUT");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, json);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "{\"reseller_id\": 1, \"email\": \"alice@example.com\", \"firstname\": \"Alice\", \"lastname\": \"Smith\", \"status\": \"active\"}");
    curl_easy_perform(curl);

    curl_slist_free_all(json);
    curl_easy_cleanup(curl);
    return 0;
}
```

```cpp Basic Auth
// libcurl: c++ -std=c++17 replace.cpp -o replace -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>

int main()
{
    std::string url = std::getenv("NGCP_URL");
    CURL* curl = curl_easy_init();
    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());

    curl_slist* json = curl_slist_append(nullptr, "Content-Type: application/json");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts/7").c_str());
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PUT");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, json);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, R"({"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active"})");
    curl_easy_perform(curl);

    curl_slist_free_all(json);
    curl_easy_cleanup(curl);
}
```

```cpp Access Token
// libcurl and nlohmann/json: c++ -std=c++17 replace.cpp -o replace -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

// appends the response body to a std::string
static size_t save(char* data, size_t size, size_t n, void* body)
{
    static_cast<std::string*>(body)->append(data, size * n);
    return size * n;
}

int main()
{
    std::string url = std::getenv("NGCP_URL"), body;
    CURL* curl = curl_easy_init();
    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/auth/jwt").c_str());
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
    curl_easy_perform(curl);
    std::string token = nlohmann::json::parse(body)["access_token"];
    body.clear();
    curl_easy_reset(curl);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, token.c_str());

    curl_slist* json = curl_slist_append(nullptr, "Content-Type: application/json");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts/7").c_str());
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PUT");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, json);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, R"({"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active"})");
    curl_easy_perform(curl);

    curl_slist_free_all(json);
    curl_easy_cleanup(curl);
}
```

```cpp Certificate
// libcurl: c++ -std=c++17 replace.cpp -o replace -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>

int main()
{
    std::string url = std::getenv("NGCP_URL");
    CURL* curl = curl_easy_init();
    curl_easy_setopt(curl, CURLOPT_SSLCERT, std::getenv("NGCP_CERT"));
    curl_easy_setopt(curl, CURLOPT_SSLKEY, std::getenv("NGCP_CERT"));

    curl_slist* json = curl_slist_append(nullptr, "Content-Type: application/json");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts/7").c_str());
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PUT");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, json);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, R"({"reseller_id": 1, "email": "alice@example.com", "firstname": "Alice", "lastname": "Smith", "status": "active"})");
    curl_easy_perform(curl);

    curl_slist_free_all(json);
    curl_easy_cleanup(curl);
}
```

```perl Basic Auth
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use JSON::PP qw(decode_json encode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;
$ua->default_headers->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});

my $req = HTTP::Request->new(PUT => "$ENV{NGCP_URL}/customercontacts/7", ['Content-Type' => 'application/json'],
    encode_json({reseller_id => 1, email => 'alice@example.com', firstname => 'Alice', lastname => 'Smith',
        status => 'active'}));
print $ua->request($req)->status_line, "\n";
```

```perl Access Token
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use JSON::PP qw(decode_json encode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;
my $login = HTTP::Request->new(POST => "$ENV{NGCP_URL}/auth/jwt");
$login->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});
my $token = decode_json($ua->request($login)->content)->{access_token};
$ua->default_header(Authorization => "Bearer $token");

my $req = HTTP::Request->new(PUT => "$ENV{NGCP_URL}/customercontacts/7", ['Content-Type' => 'application/json'],
    encode_json({reseller_id => 1, email => 'alice@example.com', firstname => 'Alice', lastname => 'Smith',
        status => 'active'}));
print $ua->request($req)->status_line, "\n";
```

```perl Certificate
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use JSON::PP qw(decode_json encode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new(ssl_opts => {SSL_cert_file => $ENV{NGCP_CERT}, SSL_key_file => $ENV{NGCP_CERT}});

my $req = HTTP::Request->new(PUT => "$ENV{NGCP_URL}/customercontacts/7", ['Content-Type' => 'application/json'],
    encode_json({reseller_id => 1, email => 'alice@example.com', firstname => 'Alice', lastname => 'Smith',
        status => 'active'}));
print $ua->request($req)->status_line, "\n";
```

```elixir Basic Auth
# Elixir with Req, run with: elixir replace.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

req = Req.new(base_url: url, auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")})

res = Req.put!(req, url: "/customercontacts/7",
  json: %{reseller_id: 1, email: "alice@example.com", firstname: "Alice", lastname: "Smith", status: "active"}
)

IO.inspect(res.status)
```

```elixir Access Token
# Elixir with Req, run with: elixir replace.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

%{body: %{"access_token" => token}} =
  Req.post!("#{url}/auth/jwt", auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")})

req = Req.new(base_url: url, auth: {:bearer, token})

res = Req.put!(req, url: "/customercontacts/7",
  json: %{reseller_id: 1, email: "alice@example.com", firstname: "Alice", lastname: "Smith", status: "active"}
)

IO.inspect(res.status)
```

```elixir Certificate
# Elixir with Req, run with: elixir replace.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

req = Req.new(base_url: url, connect_options: [transport_opts: [certfile: System.fetch_env!("NGCP_CERT"), keyfile: System.fetch_env!("NGCP_CERT")]])

res = Req.put!(req, url: "/customercontacts/7",
  json: %{reseller_id: 1, email: "alice@example.com", firstname: "Alice", lastname: "Smith", status: "active"}
)

IO.inspect(res.status)
```

### Modificare (PATCH)

Modifica il cognome del contatto 7 con un JSON Patch.

```shell Basic Auth
# curl
curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -X PATCH -H 'Content-Type: application/json-patch+json' \
  -d '[{"op": "replace", "path": "/lastname", "value": "Smith"}]' "$NGCP_URL/customercontacts/7"
```

```shell Access Token
# curl and jq
token=$(curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -X POST "$NGCP_URL/auth/jwt" | jq -r .access_token)

curl -sS --fail-with-body -H "Authorization: Bearer $token" -X PATCH -H 'Content-Type: application/json-patch+json' \
  -d '[{"op": "replace", "path": "/lastname", "value": "Smith"}]' "$NGCP_URL/customercontacts/7"
```

```shell Certificate
# curl
curl -sS --fail-with-body --cert "$NGCP_CERT" -X PATCH -H 'Content-Type: application/json-patch+json' \
  -d '[{"op": "replace", "path": "/lastname", "value": "Smith"}]' "$NGCP_URL/customercontacts/7"
```

```javascript Basic Auth
// Node.js 18 or later, save as modify.mjs
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env
const auth = 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')

const changed = await fetch(`${NGCP_URL}/customercontacts/7`, {
  method: 'PATCH',
  headers: {Authorization: auth, 'Content-Type': 'application/json-patch+json'},
  body: JSON.stringify([{op: 'replace', path: '/lastname', value: 'Smith'}]),
})
console.log(changed.status)
```

```javascript Access Token
// Node.js 18 or later, save as modify.mjs
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')}})
const {access_token} = await login.json()
const auth = `Bearer ${access_token}`

const changed = await fetch(`${NGCP_URL}/customercontacts/7`, {
  method: 'PATCH',
  headers: {Authorization: auth, 'Content-Type': 'application/json-patch+json'},
  body: JSON.stringify([{op: 'replace', path: '/lastname', value: 'Smith'}]),
})
console.log(changed.status)
```

```javascript Certificate
// Node.js 20 or later with undici (npm install undici), save as modify.mjs
import {readFileSync} from 'node:fs'
import {Agent, fetch} from 'undici'

const {NGCP_URL, NGCP_CERT} = process.env
const pem = readFileSync(NGCP_CERT)
const dispatcher = new Agent({connect: {cert: pem, key: pem}})

const changed = await fetch(`${NGCP_URL}/customercontacts/7`, {
  method: 'PATCH',
  headers: {'Content-Type': 'application/json-patch+json'}, dispatcher,
  body: JSON.stringify([{op: 'replace', path: '/lastname', value: 'Smith'}]),
})
console.log(changed.status)
```

```typescript Basic Auth
// TypeScript, run with Node.js 23.6 or later: node modify.ts
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env
const auth = 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')

const changed = await fetch(`${NGCP_URL}/customercontacts/7`, {
  method: 'PATCH',
  headers: {Authorization: auth, 'Content-Type': 'application/json-patch+json'},
  body: JSON.stringify([{op: 'replace', path: '/lastname', value: 'Smith'}]),
})
console.log(changed.status)
```

```typescript Access Token
// TypeScript, run with Node.js 23.6 or later: node modify.ts
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')}})
const {access_token} = await login.json() as {access_token: string}
const auth = `Bearer ${access_token}`

const changed = await fetch(`${NGCP_URL}/customercontacts/7`, {
  method: 'PATCH',
  headers: {Authorization: auth, 'Content-Type': 'application/json-patch+json'},
  body: JSON.stringify([{op: 'replace', path: '/lastname', value: 'Smith'}]),
})
console.log(changed.status)
```

```typescript Certificate
// TypeScript with undici (npm install undici), run with Node.js 23.6 or later: node modify.ts
import {readFileSync} from 'node:fs'
import {Agent, fetch} from 'undici'

const {NGCP_URL, NGCP_CERT = ''} = process.env
const pem = readFileSync(NGCP_CERT)
const dispatcher = new Agent({connect: {cert: pem, key: pem}})

const changed = await fetch(`${NGCP_URL}/customercontacts/7`, {
  method: 'PATCH',
  headers: {'Content-Type': 'application/json-patch+json'}, dispatcher,
  body: JSON.stringify([{op: 'replace', path: '/lastname', value: 'Smith'}]),
})
console.log(changed.status)
```

```python Basic Auth
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
auth = (os.environ["NGCP_USER"], os.environ["NGCP_PASS"])

requests.patch(f"{url}/customercontacts/7", auth=auth, headers={"Content-Type": "application/json-patch+json"},
               json=[{"op": "replace", "path": "/lastname", "value": "Smith"}]).raise_for_status()
```

```python Access Token
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
token = requests.post(f"{url}/auth/jwt", auth=(os.environ["NGCP_USER"], os.environ["NGCP_PASS"])).json()["access_token"]
auth = {"Authorization": f"Bearer {token}"}

requests.patch(f"{url}/customercontacts/7", headers={**auth, "Content-Type": "application/json-patch+json"},
               json=[{"op": "replace", "path": "/lastname", "value": "Smith"}]).raise_for_status()
```

```python Certificate
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
cert = os.environ["NGCP_CERT"]

requests.patch(f"{url}/customercontacts/7", cert=cert, headers={"Content-Type": "application/json-patch+json"},
               json=[{"op": "replace", "path": "/lastname", "value": "Smith"}]).raise_for_status()
```

```go Basic Auth
// Go, standard library only
package main

import (
	"fmt"
	"net/http"
	"os"
	"strings"
)

func main() {
	url := os.Getenv("NGCP_URL")
	req, _ := http.NewRequest("PATCH", url+"/customercontacts/7", strings.NewReader(`[{"op": "replace", "path": "/lastname", "value": "Smith"}]`))
	req.Header.Set("Content-Type", "application/json-patch+json")
	req.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	res.Body.Close()
	fmt.Println(res.Status)
}
```

```go Access Token
// Go, standard library only
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
)

func main() {
	url := os.Getenv("NGCP_URL")
	login, _ := http.NewRequest("POST", url+"/auth/jwt", nil)
	login.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	out, err := http.DefaultClient.Do(login)
	if err != nil {
		panic(err)
	}
	var jwt struct {
		AccessToken string `json:"access_token"`
	}
	json.NewDecoder(out.Body).Decode(&jwt)
	out.Body.Close()

	req, _ := http.NewRequest("PATCH", url+"/customercontacts/7", strings.NewReader(`[{"op": "replace", "path": "/lastname", "value": "Smith"}]`))
	req.Header.Set("Content-Type", "application/json-patch+json")
	req.Header.Set("Authorization", "Bearer "+jwt.AccessToken)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	res.Body.Close()
	fmt.Println(res.Status)
}
```

```go Certificate
// Go, standard library only
package main

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"os"
	"strings"
)

func main() {
	url := os.Getenv("NGCP_URL")
	cert, err := tls.LoadX509KeyPair(os.Getenv("NGCP_CERT"), os.Getenv("NGCP_CERT"))
	if err != nil {
		panic(err)
	}
	client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{Certificates: []tls.Certificate{cert}}}}

	req, _ := http.NewRequest("PATCH", url+"/customercontacts/7", strings.NewReader(`[{"op": "replace", "path": "/lastname", "value": "Smith"}]`))
	req.Header.Set("Content-Type", "application/json-patch+json")
	res, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	res.Body.Close()
	fmt.Println(res.Status)
}
```

```java Basic Auth
// Java 17 or later
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

public class ModifyContact {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();
        String auth = "Basic " + Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());

        HttpResponse<String> changed = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts/7"))
            .header("Authorization", auth)
            .header("Content-Type", "application/json-patch+json")
            .method("PATCH", HttpRequest.BodyPublishers.ofString("""
                [{"op": "replace", "path": "/lastname", "value": "Smith"}]"""))
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(changed.statusCode() + " " + changed.body());
    }
}
```

```java Access Token
// Java 17 or later with Jackson (com.fasterxml.jackson.core:jackson-databind)
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

public class ModifyContact {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();
        String credentials = Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());
        HttpResponse<String> login = http.send(HttpRequest.newBuilder(URI.create(url + "/auth/jwt"))
            .header("Authorization", "Basic " + credentials)
            .POST(HttpRequest.BodyPublishers.noBody())
            .build(), HttpResponse.BodyHandlers.ofString());
        String auth = "Bearer " + new ObjectMapper().readTree(login.body()).get("access_token").asText();

        HttpResponse<String> changed = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts/7"))
            .header("Authorization", auth)
            .header("Content-Type", "application/json-patch+json")
            .method("PATCH", HttpRequest.BodyPublishers.ofString("""
                [{"op": "replace", "path": "/lastname", "value": "Smith"}]"""))
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(changed.statusCode() + " " + changed.body());
    }
}
```

```java Certificate
// Java 17 or later
import java.io.FileInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyStore;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;

public class ModifyContact {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        char[] password = System.getenv("NGCP_CERT_PASS").toCharArray();
        KeyStore store = KeyStore.getInstance("PKCS12");
        try (FileInputStream in = new FileInputStream(System.getenv("NGCP_CERT_P12"))) {
            store.load(in, password);
        }
        KeyManagerFactory keys = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        keys.init(store, password);
        SSLContext ssl = SSLContext.getInstance("TLS");
        ssl.init(keys.getKeyManagers(), null, null);
        HttpClient http = HttpClient.newBuilder().sslContext(ssl).build();

        HttpResponse<String> changed = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts/7"))
            .header("Content-Type", "application/json-patch+json")
            .method("PATCH", HttpRequest.BodyPublishers.ofString("""
                [{"op": "replace", "path": "/lastname", "value": "Smith"}]"""))
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(changed.statusCode() + " " + changed.body());
    }
}
```

```csharp Basic Auth
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Text;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

var changed = await http.PatchAsync($"{url}/customercontacts/7", new StringContent(
    """[{"op": "replace", "path": "/lastname", "value": "Smith"}]""", Encoding.UTF8, "application/json-patch+json"));
Console.WriteLine((int)changed.StatusCode);
```

```csharp Access Token
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
var login = new HttpRequestMessage(HttpMethod.Post, $"{url}/auth/jwt");
login.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
var jwt = await (await http.SendAsync(login)).Content.ReadFromJsonAsync<JsonElement>();
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt.GetProperty("access_token").GetString());

var changed = await http.PatchAsync($"{url}/customercontacts/7", new StringContent(
    """[{"op": "replace", "path": "/lastname", "value": "Smith"}]""", Encoding.UTF8, "application/json-patch+json"));
Console.WriteLine((int)changed.StatusCode);
```

```csharp Certificate
// .NET 8, no extra packages
using System.Security.Cryptography.X509Certificates;
using System.Text;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var handler = new HttpClientHandler();
handler.ClientCertificates.Add(X509Certificate2.CreateFromPemFile(Environment.GetEnvironmentVariable("NGCP_CERT")!));
var http = new HttpClient(handler);

var changed = await http.PatchAsync($"{url}/customercontacts/7", new StringContent(
    """[{"op": "replace", "path": "/lastname", "value": "Smith"}]""", Encoding.UTF8, "application/json-patch+json"));
Console.WriteLine((int)changed.StatusCode);
```

```rust Basic Auth
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking"] }, serde_json = "1"
use reqwest::blocking::Client;
use std::env;
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();

    let res = http.patch(format!("{url}/customercontacts/7"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .header("Content-Type", "application/json-patch+json")
        .body(json!([{"op": "replace", "path": "/lastname", "value": "Smith"}]).to_string())
        .send()?
        .error_for_status()?;
    println!("{}", res.status());
    Ok(())
}
```

```rust Access Token
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "json"] }, serde_json = "1"
use reqwest::blocking::Client;
use std::env;
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();
    let jwt: serde_json::Value = http
        .post(format!("{url}/auth/jwt"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .send()?
        .json()?;
    let token = jwt["access_token"].as_str().unwrap_or_default();

    let res = http.patch(format!("{url}/customercontacts/7"))
        .bearer_auth(token)
        .header("Content-Type", "application/json-patch+json")
        .body(json!([{"op": "replace", "path": "/lastname", "value": "Smith"}]).to_string())
        .send()?
        .error_for_status()?;
    println!("{}", res.status());
    Ok(())
}
```

```rust Certificate
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "native-tls"] }, serde_json = "1"
use reqwest::blocking::Client;
use reqwest::Identity;
use std::{env, fs};
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let p12 = fs::read(env::var("NGCP_CERT_P12")?)?;
    let http = Client::builder().identity(Identity::from_pkcs12_der(&p12, &env::var("NGCP_CERT_PASS")?)?).build()?;

    let res = http.patch(format!("{url}/customercontacts/7"))
        .header("Content-Type", "application/json-patch+json")
        .body(json!([{"op": "replace", "path": "/lastname", "value": "Smith"}]).to_string())
        .send()?
        .error_for_status()?;
    println!("{}", res.status());
    Ok(())
}
```

```c Basic Auth
/* libcurl: cc modify.c -o modify -lcurl */
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>

int main(void)
{
    char url[512], userpwd[256];
    CURL *curl = curl_easy_init();
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);

    struct curl_slist *patch = curl_slist_append(NULL, "Content-Type: application/json-patch+json");
    snprintf(url, sizeof url, "%s/customercontacts/7", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PATCH");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, patch);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "[{\"op\": \"replace\", \"path\": \"/lastname\", \"value\": \"Smith\"}]");
    curl_easy_perform(curl);

    curl_slist_free_all(patch);
    curl_easy_cleanup(curl);
    return 0;
}
```

```c Access Token
/* libcurl and cJSON: cc modify.c -o modify -lcurl -lcjson */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include <cjson/cJSON.h>

/* appends the response body to the buffer */
static size_t save(char *data, size_t size, size_t n, void *body)
{
    size_t room = 4095 - strlen(body);
    strncat(body, data, size * n < room ? size * n : room);
    return size * n;
}

int main(void)
{
    char url[512], body[4096] = "", userpwd[256];
    CURL *curl = curl_easy_init();
    snprintf(url, sizeof url, "%s/auth/jwt", getenv("NGCP_URL"));
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, body);
    curl_easy_perform(curl);
    cJSON *jwt = cJSON_Parse(body);
    curl_easy_reset(curl);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, cJSON_GetObjectItem(jwt, "access_token")->valuestring);
    cJSON_Delete(jwt);
    body[0] = 0;

    struct curl_slist *patch = curl_slist_append(NULL, "Content-Type: application/json-patch+json");
    snprintf(url, sizeof url, "%s/customercontacts/7", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PATCH");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, patch);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "[{\"op\": \"replace\", \"path\": \"/lastname\", \"value\": \"Smith\"}]");
    curl_easy_perform(curl);

    curl_slist_free_all(patch);
    curl_easy_cleanup(curl);
    return 0;
}
```

```c Certificate
/* libcurl: cc modify.c -o modify -lcurl */
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>

int main(void)
{
    char url[512];
    CURL *curl = curl_easy_init();
    curl_easy_setopt(curl, CURLOPT_SSLCERT, getenv("NGCP_CERT"));
    curl_easy_setopt(curl, CURLOPT_SSLKEY, getenv("NGCP_CERT"));

    struct curl_slist *patch = curl_slist_append(NULL, "Content-Type: application/json-patch+json");
    snprintf(url, sizeof url, "%s/customercontacts/7", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PATCH");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, patch);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "[{\"op\": \"replace\", \"path\": \"/lastname\", \"value\": \"Smith\"}]");
    curl_easy_perform(curl);

    curl_slist_free_all(patch);
    curl_easy_cleanup(curl);
    return 0;
}
```

```cpp Basic Auth
// libcurl: c++ -std=c++17 modify.cpp -o modify -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>

int main()
{
    std::string url = std::getenv("NGCP_URL");
    CURL* curl = curl_easy_init();
    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());

    curl_slist* patch = curl_slist_append(nullptr, "Content-Type: application/json-patch+json");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts/7").c_str());
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PATCH");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, patch);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, R"([{"op": "replace", "path": "/lastname", "value": "Smith"}])");
    curl_easy_perform(curl);

    curl_slist_free_all(patch);
    curl_easy_cleanup(curl);
}
```

```cpp Access Token
// libcurl and nlohmann/json: c++ -std=c++17 modify.cpp -o modify -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

// appends the response body to a std::string
static size_t save(char* data, size_t size, size_t n, void* body)
{
    static_cast<std::string*>(body)->append(data, size * n);
    return size * n;
}

int main()
{
    std::string url = std::getenv("NGCP_URL"), body;
    CURL* curl = curl_easy_init();
    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/auth/jwt").c_str());
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
    curl_easy_perform(curl);
    std::string token = nlohmann::json::parse(body)["access_token"];
    body.clear();
    curl_easy_reset(curl);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, token.c_str());

    curl_slist* patch = curl_slist_append(nullptr, "Content-Type: application/json-patch+json");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts/7").c_str());
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PATCH");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, patch);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, R"([{"op": "replace", "path": "/lastname", "value": "Smith"}])");
    curl_easy_perform(curl);

    curl_slist_free_all(patch);
    curl_easy_cleanup(curl);
}
```

```cpp Certificate
// libcurl: c++ -std=c++17 modify.cpp -o modify -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>

int main()
{
    std::string url = std::getenv("NGCP_URL");
    CURL* curl = curl_easy_init();
    curl_easy_setopt(curl, CURLOPT_SSLCERT, std::getenv("NGCP_CERT"));
    curl_easy_setopt(curl, CURLOPT_SSLKEY, std::getenv("NGCP_CERT"));

    curl_slist* patch = curl_slist_append(nullptr, "Content-Type: application/json-patch+json");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts/7").c_str());
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PATCH");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, patch);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, R"([{"op": "replace", "path": "/lastname", "value": "Smith"}])");
    curl_easy_perform(curl);

    curl_slist_free_all(patch);
    curl_easy_cleanup(curl);
}
```

```perl Basic Auth
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use JSON::PP qw(decode_json encode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;
$ua->default_headers->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});

my $req = HTTP::Request->new(PATCH => "$ENV{NGCP_URL}/customercontacts/7", ['Content-Type' => 'application/json-patch+json'],
    encode_json([{op => 'replace', path => '/lastname', value => 'Smith'}]));
print $ua->request($req)->status_line, "\n";
```

```perl Access Token
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use JSON::PP qw(decode_json encode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;
my $login = HTTP::Request->new(POST => "$ENV{NGCP_URL}/auth/jwt");
$login->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});
my $token = decode_json($ua->request($login)->content)->{access_token};
$ua->default_header(Authorization => "Bearer $token");

my $req = HTTP::Request->new(PATCH => "$ENV{NGCP_URL}/customercontacts/7", ['Content-Type' => 'application/json-patch+json'],
    encode_json([{op => 'replace', path => '/lastname', value => 'Smith'}]));
print $ua->request($req)->status_line, "\n";
```

```perl Certificate
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use JSON::PP qw(decode_json encode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new(ssl_opts => {SSL_cert_file => $ENV{NGCP_CERT}, SSL_key_file => $ENV{NGCP_CERT}});

my $req = HTTP::Request->new(PATCH => "$ENV{NGCP_URL}/customercontacts/7", ['Content-Type' => 'application/json-patch+json'],
    encode_json([{op => 'replace', path => '/lastname', value => 'Smith'}]));
print $ua->request($req)->status_line, "\n";
```

```elixir Basic Auth
# Elixir with Req, run with: elixir modify.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

req = Req.new(base_url: url, auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")})

res = Req.patch!(req, url: "/customercontacts/7",
  headers: [content_type: "application/json-patch+json"],
  body: Jason.encode!([%{op: "replace", path: "/lastname", value: "Smith"}])
)

IO.inspect(res.status)
```

```elixir Access Token
# Elixir with Req, run with: elixir modify.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

%{body: %{"access_token" => token}} =
  Req.post!("#{url}/auth/jwt", auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")})

req = Req.new(base_url: url, auth: {:bearer, token})

res = Req.patch!(req, url: "/customercontacts/7",
  headers: [content_type: "application/json-patch+json"],
  body: Jason.encode!([%{op: "replace", path: "/lastname", value: "Smith"}])
)

IO.inspect(res.status)
```

```elixir Certificate
# Elixir with Req, run with: elixir modify.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

req = Req.new(base_url: url, connect_options: [transport_opts: [certfile: System.fetch_env!("NGCP_CERT"), keyfile: System.fetch_env!("NGCP_CERT")]])

res = Req.patch!(req, url: "/customercontacts/7",
  headers: [content_type: "application/json-patch+json"],
  body: Jason.encode!([%{op: "replace", path: "/lastname", value: "Smith"}])
)

IO.inspect(res.status)
```

### Eliminare (DELETE)

Elimina il contatto 7.

```shell Basic Auth
# curl
curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -X DELETE "$NGCP_URL/customercontacts/7"
```

```shell Access Token
# curl and jq
token=$(curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -X POST "$NGCP_URL/auth/jwt" | jq -r .access_token)

curl -sS --fail-with-body -H "Authorization: Bearer $token" -X DELETE "$NGCP_URL/customercontacts/7"
```

```shell Certificate
# curl
curl -sS --fail-with-body --cert "$NGCP_CERT" -X DELETE "$NGCP_URL/customercontacts/7"
```

```javascript Basic Auth
// Node.js 18 or later, save as delete.mjs
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env
const auth = 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')

const deleted = await fetch(`${NGCP_URL}/customercontacts/7`, {method: 'DELETE', headers: {Authorization: auth}})
console.log(deleted.status)
```

```javascript Access Token
// Node.js 18 or later, save as delete.mjs
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')}})
const {access_token} = await login.json()
const auth = `Bearer ${access_token}`

const deleted = await fetch(`${NGCP_URL}/customercontacts/7`, {method: 'DELETE', headers: {Authorization: auth}})
console.log(deleted.status)
```

```javascript Certificate
// Node.js 20 or later with undici (npm install undici), save as delete.mjs
import {readFileSync} from 'node:fs'
import {Agent, fetch} from 'undici'

const {NGCP_URL, NGCP_CERT} = process.env
const pem = readFileSync(NGCP_CERT)
const dispatcher = new Agent({connect: {cert: pem, key: pem}})

const deleted = await fetch(`${NGCP_URL}/customercontacts/7`, {method: 'DELETE', dispatcher})
console.log(deleted.status)
```

```typescript Basic Auth
// TypeScript, run with Node.js 23.6 or later: node delete.ts
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env
const auth = 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')

const deleted = await fetch(`${NGCP_URL}/customercontacts/7`, {method: 'DELETE', headers: {Authorization: auth}})
console.log(deleted.status)
```

```typescript Access Token
// TypeScript, run with Node.js 23.6 or later: node delete.ts
const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')}})
const {access_token} = await login.json() as {access_token: string}
const auth = `Bearer ${access_token}`

const deleted = await fetch(`${NGCP_URL}/customercontacts/7`, {method: 'DELETE', headers: {Authorization: auth}})
console.log(deleted.status)
```

```typescript Certificate
// TypeScript with undici (npm install undici), run with Node.js 23.6 or later: node delete.ts
import {readFileSync} from 'node:fs'
import {Agent, fetch} from 'undici'

const {NGCP_URL, NGCP_CERT = ''} = process.env
const pem = readFileSync(NGCP_CERT)
const dispatcher = new Agent({connect: {cert: pem, key: pem}})

const deleted = await fetch(`${NGCP_URL}/customercontacts/7`, {method: 'DELETE', dispatcher})
console.log(deleted.status)
```

```python Basic Auth
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
auth = (os.environ["NGCP_USER"], os.environ["NGCP_PASS"])

requests.delete(f"{url}/customercontacts/7", auth=auth).raise_for_status()
```

```python Access Token
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
token = requests.post(f"{url}/auth/jwt", auth=(os.environ["NGCP_USER"], os.environ["NGCP_PASS"])).json()["access_token"]
auth = {"Authorization": f"Bearer {token}"}

requests.delete(f"{url}/customercontacts/7", headers=auth).raise_for_status()
```

```python Certificate
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
cert = os.environ["NGCP_CERT"]

requests.delete(f"{url}/customercontacts/7", cert=cert).raise_for_status()
```

```go Basic Auth
// Go, standard library only
package main

import (
	"fmt"
	"net/http"
	"os"
)

func main() {
	url := os.Getenv("NGCP_URL")
	req, _ := http.NewRequest("DELETE", url+"/customercontacts/7", nil)
	req.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	res.Body.Close()
	fmt.Println(res.Status)
}
```

```go Access Token
// Go, standard library only
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

func main() {
	url := os.Getenv("NGCP_URL")
	login, _ := http.NewRequest("POST", url+"/auth/jwt", nil)
	login.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	out, err := http.DefaultClient.Do(login)
	if err != nil {
		panic(err)
	}
	var jwt struct {
		AccessToken string `json:"access_token"`
	}
	json.NewDecoder(out.Body).Decode(&jwt)
	out.Body.Close()

	req, _ := http.NewRequest("DELETE", url+"/customercontacts/7", nil)
	req.Header.Set("Authorization", "Bearer "+jwt.AccessToken)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	res.Body.Close()
	fmt.Println(res.Status)
}
```

```go Certificate
// Go, standard library only
package main

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"os"
)

func main() {
	url := os.Getenv("NGCP_URL")
	cert, err := tls.LoadX509KeyPair(os.Getenv("NGCP_CERT"), os.Getenv("NGCP_CERT"))
	if err != nil {
		panic(err)
	}
	client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{Certificates: []tls.Certificate{cert}}}}

	req, _ := http.NewRequest("DELETE", url+"/customercontacts/7", nil)
	res, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	res.Body.Close()
	fmt.Println(res.Status)
}
```

```java Basic Auth
// Java 17 or later
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

public class DeleteContact {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();
        String auth = "Basic " + Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());

        HttpResponse<String> deleted = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts/7"))
            .header("Authorization", auth)
            .DELETE()
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(deleted.statusCode() + " " + deleted.body());
    }
}
```

```java Access Token
// Java 17 or later with Jackson (com.fasterxml.jackson.core:jackson-databind)
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

public class DeleteContact {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();
        String credentials = Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());
        HttpResponse<String> login = http.send(HttpRequest.newBuilder(URI.create(url + "/auth/jwt"))
            .header("Authorization", "Basic " + credentials)
            .POST(HttpRequest.BodyPublishers.noBody())
            .build(), HttpResponse.BodyHandlers.ofString());
        String auth = "Bearer " + new ObjectMapper().readTree(login.body()).get("access_token").asText();

        HttpResponse<String> deleted = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts/7"))
            .header("Authorization", auth)
            .DELETE()
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(deleted.statusCode() + " " + deleted.body());
    }
}
```

```java Certificate
// Java 17 or later
import java.io.FileInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyStore;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;

public class DeleteContact {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        char[] password = System.getenv("NGCP_CERT_PASS").toCharArray();
        KeyStore store = KeyStore.getInstance("PKCS12");
        try (FileInputStream in = new FileInputStream(System.getenv("NGCP_CERT_P12"))) {
            store.load(in, password);
        }
        KeyManagerFactory keys = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        keys.init(store, password);
        SSLContext ssl = SSLContext.getInstance("TLS");
        ssl.init(keys.getKeyManagers(), null, null);
        HttpClient http = HttpClient.newBuilder().sslContext(ssl).build();

        HttpResponse<String> deleted = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts/7"))
            .DELETE()
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(deleted.statusCode() + " " + deleted.body());
    }
}
```

```csharp Basic Auth
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Text;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

var deleted = await http.DeleteAsync($"{url}/customercontacts/7");
Console.WriteLine((int)deleted.StatusCode);
```

```csharp Access Token
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
var login = new HttpRequestMessage(HttpMethod.Post, $"{url}/auth/jwt");
login.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
var jwt = await (await http.SendAsync(login)).Content.ReadFromJsonAsync<JsonElement>();
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt.GetProperty("access_token").GetString());

var deleted = await http.DeleteAsync($"{url}/customercontacts/7");
Console.WriteLine((int)deleted.StatusCode);
```

```csharp Certificate
// .NET 8, no extra packages
using System.Security.Cryptography.X509Certificates;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var handler = new HttpClientHandler();
handler.ClientCertificates.Add(X509Certificate2.CreateFromPemFile(Environment.GetEnvironmentVariable("NGCP_CERT")!));
var http = new HttpClient(handler);

var deleted = await http.DeleteAsync($"{url}/customercontacts/7");
Console.WriteLine((int)deleted.StatusCode);
```

```rust Basic Auth
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking"] }
use reqwest::blocking::Client;
use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();

    let res = http.delete(format!("{url}/customercontacts/7"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .send()?
        .error_for_status()?;
    println!("{}", res.status());
    Ok(())
}
```

```rust Access Token
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "json"] }, serde_json = "1"
use reqwest::blocking::Client;
use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();
    let jwt: serde_json::Value = http
        .post(format!("{url}/auth/jwt"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .send()?
        .json()?;
    let token = jwt["access_token"].as_str().unwrap_or_default();

    let res = http.delete(format!("{url}/customercontacts/7"))
        .bearer_auth(token)
        .send()?
        .error_for_status()?;
    println!("{}", res.status());
    Ok(())
}
```

```rust Certificate
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "native-tls"] }
use reqwest::blocking::Client;
use reqwest::Identity;
use std::{env, fs};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let p12 = fs::read(env::var("NGCP_CERT_P12")?)?;
    let http = Client::builder().identity(Identity::from_pkcs12_der(&p12, &env::var("NGCP_CERT_PASS")?)?).build()?;

    let res = http.delete(format!("{url}/customercontacts/7"))
        .send()?
        .error_for_status()?;
    println!("{}", res.status());
    Ok(())
}
```

```c Basic Auth
/* libcurl: cc delete.c -o delete -lcurl */
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>

int main(void)
{
    char url[512], userpwd[256];
    CURL *curl = curl_easy_init();
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);

    snprintf(url, sizeof url, "%s/customercontacts/7", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
    curl_easy_perform(curl);

    curl_easy_cleanup(curl);
    return 0;
}
```

```c Access Token
/* libcurl and cJSON: cc delete.c -o delete -lcurl -lcjson */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include <cjson/cJSON.h>

/* appends the response body to the buffer */
static size_t save(char *data, size_t size, size_t n, void *body)
{
    size_t room = 4095 - strlen(body);
    strncat(body, data, size * n < room ? size * n : room);
    return size * n;
}

int main(void)
{
    char url[512], body[4096] = "", userpwd[256];
    CURL *curl = curl_easy_init();
    snprintf(url, sizeof url, "%s/auth/jwt", getenv("NGCP_URL"));
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, body);
    curl_easy_perform(curl);
    cJSON *jwt = cJSON_Parse(body);
    curl_easy_reset(curl);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, cJSON_GetObjectItem(jwt, "access_token")->valuestring);
    cJSON_Delete(jwt);
    body[0] = 0;

    snprintf(url, sizeof url, "%s/customercontacts/7", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
    curl_easy_perform(curl);

    curl_easy_cleanup(curl);
    return 0;
}
```

```c Certificate
/* libcurl: cc delete.c -o delete -lcurl */
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>

int main(void)
{
    char url[512];
    CURL *curl = curl_easy_init();
    curl_easy_setopt(curl, CURLOPT_SSLCERT, getenv("NGCP_CERT"));
    curl_easy_setopt(curl, CURLOPT_SSLKEY, getenv("NGCP_CERT"));

    snprintf(url, sizeof url, "%s/customercontacts/7", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
    curl_easy_perform(curl);

    curl_easy_cleanup(curl);
    return 0;
}
```

```cpp Basic Auth
// libcurl: c++ -std=c++17 delete.cpp -o delete -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>

int main()
{
    std::string url = std::getenv("NGCP_URL");
    CURL* curl = curl_easy_init();
    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());

    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts/7").c_str());
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
    curl_easy_perform(curl);

    curl_easy_cleanup(curl);
}
```

```cpp Access Token
// libcurl and nlohmann/json: c++ -std=c++17 delete.cpp -o delete -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

// appends the response body to a std::string
static size_t save(char* data, size_t size, size_t n, void* body)
{
    static_cast<std::string*>(body)->append(data, size * n);
    return size * n;
}

int main()
{
    std::string url = std::getenv("NGCP_URL"), body;
    CURL* curl = curl_easy_init();
    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/auth/jwt").c_str());
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
    curl_easy_perform(curl);
    std::string token = nlohmann::json::parse(body)["access_token"];
    body.clear();
    curl_easy_reset(curl);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, token.c_str());

    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts/7").c_str());
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
    curl_easy_perform(curl);

    curl_easy_cleanup(curl);
}
```

```cpp Certificate
// libcurl: c++ -std=c++17 delete.cpp -o delete -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>

int main()
{
    std::string url = std::getenv("NGCP_URL");
    CURL* curl = curl_easy_init();
    curl_easy_setopt(curl, CURLOPT_SSLCERT, std::getenv("NGCP_CERT"));
    curl_easy_setopt(curl, CURLOPT_SSLKEY, std::getenv("NGCP_CERT"));

    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts/7").c_str());
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
    curl_easy_perform(curl);

    curl_easy_cleanup(curl);
}
```

```perl Basic Auth
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use JSON::PP qw(decode_json encode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;
$ua->default_headers->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});

print $ua->delete("$ENV{NGCP_URL}/customercontacts/7")->status_line, "\n";
```

```perl Access Token
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use JSON::PP qw(decode_json encode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;
my $login = HTTP::Request->new(POST => "$ENV{NGCP_URL}/auth/jwt");
$login->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});
my $token = decode_json($ua->request($login)->content)->{access_token};
$ua->default_header(Authorization => "Bearer $token");

print $ua->delete("$ENV{NGCP_URL}/customercontacts/7")->status_line, "\n";
```

```perl Certificate
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use JSON::PP qw(decode_json encode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new(ssl_opts => {SSL_cert_file => $ENV{NGCP_CERT}, SSL_key_file => $ENV{NGCP_CERT}});

print $ua->delete("$ENV{NGCP_URL}/customercontacts/7")->status_line, "\n";
```

```elixir Basic Auth
# Elixir with Req, run with: elixir delete.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

req = Req.new(base_url: url, auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")})

IO.inspect(Req.delete!(req, url: "/customercontacts/7").status)
```

```elixir Access Token
# Elixir with Req, run with: elixir delete.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

%{body: %{"access_token" => token}} =
  Req.post!("#{url}/auth/jwt", auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")})

req = Req.new(base_url: url, auth: {:bearer, token})

IO.inspect(Req.delete!(req, url: "/customercontacts/7").status)
```

```elixir Certificate
# Elixir with Req, run with: elixir delete.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

req = Req.new(base_url: url, connect_options: [transport_opts: [certfile: System.fetch_env!("NGCP_CERT"), keyfile: System.fetch_env!("NGCP_CERT")]])

IO.inspect(Req.delete!(req, url: "/customercontacts/7").status)
```

### Download di file

Salva la rubrica del cliente 3 in formato CSV in `phonebook.csv`.

```shell Basic Auth
# curl
curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -H 'Accept: text/csv' -o phonebook.csv \
  "$NGCP_URL/customers/3/phonebook"
```

```shell Access Token
# curl and jq
token=$(curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -X POST "$NGCP_URL/auth/jwt" | jq -r .access_token)

curl -sS --fail-with-body -H "Authorization: Bearer $token" -H 'Accept: text/csv' -o phonebook.csv \
  "$NGCP_URL/customers/3/phonebook"
```

```shell Certificate
# curl
curl -sS --fail-with-body --cert "$NGCP_CERT" -H 'Accept: text/csv' -o phonebook.csv \
  "$NGCP_URL/customers/3/phonebook"
```

```javascript Basic Auth
// Node.js 18 or later, save as download.mjs
import {writeFileSync} from 'node:fs'

const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env
const auth = 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')

const res = await fetch(`${NGCP_URL}/customers/3/phonebook`, {
  headers: {Authorization: auth, Accept: 'text/csv'},
})
writeFileSync('phonebook.csv', await res.text())
console.log(res.status)
```

```javascript Access Token
// Node.js 18 or later, save as download.mjs
import {writeFileSync} from 'node:fs'

const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')}})
const {access_token} = await login.json()
const auth = `Bearer ${access_token}`

const res = await fetch(`${NGCP_URL}/customers/3/phonebook`, {
  headers: {Authorization: auth, Accept: 'text/csv'},
})
writeFileSync('phonebook.csv', await res.text())
console.log(res.status)
```

```javascript Certificate
// Node.js 20 or later with undici (npm install undici), save as download.mjs
import {readFileSync, writeFileSync} from 'node:fs'
import {Agent, fetch} from 'undici'

const {NGCP_URL, NGCP_CERT} = process.env
const pem = readFileSync(NGCP_CERT)
const dispatcher = new Agent({connect: {cert: pem, key: pem}})

const res = await fetch(`${NGCP_URL}/customers/3/phonebook`, {
  headers: {Accept: 'text/csv'}, dispatcher,
})
writeFileSync('phonebook.csv', await res.text())
console.log(res.status)
```

```typescript Basic Auth
// TypeScript, run with Node.js 23.6 or later: node download.ts
import {writeFileSync} from 'node:fs'

const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env
const auth = 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')

const res = await fetch(`${NGCP_URL}/customers/3/phonebook`, {
  headers: {Authorization: auth, Accept: 'text/csv'},
})
writeFileSync('phonebook.csv', await res.text())
console.log(res.status)
```

```typescript Access Token
// TypeScript, run with Node.js 23.6 or later: node download.ts
import {writeFileSync} from 'node:fs'

const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')}})
const {access_token} = await login.json() as {access_token: string}
const auth = `Bearer ${access_token}`

const res = await fetch(`${NGCP_URL}/customers/3/phonebook`, {
  headers: {Authorization: auth, Accept: 'text/csv'},
})
writeFileSync('phonebook.csv', await res.text())
console.log(res.status)
```

```typescript Certificate
// TypeScript with undici (npm install undici), run with Node.js 23.6 or later: node download.ts
import {readFileSync, writeFileSync} from 'node:fs'
import {Agent, fetch} from 'undici'

const {NGCP_URL, NGCP_CERT = ''} = process.env
const pem = readFileSync(NGCP_CERT)
const dispatcher = new Agent({connect: {cert: pem, key: pem}})

const res = await fetch(`${NGCP_URL}/customers/3/phonebook`, {
  headers: {Accept: 'text/csv'}, dispatcher,
})
writeFileSync('phonebook.csv', await res.text())
console.log(res.status)
```

```python Basic Auth
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]

res = requests.get(f"{url}/customers/3/phonebook",
                   auth=(os.environ["NGCP_USER"], os.environ["NGCP_PASS"]), headers={"Accept": "text/csv"})
res.raise_for_status()
with open("phonebook.csv", "wb") as f:
    f.write(res.content)
```

```python Access Token
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
token = requests.post(f"{url}/auth/jwt", auth=(os.environ["NGCP_USER"], os.environ["NGCP_PASS"])).json()["access_token"]

res = requests.get(f"{url}/customers/3/phonebook",
                   headers={"Authorization": f"Bearer {token}", "Accept": "text/csv"})
res.raise_for_status()
with open("phonebook.csv", "wb") as f:
    f.write(res.content)
```

```python Certificate
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]

res = requests.get(f"{url}/customers/3/phonebook",
                   cert=os.environ["NGCP_CERT"], headers={"Accept": "text/csv"})
res.raise_for_status()
with open("phonebook.csv", "wb") as f:
    f.write(res.content)
```

```go Basic Auth
// Go, standard library only
package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	url := os.Getenv("NGCP_URL")
	req, _ := http.NewRequest("GET", url+"/customers/3/phonebook", nil)
	req.Header.Set("Accept", "text/csv")
	req.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	os.WriteFile("phonebook.csv", body, 0o644)
	fmt.Println(res.Status)
}
```

```go Access Token
// Go, standard library only
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	url := os.Getenv("NGCP_URL")
	login, _ := http.NewRequest("POST", url+"/auth/jwt", nil)
	login.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	out, err := http.DefaultClient.Do(login)
	if err != nil {
		panic(err)
	}
	var jwt struct {
		AccessToken string `json:"access_token"`
	}
	json.NewDecoder(out.Body).Decode(&jwt)
	out.Body.Close()

	req, _ := http.NewRequest("GET", url+"/customers/3/phonebook", nil)
	req.Header.Set("Accept", "text/csv")
	req.Header.Set("Authorization", "Bearer "+jwt.AccessToken)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	os.WriteFile("phonebook.csv", body, 0o644)
	fmt.Println(res.Status)
}
```

```go Certificate
// Go, standard library only
package main

import (
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	url := os.Getenv("NGCP_URL")
	cert, err := tls.LoadX509KeyPair(os.Getenv("NGCP_CERT"), os.Getenv("NGCP_CERT"))
	if err != nil {
		panic(err)
	}
	client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{Certificates: []tls.Certificate{cert}}}}

	req, _ := http.NewRequest("GET", url+"/customers/3/phonebook", nil)
	req.Header.Set("Accept", "text/csv")
	res, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	os.WriteFile("phonebook.csv", body, 0o644)
	fmt.Println(res.Status)
}
```

```java Basic Auth
// Java 17 or later
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.util.Base64;

public class DownloadPhonebook {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();
        String auth = "Basic " + Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());

        HttpResponse<Path> res = http.send(HttpRequest.newBuilder(URI.create(url + "/customers/3/phonebook"))
            .header("Accept", "text/csv")
            .header("Authorization", auth)
            .build(), HttpResponse.BodyHandlers.ofFile(Path.of("phonebook.csv")));
        System.out.println(res.statusCode() + " " + res.body());
    }
}
```

```java Access Token
// Java 17 or later with Jackson (com.fasterxml.jackson.core:jackson-databind)
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.util.Base64;

public class DownloadPhonebook {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();
        String credentials = Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());
        HttpResponse<String> login = http.send(HttpRequest.newBuilder(URI.create(url + "/auth/jwt"))
            .header("Authorization", "Basic " + credentials)
            .POST(HttpRequest.BodyPublishers.noBody())
            .build(), HttpResponse.BodyHandlers.ofString());
        String auth = "Bearer " + new ObjectMapper().readTree(login.body()).get("access_token").asText();

        HttpResponse<Path> res = http.send(HttpRequest.newBuilder(URI.create(url + "/customers/3/phonebook"))
            .header("Accept", "text/csv")
            .header("Authorization", auth)
            .build(), HttpResponse.BodyHandlers.ofFile(Path.of("phonebook.csv")));
        System.out.println(res.statusCode() + " " + res.body());
    }
}
```

```java Certificate
// Java 17 or later
import java.io.FileInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.security.KeyStore;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;

public class DownloadPhonebook {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        char[] password = System.getenv("NGCP_CERT_PASS").toCharArray();
        KeyStore store = KeyStore.getInstance("PKCS12");
        try (FileInputStream in = new FileInputStream(System.getenv("NGCP_CERT_P12"))) {
            store.load(in, password);
        }
        KeyManagerFactory keys = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        keys.init(store, password);
        SSLContext ssl = SSLContext.getInstance("TLS");
        ssl.init(keys.getKeyManagers(), null, null);
        HttpClient http = HttpClient.newBuilder().sslContext(ssl).build();

        HttpResponse<Path> res = http.send(HttpRequest.newBuilder(URI.create(url + "/customers/3/phonebook"))
            .header("Accept", "text/csv")
            .build(), HttpResponse.BodyHandlers.ofFile(Path.of("phonebook.csv")));
        System.out.println(res.statusCode() + " " + res.body());
    }
}
```

```csharp Basic Auth
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Text;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

http.DefaultRequestHeaders.Accept.ParseAdd("text/csv");
var res = await http.GetAsync($"{url}/customers/3/phonebook");
await File.WriteAllBytesAsync("phonebook.csv", await res.Content.ReadAsByteArrayAsync());
Console.WriteLine((int)res.StatusCode);
```

```csharp Access Token
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
var login = new HttpRequestMessage(HttpMethod.Post, $"{url}/auth/jwt");
login.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
var jwt = await (await http.SendAsync(login)).Content.ReadFromJsonAsync<JsonElement>();
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt.GetProperty("access_token").GetString());

http.DefaultRequestHeaders.Accept.ParseAdd("text/csv");
var res = await http.GetAsync($"{url}/customers/3/phonebook");
await File.WriteAllBytesAsync("phonebook.csv", await res.Content.ReadAsByteArrayAsync());
Console.WriteLine((int)res.StatusCode);
```

```csharp Certificate
// .NET 8, no extra packages
using System.Security.Cryptography.X509Certificates;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var handler = new HttpClientHandler();
handler.ClientCertificates.Add(X509Certificate2.CreateFromPemFile(Environment.GetEnvironmentVariable("NGCP_CERT")!));
var http = new HttpClient(handler);

http.DefaultRequestHeaders.Accept.ParseAdd("text/csv");
var res = await http.GetAsync($"{url}/customers/3/phonebook");
await File.WriteAllBytesAsync("phonebook.csv", await res.Content.ReadAsByteArrayAsync());
Console.WriteLine((int)res.StatusCode);
```

```rust Basic Auth
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking"] }
use reqwest::blocking::Client;
use std::{env, fs};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();

    let res = http
        .get(format!("{url}/customers/3/phonebook"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .header("Accept", "text/csv")
        .send()?;
    let status = res.status();
    fs::write("phonebook.csv", res.bytes()?)?;
    println!("{status}");
    Ok(())
}
```

```rust Access Token
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "json"] }, serde_json = "1"
use reqwest::blocking::Client;
use std::{env, fs};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();
    let jwt: serde_json::Value = http
        .post(format!("{url}/auth/jwt"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .send()?
        .json()?;
    let token = jwt["access_token"].as_str().unwrap_or_default();

    let res = http
        .get(format!("{url}/customers/3/phonebook"))
        .bearer_auth(token)
        .header("Accept", "text/csv")
        .send()?;
    let status = res.status();
    fs::write("phonebook.csv", res.bytes()?)?;
    println!("{status}");
    Ok(())
}
```

```rust Certificate
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "native-tls"] }
use reqwest::blocking::Client;
use reqwest::Identity;
use std::{env, fs};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let p12 = fs::read(env::var("NGCP_CERT_P12")?)?;
    let http = Client::builder().identity(Identity::from_pkcs12_der(&p12, &env::var("NGCP_CERT_PASS")?)?).build()?;

    let res = http
        .get(format!("{url}/customers/3/phonebook"))
        .header("Accept", "text/csv")
        .send()?;
    let status = res.status();
    fs::write("phonebook.csv", res.bytes()?)?;
    println!("{status}");
    Ok(())
}
```

```c Basic Auth
/* libcurl: cc download.c -o download -lcurl */
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>

int main(void)
{
    char url[512], userpwd[256];
    CURL *curl = curl_easy_init();
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);

    FILE *out = fopen("phonebook.csv", "wb");
    struct curl_slist *headers = curl_slist_append(NULL, "Accept: text/csv");
    snprintf(url, sizeof url, "%s/customers/3/phonebook", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, out);
    CURLcode rc = curl_easy_perform(curl);  /* writes the response body to phonebook.csv */
    if (rc != CURLE_OK)
        fprintf(stderr, "%s\n", curl_easy_strerror(rc));

    fclose(out);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```c Access Token
/* libcurl and cJSON: cc download.c -o download -lcurl -lcjson */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include <cjson/cJSON.h>

/* appends the response body to the buffer */
static size_t save(char *data, size_t size, size_t n, void *body)
{
    size_t room = 4095 - strlen(body);
    strncat(body, data, size * n < room ? size * n : room);
    return size * n;
}

int main(void)
{
    char url[512], userpwd[256], body[4096] = "";
    CURL *curl = curl_easy_init();
    snprintf(url, sizeof url, "%s/auth/jwt", getenv("NGCP_URL"));
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, body);
    curl_easy_perform(curl);
    cJSON *jwt = cJSON_Parse(body);
    curl_easy_reset(curl);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, cJSON_GetObjectItem(jwt, "access_token")->valuestring);
    cJSON_Delete(jwt);

    FILE *out = fopen("phonebook.csv", "wb");
    struct curl_slist *headers = curl_slist_append(NULL, "Accept: text/csv");
    snprintf(url, sizeof url, "%s/customers/3/phonebook", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, out);
    CURLcode rc = curl_easy_perform(curl);  /* writes the response body to phonebook.csv */
    if (rc != CURLE_OK)
        fprintf(stderr, "%s\n", curl_easy_strerror(rc));

    fclose(out);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```c Certificate
/* libcurl: cc download.c -o download -lcurl */
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>

int main(void)
{
    char url[512];
    CURL *curl = curl_easy_init();
    curl_easy_setopt(curl, CURLOPT_SSLCERT, getenv("NGCP_CERT"));
    curl_easy_setopt(curl, CURLOPT_SSLKEY, getenv("NGCP_CERT"));

    FILE *out = fopen("phonebook.csv", "wb");
    struct curl_slist *headers = curl_slist_append(NULL, "Accept: text/csv");
    snprintf(url, sizeof url, "%s/customers/3/phonebook", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, out);
    CURLcode rc = curl_easy_perform(curl);  /* writes the response body to phonebook.csv */
    if (rc != CURLE_OK)
        fprintf(stderr, "%s\n", curl_easy_strerror(rc));

    fclose(out);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```cpp Basic Auth
// libcurl: c++ -std=c++17 download.cpp -o download -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>

int main()
{
    std::string url = std::getenv("NGCP_URL");
    CURL* curl = curl_easy_init();
    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());

    std::FILE* out = std::fopen("phonebook.csv", "wb");
    curl_slist* headers = curl_slist_append(nullptr, "Accept: text/csv");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customers/3/phonebook").c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, out);
    CURLcode rc = curl_easy_perform(curl);  // writes the response body to phonebook.csv
    if (rc != CURLE_OK)
        std::cerr << curl_easy_strerror(rc) << '\n';

    std::fclose(out);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```cpp Access Token
// libcurl and nlohmann/json: c++ -std=c++17 download.cpp -o download -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

// appends the response body to a std::string
static size_t save(char* data, size_t size, size_t n, void* body)
{
    static_cast<std::string*>(body)->append(data, size * n);
    return size * n;
}

int main()
{
    std::string url = std::getenv("NGCP_URL"), body;
    CURL* curl = curl_easy_init();
    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/auth/jwt").c_str());
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
    curl_easy_perform(curl);
    std::string token = nlohmann::json::parse(body)["access_token"];
    body.clear();
    curl_easy_reset(curl);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, token.c_str());

    std::FILE* out = std::fopen("phonebook.csv", "wb");
    curl_slist* headers = curl_slist_append(nullptr, "Accept: text/csv");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customers/3/phonebook").c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, out);
    CURLcode rc = curl_easy_perform(curl);  // writes the response body to phonebook.csv
    if (rc != CURLE_OK)
        std::cerr << curl_easy_strerror(rc) << '\n';

    std::fclose(out);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```cpp Certificate
// libcurl: c++ -std=c++17 download.cpp -o download -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>

int main()
{
    std::string url = std::getenv("NGCP_URL");
    CURL* curl = curl_easy_init();
    curl_easy_setopt(curl, CURLOPT_SSLCERT, std::getenv("NGCP_CERT"));
    curl_easy_setopt(curl, CURLOPT_SSLKEY, std::getenv("NGCP_CERT"));

    std::FILE* out = std::fopen("phonebook.csv", "wb");
    curl_slist* headers = curl_slist_append(nullptr, "Accept: text/csv");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customers/3/phonebook").c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, out);
    CURLcode rc = curl_easy_perform(curl);  // writes the response body to phonebook.csv
    if (rc != CURLE_OK)
        std::cerr << curl_easy_strerror(rc) << '\n';

    std::fclose(out);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```perl Basic Auth
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;
$ua->default_headers->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});

my $res = $ua->get("$ENV{NGCP_URL}/customers/3/phonebook",
    Accept => 'text/csv', ':content_file' => 'phonebook.csv');
print $res->status_line, "\n";
```

```perl Access Token
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use JSON::PP qw(decode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;
my $login = HTTP::Request->new(POST => "$ENV{NGCP_URL}/auth/jwt");
$login->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});
my $token = decode_json($ua->request($login)->content)->{access_token};
$ua->default_header(Authorization => "Bearer $token");

my $res = $ua->get("$ENV{NGCP_URL}/customers/3/phonebook",
    Accept => 'text/csv', ':content_file' => 'phonebook.csv');
print $res->status_line, "\n";
```

```perl Certificate
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use LWP::UserAgent;

my $ua = LWP::UserAgent->new(ssl_opts => {SSL_cert_file => $ENV{NGCP_CERT}, SSL_key_file => $ENV{NGCP_CERT}});

my $res = $ua->get("$ENV{NGCP_URL}/customers/3/phonebook",
    Accept => 'text/csv', ':content_file' => 'phonebook.csv');
print $res->status_line, "\n";
```

```elixir Basic Auth
# Elixir with Req, run with: elixir download.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

res =
  Req.get!("#{url}/customers/3/phonebook",
    auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")},
    headers: [accept: "text/csv"]
  )

File.write!("phonebook.csv", res.body)
IO.inspect(res.status)
```

```elixir Access Token
# Elixir with Req, run with: elixir download.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

%{body: %{"access_token" => token}} =
  Req.post!("#{url}/auth/jwt", auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")})

res =
  Req.get!("#{url}/customers/3/phonebook",
    auth: {:bearer, token},
    headers: [accept: "text/csv"]
  )

File.write!("phonebook.csv", res.body)
IO.inspect(res.status)
```

```elixir Certificate
# Elixir with Req, run with: elixir download.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

res =
  Req.get!("#{url}/customers/3/phonebook",
    connect_options: [transport_opts: [certfile: System.fetch_env!("NGCP_CERT"), keyfile: System.fetch_env!("NGCP_CERT")]],
    headers: [accept: "text/csv"]
  )

File.write!("phonebook.csv", res.body)
IO.inspect(res.status)
```

### Upload di file

Aggiunge le voci di `phonebook.csv` (colonne `name,number,customer_id`) alla rubrica del cliente 3, inviate come parte `file` di `multipart/form-data`. Con `?purge_existing=true` sostituiscono le voci esistenti.

```shell Basic Auth
# curl
curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -F 'file=@phonebook.csv;type=text/csv' \
  "$NGCP_URL/customers/3/phonebook"
```

```shell Access Token
# curl and jq
token=$(curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -X POST "$NGCP_URL/auth/jwt" | jq -r .access_token)

curl -sS --fail-with-body -H "Authorization: Bearer $token" -F 'file=@phonebook.csv;type=text/csv' \
  "$NGCP_URL/customers/3/phonebook"
```

```shell Certificate
# curl
curl -sS --fail-with-body --cert "$NGCP_CERT" -F 'file=@phonebook.csv;type=text/csv' \
  "$NGCP_URL/customers/3/phonebook"
```

```javascript Basic Auth
// Node.js 20 or later, save as upload.mjs
import {openAsBlob} from 'node:fs'

const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env
const auth = 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')

const form = new FormData()
form.append('file', await openAsBlob('phonebook.csv', {type: 'text/csv'}), 'phonebook.csv')

const res = await fetch(`${NGCP_URL}/customers/3/phonebook`, {
  method: 'POST',
  headers: {Authorization: auth},
  body: form,
})
console.log(res.status, await res.text())
```

```javascript Access Token
// Node.js 20 or later, save as upload.mjs
import {openAsBlob} from 'node:fs'

const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')}})
const {access_token} = await login.json()
const auth = `Bearer ${access_token}`

const form = new FormData()
form.append('file', await openAsBlob('phonebook.csv', {type: 'text/csv'}), 'phonebook.csv')

const res = await fetch(`${NGCP_URL}/customers/3/phonebook`, {
  method: 'POST',
  headers: {Authorization: auth},
  body: form,
})
console.log(res.status, await res.text())
```

```javascript Certificate
// Node.js 20 or later with undici (npm install undici), save as upload.mjs
import {openAsBlob, readFileSync} from 'node:fs'
import {Agent, FormData, fetch} from 'undici'

const {NGCP_URL, NGCP_CERT} = process.env
const pem = readFileSync(NGCP_CERT)
const dispatcher = new Agent({connect: {cert: pem, key: pem}})

const form = new FormData()
form.append('file', await openAsBlob('phonebook.csv', {type: 'text/csv'}), 'phonebook.csv')

const res = await fetch(`${NGCP_URL}/customers/3/phonebook`, {
  method: 'POST',
  dispatcher,
  body: form,
})
console.log(res.status, await res.text())
```

```typescript Basic Auth
// TypeScript, run with Node.js 23.6 or later: node upload.ts
import {openAsBlob} from 'node:fs'

const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env
const auth = 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')

const form = new FormData()
form.append('file', await openAsBlob('phonebook.csv', {type: 'text/csv'}), 'phonebook.csv')

const res = await fetch(`${NGCP_URL}/customers/3/phonebook`, {
  method: 'POST',
  headers: {Authorization: auth},
  body: form,
})
console.log(res.status, await res.text())
```

```typescript Access Token
// TypeScript, run with Node.js 23.6 or later: node upload.ts
import {openAsBlob} from 'node:fs'

const {NGCP_URL, NGCP_USER, NGCP_PASS} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {method: 'POST', headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64')}})
const {access_token} = await login.json() as {access_token: string}
const auth = `Bearer ${access_token}`

const form = new FormData()
form.append('file', await openAsBlob('phonebook.csv', {type: 'text/csv'}), 'phonebook.csv')

const res = await fetch(`${NGCP_URL}/customers/3/phonebook`, {
  method: 'POST',
  headers: {Authorization: auth},
  body: form,
})
console.log(res.status, await res.text())
```

```typescript Certificate
// TypeScript with undici (npm install undici), run with Node.js 23.6 or later: node upload.ts
import {openAsBlob, readFileSync} from 'node:fs'
import {Agent, FormData, fetch} from 'undici'

const {NGCP_URL, NGCP_CERT = ''} = process.env
const pem = readFileSync(NGCP_CERT)
const dispatcher = new Agent({connect: {cert: pem, key: pem}})

const form = new FormData()
form.append('file', await openAsBlob('phonebook.csv', {type: 'text/csv'}), 'phonebook.csv')

const res = await fetch(`${NGCP_URL}/customers/3/phonebook`, {
  method: 'POST',
  dispatcher,
  body: form,
})
console.log(res.status, await res.text())
```

```python Basic Auth
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
auth = (os.environ["NGCP_USER"], os.environ["NGCP_PASS"])

with open("phonebook.csv", "rb") as f:
    res = requests.post(f"{url}/customers/3/phonebook", auth=auth, files={"file": ("phonebook.csv", f, "text/csv")})
res.raise_for_status()
print(res.json())
```

```python Access Token
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
token = requests.post(f"{url}/auth/jwt", auth=(os.environ["NGCP_USER"], os.environ["NGCP_PASS"])).json()["access_token"]
auth = {"Authorization": f"Bearer {token}"}

with open("phonebook.csv", "rb") as f:
    res = requests.post(f"{url}/customers/3/phonebook", headers=auth, files={"file": ("phonebook.csv", f, "text/csv")})
res.raise_for_status()
print(res.json())
```

```python Certificate
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]
cert = os.environ["NGCP_CERT"]

with open("phonebook.csv", "rb") as f:
    res = requests.post(f"{url}/customers/3/phonebook", cert=cert, files={"file": ("phonebook.csv", f, "text/csv")})
res.raise_for_status()
print(res.json())
```

```go Basic Auth
// Go, standard library only
package main

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"os"
)

func main() {
	url := os.Getenv("NGCP_URL")
	var form bytes.Buffer
	w := multipart.NewWriter(&form)
	part, _ := w.CreatePart(textproto.MIMEHeader{
		"Content-Disposition": {`form-data; name="file"; filename="phonebook.csv"`},
		"Content-Type":        {"text/csv"},
	})
	csv, _ := os.ReadFile("phonebook.csv")
	part.Write(csv)
	w.Close()
	req, _ := http.NewRequest("POST", url+"/customers/3/phonebook", &form)
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	fmt.Println(res.Status, string(body))
}
```

```go Access Token
// Go, standard library only
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"os"
)

func main() {
	url := os.Getenv("NGCP_URL")
	login, _ := http.NewRequest("POST", url+"/auth/jwt", nil)
	login.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	out, err := http.DefaultClient.Do(login)
	if err != nil {
		panic(err)
	}
	var jwt struct {
		AccessToken string `json:"access_token"`
	}
	json.NewDecoder(out.Body).Decode(&jwt)
	out.Body.Close()

	var form bytes.Buffer
	w := multipart.NewWriter(&form)
	part, _ := w.CreatePart(textproto.MIMEHeader{
		"Content-Disposition": {`form-data; name="file"; filename="phonebook.csv"`},
		"Content-Type":        {"text/csv"},
	})
	csv, _ := os.ReadFile("phonebook.csv")
	part.Write(csv)
	w.Close()
	req, _ := http.NewRequest("POST", url+"/customers/3/phonebook", &form)
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+jwt.AccessToken)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	fmt.Println(res.Status, string(body))
}
```

```go Certificate
// Go, standard library only
package main

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"os"
)

func main() {
	url := os.Getenv("NGCP_URL")
	cert, err := tls.LoadX509KeyPair(os.Getenv("NGCP_CERT"), os.Getenv("NGCP_CERT"))
	if err != nil {
		panic(err)
	}
	client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{Certificates: []tls.Certificate{cert}}}}

	var form bytes.Buffer
	w := multipart.NewWriter(&form)
	part, _ := w.CreatePart(textproto.MIMEHeader{
		"Content-Disposition": {`form-data; name="file"; filename="phonebook.csv"`},
		"Content-Type":        {"text/csv"},
	})
	csv, _ := os.ReadFile("phonebook.csv")
	part.Write(csv)
	w.Close()
	req, _ := http.NewRequest("POST", url+"/customers/3/phonebook", &form)
	req.Header.Set("Content-Type", w.FormDataContentType())
	res, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	fmt.Println(res.Status, string(body))
}
```

```java Basic Auth
// Java 17 or later
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.util.Base64;

public class UploadPhonebook {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();
        String auth = "Basic " + Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());

        String boundary = "ngcp-" + System.nanoTime();
        String part = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"phonebook.csv\"\r\nContent-Type: text/csv\r\n\r\n";

        HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create(url + "/customers/3/phonebook"))
            .header("Authorization", auth)
            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
            .POST(HttpRequest.BodyPublishers.concat(
                HttpRequest.BodyPublishers.ofString(part),
                HttpRequest.BodyPublishers.ofFile(Path.of("phonebook.csv")),
                HttpRequest.BodyPublishers.ofString("\r\n--" + boundary + "--\r\n")))
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(res.statusCode() + " " + res.body());
    }
}
```

```java Access Token
// Java 17 or later with Jackson (com.fasterxml.jackson.core:jackson-databind)
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.util.Base64;

public class UploadPhonebook {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();
        String credentials = Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());
        HttpResponse<String> login = http.send(HttpRequest.newBuilder(URI.create(url + "/auth/jwt"))
            .header("Authorization", "Basic " + credentials)
            .POST(HttpRequest.BodyPublishers.noBody())
            .build(), HttpResponse.BodyHandlers.ofString());
        String auth = "Bearer " + new ObjectMapper().readTree(login.body()).get("access_token").asText();

        String boundary = "ngcp-" + System.nanoTime();
        String part = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"phonebook.csv\"\r\nContent-Type: text/csv\r\n\r\n";

        HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create(url + "/customers/3/phonebook"))
            .header("Authorization", auth)
            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
            .POST(HttpRequest.BodyPublishers.concat(
                HttpRequest.BodyPublishers.ofString(part),
                HttpRequest.BodyPublishers.ofFile(Path.of("phonebook.csv")),
                HttpRequest.BodyPublishers.ofString("\r\n--" + boundary + "--\r\n")))
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(res.statusCode() + " " + res.body());
    }
}
```

```java Certificate
// Java 17 or later
import java.io.FileInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.security.KeyStore;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;

public class UploadPhonebook {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        char[] password = System.getenv("NGCP_CERT_PASS").toCharArray();
        KeyStore store = KeyStore.getInstance("PKCS12");
        try (FileInputStream in = new FileInputStream(System.getenv("NGCP_CERT_P12"))) {
            store.load(in, password);
        }
        KeyManagerFactory keys = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        keys.init(store, password);
        SSLContext ssl = SSLContext.getInstance("TLS");
        ssl.init(keys.getKeyManagers(), null, null);
        HttpClient http = HttpClient.newBuilder().sslContext(ssl).build();

        String boundary = "ngcp-" + System.nanoTime();
        String part = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"phonebook.csv\"\r\nContent-Type: text/csv\r\n\r\n";

        HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create(url + "/customers/3/phonebook"))
            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
            .POST(HttpRequest.BodyPublishers.concat(
                HttpRequest.BodyPublishers.ofString(part),
                HttpRequest.BodyPublishers.ofFile(Path.of("phonebook.csv")),
                HttpRequest.BodyPublishers.ofString("\r\n--" + boundary + "--\r\n")))
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(res.statusCode() + " " + res.body());
    }
}
```

```csharp Basic Auth
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Text;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

using var form = new MultipartFormDataContent();
var file = new ByteArrayContent(await File.ReadAllBytesAsync("phonebook.csv"));
file.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
form.Add(file, "file", "phonebook.csv");
var res = await http.PostAsync($"{url}/customers/3/phonebook", form);
Console.WriteLine($"{(int)res.StatusCode} {await res.Content.ReadAsStringAsync()}");
```

```csharp Access Token
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();
var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
var login = new HttpRequestMessage(HttpMethod.Post, $"{url}/auth/jwt");
login.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
var jwt = await (await http.SendAsync(login)).Content.ReadFromJsonAsync<JsonElement>();
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt.GetProperty("access_token").GetString());

using var form = new MultipartFormDataContent();
var file = new ByteArrayContent(await File.ReadAllBytesAsync("phonebook.csv"));
file.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
form.Add(file, "file", "phonebook.csv");
var res = await http.PostAsync($"{url}/customers/3/phonebook", form);
Console.WriteLine($"{(int)res.StatusCode} {await res.Content.ReadAsStringAsync()}");
```

```csharp Certificate
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Security.Cryptography.X509Certificates;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var handler = new HttpClientHandler();
handler.ClientCertificates.Add(X509Certificate2.CreateFromPemFile(Environment.GetEnvironmentVariable("NGCP_CERT")!));
var http = new HttpClient(handler);

using var form = new MultipartFormDataContent();
var file = new ByteArrayContent(await File.ReadAllBytesAsync("phonebook.csv"));
file.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
form.Add(file, "file", "phonebook.csv");
var res = await http.PostAsync($"{url}/customers/3/phonebook", form);
Console.WriteLine($"{(int)res.StatusCode} {await res.Content.ReadAsStringAsync()}");
```

```rust Basic Auth
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "multipart"] }
use reqwest::blocking::{multipart, Client};
use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();

    let form = multipart::Form::new().part("file", multipart::Part::file("phonebook.csv")?.mime_str("text/csv")?);
    let res = http
        .post(format!("{url}/customers/3/phonebook"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .multipart(form)
        .send()?;
    println!("{} {}", res.status(), res.text()?);
    Ok(())
}
```

```rust Access Token
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "json", "multipart"] }, serde_json = "1"
use reqwest::blocking::{multipart, Client};
use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();
    let jwt: serde_json::Value = http
        .post(format!("{url}/auth/jwt"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .send()?
        .json()?;
    let token = jwt["access_token"].as_str().unwrap_or_default();

    let form = multipart::Form::new().part("file", multipart::Part::file("phonebook.csv")?.mime_str("text/csv")?);
    let res = http
        .post(format!("{url}/customers/3/phonebook"))
        .bearer_auth(token)
        .multipart(form)
        .send()?;
    println!("{} {}", res.status(), res.text()?);
    Ok(())
}
```

```rust Certificate
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "multipart", "native-tls"] }
use reqwest::blocking::{multipart, Client};
use reqwest::Identity;
use std::{env, fs};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let p12 = fs::read(env::var("NGCP_CERT_P12")?)?;
    let http = Client::builder().identity(Identity::from_pkcs12_der(&p12, &env::var("NGCP_CERT_PASS")?)?).build()?;

    let form = multipart::Form::new().part("file", multipart::Part::file("phonebook.csv")?.mime_str("text/csv")?);
    let res = http
        .post(format!("{url}/customers/3/phonebook"))
        .multipart(form)
        .send()?;
    println!("{} {}", res.status(), res.text()?);
    Ok(())
}
```

```c Basic Auth
/* libcurl: cc upload.c -o upload -lcurl */
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>

int main(void)
{
    char url[512], userpwd[256];
    CURL *curl = curl_easy_init();
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);

    curl_mime *form = curl_mime_init(curl);
    curl_mimepart *part = curl_mime_addpart(form);
    curl_mime_name(part, "file");
    curl_mime_filedata(part, "phonebook.csv");
    curl_mime_type(part, "text/csv");
    snprintf(url, sizeof url, "%s/customers/3/phonebook", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_MIMEPOST, form);
    CURLcode rc = curl_easy_perform(curl);  /* writes the response body to stdout */
    if (rc != CURLE_OK)
        fprintf(stderr, "%s\n", curl_easy_strerror(rc));

    curl_mime_free(form);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```c Access Token
/* libcurl and cJSON: cc upload.c -o upload -lcurl -lcjson */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include <cjson/cJSON.h>

/* appends the response body to the buffer */
static size_t save(char *data, size_t size, size_t n, void *body)
{
    size_t room = 4095 - strlen(body);
    strncat(body, data, size * n < room ? size * n : room);
    return size * n;
}

int main(void)
{
    char url[512], userpwd[256], body[4096] = "";
    CURL *curl = curl_easy_init();
    snprintf(url, sizeof url, "%s/auth/jwt", getenv("NGCP_URL"));
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, body);
    curl_easy_perform(curl);
    cJSON *jwt = cJSON_Parse(body);
    curl_easy_reset(curl);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, cJSON_GetObjectItem(jwt, "access_token")->valuestring);
    cJSON_Delete(jwt);

    curl_mime *form = curl_mime_init(curl);
    curl_mimepart *part = curl_mime_addpart(form);
    curl_mime_name(part, "file");
    curl_mime_filedata(part, "phonebook.csv");
    curl_mime_type(part, "text/csv");
    snprintf(url, sizeof url, "%s/customers/3/phonebook", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_MIMEPOST, form);
    CURLcode rc = curl_easy_perform(curl);  /* writes the response body to stdout */
    if (rc != CURLE_OK)
        fprintf(stderr, "%s\n", curl_easy_strerror(rc));

    curl_mime_free(form);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```c Certificate
/* libcurl: cc upload.c -o upload -lcurl */
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>

int main(void)
{
    char url[512];
    CURL *curl = curl_easy_init();
    curl_easy_setopt(curl, CURLOPT_SSLCERT, getenv("NGCP_CERT"));
    curl_easy_setopt(curl, CURLOPT_SSLKEY, getenv("NGCP_CERT"));

    curl_mime *form = curl_mime_init(curl);
    curl_mimepart *part = curl_mime_addpart(form);
    curl_mime_name(part, "file");
    curl_mime_filedata(part, "phonebook.csv");
    curl_mime_type(part, "text/csv");
    snprintf(url, sizeof url, "%s/customers/3/phonebook", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_MIMEPOST, form);
    CURLcode rc = curl_easy_perform(curl);  /* writes the response body to stdout */
    if (rc != CURLE_OK)
        fprintf(stderr, "%s\n", curl_easy_strerror(rc));

    curl_mime_free(form);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```cpp Basic Auth
// libcurl: c++ -std=c++17 upload.cpp -o upload -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>

int main()
{
    std::string url = std::getenv("NGCP_URL");
    CURL* curl = curl_easy_init();
    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());

    curl_mime* form = curl_mime_init(curl);
    curl_mimepart* part = curl_mime_addpart(form);
    curl_mime_name(part, "file");
    curl_mime_filedata(part, "phonebook.csv");
    curl_mime_type(part, "text/csv");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customers/3/phonebook").c_str());
    curl_easy_setopt(curl, CURLOPT_MIMEPOST, form);
    CURLcode rc = curl_easy_perform(curl);  // writes the response body to stdout
    if (rc != CURLE_OK)
        std::cerr << curl_easy_strerror(rc) << '\n';

    curl_mime_free(form);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```cpp Access Token
// libcurl and nlohmann/json: c++ -std=c++17 upload.cpp -o upload -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

// appends the response body to a std::string
static size_t save(char* data, size_t size, size_t n, void* body)
{
    static_cast<std::string*>(body)->append(data, size * n);
    return size * n;
}

int main()
{
    std::string url = std::getenv("NGCP_URL"), body;
    CURL* curl = curl_easy_init();
    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/auth/jwt").c_str());
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
    curl_easy_perform(curl);
    std::string token = nlohmann::json::parse(body)["access_token"];
    body.clear();
    curl_easy_reset(curl);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, token.c_str());

    curl_mime* form = curl_mime_init(curl);
    curl_mimepart* part = curl_mime_addpart(form);
    curl_mime_name(part, "file");
    curl_mime_filedata(part, "phonebook.csv");
    curl_mime_type(part, "text/csv");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customers/3/phonebook").c_str());
    curl_easy_setopt(curl, CURLOPT_MIMEPOST, form);
    CURLcode rc = curl_easy_perform(curl);  // writes the response body to stdout
    if (rc != CURLE_OK)
        std::cerr << curl_easy_strerror(rc) << '\n';

    curl_mime_free(form);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```cpp Certificate
// libcurl: c++ -std=c++17 upload.cpp -o upload -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>

int main()
{
    std::string url = std::getenv("NGCP_URL");
    CURL* curl = curl_easy_init();
    curl_easy_setopt(curl, CURLOPT_SSLCERT, std::getenv("NGCP_CERT"));
    curl_easy_setopt(curl, CURLOPT_SSLKEY, std::getenv("NGCP_CERT"));

    curl_mime* form = curl_mime_init(curl);
    curl_mimepart* part = curl_mime_addpart(form);
    curl_mime_name(part, "file");
    curl_mime_filedata(part, "phonebook.csv");
    curl_mime_type(part, "text/csv");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customers/3/phonebook").c_str());
    curl_easy_setopt(curl, CURLOPT_MIMEPOST, form);
    CURLcode rc = curl_easy_perform(curl);  // writes the response body to stdout
    if (rc != CURLE_OK)
        std::cerr << curl_easy_strerror(rc) << '\n';

    curl_mime_free(form);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```perl Basic Auth
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;
$ua->default_headers->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});

my $res = $ua->post("$ENV{NGCP_URL}/customers/3/phonebook", Content_Type => 'form-data',
    Content => [file => ['phonebook.csv', 'phonebook.csv', 'Content-Type' => 'text/csv']]);
print $res->code, ' ', $res->content, "\n";
```

```perl Access Token
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use JSON::PP qw(decode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;
my $login = HTTP::Request->new(POST => "$ENV{NGCP_URL}/auth/jwt");
$login->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});
my $token = decode_json($ua->request($login)->content)->{access_token};
$ua->default_header(Authorization => "Bearer $token");

my $res = $ua->post("$ENV{NGCP_URL}/customers/3/phonebook", Content_Type => 'form-data',
    Content => [file => ['phonebook.csv', 'phonebook.csv', 'Content-Type' => 'text/csv']]);
print $res->code, ' ', $res->content, "\n";
```

```perl Certificate
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use LWP::UserAgent;

my $ua = LWP::UserAgent->new(ssl_opts => {SSL_cert_file => $ENV{NGCP_CERT}, SSL_key_file => $ENV{NGCP_CERT}});

my $res = $ua->post("$ENV{NGCP_URL}/customers/3/phonebook", Content_Type => 'form-data',
    Content => [file => ['phonebook.csv', 'phonebook.csv', 'Content-Type' => 'text/csv']]);
print $res->code, ' ', $res->content, "\n";
```

```elixir Basic Auth
# Elixir with Req, run with: elixir upload.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

req = Req.new(base_url: url, auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")})

res =
  Req.post!(req, url: "/customers/3/phonebook",
    form_multipart: [file: {File.read!("phonebook.csv"), filename: "phonebook.csv", content_type: "text/csv"}]
  )

IO.inspect({res.status, res.body})
```

```elixir Access Token
# Elixir with Req, run with: elixir upload.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

%{body: %{"access_token" => token}} =
  Req.post!("#{url}/auth/jwt", auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")})

req = Req.new(base_url: url, auth: {:bearer, token})

res =
  Req.post!(req, url: "/customers/3/phonebook",
    form_multipart: [file: {File.read!("phonebook.csv"), filename: "phonebook.csv", content_type: "text/csv"}]
  )

IO.inspect({res.status, res.body})
```

```elixir Certificate
# Elixir with Req, run with: elixir upload.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

req = Req.new(base_url: url, connect_options: [transport_opts: [certfile: System.fetch_env!("NGCP_CERT"), keyfile: System.fetch_env!("NGCP_CERT")]])

res =
  Req.post!(req, url: "/customers/3/phonebook",
    form_multipart: [file: {File.read!("phonebook.csv"), filename: "phonebook.csv", content_type: "text/csv"}]
  )

IO.inspect({res.status, res.body})
```

### Usare un Auth Token

Un job pianificato che non deve memorizzare una password scambia l'Auth Token in `NGCP_TOKEN` con un Access Token valido per dieci minuti, quindi crea più contatti con un'unica richiesta. `Prefer: return=id` fa sì che la risposta contenga i nuovi id.

```shell
# curl and jq
token=$(curl -sS --fail-with-body -X POST -H "Authorization: Bearer $NGCP_TOKEN" \
  -H 'Content-Type: application/json' -d '{"expires_in": 600}' "$NGCP_URL/auth/jwt" | jq -r .access_token)

curl -sS --fail-with-body -X POST -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' -H 'Prefer: return=id' \
  -d '[{"reseller_id": 1, "email": "alice@example.com", "status": "active"},
       {"reseller_id": 1, "email": "bob@example.com", "status": "active"}]' \
  "$NGCP_URL/customercontacts"
```

```javascript
// Node.js 18 or later, save as import.mjs
const {NGCP_URL, NGCP_TOKEN} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {
  method: 'POST',
  headers: {Authorization: `Bearer ${NGCP_TOKEN}`, 'Content-Type': 'application/json'},
  body: JSON.stringify({expires_in: 600}),
})
const {access_token} = await login.json()

const res = await fetch(`${NGCP_URL}/customercontacts`, {
  method: 'POST',
  headers: {Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json', Prefer: 'return=id'},
  body: JSON.stringify([
    {reseller_id: 1, email: 'alice@example.com', status: 'active'},
    {reseller_id: 1, email: 'bob@example.com', status: 'active'},
  ]),
})
console.log(res.status, await res.text())
```

```typescript
// TypeScript, run with Node.js 23.6 or later: node import.ts
const {NGCP_URL, NGCP_TOKEN} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {
  method: 'POST',
  headers: {Authorization: `Bearer ${NGCP_TOKEN}`, 'Content-Type': 'application/json'},
  body: JSON.stringify({expires_in: 600}),
})
const {access_token} = await login.json() as {access_token: string}

const res = await fetch(`${NGCP_URL}/customercontacts`, {
  method: 'POST',
  headers: {Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json', Prefer: 'return=id'},
  body: JSON.stringify([
    {reseller_id: 1, email: 'alice@example.com', status: 'active'},
    {reseller_id: 1, email: 'bob@example.com', status: 'active'},
  ]),
})
console.log(res.status, await res.text())
```

```python
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]

res = requests.post(f"{url}/auth/jwt", json={"expires_in": 600},
                    headers={"Authorization": f"Bearer {os.environ['NGCP_TOKEN']}"})
res.raise_for_status()
token = res.json()["access_token"]

res = requests.post(f"{url}/customercontacts", headers={"Authorization": f"Bearer {token}", "Prefer": "return=id"}, json=[
    {"reseller_id": 1, "email": "alice@example.com", "status": "active"},
    {"reseller_id": 1, "email": "bob@example.com", "status": "active"},
])
res.raise_for_status()
print(res.json())
```

```go
// Go, standard library only
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

func main() {
	url := os.Getenv("NGCP_URL")

	req, _ := http.NewRequest("POST", url+"/auth/jwt", strings.NewReader(`{"expires_in": 600}`))
	req.Header.Set("Authorization", "Bearer "+os.Getenv("NGCP_TOKEN"))
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	var jwt struct {
		AccessToken string `json:"access_token"`
	}
	json.NewDecoder(res.Body).Decode(&jwt)
	res.Body.Close()

	req, _ = http.NewRequest("POST", url+"/customercontacts", strings.NewReader(`[
		{"reseller_id": 1, "email": "alice@example.com", "status": "active"},
		{"reseller_id": 1, "email": "bob@example.com", "status": "active"}
	]`))
	req.Header.Set("Authorization", "Bearer "+jwt.AccessToken)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=id")
	res, err = http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	fmt.Println(res.Status, string(body))
}
```

```java
// Java 17 or later with Jackson (com.fasterxml.jackson.core:jackson-databind)
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ImportContacts {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();

        HttpResponse<String> login = http.send(HttpRequest.newBuilder(URI.create(url + "/auth/jwt"))
            .header("Authorization", "Bearer " + System.getenv("NGCP_TOKEN"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString("{\"expires_in\": 600}"))
            .build(), HttpResponse.BodyHandlers.ofString());
        String token = new ObjectMapper().readTree(login.body()).get("access_token").asText();

        HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create(url + "/customercontacts"))
            .header("Authorization", "Bearer " + token)
            .header("Content-Type", "application/json")
            .header("Prefer", "return=id")
            .POST(HttpRequest.BodyPublishers.ofString("""
                [{"reseller_id": 1, "email": "alice@example.com", "status": "active"},
                 {"reseller_id": 1, "email": "bob@example.com", "status": "active"}]"""))
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(res.statusCode() + " " + res.body());
    }
}
```

```csharp
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();

var login = new HttpRequestMessage(HttpMethod.Post, $"{url}/auth/jwt") { Content = JsonContent.Create(new { expires_in = 600 }) };
login.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Environment.GetEnvironmentVariable("NGCP_TOKEN"));
var jwt = await (await http.SendAsync(login)).Content.ReadFromJsonAsync<JsonElement>();
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt.GetProperty("access_token").GetString());
http.DefaultRequestHeaders.Add("Prefer", "return=id");

var res = await http.PostAsJsonAsync($"{url}/customercontacts", new[] {
    new { reseller_id = 1, email = "alice@example.com", status = "active" },
    new { reseller_id = 1, email = "bob@example.com", status = "active" },
});
Console.WriteLine($"{(int)res.StatusCode} {await res.Content.ReadAsStringAsync()}");
```

```rust
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "json"] }, serde_json = "1"
use reqwest::blocking::Client;
use serde_json::{json, Value};
use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();

    let jwt: Value = http
        .post(format!("{url}/auth/jwt"))
        .bearer_auth(env::var("NGCP_TOKEN")?)
        .json(&json!({"expires_in": 600}))
        .send()?
        .error_for_status()?
        .json()?;

    let res = http
        .post(format!("{url}/customercontacts"))
        .bearer_auth(jwt["access_token"].as_str().unwrap_or_default())
        .header("Prefer", "return=id")
        .json(&json!([
            {"reseller_id": 1, "email": "alice@example.com", "status": "active"},
            {"reseller_id": 1, "email": "bob@example.com", "status": "active"}
        ]))
        .send()?;
    println!("{} {}", res.status(), res.text()?);
    Ok(())
}
```

```c
/* libcurl and cJSON: cc import.c -o import -lcurl -lcjson */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include <cjson/cJSON.h>

/* appends the response body to the buffer */
static size_t save(char *data, size_t size, size_t n, void *body)
{
    size_t room = 4095 - strlen(body);
    strncat(body, data, size * n < room ? size * n : room);
    return size * n;
}

int main(void)
{
    char url[512], auth[2048], body[4096] = "";
    CURL *curl = curl_easy_init();

    struct curl_slist *headers = curl_slist_append(NULL, "Content-Type: application/json");
    snprintf(auth, sizeof auth, "Authorization: Bearer %s", getenv("NGCP_TOKEN"));
    headers = curl_slist_append(headers, auth);
    snprintf(url, sizeof url, "%s/auth/jwt", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "{\"expires_in\": 600}");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, body);
    curl_easy_perform(curl);
    cJSON *jwt = cJSON_Parse(body);
    curl_slist_free_all(headers);
    curl_easy_reset(curl);

    headers = curl_slist_append(NULL, "Content-Type: application/json");
    headers = curl_slist_append(headers, "Prefer: return=id");
    snprintf(url, sizeof url, "%s/customercontacts", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, cJSON_GetObjectItem(jwt, "access_token")->valuestring);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS,
        "[{\"reseller_id\": 1, \"email\": \"alice@example.com\", \"status\": \"active\"},"
        " {\"reseller_id\": 1, \"email\": \"bob@example.com\", \"status\": \"active\"}]");
    CURLcode rc = curl_easy_perform(curl);  /* writes the response body to stdout */

    cJSON_Delete(jwt);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```cpp
// libcurl and nlohmann/json: c++ -std=c++17 import.cpp -o import -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

// appends the response body to a std::string
static size_t save(char* data, size_t size, size_t n, void* body)
{
    static_cast<std::string*>(body)->append(data, size * n);
    return size * n;
}

int main()
{
    std::string url = std::getenv("NGCP_URL"), body;
    CURL* curl = curl_easy_init();

    curl_slist* headers = curl_slist_append(nullptr, "Content-Type: application/json");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/auth/jwt").c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, std::getenv("NGCP_TOKEN"));
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, R"({"expires_in": 600})");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
    curl_easy_perform(curl);
    std::string token = nlohmann::json::parse(body)["access_token"];

    body.clear();
    headers = curl_slist_append(headers, "Prefer: return=id");
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/customercontacts").c_str());
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, token.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, R"([
        {"reseller_id": 1, "email": "alice@example.com", "status": "active"},
        {"reseller_id": 1, "email": "bob@example.com", "status": "active"}])");
    curl_easy_perform(curl);
    std::cout << body << '\n';

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
}
```

```perl
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use JSON::PP qw(decode_json encode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;

my $res = $ua->post("$ENV{NGCP_URL}/auth/jwt",
    Authorization  => "Bearer $ENV{NGCP_TOKEN}",
    'Content-Type' => 'application/json',
    Content        => encode_json({expires_in => 600}));
my $token = decode_json($res->content)->{access_token};

$res = $ua->post("$ENV{NGCP_URL}/customercontacts",
    Authorization  => "Bearer $token",
    'Content-Type' => 'application/json',
    Prefer         => 'return=id',
    Content        => encode_json([
        {reseller_id => 1, email => 'alice@example.com', status => 'active'},
        {reseller_id => 1, email => 'bob@example.com', status => 'active'},
    ]));
print $res->code, ' ', $res->content, "\n";
```

```elixir
# Elixir with Req, run with: elixir import.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

%{body: %{"access_token" => token}} =
  Req.post!("#{url}/auth/jwt", auth: {:bearer, System.fetch_env!("NGCP_TOKEN")}, json: %{expires_in: 600})

res =
  Req.post!("#{url}/customercontacts",
    auth: {:bearer, token},
    headers: [prefer: "return=id"],
    json: [
      %{reseller_id: 1, email: "alice@example.com", status: "active"},
      %{reseller_id: 1, email: "bob@example.com", status: "active"}
    ]
  )

IO.inspect({res.status, res.body})
```

### 2FA OTP

Un utente con autenticazione a due fattori ottiene l'Access Token con la password e il codice attuale dell'app di autenticazione in `X-TOTP`, qui da `NGCP_OTP`, poi chiama `GET /auth/userinfo` con esso. Solo questa richiesta richiede il codice; Autenticazione (2FA) descrive la configurazione e gli errori.

```shell
# curl and jq
token=$(curl -sS --fail-with-body -u "$NGCP_USER:$NGCP_PASS" -H "X-TOTP: $NGCP_OTP" -X POST \
  "$NGCP_URL/auth/jwt" | jq -r .access_token)

curl -sS --fail-with-body -H "Authorization: Bearer $token" "$NGCP_URL/auth/userinfo"
```

```javascript
// Node.js 18 or later, save as otp.mjs
const {NGCP_URL, NGCP_USER, NGCP_PASS, NGCP_OTP} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {
  method: 'POST',
  headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64'), 'X-TOTP': NGCP_OTP},
})
const {access_token} = await login.json()

const res = await fetch(`${NGCP_URL}/auth/userinfo`, {headers: {Authorization: `Bearer ${access_token}`}})
console.log(res.status, await res.text())
```

```typescript
// TypeScript, run with Node.js 23.6 or later: node otp.ts
const {NGCP_URL, NGCP_USER, NGCP_PASS, NGCP_OTP} = process.env

const login = await fetch(`${NGCP_URL}/auth/jwt`, {
  method: 'POST',
  headers: {Authorization: 'Basic ' + Buffer.from(`${NGCP_USER}:${NGCP_PASS}`).toString('base64'), 'X-TOTP': NGCP_OTP ?? ''},
})
const {access_token} = await login.json() as {access_token: string}

const res = await fetch(`${NGCP_URL}/auth/userinfo`, {headers: {Authorization: `Bearer ${access_token}`}})
console.log(res.status, await res.text())
```

```python
# Python 3 with requests
import os

import requests

url = os.environ["NGCP_URL"]

res = requests.post(f"{url}/auth/jwt", auth=(os.environ["NGCP_USER"], os.environ["NGCP_PASS"]),
                    headers={"X-TOTP": os.environ["NGCP_OTP"]})
res.raise_for_status()
token = res.json()["access_token"]

res = requests.get(f"{url}/auth/userinfo", headers={"Authorization": f"Bearer {token}"})
res.raise_for_status()
print(res.json())
```

```go
// Go, standard library only
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	url := os.Getenv("NGCP_URL")

	login, _ := http.NewRequest("POST", url+"/auth/jwt", nil)
	login.SetBasicAuth(os.Getenv("NGCP_USER"), os.Getenv("NGCP_PASS"))
	login.Header.Set("X-TOTP", os.Getenv("NGCP_OTP"))
	out, err := http.DefaultClient.Do(login)
	if err != nil {
		panic(err)
	}
	var jwt struct {
		AccessToken string `json:"access_token"`
	}
	json.NewDecoder(out.Body).Decode(&jwt)
	out.Body.Close()

	req, _ := http.NewRequest("GET", url+"/auth/userinfo", nil)
	req.Header.Set("Authorization", "Bearer "+jwt.AccessToken)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	fmt.Println(res.Status, string(body))
}
```

```java
// Java 17 or later with Jackson (com.fasterxml.jackson.core:jackson-databind)
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

public class OtpLogin {
    public static void main(String[] args) throws Exception {
        String url = System.getenv("NGCP_URL");
        HttpClient http = HttpClient.newHttpClient();

        String credentials = Base64.getEncoder().encodeToString((System.getenv("NGCP_USER") + ":" + System.getenv("NGCP_PASS")).getBytes());
        HttpResponse<String> login = http.send(HttpRequest.newBuilder(URI.create(url + "/auth/jwt"))
            .header("Authorization", "Basic " + credentials)
            .header("X-TOTP", System.getenv("NGCP_OTP"))
            .POST(HttpRequest.BodyPublishers.noBody())
            .build(), HttpResponse.BodyHandlers.ofString());
        String token = new ObjectMapper().readTree(login.body()).get("access_token").asText();

        HttpResponse<String> res = http.send(HttpRequest.newBuilder(URI.create(url + "/auth/userinfo"))
            .header("Authorization", "Bearer " + token)
            .build(), HttpResponse.BodyHandlers.ofString());
        System.out.println(res.statusCode() + " " + res.body());
    }
}
```

```csharp
// .NET 8, no extra packages
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

var url = Environment.GetEnvironmentVariable("NGCP_URL");
var http = new HttpClient();

var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes(
    $"{Environment.GetEnvironmentVariable("NGCP_USER")}:{Environment.GetEnvironmentVariable("NGCP_PASS")}"));
var login = new HttpRequestMessage(HttpMethod.Post, $"{url}/auth/jwt");
login.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
login.Headers.Add("X-TOTP", Environment.GetEnvironmentVariable("NGCP_OTP"));
var jwt = await (await http.SendAsync(login)).Content.ReadFromJsonAsync<JsonElement>();
http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt.GetProperty("access_token").GetString());

var res = await http.GetAsync($"{url}/auth/userinfo");
Console.WriteLine($"{(int)res.StatusCode} {await res.Content.ReadAsStringAsync()}");
```

```rust
// Cargo.toml: reqwest = { version = "0.12", features = ["blocking", "json"] }, serde_json = "1"
use reqwest::blocking::Client;
use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = env::var("NGCP_URL")?;
    let http = Client::new();

    let jwt: serde_json::Value = http
        .post(format!("{url}/auth/jwt"))
        .basic_auth(env::var("NGCP_USER")?, Some(env::var("NGCP_PASS")?))
        .header("X-TOTP", env::var("NGCP_OTP")?)
        .send()?
        .error_for_status()?
        .json()?;

    let res = http
        .get(format!("{url}/auth/userinfo"))
        .bearer_auth(jwt["access_token"].as_str().unwrap_or_default())
        .send()?;
    println!("{} {}", res.status(), res.text()?);
    Ok(())
}
```

```c
/* libcurl and cJSON: cc otp.c -o otp -lcurl -lcjson */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include <cjson/cJSON.h>

/* appends the response body to the buffer */
static size_t save(char *data, size_t size, size_t n, void *body)
{
    size_t room = 4095 - strlen(body);
    strncat(body, data, size * n < room ? size * n : room);
    return size * n;
}

int main(void)
{
    char url[512], userpwd[256], otp[64], body[4096] = "";
    CURL *curl = curl_easy_init();

    snprintf(url, sizeof url, "%s/auth/jwt", getenv("NGCP_URL"));
    snprintf(userpwd, sizeof userpwd, "%s:%s", getenv("NGCP_USER"), getenv("NGCP_PASS"));
    snprintf(otp, sizeof otp, "X-TOTP: %s", getenv("NGCP_OTP"));
    struct curl_slist *headers = curl_slist_append(NULL, otp);
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, body);
    curl_easy_perform(curl);
    cJSON *jwt = cJSON_Parse(body);
    curl_slist_free_all(headers);
    curl_easy_reset(curl);

    snprintf(url, sizeof url, "%s/auth/userinfo", getenv("NGCP_URL"));
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, cJSON_GetObjectItem(jwt, "access_token")->valuestring);
    CURLcode rc = curl_easy_perform(curl);  /* writes the response body to stdout */
    if (rc != CURLE_OK)
        fprintf(stderr, "%s\n", curl_easy_strerror(rc));

    cJSON_Delete(jwt);
    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```cpp
// libcurl and nlohmann/json: c++ -std=c++17 otp.cpp -o otp -lcurl
#include <cstdlib>
#include <iostream>
#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

// appends the response body to a std::string
static size_t save(char* data, size_t size, size_t n, void* body)
{
    static_cast<std::string*>(body)->append(data, size * n);
    return size * n;
}

int main()
{
    std::string url = std::getenv("NGCP_URL"), body;
    CURL* curl = curl_easy_init();

    std::string userpwd = std::string(std::getenv("NGCP_USER")) + ":" + std::getenv("NGCP_PASS");
    std::string otp = std::string("X-TOTP: ") + std::getenv("NGCP_OTP");
    curl_slist* headers = curl_slist_append(nullptr, otp.c_str());
    curl_easy_setopt(curl, CURLOPT_URL, (url + "/auth/jwt").c_str());
    curl_easy_setopt(curl, CURLOPT_USERPWD, userpwd.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, save);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
    curl_easy_perform(curl);
    std::string token = nlohmann::json::parse(body)["access_token"];
    curl_slist_free_all(headers);
    curl_easy_reset(curl);

    curl_easy_setopt(curl, CURLOPT_URL, (url + "/auth/userinfo").c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BEARER);
    curl_easy_setopt(curl, CURLOPT_XOAUTH2_BEARER, token.c_str());
    CURLcode rc = curl_easy_perform(curl);  // writes the response body to stdout
    if (rc != CURLE_OK)
        std::cerr << curl_easy_strerror(rc) << '\n';

    curl_easy_cleanup(curl);
    return rc != CURLE_OK;
}
```

```perl
# Perl with LWP::UserAgent and LWP::Protocol::https
use strict;
use warnings;
use HTTP::Request;
use JSON::PP qw(decode_json);
use LWP::UserAgent;

my $ua = LWP::UserAgent->new;

my $login = HTTP::Request->new(POST => "$ENV{NGCP_URL}/auth/jwt");
$login->authorization_basic($ENV{NGCP_USER}, $ENV{NGCP_PASS});
$login->header('X-TOTP' => $ENV{NGCP_OTP});
my $token = decode_json($ua->request($login)->content)->{access_token};

my $res = $ua->get("$ENV{NGCP_URL}/auth/userinfo", Authorization => "Bearer $token");
print $res->code, ' ', $res->content, "\n";
```

```elixir
# Elixir with Req, run with: elixir otp.exs
Mix.install([{:req, "~> 0.5"}])

url = System.fetch_env!("NGCP_URL")

%{body: %{"access_token" => token}} =
  Req.post!("#{url}/auth/jwt",
    auth: {:basic, System.fetch_env!("NGCP_USER") <> ":" <> System.fetch_env!("NGCP_PASS")},
    headers: %{"x-totp" => System.fetch_env!("NGCP_OTP")}
  )

res = Req.get!("#{url}/auth/userinfo", auth: {:bearer, token})

IO.inspect({res.status, res.body})
```
