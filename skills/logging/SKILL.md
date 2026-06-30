---
name: logging
description: Configure how logs flow in a Kamal deployment — the Docker logging driver and options for your app containers (the `logging:` key, where `driver` is passed to Docker as `--log-driver` and `options` as `--log-opt`, e.g. `json-file` with `max-size`), and Kamal's own output loggers that ship deploy/command logs to an OpenTelemetry endpoint or write them to a file on disk (the `output:` key, with `otel.endpoint` and `file.path`). Use when the user says things like "configure Docker logging," "set a log driver," "rotate or cap container logs with max-size," "docker logs are filling the disk," "set logging per role," "ship deploy logs to OpenTelemetry/OTel/OTLP," "send Kamal logs to a collector," or "write deploy logs to a file." For viewing running app and accessory logs with `kamal app logs` / `kamal accessory logs`, see app. For where these keys sit in config/deploy.yml alongside other top-level options, see config.
metadata:
  version: 1.0.0
---

# Logging

You are an expert in deploying applications with Kamal. Your goal is to configure where logs go: the **Docker logging driver and options** for the containers Kamal runs on your servers, and Kamal's **output loggers** for the command output it produces while deploying.

## Two separate concerns

Kamal has two distinct, independent logging settings. Keep them straight before you touch the config — they solve different problems and live under different keys.

| Concern | Key | Controls | Where it applies |
|---------|-----|----------|------------------|
| **Container logging** | `logging:` | The Docker logging driver and `--log-opt` options for your app's containers | On your servers, per container |
| **Output logging** | `output:` | Where Kamal sends its own command output (deploy logs) | OTel endpoint and/or a file |

Use `logging:` when you care about your application's stdout/stderr inside Docker (rotation, size caps, shipping container logs to a driver). Use `output:` when you want a durable record of what Kamal itself did during a deploy.

## Before you start

Inspect the existing configuration before asking the user questions:

- Read `config/deploy.yml` — check for an existing `logging:` or `output:` block, the `service:` name, and the roles under `servers:` (you may want logging per role).
- If the project uses destinations, check `config/deploy.<destination>.yml` for overrides.

Use what you find, then only ask for what's missing (which driver, what size cap, where to ship deploy logs).

## Part 1: Docker container logging (`logging:`)

The `logging:` key controls the Docker logging driver and options. Kamal passes these **straight through to Docker**, so any driver and any option Docker accepts are valid here.

These settings can be specified **at the root level or for a specific role**.

### Step 1: Set the driver

The logging driver is passed to Docker via `--log-driver`:

```yaml
logging:
  driver: json-file
```

`json-file` is the driver used in the Kamal docs. Because the value is handed directly to Docker, see [Docker's logging driver documentation](https://docs.docker.com/config/containers/logging/configure/) for the full catalog of available drivers.

### Step 2: Set the options

Any logging options are passed to the driver via `--log-opt`. Each entry under `options:` becomes one `--log-opt key=value`:

```yaml
logging:
  driver: json-file
  options:
    max-size: 100m
```

This is the most common reason to reach for `logging:` — capping container log size so logs don't fill the disk. Which option keys are valid depends on the driver you chose (see the Docker logging docs linked above).

### Step 3 (optional): Scope it to a role

Set `logging:` at the root to apply it everywhere, or place it under a specific role in `servers:` to override the logging for just that role:

```yaml
servers:
  web:
    - 192.168.0.1
  workers:
    hosts:
      - 192.168.0.2
    logging:
      driver: json-file
      options:
        max-size: 100m
```

### Viewing the resulting logs

Configuring the driver is separate from reading the logs. To tail or fetch logs from running containers, use `kamal app logs` (and `kamal accessory logs` for accessories). Those runtime commands belong to the **app** skill — see Related Skills.

## Part 2: Output loggers (`output:`)

The `output:` key configures where Kamal sends its own command output — the deploy logs. There are two output loggers: `otel` and `file`. You can configure either, or both, under the same `output:` key.

### Ship to OpenTelemetry (`otel`)

Ship deploy logs to an OpenTelemetry-compatible endpoint via OTLP HTTP:

```yaml
output:
  otel:
    endpoint: http://otel-gateway:4318
```

Logs are sent as OTLP log records, with resource attributes derived from Kamal's deploy tags — `service`, `version`, `performer`, `destination`, and similar. This lets your observability backend slice deploy logs by who deployed, which version, and which environment.

### Write to a file (`file`)

Write deploy logs to a file on the local machine (the machine running Kamal):

```yaml
output:
  file:
    path: /var/log/kamal/
```

One log file is created **per deploy**, named with the timestamp and command. `path` is the directory those files are written into.

### Both at once

Since `otel` and `file` are independent loggers under `output:`, you can enable both — for example, ship to a collector and keep a local copy:

```yaml
output:
  otel:
    endpoint: http://otel-gateway:4318
  file:
    path: /var/log/kamal/
```

## Quick reference

The keys above are the complete set. At a glance:

| Key | What it does | Maps to / behavior |
|-----|--------------|--------------------|
| `logging.driver` | Docker logging driver | `docker run --log-driver` |
| `logging.options` | Driver options (map) | each becomes `docker run --log-opt key=value` |
| `output.otel.endpoint` | OTLP HTTP endpoint for deploy logs | OTLP log records tagged with deploy attributes |
| `output.file.path` | Directory for deploy log files | one file per deploy, named by timestamp + command |

For the full table with types, examples, and the OTel resource-attribute detail, see [references/config-keys.md](references/config-keys.md).

## Common pitfalls

- **Confusing the two keys.** `logging:` is for your app's *container* logs (Docker driver/options). `output:` is for *Kamal's own* deploy/command logs (OTel/file). Setting the wrong one won't do what you expect.
- **Assuming an option works on any driver.** `options:` is forwarded as `--log-opt`, and valid option keys depend on the chosen Docker driver. Check Docker's docs for the driver you picked.
- **Expecting `logging:` to let you read logs.** It only configures the driver. Viewing logs is a separate runtime command (`kamal app logs`) — see app.

## Related Skills

- **app**: For viewing logs from running containers with `kamal app logs` (and `kamal accessory logs`), and other day-to-day app management commands.
- **config**: For where `logging:` and `output:` sit in `config/deploy.yml`, the other top-level options and their defaults, destinations (`-d`), and validating with `kamal config`.
