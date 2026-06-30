# Cron Role Configuration Reference

Deep reference for the `cron` role: the boot command, the role configuration keys you can set, and a standard crontab syntax primer.

## Contents
- The Boot Command, Dissected
- Cron Role Configuration Keys
- Environment Variables and the Crontab
- Standard Crontab Syntax (not Kamal-specific)
- Official Docs

## The Boot Command, Dissected

The cron role is just a role with a special `cmd`:

```yaml
servers:
  cron:
    hosts:
      - 192.168.0.1
    cmd:
      bash -c "(env && cat config/crontab) | crontab - && cron -f"
```

Breaking the command down:

| Segment | Purpose |
|---------|---------|
| `bash -c "..."` | Runs the whole pipeline through bash |
| `env` | Emits the container's environment as `NAME=value` lines |
| `cat config/crontab` | Emits the contents of your schedule file |
| `(env && cat config/crontab)` | Concatenates the env lines followed by the crontab lines |
| `\| crontab -` | Installs that combined output as the user's crontab |
| `&& cron -f` | Starts the cron daemon in the foreground so the container keeps running |

The file path `config/crontab` is read **inside the container**, so the file must be part of the built app image. Update the schedule by committing the change and deploying a new version.

Keep a foreground process (`cron -f`) at the end — if the command exits, the container stops.

## Cron Role Configuration Keys

A cron role accepts the same configuration as any custom role. The hosts go under the `hosts` key, and you can override other settings from the root configuration.

| Key | Purpose |
|-----|---------|
| `hosts` | The list of hosts to run the cron container on |
| `cmd` | The command to run in the container (the cron boot command above) |
| `stop_timeout` | Seconds to wait for the container to stop |
| `options` | Passed to `docker run` (e.g. `memory`, `cpus`) |
| `logging` | Docker logging driver and options for this role |
| `proxy` | Proxy settings; non-primary roles have no proxy unless set to `proxy: true` |
| `labels` | Custom Docker labels |
| `env` | Role-specific environment variables (merged with top-level `env`) |
| `asset_path` | Path used for asset bridging |

Example with a few overrides:

```yaml
servers:
  cron:
    hosts:
      - 192.168.0.1
    cmd:
      bash -c "(env && cat config/crontab) | crontab - && cron -f"
    options:
      memory: 1g
      cpus: 1
    env:
      clear:
        RAILS_ENV: production
```

Notes grounded in the Kamal role docs:

- Kamal expects a `web` role unless you set a different `primary_role` in the root configuration. The `cron` role is an additional, non-primary role.
- By default, only the primary role uses a proxy. The cron role does not serve web traffic, so leave the proxy off.

For the complete role model, see the [Roles](https://kamal-deploy.org/docs/configuration/roles/) and [Servers](https://kamal-deploy.org/docs/configuration/servers/) docs.

## Environment Variables and the Crontab

Cron does not automatically propagate environment variables. The boot command works around this by running `env` and prepending its output (one `NAME=value` per line) to the crontab. Cron treats leading `NAME=value` lines in a crontab as environment assignments applied to every job.

Those variables only exist in the container if you put them there:

- Top-level `env` applies to all roles, including `cron`.
- Role-specific `env` under the `cron` role merges with the top-level values.
- Secret values are read from `.kamal/secrets` and listed under the `secret` key; clear values go under `clear`.

```yaml
env:
  clear:
    RAILS_ENV: production
  secret:
    - DATABASE_URL
    - RAILS_MASTER_KEY
```

If a job needs a variable that is not in the container's environment, `env` cannot copy it into the crontab. Add it to `env:` first. See the [Environment variables](https://kamal-deploy.org/docs/configuration/environment-variables/) docs.

## Standard Crontab Syntax (not Kamal-specific)

The contents of `config/crontab` use ordinary Unix cron syntax. Each job line has five schedule fields followed by the command:

```
# ┌ minute (0-59)
# │ ┌ hour (0-23)
# │ │ ┌ day of month (1-31)
# │ │ │ ┌ month (1-12)
# │ │ │ │ ┌ day of week (0-7, 0 and 7 are Sunday)
# │ │ │ │ │
  * * * * *  command-to-run
```

Common patterns:

| Schedule | Meaning |
|----------|---------|
| `0 2 * * *` | Every day at 02:00 |
| `*/15 * * * *` | Every 15 minutes |
| `0 * * * *` | Every hour, on the hour |
| `0 0 * * 0` | Every Sunday at midnight |
| `30 6 1 * *` | 06:30 on the first day of each month |

Example `config/crontab`:

```
# Nightly database cleanup at 2am
0 2 * * *    cd /rails && bin/rails db:cleanup

# Refresh reports every 15 minutes
*/15 * * * * cd /rails && bin/rails reports:refresh
```

The commands run inside your app's container, so reference the same working directory and binaries your app uses.

## Official Docs

- [Cron](https://kamal-deploy.org/docs/configuration/cron/)
- [Roles](https://kamal-deploy.org/docs/configuration/roles/)
- [Servers](https://kamal-deploy.org/docs/configuration/servers/)
- [Environment variables](https://kamal-deploy.org/docs/configuration/environment-variables/)
