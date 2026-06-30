---
name: servers-and-roles
description: Define and structure the servers Kamal deploys to — a simple list of hosts, multiple custom roles (such as web and workers/job hosts), the primary role, tagged hosts, and per-role options. Use when the user says things like "add a workers role," "run background jobs on separate servers," "split web and job servers," "configure multiple servers," "set the primary role," "only some servers should run the proxy," or is editing the `servers:` block in `config/deploy.yml`. Covers the implicit `web` role, role-specific `hosts`, `cmd`, `options`, `logging`, `proxy`, `labels`, `env`, and `asset_path`, plus the root keys `primary_role` and `allow_empty_roles`. For the overall config file, see configuration. For tuning kamal-proxy, see proxy. For tags and secret/clear env, see environment-variables. For rollout order across hosts, see booting.
metadata:
  version: 1.0.0
---

# Servers and Roles

You are an expert in deploying applications with Kamal. Your goal here is to define the servers a deployment targets and split them into roles — web servers, job/worker hosts, and anything else — each configured for its job.

Kamal reads this from the `servers:` block in `config/deploy.yml`.

## How servers and roles work

- Servers are split into **roles**, and each role has its own configuration.
- For simple deployments where every server is identical, you can skip roles entirely and give a plain list of servers. They are implicitly assigned to the `web` role.
- For more complex deployments (for example, running job hosts), you define named roles and configure each one separately.
- Kamal expects a `web` role to exist, unless you set a different `primary_role` in the root configuration.

## Before you start

Read what the user already has before asking questions:

- `config/deploy.yml` — the existing `servers:` block, and whether `primary_role` or `allow_empty_roles` are already set.
- `.kamal/secrets` — if any role will reference secret env variables.

Then confirm: how many servers there are, which ones run the web app, and whether any run a separate workload (background jobs, schedulers, and so on).

## Step 1: Start with a simple server list

If all servers are identical, just list them. They all join the `web` role automatically:

```yaml
servers:
  - 172.0.0.1
  - 172.0.0.2
  - 172.0.0.3
```

This is the right starting point for most single-purpose apps.

## Step 2: Tag hosts (optional)

Servers can be **tagged**, and tags are used to attach custom env variables to specific hosts:

```yaml
servers:
  - 172.0.0.1
  - 172.0.0.2: experiments
  - 172.0.0.3: [ experiments, three ]
```

A host can carry a single tag or a list of tags. You then map each tag to extra env variables in the top-level `env` configuration — see the **environment-variables** skill.

## Step 3: Split into roles

When some servers do a different job (commonly job/worker hosts), define named roles under `servers:`. Each role is a key with its own host list:

```yaml
servers:
  web:
    - 172.1.0.1
    - 172.1.0.2: experiment1
    - 172.1.0.3: [ experiment1, experiment2 ]
  workers:
    - 172.1.0.4
    - 172.1.0.5
```

The most common split is **web servers** and **job servers**. The list form — hosts directly under the role name — is for roles that don't need any custom configuration. You can still tag hosts inside a role.

## Step 4: Add per-role options

When a role needs options beyond its hosts, move the host list under a `hosts:` key and set the options alongside it:

```yaml
servers:
  web:
    - 172.1.0.1
  workers:
    hosts:
      - 172.1.0.3
      - 172.1.0.4: experiment1
    cmd: "bin/jobs"
    stop_timeout: 30
    options:
      memory: 2g
      cpus: 4
    labels:
      my-label: workers
    asset_path: /public
```

A custom `cmd` runs in the container instead of the image default — here the `workers` role runs `bin/jobs`. Per-role settings overwrite the matching settings from the root configuration.

### Per-role keys

| Key | Purpose |
|-----|---------|
| `hosts` | The role's server list (use this form when the role has other options) |
| `cmd` | Custom command to run in the container |
| `proxy` | Enable, disable, or override the proxy for this role (see Step 6) |
| `options` | Per-role container options, e.g. `memory`, `cpus` |
| `logging` | Per-role Docker logging driver and options |
| `labels` | Additional labels on the role's containers |
| `env` | Env variables for this role (tags are not allowed under a role-specific `env`) |
| `stop_timeout` | Per-role override of how long to wait for a container to stop |
| `asset_path` | Asset path for asset bridging on this role |

For the full per-role reference and the related root-level keys, see [references/role-options.md](references/role-options.md).

## Step 5: Set the primary role

Kamal treats `web` as the **primary role** by default. If your deployment has no `web` role, set `primary_role` in the root configuration to one of your roles:

```yaml
primary_role: workers
```

If you want to allow roles that have no servers, set `allow_empty_roles` (defaults to `false`):

```yaml
allow_empty_roles: true
```

## Step 6: Control the proxy per role

By default, **only the primary role uses the proxy** (kamal-proxy, which runs on ports 80 and 443).

**Disable on the primary role** — set `proxy: false`:

```yaml
servers:
  web:
    hosts:
      - 172.1.0.1
    proxy: false
```

**Enable on a non-primary role** — set `proxy: true` to inherit the root proxy configuration, or provide a map of options to override it:

```yaml
servers:
  web:
    hosts:
      - 172.1.0.1
  web2:
    hosts:
      - 172.1.0.2
    proxy: true
```

For tuning kamal-proxy itself (hosts, SSL, healthcheck, ports), see the **proxy** skill.

## Putting it together

A typical web + workers deployment:

```yaml
service: myapp
image: my-image

servers:
  web:
    - 172.1.0.1
    - 172.1.0.2
  workers:
    hosts:
      - 172.1.0.3
    cmd: "bin/jobs"
```

The `web` role serves traffic through the proxy; the `workers` role runs `bin/jobs` with no proxy. Add per-role options only where a role actually needs them.

## Related Skills

- **configuration**: For the overall `config/deploy.yml` structure and root-level keys.
- **proxy**: For enabling, disabling, and tuning kamal-proxy.
- **environment-variables**: For mapping host tags to env variables and using secret/clear values.
- **booting**: For controlling how many hosts (and roles) boot at a time during a deploy.
