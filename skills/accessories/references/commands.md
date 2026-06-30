# kamal accessory commands

Full reference for the `kamal accessory` subcommands. Run `kamal accessory` or `kamal accessory --help` to view them.

Accessories are long-lived services that your app depends on. They are **not** updated when you deploy. They are not proxied, so rebooting will have a small period of downtime — map volumes from the host server into your container for persistence across reboots.

## Subcommands

| Command | Description |
|---------|-------------|
| `kamal accessory boot [NAME]` | Boot new accessory service on host (use `NAME=all` to boot all accessories) |
| `kamal accessory details [NAME]` | Show details about accessory on host (use `NAME=all` to show all accessories) |
| `kamal accessory exec [NAME] [CMD...]` | Execute a custom command on servers within the accessory container (use `--help` to show options) |
| `kamal accessory help [COMMAND]` | Describe subcommands or one specific subcommand |
| `kamal accessory logs [NAME]` | Show log lines from accessory on host (use `--help` to show options) |
| `kamal accessory reboot [NAME]` | Reboot existing accessory on host: stop container, remove container, start new container (use `NAME=all` to boot all accessories) |
| `kamal accessory remove [NAME]` | Remove accessory container, image and data directory from host (use `NAME=all` to remove all accessories) |
| `kamal accessory restart [NAME]` | Restart existing accessory container on host |
| `kamal accessory start [NAME]` | Start existing accessory container on host |
| `kamal accessory stop [NAME]` | Stop existing accessory container on host |
| `kamal accessory upgrade` | Upgrade accessories from Kamal 1.x to 2.0 (restart them in the `kamal` network) |

## NAME and NAME=all

Most subcommands take a `NAME` that matches an accessory key in your config. `boot`, `details`, `reboot`, and `remove` also accept `all` to act on every accessory at once (e.g. `kamal accessory boot all`).

## What `boot` does

`kamal accessory boot` is how an accessory first comes up — it is not run by `kamal deploy`. A boot run:

1. Runs the **pre-connect hook**.
2. Creates the `.kamal` working directories on the servers.
3. Acquires the **deploy lock**.
4. Logs in to the registry (`docker login`).
5. Runs the container with `docker run` — detached, with a restart policy, a log size limit, the env file at `.kamal/env/accessories/<name>.env`, and a `service` label.
6. Releases the deploy lock.

Example:

```bash
$ kamal accessory boot all
Running the pre-connect hook...
...
Acquiring the deploy lock...
...
  INFO Running docker run --name custom-busybox --detach --restart unless-stopped \
    --log-opt max-size="10m" --env-file .kamal/env/accessories/custom-busybox.env \
    --label service="custom-busybox" registry:4443/busybox:1.36.0 ...
...
Releasing the deploy lock...
```

## Updating an accessory

Accessories are not updated when you deploy. To update one, change the `image:` in your config and run:

```bash
kamal accessory reboot [NAME]
```

## Choosing the right lifecycle command

- **`reboot`** — full replacement: stop the container, remove it, and start a new one. Use after changing the image or configuration. Expect brief downtime.
- **`restart`** — restart the existing container in place.
- **`stop` / `start`** — stop or start the existing container without removing it.
- **`remove`** — tear it down completely: removes the container, image, **and the data directory** from the host. Destructive.
- **`upgrade`** — one-time migration of accessories from Kamal 1.x to 2.0, restarting them in the `kamal` network.

## Inspecting an accessory

```bash
kamal accessory details [NAME]      # status/details (NAME=all for every accessory)
kamal accessory logs [NAME]         # log lines (pass --help for options)
kamal accessory exec [NAME] [CMD…]  # run a command in the container (pass --help for options)
```

---

Source: [kamal accessory command](https://kamal-deploy.org/docs/commands/accessory/).
