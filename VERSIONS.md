# Kamal Skills Versions

Current versions of all skills. Agents can compare against local versions to check for updates.

| Skill | Version | Last Updated | Kamal Docs |
|-------|---------|--------------|------------|
| kamal | 1.0.0 | 2026-10-12 | 2.12.0 (`c700a5b`) |
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
| hooks | 1.0.1 | 2026-10-12 | 2.12.0 (`c700a5b`) |
| prune | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| aliases | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| remove | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| upgrade | 1.0.0 | 2026-06-30 | 2.12.0 (`c700a5b`) |
| server-hardening | 1.0.0 | 2026-07-06 | 2.12.0 (`c700a5b`) |
| ci-deploy | 1.0.1 | 2026-10-12 | 2.12.0 (`c700a5b`) |
| local-ci-deploy | 1.0.0 | 2026-10-12 | 2.12.0 (`c700a5b`) |

## Recent Changes

### kamal 1.0.0 (2026-10-12)

- Added the `kamal` entry-point skill. For broad or unclear Kamal requests, it reads the project's Kamal files, routes to the skill that covers the request, chains skills for multi-step jobs (first deploy, adding a database, a 1.x upgrade), and routes broad troubleshooting by where the failure shows up. It holds no commands or config keys of its own.

### local-ci-deploy 1.0.0, hooks 1.0.1, ci-deploy 1.0.1 (2026-10-12)

- Added the opt-in `local-ci-deploy` skill for teams that run tests locally and mark passing commits with [gh-signoff](https://github.com/basecamp/gh-signoff). A `pre-deploy` hook refuses to deploy a commit without a green signoff (fails closed, lets `kamal rollback` through, optional per-destination opt-out), and `references/deploy-on-signoff.md` has a GitHub Actions workflow that deploys when a signoff turns green on the tip of `main`. gh-signoff and GitHub statuses are labeled external conventions.
- `hooks` and `ci-deploy`: a related-skills pointer to `local-ci-deploy`. Their behavior is unchanged.

### ci-deploy 1.0.0 (2026-10-11)

- Added the `ci-deploy` skill — sets up `kamal deploy` from GitHub Actions after the tests pass on `main`, for any stack (Rails, Next.js, Phoenix, Rust, static sites): a dedicated deploy key with host-key checks, secrets in a GitHub environment, a workflow template, the GHA build cache, and verifying the first run.

### server-hardening 1.0.0 (2026-07-06)

- Added the `server-hardening` skill — inspects a Kamal server's exposure and guides the user through automated updates, firewall lockdown, and SSH hardening, with an explicit interview, a consent gate before any change, undo instructions, and read-only verification scripts.

### 1.0.0 (2026-06-30)

- Initial release of Kamal Skills — skills for deploying and operating applications with [Kamal](https://kamal-deploy.org), grounded in the official Kamal documentation.
