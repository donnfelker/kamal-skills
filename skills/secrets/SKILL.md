---
name: secrets
description: Manage secrets for a Kamal deployment — the `.kamal/secrets` file, dotenv variable and command substitution, and the `kamal secrets` vault helpers (1Password, Bitwarden, LastPass, Bitwarden Secrets Manager, AWS Secrets Manager, Doppler, GCP Secret Manager, Passbolt). Use when the user says "kamal secrets," "where do I put my registry password," "manage secrets," "pull secrets from 1Password/Bitwarden/LastPass/Doppler," "kamal secrets fetch/extract/print," "secrets-common," "secrets.<destination>," "secrets_path," "secret vs clear env keys," "RAILS_MASTER_KEY," or "migrate from .env / kamal envify." Covers wiring secrets into `env.secret`/`env.clear` in deploy.yml, per-destination secrets files, and aliased secrets. For setting plain non-secret env values, see environment-variables. For registry login and KAMAL_REGISTRY_PASSWORD, see registry. For build-time secrets and args, see building-images.
metadata:
  version: 1.0.0
---

# Kamal Secrets

You are an expert in deploying applications with Kamal. Your goal is to help the user store deployment secrets safely, wire them into `config/deploy.yml`, and — when they use a password manager — pull them with the `kamal secrets` helpers instead of pasting plaintext.

