# Vault Adapters Reference

Full reference for the `kamal secrets` helpers — subcommands, options, and per-adapter `fetch` examples. The helpers read secrets from common password managers and secret stores, handling sign-in, password prompts, and efficient fetching. Use them inside `.kamal/secrets` with command substitution.

## Subcommands

| Command | Description |
|---------|-------------|
| `kamal secrets fetch [SECRETS...] --account=ACCOUNT -a, --adapter=ADAPTER` | Fetch secrets from a vault |
| `kamal secrets extract` | Extract a single secret from the results of a `fetch` call |
| `kamal secrets print` | Print the secrets (for debugging) |
| `kamal secrets help [COMMAND]` | Describe subcommands or one specific subcommand |

## Options

| Option | Alias | Purpose |
|--------|-------|---------|
| `--adapter` | `-a` | Which password manager / secret store to use |
| `--account` | | Which account to authenticate as (semantics vary per adapter; some adapters ignore it) |
| `--from` | | Scope to fetch from (vault, folder, item, or project, depending on adapter) |

## fetch → extract Pattern

Run `fetch` once to authenticate a single time and pull every needed secret, then `extract` each value from the captured output:

```shell
# .kamal/secrets

SECRETS=$(kamal secrets fetch ...)

REGISTRY_PASSWORD=$(kamal secrets extract REGISTRY_PASSWORD $SECRETS)
DB_PASSWORD=$(kamal secrets extract DB_PASSWORD $SECRETS)
```

---

## 1Password

