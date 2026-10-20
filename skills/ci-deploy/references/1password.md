# 1Password in CI

Use this when the deploy secrets live in 1Password. The values stay in the vault, `.kamal/secrets` reads them at deploy time, and the same file works on a laptop and on the runner. GitHub stores one 1Password token instead of a copy of every secret, so a changed password never has to be re-uploaded to GitHub.

> **Grounding note:** The Kamal parts come from the Kamal docs: the `1password` adapter, `--account` and `--from`, fetch then extract, and command substitution in `.kamal/secrets` ([secrets command](https://kamal-deploy.org/docs/commands/secrets/), [environment variables](https://kamal-deploy.org/docs/configuration/environment-variables/#secrets)). Error messages quoted in Troubleshooting come from the Kamal source. Service accounts, `OP_SERVICE_ACCOUNT_TOKEN`, vault limits, and `1password/install-cli-action` are **1Password conventions, not Kamal features**. Check [1Password's service account docs](https://www.1password.dev/service-accounts/use-with-1password-cli/) when in doubt.

## How It Works

| Where | How `op` signs in | What `.kamal/secrets` does |
|---|---|---|
| Laptop | The user's own 1Password account (desktop app or `op signin`) | `kamal secrets fetch --adapter 1password ...` |
| Runner | A **service account** token in `OP_SERVICE_ACCOUNT_TOKEN` (1Password convention) | The same line, unchanged |

Kamal's secret helpers "handle signing in" and are run through command substitution in `.kamal/secrets` (Kamal docs). Kamal does not know about the token. It runs the `op` CLI, and `op` reads the token from the environment (1Password convention).

## Step 1: Put the Secrets in a Shareable Vault

A service account **cannot** be given access to the built-in Personal, Private, or Employee vault, or the default Shared vault (1Password docs). Keep deploy secrets in a dedicated vault, for example `Deploy`.

- One item per app (for example `myapp-production`), one field per secret, with the field **label equal to the secret name** (`KAMAL_REGISTRY_PASSWORD`, `RAILS_MASTER_KEY`), since the names passed to `kamal secrets fetch` are the field names it reads.
- If the values sit in a Private vault today, move the item first. The **secrets** skill covers moving file-based secrets into a vault.

## Step 2: Point `.kamal/secrets` at the Vault

Fetch once, then extract each value (Kamal docs):

```shell
# .kamal/secrets
SECRETS=$(kamal secrets fetch --adapter 1password --account <account> \
  --from Deploy/myapp-production KAMAL_REGISTRY_PASSWORD RAILS_MASTER_KEY DB_PASSWORD)

KAMAL_REGISTRY_PASSWORD=$(kamal secrets extract KAMAL_REGISTRY_PASSWORD $SECRETS)
RAILS_MASTER_KEY=$(kamal secrets extract RAILS_MASTER_KEY $SECRETS)
DB_PASSWORD=$(kamal secrets extract DB_PASSWORD $SECRETS)
```

- **Keep `--account`.** The docs list it as part of `kamal secrets fetch --account=ACCOUNT`, and the `1password` adapter refuses to fetch without it. Use the account the user signs in to locally (for example `my.1password.com` or the account shorthand). The same value goes to the runner unchanged.
- **One fetch per item, not one per secret.** Kamal's docs show fetching once and extracting each value. That also cuts requests against the service account's hourly and daily rate limits (1Password docs).
- If `.kamal/secrets` already fetches from 1Password and deploys work locally, leave it alone (Ground Rule 2). Only check that the vault qualifies for Step 1.
- With destinations, the fetch goes in `.kamal/secrets-common` or `.kamal/secrets.<destination>` instead (Kamal docs).

Run `kamal deploy` (or `kamal secrets print` to see what Kamal resolved) from the laptop before going further. `print` writes every secret to the terminal, so don't run it while screen sharing or recording.

## Step 3: Create a Read-Only Service Account

The user creates this, not the agent. It needs permission to create service accounts (owners and admins by default), and the token is shown **only once** (1Password docs). Either:

- **Web:** 1Password.com → Developer → Directory → Other (under Infrastructure Secrets Management) → Create a Service Account. Grant **read** on the `Deploy` vault only.
- **CLI:** `op service-account create "myapp-github-deploy" --vault Deploy:read_items`

Notes (1Password conventions):

- Vault access **cannot be changed after creation**. If a vault is missing, make a new service account.
- Give it read access only. CI never writes secrets.
- Have the user save the token as a new item in their own 1Password, then upload it without it touching the shell history:

  ```bash
  gh secret set OP_SERVICE_ACCOUNT_TOKEN --env production   # prompts for the value
  ```

**Test the token locally before pushing**, so a wrong vault or permission shows up here and not in Actions. With the token set, `op` uses the service account instead of the user's own sign-in (1Password convention), so this is the same view the runner gets:

```bash
read -rs OP_SERVICE_ACCOUNT_TOKEN && export OP_SERVICE_ACCOUNT_TOKEN   # paste the token; nothing echoes or hits history
op item get myapp-production --vault Deploy --fields label=DB_PASSWORD > /dev/null && echo ok
kamal secrets fetch --adapter 1password --account <account> --from Deploy/myapp-production DB_PASSWORD > /dev/null && echo ok
unset OP_SERVICE_ACCOUNT_TOKEN
```

Both should print `ok`. Output goes to `/dev/null` so no value lands on screen.

## Step 4: Add Two Things to the Workflow

Starting from [workflow-template.md](workflow-template.md):

1. **Install the `op` CLI** on the runner (Kamal's docs: "First, install and configure the 1Password CLI"). 1Password publishes an action for it:

   ```yaml
         - name: Install the 1Password CLI
           uses: 1password/install-cli-action@v4
   ```

2. **Give only the deploy step the token:**

   ```yaml
         - name: Deploy
           env:
             OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
           run: bin/kamal deploy        # "kamal deploy" when installed with gem install
   ```

Then remove what 1Password now provides:

- Delete the per-secret lines from the job's `env:` block (`KAMAL_REGISTRY_PASSWORD`, and so on) and the "Write the deploy inputs" step, for every value `.kamal/secrets` now fetches.
- Delete the matching GitHub secrets (`gh secret delete <NAME> --env production`) once the first 1Password deploy succeeds. Stale copies in GitHub are how an old password comes back.

The environment then holds only `KAMAL_SSH_PRIVATE_KEY`, `KAMAL_KNOWN_HOSTS`, and `OP_SERVICE_ACCOUNT_TOKEN`, plus anything `.kamal/secrets` still reads from outside 1Password.

**Why not `1password/load-secrets-action`?** It copies values into GitHub environment variables, so `.kamal/secrets` would have to read `$VAR` in CI and fetch from 1Password locally. That breaks Ground Rule 2. Letting Kamal's own helper fetch keeps one `.kamal/secrets` for both.

## Rotating Secrets

- **A secret value:** change it in 1Password. The next deploy, from a laptop or CI, picks it up. Nothing to update in GitHub.
- **The service account token:** rotate it in 1Password (Developer → Service accounts → Rotate Token keeps the same permissions and lets you choose when the old token expires), then `gh secret set OP_SERVICE_ACCOUNT_TOKEN --env production`. Create a new service account only to change its vault access.
- Note in the app's deploy docs (Step 7 of the skill) that 1Password is the source of truth, and that an item rename or field relabel breaks the next deploy.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `1Password CLI is not installed` | No `op` on the runner | Add the install step before Deploy. |
| `kamal secrets extract` fails with a JSON parse or argument error, and the output mentions `No value provided for required options '--account'` | `--account` was dropped from the fetch. `fetch` prints that message and exits 0, so `$SECRETS` holds it instead of JSON | Put `--account` back. This fails locally too. |
| `Failed to login to 1Password` | `OP_SERVICE_ACCOUNT_TOKEN` missing or invalid in the deploy step (secret not set, wrong environment, set on another step, or token expired) | Check the secret is in the `production` environment and on the Deploy step's `env:`. |
| `Could not read <fields> from <item> in the <vault> 1Password vault` | The service account cannot see the vault (never granted, or an admin turned off service account access for it), the item name is wrong, or a field label differs from the secret name | Test locally with the token (Step 3). Vault access is fixed at creation, so a missing vault means a new service account. |
| Works locally, fails only in CI | Locally `op` uses the user's account, which can see vaults the service account cannot | Run the Step 3 local token test. |
| Rate-limit errors | Many fetches per deploy, or many deploys | One `fetch` per item; check usage with `op service-account ratelimit` (1Password convention). |
