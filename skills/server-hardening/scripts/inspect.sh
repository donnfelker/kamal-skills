#!/usr/bin/env bash
# Read-only inspection for the server-hardening skill.
# Reports current state; changes nothing. Safe to run any number of times.
# Usage: run on the target server, e.g. `ssh root@host 'bash -s' < inspect.sh`
set -uo pipefail

section() { printf '\n=== %s ===\n' "$1"; }

section "OS"
[ -r /etc/os-release ] && . /etc/os-release && echo "${PRETTY_NAME:-unknown}"
uname -a

section "Package manager"
for pm in apt dnf yum apk pacman; do
  command -v "$pm" >/dev/null 2>&1 && echo "found: $pm"
done

section "Listening ports"
if command -v ss >/dev/null 2>&1; then
  sudo ss -tulpn 2>/dev/null || ss -tulpn
elif command -v netstat >/dev/null 2>&1; then
  sudo netstat -tulpn 2>/dev/null || netstat -tulpn
else
  echo "neither ss nor netstat found"
fi

section "Firewall status"
if command -v ufw >/dev/null 2>&1; then
  sudo ufw status verbose
elif command -v firewall-cmd >/dev/null 2>&1; then
  sudo firewall-cmd --state
  sudo firewall-cmd --list-all
elif command -v nft >/dev/null 2>&1; then
  sudo nft list ruleset 2>/dev/null || echo "nft present but ruleset unreadable without sudo"
else
  echo "no ufw/firewalld/nft found; raw iptables rules:"
  sudo iptables -L -n 2>/dev/null || echo "iptables unavailable/unreadable"
fi

section "SSH daemon effective config"
if command -v sshd >/dev/null 2>&1; then
  sudo sshd -T 2>/dev/null | grep -E '^(permitrootlogin|passwordauthentication|pubkeyauthentication|port) ' \
    || grep -E '^(PermitRootLogin|PasswordAuthentication|PubkeyAuthentication|Port)' /etc/ssh/sshd_config 2>/dev/null
else
  echo "sshd not found on PATH"
fi

section "fail2ban"
if command -v fail2ban-client >/dev/null 2>&1; then
  sudo fail2ban-client status 2>/dev/null || echo "installed, but status query needs sudo"
else
  echo "not installed"
fi

section "Automated updates"
if [ -f /etc/apt/apt.conf.d/20auto-upgrades ]; then
  echo "--- /etc/apt/apt.conf.d/20auto-upgrades ---"
  cat /etc/apt/apt.conf.d/20auto-upgrades
elif [ -f /etc/dnf/automatic.conf ]; then
  echo "--- /etc/dnf/automatic.conf ---"
  grep -E '^(upgrade_type|apply_updates)' /etc/dnf/automatic.conf 2>/dev/null
  systemctl is-enabled dnf-automatic.timer dnf-automatic-install.timer 2>/dev/null
else
  echo "no unattended-upgrades or dnf-automatic config found"
fi

section "Docker daemon exposure"
if command -v docker >/dev/null 2>&1; then
  [ -f /etc/docker/daemon.json ] && { echo "--- /etc/docker/daemon.json ---"; cat /etc/docker/daemon.json; }
  if (sudo ss -tulpn 2>/dev/null || ss -tulpn 2>/dev/null) | grep -qE ':(2375|2376)\b'; then
    echo "WARNING: Docker daemon appears to be listening on TCP (2375/2376) — should be Unix-socket only"
  else
    echo "no Docker daemon TCP port (2375/2376) detected"
  fi
else
  echo "docker not installed / not on PATH"
fi

section "Users with login shells"
awk -F: '$7 ~ /(bash|sh|zsh)$/ {print $1, $7}' /etc/passwd

section "Passwordless sudo entries"
sudo grep -RhsE 'NOPASSWD' /etc/sudoers /etc/sudoers.d 2>/dev/null
[ $? -ne 0 ] && echo "none found (or unreadable without sudo)"

echo
echo "Inspection complete. Nothing was changed."
