# Boot Configuration Reference

Complete reference for Kamal's `boot` configuration, which controls how new containers are booted across hosts during a deploy.

Official docs: https://kamal-deploy.org/docs/configuration/booting/

## Default Behavior

With **no** `boot` block in `config/deploy.yml`, Kamal boots new containers on **all hosts in parallel**. This is the fastest option and is the recommended baseline for small fleets. The `boot` configuration exists to slow that rollout down deliberately when deploying to large numbers of hosts.

## Configuration Keys

All keys live under a single top-level `boot:` block.

| Key | What it does | Value type | Default |
|-----|--------------|-----------|---------|
| `limit` | Number or percentage of hosts to boot at a time | Integer (e.g. `3`) **or** percentage string (e.g. `25%`) | All hosts boot in parallel |
| `wait` | Number of seconds to wait between booting each group of hosts | Integer seconds (e.g. `10`) | Applies only when `limit` is set |
| `parallel_roles` | Whether roles on a host boot in parallel rather than sequentially | Boolean (`true` / `false`) | `false` |

## `limit`

```yaml
boot:
  limit: 25%
```

```yaml
boot:
  limit: 3
```

`limit` sets the size of each boot **group**. Kamal boots one group, completes it, then proceeds to the next group until every host has booted the new container.

- **Integer** — a fixed number of hosts per group (`3` means three hosts at a time).
- **Percentage string** — a share of the fleet per group (`25%` means a quarter of the hosts at a time). A percentage scales automatically as the number of servers changes.

### Worked grouping examples

These illustrate group counts using clean arithmetic; choose `limit` values that divide your fleet evenly to keep batches predictable.

| Hosts | `limit` | Hosts per group | Number of groups |
|-------|---------|-----------------|------------------|
| 8 | `25%` | 2 | 4 |
| 9 | `3` | 3 | 3 |
| 12 | `25%` | 3 | 4 |
| 10 | `5` | 5 | 2 |

### Integer vs. percentage — which to use

- **Percentage** when you want batch size to track fleet size as you scale up or down.
- **Integer** when batch size is bounded by a downstream constraint (database connection headroom, queue capacity, a fixed pool of warm caches) and must stay constant regardless of how many servers you run.

## `wait`

```yaml
boot:
  limit: 25%
  wait: 10
```

`wait` is the number of seconds Kamal pauses **between** booting each group of hosts. It gives the fleet time to settle — caches to warm, connections to rebalance, health to recover — before the next group cycles.

Because `wait` pauses between groups, it is only meaningful alongside `limit`. With no `limit`, all hosts form a single parallel group and there is nothing to wait between.

Tuning guidance:

- Start with a small `wait` (a few seconds) and increase if metrics show load not settling between batches.
- Larger `wait` values increase total deploy time in exchange for a gentler rollout.

## `parallel_roles`

```yaml
boot:
  parallel_roles: true
```

If a single host runs **multiple roles** (for example a host assigned both the `web` role and a `workers` role), Kamal boots those roles on that host **sequentially** by default. Setting `parallel_roles: true` boots them **in parallel** on that host instead.

- Defaults to `false`.
- Only has an effect when a host carries more than one role. On single-role hosts it does nothing.
- For how servers are assigned to roles, see the official [Roles](https://kamal-deploy.org/docs/configuration/roles/) and [Servers](https://kamal-deploy.org/docs/configuration/servers/) docs, or the `servers` skill.

## How Boot Pacing Fits the Deploy

The `boot` block controls only the *pacing* of the rollout across hosts. On each host, the per-host deploy sequence is unchanged: Kamal starts the new container, waits for it to pass its health check, routes traffic to it via kamal-proxy, then stops the old container. `boot.limit` and `boot.wait` simply control how many hosts run that sequence at once and how long to pause between batches.

See the [`kamal deploy`](https://kamal-deploy.org/docs/commands/deploy/) command docs for the full deploy sequence. The boot strategy applies on both `kamal deploy` and `kamal redeploy`.

## Full Example

```yaml
# config/deploy.yml
service: my-app
image: my-user/my-app

servers:
  web:
    - 10.0.0.1
    - 10.0.0.2
    - 10.0.0.3
    - 10.0.0.4
    - 10.0.0.5
    - 10.0.0.6
    - 10.0.0.7
    - 10.0.0.8

boot:
  limit: 25%          # boot 2 of the 8 hosts at a time
  wait: 10            # pause 10 seconds between each group
  parallel_roles: false
```
