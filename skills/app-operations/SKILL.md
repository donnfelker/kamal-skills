---
name: app-operations
description: Operate and inspect already-running Kamal apps without redeploying. Manage app containers with `kamal app` (boot, start, stop, containers, details, images, version, logs, exec, remove, stale_containers), set maintenance/live mode (`kamal app maintenance --message`, `kamal app live`, `error_pages_path`), see every container with `kamal details`, review what ran on each server with `kamal audit`, print the resolved config with `kamal config`, run one-off and interactive commands with `kamal app exec` (`--primary/-p`, `--interactive/-i`, `--reuse`, `--raw`), and check the installed CLI version with `kamal version`. Use when the user says "boot/start/stop the app," "show running containers," "exec into the app," "open a Rails console," "run a command on all servers," "put the app in maintenance mode," "show the audit log," or "print my Kamal config." For shipping releases, see deploying. For reverting a release, see rollback. For log-driver and OTel/file config, see logging. For kamal-proxy, see proxy.
metadata:
  version: 1.0.0
---

# App Operations with Kamal

You are an expert in operating applications deployed with Kamal. Your goal is to inspect, control, and troubleshoot the containers that are *already running* on your servers — without redeploying. `kamal app` manages running apps, while `kamal details`, `kamal audit`, and `kamal config` tell you what is running, what happened, and how Kamal is configured.

To deploy new versions, see the deploying skill; to revert a bad release, see rollback.

## Before You Start

Read the project's Kamal config before asking the user questions — it tells you the roles, hosts, and destinations these commands run against.

- **`config/deploy.yml`** — defines your servers, roles, registry, and build settings.
- **`config/deploy.<destination>.yml`** — destination-specific config, selected with `-d, --destination`.
- **`.kamal/secrets`** — where deploy secrets are read from.

To see the values Kamal will actually use, run `kamal config` (covered below) instead of guessing from the raw YAML.

## The `kamal app` Command

`kamal app` manages your running apps. Run it with no subcommand to list everything it can do:

| Subcommand | What it does |
|------------|--------------|
| `kamal app boot` | Boot app on servers (or reboot app if already running) |
| `kamal app start` | Start existing app container on servers |
| `kamal app stop` | Stop app container on servers |
| `kamal app remove` | Remove app containers and images from servers |
| `kamal app containers` | Show app containers on servers |
| `kamal app details` | Show details about app containers |
| `kamal app images` | Show app images on servers |
| `kamal app version` | Show app version currently running on servers |
| `kamal app logs` | Show log lines from app on servers (use `--help` to show options) |
| `kamal app exec [CMD...]` | Execute a custom command on servers within the app container |
| `kamal app maintenance` | Set the app to maintenance mode |
| `kamal app live` | Set the app to live mode |
| `kamal app stale_containers` | Detect app stale containers |

