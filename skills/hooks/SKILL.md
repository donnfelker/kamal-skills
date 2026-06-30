---
name: hooks
description: Write and wire up Kamal deploy hooks — scripts in `.kamal/hooks` (docker-setup, pre-connect, pre-build, pre-deploy, post-deploy, pre-app-boot, post-app-boot, pre-proxy-reboot, post-proxy-reboot) that run at fixed points in a deploy, plus the `KAMAL_*` env vars (`KAMAL_VERSION`, `KAMAL_PERFORMER`, `KAMAL_HOSTS`, `KAMAL_RECORDED_AT`) passed to them for audit reporting, deploy notifications, CI gates, and load-balancer draining. Use when the user says "add a deploy hook," "run a script before/after deploy," "post-deploy notification," "fail the deploy if CI hasn't passed," "block deploys unless I'm on the VPN," "run a script when kamal-proxy reboots," "where do hooks live," "hooks_path," "hooks_output," "skip hooks," or "what are the KAMAL_ env vars." Covers the `.kamal/hooks` folder from `kamal init`, naming rules, non-zero exit aborting the command, `hooks_path`/`hooks_output`, and `--skip-hooks`. For the deploy sequence these fire within, see deploying. For builds, see building-images.
metadata:
  version: 1.0.0
---

# Deploy Hooks

You are an expert in extending Kamal deploys with hooks. Your goal is to run the right custom script at the right point in a deploy — pre-flight checks, build gates, deployment notifications, load-balancer draining — and to read the `KAMAL_*` environment variables Kamal passes in so those scripts know what is being deployed, by whom, and where.

## Before You Start

Read what already exists before asking the user questions:

- **`.kamal/hooks/`** — the default hooks folder. `kamal init` creates it with sample scripts. List it to see which hooks are already wired up.
- **`config/deploy.yml`** — check for a `hooks_path` (custom location) or `hooks_output` (output visibility) setting.
- **`.kamal/secrets`** — if a hook needs a token (for a webhook, an APM key), it is read from here.

## How Hooks Work

Hooks let you run custom scripts at specific points during Kamal commands.

