---
name: ci-deploy
description: Set up continuous deployment so every push to main runs `kamal deploy` from GitHub Actions once the tests pass — for any stack Kamal ships (Rails, Next.js, Phoenix, Rust, static sites, and more). Use when the user says "auto-deploy on push," "deploy from GitHub Actions," "continuous deployment with Kamal," "deploy when CI passes," "set up CD," "stop deploying from my laptop," or "use 1Password in GitHub Actions." Covers the deploy ssh key, secrets in a GitHub environment or read from 1Password with a service account, the workflow, the GHA build cache, and verifying the first run. For running a deploy by hand, see deploy. For the secrets file itself, see secrets. For build cache options, see build.
metadata:
  version: 1.1.0
---

# CI Deploy

You are an expert in deploying Kamal apps from GitHub Actions. Your goal is a workflow that runs `kamal deploy` for exactly the commit that passed CI on `main`, with the fewest secrets possible, without changing how the user deploys by hand.

The pattern is the same for every stack: the runner does what the user's laptop does today. It checks out the code, gets the same inputs `.kamal/secrets` reads, loads an ssh key the server trusts, and runs `kamal deploy`. Only the inputs and the way Kamal is installed differ per stack (see [references/stacks.md](references/stacks.md)).

> **Grounding note:** Kamal facts here come from the [Kamal docs](https://kamal-deploy.org). GitHub Actions features (`workflow_run`, environments, `concurrency`, repository variables) and third-party actions (`webfactory/ssh-agent`, `ruby/setup-ruby`) are **GitHub conventions, not Kamal features**. Check GitHub's docs when in doubt. 1Password service accounts and `1password/install-cli-action` are **1Password conventions**; check 1Password's docs for those.

## Ground Rules

1. **Deploy by hand first.** `kamal setup` and at least one successful `kamal deploy` should already work from the user's machine. CI repeats a working deploy; it is a poor place to debug a first one.
2. **Change nothing about the local deploy.** Recreate the files `.kamal/secrets` reads instead of rewriting it, so `kamal deploy` keeps working from a laptop.
3. **Gate on tests.** Deploy only after the test workflow succeeds, and deploy the commit it tested, not whatever `main` points at later.
4. **One deploy at a time.** Kamal takes a deploy lock, and a second deploy fails fast while one runs ([lock docs](https://kamal-deploy.org/docs/commands/lock/)). Queue deploys in GitHub so they never collide.
5. **Use a dedicated deploy key.** Never upload the user's personal ssh key. Make one key for this job only, so it can be revoked alone.
6. **Confirm before touching the server or GitHub.** Adding a key to `authorized_keys` and uploading secrets change shared systems. Show the user what you'll do and get a yes.

## Before You Start

Read these before asking anything:

- **`config/deploy.yml`**: `servers` (hosts), `ssh.user` (default `root`) and `ssh.port` (default 22), `registry.server`, `builder.arch`, `proxy.app_port`, `proxy.healthcheck`, and any ERB that reads `ENV` (`<%= ENV[...] %>`).
- **`.kamal/secrets`** (and `secrets-common`, `secrets.<destination>`): list every input it reads. Each one is an environment variable, a file, or a password-manager command. Each becomes a GitHub secret.
- **`.kamal/hooks/`**: hooks run in CI too. A `pre-connect` or `pre-build` hook that checks for local files or a clean checkout must pass on the runner.
- **The existing test workflow** in `.github/workflows/`: its `name:` is what the deploy workflow waits for.
- **Any existing deploy workflow** (Heroku, Hatchbox, Render, and so on): it gets replaced, not run alongside.
- **The stack**: Ruby in the repo or not decides how Kamal is installed.

Ask the user only what the files can't tell you:

- Which branch deploys (usually `main`)?
- Should a person approve each deploy? (GitHub environments support required reviewers.)
- Is the repo private? Actions minutes are billed on private repos; a failed payment stops every job before it starts.

## Step 1: Inventory the Deploy Inputs

Build a table of everything the deploy reads from outside the repo. Example from a Rails app:

| Input | Read by | Becomes |
|---|---|---|
| `config/master.key` (file) | `.kamal/secrets`: `RAILS_MASTER_KEY=$(cat config/master.key)` | secret `RAILS_MASTER_KEY`, written back to the file |
| `.env` lines `POSTGRES_PASSWORD=` | `.kamal/secrets` via `grep` | secret `POSTGRES_PASSWORD`, written back into `.env` |
| `$KAMAL_REGISTRY_PASSWORD` (env var) | `.kamal/secrets` | secret, exported as an env var |
| `ENV["SOME_FLAG"]` in `deploy.yml` ERB | `config/deploy.yml` | repository **variable** if not secret |
| ssh access to the hosts | Kamal | secrets `KAMAL_SSH_PRIVATE_KEY` and `KAMAL_KNOWN_HOSTS` |

Watch for:

- **ERB in `deploy.yml` that reads the shell.** Values the user exports by habit before a deploy vanish in CI. An unset value often silently renders empty rather than failing. Give each one a repository variable or secret.
- **Secrets only accessories use.** `kamal deploy` does not reboot accessories, so their secrets (backup keys, for example) are usually not needed. Add them only if the deploy fails without them.
- **Password managers.** `kamal secrets fetch` adapters need their CLI and a login on the runner. For **1Password**, keep the adapter: install `op` on the runner and give it a read-only service account token, so the vault stays the only copy of each value and `.kamal/secrets` does not change. Follow [references/1password.md](references/1password.md); its inputs collapse to one row, `OP_SERVICE_ACCOUNT_TOKEN`. For other managers, it is usually simpler to store the values as GitHub secrets and skip the adapter in CI.
- **Registry.** With a local registry (`registry.server: localhost:5555`), Kamal starts a registry on the runner and pushes there, so no registry credentials are needed. With Docker Hub, GHCR, ECR, and similar, the registry password is one more secret.

## Step 2: Create the Deploy Key

On the user's machine (or have them run it):

```bash
ssh-keygen -t ed25519 -N "" -C "<app>-github-deploy" -f ./deploy_key
ssh-keyscan -t ed25519,rsa,ecdsa <host> > ./known_hosts
ssh-keygen -lf ./known_hosts                # fingerprints just scanned
ssh-keygen -F <host> -l                     # fingerprints the user already trusts
```

**The fingerprints must match** what the user's own `known_hosts` holds. A mismatch means the scan did not reach the real server. Stop and investigate.

Add `deploy_key.pub` to `~/.ssh/authorized_keys` for the `ssh.user` on **every** host in `servers` (and accessory hosts if the deploy touches them). Then test it on each host with only that key:

```bash
ssh -o IdentitiesOnly=yes -i ./deploy_key <user>@<host> 'docker ps --format "{{.Names}}" | head -3'
```

Also confirm the runner can reach ssh at all: GitHub-hosted runners come from public IPs. A host that only allows ssh over a VPN or tailnet needs a self-hosted runner or a VPN step first. Check with the **server-hardening** skill before opening a port.

## Step 3: Store the Secrets in a GitHub Environment

With 1Password, the only deploy secret besides the ssh key and known hosts is `OP_SERVICE_ACCOUNT_TOKEN` ([references/1password.md](references/1password.md), Step 3). Everything else below still applies.

Put the deploy secrets in a GitHub **environment** (for example `production`), not in repository secrets. Only jobs that declare `environment: production` can read them, so test jobs never see production keys. This matters when a test workflow already references a secret with the same name (a test job using `secrets.RAILS_MASTER_KEY` would otherwise get the production key).

With the GitHub CLI, feed every value through stdin so it never appears in a command line or log:

```bash
gh api -X PUT repos/<owner>/<repo>/environments/production
gh secret set KAMAL_SSH_PRIVATE_KEY --env production < ./deploy_key
gh secret set KAMAL_KNOWN_HOSTS     --env production < ./known_hosts
gh secret set RAILS_MASTER_KEY      --env production < config/master.key
grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2- | tr -d '\n' | gh secret set POSTGRES_PASSWORD --env production
gh variable set SOME_FLAG --body "value"     # non-secret deploy.yml inputs
```

Lock the environment to the deploy branch:

```bash
gh api -X PUT repos/<owner>/<repo>/environments/production --input - <<'EOF'
{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}
EOF
gh api -X POST repos/<owner>/<repo>/environments/production/deployment-branch-policies -f name=main -f type=branch
```

Then **delete the local `deploy_key`**. GitHub now holds the only copy of the private key.

## Step 4: Write the Workflow

Use the template in [references/workflow-template.md](references/workflow-template.md). Its shape:

1. **Trigger** on `workflow_run` of the test workflow, `types: [completed]`, `branches: [main]`.
2. **Run only if** `conclusion == 'success'` and the triggering event was a `push`. Without the second check, a passing pull-request run whose head branch is `main` on a fork could start a deploy.
3. **`concurrency`** with `cancel-in-progress: false`, so a push mid-deploy waits instead of killing a deploy halfway.
4. **`environment: production`** to unlock the secrets.
5. **Check out** `github.event.workflow_run.head_sha`, the commit CI tested. Kamal tags the image with the checked-out Git version, so the running container names show which commit is live.
6. **Install Kamal** for the stack ([references/stacks.md](references/stacks.md)).
7. **Expose the GitHub runtime** for the build cache (Step 5).
8. **Load the ssh key** into an agent and append `KAMAL_KNOWN_HOSTS` to `~/.ssh/known_hosts`.
9. **Write the input files** `.kamal/secrets` reads, with `umask 077`. Keep them git-ignored, so the checkout stays clean.
10. **With 1Password:** install the `op` CLI and pass `OP_SERVICE_ACCOUNT_TOKEN` to the deploy step only ([references/1password.md](references/1password.md), Step 4).
11. **Run `kamal deploy`** (`bin/kamal deploy` in a Rails app).

If the repo has no test workflow, trigger on `push` to `main` instead and say plainly that nothing gates the deploy. If the team runs tests locally and signs off with gh-signoff, the opt-in **local-ci-deploy** skill can trigger the deploy on a green signoff instead.

## Step 5: Add the Build Cache

Every runner starts empty, so without a cache each deploy rebuilds the whole image. Kamal supports the GitHub Actions cache ([builder examples](https://kamal-deploy.org/docs/configuration/builder-examples/#using-multistage-builder-cache)):

```yaml
# config/deploy.yml
builder:
  arch: amd64
<% if ENV["GITHUB_ACTIONS"] %>
  cache:
    type: gha
    options: mode=max
<% end %>
```

- The `gha` cache only works inside GitHub Actions, so wrap it in ERB on `GITHUB_ACTIONS` (GitHub sets it on every runner). Local deploys then build exactly as before.
- The Kamal docs pair it with `docker/setup-buildx-action` and `crazy-max/ghaction-github-runtime` in the workflow. The runtime action exposes the cache credentials Docker needs.
- `mode=max` caches intermediate stages too, which pays off for multistage builds (Rust, Next.js, Phoenix releases, Rails asset compilation).
- The other cache type Kamal supports is `registry`, which pushes cache layers to the registry. Use it when the registry is remote and you want laptop and CI deploys to share one cache.

Reference timing from a Rails app: the first CI deploy, with an empty cache, took 6m21s. The next one took 1m23s.

**Architecture:** GitHub's standard runners are amd64. If `builder.arch` is `arm64`, use an arm64 runner (GitHub offers `ubuntu-24.04-arm`) or a `builder.remote` arm64 builder. Building arm64 under emulation on an amd64 runner is very slow.

## Step 6: Ship It and Verify

1. Commit the workflow, the `deploy.yml` change, and a docs note in one commit. Tell the user that pushing it will itself trigger a deploy once CI passes.
2. Watch both runs:

   ```bash
   gh run list -w CI -L 1
   gh run watch <ci-run-id> --exit-status
   gh run list -w Deploy -L 1
   gh run watch <deploy-run-id> --exit-status
   ```

3. Verify on the server, not just in the Actions log:

   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' https://<host>/up
   kamal app details          # container names carry the deployed version
   ```

   The version in the container names must equal the commit SHA that was pushed.

4. Read the run's annotations. Deprecation warnings about action runtimes (for example "Node.js 20 is deprecated") mean an action needs a version bump; check each action's releases for the current major.

## Step 7: Document It

Add a short "Continuous deployment" section to the app's deploy docs (and its `AGENTS.md` or `CLAUDE.md` if it has one) covering:

- That a push to the deploy branch **deploys production**. Agents working in the repo must know a push is a deploy.
- The secrets and variables table, and that **changing a local secret means updating the GitHub secret too**, or the next CI deploy ships the old value. With 1Password, say instead that the vault is the source of truth and a changed value needs no GitHub update.
- How to skip a deploy (`[skip ci]` in the commit message skips the test workflow, so the deploy never triggers).
- How to revoke access: remove the `<app>-github-deploy` line from `authorized_keys`.
- That `kamal deploy` from a laptop still works, for hotfixes or when Actions is down.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Every job fails in ~2s with "recent account payments have failed or your spending limit needs to be increased" | GitHub billing on a private repo | Fix billing, then `gh run rerun <ci-run-id>`. The deploy run shows `skipped`, which is correct. |
| Deploy run shows `skipped` | CI failed, or the trigger was not a push | Check the CI run; that's the gate working. |
| `Permission denied (publickey)` | Key not in `authorized_keys` for `ssh.user` on that host, or secret has a trailing-newline problem | Re-test with `ssh -i` locally; re-upload the key with `<` redirection, not `echo`. |
| `Host key verification failed` | `KAMAL_KNOWN_HOSTS` missing or stale | Rescan, compare fingerprints, update the secret. |
| Healthcheck fails only in CI | A secret written empty, or an ERB env value missing | Compare the secret list to Step 1's inventory; check repository variables. |
| A hook fails in CI | Hook checks local-only state | Make the hook pass on a clean runner (files written in step 9 of the workflow). |
| Deploy waits or fails on the lock | A previous deploy died holding the lock | `kamal lock status`, then `kamal lock release` once you're sure nothing is deploying. |
| A 1Password fetch fails only in CI | Service account cannot see the vault, or the token is missing on the Deploy step | See the troubleshooting table in [references/1password.md](references/1password.md). |
| Build is slow every time | Cache not configured or runtime not exposed | Step 5; look for cache entries in the repo's Actions caches page. |

## Related Skills

- **deploy**: what `kamal deploy` does, and deploying by hand.
- **secrets**: `.kamal/secrets`, substitution, password-manager adapters, and moving file-based secrets into 1Password.
- **build**: builder options, remote builders, and cache types.
- **registry**: local registry versus Docker Hub, GHCR, ECR.
- **ssh**: the ssh user, port, and proxy settings Kamal connects with.
- **hooks**: hooks run on the runner too.
- **server-hardening**: before opening ssh to GitHub's runners.
- **local-ci-deploy**: opt-in. Deploy on a green gh-signoff status instead of a test workflow, or refuse unsigned commits in a `pre-deploy` hook.
