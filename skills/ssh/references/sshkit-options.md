# SSHKit Options Reference

Full reference for the `sshkit:` block in `config/deploy.yml`. [SSHKit](https://github.com/capistrano/sshkit) is the SSH toolkit used by Kamal.

The default settings should be sufficient for most use cases, but when connecting to a large number of hosts, you may need to adjust them.

Source: [SSHKit](https://kamal-deploy.org/docs/configuration/sshkit/).

## Options Table

| Key | Default | Description |
|-----|---------|-------------|
| `max_concurrent_starts` | `30` | Limits how many SSH connection starts happen at a time. |
| `pool_idle_timeout` | `900` (seconds) | How long idle connections are kept in the pool. |
| `dns_retries` | `3` | Number of DNS retries after the initial attempt. Set to `0` to disable. |

## Notes on Specific Keys

### `max_concurrent_starts`

Creating SSH connections concurrently can be an issue when deploying to many servers. By default, Kamal limits concurrent connection starts to 30 at a time. Lower it when opening many connections at once causes problems on a large fleet:

```yaml
sshkit:
  max_concurrent_starts: 10
```

### `pool_idle_timeout`

Kamal sets a long idle timeout of 900 seconds on connections to try to avoid re-connection storms after an idle period, such as building an image or waiting for CI:

```yaml
sshkit:
  pool_idle_timeout: 300
```

### `dns_retries`

Some resolvers (mDNSResponder, systemd-resolved, Tailscale) can drop lookups during bursts of concurrent SSH starts. Kamal will retry DNS failures automatically. This is the number of retries after the initial attempt; set to `0` to disable:

```yaml
sshkit:
  dns_retries: 3
```