Install and configure [the 1Password CLI](https://developer.1password.com/docs/cli/get-started/). Use the adapter `1password`.

```bash
# Fetch from item `MyItem` in the vault `MyVault`
kamal secrets fetch --adapter 1password --account myaccount --from MyVault/MyItem REGISTRY_PASSWORD DB_PASSWORD

# Fetch from sections of item `MyItem` in the vault `MyVault`
kamal secrets fetch --adapter 1password --account myaccount --from MyVault/MyItem common/REGISTRY_PASSWORD production/DB_PASSWORD

# Fetch from separate items MyItem, MyItem2
kamal secrets fetch --adapter 1password --account myaccount --from MyVault MyItem/REGISTRY_PASSWORD MyItem2/DB_PASSWORD

# Fetch from multiple vaults
kamal secrets fetch --adapter 1password --account myaccount MyVault/MyItem/REGISTRY_PASSWORD MyVault2/MyItem2/DB_PASSWORD

# All three of these will extract the secret
kamal secrets extract REGISTRY_PASSWORD <SECRETS-FETCH-OUTPUT>
kamal secrets extract MyItem/REGISTRY_PASSWORD <SECRETS-FETCH-OUTPUT>
kamal secrets extract MyVault/MyItem/REGISTRY_PASSWORD <SECRETS-FETCH-OUTPUT>
```

## LastPass

Install and configure [the LastPass CLI](https://github.com/lastpass/lastpass-cli). Use the adapter `lastpass`.

```bash
# Fetch passwords
kamal secrets fetch --adapter lastpass --account email@example.com REGISTRY_PASSWORD DB_PASSWORD

# Fetch passwords from a folder
kamal secrets fetch --adapter lastpass --account email@example.com --from MyFolder REGISTRY_PASSWORD DB_PASSWORD

# Fetch passwords from multiple folders
kamal secrets fetch --adapter lastpass --account email@example.com MyFolder/REGISTRY_PASSWORD MyFolder2/DB_PASSWORD

# Extract the secret
kamal secrets extract REGISTRY_PASSWORD <SECRETS-FETCH-OUTPUT>
kamal secrets extract MyFolder/REGISTRY_PASSWORD <SECRETS-FETCH-OUTPUT>
```

## Bitwarden

Install and configure [the Bitwarden CLI](https://bitwarden.com/help/cli/). Use the adapter `bitwarden`.

```bash
# Fetch passwords
kamal secrets fetch --adapter bitwarden --account email@example.com REGISTRY_PASSWORD DB_PASSWORD

# Fetch passwords from an item
kamal secrets fetch --adapter bitwarden --account email@example.com --from MyItem REGISTRY_PASSWORD DB_PASSWORD

# Fetch passwords from multiple items
kamal secrets fetch --adapter bitwarden --account email@example.com MyItem/REGISTRY_PASSWORD MyItem2/DB_PASSWORD

# Extract the secret
kamal secrets extract REGISTRY_PASSWORD <SECRETS-FETCH-OUTPUT>
kamal secrets extract MyItem/REGISTRY_PASSWORD <SECRETS-FETCH-OUTPUT>
```

## Bitwarden Secrets Manager

Install and configure [the Bitwarden Secrets Manager CLI](https://bitwarden.com/help/secrets-manager-cli/#download-and-install). Use the adapter `bitwarden-sm`.

```bash
# Fetch all secrets that the machine account has access to
kamal secrets fetch --adapter bitwarden-sm all

# Fetch secrets from a project
kamal secrets fetch --adapter bitwarden-sm MyProjectID/all

# Extract the secret
kamal secrets extract REGISTRY_PASSWORD <SECRETS-FETCH-OUTPUT>
```

## AWS Secrets Manager

Install and configure [the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html). Use the adapter `aws_secrets_manager`.

```bash
# Fetch a secret string from "myapp" that contains "REGISTRY_PASSWORD"
kamal secrets fetch --adapter aws_secrets_manager --account default myapp

# Both of these will fetch a secret string from "myapp/staging" that contains "REGISTRY_PASSWORD"
kamal secrets fetch --adapter aws_secrets_manager --account default myapp/staging
kamal secrets fetch --adapter aws_secrets_manager --account default --from myapp staging

# All three of these will extract the secret
kamal secrets extract REGISTRY_PASSWORD <SECRETS-FETCH-OUTPUT>
kamal secrets extract myapp/REGISTRY_PASSWORD <SECRETS-FETCH-OUTPUT>
kamal secrets extract myapp/staging/REGISTRY_PASSWORD <SECRETS-FETCH-OUTPUT>
```

**Note:** Set `--account` to your AWS CLI profile name, which is typically `default`. Ensure your AWS CLI is configured with the necessary permissions to access AWS Secrets Manager.

## Doppler

Install and configure [the Doppler CLI](https://docs.doppler.com/docs/install-cli). Use the adapter `doppler`.

```bash
# Fetch passwords
kamal secrets fetch --adapter doppler --from my-project/prd REGISTRY_PASSWORD DB_PASSWORD

# The project/config pattern is also supported in this way
kamal secrets fetch --adapter doppler my-project/prd/REGISTRY_PASSWORD my-project/prd/DB_PASSWORD

# Extract the secret
kamal secrets extract REGISTRY_PASSWORD <SECRETS-FETCH-OUTPUT>
kamal secrets extract DB_PASSWORD <SECRETS-FETCH-OUTPUT>
```

Doppler organizes secrets into "projects" (like `my-awesome-project`) and "configs" (like `prod`, `stg`). Use the pattern `project/config` when defining the `--from` option. The doppler adapter does not use `--account`; if given it is ignored.

## GCP Secret Manager

Install and configure the [gcloud CLI](https://cloud.google.com/sdk/gcloud/reference/secrets). Use the adapter `gcp`.

The `--account` flag selects an account configured in `gcloud`, and `--from` specifies the **GCP project ID**. The string `default` can be used with `--account` and `--from` to use `gcloud`'s default credentials and project, respectively. The `latest` version is used by default.

```bash
# Fetch a secret with an explicit project name, credentials, and secret version
kamal secrets fetch --adapter=gcp --account=default --from=default my-secret/latest

# The project name can be added as a prefix to the secret name instead of using --from
kamal secrets fetch --adapter=gcp --account=default default/my-secret/latest

# 'latest' is the default version, so it can be omitted
kamal secrets fetch --adapter=gcp --account=default default/my-secret

# With the default project, the prefix can be left out entirely
kamal secrets fetch --adapter=gcp --account=default my-secret

# Fetch multiple secrets from the project `my-project`
kamal secrets fetch --adapter=gcp --account=default --from=my-project my-secret another-secret

# Fetch from multiple projects, using `default` to refer to the default project
kamal secrets fetch --adapter=gcp --account=default default/my-secret my-project/another-secret

# Fetch a specific version (123) of `my-secret` in the default project
kamal secrets fetch --adapter=gcp --account=default default/my-secret/123

# Use non-default credentials
kamal secrets fetch --adapter=gcp --account=user@example.com my-secret

# Service account impersonation / delegation chains
kamal secrets fetch --adapter=gcp \
  --account="user@example.com|delegate@example.com,service-account@example.com" \
  my-secret
```

## Passbolt

Install and configure the [Passbolt CLI](https://github.com/passbolt/go-passbolt-cli). Use the adapter `passbolt`.

Passbolt organizes secrets into folders (like `coolfolder`), which can be nested (`coolfolder/prod`). Access secrets either with `--from` (`--from coolfolder`) or by prefixing the secret name with the folder path (`coolfolder/REGISTRY_PASSWORD`).

```bash
# Fetch passwords from root (no folder)
kamal secrets fetch --adapter passbolt REGISTRY_PASSWORD DB_PASSWORD

# Fetch passwords from a folder using --from
kamal secrets fetch --adapter passbolt --from coolfolder REGISTRY_PASSWORD DB_PASSWORD

# Fetch passwords from a nested folder using --from
kamal secrets fetch --adapter passbolt --from coolfolder/subfolder REGISTRY_PASSWORD DB_PASSWORD

# Fetch passwords by prefixing the folder path to the secret name
kamal secrets fetch --adapter passbolt coolfolder/REGISTRY_PASSWORD coolfolder/DB_PASSWORD

# Fetch passwords from multiple folders
kamal secrets fetch --adapter passbolt coolfolder/REGISTRY_PASSWORD otherfolder/DB_PASSWORD

# Extract the secret values
kamal secrets extract REGISTRY_PASSWORD <SECRETS-FETCH-OUTPUT>
kamal secrets extract DB_PASSWORD <SECRETS-FETCH-OUTPUT>
```

The passbolt adapter does not use `--account`; if given it is ignored.

---

Source: [kamal secrets](https://kamal-deploy.org/docs/commands/secrets/).
