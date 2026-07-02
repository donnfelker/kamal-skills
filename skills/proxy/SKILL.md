---
name: proxy
description: Configure and operate kamal-proxy, the reverse proxy that gives Kamal zero-downtime deploys on ports 80 and 443. Use when the user wants to route a domain (host/hosts), enable automatic HTTPS via Let's Encrypt (ssl), point the proxy at their app's port (app_port), tune the deploy healthcheck (/up), or adjust response_timeout and buffering — and when they say things like "configure the kamal proxy," "set up SSL for my domain," "add my custom domain," "the proxy isn't routing," "reboot the proxy," "upgrade kamal-proxy," or run kamal proxy boot/reboot/start/stop/details/logs. Covers the proxy config block and the kamal proxy command. For full deploys, see deploy. For enabling the proxy per role, see servers. For starting and stopping the app container, see app. For migrating from Kamal 1.x to kamal-proxy, see upgrade.
metadata:
  version: 1.0.0
---

# kamal-proxy

You are an expert in deploying applications with Kamal. Your job is to configure and operate **kamal-proxy** so the user's app serves traffic with gapless, zero-downtime deploys.

## How kamal-proxy works

Kamal uses [kamal-proxy](https://github.com/basecamp/kamal-proxy) to provide gapless deployments. It runs on ports **80** and **443** and forwards requests to the application container.

You configure it in the root configuration under `proxy`. These options are set **when deploying the application**, not when booting the proxy. They are application-specific, so they are not shared when multiple applications run on the same proxy.

During a deploy, Kamal:

1. Ensures kamal-proxy is running and accepting traffic on ports 80 and 443.
2. Starts a new container with the new version of the app.
3. Tells kamal-proxy to route traffic to the new container once it responds with `200 OK` to `GET /up`.
4. Stops the old container.

Because routing only switches after the new container passes its healthcheck, getting `proxy` right is what makes deploys seamless.

## Before you configure

Read the user's existing setup before asking questions:

- **`config/deploy.yml`** — look for an existing `proxy:` block and the `servers:` roles so you know what is already set.
- **`.kamal/secrets`** — needed only if you are loading a custom SSL certificate from secrets (see step 3).

If there is no `proxy:` block yet, you are starting from a clean slate and only need to add the keys the user actually wants.

## Walkthrough: configure the proxy

All of the following keys live under a single `proxy:` block in `config/deploy.yml`.

### 1. Route your domain with `host`

The hosts that will be used to serve the app. The proxy only routes requests for these hosts to your app. Specify one of `host` or `hosts`.

```yaml
proxy:
  host: app.example.com
```

For multiple domains, use `hosts`:

```yaml
proxy:
  hosts:
    - app.example.com
    - www.example.com
```

If no hosts are set, all requests are forwarded to the app, **except** requests matching other apps deployed on that server that do have a host set.

### 2. Point at your app's port with `app_port`

The port the application container is exposed on. Defaults to `80`. Set it to match the port your app listens on inside the container:

```yaml
proxy:
  app_port: 3000
```

### 3. Turn on HTTPS with `ssl`

kamal-proxy can provide automatic HTTPS via Let's Encrypt. Defaults to `false`.

```yaml
proxy:
  host: app.example.com
  ssl: true
```

Automatic SSL has requirements:

- You must be deploying to **one server**, and the `host` option must be set.
- The `host` value must point to the server you are deploying to.
- Port **443** must be open for the Let's Encrypt challenge to succeed.
- The host's DNS must resolve **directly to the server** during issuance. If it is
  proxied through a CDN (Cloudflare's **orange cloud**, etc.), the Let's Encrypt HTTP-01
  challenge reaches the CDN instead of kamal-proxy and issuance fails or loops. Point an
  **A record at the server IP in "DNS only" (grey cloud)** mode — not a CNAME to the CDN.
  kamal-proxy also **auto-renews** the certificate using the same HTTP-01 challenge, so the
  record must **stay** grey-cloud the whole time `ssl: true` is set — re-enabling the orange
  cloud later silently breaks renewal ~60 days on. To keep a CDN in front permanently, stop
  using Let's Encrypt and load a CDN origin certificate via the custom
  `certificate_pem`/`private_key_pem` block below.

When `ssl: true`, kamal-proxy **stops forwarding headers** to your app unless you explicitly set `forward_headers: true`. By default, kamal-proxy will not forward the `X-Forwarded-For` and `X-Forwarded-Proto` headers when `ssl` is `true`, and will forward them when `ssl` is `false`. Set `forward_headers: true` if you are behind a trusted proxy and your app needs those headers.

By default, kamal-proxy redirects all HTTP requests to HTTPS when SSL is enabled. To pass HTTP traffic through to your app alongside HTTPS, set `ssl_redirect: false`.

**Custom certificate instead of Let's Encrypt:** If you can't use Let's Encrypt — for example, you deploy from more than one host, or you already have a certificate from another CA — load the certificate from secrets by mapping `certificate_pem` and `private_key_pem` to secret names:

```yaml
proxy:
  ssl:
    certificate_pem: CERTIFICATE_PEM
    private_key_pem: PRIVATE_KEY_PEM
```

Those names reference entries in `.kamal/secrets`. If the certificate or key is missing or invalid, **deployments will fail**. Never hard-code certificates or private keys in source control.

### 4. Tune the deploy healthcheck

When deploying, the proxy hits `/up` once every second until the deploy timeout, with a 5-second timeout for each request. Once the app is up, the proxy stops hitting the healthcheck endpoint. Override any of these:

```yaml
proxy:
  healthcheck:
    path: /health
    interval: 3
    timeout: 3
```

| Key | What it sets | Default |
|-----|--------------|---------|
| `path` | Endpoint the proxy checks | `/up` |
| `interval` | Seconds between checks | `1` |
| `timeout` | Seconds to wait per check | `5` |

### 5. Set the response timeout and buffering

**Response timeout** — how long to wait for requests to complete before timing out. Defaults to **30 seconds**:

```yaml
proxy:
  response_timeout: 10
```

**Buffering** — whether to buffer request and response bodies in the proxy. By default, buffering is enabled with a max request body size of 1GB and no limit for response size. The memory limit defaults to 1MB; anything larger is written to disk.

```yaml
proxy:
  buffering:
    requests: true
    responses: true
    max_request_body: 40_000_000
    max_response_body: 0
    memory: 2_000_000
```

### A complete example

```yaml
proxy:
  host: app.example.com
  app_port: 3000
  ssl: true
  healthcheck:
    path: /up
    interval: 3
    timeout: 3
  response_timeout: 10
```

### Apply your changes

Proxy options are applied **at deploy time**. After editing the `proxy:` block, run a deploy to push the new configuration:

```bash
kamal deploy
```

For more proxy keys — path-based routing (`path_prefix`, `path_prefixes`, `strip_path_prefix`), request logging, and the full `run` (boot) configuration — see [references/config-reference.md](references/config-reference.md).

## Operating the proxy with `kamal proxy`

The `kamal proxy` command manages the proxy container itself on your servers. The most common subcommands:

| Subcommand | What it does |
|------------|--------------|
| `kamal proxy boot` | Boot the proxy on servers |
| `kamal proxy reboot` | Reboot the proxy (stop container, remove container, start a new container) |
| `kamal proxy restart` | Restart the existing proxy container on servers |
| `kamal proxy start` | Start the existing proxy container on servers |
| `kamal proxy stop` | Stop the existing proxy container on servers |
| `kamal proxy details` | Show details about the proxy container from servers |
| `kamal proxy logs` | Show log lines from the proxy on servers |
| `kamal proxy remove` | Remove the proxy container and image from servers |

For the full subcommand list and the (deprecated) `boot_config`, see [references/commands-reference.md](references/commands-reference.md).

### Inspecting the proxy

When routing or SSL is misbehaving, start with details and logs:

```bash
kamal proxy details
kamal proxy logs
```

### Upgrading or rebooting the proxy

When you want to upgrade kamal-proxy, run `kamal proxy reboot`. This causes a small outage on each server and prompts for confirmation.

```bash
kamal proxy reboot
```

To avoid restarting on all servers simultaneously, use a rolling reboot:

```bash
kamal proxy reboot --rolling
```

You can also use the `pre-proxy-reboot` and `post-proxy-reboot` hooks to remove and add servers to upstream load balancers as you reboot them.

### Boot (run) configuration

Options used when **booting the proxy container** — published ports, log size, registry/repository, and the pinned `version` of the kamal-proxy image — live under `proxy/run` in your config. This replaces the deprecated `kamal proxy boot_config`. See the `run` table in [references/config-reference.md](references/config-reference.md).

## Enable or disable the proxy per role

The proxy is enabled by default on the **primary role**. Disable it by setting `proxy: false` in that role:

```yaml
servers:
  web:
    hosts:
      - ...
    proxy: false
```

It is disabled by default on all other roles. Enable it with `proxy: true`, or by providing a proxy configuration for that role:

```yaml
servers:
  web:
    hosts:
      - ...
  web2:
    hosts:
      - ...
    proxy: true
```

## Related Skills

- **deploy**: Run `kamal deploy` to apply proxy configuration and roll out new versions through the proxy.
- **servers**: Define `servers` roles and control which roles run the proxy.
- **app**: Start, stop, and inspect the app container that the proxy routes to.
- **upgrade**: Migrate from Kamal 1.x to 2.0 and kamal-proxy.
