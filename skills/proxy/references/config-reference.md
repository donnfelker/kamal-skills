# Proxy Configuration Reference

Every key under the root `proxy` block in `config/deploy.yml`, plus the `proxy/run` boot options. These options are set when deploying the application, are application-specific, and are not shared when multiple applications run on the same proxy.

Source: [Proxy configuration](https://kamal-deploy.org/docs/configuration/proxy/).

## Routing and ports

| Key | Description | Default |
|-----|-------------|---------|
| `host` | Single host the proxy serves. Specify one of `host` or `hosts`. | — |
| `hosts` | List of hosts the proxy serves. | — |
| `app_port` | Port the application container is exposed on. | `80` |

If no hosts are set, all requests are forwarded to the app, except requests matching other apps deployed on that server that do have a host set.

## SSL and headers

| Key | Description | Default |
|-----|-------------|---------|
| `ssl` | Enable automatic HTTPS via Let's Encrypt (`true`), or a hash of `certificate_pem`/`private_key_pem` for a custom certificate. | `false` |
| `ssl_redirect` | Redirect HTTP requests to HTTPS when SSL is enabled. Set `false` to pass HTTP through alongside HTTPS. | `true` |
| `forward_headers` | Forward `X-Forwarded-For` and `X-Forwarded-Proto`. Defaults to `false` when `ssl` is `true`, `true` when `ssl` is `false`. | depends on `ssl` |

### Automatic SSL (Let's Encrypt)

Requires deploying to one server with `host` set. The `host` value must point to the server you are deploying to, and port 443 must be open for the Let's Encrypt challenge to succeed. When `ssl: true`, kamal-proxy stops forwarding headers unless you set `forward_headers: true`.

```yaml
proxy:
  host: app.example.com
  ssl: true
```

### Custom SSL certificate

Use when Let's Encrypt is not an option (for example, running from more than one host) or you already have a certificate from another CA. Pass a hash mapping `certificate_pem` and `private_key_pem` to secret names:

```yaml
proxy:
  ssl:
    certificate_pem: CERTIFICATE_PEM
    private_key_pem: PRIVATE_KEY_PEM
```

Notes:

- If the certificate or key is missing or invalid, deployments will fail.
- Always handle certificates and private keys securely. Avoid hard-coding them in source control.

## Healthcheck

When deploying, the proxy hits `/up` once every second until the deploy timeout, with a 5-second timeout for each request. Once the app is up, the proxy stops hitting the healthcheck endpoint.

```yaml
proxy:
  healthcheck:
    interval: 3
    path: /health
    timeout: 3
```

| Key | Description | Default |
|-----|-------------|---------|
| `path` | Endpoint the proxy checks | `/up` |
| `interval` | Seconds between checks | `1` |
| `timeout` | Seconds to wait per check | `5` |

## Timeouts and buffering

### Response timeout

How long to wait for requests to complete before timing out.

```yaml
proxy:
  response_timeout: 10
```

Defaults to 30 seconds.

### Buffering

Whether to buffer request and response bodies in the proxy. By default, buffering is enabled with a max request body size of 1GB and no limit for response size. The memory limit defaults to 1MB; anything larger is written to disk.

```yaml
proxy:
  buffering:
    requests: true
    responses: true
    max_request_body: 40_000_000
    max_response_body: 0
    memory: 2_000_000
```

## Path-based routing

For applications that split traffic to different services based on the request path, mount services under different path prefixes.

```yaml
proxy:
  path_prefix: "/api"
```

Specify multiple paths either as a comma-separated string with `path_prefix`, or as a list with `path_prefixes` (rolled together into a comma-separated string):

```yaml
proxy:
  path_prefix: "/api,/oauth_callback"
```

```yaml
proxy:
  path_prefixes:
    - "/api"
    - "/oauth_callback"
```

By default, the path prefix is stripped from the request before it is forwarded upstream. For example, a request to `/api/users/123` is forwarded as `/users/123`. To forward the original path including the prefix, set `strip_path_prefix: false`.

```yaml
proxy:
  strip_path_prefix: false
```

## Logging

Configure request logging for the proxy. You can specify request and response headers to log. By default, the `Cache-Control`, `Last-Modified`, and `User-Agent` request headers are logged.

```yaml
proxy:
  logging:
    request_headers:
      - Cache-Control
      - X-Forwarded-Proto
    response_headers:
      - X-Request-ID
      - X-Request-Start
```

## Run configuration (booting the proxy container)

These options are used when booting the proxy container, under `proxy/run`. They replace the deprecated `kamal proxy boot_config`.

```yaml
proxy:
  run:
    http_port: 8080                # HTTP port to use (default 80)
    https_port: 8443               # HTTPS port to use (default 443)
    metrics_port: 9090             # Port for Prometheus metrics
    debug: true                    # Debug logging (default: false)
    log_max_size: "30m"            # Maximum log file size (default: "10m")
    publish: false                 # Publish ports to the host (default: true)
    bind_ips:                      # List of IPs to bind to when publishing ports
      - 0.0.0.0
    registry: registry:4443        # Container registry for the kamal-proxy image
                                   # (defaults to Docker Hub)
    repository: myrepo/kamal-proxy # Container repository for the kamal-proxy image
                                   # (defaults to `basecamp/kamal-proxy`)
    version: v0.8.0                # Version tag of the kamal-proxy image to use
    options:                       # Additional options to pass to `docker run`
      label:
        - custom.label=kamal-proxy
      memory: 512m
      cpus: 0.5
```

| Key | Description | Default |
|-----|-------------|---------|
| `http_port` | HTTP port to use | `80` |
| `https_port` | HTTPS port to use | `443` |
| `metrics_port` | Port for Prometheus metrics | — |
| `debug` | Debug logging | `false` |
| `log_max_size` | Maximum log file size | `"10m"` |
| `publish` | Publish ports to the host | `true` |
| `bind_ips` | List of IPs to bind to when publishing ports | — |
| `registry` | Container registry for the kamal-proxy image | Docker Hub |
| `repository` | Container repository for the kamal-proxy image | `basecamp/kamal-proxy` |
| `version` | Version tag of the kamal-proxy image to use | — |
| `options` | Additional options to pass to `docker run` | — |

## Enabling and disabling the proxy on roles

The proxy is enabled by default on the primary role and can be disabled with `proxy: false`. It is disabled by default on all other roles and can be enabled with `proxy: true` or by providing a proxy configuration for that role.

```yaml
servers:
  web:
    hosts:
      - ...
    proxy: false   # disable on the primary role
  web2:
    hosts:
      - ...
    proxy: true    # enable on a non-primary role
```
