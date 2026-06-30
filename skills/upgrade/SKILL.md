---
name: upgrade
description: Walk through upgrading an existing Kamal 1.x project to Kamal 2.0 with `kamal upgrade` — the move from Traefik to kamal-proxy, the new custom `kamal` Docker network, backward-incompatible configuration changes (the `traefik` block becoming `proxy`, the `app_port` default changing from 3000 to 80, the removed `healthcheck` section, and required `builder` `arch`), and migrating secrets from `.env`/`.env.rb` to `.kamal/secrets`. Use when the user says "upgrade Kamal to 2.0," "migrate from Kamal 1 to 2," "kamal upgrade," "kamal downgrade," "my traefik config stopped working," "how do I do a rolling upgrade," "convert my deploy.yml for Kamal 2," or "keep using Traefik on Kamal 2." Covers validating config with `kamal config`, the `kamal upgrade --rolling` sequence, downgrading back to Kamal 1.9, and running Traefik as an accessory in front of kamal-proxy. For configuring kamal-proxy itself, see proxy. For the `.kamal/secrets` format, see secrets. For the full Kamal 2 config reference, see config.
metadata:
  version: 1.0.0
---

# Upgrading Kamal 1.x to 2.0

You are an expert in deploying applications with Kamal. Your job is to take a working Kamal 1.x project and upgrade it to Kamal 2.0 — converting its configuration, moving its secrets, and switching it from Traefik to kamal-proxy with `kamal upgrade`.

## What changes in Kamal 2

There are some significant differences between Kamal 1 and Kamal 2:

- **Proxy** — the Traefik proxy has been replaced by **kamal-proxy**, a custom proxy built for Kamal.
- **Network** — Kamal now runs all containers in a custom Docker network called `kamal`.
- **Configuration** — there are backward-incompatible configuration changes (notably `traefik` → `proxy` and the removed `healthcheck` section).
- **Secrets** — how secrets are passed to containers has changed: they move from `.env`/`.env.rb` to `.kamal/secrets`.

