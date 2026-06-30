# kamal registry commands

`kamal registry` logs in and out of the Docker registry on your servers — locally and on every remote server.

## Subcommands

| Command | Description |
|---------|-------------|
| `kamal registry login` | Log in to remote registry locally and remotely |
| `kamal registry logout` | Log out of remote registry locally and remotely |
| `kamal registry setup` | Setup local registry or log in to remote registry locally and remotely |
| `kamal registry remove` | Remove local registry or log out of remote registry locally and remotely |
| `kamal registry help [COMMAND]` | Describe subcommands or one specific subcommand |

## Examples

```bash
$ kamal registry login
  INFO [60171eef] Running docker login registry:4443 -u [REDACTED] -p [REDACTED] on localhost
  INFO [60171eef] Finished in 0.069 seconds with exit status 0 (successful).
  INFO [427368d0] Running docker login registry:4443 -u [REDACTED] -p [REDACTED] on server1
  INFO [4c4ab467] Running docker login registry:4443 -u [REDACTED] -p [REDACTED] on server3
  INFO [f985bed4] Running docker login registry:4443 -u [REDACTED] -p [REDACTED] on server2
  INFO [427368d0] Finished in 0.232 seconds with exit status 0 (successful).
  INFO [f985bed4] Finished in 0.234 seconds with exit status 0 (successful).
  INFO [4c4ab467] Finished in 0.245 seconds with exit status 0 (successful).

$ kamal registry logout
  INFO [72b94e74] Running docker logout registry:4443 on server2
  INFO [d096054d] Running docker logout registry:4443 on server1
  INFO [8488da90] Running docker logout registry:4443 on server3
  INFO [72b94e74] Finished in 0.142 seconds with exit status 0 (successful).
  INFO [8488da90] Finished in 0.179 seconds with exit status 0 (successful).
  INFO [d096054d] Finished in 0.183 seconds with exit status 0 (successful).
```

Each command runs `docker login` / `docker logout` against the configured registry on localhost and on each server, as shown above.

## How it relates to deploy

`kamal deploy` logs in to the Docker registry locally and on all servers as its first step, then builds the app image, pushes it to the registry, and pulls it onto the servers. You typically run `kamal registry login` directly only to validate your registry configuration.
