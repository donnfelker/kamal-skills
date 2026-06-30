# Kamal CLI Reference

A grounded reference for the commands and options you encounter during install
and first deploy. View these live at any time with `kamal --help`,
`kamal help [command]`, or `kamal docs [SECTION]`.

## All Commands

Run `kamal --help` (or `kamal help`) to list every command:

| Command | Description |
|---------|-------------|
| `kamal accessory` | Manage accessories (db/redis/search) |
| `kamal app` | Manage application |
| `kamal audit` | Show audit log from servers |
| `kamal build` | Build application image |
| `kamal config` | Show combined config (including secrets!) |
| `kamal deploy` | Deploy app to servers |
| `kamal details` | Show details about all containers |
| `kamal docs [SECTION]` | Show Kamal configuration documentation |
| `kamal help [COMMAND]` | Describe available commands or one specific command |
| `kamal init` | Create config stub in `config/deploy.yml` and secrets stub in `.kamal` |
| `kamal lock` | Manage the deploy lock |
| `kamal proxy` | Manage kamal-proxy |
| `kamal prune` | Prune old application images and containers |
| `kamal redeploy` | Deploy app to servers without bootstrapping servers, starting kamal-proxy, and pruning |
| `kamal registry` | Login and -out of the image registry |
| `kamal remove` | Remove kamal-proxy, app, accessories, and registry session from servers |
| `kamal rollback [VERSION]` | Rollback app to VERSION |
| `kamal secrets` | Helpers for extracting secrets |
| `kamal server` | Bootstrap servers with curl and Docker |
| `kamal setup` | Setup all accessories, push the env, and deploy app to servers |
| `kamal upgrade` | Upgrade from Kamal 1.x to 2.0 |
| `kamal version` | Show Kamal version |

## Global Options

These options are available across commands (from `kamal --help`):

| Option | Description | Default |
|--------|-------------|---------|
| `-v, --verbose` | Detailed logging | |
| `-q, --quiet` | Minimal logging | |
| `--version=VERSION` | Run commands against a specific app version | |
| `-p, --primary` | Run commands only on the primary host instead of all | |
| `-h, --hosts=HOSTS` | Run on these hosts instead of all (comma-separated, supports `*` wildcards) | |
| `-r, --roles=ROLES` | Run on these roles instead of all (comma-separated, supports `*` wildcards) | |
| `-c, --config-file=CONFIG_FILE` | Path to config file | `config/deploy.yml` |
| `-d, --destination=DESTINATION` | Destination for the config file (`staging` → `deploy.staging.yml`) | |
| `-H, --skip-hooks` | Don't run hooks | `false` |
| `--lock-wait` | Wait for the deploy lock if it's already held instead of failing immediately | `false` |
| `--lock-wait-timeout=N` | Maximum seconds to wait for the deploy lock when `--lock-wait` is set | `900` |
| `--lock-wait-interval=N` | Seconds between deploy lock polls when `--lock-wait` is set | `15` |

## `kamal server` Subcommands

```
kamal server bootstrap       # Set up Docker to run Kamal apps
kamal server exec            # Run a custom command on the server (use --help to show options)
kamal server help [COMMAND]  # Describe subcommands or one specific subcommand
```

### Bootstrap

`kamal server bootstrap` sets up Docker on your hosts. It checks if Docker is
installed and, if not, attempts to install it via
[get.docker.com](https://get.docker.com/).

```sh
kamal server bootstrap
```

### Execute a command on the servers

Run a custom command on all servers:

```sh
kamal server exec "date"
```

Run it only on the primary server:

```sh
kamal server exec --primary "date"
```

Run an interactive command:

```sh
kamal server exec --interactive "/bin/bash"
```

## Docs and Help

- `kamal docs` outputs configuration documentation. `kamal docs [SECTION]` shows
  a specific section.
- `kamal help` displays help messages. Run `kamal help [command]` for details on
  a specific command.

---

Sources: [View all commands](https://kamal-deploy.org/docs/commands/view-all-commands/),
[Help](https://kamal-deploy.org/docs/commands/help/),
[Server](https://kamal-deploy.org/docs/commands/server/),
[Docs](https://kamal-deploy.org/docs/commands/docs/)
