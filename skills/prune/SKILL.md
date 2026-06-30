---
name: prune
description: Prune old Kamal containers and images and control how many Kamal keeps around. Kamal retains the last 5 deployed containers and the images they use; everything older is removed. Use when the user says "prune old images," "clean up old containers," "my servers are running out of disk," "free up space on my servers," "remove unused Docker images," "kamal prune," "how many old releases does Kamal keep," or "change how many containers I keep." Covers `kamal prune all`, `kamal prune containers`, `kamal prune images`, and tuning retention with the `retain_containers` config key (default 5). For running a full deploy, which prunes automatically at the end, see deploy. For inspecting and managing already-running app containers, see app.
metadata:
  version: 1.0.0
---

# Pruning with Kamal

You are an expert in deploying applications with Kamal. Your goal is to keep servers from filling up with old container and image layers — by understanding what Kamal prunes automatically, running a manual prune when you need to reclaim space, and tuning how many old releases Kamal keeps.

## Before You Start

Read the project's Kamal config before asking the user questions — it tells you how many releases this app retains.

- **`config/deploy.yml`** — the default config file. Look for a `retain_containers:` setting; if it's absent, Kamal uses the default.
- **`config/deploy.<destination>.yml`** — destination-specific config (for example `config/deploy.staging.yml`).

## What Kamal Prunes

Kamal keeps the **last 5 deployed containers** and the **images they are using**. Pruning deletes all older containers and images.

This retention is what makes pruning safe: the most recent releases stay on your servers, so you can still inspect or roll back to them, while stale layers that nothing references get cleaned away to reclaim disk.

## When Pruning Happens

You usually don't run pruning by hand. It is wired into the deploy flow:

- **`kamal deploy`** prunes unused images and stopped containers at the **end** of every deploy, so servers don't fill up over time.
- **`kamal redeploy`** **skips** pruning (along with bootstrapping, starting kamal-proxy, and registry login) to be faster.

Run a manual prune when you've been redeploying repeatedly, are running low on disk, or want to clean up on demand between deploys.

## Walk-Through: Pruning Manually

### Step 1 — Decide what to reclaim

- Old **stopped containers** and **unused images** together → `kamal prune all`
- Only **unused images** → `kamal prune images`
- Only old **stopped containers** → `kamal prune containers`

### Step 2 — Run the prune

```bash
# Most common: clean up both unused images and stopped containers
kamal prune all
```

Kamal keeps the last 5 deployed containers and the images they use, so this only removes layers older than your retention window.

### Step 3 — Target images or containers individually

```bash
# Remove only unused images
kamal prune images

# Remove only stopped containers, keeping the last n (default 5)
kamal prune containers
```

## Prune Subcommands

`kamal prune` is a command group. Running it on its own lists the available subcommands rather than pruning anything — call a subcommand to act:

| Command | What it prunes |
|---------|----------------|
| `kamal prune all` | Unused images and stopped containers |
| `kamal prune containers` | Stopped containers, except the last n (default 5) |
| `kamal prune images` | Unused images |
| `kamal prune help [COMMAND]` | Describe subcommands, or one specific subcommand |

For the full subcommand reference and how pruning ties into `kamal deploy`, see [references/prune-commands.md](references/prune-commands.md).

## Controlling Retention with `retain_containers`

The number of old containers and images Kamal keeps is configurable. Set `retain_containers` in `config/deploy.yml`:

```yaml
# Keep only the last 3 old containers and images instead of the default 5
retain_containers: 3
```

| Config key | Default | What it controls |
|------------|---------|------------------|
| `retain_containers` | `5` | How many old containers and images Kamal retains |

Lower it to reclaim disk more aggressively; raise it if you want more previous releases available on the servers. This is the `n` that `kamal prune containers` honors ("except the last n").

## Quick Reference

| Goal | Command / Config |
|------|------------------|
| Clean up unused images and stopped containers | `kamal prune all` |
| Remove only unused images | `kamal prune images` |
| Remove only stopped containers (keep last n) | `kamal prune containers` |
| List the prune subcommands | `kamal prune` |
| Keep fewer / more old releases | `retain_containers: N` in `config/deploy.yml` |
| Prune automatically | Run `kamal deploy` (prunes at the end) |

## Related Skills

- **deploy**: For running `kamal deploy` (which prunes unused images and stopped containers at the end) and `kamal redeploy` (which skips pruning).
- **app**: For inspecting and managing already-running app containers with the `kamal app` subcommands before or after you prune.