In Kamal 2, secrets live in `.kamal/secrets`. Kamal uses [dotenv](https://github.com/bkeepers/dotenv) to load that file automatically whenever a command needs the values, so there is no separate "generate secrets" step.

## Start Here

Before asking the user questions, read what already exists:

- **`.kamal/secrets`** (and `.kamal/secrets-common`, `.kamal/secrets.<destination>` if present) — what secrets are already defined and how they are sourced.
- **`config/deploy.yml`** — the `env` block, especially which keys are listed under `secret` vs `clear`, and the `registry` block.
- Check whether `.kamal/secrets` is git-ignored.

This tells you whether the user needs to add a new secret, move a plaintext value out of `deploy.yml`, switch to a vault helper, or set up per-environment secrets.

## The `.kamal/secrets` File

`.kamal/secrets` is a dotenv file. Each line defines an environment variable that Kamal can reference. The right-hand side supports two kinds of substitution, evaluated **on demand** when you run a Kamal command:

| Technique | Syntax | Use it for |
|-----------|--------|------------|
| Variable substitution | `NAME=$NAME` | Pulling a value already in your shell/CI environment |
| Command substitution | `NAME=$(command)` | Reading from a file or a CLI (e.g. a password manager) |

```shell
# .kamal/secrets

# Pass a value through from the surrounding environment (e.g. set in CI)
KAMAL_REGISTRY_PASSWORD=$KAMAL_REGISTRY_PASSWORD

# Read a value by running a command
RAILS_MASTER_KEY=$(cat config/master.key)
```

**Do not commit real secret values.** If you store secrets directly in `.kamal/secrets`, make sure the file is not checked into version control. Prefer variable substitution (from CI/your shell) or command substitution (from a password manager) so the file holds references, not plaintext.

`KAMAL_REGISTRY_PASSWORD` is the variable Kamal reads for registry authentication. For registry login itself, see the **registry** skill.

## Referencing Secrets From deploy.yml

Defining a variable in `.kamal/secrets` does not, by itself, send it to your containers. You declare which variables are secret in the `env` block of `config/deploy.yml`.

List secret variable names under the `secret` key, and move any plain values under the `clear` key:

```yaml
env:
  clear:
    DB_USER: app
  secret:
    - DB_PASSWORD
```

The names under `secret` must match variables defined in `.kamal/secrets`.

**Behavior:** Unlike `clear` values, secrets are **not** passed directly to the container. Kamal writes them to an env file on the host instead. For the full breakdown of `clear`, `secret`, and tags, see the **environment-variables** skill.

### Aliased Secrets

When the environment variable name your app expects differs from the secret name, alias it with a `:` separator (`ENV_NAME:SECRET_NAME`). This is useful when the same ENV name needs different values in different contexts:

```yaml
env:
  secret:
    - DB_PASSWORD:MAIN_DB_PASSWORD
  tags:
    secondary_db:
      secret:
        - DB_PASSWORD:SECONDARY_DB_PASSWORD
```

```shell
# .kamal/secrets
SECRETS=$(kamal secrets fetch ...)

MAIN_DB_PASSWORD=$(kamal secrets extract MAIN_DB_PASSWORD $SECRETS)
SECONDARY_DB_PASSWORD=$(kamal secrets extract SECONDARY_DB_PASSWORD $SECRETS)
```

## Pulling Secrets From a Vault: `kamal secrets`

If the user keeps secrets in a password manager, use the `kamal secrets` helpers inside `.kamal/secrets` via command substitution. The helpers handle signing in, prompting for passwords, and efficiently fetching the secrets.

### Subcommands

| Command | What it does |
|---------|--------------|
| `kamal secrets fetch [SECRETS...] --adapter=ADAPTER --account=ACCOUNT` | Fetch secrets from a vault |
| `kamal secrets extract` | Extract a single secret from the results of a `fetch` call |
| `kamal secrets print` | Print the secrets (for debugging) |
| `kamal secrets help [COMMAND]` | Describe subcommands or one specific subcommand |

Key options on `fetch`: `--adapter` (`-a`) selects the password manager, `--account` selects the account, and `--from` scopes where to look (vault, folder, item, or project) depending on the adapter.

### The fetch → extract Pattern

Call `fetch` **once** to pull every secret in a single sign-in, then `extract` each value out of that result. This avoids re-authenticating for every variable:

```shell
# .kamal/secrets

SECRETS=$(kamal secrets fetch ...)

REGISTRY_PASSWORD=$(kamal secrets extract REGISTRY_PASSWORD $SECRETS)
DB_PASSWORD=$(kamal secrets extract DB_PASSWORD $SECRETS)
```

### Walk-Through: 1Password

1. Install and configure [the 1Password CLI](https://developer.1password.com/docs/cli/get-started/).
2. Fetch with the `1password` adapter, pointing `--from` at a `Vault/Item`:

```shell
# .kamal/secrets

SECRETS=$(kamal secrets fetch --adapter 1password --account myaccount \
  --from MyVault/MyItem REGISTRY_PASSWORD DB_PASSWORD)

REGISTRY_PASSWORD=$(kamal secrets extract REGISTRY_PASSWORD $SECRETS)
DB_PASSWORD=$(kamal secrets extract DB_PASSWORD $SECRETS)
```

`extract` accepts either the short secret name or a fully-qualified path, so all three of these resolve the same value:

```shell
kamal secrets extract REGISTRY_PASSWORD $SECRETS
kamal secrets extract MyItem/REGISTRY_PASSWORD $SECRETS
kamal secrets extract MyVault/MyItem/REGISTRY_PASSWORD $SECRETS
```

### Supported Adapters

Kamal ships helpers for several password managers and secret stores:

| Adapter | Service | Uses `--account`? |
|---------|---------|-------------------|
| `1password` | 1Password | Yes |
| `lastpass` | LastPass | Yes (email) |
| `bitwarden` | Bitwarden | Yes (email) |
| `bitwarden-sm` | Bitwarden Secrets Manager | No (fetch `all` or `ProjectID/all`) |
| `aws_secrets_manager` | AWS Secrets Manager | Yes (AWS CLI profile, usually `default`) |
| `doppler` | Doppler | Ignored if given |
| `gcp` | GCP Secret Manager | Yes (gcloud account) |
| `passbolt` | Passbolt | Ignored if given |

Each adapter has its own `--from` semantics (vaults, folders, items, projects, GCP project IDs) and prefix conventions. **For per-adapter fetch examples and the full options reference, see [references/vault-adapters.md](references/vault-adapters.md).**

## Secrets For Multiple Environments

When you deploy to multiple destinations, split secrets across files. Kamal looks for the `-common` file first, then the environment-specific file, with **later values overriding earlier ones**:

| Scenario | Files read (in order) |
|----------|-----------------------|
| No destination | `.kamal/secrets-common`, then `.kamal/secrets` |
| Destination `<dest>` | `.kamal/secrets-common`, then `.kamal/secrets.<dest>` |

When a destination is selected, the plain `.kamal/secrets` file is **not** read. Put values shared across every destination in `.kamal/secrets-common`, and per-environment values in `.kamal/secrets.<destination>`.

### Changing the Path: `secrets_path`

`secrets_path` sets the base path to your secrets files. It defaults to `.kamal/secrets`. Kamal applies the same `-common` / `.<destination>` lookup relative to whatever you set:

```yaml
# config/deploy.yml
secrets_path: /user_home/kamal/secrets
```

## Debugging

Use `kamal secrets print` to print the resolved secrets when something is not being picked up. Treat its output as sensitive — it reveals secret values.

```bash
kamal secrets print
```

## Migrating From Kamal 1

If the user is upgrading from Kamal 1, secrets have moved out of `.env` / `.env.rb` into `.kamal/secrets`:

- **`kamal envify` and `kamal env` have been removed.** Secrets no longer have a separate lifecycle — substitution happens on demand. Replace `envify` with dotenv's variable and command substitution directly in `.kamal/secrets`.
- **`.env` is no longer auto-loaded into the environment**, and values in `.kamal/secrets` are not loaded into the environment for use in `deploy.yml` either. If your `deploy.yml` referenced `ENV[...]` via ERB, load `.env` yourself:

```erb
# config/deploy.yml

<% require "dotenv"; Dotenv.load(".env") %>

servers:
  - <%= ENV["SERVER_IP"] %>
```

## Related Skills

- **environment-variables**: For setting plain (non-secret) env values, the `clear` / `secret` keys in detail, and tags.
- **registry**: For registry login/logout and the `KAMAL_REGISTRY_PASSWORD` secret it consumes.
- **building-images**: For build-time secrets and build args used while building your image.

**Official docs:** [Secrets command](https://kamal-deploy.org/docs/commands/secrets/) · [Secrets changes (upgrading)](https://kamal-deploy.org/docs/upgrading/secrets-changes/) · [Environment variables](https://kamal-deploy.org/docs/configuration/environment-variables/)
