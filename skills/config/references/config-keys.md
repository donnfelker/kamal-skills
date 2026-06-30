# Top-Level Configuration Keys

Every top-level key accepted in `config/deploy.yml`, with its default where the docs state one. Configuration is read from `config/deploy.yml`. Source: [Kamal Configuration overview](https://kamal-deploy.org/docs/configuration/overview/).

## Core Keys

| Key | Purpose | Default |
|-----|---------|---------|
| `service` | **Required.** Used as the container name prefix. | — |
| `image` | The Docker image name. The image will be pushed to the configured registry. | — |
| `labels` | Additional labels to add to the container. | — |
| `volumes` | Additional volumes to mount into the container (e.g. `/path/on/host:/path/in/container:ro`). | — |
| `registry` | Docker registry configuration. See [Docker Registry](https://kamal-deploy.org/docs/configuration/docker-registry/). | — |
| `servers` | The servers to deploy to, optionally with custom roles. See [Servers](https://kamal-deploy.org/docs/configuration/servers/). | — |
| `env` | Environment variables. See [Environment variables](https://kamal-deploy.org/docs/configuration/environment-variables/). | — |

## Paths

| Key | Purpose | Default |
|-----|---------|---------|
| `asset_path` | Asset path used for asset bridging across deployments, to avoid 404s on changed CSS/JS. Mount options can follow a colon (e.g. `ro`, `z`/`Z`). | `nil` |
| `hooks_path` | Path to hooks. | `.kamal/hooks` |
| `secrets_path` | Path to secrets. Kamal looks for `<secrets_path>-common` first, then `<secrets_path>` (or `<secrets_path>.<destination>` when a destination is used); later files override earlier ones. | `.kamal/secrets` |
| `error_pages_path` | Directory relative to the app root holding error pages for the proxy to serve. Name each page after its HTTP status code (e.g. `404.html`, `500.html`, `502.html`, `503.html`, `504.html`). | — |
| `run_directory` | Directory to store Kamal runtime files in on the host. | `.kamal` |

## Hook Output

| Key | Purpose | Default |
|-----|---------|---------|
| `hooks_output` | Hook output visibility, set globally or per-hook. Values: `:quiet` (hidden), `:verbose` (shown). CLI flags `-v`/`-q` override these. Failed hooks always show output in the error message. | Follows CLI verbosity flags |

```yaml
# Global
hooks_output: :verbose

# Per-hook
hooks_output:
  pre-deploy: :verbose
  pre-build: :quiet
```

## Roles and Destinations

| Key | Purpose | Default |
|-----|---------|---------|
| `require_destination` | Whether deployments require a destination to be specified. | `false` |
| `primary_role` | The primary role. Change this if you have no `web` role. | `web` |
| `allow_empty_roles` | Whether roles with no servers are allowed. | `false` |

## Lifecycle and Timeouts

| Key | Purpose | Default |
|-----|---------|---------|
| `retain_containers` | How many old containers and images to retain. | `5` |
| `minimum_version` | The minimum version of Kamal required to deploy this configuration. | `nil` |
| `readiness_delay` | Seconds to wait for a container to boot after it is running. Only applies to containers that do not run a proxy or specify a healthcheck. | `7` |
| `deploy_timeout` | How long to wait for a container to become ready. | `30` |
| `drain_timeout` | How long to wait for a container to drain. | `30` |
| `stop_timeout` | How long to wait for a container to stop after SIGTERM. Can be overridden per role. | `drain_timeout` for non-proxied roles; `10s` (Docker default) for proxied roles |

## Sub-Configuration Blocks

Each of these keys opens a nested configuration block documented on its own page.

| Key | Purpose | Docs |
|-----|---------|------|
| `ssh` | SSH options. | [SSH](https://kamal-deploy.org/docs/configuration/ssh/) |
| `builder` | Builder options. | [Builders](https://kamal-deploy.org/docs/configuration/builders/) |
| `accessories` | Additional services to run in Docker. | [Accessories](https://kamal-deploy.org/docs/configuration/accessories/) |
| `proxy` | Configuration for kamal-proxy. | [Proxy](https://kamal-deploy.org/docs/configuration/proxy/) |
| `sshkit` | SSHKit options. | [SSHKit](https://kamal-deploy.org/docs/configuration/sshkit/) |
| `boot` | Boot options. | [Booting](https://kamal-deploy.org/docs/configuration/booting/) |
| `logging` | Docker logging configuration. | [Logging](https://kamal-deploy.org/docs/configuration/logging/) |
| `output` | Configure output loggers (OTel, file). | [Output](https://kamal-deploy.org/docs/configuration/output/) |
| `aliases` | Alias configuration (command shortcuts). | [Aliases](https://kamal-deploy.org/docs/configuration/aliases/) |

## Extensions

Kamal will not accept unrecognized keys. Prefix any custom section with `x-` to mark it as an extension; Kamal ignores it and does not raise an error. This is how YAML anchors are declared at the root level. See [Anchors](https://kamal-deploy.org/docs/configuration/anchors/).
