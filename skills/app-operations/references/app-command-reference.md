# `kamal app` Command Reference

`kamal app` manages your running apps. To deploy new versions, use `kamal deploy` (deploying skill) and `kamal rollback` (rollback skill).

Run `kamal app` with no subcommand to list everything it can do:

```bash
$ kamal app
Commands:
  kamal app boot              # Boot app on servers (or reboot app if already running)
  kamal app containers        # Show app containers on servers
  kamal app details           # Show details about app containers
  kamal app exec [CMD...]     # Execute a custom command on servers within the app container (use --help to show options)
  kamal app help [COMMAND]    # Describe subcommands or one specific subcommand
  kamal app images            # Show app images on servers
  kamal app live              # Set the app to live mode
  kamal app logs              # Show log lines from app on servers (use --help to show options)
  kamal app maintenance       # Set the app to maintenance mode
  kamal app remove            # Remove app containers and images from servers
  kamal app stale_containers  # Detect app stale containers
  kamal app start             # Start existing app container on servers
  kamal app stop              # Stop app container on servers
  kamal app version           # Show app version currently running on servers
```

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `kamal app boot` | Boot app on servers (or reboot app if already running). |
| `kamal app containers` | Show app containers on servers. |
| `kamal app details` | Show details about app containers. |
| `kamal app exec [CMD...]` | Execute a custom command on servers within the app container. Use `--help` to show options. See [exec-reference.md](exec-reference.md). |
| `kamal app help [COMMAND]` | Describe subcommands, or one specific subcommand. |
| `kamal app images` | Show app images on servers. |
| `kamal app live` | Set the app to live mode. |
| `kamal app logs` | Show log lines from app on servers. Use `--help` to show options. |
| `kamal app maintenance` | Set the app to maintenance mode. |
| `kamal app remove` | Remove app containers and images from servers. |
| `kamal app stale_containers` | Detect app stale containers. |
| `kamal app start` | Start existing app container on servers. |
| `kamal app stop` | Stop app container on servers. |
| `kamal app version` | Show app version currently running on servers. |

## Maintenance Mode

Set your application to maintenance mode by running `kamal app maintenance`.

When in maintenance mode, kamal-proxy intercepts requests and returns `503` responses. There is a built-in HTML template for the error page. Customize the error message via the `--message` option:

```bash
kamal app maintenance --message "Scheduled maintenance window from ..."
```

You can also provide custom error pages by setting the `error_pages_path` configuration option — a directory (relative to the app root) where the proxy finds error pages named after their HTTP status code (e.g. `404.html`, `500.html`, `502.html`, `503.html`, `504.html`):

```yaml
error_pages_path: public
```

## Live Mode

Set your application back to live mode by running `kamal app live`.

## Source

- Official docs: <https://kamal-deploy.org/docs/commands/app/>
