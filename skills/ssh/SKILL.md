---
name: ssh
description: 'Configure how Kamal connects to servers over SSH and tune SSHKit connection handling. Use when the user sets the SSH `user` or `port`, authenticate with specific `keys`/`key_data`, force `keys_only`, control agent forwarding (`forward_agent`), load an OpenSSH `config` file, connect through a jump/bastion host with `proxy` or `proxy_command`, debug connection problems with `log_level: debug`, or tune concurrency and pooling (`max_concurrent_starts`, `pool_idle_timeout`, `dns_retries`) when deploying to many hosts. Also use when they say "kamal can''t connect to my server," "permission denied (publickey)," "deploy as a non-root user," "kamal through a bastion/jump host," "SSH timeouts deploying to lots of servers," or "change the SSH port for kamal." These map to the `ssh:` and `sshkit:` blocks in `config/deploy.yml`. For first-time project setup, see setup. For defining the hosts and roles you connect to, see servers.'
metadata:
  version: 1.0.0
---

# SSH Connectivity and SSHKit Tuning

You are an expert in deploying applications with Kamal. Your goal here is to get Kamal connecting reliably to the user's servers over SSH, and — when they deploy to many hosts — to tune the SSHKit connection layer so deploys don't stall or fail.

Kamal uses SSH to connect and run commands on your hosts. By default it connects to the `root` user on port `22`, authenticated by your SSH key. Two configuration blocks control this, both in `config/deploy.yml`:

