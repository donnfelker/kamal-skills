# Automated Security Updates Reference

## Debian/Ubuntu: unattended-upgrades

```bash
sudo apt update && sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

The reconfigure step writes `/etc/apt/apt.conf.d/20auto-upgrades`:

```
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```

Edit `/etc/apt/apt.conf.d/50unattended-upgrades` for scope and reboot behavior:

```
// Security-only vs all updates — comment out non-security origin lines to
// restrict to security patches; leave them uncommented for all updates.
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};

// Only if the user asked for automatic reboots on kernel updates:
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";
```

If the user wants manual reboots, leave `Automatic-Reboot` at its default (`false`) and instead check for a pending reboot:

```bash
[ -f /var/run/reboot-required ] && echo "reboot needed"
```

Check it's running: `systemctl status unattended-upgrades`, and review `/var/log/unattended-upgrades/`.

### Undo

```bash
sudo systemctl disable --now unattended-upgrades
sudo apt remove --purge -y unattended-upgrades
```

## RHEL/Fedora/Rocky/Alma: dnf-automatic

```bash
sudo dnf install -y dnf-automatic
```

Edit `/etc/dnf/automatic.conf`:

```ini
[commands]
upgrade_type = security   # or "default" for all updates
apply_updates = yes       # "no" makes it notify-only
```

Enable the timer that actually applies updates:

```bash
sudo systemctl enable --now dnf-automatic-install.timer
```

(Use `dnf-automatic.timer` instead if `apply_updates = no` — that variant only downloads and notifies.)

Reboot policy for `dnf-automatic` is not built in — if the user wants automatic reboots after kernel updates, that needs a separate mechanism (for example a cron job checking `needs-restarting -r`); otherwise leave reboots manual.

### Undo

```bash
sudo systemctl disable --now dnf-automatic-install.timer dnf-automatic.timer
sudo dnf remove -y dnf-automatic
```