If you want to keep using Traefik, you can run it as an accessory in front of kamal-proxy. See [Continuing to use Traefik](#continuing-to-use-traefik).

## Before you start

Read the user's existing setup before asking questions — it tells you exactly what has to change:

- **`config/deploy.yml`** — look for a `traefik:` block, a `healthcheck:` section, the `builder:` config, and any ERB that reads `ENV[...]`. These are the parts you will convert.
- **`.env` / `.env.rb`** — the secrets and values you will move into `.kamal/secrets`.
- **`.kamal/secrets`** — may not exist yet; this is where secrets live in Kamal 2.

> **Warning:** Test the upgrade in a non-production environment first, if possible.

## Upgrade walk-through

Follow these steps in order. Steps 1 and 6 are about the in-place server upgrade; steps 2–5 prepare your project for Kamal 2.

### 1. Upgrade to Kamal 1.9.x first

If you are planning to do in-place upgrades of servers, first upgrade to **Kamal 1.9**, because it has support for downgrading. Using the gem directly:

```bash
gem install kamal --version 1.9.0
```

Confirm you can still deploy your application with Kamal 1.9 before going further.

### 2. Upgrade the gem to Kamal 2

```bash
gem install kamal
```

### 3. Convert your configuration

Update `config/deploy.yml` for Kamal 2. The most important conversions:

- Replace the `traefik` block — it is **no longer valid**. Configure kamal-proxy under `proxy` instead.
- Remove the `healthcheck` section — it has been **removed**. Proxy-role healthchecks now live under `proxy/healthcheck`.
- Add `arch` to your `builder` block — you must now specify the architecture(s) you build for.
- Check your app port — the default changed from **3000 to 80** (see step 5).

Test that the new configuration is valid:

```bash
kamal config
```

If you have multiple destinations, test each one:

```bash
kamal config -d staging
kamal config -d beta
```

For the full set of configuration changes (builder `arch`/`remote`/`driver`, the `traefik` → `proxy` mapping, and all the healthcheck and timeout settings), see [references/configuration-changes.md](references/configuration-changes.md).

### 4. Move from .env to .kamal/secrets

Secrets move from `.env`/`.env.rb` to **`.kamal/secrets`**. If you use destinations, secrets are read from `.kamal/secrets.<DESTINATION>` first, or `.kamal/secrets-common` if that is not found.

The `kamal envify` and `kamal env` commands have been **removed** — secrets no longer have a separate lifecycle. Use dotenv's command and variable substitution instead, performed on demand when a Kamal command needs them:

```bash
# .kamal/secrets
SECRET_FROM_ENV=$SECRET_FROM_ENV
SECRET_FROM_COMMAND=$(op read ...)
```

Note that values from `.env` and `.kamal/secrets` are **no longer loaded into the environment**, so ERB in `deploy.yml` can't read them automatically anymore. For how to load `.env` manually and the full migration, see [references/secrets-changes.md](references/secrets-changes.md).

### 5. Verify your container port

The default app port was **changed from 3000 to 80**. kamal-proxy forwards traffic to container port 80 by default because it assumes your container is running Thruster, which listens on port 80.

If your app listens on a different port, either set `app_port` or update your `EXPOSE` port:

```yaml
proxy:
  app_port: 3000
```

### 6. Run the in-place upgrade

With your configuration and secrets converted, upgrade the running servers:

```bash
kamal upgrade [-d <DESTINATION>]
```

You'll need to run this separately for each destination.

The `kamal upgrade` command will:

1. Stop and remove the Traefik proxy.
2. Create a `kamal` Docker network if one doesn't exist.
3. Start a `kamal-proxy` container in the new network.
4. Reboot the currently deployed version of the app container in the new network.
5. Tell `kamal-proxy` to send traffic to it.
6. Reboot all accessories in the new network.

## Avoiding downtime

If you run your application on multiple servers and want to avoid downtime, do a **rolling upgrade** — the same steps as above, but host by host:

```bash
kamal upgrade --rolling [-d <DESTINATION>]
```

Alternatively, run the command host by host yourself:

```bash
kamal upgrade -h 127.0.0.1[,127.0.0.2]
```

To ensure no requests are dropped, you can use the [pre-proxy-reboot](https://kamal-deploy.org/docs/hooks/pre-proxy-reboot/) and [post-proxy-reboot](https://kamal-deploy.org/docs/hooks/post-proxy-reboot/) hooks to manually remove each server from upstream load balancers during the upgrade.

## Downgrading

If you need to reverse your changes and go back to Kamal 1.9:

1. Uninstall Kamal 2.0.
2. Confirm you are running Kamal 1.9 by running `kamal version`.
3. Run `kamal downgrade`. It has the same options as `kamal upgrade` and reverses the process.

The `kamal upgrade` and `kamal downgrade` commands can be re-run against servers that have already been upgraded or downgraded.

## The custom `kamal` network

kamal-proxy needs a **stable hostname** for the container it routes to, so it can identify and route traffic across restarts. On the default `bridge` network, containers get IP addresses that are not stable across restarts — so Kamal creates and uses a custom network called **`kamal`**. Accessories also run from within the `kamal` network.

If you have custom networking requirements, you can create the `kamal` network yourself before deploying, or use a [docker-setup](https://kamal-deploy.org/docs/hooks/docker-setup/) hook to configure the network when running `kamal setup`.

## Continuing to use Traefik

Kamal 2 requires kamal-proxy, but you can keep Traefik by running it as a Kamal **accessory** and routing requests through it and on to kamal-proxy (Traefik → kamal-proxy → your app).

At a high level you:

1. Change kamal-proxy's boot config (via a `pre-deploy` hook) so it doesn't publish ports on the host and adds the labels Traefik needs.
2. Add Traefik as an accessory in `config/deploy.yml`, bound to the host port.

For the exact `kamal proxy boot_config set` command, the accessory definition, and how to switch a host that is already running kamal-proxy, see [references/continuing-to-use-traefik.md](references/continuing-to-use-traefik.md).

## Quick reference

| Command | What it does |
|---------|--------------|
| `kamal config` | Validate the converted configuration |
| `kamal config -d <DESTINATION>` | Validate the configuration for one destination |
| `kamal upgrade [-d <DESTINATION>]` | Upgrade servers from Kamal 1.x to 2.0 |
| `kamal upgrade --rolling [-d <DESTINATION>]` | Upgrade host by host to avoid downtime |
| `kamal upgrade -h 127.0.0.1[,127.0.0.2]` | Upgrade specific hosts |
| `kamal downgrade` | Reverse the upgrade, back to Kamal 1.9 |
| `kamal version` | Confirm which Kamal version is installed |

## Related Skills

- **proxy**: Configure and operate kamal-proxy — `host`/`hosts`, `ssl`, `app_port`, healthcheck, and the `kamal proxy` command — once you're on Kamal 2.
- **secrets**: The `.kamal/secrets` format, destinations, and dotenv-style interpolation you migrate to in step 4.
- **config**: The full Kamal 2 `config/deploy.yml` reference for the keys you convert in step 3.
- **deploy**: Run `kamal deploy` to roll out new versions once the upgrade is complete.
