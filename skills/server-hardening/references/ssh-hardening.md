# SSH Hardening Reference

Every command here edits `/etc/ssh/sshd_config`. Back it up first:

```bash
sudo cp -a /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%Y%m%d%H%M%S)
```

After **any** edit, validate syntax before reloading, and reload rather than restart so existing sessions aren't dropped:

```bash
sudo sshd -t && sudo systemctl reload sshd
```

`sudo sshd -t` returns nothing on success and an error on a bad config — never reload with a config that fails this check.

## Settings

| Setting | Hardened value | What it does |
|---|---|---|
| `PasswordAuthentication` | `no` | Disables password login; key-based auth only. |
| `PermitRootLogin` | `prohibit-password` (key-only) or `no` (fully disabled) | Restricts or blocks direct root SSH login. |
| `PubkeyAuthentication` | `yes` | Confirms key-based auth is enabled (it is by default). |
| `Port` | a non-default port | Reduces automated scanner noise. Cosmetic only — not a substitute for the above. If changed, `config/deploy.yml`'s `ssh: port:` must match, or Kamal will stop connecting (see the **ssh** skill). |

Edit with `sed`, or open the file directly. Example — disable password auth and restrict root to key-only:

```bash
sudo sed -i \
  -e 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' \
  -e 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' \
  /etc/ssh/sshd_config
sudo sshd -t && sudo systemctl reload sshd
```

**Before running this**: confirm the account Kamal/the user logs in as can already authenticate with a key (`ssh -o PreferredAuthentications=publickey ...` succeeds). Keep a second SSH session open and log in fresh in a third window after reloading, before closing either existing session.

### Undo

```bash
sudo cp -a /etc/ssh/sshd_config.bak.TIMESTAMP /etc/ssh/sshd_config
sudo sshd -t && sudo systemctl reload sshd
```

## fail2ban

Blocks IPs after repeated failed SSH auth attempts.

**Install:**

```bash
# Debian/Ubuntu
sudo apt update && sudo apt install -y fail2ban

# RHEL/Fedora/Rocky/Alma
sudo dnf install -y fail2ban
```

**Configure** an SSH jail in `/etc/fail2ban/jail.local` (create it — don't edit `jail.conf` directly, it's overwritten on upgrade):

```ini
[sshd]
enabled = true
port    = ssh
maxretry = 5
bantime  = 1h
findtime = 10m
```

If SSH runs on a non-default port, set `port = 2222` (or whatever it is) to match.

**Enable:**

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

### Undo

```bash
sudo systemctl disable --now fail2ban
sudo apt remove --purge -y fail2ban   # or: sudo dnf remove -y fail2ban
```