- **`ssh:`** — who you connect as, on what port, with which keys, and through which proxy.
- **`sshkit:`** — how the underlying [SSHKit](https://github.com/capistrano/sshkit) toolkit manages connection concurrency and pooling.

## Before You Start

Read what the user already has before asking questions:

- **`config/deploy.yml`** — check for existing `ssh:` and `sshkit:` blocks, and look at the `servers:` list to see how many hosts you're connecting to.
- **`.kamal/secrets`** — if you'll reference a private key by secret name (`key_data`), confirm the secret exists here.
- **`~/.ssh/config`** — existing host aliases, users, ports, or `ProxyJump` entries may already define how to reach these hosts.

Then run `kamal config` to print the resolved configuration, including the `:ssh_options:` Kamal will actually use (user, port, log level). This is the fastest way to confirm what's in effect before changing anything.

## How Kamal Uses SSH

Defaults: `root` user, port `22`. When you run `kamal setup`, Kamal connects to each server over SSH (root by default), installs Docker if missing, and proceeds with the deploy. Root access over SSH is what lets the initial Docker install happen.

If you connect as a **non-root user**, you may need to bootstrap each server manually first so the user can run Docker. On Ubuntu:

```shell
sudo apt update
sudo apt upgrade -y
sudo apt install -y docker.io curl git
sudo usermod -a -G docker app
```

## Step 1: Set the SSH User and Port

All SSH settings live under the `ssh:` key. Set the login user and port if they differ from the defaults:

```yaml
ssh:
  user: app
  port: "2222"
```

- `user` defaults to `root`.
- `port` defaults to `22`.

If you changed the user to a non-root account, make sure you bootstrapped Docker access for it (see above).

## Step 2: Authenticate

By default Kamal authenticates with the keys your `ssh-agent` offers and your OpenSSH config. To be explicit, point Kamal at specific keys.

### Use specific key files

`keys` is an array of private-key file names used for public-key and host-based authentication:

```yaml
ssh:
  keys: [ "~/.ssh/id.pem" ]
```

### Supply a key from a secret

`key_data` is an array where each element is a **secret name** (resolved from `.kamal/secrets`):

```yaml
ssh:
  key_data:
    - SSH_PRIVATE_KEY
```

This is the preferred way to inject a key in CI. You can also pass a raw PEM string here, but that is deprecated.

### Force a single identity

If your `ssh-agent` offers many identities (a common cause of `Too many authentication failures`), set `keys_only: true` so Kamal uses only the keys from `keys` and `key_data`:

```yaml
ssh:
  keys_only: true
  keys: [ "~/.ssh/id.pem" ]
```

### OpenSSH config and agent forwarding

- `config` controls whether the default OpenSSH config files (`~/.ssh/config`, `/etc/ssh_config`) are loaded. It defaults to `true`. Set it to `false` to ignore them, or to a path (or array of paths) to load specific files.
- `forward_agent` controls whether your local SSH agent is forwarded to the remote host. It defaults to `true` (SSHKit's default).

```yaml
ssh:
  config: [ "~/.ssh/myconfig" ]
  forward_agent: false
```

See [references/ssh-options.md](references/ssh-options.md) for the full `ssh:` key reference.

## Step 3: Connect Through a Jump / Bastion Host

If your servers aren't reachable directly, route the connection through a proxy (bastion/jump) host.

### Proxy host

`proxy` takes the form `<host>` or `<user>@<host>`:

```yaml
ssh:
  proxy: root@proxy-host
```

### Custom proxy command

For older versions of SSH that need an explicit command, use `proxy_command`:

```yaml
ssh:
  proxy_command: "ssh -W %h:%p user@proxy"
```

### Agent forwarding through a jump host

Set `forward_agent: false` when connecting through a jump host or tunnel that does **not** support agent forwarding — for example, Cloudflare Access for Infrastructure with SSH:

```yaml
ssh:
  proxy: bastion.example.com
  forward_agent: false
```

## Step 4: Debug Connection Issues

When a deploy fails with an SSH error (permission denied, timeouts, host key problems), raise the log level. `log_level` defaults to `fatal`; set it to `debug` to see the underlying SSH negotiation:

```yaml
ssh:
  log_level: debug
```

Use this together with `kamal config` (to confirm the resolved user/port/keys) to pinpoint whether the problem is authentication, the wrong port, or the proxy.

## Step 5: Tune SSHKit for Many Servers

The SSHKit defaults are sufficient for most deployments. Reach for the `sshkit:` block when you deploy to a **large number of hosts** and see connection storms, DNS hiccups, or reconnection churn.

```yaml
sshkit:
  max_concurrent_starts: 10
  pool_idle_timeout: 300
  dns_retries: 3
```

| Key | Default | What it does |
|-----|---------|--------------|
| `max_concurrent_starts` | `30` | Caps how many SSH connections Kamal opens at once. Lower it when opening many connections concurrently causes problems on large fleets. |
| `pool_idle_timeout` | `900` (seconds) | How long idle connections are kept. Kamal keeps a long idle timeout to avoid re-connection storms after idle periods like image builds or waiting for CI. |
| `dns_retries` | `3` | Retries after the initial DNS attempt. Some resolvers (mDNSResponder, systemd-resolved, Tailscale) drop lookups during bursts of concurrent SSH starts; Kamal retries automatically. Set to `0` to disable. |

For more on when and how to adjust these, see [references/sshkit-options.md](references/sshkit-options.md).

## Verify Your Configuration

After editing, confirm the result:

```bash
kamal config
```

The output includes a `:ssh_options:` section (user, port, log level) and the `:sshkit:` settings Kamal resolved from `config/deploy.yml`. Check these match what you intended before running a deploy.

If you use destinations, `ssh:` and `sshkit:` can be set per destination: the matching `config/deploy.<destination>.yml` is merged over the base config (e.g. `kamal config -d staging`).

## Full Example

A non-root deploy through a bastion, with an explicit key and tuned concurrency:

```yaml
ssh:
  user: app
  port: "2222"
  proxy: deploy@bastion.example.com
  keys: [ "~/.ssh/deploy.pem" ]
  keys_only: true
  forward_agent: false

sshkit:
  max_concurrent_starts: 10
```

## Related Skills

- **setup**: First-time Kamal setup — installing the gem, `kamal init`, and `config/deploy.yml` basics before you tune SSH.
- **servers**: Defining the hosts and roles (`servers:`) that these SSH settings connect to.
