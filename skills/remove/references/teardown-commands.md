# Teardown Command Reference

Detailed reference for `kamal remove` and the per-component `remove` subcommands. Every command and description below is taken from the Kamal command docs.

## Contents
- `kamal remove`
- Global flags Kamal commands accept
- Per-component remove subcommands (app, accessory, proxy, registry)
- Sources

## `kamal remove`

Removes the app, kamal-proxy, and accessory containers and logs out of the Docker registry. It prompts for confirmation unless you add the `-y` option.

CLI summary (from `kamal --help`): **"Remove kamal-proxy, app, accessories, and registry session from servers."**

| Flag | What it does |
|------|--------------|
| `-y` | Skip the confirmation prompt |

## Global Flags Kamal Commands Accept

These options are listed under `kamal --help` and are available across Kamal commands. The ones most relevant to a teardown are `--destination`, `--config-file`, `--hosts`, and `--roles`, which let you scope `kamal remove` to a specific environment, host set, or role.

| Flag | Short | Default | What it does |
|------|-------|---------|--------------|
| `--verbose` | `-v` | | Detailed logging |
| `--quiet` | `-q` | | Minimal logging |
| `--version=VERSION` | | | Run commands against a specific app version |
| `--primary` | `-p` | | Run commands only on the primary host instead of all |
| `--hosts=HOSTS` | `-h` | | Run only on these hosts (comma-separated, supports `*` wildcards) |
| `--roles=ROLES` | `-r` | | Run only on these roles (comma-separated, supports `*` wildcards) |
| `--config-file=CONFIG_FILE` | `-c` | `config/deploy.yml` | Path to the config file |
| `--destination=DESTINATION` | `-d` | | Use a destination config (`staging` → `config/deploy.staging.yml`) |
| `--skip-hooks` | `-H` | `false` | Don't run hooks |
| `--lock-wait` | | `false` | Wait for the deploy lock if it's already held instead of failing immediately |
| `--lock-wait-timeout=N` | | `900` | Maximum seconds to wait for the deploy lock when `--lock-wait` is set |
| `--lock-wait-interval=N` | | `15` | Seconds between deploy lock polls when `--lock-wait` is set |

Not every command uses every option. Use the targeting flags (`--destination`, `--config-file`, `--hosts`, `--roles`) to remove the right environment rather than all of them.

## Per-Component Remove Subcommands

When you don't want a full `kamal remove`, each component exposes its own `remove` subcommand. Each documents exactly what it deletes.

### `kamal app remove`

From `kamal app` (manage your running apps):

| Subcommand | What it does |
|------------|--------------|
| `kamal app remove` | Remove app containers and images from servers |

For the rest of `kamal app` (containers, details, exec, images, logs, start, stop, version, maintenance/live mode), see the **app** skill.

### `kamal accessory remove [NAME]`

From `kamal accessory` (manage long-lived services your app depends on):

| Subcommand | What it does |
|------------|--------------|
| `kamal accessory remove [NAME]` | Remove accessory container, image and data directory from host (use `NAME=all` to remove all accessories) |

This is the most destructive remove subcommand: it deletes the accessory's **data directory** on the host, not just the container and image. Back up any database or persisted state first. For accessory configuration and persistence, see the **accessories** skill.

### `kamal proxy remove`

From `kamal proxy` (manage kamal-proxy):

| Subcommand | What it does |
|------------|--------------|
| `kamal proxy remove` | Remove proxy container and image from servers |

For booting, rebooting, restarting, and inspecting the proxy, see the **proxy** skill.

### `kamal registry logout` / `kamal registry remove`

From `kamal registry` (log in and out of the Docker registry on your servers):

| Subcommand | What it does |
|------------|--------------|
| `kamal registry login` | Log in to remote registry locally and remotely |
| `kamal registry logout` | Log out of remote registry locally and remotely |
| `kamal registry remove` | Remove local registry or log out of remote registry locally and remotely |
| `kamal registry setup` | Setup local registry or log in to remote registry locally and remotely |

`kamal remove` logs out of the Docker registry as part of the teardown. To log out on its own, use `kamal registry logout`. `kamal registry remove` removes a **local** registry or logs out of a **remote** one.

## Sources

- https://kamal-deploy.org/docs/commands/remove/
- https://kamal-deploy.org/docs/commands/view-all-commands/
- https://kamal-deploy.org/docs/commands/app/
- https://kamal-deploy.org/docs/commands/accessory/
- https://kamal-deploy.org/docs/commands/proxy/
- https://kamal-deploy.org/docs/commands/registry/
