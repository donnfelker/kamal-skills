---
name: deploy
description: Run Kamal deploys end to end — a full `kamal deploy` (build, push, pull, boot, health-check on GET /up, zero-downtime cutover via kamal-proxy, then prune) and a faster `kamal redeploy` that skips bootstrapping, kamal-proxy startup, pruning, and registry login. Covers targeting with `--hosts`, `--roles`, `--version`, and `--primary`, plus `--skip-push` and `--skip-hooks`, and managing the deploy lock with `kamal lock acquire/release/status` and `--lock-wait`/`--lock-wait-timeout`/`--lock-wait-interval`. Use when the user says "deploy my app," "kamal deploy," "ship a release," "push to production," "redeploy," "deploy only to web/workers," "deploy a specific version," "skip the build," "skip hooks," "the deploy lock is stuck," or "lock deploys for a maintenance window." For building and pushing images, see build. For pre/post-deploy scripts, see hooks. For reverting a bad release, see rollback. For managing already-running containers, see app.
metadata:
  version: 1.0.0
---

# Deploying with Kamal

You are an expert in deploying applications with Kamal. Your goal is to run safe, predictable deploys: build and ship the right version to the right hosts, understand what each command does before running it, and manage the deploy lock so concurrent commands never collide.

## Before You Start

Read the project's Kamal config before asking the user questions — it tells you the roles, hosts, and destinations you can target.

- **`config/deploy.yml`** — the default config file. It defines your servers, roles, registry, and build settings.
- **`config/deploy.<destination>.yml`** — destination-specific config (for example `config/deploy.staging.yml`), selected with `-d, --destination`.
- **`.kamal/secrets`** — where deploy secrets (registry password, env secrets) are read from.

Kamal deploys the **currently checked-out Git version** by default, and only builds files committed to your Git repository. Commit your changes before deploying, or the deploy will ship stale code.

## What `kamal deploy` Does

