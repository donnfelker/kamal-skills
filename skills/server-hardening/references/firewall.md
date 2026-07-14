# Firewall Reference

Pick whichever firewall the inspection script found already present (or `ufw` if none — it's the simplest default on Debian/Ubuntu). Don't stack multiple firewall managers on one box.

## ufw (Debian/Ubuntu)

```bash
sudo apt update && sudo apt install -y ufw

# Default deny inbound, allow outbound
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH first — do this before enabling, or you'll cut your own session.
# Use the actual configured SSH port if it isn't 22.
sudo ufw allow 22/tcp

# Ports kamal-proxy needs
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Any additional ports the user approved in Step 2
# sudo ufw allow <port>/tcp

sudo ufw enable
sudo ufw status verbose
```

### Undo

```bash
sudo ufw disable
# or remove one rule instead of disabling everything:
sudo ufw delete allow <port>/tcp
```

## firewalld (RHEL/Fedora/Rocky/Alma)

```bash
sudo dnf install -y firewalld
sudo systemctl enable --now firewalld

sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
# sudo firewall-cmd --permanent --add-port=<port>/tcp

sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

### Undo

```bash
sudo firewall-cmd --permanent --remove-service=http
sudo firewall-cmd --reload
# or fully: sudo systemctl disable --now firewalld
```

## Docker and the Firewall

Docker manages its own `iptables`/`nftables` rules to implement container port publishing, and inserts them **ahead of** ufw's and firewalld's own chains. This means:

- Ports Kamal/Docker publishes (kamal-proxy's `80`/`443`, or an accessory bound to `0.0.0.0`) are reachable through Docker's rules regardless of a ufw/firewalld rule that looks like it should block them.
- A ufw/firewalld `allow` for `80`/`443` is still worth adding for consistency and for non-Docker services, but it is not what's actually gating access to a Docker-published port.
- To restrict access to a specific Docker-published port (for example, an accessory database exposed wider than intended), the fix is almost always to **not publish it publicly in the first place** — bind it to `127.0.0.1` in `config/deploy.yml`'s `accessories: ... port:` instead of `0.0.0.0` (see the **accessories** skill) — rather than trying to firewall around Docker.
- If a Docker-aware rule is unavoidable, it has to go in Docker's own `DOCKER-USER` iptables chain, not the default `INPUT` chain that ufw/firewalld manage. See Docker's own networking documentation (docs.docker.com/network/) before hand-writing `DOCKER-USER` rules — get this wrong and a rule can silently do nothing.

Always verify with [scripts/verify.sh](../scripts/verify.sh) rather than assuming a firewall rule took effect for a Docker-published port.
