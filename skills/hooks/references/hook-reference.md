# Hook Reference

Full detail on each Kamal hook, the environment variables passed to them, and how to configure and skip them. Every hook script lives in the hooks folder (`.kamal/hooks` by default) and is named exactly after the hook with **no file extension**. A non-zero exit code aborts the command.

Official docs: https://kamal-deploy.org/docs/hooks/overview/

## Contents

- The Nine Hooks (trigger, purpose, special behavior)
- KAMAL_* Environment Variables
- hooks_path and hooks_output
- Skipping hooks

## The Nine Hooks

### docker-setup

Runs once Docker is installed on a server but before taking any application-specific actions. Designed for performing any necessary configuration of Docker itself.

Docs: https://kamal-deploy.org/docs/hooks/docker-setup/

### pre-connect

Runs before taking the deploy lock. For anything that needs to run before connecting to remote hosts — for example, DNS warming, or checking that you are on the VPN.

Docs: https://kamal-deploy.org/docs/hooks/pre-connect/

### pre-build

Used for pre-build checks — for example, ensuring there are no uncommitted changes or that CI has passed. Exit non-zero to stop the build before it starts.

Docs: https://kamal-deploy.org/docs/hooks/pre-build/

### pre-deploy

For final checks before deploying — for example, checking that CI completed. Exit non-zero to abort the deploy.

Docs: https://kamal-deploy.org/docs/hooks/pre-deploy/

### post-deploy

Runs after a deploy, redeploy, or rollback. This hook is also passed a `KAMAL_RUNTIME` environment variable set to the total seconds the deploy took. Use it to broadcast a deployment message or register the new version with an APM.

Example — post a line to a preconfigured chatbot:

```bash
#!/usr/bin/env bash
curl -q -d content="[My App] ${KAMAL_PERFORMER} Rolled back to version ${KAMAL_VERSION}" https://3.basecamp.com/XXXXX/integrations/XXXXX/buckets/XXXXX/chats/XXXXX/lines
```

Which posts something like:

```
[My App] [dhh] Rolled back to version d264c4e92470ad1bd18590f04466787262f605de
```

Docs: https://kamal-deploy.org/docs/hooks/post-deploy/

### pre-app-boot

Runs before booting the app container when you call `kamal app boot`, or indirectly via `kamal deploy`.

With a grouped boot strategy, the hook is called **once for each group**, with `KAMAL_HOSTS` containing the list of servers in that group. (A grouped boot strategy comes from the `boot` configuration — `limit` and `wait` — which boots hosts in batches rather than all at once.)

Docs: https://kamal-deploy.org/docs/hooks/pre-app-boot/

### post-app-boot

Runs after booting the app container when you call `kamal app boot`, or indirectly via `kamal deploy`. Like `pre-app-boot`, with a grouped boot strategy it is called once per deployment group.

Docs: https://kamal-deploy.org/docs/hooks/post-app-boot/

### pre-proxy-reboot

Runs before rebooting the kamal-proxy container when you call `kamal proxy reboot`.

If the hook disables the current server in an external load balancer and you use the `--rolling` flag (`kamal proxy reboot --rolling`), you can use this for a zero-downtime proxy reboot. With a rolling reboot, the hook is called **once for each server**, with `KAMAL_HOSTS` containing the current server. With a non-rolling reboot, it is called just once. Use `post-proxy-reboot` to re-enable the server.

Docs: https://kamal-deploy.org/docs/hooks/pre-proxy-reboot/

### post-proxy-reboot

Runs after rebooting the kamal-proxy container. Pair it with `pre-proxy-reboot` to add a server back to an upstream load balancer once its proxy is back up.

Docs: https://kamal-deploy.org/docs/hooks/post-proxy-reboot/

## KAMAL_* Environment Variables

Available to every hook command, for fine-grained audit reporting (deployment reports, JSON webhooks):

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

`post-deploy` additionally receives `KAMAL_RUNTIME`, the total seconds the deploy took.

## hooks_path and hooks_output

Both go in the root of `config/deploy.yml`.

`hooks_path` — path to the hooks folder, defaults to `.kamal/hooks`:

```yaml
hooks_path: /user_home/kamal/hooks
```

`hooks_output` — hook output visibility, set globally or per-hook. CLI flags (`-v`, `-q`) override these settings. With no setting, hook output follows the CLI verbosity flags. Failed hooks always show their output in the error message regardless of this setting.

- `:quiet` — hook output is hidden
- `:verbose` — hook output is shown

```yaml
# Global
hooks_output: :verbose
```

```yaml
# Per-hook
hooks_output:
  pre-deploy: :verbose
  pre-build: :quiet
```

## Skipping Hooks

Pass `--skip-hooks` (`-H`) to run a command without its hooks, e.g. `kamal deploy --skip-hooks`.
