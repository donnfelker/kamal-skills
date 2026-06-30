---
name: accessories
description: Run and manage accessory services — databases, Redis, search, and other long-lived dependencies your app needs — through Kamal's `accessories:` configuration and the `kamal accessory` command. Use this when the user says things like "add a MySQL/Postgres/Redis accessory," "run a database with Kamal," "kamal accessory boot," "set up a sidecar/companion service," "my app needs a cache or search container," "persist accessory data with volumes," or "reboot/restart/remove an accessory." Covers defining the accessory (image, host/hosts/role/roles/tag/tags, port, env, files, directories, volumes, network, options, registry, proxy) and operating it with boot, reboot, restart, start, stop, details, logs, exec, and remove. For passing configuration and credentials into accessories, see env and secrets. For scheduled jobs, see cron.
metadata:
  version: 1.0.0
---

# Accessories

You are an expert in deploying applications with Kamal. Your goal is to help the user run the long-lived services their app depends on — databases, caches, search engines, and similar — as Kamal **accessories**, and to operate them safely with `kamal accessory`.

## What an accessory is

Accessories are long-lived services that your app depends on. Important properties to set expectations with the user:

- **They are not updated when you deploy.** Accessories are managed separately from the main service and run on their own lifecycle.
- **They do not have zero-downtime deployments.** They are not proxied, so rebooting an accessory causes a small period of downtime.
- **They persist data through volumes.** Map volumes (or directories) from the host into the container so data survives container reboots.
- **They can run anywhere.** An accessory can be booted on a single host, a list of hosts, or on specific roles. Those hosts do **not** need to be defined in the Kamal `servers` configuration.

## Before you begin

Before asking the user questions, read what already exists in the repo:

- **`config/deploy.yml`** — check for an existing `accessories:` block, the root `service:` name, `servers:`, and `registry:`.
- **`.kamal/secrets`** (and `.kamal/secrets-common` / `.kamal/secrets.<destination>`) — see which credentials are already defined so you can reference them instead of inventing new ones.

Use what you find, then only ask for what's missing (which service, which image, which host, what data needs to persist, what credentials it needs).

## Walk-through: add an accessory

### 1. Define the accessory

Add the service under the top-level `accessories:` key, named by a key you choose:

```yaml
accessories:
  mysql:
```

The accessory's **service name** is used in its service label and defaults to `<service>-<accessory>`, where `<service>` is the main service name from the root configuration. Override it explicitly if needed:

```yaml
accessories:
  mysql:
    service: mysql
```

### 2. Choose the image

Set the Docker image to run:

```yaml
    image: mysql:8.0
```

