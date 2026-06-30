# Inspecting Kamal Versions and Containers

Reference for finding rollback targets and checking which versions are deployed. Use this alongside the rollback walkthrough in `SKILL.md`.

## Reading `kamal app containers -q`

`kamal app containers -q` lists the app's containers on every server. It produces a presentation similar to `kamal app details`, but it **includes all the old containers as well** — which is exactly what you need to find a rollback target.

Example output across two hosts:

```
App Host: 192.168.0.1
CONTAINER ID   IMAGE                                                                         COMMAND                    CREATED          STATUS                      PORTS      NAMES
1d3c91ed1f51   registry.digitalocean.com/user/app:6ef8a6a84c525b123c5245345a8483f86d05a123   "/rails/bin/docker-e..."   19 minutes ago   Up 19 minutes               3000/tcp   chat-6ef8a6a84c525b123c5245345a8483f86d05a123
539f26b28369   registry.digitalocean.com/user/app:e5d9d7c2b898289dfbc5f7f1334140d984eedae4   "/rails/bin/docker-e..."   31 minutes ago   Exited (1) 27 minutes ago              chat-e5d9d7c2b898289dfbc5f7f1334140d984eedae4

App Host: 192.168.0.2
CONTAINER ID   IMAGE                                                                         COMMAND                    CREATED          STATUS                      PORTS      NAMES
badb1aa51db4   registry.digitalocean.com/user/app:6ef8a6a84c525b123c5245345a8483f86d05a123   "/rails/bin/docker-e..."   19 minutes ago   Up 19 minutes               3000/tcp   chat-6ef8a6a84c525b123c5245345a8483f86d05a123
6f170d1172ae   registry.digitalocean.com/user/app:e5d9d7c2b898289dfbc5f7f1334140d984eedae4   "/rails/bin/docker-e..."   31 minutes ago   Exited (1) 27 minutes ago              chat-e5d9d7c2b898289dfbc5f7f1334140d984eedae4
```

How to read it:

| Column | What it tells you |
|--------|-------------------|
| `IMAGE` | The full image reference; the tag after `:` is the **version** (the Git version hash). |
| `STATUS` | `Up` is the current/running version; `Exited (...)` is a stopped previous container. |
| `NAMES` | The container name ends with the same version hash, e.g., `chat-e5d9d7c2…`. |

In this example, `6ef8a6a84c525b123c5245345a8483f86d05a123` is the current version and `e5d9d7c2b898289dfbc5f7f1334140d984eedae4` is the previous version available as a rollback target:

```bash
kamal rollback e5d9d7c2b898289dfbc5f7f1334140d984eedae4
```

## App Inspection Subcommands

The `kamal app` command group manages running apps. The subcommands most relevant to identifying and verifying versions:

| Command | Description |
|---------|-------------|
| `kamal app containers` | Show app containers on servers (add `-q` to include all old containers). |
| `kamal app details` | Show details about app containers. |
| `kamal app images` | Show app images on servers. |
| `kamal app version` | Show app version currently running on servers. |
| `kamal app stale_containers` | Detect app stale containers. |

For the complete `kamal app` subcommand set (boot, exec, logs, maintenance, live, start, stop, remove, and more), see the app skill.

## Which Command Answers Which Question

| You want to know… | Run | Source of truth |
|-------------------|-----|-----------------|
| Versions available to roll back to | `kamal app containers -q` | Container list including old containers |
| The app version running now | `kamal app version` | The servers |
| The installed Kamal CLI version | `kamal version` | Your local Kamal install |

## Pruning Caveat

By default, old containers are pruned after 3 days when you run `kamal deploy`. A rollback works only when the target image/container is still present on the servers (nothing is downloaded from the registry). If `kamal app containers -q` no longer lists the version you want, it has likely been pruned — redeploy that Git version instead (see the deploy skill).
