# Prune Command Reference

Full reference for `kamal prune` and the `retain_containers` retention setting. Every fact here is grounded in the official Kamal documentation: [commands/prune](https://kamal-deploy.org/docs/commands/prune/) and [configuration/overview](https://kamal-deploy.org/docs/configuration/overview/#retain-containers).

## Retention Model

Kamal keeps the **last 5 deployed containers** and the **images they are using**. Pruning deletes all older containers and images. The retention count is configurable with `retain_containers` (see below).

## Subcommands

`kamal prune` is a command group. Running `kamal prune` on its own prints the list of subcommands; call a subcommand to actually prune:

```bash
$ kamal prune
Commands:
  kamal prune all             # Prune unused images and stopped containers
  kamal prune containers      # Prune all stopped containers, except the last n (default 5)
  kamal prune help [COMMAND]  # Describe subcommands or one specific subcommand
  kamal prune images          # Prune unused images
```

| Subcommand | Description |
|------------|-------------|
| `kamal prune all` | Prune unused images and stopped containers |
| `kamal prune containers` | Prune all stopped containers, except the last n (default 5) |
| `kamal prune images` | Prune unused images |
| `kamal prune help [COMMAND]` | Describe subcommands or one specific subcommand |

### `kamal prune all`

The most common manual cleanup. Removes both unused images and stopped containers in one pass, keeping the retained recent releases.

### `kamal prune containers`

Removes stopped containers only, keeping the last `n` (default 5). Use when you want to clear out exited containers but leave images in place.

### `kamal prune images`

Removes unused images only — image layers not referenced by a retained container.

### `kamal prune help [COMMAND]`

Prints the description for the prune subcommands, or for one specific subcommand when you pass its name.

## Retention: `retain_containers`

How many old containers and images Kamal retains. Defaults to `5`.

```yaml
# config/deploy.yml
retain_containers: 3
```

| Key | Default | Meaning |
|-----|---------|---------|
| `retain_containers` | `5` | How many old containers and images we retain |

This is the `n` referenced by `kamal prune containers` ("except the last n"). Lower it to reclaim disk faster; raise it to keep more previous releases available on the servers.

## How Pruning Fits Into Deploys

- **`kamal deploy`** prunes unused images and stopped containers at the end of the deploy, so servers don't fill up over time.
- **`kamal redeploy`** skips pruning (along with bootstrapping servers, starting kamal-proxy, and registry login) so it runs faster. Run `kamal prune all` manually if old layers accumulate from repeated redeploys.

See the [deploy command docs](https://kamal-deploy.org/docs/commands/deploy/) for the full deploy sequence.