By default accessories pull from the **Docker Hub** registry. To use a different registry for an accessory, set `registry:` on the accessory (and don't prefix the image with that registry server). See [references/config-keys.md](references/config-keys.md) for the registry and anchor details.

### 3. Choose where it runs

Specify exactly one of `host`, `hosts`, `role`, `roles`, `tag`, or `tags`:

```yaml
    host: mysql-db1
```

```yaml
    hosts:
      - mysql-db1
      - mysql-db2
```

```yaml
    roles:
      - mysql
```

Remember: these hosts do not have to appear in your `servers:` configuration.

### 4. Map ports

Map a port if the accessory needs to be reachable. Binding to `127.0.0.1` keeps it off the public interface — review the [Docker networking](https://docs.docker.com/network/) security note before exposing a port publicly:

```yaml
    port: "127.0.0.1:3306:3306"
```

### 5. Persist data

Accessories are not zero-downtime, so durable data must live on the host. You have three documented mechanisms:

| Key | What it does | Created/uploaded first? |
|-----|--------------|-------------------------|
| `directories` | Mount host directories into the container | Yes — created on the host before mounting |
| `files` | Mount individual files (ERB is evaluated, then uploaded from the local repo) | Yes — uploaded from local repo, then mounted |
| `volumes` | Any other volume mounts, in addition to files and directories | No — not created or copied before mounting |

```yaml
    directories:
      - mysql-data:/var/lib/mysql
    files:
      - config/my.cnf.erb:/etc/mysql/my.cnf
    volumes:
      - /path/to/mysql-logs:/var/log/mysql
```

`files` and `directories` both accept the string form `local:remote` or `local:remote:options`, where `options` can be `ro` (read-only) or `z`/`Z` (SELinux labels), and a hash form for custom `mode` and `owner`. Setting `owner` requires root access. See [references/config-keys.md](references/config-keys.md) for the hash form.

### 6. Pass configuration and secrets

Set environment variables under `env:`. Keep non-sensitive values under `clear:` and list secret names under `secret:` — secrets are stored in an env file on the host rather than passed inline:

```yaml
    env:
      clear:
        MYSQL_USER: app
      secret:
        - MYSQL_PASSWORD
```

The names under `secret:` are resolved from `.kamal/secrets`. For the full env model (clear vs. secret, aliasing with `SECRET:SOURCE`, tags) see the **env** and **secrets** skills.

### 7. Boot the accessory

Accessories are **not** booted by `kamal deploy`. Boot them explicitly:

```bash
# Boot one accessory by name
kamal accessory boot mysql

# Boot every accessory defined in your config
kamal accessory boot all
```

`kamal accessory boot` runs the pre-connect hook, acquires the deploy lock, logs in to the registry, and runs the container with `docker run` (storing the env file at `.kamal/env/accessories/<name>.env`), then releases the lock.

### 8. Verify it's running

```bash
kamal accessory details mysql      # Show details (use NAME=all for every accessory)
kamal accessory logs mysql         # Show log lines (use --help for options)
```

To open a shell or run a one-off command inside the container, use `exec`:

```bash
kamal accessory exec mysql "mysql --version"
```

`kamal accessory exec` runs a custom command on the servers within the accessory container; pass `--help` to see its options.

## Updating an accessory

Because accessories are not touched by `kamal deploy`, you update them yourself: change the `image:` in your config, then reboot:

```bash
kamal accessory reboot mysql
```

`reboot` stops the container, removes it, and starts a new one — so expect the brief downtime mentioned above. Use `NAME=all` to reboot every accessory.

## Managing the lifecycle

Run `kamal accessory` (or `kamal accessory --help`) to see everything. The full subcommand set:

| Command | What it does |
|---------|--------------|
| `kamal accessory boot [NAME]` | Boot new accessory service on host (`NAME=all` boots all) |
| `kamal accessory details [NAME]` | Show details about the accessory (`NAME=all` shows all) |
| `kamal accessory exec [NAME] [CMD...]` | Execute a custom command within the accessory container (`--help` for options) |
| `kamal accessory logs [NAME]` | Show log lines from the accessory (`--help` for options) |
| `kamal accessory reboot [NAME]` | Stop, remove, and start a new container (`NAME=all` for all) |
| `kamal accessory restart [NAME]` | Restart the existing accessory container |
| `kamal accessory start [NAME]` | Start an existing (stopped) accessory container |
| `kamal accessory stop [NAME]` | Stop the existing accessory container |
| `kamal accessory remove [NAME]` | Remove the container, image, and data directory from the host (`NAME=all` for all) |
| `kamal accessory upgrade` | Upgrade accessories from Kamal 1.x to 2.0 (restart them in the `kamal` network) |
| `kamal accessory help [COMMAND]` | Describe subcommands or one specific subcommand |

For more on what each command does — including the boot sequence and the difference between `reboot`, `restart`, `start`/`stop`, and `remove` — see [references/commands.md](references/commands.md).

## Configuration keys

The most-used keys are covered above. The full set you can put under an accessory:

| Key | Purpose |
|-----|---------|
| `service` | Service label name (default `<service>-<accessory>`) |
| `image` | Docker image to run |
| `registry` | Per-accessory registry (defaults to Docker Hub) |
| `host` / `hosts` / `role` / `roles` / `tag` / `tags` | Where the accessory runs (pick one) |
| `cmd` | Custom command instead of the image default |
| `port` | Port mapping |
| `labels` | Extra Docker labels |
| `options` | Extra `docker run` options, passed as `--<name> <value>` |
| `env` | Environment variables (`clear` / `secret`) |
| `files` | Files to upload and mount (ERB evaluated) |
| `directories` | Host directories to create and mount |
| `volumes` | Additional volume mounts (not created/copied first) |
| `network` | Network to attach to (defaults to `kamal`) |
| `proxy` | Run the accessory behind the Kamal proxy |

For every key with its string/hash formats, registry anchors, `options`, and `proxy` details, see [references/config-keys.md](references/config-keys.md).

## Worked example: a MySQL accessory

```yaml
accessories:
  mysql:
    image: mysql:8.0
    host: mysql-db1
    port: "127.0.0.1:3306:3306"
    env:
      clear:
        MYSQL_USER: app
      secret:
        - MYSQL_PASSWORD
    files:
      - config/my.cnf.erb:/etc/mysql/my.cnf
    directories:
      - mysql-data:/var/lib/mysql
```

```bash
kamal accessory boot mysql      # create it
kamal accessory details mysql   # confirm it's up
kamal accessory logs mysql      # tail logs if it isn't
```

The same shape works for a Redis cache, a search service, or any other dependency — swap the `image`, `port`, `env`, and persistence paths for that service.

## Common pitfalls

- **Expecting `kamal deploy` to start it.** It won't. Accessories have their own lifecycle — boot and reboot them explicitly.
- **No persistence.** Without a `directories` or `volumes` mount, data is lost when the container is removed (e.g. on `remove` or `reboot`).
- **Specifying more than one host selector.** Use exactly one of `host`/`hosts`/`role`/`roles`/`tag`/`tags`.
- **`remove` deletes data.** `kamal accessory remove` removes the container, image, **and the data directory** from the host.

## Related Skills

- **env**: For the full `env` model — `clear` vs. `secret`, tags, and how variables reach the container.
- **secrets**: For populating `.kamal/secrets` and fetching credentials (database passwords, registry passwords) from a password manager.
- **cron**: For running scheduled jobs alongside your app and accessories.
