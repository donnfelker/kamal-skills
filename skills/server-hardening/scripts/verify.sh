#!/usr/bin/env bash
# Read-only post-hardening verification for the server-hardening skill.
# Confirms hardening was applied AND that the expected ports are still reachable.
# Changes nothing. Usage: verify.sh [expected_open_port ...]  (default: 22 80 443)
set -uo pipefail

if [ "$#" -gt 0 ]; then
  EXPECTED_PORTS=("$@")
else
  EXPECTED_PORTS=(22 80 443)
fi

pass() { printf '  [PASS] %s\n' "$1"; }
fail() { printf '  [FAIL] %s\n' "$1"; }
note() { printf '  [NOTE] %s\n' "$1"; }

echo "=== Firewall ==="
if command -v ufw >/dev/null 2>&1; then
  status=$(sudo ufw status 2>/dev/null)
  echo "$status" | grep -q "Status: active" && pass "ufw is active" || fail "ufw is not active"
  echo "$status"
elif command -v firewall-cmd >/dev/null 2>&1; then
  sudo firewall-cmd --state 2>/dev/null | grep -q running && pass "firewalld is running" || fail "firewalld is not running"
  sudo firewall-cmd --list-all 2>/dev/null
else
  note "no ufw/firewalld found — confirm nftables/iptables rules manually"
fi

echo
echo "=== Expected ports (local reachability only) ==="
for p in "${EXPECTED_PORTS[@]}"; do
  if timeout 2 bash -c "echo > /dev/tcp/127.0.0.1/$p" 2>/dev/null; then
    pass "port $p accepts local connections"
  else
    fail "port $p did not accept a local connection — check the service and firewall rule"
  fi
done
note "This only proves a port is open on loopback. Confirm real external reachability from your own machine, e.g.: nc -zv <server-ip> 443"

echo
echo "=== SSH daemon effective config ==="
if command -v sshd >/dev/null 2>&1; then
  sudo sshd -T 2>/dev/null | grep -E '^(permitrootlogin|passwordauthentication|port) ' \
    || grep -E '^(PermitRootLogin|PasswordAuthentication|Port)' /etc/ssh/sshd_config 2>/dev/null
fi
note "Compare the above against what was approved in Step 2 of the skill."

echo
echo "=== fail2ban ==="
if command -v fail2ban-client >/dev/null 2>&1; then
  if sudo systemctl is-active fail2ban >/dev/null 2>&1; then
    pass "fail2ban service active"
  else
    fail "fail2ban installed but not active"
  fi
  sudo fail2ban-client status 2>/dev/null
else
  note "fail2ban not installed (skip if the user didn't request it)"
fi

echo
echo "=== Automated updates ==="
if systemctl list-unit-files 2>/dev/null | grep -q '^apt-daily-upgrade.timer'; then
  systemctl is-enabled apt-daily-upgrade.timer 2>/dev/null | grep -q enabled \
    && pass "apt-daily-upgrade.timer enabled" || fail "apt-daily-upgrade.timer not enabled"
elif systemctl list-unit-files 2>/dev/null | grep -q 'dnf-automatic'; then
  systemctl is-enabled dnf-automatic.timer dnf-automatic-install.timer 2>/dev/null
else
  note "no unattended-upgrades/dnf-automatic timer found (skip if the user didn't request it)"
fi

echo
echo "=== Docker daemon exposure ==="
if (sudo ss -tulpn 2>/dev/null || ss -tulpn 2>/dev/null) | grep -qE ':(2375|2376)\b'; then
  fail "Docker daemon TCP port (2375/2376) is listening — should be Unix-socket only"
else
  pass "no Docker daemon TCP port detected"
fi

echo
echo "Verification complete. Do not close the working session until a NEW connection from your own machine succeeds."
