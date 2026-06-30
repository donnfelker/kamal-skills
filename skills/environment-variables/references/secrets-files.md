# Secrets Files and Aliased Secrets

Reference detail for defining the **values** behind the env variables you list under `env.secret`. The SKILL covers the common path; this file covers the loading order, destinations, substitution, password-manager helpers, and multi-context aliasing.

All facts here are grounded in the official Kamal docs:
- [Environment variables](https://kamal-deploy.org/docs/configuration/environment-variables/)
- [kamal secrets](https://kamal-deploy.org/docs/commands/secrets/)

## How Kamal Loads Secrets

Kamal uses dotenv to automatically load environment variables from the configured secrets files.

- Common secrets across all destinations go in `.kamal/secrets-common`.
- Kamal looks for `.kamal/secrets-common` **first**, then `.kamal/secrets`, with later values overriding earlier ones.

### With destinations

If you are using destinations, Kamal looks for `.kamal/secrets-common` first, then `.kamal/secrets.<destination>`. The non-destination `.kamal/secrets` file is **not** read when a destination is selected.

| Scenario | Files read (in order) |
|----------|-----------------------|
| No destination | `.kamal/secrets-common`, then `.kamal/secrets` |
| Destination selected | `.kamal/secrets-common`, then `.kamal/secrets.<destination>` |

If you store secrets directly in `.kamal/secrets`, ensure that it is not checked into version control.

## Variable and Command Substitution

You can use variable or command substitution in the secrets file. This file can set variables like `KAMAL_REGISTRY_PASSWORD` or database passwords.

```shell
# .kamal/secrets
KAMAL_REGISTRY_PASSWORD=$KAMAL_REGISTRY_PASSWORD
RAILS_MASTER_KEY=$(cat config/master.key)
```

## Secret Helpers for Password Managers

Instead of storing values in plain text, you can fetch them from a password manager with the `kamal secrets` helpers, using command substitution in `.kamal/secrets`:

```shell
# .kamal/secrets
SECRETS=$(kamal secrets fetch ...)

REGISTRY_PASSWORD=$(kamal secrets extract REGISTRY_PASSWORD $SECRETS)
DB_PASSWORD=$(kamal secrets extract DB_PASSWORD $SECRETS)
```

### Subcommands

| Subcommand | Description |
|------------|-------------|
| `kamal secrets fetch` | Fetch secrets from a vault |
| `kamal secrets extract` | Extract a single secret from the results of a fetch call |
| `kamal secrets print` | Print the secrets (for debugging) |
| `kamal secrets help` | Describe subcommands or one specific subcommand |

### `kamal secrets fetch` options

| Option | Purpose |
|--------|---------|
| `--adapter` (`-a`) | The password-manager adapter to use |
| `--account` | The account to sign in with (ignored by some adapters) |
| `--from` | The vault, folder, item, or project to fetch from |

### Supported adapters

| Password manager | Adapter |
|------------------|---------|
| 1Password | `1password` |
| LastPass | `lastpass` |
| Bitwarden | `bitwarden` |
| Bitwarden Secrets Manager | `bitwarden-sm` |
| AWS Secrets Manager | `aws_secrets_manager` |
| Doppler | `doppler` |
| GCP Secret Manager | `gcp` |
| Passbolt | `passbolt` |

For per-adapter usage examples, see the **secrets** skill and the [kamal secrets docs](https://kamal-deploy.org/docs/commands/secrets/).

## Aliased Secrets Across Contexts

Alias secrets to other secrets with a `:` separator (`ENV_NAME:SECRET_NAME`). This is useful when the env name is the same in several places but the value differs by context.

For example, if `DB_PASSWORD` must resolve to a different secret depending on the role or accessory:

```shell
# .kamal/secrets
SECRETS=$(kamal secrets fetch ...)

MAIN_DB_PASSWORD=$(kamal secrets extract MAIN_DB_PASSWORD $SECRETS)
SECONDARY_DB_PASSWORD=$(kamal secrets extract SECONDARY_DB_PASSWORD $SECRETS)
```

```yaml
env:
  secret:
    - DB_PASSWORD:MAIN_DB_PASSWORD
  tags:
    secondary_db:
      secret:
        - DB_PASSWORD:SECONDARY_DB_PASSWORD
accessories:
  main_db_accessory:
    env:
      secret:
        - DB_PASSWORD:MAIN_DB_PASSWORD
  secondary_db_accessory:
    env:
      secret:
        - DB_PASSWORD:SECONDARY_DB_PASSWORD
```

Both `main_db_accessory` and `secondary_db_accessory` expose the env variable `DB_PASSWORD`, but each resolves to a different underlying secret.