`kamal deploy` builds and deploys your app to all servers, using [kamal-proxy](https://github.com/basecamp/kamal-proxy) to move traffic from the old version to the new one without downtime. The sequence is:

1. Log in to the Docker registry locally and on all servers.
2. Build the app image, push it to the registry, and pull it onto the servers.
3. Ensure kamal-proxy is running and accepting traffic on ports 80 and 443.
4. Start a new container with the version matching the current Git version hash.
5. Tell kamal-proxy to route traffic to the new container once it responds with `200 OK` to `GET /up` on port 80.
6. Stop the old container running the previous version.
7. Prune unused images and stopped containers so servers don't fill up.

If `GET /up` never returns `200 OK`, traffic is not cut over to the new container — your health-check endpoint is what makes the deploy safe.

## Walk-Through: A Standard Deploy

```bash
# 1. Make sure the version you want to ship is committed and checked out.
git status

# 2. Deploy the checked-out version to all servers.
kamal deploy

# 3. Watch the output. Kamal builds, pushes, pulls, boots the new
#    container, waits for GET /up, cuts traffic over, and prunes.
```

The deploy takes a lock automatically while it runs (see [Managing the Deploy Lock](#managing-the-deploy-lock)). If another deploy is already running, it fails immediately unless you pass `--lock-wait`.

**First deploy to a fresh server?** Use [`kamal setup`](https://kamal-deploy.org/docs/commands/setup/) instead — it installs Docker, boots accessories, and then runs the deploy. `kamal redeploy` can only be used after `kamal deploy` has succeeded at least once.

## Targeting Hosts, Roles, and Versions

By default a deploy runs against **all** hosts and roles. Narrow it with these flags:

| Flag | Short | What it does |
|------|-------|--------------|
| `--hosts=HOSTS` | `-h` | Run only on these hosts (comma-separated, supports `*` wildcards) |
| `--roles=ROLES` | `-r` | Run only on these roles (comma-separated, supports `*` wildcards) |
| `--primary` | `-p` | Run only on the primary host instead of all |
| `--version=VERSION` | | Run commands against a specific app version |
| `--destination=DESTINATION` | `-d` | Use a destination config (`staging` → `config/deploy.staging.yml`) |

```bash
# Deploy only the web role
kamal deploy --roles=web

# Deploy to a subset of hosts by wildcard
kamal deploy --hosts='web-*'

# Deploy to the staging destination
kamal deploy -d staging
```

`--version` runs the command against a specific app version rather than the checked-out Git hash. To roll back to a previous image instead, use the rollback skill.

## Faster Iterations: `kamal redeploy`

`kamal redeploy` deploys your app but **skips** bootstrapping servers, starting kamal-proxy, pruning, and registry login:

```bash
kamal redeploy
```

Use it for repeat deploys to servers that are already set up and already have kamal-proxy running — it's quicker because it does less. You must have run `kamal deploy` at least once first. `redeploy` accepts the same targeting flags as `deploy`.

## Skipping the Build or Hooks

| Flag | Short | What it does | Default |
|------|-------|--------------|---------|
| `--skip-push` | `-P` | Skip the image build and push (deploy an already-built image) | `false` |
| `--skip-hooks` | `-H` | Don't run hooks | `false` |

```bash
# Image is already built and pushed — just roll it out
kamal deploy --skip-push

# Deploy without running pre/post-deploy hooks
kamal deploy --skip-hooks
```

`--skip-push` is useful when the image for this version already exists in the registry (for example, built earlier in CI). For what hooks run and when, see the hooks skill.

For the full `kamal deploy` option list — including `--verbose`, `--quiet`, and `--config-file` — see [references/deploy-options.md](references/deploy-options.md).

## Managing the Deploy Lock

Commands that are unsafe to run concurrently take a **deploy lock** while they run. The lock is an atomically created directory in the `.kamal` directory on the **primary server**. Use `kamal lock` to inspect or manage it directly — for clearing a leftover lock from a failed command, or to block deploys during a maintenance window.

| Subcommand | What it does |
|------------|--------------|
| `kamal lock status` | Report lock status |
| `kamal lock acquire -m, --message=MESSAGE` | Acquire the deploy lock |
| `kamal lock release` | Release the deploy lock |

```bash
# See whether a lock is held
kamal lock status

# Block deploys during a maintenance window
kamal lock acquire -m "Maintenance in progress"

# Clear the lock when you're done
kamal lock release
```

When a lock is held, `kamal lock status` reports who holds it, the version, and the message:

```
Locked by: Deployer at 2024-04-05T08:32:46Z
Version: 75bf6fa40b975cbd8aec05abf7164e0982f185ac
Message: Maintenance in progress
```

### Waiting for the Lock

`kamal deploy` and other commands that take the lock automatically **fail immediately** if the lock is already held. Pass `--lock-wait` to make them poll and retry until it's released:

```bash
kamal deploy --lock-wait
```

`--lock-wait` only waits on locks another command took **automatically** while running. A lock set manually with `kamal lock acquire` is **not** waited on — the command fails immediately with `Deploy lock held manually, not waiting`. This is by design: a manual lock means "humans, stay out."

Tune the wait with:

| Flag | Default | What it does |
|------|---------|--------------|
| `--lock-wait-timeout` | `900` | Maximum seconds to wait before giving up |
| `--lock-wait-interval` | `15` | Seconds between polls |

```bash
kamal deploy --lock-wait --lock-wait-timeout 300 --lock-wait-interval 10
```

For the full lock reference and worked example, see [references/lock-reference.md](references/lock-reference.md).

## Quick Reference

| Goal | Command |
|------|---------|
| Full deploy of the checked-out version | `kamal deploy` |
| Faster repeat deploy (skip bootstrap/proxy/prune/login) | `kamal redeploy` |
| Deploy one role only | `kamal deploy --roles=web` |
| Deploy a subset of hosts | `kamal deploy --hosts='web-*'` |
| Deploy to staging | `kamal deploy -d staging` |
| Deploy without rebuilding | `kamal deploy --skip-push` |
| Deploy without hooks | `kamal deploy --skip-hooks` |
| Wait instead of failing on a busy lock | `kamal deploy --lock-wait` |
| Check / set / clear the deploy lock | `kamal lock status` / `acquire -m` / `release` |

## Related Skills

- **build**: For building and pushing app images (`kamal build`), which `kamal deploy` and `kamal redeploy` call indirectly.
- **hooks**: For the pre/post-deploy scripts that run during a deploy and how `--skip-hooks` affects them.
- **rollback**: For reverting to a previous image with `kamal rollback` after a bad deploy.
- **app**: For managing already-running containers — logs, exec, maintenance mode, and start/stop with `kamal app`.