- Hooks live in the **`.kamal/hooks`** folder by default. Change the location with `hooks_path` (see [Configuring Location and Output](#configuring-location-and-output)).
- The hook **filename must be the hook name with no extension** — for example `pre-deploy`, not `pre-deploy.sh` or `pre-deploy.rb`.
- If a hook script returns a **non-zero exit code, the command is aborted.** This is how a pre-deploy or pre-build hook gates a deploy.
- Kamal passes `KAMAL_*` environment variables into every hook so the script knows what is happening (see [KAMAL_* Environment Variables](#kamal-environment-variables)).
- Skip all hooks for one command with `--skip-hooks` (see [Skipping Hooks](#skipping-hooks)).

Running `kamal init` scaffolds the folder and drops in sample scripts you can edit or delete.

## The Available Hooks

Each hook fires at a documented point. Name your script exactly as the hook name.

| Hook | When it runs | Typical use |
|------|--------------|-------------|
| `docker-setup` | Once Docker is installed on a server, before any app-specific actions | Configure Docker itself |
| `pre-connect` | Before taking the deploy lock, before connecting to remote hosts | DNS warming, checking you are on the VPN |
| `pre-build` | Before the image build | Ensure no uncommitted changes, or that CI has passed |
| `pre-deploy` | Final checks before deploying | Check CI completed |
| `post-deploy` | After a deploy, redeploy, or rollback | Broadcast a deployment message, register the version with an APM |
| `pre-app-boot` | Before booting the app container (`kamal app boot`, or via `kamal deploy`) | Prepare for the new container |
| `post-app-boot` | After booting the app container (`kamal app boot`, or via `kamal deploy`) | Verify or announce the new container |
| `pre-proxy-reboot` | Before rebooting the kamal-proxy container (`kamal proxy reboot`) | Drain a server from an external load balancer |
| `post-proxy-reboot` | After rebooting the kamal-proxy container | Re-enable the server in the load balancer |

For the full detail on each hook — including the grouped-boot and rolling-reboot behaviors — see [references/hook-reference.md](references/hook-reference.md).

## Walk-Through: Add a Hook

### Step 1 — Create the hook file

Put a script in `.kamal/hooks` named exactly after the hook, with no extension. For a pre-deploy gate:

```bash
# .kamal/hooks/pre-deploy
```

Give it a shebang and make it executable — Kamal runs the file directly:

```bash
chmod +x .kamal/hooks/pre-deploy
```

### Step 2 — Write the script and exit non-zero to abort

A non-zero exit code aborts the command, so a pre-deploy or pre-build hook can stop a bad deploy before it starts:

```bash
#!/usr/bin/env bash
# .kamal/hooks/pre-build — refuse to build with uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "Uncommitted changes present — commit before deploying." >&2
  exit 1
fi
```

### Step 3 — Use the KAMAL_* variables

Kamal passes context in as environment variables. Read them to make the script aware of the version, performer, and target hosts:

```bash
#!/usr/bin/env bash
# .kamal/hooks/pre-deploy
echo "Deploying ${KAMAL_VERSION} to ${KAMAL_HOSTS} as ${KAMAL_PERFORMER}"
```

### Step 4 — Deploy

Run your command as usual. The hooks fire at their points automatically:

```bash
kamal deploy
```

If you need to deploy without running any hooks this once, add `--skip-hooks`.

## KAMAL_* Environment Variables

These variables are available to **every** hook command, intended for fine-grained audit reporting — triggering deployment reports or firing a JSON webhook:

| Variable | Value |
|----------|-------|
| `KAMAL_RECORDED_AT` | UTC timestamp in ISO 8601 format, e.g. `2023-04-14T17:07:31Z` |
| `KAMAL_PERFORMER` | The local user performing the command (from `whoami`) |
| `KAMAL_SERVICE` | The service name, e.g. `app` |
| `KAMAL_SERVICE_VERSION` | Abbreviated service and version for messages, e.g. `app@150b24f` |
| `KAMAL_VERSION` | The full version being deployed |
| `KAMAL_HOSTS` | Comma-separated list of the hosts targeted by the command |
| `KAMAL_COMMAND` | The command being run |
| `KAMAL_SUBCOMMAND` | _Optional:_ the subcommand being run |
| `KAMAL_DESTINATION` | _Optional:_ destination, e.g. `staging` |
| `KAMAL_ROLE` | _Optional:_ role targeted, e.g. `web` |

The **post-deploy** hook additionally receives `KAMAL_RUNTIME`, set to the total seconds the deploy took.

## Worked Example: A post-deploy Notification

The `post-deploy` hook runs after a deploy, redeploy, or rollback — a natural place to broadcast a deployment message or register the new version with an APM. This example posts a line to a preconfigured chatbot:

```bash
#!/usr/bin/env bash
# .kamal/hooks/post-deploy
curl -q -d content="[My App] ${KAMAL_PERFORMER} Rolled back to version ${KAMAL_VERSION}" https://3.basecamp.com/XXXXX/integrations/XXXXX/buckets/XXXXX/chats/XXXXX/lines
```

That posts a message like:

```
[My App] [dhh] Rolled back to version d264c4e92470ad1bd18590f04466787262f605de
```

Because `post-deploy` also gets `KAMAL_RUNTIME`, you can include the deploy duration in the message.

## Configuring Location and Output

Both keys go in the root of `config/deploy.yml`.

### hooks_path

Path to the hooks folder. Defaults to `.kamal/hooks`. Override it to keep hooks elsewhere:

```yaml
hooks_path: /user_home/kamal/hooks
```

### hooks_output

Controls hook output visibility. Set it globally or per-hook. CLI flags (`-v`, `-q`) override these settings.

| Value | Effect |
|-------|--------|
| `:quiet` | Hook output is hidden |
| `:verbose` | Hook output is shown |

With no setting, hook output follows the CLI verbosity flags. Failed hooks always show their output in the error message regardless of this setting.

Global setting for all hooks:

```yaml
hooks_output: :verbose
```

Or per-hook:

```yaml
hooks_output:
  pre-deploy: :verbose
  pre-build: :quiet
```

## Skipping Hooks

Pass `--skip-hooks` (`-H`) to run a command without its hooks:

```bash
kamal deploy --skip-hooks
```

Use it when you need to bypass a gate for a one-off deploy. For how `--skip-hooks` fits into the deploy command's other flags, see the deploying skill.

## Quick Reference

| Goal | How |
|------|-----|
| Scaffold the hooks folder with samples | `kamal init` |
| Add a hook | Create `.kamal/hooks/<hook-name>` (no extension), make it executable |
| Gate / abort a command | Exit the hook script with a non-zero code |
| Know the version / performer / hosts in a hook | Read `KAMAL_VERSION`, `KAMAL_PERFORMER`, `KAMAL_HOSTS` |
| Get the deploy duration | Read `KAMAL_RUNTIME` in `post-deploy` |
| Move the hooks folder | `hooks_path:` in `config/deploy.yml` |
| Show or hide hook output | `hooks_output: :verbose` / `:quiet` (global or per-hook) |
| Run a command without hooks | `--skip-hooks` (`-H`) |

## Related Skills

- **deploying**: For the full `kamal deploy` / `kamal redeploy` sequence these hooks fire within, and the other flags that pair with `--skip-hooks`.
- **building-images**: For the `kamal build` step where the `pre-connect` and `pre-build` hooks run.
