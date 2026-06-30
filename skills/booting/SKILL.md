---
name: booting
description: Control how Kamal boots new containers across many servers during a deploy — rolling the release out in batches instead of restarting every host at once. Use when the user mentions "boot limit," "boot strategy," "rolling deploy," "deploy in batches," "restart a few hosts at a time," "stagger the deploy," "boot 25% at a time," "wait between servers," "thundering herd on deploy," or the `boot`, `boot.limit`, `boot.wait`, or `boot.parallel_roles` config keys in config/deploy.yml. For running the deploy itself, see deploying. For how servers map to roles (which matters for parallel_roles), see servers-and-roles.
metadata:
  version: 1.0.0
---

# Booting

You are an expert in deploying applications with Kamal. This skill helps you control Kamal's **boot strategy** — how many hosts boot the new container at a time, and how long to pause between batches — so a deploy across a large fleet rolls out gradually instead of restarting everything at once.

## When You Need This

By default, Kamal boots new containers on **all hosts in parallel**. That is fast and fine for small fleets. It becomes a problem when you have many servers and a simultaneous restart causes:

- A thundering-herd reconnect against a shared database, cache, or queue.
- A capacity dip while every host is briefly cycling its container.
- Load spikes from cold caches or warm-up work happening everywhere at once.

The `boot` configuration lets you boot hosts in **groups**, with an optional pause between each group, so the fleet drains and refills gradually.

## How Kamal Boots by Default

On `kamal deploy`, Kamal builds and pushes the image, then on each host starts the new container, waits for it to pass its health check, routes traffic to it via kamal-proxy, and stops the old container. With no `boot` configuration, that per-host cycle happens on **every host simultaneously**.

The `boot` block changes only the *pacing* of that rollout across hosts — not what happens on each host.

## Walk-Through: Add a Boot Strategy

### Step 1 — Read the existing config

Open the user's `config/deploy.yml` and look at the `servers:` section. Note:

- **How many hosts** are in the deploy (count them, or run `kamal config` to list resolved hosts and roles).
- **Whether any host carries multiple roles** (e.g. both `web` and a `workers` role) — that determines whether `parallel_roles` is relevant.

The bigger the fleet, the more a boot limit helps. For two or three identical web servers, the default parallel boot is usually fine.

### Step 2 — Choose a boot limit

Add a `boot:` block and set `limit` to the size of each batch. It can be an **integer** (a fixed number of hosts) or a **percentage string**:

```yaml
boot:
  limit: 25%   # boot a quarter of the hosts at a time
```

```yaml
boot:
  limit: 3     # boot 3 hosts at a time
```

Kamal boots one group of that size, finishes it, then moves to the next group until all hosts are done.

### Step 3 — Add a wait between groups

If you want the fleet to settle before the next batch cycles (let caches warm, connections rebalance, alarms clear), add `wait` — the number of **seconds** to pause between booting each group of hosts:

```yaml
boot:
  limit: 25%
  wait: 10
```

`wait` only matters when `limit` is set, because it pauses *between groups* — with no limit there is a single parallel group and nothing to wait between.

### Step 4 — (Optional) Boot multiple roles on a host in parallel

If a single host runs **more than one role**, Kamal boots those roles on that host **sequentially** by default. To boot them at the same time instead, set `parallel_roles`:

```yaml
boot:
  limit: 25%
  wait: 10
  parallel_roles: true
```

This only has an effect when a host carries multiple roles. It defaults to `false`. For how hosts map to roles, see the **servers-and-roles** skill.

### Step 5 — Deploy

The boot strategy takes effect on the next deploy. Nothing else changes about the command:

```bash
kamal deploy
```

It applies the same way on `kamal redeploy` (which deploys without re-bootstrapping servers).

## The `boot` Configuration Keys

| Key | What it does | Value | Default |
|-----|--------------|-------|---------|
| `limit` | Number or percentage of hosts to boot at a time | Integer (e.g. `3`) or percentage string (e.g. `25%`) | Boot all hosts in parallel |
| `wait` | Seconds to wait between booting each group of hosts | Integer seconds (e.g. `10`) | Applies only when `limit` is set |
| `parallel_roles` | Whether multiple roles on a single host boot in parallel instead of sequentially | `true` / `false` | `false` |

All three keys live under a single top-level `boot:` block in `config/deploy.yml`.

## Choosing `limit` and `wait`

- **Percentage vs. integer**: A percentage (`25%`) scales automatically as you add or remove servers — good when the fleet grows. An integer (`3`) keeps batches a fixed size regardless of fleet size — good when batch size is constrained by downstream capacity (e.g. database connection headroom).
- **Smaller `limit`** = safer and slower; fewer hosts cycling at once, but more groups to get through.
- **`wait`** trades total deploy time for stability. Start small (a few seconds) and increase if you see load not settling between batches.
- For the full reference, including how groups are formed and worked batch-size examples, see [references/boot-configuration-reference.md](references/boot-configuration-reference.md).

## Example: Gradual Rollout Across a Large Fleet

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
  limit: 25%   # boot 2 of the 8 web hosts at a time
  wait: 10     # pause 10 seconds between each group
```

With `limit: 25%` over 8 hosts, Kamal boots in groups of 2, pausing 10 seconds between groups, until all 8 are running the new version.

## Related Skills

- **deploying**: For running the deploy itself (`kamal deploy` / `kamal redeploy`) and the full per-host deploy sequence that the boot strategy paces.
- **servers-and-roles**: For how servers map to roles and when a host carries multiple roles — the case where `parallel_roles` applies.
