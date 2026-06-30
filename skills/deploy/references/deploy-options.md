# `kamal deploy` and `kamal redeploy` Reference

Full option listing and behavior for the deploy commands. Source: the official Kamal docs for [deploy](https://kamal-deploy.org/docs/commands/deploy/) and [redeploy](https://kamal-deploy.org/docs/commands/redeploy/).

## `kamal deploy`

Build and deploy your app to all servers. By default it builds the currently checked-out version of the app. Kamal uses [kamal-proxy](https://github.com/basecamp/kamal-proxy) to seamlessly move requests from the old version to the new one without downtime.

### Full Options

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--skip-push` | `-P` | Skip image build and push | `false` |
| `--verbose` / `--no-verbose` / `--skip-verbose` | `-v` | Detailed logging | |
| `--quiet` / `--no-quiet` / `--skip-quiet` | `-q` | Minimal logging | |
| `--version=VERSION` | | Run commands against a specific app version | |
| `--primary` / `--no-primary` / `--skip-primary` | `-p` | Run commands only on the primary host instead of all | |
| `--hosts=HOSTS` | `-h` | Run commands on these hosts instead of all (separate by comma, supports wildcards with `*`) | |
| `--roles=ROLES` | `-r` | Run commands on these roles instead of all (separate by comma, supports wildcards with `*`) | |
| `--config-file=CONFIG_FILE` | `-c` | Path to config file | `config/deploy.yml` |
| `--destination=DESTINATION` | `-d` | Destination used for the config file (`staging` → `deploy.staging.yml`) | |
| `--skip-hooks` | `-H` | Don't run hooks | `false` |

### The Deploy Sequence

1. Log in to the Docker registry locally and on all servers.
2. Build the app image, push it to the registry, and pull it onto the servers.
3. Ensure kamal-proxy is running and accepting traffic on ports 80 and 443.
4. Start a new container with the version of the app that matches the current Git version hash.
5. Tell kamal-proxy to route traffic to the new container once it is responding with `200 OK` to `GET /up` on port 80.
6. Stop the old container running the previous version of the app.
7. Prune unused images and stopped containers to ensure servers don't fill up.

### Usage

```bash
kamal deploy [options]
```

## `kamal redeploy`

Deploy your app, but **skip** bootstrapping servers, starting kamal-proxy, pruning, and registry login.

You must run `kamal deploy` at least once first. `redeploy` is faster than a full deploy because it does less — use it for repeat deploys to servers that are already provisioned and already running kamal-proxy. It accepts the same targeting and skip flags as `deploy`.

```bash
kamal redeploy [options]
```

## Notes

- Kamal only builds files committed to your Git repository, so commit before deploying.
- `--skip-push` deploys an image that already exists in the registry instead of rebuilding it.
- For a fresh host, use [`kamal setup`](https://kamal-deploy.org/docs/commands/setup/) (installs Docker, boots accessories, then deploys) rather than `redeploy`.
