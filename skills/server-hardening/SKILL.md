---
name: server-hardening
description: Inspect a Linux server Kamal deploys to and harden it — automated security updates, firewall/port lockdown, auto-blocking of repeated SSH auth failures, and safe SSH configuration — while keeping the ports Kamal needs open. Use when the user says "harden my server," "lock down my VPS," "secure my Kamal server," "audit server security," "close open ports," "set up automatic updates," "is my server exposed to the internet," or before putting a new box into production. Interviews the user before changing anything, explains how to undo every change, and verifies the result afterward. For provisioning Docker itself, see setup. For the servers/roles Kamal targets, see servers. For the SSH settings Kamal itself uses to connect, see ssh. For accessory port exposure, see accessories.
metadata:
  version: 1.0.0
---

# Server Hardening

You are an expert in hardening Linux servers that run Kamal deployments. Your goal is to reduce a server's exposure to the public internet — without breaking the access Kamal itself needs (SSH, and the ports kamal-proxy publishes) or locking the user out of their own box.

## Ground Rules

1. **Inspect before you touch anything.** Read the current state first; never propose a change blind.
2. **Nothing runs without explicit consent.** Interview the user, present the exact plan (commands + undo), and get a clear go-ahead before applying each category of change.
3. **Never risk the only way in.** Before disabling SSH password auth, changing the SSH port, or restricting `PermitRootLogin`, confirm key-based login works for the account Kamal (and the user) will keep using — and keep a second, already-connected SSH session open until the new settings are verified. If that session drops before verification, the user may be locked out for good.
4. **Back up before editing.** Copy every config file you touch (timestamped) before changing it, so undo is a restore, not a rewrite.
5. **Verify open AND closed.** After hardening, confirm the ports Kamal needs are still reachable, not just that unwanted ports are blocked.

## Before You Start

Read what already exists before asking questions:

- **`config/deploy.yml`** — `servers:` (which hosts), `ssh:` (`user`, `port` — default `root`/`22`), and any `accessories:` `port:` bindings. A binding like `"5432:5432"` is exposed on every interface; `"127.0.0.1:5432:5432"` is not — see the **accessories** skill.
- **Which server** you're hardening — confirm the host/IP from `servers:`, or ask directly if this isn't a Kamal-managed box yet.
- **How you'll connect** — over SSH via your shell tool, or the user runs commands themselves and reports output back. Either way, run the inspection script against the target server, not your local machine.

## Step 1: Inspect (Read-Only)

Run [scripts/inspect.sh](scripts/inspect.sh) on the target server. It only reads state — it changes nothing. It reports:

- OS, distro family, and package manager
- Listening ports and the process bound to each (`ss -tulpn`)
- Firewall status and active rules (ufw / firewalld / nftables — whichever is present)
- Effective `sshd` settings: `PermitRootLogin`, `PasswordAuthentication`, `Port`
- Whether `fail2ban` is installed and running
- Whether automated security updates are already configured (`unattended-upgrades` / `dnf-automatic`)
- Whether the Docker daemon is listening on a TCP socket (it should only be on the local Unix socket)
- Users with login shells and passwordless-sudo entries

```bash
ssh root@your-server 'bash -s' < skills/server-hardening/scripts/inspect.sh
```

Summarize the findings for the user in a few lines before moving on — don't dump raw output.

## Step 2: Interview the User

Ask before deciding anything. Use a structured question tool if your environment provides one (for example, `AskUserQuestion` in Claude Code); otherwise ask these directly in the conversation:

1. **Public ports** — Besides SSH, kamal-proxy needs `80` and `443` open. Are there any other ports that must stay open (a non-Kamal service, a direct database connection)? Cross-check against any `accessories:` port bindings found in Step 1.
2. **SSH account** — Does Kamal connect as `root` (the default) or a non-root user (`ssh: user:` in `config/deploy.yml`)? Whichever it is, that account's key-based login must be confirmed working before anything else is restricted.
3. **Root login** — Disable `PermitRootLogin`? Only if Kamal is configured to deploy as a non-root user *and* that user already has working `sudo` + Docker group access (see the **ssh** skill's non-root bootstrap steps).
4. **Password authentication** — Disable it (key-only login)? Only recommend "yes" once key-based login for the relevant account is confirmed working.
5. **Automated updates** — Security patches only, all package updates, or skip this?
6. **Unattended reboots** — If a kernel update needs a reboot, reboot automatically at a set time, or leave it for the user to trigger manually?
7. **fail2ban** — Install it to auto-block repeated SSH auth failures?

## Step 3: Present the Plan, Then Get a Go-Ahead

Before running anything that changes state, show the user a concrete list: each change, the exact command, and the exact command to undo it. Don't fold this into Step 2 — the interview picks the *what*, this confirms *exactly this, in this order*. Wait for an explicit yes before Step 4.

## Step 4: Apply, One Category at a Time

Back up any file before editing it:

```bash
sudo cp -a /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%Y%m%d%H%M%S)
```

Apply only the categories the user approved, in this order — updates and fail2ban first (low risk), firewall next, SSH last (highest risk of lockout):

| Category | Reference |
|---|---|
| Automated security updates | [references/automatic-updates.md](references/automatic-updates.md) |
| fail2ban | [references/ssh-hardening.md](references/ssh-hardening.md#fail2ban) |
| Firewall / port lockdown | [references/firewall.md](references/firewall.md) |
| SSH hardening (password auth, root login, port) | [references/ssh-hardening.md](references/ssh-hardening.md) |

Each reference gives the command and its undo side by side. Apply SSH changes last, and **test in a second, separate terminal before closing the session you're working in.**

> **Docker owns its own firewall rules.** kamal-proxy's ports are published through Docker, and Docker inserts its own rules ahead of ufw/firewalld's — a ufw `deny` alone will not necessarily block a port Docker has published. See [references/firewall.md](references/firewall.md#docker-and-the-firewall) before assuming a rule took effect.

## Step 5: Verify

Run [scripts/verify.sh](scripts/verify.sh) on the server, ideally from a session other than the one used to make changes:

```bash
ssh root@your-server 'bash -s' < skills/server-hardening/scripts/verify.sh 22 80 443
```

It checks both directions:

- **Blocked**: firewall is active and default-denies unlisted inbound ports; no TCP-exposed Docker socket.
- **Still open**: SSH (on its configured port) and the ports the user approved in Step 2 still accept connections.
- **Applied**: `sshd` effective config matches what was approved; the `fail2ban` service is active if installed; the auto-update timer is enabled if configured.

The script only proves ports are open on loopback — have the user confirm real external reachability from their own machine (`nc -zv <server-ip> 443`) and a fresh login (not the session that made the changes) before calling this done.

## Undo Everything

Every change in Step 4 has a paired undo command in the references above; see [references/rollback.md](references/rollback.md) for the consolidated table. The short version: restore the timestamped backup and reload/restart the affected service; `apt remove`/`systemctl disable` anything newly installed.

## Related Skills

- **setup**: Provisioning Docker and the first `kamal setup` — do this before hardening a fresh box.
- **servers**: Defining the `servers:`/roles list that tells you which hosts to harden.
- **ssh**: The `ssh:` block Kamal itself uses to connect — must stay in sync with any SSH hardening here.
- **accessories**: Port bindings for databases/caches — confirm none are exposed further than intended.
