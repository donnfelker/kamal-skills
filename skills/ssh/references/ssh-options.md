# SSH Options Reference

Full reference for the `ssh:` block in `config/deploy.yml`. Kamal uses SSH to connect and run commands on your hosts. By default it connects to the `root` user on port `22`.

Source: [SSH configuration](https://kamal-deploy.org/docs/configuration/ssh/).

## Options Table

| Key | Default | Description |
|-----|---------|-------------|
| `user` | `root` | The SSH login user. |
| `port` | `22` | The SSH port. |
| `proxy` | — | Proxy (jump/bastion) host, in the form `<host>` or `<user>@<host>`. |
| `proxy_command` | — | A custom proxy command, required for older versions of SSH. |
| `log_level` | `fatal` | SSH log level. Set to `debug` if you are having SSH connection issues. |
| `keys_only` | — | Set to `true` to use only the private keys from `keys` and `key_data`, even if `ssh-agent` offers more identities. |
| `keys` | — | An array of file names of private keys to use for public-key and host-based authentication. |
| `key_data` | — | An array of strings, each element being a secret name. A raw PEM private key is also accepted but deprecated. |
| `config` | `true` | `true` loads the default OpenSSH config files (`~/.ssh/config`, `/etc/ssh_config`); `false` ignores them; a path or array of paths loads specific files. |
| `forward_agent` | `true` | Whether to forward the local SSH agent to the remote host (SSHKit's default). |

## Notes on Specific Keys

### `port`

The docs show the port as a quoted string:

```yaml
ssh:
  port: "2222"
```

### `proxy` vs `proxy_command`

- `proxy` is the simple form for a jump/bastion host: `<host>` or `<user>@<host>`.
- `proxy_command` is a custom command, required for older versions of SSH:

```yaml
ssh:
  proxy_command: "ssh -W %h:%p user@proxy"
```

### `keys_only`

Intended for situations where `ssh-agent` offers many different identities, or when you need to overwrite all identities and force a single one:

```yaml
ssh:
  keys_only: true
  keys: [ "~/.ssh/id.pem" ]
```

### `keys` and `key_data`

`keys` references private-key files on disk:

```yaml
ssh:
  keys: [ "~/.ssh/id.pem" ]
```

`key_data` references secret names (resolved from `.kamal/secrets`), which is the preferred way to inject a key without writing it to disk:

```yaml
ssh:
  key_data:
    - SSH_PRIVATE_KEY
```

A raw PEM string is also accepted in `key_data` but is deprecated:

```yaml
ssh:
  key_data:
    - "-----BEGIN OPENSSH PRIVATE KEY----- ..."
```

### `config`

Set to `true` to load the default OpenSSH config files (`~/.ssh/config`, `/etc/ssh_config`), `false` to ignore config files, or a file path (or array of paths) to load specific configuration. Defaults to `true`.

```yaml
ssh:
  config: [ "~/.ssh/myconfig" ]
```

### `forward_agent`

Whether to forward the local SSH agent to the remote host. Defaults to `true` (SSHKit's default). Set it to `false` when connecting through a jump host or tunnel that does not support agent forwarding — for example, Cloudflare Access for Infrastructure with SSH:

```yaml
ssh:
  forward_agent: false
```

## Bootstrapping a Non-Root User

If you are using a non-root user, you may need to bootstrap your servers manually before using them with Kamal. On Ubuntu:

```shell
sudo apt update
sudo apt upgrade -y
sudo apt install -y docker.io curl git
sudo usermod -a -G docker app
```
