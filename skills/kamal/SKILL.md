---
name: kamal
description: Start here for anything Kamal when the request is broad or it is unclear which Kamal skill fits. Reads the project's Kamal state (config/deploy.yml, .kamal/secrets, .kamal/hooks) and routes to the right skill in this pack, such as setup, config, deploy, rollback, proxy, secrets, env, accessories, servers, build, registry, ci-deploy, or server-hardening, and chains them for multi-step jobs like a first deploy or a 1.x upgrade. Use when the user says "help me with Kamal," "Kamal isn't working," "my Kamal deploy is broken," "what can you do with Kamal," "how do I use Kamal," "set up Kamal end to end," or names Kamal without a specific task. When the request already matches one skill (for example "roll back my deploy"), use that skill directly.
metadata:
  version: 1.0.0
---

# Kamal

You are the entry point to the Kamal skills pack. You do not answer Kamal questions from memory. You find out where the project stands, pick the skill that covers the request, and hand off to it. Every command, flag, and config key lives in the specific skills, which are grounded in the [Kamal docs](https://kamal-deploy.org).

## Step 1: Read the Project State

Check these before asking anything:

| Look at | It tells you |
|---|---|
| `config/deploy.yml` | Missing means Kamal is not set up yet. Present means read `service`, `servers`, `proxy`, `accessories`, `registry`, `builder`. |
| `config/deploy.*.yml` | Destinations (for example `staging`) in use. |
| `.kamal/secrets*` | How secrets are supplied. |
| `.kamal/hooks/` | Custom scripts that run during deploys. |
| A `traefik:` block in `deploy.yml` | A Kamal 1.x config that needs upgrading. |
| `.github/workflows/` | Whether deploys already run from CI. |

## Step 2: Route to a Skill

Match the request to one row and use that skill. If two rows fit, start with the first and mention the second.

| The user wants to... | Skill |
|---|---|
| Install Kamal or ship a first deploy on a new project | **setup** |
| Write or understand `config/deploy.yml`, add a destination | **config** |
| Deploy, redeploy, or fix a deploy that fails or hangs | **deploy** |
| Undo a bad release or see which version is live | **rollback** |
| Route a domain, turn on HTTPS, fix healthchecks or timeouts | **proxy** |
| Store and load secrets, use a password manager | **secrets** |
| Set environment variables, clear or secret | **env** |
| Run a database, Redis, or another long-lived service | **accessories** |
| Add hosts, split web and worker roles | **servers** |
| Change how many hosts restart at once | **rollout** |
| Build the image, use a remote or multi-arch builder, cache builds | **build** |
| Push to Docker Hub, GHCR, ECR, or a local registry | **registry** |
| Connect over SSH with a different user, port, key, or jump host | **ssh** |
| Inspect, restart, exec into, or tail logs of running containers | **app** |
| Configure the Docker log driver or Kamal's output | **logging** |
| Run scheduled jobs | **cron** |
| Run a script before or after a deploy | **hooks** |
| Shorten a long, repeated `kamal` command | **aliases** |
| Clean up old images and containers | **prune** |
| Tear the deployment down | **remove** |
| Move a Kamal 1.x project to 2.x | **upgrade** |
| Deploy from GitHub Actions after the tests pass | **ci-deploy** |
| Lock down a server's firewall, SSH, and updates | **server-hardening** |
| Gate deploys on a local `gh signoff` (only when the user asks) | **local-ci-deploy** |

Commands without their own skill: deploy locks are in **deploy**, and `kamal details` and `kamal audit` are in **app**.

## Step 3: Chain Skills for Bigger Jobs

Some requests span several skills. Run them in this order and finish each before starting the next.

| Job | Order |
|---|---|
| First deploy of a new app | **setup**, then **secrets**, **registry**, and **proxy** as `setup` needs them, then **deploy** |
| Add a database or Redis to a live app | **accessories**, then **env** for the connection settings, then **deploy** |
| Add a custom domain with HTTPS | **proxy**, then **deploy** |
| Move from Kamal 1.x | **upgrade**, then **deploy** |
| Stop deploying from a laptop | **ci-deploy** (deploy by hand once first) |
| Prepare a new production server | **server-hardening**, then **setup** or **deploy** |

## Broad Troubleshooting

When the user says "Kamal is broken" without detail, get the failing command and its output first. Then route by where it failed:

| Failure shows up in | Start with |
|---|---|
| Building or pushing the image | **build**, then **registry** |
| Connecting to servers | **ssh** |
| Missing or wrong env values or secrets | **secrets**, then **env** |
| Healthcheck, timeout, or routing | **proxy** |
| The container starts and then exits | **app** (logs and details) |
| A hook script | **hooks** |
| The deploy lock | **deploy** |

## When the User Asks What Kamal Can Do

Give a short map instead of a lecture: Kamal deploys Docker containers to your own servers over SSH, with zero-downtime cutover through kamal-proxy. List the rows from Step 2 that fit their project, and offer the next step from Step 3.

## Rules

- **Hand off; don't duplicate.** Never state Kamal commands, flags, or config keys here. The specific skill has the grounded version.
- **One skill at a time.** Finish one before chaining the next, so the user always knows which step they are on.
- **Opt-in skills stay opt-in.** Suggest **local-ci-deploy** only when the user asks about signoff or local CI gating.
