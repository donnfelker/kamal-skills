---
name: cron
description: Run recurring, scheduled, or cron jobs on a Kamal deployment. Use when the user says "run a cron job," "schedule a recurring task," "nightly job," "hourly job," "periodic task," "set up cron with Kamal," "scheduled jobs," "run cron in a container," or asks how to keep a crontab running on their servers. Covers defining a dedicated `cron` role under the `servers:` key with a `cmd` that loads a `config/crontab` file and runs `cron -f`, and propagating environment variables into the crontab (cron does not pass them through on its own). For configuring web and worker job roles or targeting hosts/roles, see servers. For running databases, Redis, or other supporting services, see accessories. For setting `env:` values and secrets the jobs need, see env.
metadata:
  version: 1.0.0
---

# Cron

You are an expert in running recurring and scheduled jobs on Kamal deployments. Your goal is to get a reliable crontab running in its own container, with the environment variables your jobs need.

## How cron works in Kamal

Kamal does not have a dedicated cron command. Instead, you run cron jobs in a **dedicated container** defined as a role under the `servers:` key. That container runs the system cron daemon in the foreground (`cron -f`) and loads its schedule from a `config/crontab` file in your app.

Because it is a separate role, the cron container:

- Runs the **same image as the rest of your app**, so your application code and binaries are available to scheduled commands.
- Runs on whatever host(s) you assign to it, independent of your web servers.
- Is **not** the primary role, so by default it does **not** sit behind the Kamal proxy — cron does not serve web traffic.

Two facts drive the whole setup:

1. The schedule lives in `config/crontab`.
2. **Cron does not automatically propagate environment variables.** You must copy them into the crontab yourself, which the boot command below does.

## Before you begin

If the project is already set up, read what exists before asking questions:

- **`config/deploy.yml`** — see whether a `servers:` block uses a plain host list or named roles, and whether a `cron` role already exists.
- **`config/crontab`** — see whether a schedule file is already present.
- **`.kamal/secrets`** and the `env:` block — note which variables your jobs will need (see [env](../env/SKILL.md)).

## Step 1: Create config/crontab

Add a `config/crontab` file to your repo with the jobs you want to run. This uses **standard Unix cron syntax** (not Kamal-specific):

```
# config/crontab
# ┌ minute  ┌ hour  ┌ day-of-month  ┌ month  ┌ day-of-week
# │         │       │               │        │
  0  2      *       *               *          cd /rails && bin/rails db:cleanup
  */15 *    *       *               *          cd /rails && bin/rails reports:refresh
```

Each line runs inside your app's container, so use the same commands you would run there. Commit this file — Step 2's boot command reads it with `cat config/crontab` **inside the container**, so it must be baked into your app image.

For a refresher on the schedule fields and more examples, see [references/cron-role-config.md](references/cron-role-config.md).

## Step 2: Add a cron role to config/deploy.yml

Define a `cron` role under `servers:` with the hosts to run on and the boot command from the Kamal docs:

```yaml
servers:
  cron:
    hosts:
      - 192.168.0.1
    cmd:
      bash -c "(env && cat config/crontab) | crontab - && cron -f"
```

This assumes the cron settings are stored in `config/crontab`.

If your `servers:` block is currently just a plain list of hosts (the implicit `web` role), you will need to convert it to named roles to add `cron` alongside `web`. See [servers](../servers/SKILL.md).

### What the boot command does

The `cmd` is the heart of the setup. Read left to right:

| Part | What it does |
|------|--------------|
| `env` | Prints the container's current environment as `NAME=value` lines |
| `cat config/crontab` | Prints your schedule file |
| `( ... )` piped to `crontab -` | Installs the combined output as the container's crontab |
| `cron -f` | Runs the cron daemon in the foreground so the container stays up |

Prepending `env` matters because **cron does not propagate environment variables**. By writing them as `NAME=value` lines at the top of the crontab, every scheduled job inherits the same environment your app container has — the values from your `env:` config and secrets. Without this, jobs would run with an almost-empty environment.

## Step 3: Provide the environment your jobs need

The `env` in the boot command only copies variables that are **already present in the container**. Make sure the variables your jobs rely on are configured so the cron container receives them.

```yaml
env:
  clear:
    RAILS_ENV: production
  secret:
    - DATABASE_URL
    - RAILS_MASTER_KEY
```

Top-level `env` applies to all roles, including `cron`. You can also set role-specific `env` under the `cron` role. Secrets are read from `.kamal/secrets`. See [env](../env/SKILL.md) for the full model.

## Step 4: Deploy

Deploy as usual to boot the cron container alongside your other roles:

```bash
kamal deploy
```

To act on the cron role only — for example after changing `config/crontab` or the role's config — target it with the global `--roles` option:

```bash
kamal deploy --roles cron
```

Because the boot command reads `config/crontab` from inside the image, **updating the schedule means deploying a new version of the app** that contains the edited file.

## Step 5: Verify

Check that the cron container is running:

```bash
kamal details
```

To inspect the crontab actually installed in the running cron container, reuse it and list the crontab:

```bash
kamal app exec --reuse --roles cron 'crontab -l'
```

For more on running one-off commands against a role or host, see [servers](../servers/SKILL.md).

## Common pitfalls

- **Jobs run with no environment.** You dropped the `(env && ...)` part of the boot command, or the variables were never in the container's `env:`. Cron will not inherit them otherwise.
- **Schedule changes don't take effect.** The crontab is read from the image at boot. Commit `config/crontab` and redeploy — editing it locally does nothing until a new version ships.
- **Nothing is scheduled.** Confirm `config/crontab` exists at the path the boot command reads and is part of the built image.
- **The container exits immediately.** The boot command ends in `cron -f` to keep cron in the foreground; if you change the command, keep a foreground process so the container stays up.

## Reference

For the full set of configuration keys you can set on the cron role (and any role), a breakdown of the boot command, and a standard crontab syntax primer, see [references/cron-role-config.md](references/cron-role-config.md).

Official docs: [Cron configuration](https://kamal-deploy.org/docs/configuration/cron/).

## Related Skills

- **accessories**: For running databases, Redis, search, or other supporting services your scheduled jobs read from or write to.
- **servers**: For converting a plain host list into named roles, configuring the `web` and worker roles, and targeting hosts/roles with `--hosts` and `--roles`.
- **env**: For setting the `env:` values and secrets the cron container needs to copy into the crontab.
- **deploy**: For the overall `kamal deploy` workflow that boots the cron role.