For the full listing with notes on each, see [references/app-command-reference.md](references/app-command-reference.md). `kamal app exec` is covered under [Running Commands on Servers](#running-commands-on-servers).

## Walk-Through: See What's Running

### Step 1 — Every container on every host

```bash
kamal details
```

Shows details of all your containers — proxy, app, and accessory containers — grouped by host.

### Step 2 — Just the app containers

```bash
kamal app details      # details about app containers
kamal app containers   # list app containers on servers
```

### Step 3 — Images and running version

```bash
kamal app images    # app images on servers
kamal app version   # app version currently running on servers
```

### Step 4 — Recent logs

```bash
kamal app logs           # show log lines from the app on servers
kamal app logs --help    # see all log options
```

Run `kamal app logs --help` to see all log options. To configure the log driver or ship logs to OpenTelemetry or a file, see the logging skill.

## Walk-Through: Control the Running App

These subcommands manage the app container directly, without running a full deploy.

| Goal | Command |
|------|---------|
| Boot the app (or reboot if already running) | `kamal app boot` |
| Start a stopped app container | `kamal app start` |
| Stop the running app container | `kamal app stop` |
| Remove app containers and images | `kamal app remove` |
| Detect stale app containers | `kamal app stale_containers` |

`kamal app boot` boots the app on servers, or reboots it if it's already running. `kamal app start` and `kamal app stop` start and stop the existing container without rebuilding. `kamal app remove` removes app containers **and** images from the servers.

## Maintenance Mode and Live Mode

Take the app offline for users while you work, then bring it back.

```bash
kamal app maintenance
```

While in maintenance mode, kamal-proxy intercepts requests and returns `503` responses using a built-in HTML error page.

Customize the message shown on that page:

```bash
kamal app maintenance --message "Scheduled maintenance window from ..."
```

To serve your own error pages instead of the built-in template, set the `error_pages_path` config option — a directory (relative to the app root) holding pages named after their HTTP status code, e.g. `503.html`:

```yaml
error_pages_path: public
```

Bring the app back:

```bash
kamal app live
```

This sets the app back to live mode.

## Running Commands on Servers

`kamal app exec` runs a command inside the app container on your servers. Use it for one-off tasks, inspecting the environment, or opening an interactive console. Define [aliases](https://kamal-deploy.org/docs/configuration/aliases/) in your config for commands you run often.

### Run on all servers

```bash
kamal app exec 'ruby -v'
```

### Run on the primary server only

```bash
kamal app exec --primary 'cat .ruby-version'
# short form
kamal app exec -p 'bin/rails runner "puts Rails.application.config.time_zone"'
```

### Open an interactive session

Interactive commands (a Rails console, a bash session) default to the primary host — use `--hosts` to connect to another.

```bash
kamal app exec -i 'bin/rails console'   # new container from the most recent app image
kamal app exec -i --reuse bash          # the currently running container
```

`-i` / `--interactive` runs the command interactively over SSH. `--reuse` runs in the currently running container instead of a fresh one made from the latest image.

### Get unmodified output with `--raw`

By default `exec` runs the command's output through SSHKit's capture, which strips leading and trailing whitespace — including trailing newlines and NUL bytes — corrupting binary output such as a `tar` stream. Pass `--raw` to emit stdout exactly as produced; it also lowers the logging level so only the command's output is written.

```bash
kamal app exec --raw 'tar c -C /rails/storage .' > storage.tar
```

`--raw` can't be combined with `--interactive` or `--detach`.

For every `exec` pattern and option, see [references/exec-reference.md](references/exec-reference.md).

## Auditing What Happened

```bash
kamal audit
```

Shows the latest commands that have been run on each server. Under the hood Kamal tails `.kamal/app-audit.log` on each host, so you get a per-server timeline:

```
App Host: server1
[2024-04-05T07:14:23Z] [user] Pushed env files
[2024-04-05T07:14:29Z] [user] Pulled image with version 75bf6fa40b975cbd8aec05abf7164e0982f185ac
[2024-04-05T07:14:45Z] [user] [web] Booted app version 75bf6fa40b975cbd8aec05abf7164e0982f185ac
[2024-04-05T07:14:53Z] [user] Tagging registry:4443/app:75bf6fa40b975cbd8aec05abf7164e0982f185ac as the latest image
[2024-04-05T07:14:53Z] [user] Pruned containers
[2024-04-05T07:14:53Z] [user] Pruned images
```

Use it to confirm who deployed what and when, and to see the push/pull/boot/tag/prune sequence each deploy produced.

## Inspecting the Resolved Config

```bash
kamal config
```

Displays your config — the values Kamal will use, including the roles, hosts, and primary host; the `version`, `repository`, and `absolute_image` to deploy; the `service_with_version`; SSH and builder settings; accessories; and logging options:

```yaml
:roles:
- web
:hosts:
- vm1
- vm2
:primary_host: vm1
:version: 505f4f60089b262c693885596fbd768a6ab663e9
:repository: registry:4443/app
:absolute_image: registry:4443/app:505f4f60089b262c693885596fbd768a6ab663e9
:service_with_version: app-505f4f60089b262c693885596fbd768a6ab663e9
```

Run it to confirm what a command will target before you run it. See the full example in the official [config docs](https://kamal-deploy.org/docs/commands/config/).

## Checking Versions

There are two distinct "version" questions, each with its own command:

| Question | Command | What it returns |
|----------|---------|-----------------|
| What app version is running on my servers? | `kamal app version` | The app version currently running on servers |
| What version of Kamal itself do I have? | `kamal version` | The version of Kamal installed (e.g. `2.12.0`) |

Don't confuse `kamal app version` (your **app's** deployed version) with `kamal version` (the **Kamal CLI's** version).

## Quick Reference

| Goal | Command |
|------|---------|
| See every container on every host | `kamal details` |
| List app containers / show details | `kamal app containers` / `kamal app details` |
| Show app images | `kamal app images` |
| Show running app version | `kamal app version` |
| Show recent app logs | `kamal app logs` |
| Boot / start / stop the app | `kamal app boot` / `kamal app start` / `kamal app stop` |
| Maintenance / live mode | `kamal app maintenance` / `kamal app live` |
| Run a command on all servers | `kamal app exec 'CMD'` |
| Run on the primary only | `kamal app exec -p 'CMD'` |
| Open an interactive console | `kamal app exec -i 'bin/rails console'` |
| Review server activity | `kamal audit` |
| Print the resolved config | `kamal config` |
| Kamal CLI version | `kamal version` |

## Related Skills

- **deploying**: For shipping new releases with `kamal deploy` and `kamal redeploy`.
- **rollback**: For reverting to a previous image with `kamal rollback` after a bad deploy.
- **logging**: For configuring the Docker log driver and options, and shipping deploy/command logs to OpenTelemetry or a file.
- **proxy**: For managing kamal-proxy — the proxy that returns the `503` during maintenance mode and cuts traffic over on deploy.
