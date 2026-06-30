# Role Options Reference

Deep reference for configuring roles in `config/deploy.yml`. Every key here is documented in the official Kamal docs: [Servers](https://kamal-deploy.org/docs/configuration/servers/), [Roles](https://kamal-deploy.org/docs/configuration/roles/), and [Configuration](https://kamal-deploy.org/docs/configuration/overview/).

## Role configuration forms

Roles live under the `servers:` key. A role can be written two ways.

**Simple (list form)** — just hosts, no custom options. Use this if you don't need custom configuration for the role. Hosts can be tagged for custom env variables:

```yaml
servers:
  web:
    - 172.1.0.1
    - 172.1.0.2: experiment1
    - 172.1.0.3: [ experiment1, experiment2 ]
```

**Custom (map form)** — when there are other options to set, the list of hosts goes under the `hosts` key, with the options alongside it:

```yaml
servers:
  workers:
    hosts:
      - 172.1.0.3
      - 172.1.0.4: experiment1
    cmd: "bin/jobs"
    stop_timeout: 30
    options:
      memory: 2g
      cpus: 4
    logging:
      ...
    proxy:
      ...
    labels:
      my-label: workers
    env:
      ...
    asset_path: /public
```

Per-role values overwrite the matching settings from the root configuration.

## Per-role keys

| Key | Description |
|-----|-------------|
| `hosts` | The role's list of servers. Use this form when the role needs options beyond its hosts. Hosts can be tagged for custom env variables. |
| `cmd` | A custom command to run in the container, replacing the image default (for example, `bin/jobs`). |
| `proxy` | Whether this role uses the proxy. `false` disables it; `true` enables it and inherits the root proxy config; a map of options overrides the root config. See "Proxy per role" below. |
| `options` | Per-role container options. The docs show `memory` and `cpus`. |
| `logging` | Docker logging configuration for the role — `driver` and `options`. Logging can be set at the root level or per role. |
| `labels` | Additional labels to add to the role's containers. |
| `env` | Environment variables for the role. Tags are only allowed in the top-level `env`, not under a role-specific `env`. |
| `stop_timeout` | How long to wait for a container to stop after SIGTERM. Can be overridden per role. The default is the `drain_timeout` for non-proxied roles and 10s for proxied roles. |
| `asset_path` | Path used for asset bridging across deployments on this role. |

## Proxy per role

- By default, only the primary role uses a proxy.
- On the **primary role**, set `proxy: false` to disable it.
- On **other roles**, set `proxy: true` to enable it and inherit the root proxy configuration, or provide a map of options to override the root configuration.

```yaml
servers:
  web:
    hosts:
      - 172.1.0.1
    proxy: false
  web2:
    hosts:
      - 172.1.0.2
    proxy: true
```

For the proxy options themselves, see the **proxy** skill or [Proxy](https://kamal-deploy.org/docs/configuration/proxy/).

## Root-level keys that affect roles

These go at the top level of `config/deploy.yml`, not inside a role.

| Key | Default | Description |
|-----|---------|-------------|
| `primary_role` | `web` | The primary role. Change it if you have no `web` role, e.g. `primary_role: workers`. |
| `allow_empty_roles` | `false` | Whether roles with no servers are allowed. |
| `stop_timeout` | `drain_timeout` (non-proxied) / 10s (proxied) | How long to wait for a container to stop after SIGTERM. Can also be overridden per role. |

## Official docs

- Servers: https://kamal-deploy.org/docs/configuration/servers/
- Roles: https://kamal-deploy.org/docs/configuration/roles/
- Configuration (root keys): https://kamal-deploy.org/docs/configuration/overview/
