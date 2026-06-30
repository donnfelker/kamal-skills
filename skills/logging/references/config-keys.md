# Logging & output configuration keys

The complete set of keys for Kamal's two logging-related configuration blocks: `logging:` (Docker container logging) and `output:` (Kamal's own command-output loggers). Every key below is documented in the official Kamal docs:

- [Custom logging configuration](https://kamal-deploy.org/docs/configuration/logging/)
- [Output](https://kamal-deploy.org/docs/configuration/output/)

## `logging:` — Docker container logging

Controls the Docker logging driver and options. The values are passed straight through to Docker. Can be specified **at the root level or for a specific role**.

| Key | Type | Purpose | Maps to |
|-----|------|---------|---------|
| `driver` | string | The Docker logging driver to use | `docker run --log-driver <driver>` |
| `options` | map | Options passed to the driver; each `key: value` entry is forwarded individually | `docker run --log-opt key=value` (one per entry) |

### Example

```yaml
logging:
  driver: json-file
  options:
    max-size: 100m
```

### Per-role placement

Placed under a role in `servers:`, `logging:` overrides the logging configuration for just that role:

```yaml
servers:
  workers:
    hosts:
      - 192.168.0.2
    logging:
      driver: json-file
      options:
        max-size: 100m
```

### Notes

- `json-file` is the driver shown in the Kamal docs. Any driver Docker supports is valid because Kamal forwards the value unchanged — see [Docker's logging driver documentation](https://docs.docker.com/config/containers/logging/configure/) for the full list of drivers and their valid `--log-opt` keys.
- The Kamal docs show `max-size: 100m` as the example option.

## `output:` — Kamal command-output loggers

Configures where Kamal sends its own command output (deploy logs). Two loggers are available — `otel` and `file` — and they can be used independently or together.

| Key | Type | Purpose |
|-----|------|---------|
| `otel.endpoint` | string | Ship deploy logs to an OpenTelemetry-compatible endpoint via OTLP HTTP |
| `file.path` | string | Directory on the local machine where per-deploy log files are written |

### OTel

```yaml
output:
  otel:
    endpoint: http://otel-gateway:4318
```

- Logs are sent as OTLP log records.
- Resource attributes are derived from Kamal's deploy tags: `service`, `version`, `performer`, `destination`, etc.

### File

```yaml
output:
  file:
    path: /var/log/kamal/
```

- Writes deploy logs to a file on the local machine (the machine running Kamal).
- **One log file is created per deploy**, named with the timestamp and command.
- `path` is the directory those files are written into.

### Both together

```yaml
output:
  otel:
    endpoint: http://otel-gateway:4318
  file:
    path: /var/log/kamal/
```
