# Kamal Skills Versions

Current versions of all skills. Agents can compare against local versions to check for updates.

| Skill | Version | Last Updated | Kamal Docs |
|-------|---------|--------------|------------|
| setup | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| config | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| deploy | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| build | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| rollback | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| servers | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| env | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| secrets | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| registry | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| proxy | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| accessories | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| ssh | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| cron | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| rollout | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| logging | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| app | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| hooks | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| prune | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| aliases | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| remove | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| upgrade | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| server-hardening | 1.0.0 | 2026-07-06 | 2.12.0 (`c700a5b`) |
| ci-deploy | 1.0.0 | 2026-10-11 | 2.12.0 (`c700a5b`) |

## Recent Changes

### ci-deploy 1.0.0 (2026-10-11)

- Added the `ci-deploy` skill — sets up `kamal deploy` from GitHub Actions after the tests pass on `main`, for any stack (Rails, Next.js, Phoenix, Rust, static sites): a dedicated deploy key with host-key checks, secrets in a GitHub environment, a workflow template, the GHA build cache, and verifying the first run.

### server-hardening 1.0.0 (2026-07-06)

- Added the `server-hardening` skill — inspects a Kamal server's exposure and guides the user through automated updates, firewall lockdown, and SSH hardening, with an explicit interview, a consent gate before any change, undo instructions, and read-only verification scripts.

### 1.0.0 (2026-06-30)

- Initial release of Kamal Skills — skills for deploying and operating applications with [Kamal](https://kamal-deploy.org), grounded in the official Kamal documentation.
