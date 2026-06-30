---
name: remove
description: Tear down a Kamal deployment with `kamal remove` — it removes the kamal-proxy, app, and accessory containers from your servers and logs out of the Docker registry, prompting for confirmation unless you pass `-y`. Covers full teardown plus removing components piece by piece with `kamal app remove`, `kamal accessory remove [NAME]`, `kamal proxy remove`, and `kamal registry logout`, and scoping a teardown to one environment with `-d/--destination`. Use when the user says "remove my deployment," "tear down the app," "kamal remove," "decommission this server," "uninstall Kamal from these hosts," "delete the proxy and accessory containers," "clean up the staging deploy," "nuke my Kamal setup," or "log out of the registry on my servers." For deploying or redeploying, see deploying. For managing running app containers, see app-operations. For accessory lifecycle and data, see accessories. For the kamal-proxy container, see proxy.
metadata:
  version: 1.0.0
---

# Removing a Kamal Deployment

You are an expert in deploying applications with Kamal. Your goal is to tear down a deployment cleanly — removing the kamal-proxy, app, and accessory containers from the servers and logging out of the Docker registry — while making sure the user is pointed at the right environment and understands that this is destructive.

## Before You Start

`kamal remove` is **destructive** and runs against your servers. Confirm what you are tearing down before running it.

Read the project's Kamal config first — it tells you which servers, roles, and destinations are in play, so you remove the right environment instead of everything:

- **`config/deploy.yml`** — the default config file. Defines your servers, roles, registry, and accessories.
- **`config/deploy.<destination>.yml`** — destination-specific config (for example `config/deploy.staging.yml`), selected with `-d, --destination`.
- **`.kamal/secrets`** — where deploy secrets (registry password, env secrets) are read from.

If the user only wants to retire one environment (say, staging) or one component (just an accessory), don't run a blanket `kamal remove` — scope it instead (see [Scoping the Teardown](#scoping-the-teardown) and [Removing Components Individually](#removing-components-individually)).

## What `kamal remove` Does

`kamal remove` removes the app, kamal-proxy, and accessory containers and logs out of the Docker registry. The CLI summarizes it as **"Remove kamal-proxy, app, accessories, and registry session from servers."**

It **prompts for confirmation** before doing anything. Add the `-y` option to skip the prompt — useful in scripts and CI.

| Flag | What it does |
|------|--------------|
| `-y` | Skip the confirmation prompt |

```bash
# Tear down the whole deployment, with a confirmation prompt
kamal remove

# Same, but skip the prompt (non-interactive / CI)
kamal remove -y
```

## Walk-Through: Tear Down a Deployment

```bash
# 1. Confirm which config/destination you're about to remove.
#    Read config/deploy.yml; for staging you'll target -d staging (see below).

# 2. Run remove. Kamal removes the kamal-proxy, app, and accessory
#    containers and logs out of the Docker registry on your servers.
kamal remove

# 3. Read the confirmation prompt carefully, then confirm.
#    In CI or scripts, pass -y to skip the prompt.
kamal remove -y
```

After it finishes, the proxy, app, and accessory containers are gone and the servers are logged out of the registry.

## Scoping the Teardown

`kamal remove` accepts Kamal's standard global flags, so you can aim it at a specific environment instead of everything:

| Flag | Short | What it does |
|------|-------|--------------|
| `--destination=DESTINATION` | `-d` | Use a destination config (`staging` → `config/deploy.staging.yml`) |
| `--config-file=CONFIG_FILE` | `-c` | Path to the config file (default `config/deploy.yml`) |
| `--hosts=HOSTS` | `-h` | Run only on these hosts (comma-separated, supports `*` wildcards) |
| `--roles=ROLES` | `-r` | Run only on these roles (comma-separated, supports `*` wildcards) |

```bash
# Tear down only the staging deployment
kamal remove -d staging

# Skip the prompt while removing staging
kamal remove -d staging -y
```

For the full list of global flags Kamal commands accept, see [references/teardown-commands.md](references/teardown-commands.md).

## Removing Components Individually

Sometimes you don't want a full teardown — you want to remove just one component, or remove **more** than the containers (an image, an accessory's data directory). Each component has its own `remove` subcommand, and each documents exactly what it deletes:

| Command | What it removes |
|---------|-----------------|
| `kamal app remove` | App containers **and images** from servers |
| `kamal accessory remove [NAME]` | The accessory container, **image, and data directory** from the host (use `NAME=all` for every accessory) |
| `kamal proxy remove` | The proxy container **and image** from servers |
| `kamal registry logout` | Logs out of the remote registry locally and remotely |

```bash
# Remove a single accessory (container, image, and its data directory)
kamal accessory remove mysql

# Remove every accessory
kamal accessory remove all

# Just the proxy container and image
kamal proxy remove

# Just log out of the registry on local and servers
kamal registry logout
```

### Heads-up: accessory data is deleted

`kamal accessory remove` deletes the accessory's **data directory** on the host along with the container and image. If that directory holds a database or other state you care about, **back it up first** — this is the most destructive of the remove subcommands. For how accessory data is mounted and persisted, see the **accessories** skill.

For the complete subcommand listings (including `kamal registry remove`) and every global flag, see [references/teardown-commands.md](references/teardown-commands.md).

## Quick Reference

| Goal | Command |
|------|---------|
| Tear down the whole deployment | `kamal remove` |
| Tear down without the prompt | `kamal remove -y` |
| Tear down a specific environment | `kamal remove -d staging` |
| Remove app containers and images | `kamal app remove` |
| Remove one accessory (incl. its data) | `kamal accessory remove NAME` |
| Remove all accessories | `kamal accessory remove all` |
| Remove the proxy container and image | `kamal proxy remove` |
| Log out of the registry | `kamal registry logout` |

## Related Skills

- **deploying**: For building and shipping deployments with `kamal deploy` / `kamal redeploy` — the inverse of tearing one down.
- **app-operations**: For managing running app containers (logs, exec, start/stop) with `kamal app` instead of removing them.
- **accessories**: For configuring, booting, and persisting accessory data — and exactly what `kamal accessory remove` deletes.
- **proxy**: For configuring and operating kamal-proxy, including `kamal proxy reboot` and `kamal proxy remove`.
