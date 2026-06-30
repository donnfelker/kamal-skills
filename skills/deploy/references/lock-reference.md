# `kamal lock` Reference

Manage deployment locks. Source: the official Kamal docs for [lock](https://kamal-deploy.org/docs/commands/lock/).

Commands that are unsafe to run concurrently take a lock while they run. The lock is an atomically created directory in the `.kamal` directory on the **primary server**. You can manage it directly — for example, clearing a leftover lock from a failed command or preventing deployments during a maintenance window.

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `kamal lock acquire -m, --message=MESSAGE` | Acquire the deploy lock |
| `kamal lock release` | Release the deploy lock |
| `kamal lock status` | Report lock status |
| `kamal lock help [COMMAND]` | Describe subcommands or one specific subcommand |

## Worked Example

```bash
$ kamal lock status
  INFO [f085f083] Running /usr/bin/env mkdir -p .kamal on server1
  INFO [f085f083] Finished in 0.146 seconds with exit status 0 (successful).
There is no deploy lock

$ kamal lock acquire -m "Maintenance in progress"
  INFO [d9f63437] Running /usr/bin/env mkdir -p .kamal on server1
  INFO [d9f63437] Finished in 0.138 seconds with exit status 0 (successful).
Acquired the deploy lock

$ kamal lock status
  INFO [9315755d] Running /usr/bin/env mkdir -p .kamal on server1
  INFO [9315755d] Finished in 0.130 seconds with exit status 0 (successful).
Locked by: Deployer at 2024-04-05T08:32:46Z
Version: 75bf6fa40b975cbd8aec05abf7164e0982f185ac
Message: Maintenance in progress

$ kamal lock release
  INFO [7d5718a8] Running /usr/bin/env mkdir -p .kamal on server1
  INFO [7d5718a8] Finished in 0.137 seconds with exit status 0 (successful).
Released the deploy lock
```

## Waiting for the Lock

Commands that take a lock automatically while they run (such as `kamal deploy`) fail immediately if the lock is already held. Pass `--lock-wait` to make them poll and retry until the lock is released instead:

```bash
$ kamal deploy --lock-wait
```

`--lock-wait` only waits on locks that another command took **automatically** while running. A lock set manually with `kamal lock acquire` is **not** waited on, and the command fails immediately with `Deploy lock held manually, not waiting`.

### Tuning the Wait

| Flag | Default | Description |
|------|---------|-------------|
| `--lock-wait-timeout` | `900` | Maximum seconds to wait before giving up |
| `--lock-wait-interval` | `15` | Seconds between polls |

```bash
$ kamal deploy --lock-wait --lock-wait-timeout 300 --lock-wait-interval 10
```
