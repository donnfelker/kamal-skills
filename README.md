# Kamal Skills for AI Agents

A collection of AI agent skills for deploying and operating applications with [Kamal](https://kamal-deploy.org). Built for developers and operators who want AI coding agents to help them ship apps to their own servers — covering install and getting started, configuration, deploys, image builds, rollbacks, servers and roles, environment variables, secrets, the registry, the proxy, accessories, SSH, cron, logging, app operations, hooks, pruning, aliases, removal, and upgrading from 1.x to 2.0.

Every skill is **grounded in the official Kamal documentation** at [kamal-deploy.org](https://kamal-deploy.org) — no invented commands, flags, config keys, defaults, or behaviors.

Works with Claude Code, OpenAI Codex, Cursor, Windsurf, and any agent that supports the [Agent Skills spec](https://agentskills.io).

Built by [Donn Felker](https://donnfelker.com).

**Contributions welcome!** Found a way to improve a skill or have a new one to add? [Open a PR](#contributing).

Run into a problem or have a question? [Open an issue](https://github.com/donnfelker/kamal-skills/issues) — we're happy to help.

## What are Skills?

Skills are markdown files that give AI agents specialized knowledge and workflows for specific tasks. When you add these to your project, your agent can recognize when you're working on a Kamal deployment task and apply the right commands, configuration, and best practices — straight from the official docs.

Because they follow the cross-agent [Agent Skills spec](https://agentskills.io), the same skills work across Claude Code, Codex, Cursor, Windsurf, and other compatible agents.

## Available Skills

<!-- SKILLS:START -->
| Skill | Description |
|-------|-------------|
| [getting-started](skills/getting-started/) | Install Kamal and ship your first deploy on a new project. Use when the user is starting with Kamal for the first time... |
| [configuration](skills/configuration/) | Understand and write your Kamal configuration in config/deploy.yml. Use when the user says "set up config/deploy.yml,"... |
| [deploying](skills/deploying/) | Run Kamal deploys end to end — a full `kamal deploy` (build, push, pull, boot, health-check on GET /up, zero-downtime... |
| [building-images](skills/building-images/) | Configure Kamal builders and build then push your app image. Use this skill when the user wants to set up the `builder`... |
| [rollback](skills/rollback/) | Roll back a Kamal deployment to a previous image when a release goes bad, and identify or check which versions are... |
| [servers-and-roles](skills/servers-and-roles/) | Define and structure the servers Kamal deploys to — a simple list of hosts, multiple custom roles (such as web and... |
| [environment-variables](skills/environment-variables/) | Configure environment variables in your Kamal deploy.yml — the `env` block with `clear` values, `secret` references... |
| [secrets](skills/secrets/) | Manage secrets for a Kamal deployment — the `.kamal/secrets` file, dotenv variable and command substitution, and the... |
| [registry](skills/registry/) | Configure the Docker registry Kamal pushes your app image to and pulls it from — Docker Hub (the default), AWS ECR, GCP... |
| [proxy](skills/proxy/) | Configure and operate kamal-proxy, the reverse proxy that gives Kamal zero-downtime deploys on ports 80 and 443. Use... |
| [accessories](skills/accessories/) | Run and manage accessory services — databases, Redis, search, and other long-lived dependencies your app needs —... |
| [ssh](skills/ssh/) | Configure how Kamal connects to servers over SSH and tune SSHKit connection handling. Use when the user sets the SSH `user`... |
| [cron](skills/cron/) | Run recurring, scheduled, or cron jobs on a Kamal deployment. Use when the user says "run a cron job," "schedule a... |
| [booting](skills/booting/) | Control how Kamal boots new containers across many servers during a deploy — rolling the release out in batches... |
| [logging](skills/logging/) | Configure how logs flow in a Kamal deployment — the Docker logging driver and options for your app containers (the... |
| [app-operations](skills/app-operations/) | Operate and inspect already-running Kamal apps without redeploying. Manage app containers with `kamal app` (boot,... |
| [hooks](skills/hooks/) | Write and wire up Kamal deploy hooks — scripts in `.kamal/hooks` (docker-setup, pre-connect, pre-build, pre-deploy,... |
| [pruning](skills/pruning/) | Prune old Kamal containers and images and control how many Kamal keeps around. Kamal retains the last 5 deployed... |
| [aliases](skills/aliases/) | Define custom command aliases under the top-level `aliases` key in `config/deploy.yml` so a long, repeated `kamal`... |
| [remove](skills/remove/) | Tear down a Kamal deployment with `kamal remove` — it removes the kamal-proxy, app, and accessory containers from your... |
| [upgrading](skills/upgrading/) | Walk through upgrading an existing Kamal 1.x project to Kamal 2.0 with `kamal upgrade` — the move from Traefik to... |
<!-- SKILLS:END -->

## Installation

### Option 1: Claude Code Plugin

Install via Claude Code's built-in plugin system:

```bash
# Add the marketplace
/plugin marketplace add donnfelker/kamal-skills

# Install all Kamal skills
/plugin install kamal-skills
```

### Option 2: CLI Install (Cross-Agent)

Use [npx skills](https://github.com/vercel-labs/skills) to install skills directly into any agent that supports the Agent Skills spec:

```bash
# Install all skills
npx skills add donnfelker/kamal-skills

# Install specific skills
npx skills add donnfelker/kamal-skills --skill deploying secrets

# List available skills
npx skills add donnfelker/kamal-skills --list
```

This installs to your `.agents/skills/` directory (and symlinks into `.claude/skills/` for Claude Code compatibility).

### Option 3: Clone and Copy

Clone the entire repo and copy the skills folder:

```bash
git clone https://github.com/donnfelker/kamal-skills.git
cp -r kamal-skills/skills/* .agents/skills/
```

## Usage

Once installed, just ask your agent to help with Kamal tasks:

```
"Help me deploy my Rails app with Kamal"
→ Uses deploying skill

"Set up Kamal for the first time on this project"
→ Uses getting-started skill

"Add a Postgres accessory to my Kamal config"
→ Uses accessories skill

"Store my Rails master key as a Kamal secret"
→ Uses secrets skill

"Roll back the last bad deploy"
→ Uses rollback skill

"Configure the Kamal proxy for my domain with SSL"
→ Uses proxy skill

"Upgrade my project from Kamal 1.x to 2.0"
→ Uses upgrading skill
```

You can also invoke skills directly:

```
/deploying
/secrets
/proxy
```

## Skill Categories

### Getting Started
- `getting-started` - Install Kamal and ship your first deploy
- `configuration` - Write and structure config/deploy.yml

### Deploying & Building
- `deploying` - Run full and fast deploys, target hosts/roles, manage the deploy lock
- `building-images` - Configure builders and build/push your app image
- `rollback` - Revert to a previous image when a release goes bad
- `booting` - Control the boot strategy and roll out in batches

### Configuration
- `servers-and-roles` - Define servers, roles, and the primary role
- `environment-variables` - Set env vars — clear vs secret, tags, per-role env
- `registry` - Configure the Docker registry and log in/out
- `proxy` - Configure and operate kamal-proxy for zero-downtime deploys and SSL
- `accessories` - Run databases, Redis, search, and other dependencies
- `ssh` - Configure SSH connectivity and SSHKit tuning
- `cron` - Run recurring/scheduled jobs in a cron container
- `logging` - Configure Docker logging drivers and Kamal output loggers
- `aliases` - Define shortcuts for long, repeated kamal commands

### Secrets
- `secrets` - Manage secrets and password-manager vault integrations

### Operations
- `app-operations` - Inspect and control already-running app containers
- `hooks` - Run scripts at fixed points in a deploy
- `pruning` - Prune old containers/images and tune retention
- `remove` - Tear down a deployment and log out of the registry

### Upgrading
- `upgrading` - Upgrade a Kamal 1.x project to 2.0

## Contributing

Found a way to improve a skill? Have a new skill to suggest? PRs and issues welcome!

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding or improving skills. All Kamal facts must be grounded in the [official Kamal documentation](https://kamal-deploy.org).

## License

[MIT](LICENSE) - Use these however you want.
