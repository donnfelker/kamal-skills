---
name: env
description: Configure environment variables in your Kamal deploy.yml — the `env` block with `clear` values, `secret` references loaded from `.kamal/secrets`, `tags` for per-host overrides, and per-role `env`. Use when the user says things like "add an env var to Kamal," "set DATABASE_URL in deploy.yml," "pass a secret to my container," "how do I keep my API key out of git," "different env vars per server or role," "clear vs secret env," "aliased secrets," or asks about `env.clear`, `env.secret`, `env.tags`, or `kamal secrets fetch`/`extract`. Covers how clear values are passed to `docker run` while secret values are written to an env file on the host. For managing the secret values themselves and password-manager helpers, see secrets. For tagging hosts and defining roles, see servers. For the overall deploy.yml structure, see config.
metadata:
  version: 1.0.0
---

# Environment Variables

You are an expert in deploying applications with Kamal. Your goal is to help configure environment variables in `deploy.yml` correctly: keeping plain values readable, keeping secrets out of version control, and targeting specific hosts or roles when needed.

Environment variables can be set directly in the Kamal configuration or read from `.kamal/secrets`. When you deploy, Kamal passes them to the `docker run` command that starts your container.

## Before You Start

Look at what already exists before asking the user questions:

- Read the user's `config/deploy.yml` and find the `env` block (and any `env` under `servers` roles or `accessories`).
- Read `.kamal/secrets` (and `.kamal/secrets-common` / `.kamal/secrets.<destination>` if present) to see which secret names are already defined.
- For each variable, decide one thing: **is it sensitive?** That answer determines whether it goes under `clear` or `secret`.

## The Two Forms of `env`

### Simple form

For non-sensitive variables, set them directly as key/value pairs. These are passed to the `docker run` command when deploying.

```yaml
env:
  DATABASE_HOST: mysql-db1
  DATABASE_PORT: 3306
```

### Clear and secret form

As soon as you need a secret, list the secret names under the `secret` key and move the other variables under the `clear` key.

```yaml
env:
  clear:
    DB_USER: app
  secret:
    - DB_PASSWORD
```

Unlike clear values, secrets are not passed directly to the container — they are stored in an env file on the host.

### Clear vs. secret

| | `clear` | `secret` |
|---|---------|----------|
| Declared as | key/value map | list of variable names |
| Where the value lives | the config file (`deploy.yml`) | `.kamal/secrets`, loaded by Kamal |
| How it reaches the container | passed directly to `docker run` | written to an env file on the host, not passed directly |
| Safe to commit | yes | no — keep the values out of version control |

## Walk-Through: Add Variables Safely

1. **Inventory the variables** the app needs, and split them into sensitive and non-sensitive.
2. **Put non-sensitive values** under `clear` (or use the simple form if you have no secrets at all).
3. **List secret names** under `secret` — names only, not values.
4. **Define each secret value** in `.kamal/secrets` (see below).
5. **Deploy.** Kamal passes the clear values to `docker run` and writes the secret values to an env file on the host.

## Defining Secret Values in `.kamal/secrets`

Kamal uses dotenv to automatically load environment variables from the configured secrets files. You can use variable substitution or command substitution in the file:

```shell
# .kamal/secrets
KAMAL_REGISTRY_PASSWORD=$KAMAL_REGISTRY_PASSWORD
RAILS_MASTER_KEY=$(cat config/master.key)
```

Kamal looks for `.kamal/secrets-common` first, then `.kamal/secrets`, with later values overriding earlier ones. This file is where variables like `KAMAL_REGISTRY_PASSWORD` or database passwords live.

If you store secrets directly in `.kamal/secrets`, ensure that it is not checked into version control.

To pull values from a password manager instead of storing them in plain text, use the secret helpers — `kamal secrets fetch` and `kamal secrets extract`:

```shell
SECRETS=$(kamal secrets fetch ...)

REGISTRY_PASSWORD=$(kamal secrets extract REGISTRY_PASSWORD $SECRETS)
DB_PASSWORD=$(kamal secrets extract DB_PASSWORD $SECRETS)
```

For the secrets-file loading order with destinations, command/variable substitution, and the full list of password-manager adapters, see [references/secrets-files.md](references/secrets-files.md).

## Aliased Secrets

When the env variable name differs from the secret name — or you need the same env name to map to different secrets in different contexts — alias them with a `:` separator (`ENV_NAME:SECRET_NAME`).

```yaml
env:
  secret:
    - DB_PASSWORD:MAIN_DB_PASSWORD
```

This reads the secret `MAIN_DB_PASSWORD` and exposes it to the container as `DB_PASSWORD`. For a full example aliasing the same env name to different secrets across roles and accessories, see [references/secrets-files.md](references/secrets-files.md).

## Tags: Per-Host Env

Tags add extra env variables to specific hosts. First tag the hosts (see servers), then reference each tag under `env.tags`. The variables under a tag can use `clear` and `secret` values just like the top-level env.

```yaml
env:
  tags:
    monitoring:
      MYSQL_USER: monitoring
    replica:
      clear:
        MYSQL_USER: readonly
      secret:
        - READONLY_PASSWORD
```

Tags are only allowed in the top-level `env` configuration — not under a role-specific `env`.

## Per-Role Env

For multi-role deployments, you can set an `env` block under a specific role in `servers`. This applies those variables only to that role's containers.

```yaml
servers:
  web:
    - 172.1.0.1
  workers:
    hosts:
      - 172.1.0.3
    cmd: "bin/jobs"
    env:
      clear:
        MYSQL_USER: app
      secret:
        - MYSQL_PASSWORD
```

Remember: `tags` cannot be used inside a role-specific `env`. Use top-level `env.tags` for per-host overrides.

## Full Example

```yaml
env:
  clear:
    MYSQL_USER: app
  secret:
    - MYSQL_PASSWORD
  tags:
    monitoring:
      MYSQL_USER: monitoring
    replica:
      clear:
        MYSQL_USER: readonly
      secret:
        - READONLY_PASSWORD
```

## Related Skills

- **secrets**: For managing the secret values themselves — `.kamal/secrets` mechanics and the `kamal secrets` password-manager helpers.
- **servers**: For tagging hosts and defining roles that per-host and per-role env target.
- **config**: For the overall structure of `deploy.yml` and where the `env` block fits.
