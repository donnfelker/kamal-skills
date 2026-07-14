# Rollback Reference

Consolidated undo for every change this skill can make. Keep timestamped config backups around for at least a few days after hardening before deleting them.

| Change | Undo |
|---|---|
| SSH config edited (`PasswordAuthentication`, `PermitRootLogin`, `Port`) | `sudo cp -a /etc/ssh/sshd_config.bak.TIMESTAMP /etc/ssh/sshd_config && sudo sshd -t && sudo systemctl reload sshd` |
| fail2ban installed | `sudo systemctl disable --now fail2ban && sudo apt remove --purge -y fail2ban` (or `dnf remove`) |
| ufw enabled | `sudo ufw disable` (or `sudo ufw delete allow <port>/tcp` to remove one rule) |
| firewalld configured | `sudo firewall-cmd --permanent --remove-service=<name> && sudo firewall-cmd --reload` (or `sudo systemctl disable --now firewalld` to turn it off entirely) |
| unattended-upgrades installed | `sudo systemctl disable --now unattended-upgrades && sudo apt remove --purge -y unattended-upgrades` |
| dnf-automatic enabled | `sudo systemctl disable --now dnf-automatic-install.timer dnf-automatic.timer && sudo dnf remove -y dnf-automatic` |

If several changes were made in one session and something feels wrong, undo in reverse order — SSH changes first (restore access), then firewall, then the rest — and re-run [scripts/verify.sh](../scripts/verify.sh) after each step to confirm the server is back to a known state.
