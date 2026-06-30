---
name: config
description: Understand and write your Kamal configuration in config/deploy.yml. Use when the user says "set up config/deploy.yml," "what goes in my deploy.yml," "what are the required keys," "add a staging destination," "deploy with -d staging," "DRY up my config with YAML anchors," "what does retain_containers / readiness_delay / primary_role / deploy_timeout do," "kamal init," or "kamal config." Covers the required service and image keys, destinations (-d) and merged per-destination files, x- extensions, every top-level option and its default, and reusing config with anchors and aliases. For configuring servers and roles, see servers. For env and secrets, see env. For command shortcuts, see aliases. For a first deployment, see setup.
metadata:
  version: 1.0.0
---

# Kamal Configuration

You are an expert in deploying applications with Kamal. Your goal is to help structure a clear, correct `config/deploy.yml` — the single file that drives every Kamal deployment.

Kamal reads its configuration from `config/deploy.yml`. This skill walks through the required keys, the full set of top-level options and their defaults, per-environment **destinations** (`-d`), **extensions** (`x-`), and how to keep the file DRY with YAML anchors.

## Before You Start

Inspect what already exists before asking the user questions:

- Read `config/deploy.yml` if it exists — it tells you the service name, servers, registry, and which options are already tuned.
- Look for `config/deploy.<destination>.yml` files (e.g. `config/deploy.staging.yml`) — these signal the project already uses destinations.
- Check `.kamal/secrets` for referenced secret names so you don't duplicate or contradict them.

If there is no `config/deploy.yml`, generate one with `kamal init`, which creates the configuration file plus a `.kamal/secrets` file and sample hooks in `.kamal/hooks`.

## How the Config File Works

| Action | Command |
|--------|---------|
| Create `config/deploy.yml`, `.kamal/secrets`, and sample hooks | `kamal init` |
| Display the resolved config (with destinations merged in) | `kamal config` |

After any edit, run `kamal config` to print the resolved configuration and confirm Kamal parses it the way you expect.

> Note: Kamal rejects unrecognized keys. A typo'd or invented key is an error, not a silent no-op — see [Extensions](#extensions-x-) for the one supported escape hatch.

## Step-by-Step Walk-Through

### Step 1: Set the required key

`service` is the only required value. It is used as the container name prefix, so keep it short and stable.

```yaml
service: myapp
```

### Step 2: Point at an image

`image` is the Docker image name. The image will be pushed to the configured registry.

```yaml
image: my-image
```

### Step 3: Add the deploy targets

These three blocks describe *where* and *how* the app runs. Each is a topic of its own — set the keys here and follow the cross-references for detail:

```yaml
registry:
  ...   # Docker registry — see servers / official Registry docs

servers:
  - 192.168.0.1   # a bare list is implicitly the `web` role

env:
  clear:
    DATABASE_HOST: mysql-db1
  secret:
    - DATABASE_PASSWORD
```

- For server lists, roles, and tags, see the **servers** skill.
- For `clear`/`secret` env, tags, and `.kamal/secrets`, see the **env** skill.

### Step 4: Tune the top-level options

Set only the options you need to change from their defaults. The most commonly adjusted ones:

| Key | Purpose | Default |
|-----|---------|---------|
| `primary_role` | Which role is primary when you have no `web` role | `web` |
| `retain_containers` | How many old containers and images to keep | `5` |
| `readiness_delay` | Seconds to wait after a container is running (only for containers with no proxy and no healthcheck) | `7` |
| `deploy_timeout` | Seconds to wait for a container to become ready | `30` |
| `drain_timeout` | Seconds to wait for a container to drain | `30` |
| `require_destination` | Require a `-d` destination on every command | `false` |
| `minimum_version` | Minimum Kamal version required to deploy this config | `nil` |

```yaml
primary_role: workers
retain_containers: 3
require_destination: true
```

For the complete list of every top-level key and default, see [references/config-keys.md](references/config-keys.md).

### Step 5: Validate

Run `kamal config` to render the merged result and catch parse errors or unexpected defaults before deploying.

## Destinations (-d)

Destinations let one project target multiple environments from one base config plus a per-destination overlay.

When you pass a destination with the `-d` flag, e.g. `kamal deploy -d staging`, Kamal also reads `config/deploy.staging.yml` and merges it with the base `config/deploy.yml`.

```yaml
# config/deploy.yml (base)
service: myapp
servers:
  - 192.168.0.1

# config/deploy.staging.yml (overlay, merged over the base)
servers:
  - 10.0.0.5
```

Secrets follow the destination too. With destinations, Kamal looks for `<secrets_path>-common` first and then `<secrets_path>.<destination>` (e.g. `.kamal/secrets-common`, then `.kamal/secrets.staging`), with later files overriding earlier ones.

To make a destination mandatory so nobody deploys to the wrong place by accident, set `require_destination: true`.

## Extensions (x-)

Kamal will not accept unrecognized keys in the configuration file. To declare a reusable block without triggering an error, prefix the section with `x-`. Kamal ignores any `x-`-prefixed key and treats it as an extension.

This is what makes YAML anchors usable in `deploy.yml`: define the anchor under an `x-` key so Kamal skips it, then alias it where it counts.

## DRY Config with YAML Anchors

You can re-use parts of your configuration by defining them as anchors and referencing them with aliases. Anchors begin with `x-` and are defined at the root level of `deploy.yml`.

Define the anchor once:

```yaml
x-worker-healthcheck: &worker-healthcheck
  health-cmd: bin/worker-healthcheck
  health-start-period: 5s
  health-retries: 5
  health-interval: 5s
```

Then reference it via the alias, merging it in with `<<`:

```yaml
servers:
  worker:
    hosts:
      - 867.53.0.9
    cmd: bin/jobs
    options:
      <<: *worker-healthcheck
```

This keeps a single source of truth for shared blocks (like a healthcheck reused across multiple worker roles) without repeating yourself.

## Reusable Command Shortcuts

The top-level `aliases` key defines shortcuts for Kamal commands — for example a `console` alias or a `staging_deploy: deploy -d staging`. These are configured in the same file. For the full pattern, see the **aliases** skill.

## Related Skills

- **setup**: For a first-time Kamal setup and your first deployment.
- **servers**: For the `servers` block — host lists, roles, tags, and per-role options.
- **env**: For the `env` block — `clear`/`secret` values, tags, and `.kamal/secrets`.
- **aliases**: For defining command shortcuts under the `aliases` key.
