---
name: rollback
description: Roll back a Kamal deployment to a previous image when a release goes bad, and identify or check which versions are deployed. Use when the user says "roll back," "rollback," "revert to the previous version," "go back to the last working deploy," "the deploy is broken, undo it," "which version is running," or "what versions can I roll back to." Covers `kamal rollback [VERSION]`, finding rollback targets with `kamal app containers -q`, and checking versions with `kamal app version` and `kamal version`. For building and shipping new releases, see deploying. For inspecting, stopping, starting, and managing running app containers, see app-operations.
metadata:
  version: 1.0.0
---

# Kamal Rollback

You are an expert in deploying applications with Kamal. Your goal is to get a bad release reverted quickly and safely by rolling back to a previous, known-good image — and to help the user identify and check which versions are deployed.

## When to Roll Back

Roll back when you've discovered a bad deploy and want to return to a previous image fast. A rollback is quick because the target image is already on the servers — Kamal stops the current container and starts a new one running the previous image. **Nothing needs to be downloaded from the registry.**

Before asking questions, check the project for context:

- Read `config/deploy.yml` to confirm the service, registry, and roles in play.
- If the user knows the symptom (errors, failed health checks), confirm they actually want to revert rather than fix-forward with a new `kamal deploy`.

## How Rollback Works

A rollback targets a **version** — the Git version hash that tags the app image (for example, `e5d9d7c2b898289dfbc5f7f1334140d984eedae4`). When you run `kamal rollback [VERSION]`, Kamal:

1. Stops the container running the current version.
2. Starts a new container running the same image as the target VERSION.

Because the image is already present on the servers, the rollback is immediate and offline-friendly — no registry pull.

> **Important:** By default, old containers are pruned after 3 days when you run `kamal deploy`. You can only roll back to a version whose container/image is still on the servers. If the target was pruned, you must redeploy that version instead (see the deploying skill).

## Step-by-Step Walkthrough

### Step 1 — List the versions available to roll back to

Run:

```bash
kamal app containers -q
```

This gives a presentation similar to `kamal app details`, but it **includes all the old containers as well** — so you can see which previous versions are still available as rollback targets.

```
App Host: 192.168.0.1
CONTAINER ID   IMAGE                                              ...   STATUS                      ...   NAMES
1d3c91ed1f51   registry.../app:6ef8a6a84c525b123c5245345a8483f86d05a123   Up 19 minutes                     chat-6ef8a6a84c525b123c5245345a8483f86d05a123
539f26b28369   registry.../app:e5d9d7c2b898289dfbc5f7f1334140d984eedae4   Exited (1) 27 minutes ago         chat-e5d9d7c2b898289dfbc5f7f1334140d984eedae4
```

### Step 2 — Identify the target version

The **version** is the image tag (the Git version hash), which also appears at the end of each container name. In the output above:

- `6ef8a6a84c525b123c5245345a8483f86d05a123` is the current version (`Up`).
- `e5d9d7c2b898289dfbc5f7f1334140d984eedae4` was the previous version, available as a rollback target.

Pick the last known-good hash.

For more on reading this output and the related inspection commands, see [references/inspecting-versions.md](references/inspecting-versions.md).

### Step 3 — Roll back

```bash
kamal rollback e5d9d7c2b898289dfbc5f7f1334140d984eedae4
```

Kamal stops the current container and starts a new one running the target image. No registry download occurs.

### Step 4 — Verify

Confirm the running version after the rollback:

```bash
kamal app version          # Show the app version currently running on servers
kamal app containers -q    # Re-list containers to confirm the new running container
```

## Checking Versions

There are three distinct "version" questions, each with its own command:

| Question | Command | What it returns |
|----------|---------|-----------------|
| What app version is running on my servers? | `kamal app version` | The app version currently running on servers |
| Which versions can I roll back to? | `kamal app containers -q` | Current and old containers (each tagged with its version hash) |
| What version of Kamal itself do I have? | `kamal version` | The version of Kamal installed (e.g., `2.12.0`) |

Don't confuse `kamal app version` (your **app's** deployed version) with `kamal version` (the **Kamal CLI's** version).

## Common Pitfalls

- **Target already pruned.** Old containers are pruned after 3 days by default when you run `kamal deploy`. If the version you want is gone, roll back is not possible — redeploy that Git version instead (see deploying).
- **Rolling back to a still-broken version.** Read the container `STATUS` in `kamal app containers -q`; an `Exited (1)` container failed before. Choose a version that was actually healthy.
- **Confusing CLI version with app version.** Use `kamal app version` for the deployed app, `kamal version` for the Kamal tool.

## Related Skills

- **deploying**: For building and shipping new releases with `kamal deploy`, and for redeploying a specific version when the rollback target has been pruned.
- **app-operations**: For inspecting, stopping, starting, and managing running app containers with the `kamal app` subcommands.
