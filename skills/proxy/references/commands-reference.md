# kamal proxy Command Reference

The `kamal proxy` command manages the kamal-proxy container on your servers. Kamal uses [kamal-proxy](https://github.com/basecamp/kamal-proxy) to proxy requests to the application containers, allowing zero-downtime deployments.

Source: [kamal proxy command](https://kamal-deploy.org/docs/commands/proxy/).

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `kamal proxy boot` | Boot proxy on servers |
| `kamal proxy boot_config <set\|get\|reset>` | Manage kamal-proxy boot configuration (deprecated — see below) |
| `kamal proxy details` | Show details about proxy container from servers |
| `kamal proxy help [COMMAND]` | Describe subcommands or one specific subcommand |
| `kamal proxy logs` | Show log lines from proxy on servers |
| `kamal proxy reboot` | Reboot proxy on servers (stop container, remove container, start new container) |
| `kamal proxy remove` | Remove proxy container and image from servers |
| `kamal proxy restart` | Restart existing proxy container on servers |
| `kamal proxy start` | Start existing proxy container on servers |
| `kamal proxy stop` | Stop existing proxy container on servers |

## Rebooting and upgrading

When you want to upgrade kamal-proxy, call `kamal proxy reboot`. This causes a small outage on each server and prompts for confirmation.

```bash
kamal proxy reboot
```

Use a rolling reboot to avoid restarting on all servers simultaneously:

```bash
kamal proxy reboot --rolling
```

You can also use the [pre-proxy-reboot](https://kamal-deploy.org/docs/hooks/pre-proxy-reboot/) and [post-proxy-reboot](https://kamal-deploy.org/docs/hooks/post-proxy-reboot/) hooks to remove and add servers to upstream load balancers as you reboot them.

## Boot configuration (deprecated)

You can manage boot configuration for kamal-proxy with `kamal proxy boot_config`.

**Note:** Using `kamal proxy boot_config` has been deprecated. Use the [proxy run configuration](https://kamal-deploy.org/docs/configuration/proxy/#run-configuration) (the `proxy/run` block) instead.

```bash
$ kamal proxy boot_config
Commands:
  kamal proxy boot_config set [OPTIONS]
  kamal proxy boot_config get
  kamal proxy boot_config reset
```

Options for `set`:

| Option | Description | Default |
|--------|-------------|---------|
| `--publish`, `--no-publish`, `--skip-publish` | Publish the proxy ports on the host | `true` |
| `--http-port=N` | HTTP port to publish on the host | `80` |
| `--https-port=N` | HTTPS port to publish on the host | `443` |
| `--log-max-size=LOG_MAX_SIZE` | Max size of proxy logs | `10m` |
| `--docker-options=option=value option2=value2` | Docker options to pass to the proxy container | — |

When set, the config is stored on the server the proxy runs on. If you run more than one application on a single server, there is only one proxy and the boot config is shared, so you need to manage it centrally. The configuration is loaded at boot time when calling `kamal proxy boot` or `kamal proxy reboot`.
