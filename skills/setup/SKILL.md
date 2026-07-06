---
name: setup
description: Install Kamal and ship your first deploy on a new project. Use when the user is starting with Kamal for the first time and says "install Kamal," "set up Kamal on this project," "kamal init," "get started with Kamal," "deploy my app for the first time," "bootstrap my servers," or "run kamal setup." Covers `gem install kamal`, the dockerized install alias, `kamal init` (config/deploy.yml, .kamal/secrets, .kamal/hooks), writing the first config (service, image, servers, registry, builder, env), filling in .kamal/secrets, bootstrapping Docker with `kamal server bootstrap`, and the first `kamal setup`. For the full set of configuration keys, see config. For routine releases after setup, see deploy. For secrets files and vault adapters, see secrets. For registry providers, see registry.
metadata:
  version: 1.0.0
---

# Getting Started with Kamal

You are an expert in deploying applications with Kamal. Your goal is to take a
user from nothing to a running first deploy: install the tool, generate the
config, fill in the values, and run the first `kamal setup` against their
servers.

## Before You Start

Check what already exists before asking questions:

- If `config/deploy.yml` is present, read it first and work from the values the
  user already has instead of starting from scratch.
- If `.kamal/secrets` is present, read it to see which secrets are already
  wired up (do not echo secret values back to the user).

Then confirm the essentials you will need:

1. **Servers** — the IP addresses or hostnames Kamal will deploy to.
2. **Registry** — which Docker registry the image is pushed to, and the
   username/password for it.
3. **Image name** — what the built image will be called.
4. **SSH access** — `kamal setup` connects over SSH (root by default,
   authenticated by your SSH key).
5. **Committed code** — Kamal builds from a `git archive` of `HEAD`, not your
   working tree; commit every file the image needs before deploying (see the
   preflight note in Step 5).

---

## Step 1: Install Kamal

If you have a Ruby environment available, install Kamal globally:

```sh
gem install kamal
```

If you do not have Ruby installed, you can run Kamal from a Docker container
instead. On macOS:

```sh
alias kamal='docker run -it --rm -v "${PWD}:/workdir" -v "/run/host-services/ssh-auth.sock:/run/host-services/ssh-auth.sock" -e SSH_AUTH_SOCK="/run/host-services/ssh-auth.sock" -v /var/run/docker.sock:/var/run/docker.sock ghcr.io/basecamp/kamal:latest'
```

The dockerized path has limitations (the secret adapters and host environment
variables are not available in the container). For the Linux alias and the full
list of limitations, see [references/dockerized-install.md](references/dockerized-install.md).

---

## Step 2: Initialize the Project

Inside your app directory, run:

```sh
kamal init
```

This creates the files you need to deploy:

```
Created configuration file in config/deploy.yml
Created .kamal/secrets file
Created sample hooks in .kamal/hooks
```

| File | Purpose |
|------|---------|
| `config/deploy.yml` | Main deploy configuration |
| `.kamal/secrets` | Secrets referenced by the config |
| `.kamal/hooks` | Sample lifecycle hooks |

> **No Dockerfile yet?** Kamal builds the standard `Dockerfile` at your project root.
> Rails generates one with `rails new`; most other frameworks (Node/Next.js, Django, Go)
> do not — write one before `kamal setup`, or build without one via buildpacks (see the
> **build** skill). A good shape is multi-stage: a deps stage that installs dependencies,
> a build stage that compiles the app, and a slim runner stage that copies only the built
> output. Common footguns: native modules often ship prebuilt binaries, so try building
> without a C toolchain before adding one; the framework's build step usually doesn't
> need runtime secrets or database access — verify by building with them absent instead
> of threading them through as build args; and run migrations from an ENTRYPOINT script
> at container start, not at build time — volumes aren't mounted during the image build.

---

## Step 3: Write `config/deploy.yml`

Edit the generated `config/deploy.yml`. A first deploy can be as simple as this:

```yaml
service: hey
image: 37s/hey
servers:
  - 192.168.0.1
  - 192.168.0.2
registry:
  username: registry-user-name
  password:
    - KAMAL_REGISTRY_PASSWORD
builder:
  arch: amd64
env:
  secret:
    - RAILS_MASTER_KEY
```

What each key does:

| Key | Description |
|-----|-------------|
| `service` | Required. Used as the container name prefix. |
| `image` | The Docker image name. It is pushed to the configured registry. |
| `servers` | The servers to deploy to. A plain list is implicitly assigned to the `web` role. |
| `registry` | Docker registry configuration. The `password` references a secret (looked up by name), not a literal value. |
| `builder` | Builder options. The starter config sets `arch: amd64`. |
| `env` | Environment variables. Names under `secret` are provided through your secrets file. |

The default registry is Docker Hub; you can change it with `registry/server`.
For every available configuration key, see the **config** skill.

> **App ships its own stack definition?** If the project has a production
> `docker-compose.yml`, Helm chart, or upstream install docs, treat it as the
> contract: map every service it runs to a Kamal accessory, an external
> service, or an explicit user-approved omission. Never silently drop or swap
> a component because the host looks too small — surface the constraint and
> let the user choose before deploying. See "Mirroring an existing stack" in
> the **accessories** skill.

### Persisting data across deploys

Every deploy **replaces the app container** — anything written to the container's own
filesystem (a SQLite database, uploaded files, anything else meant to persist) is
discarded with the old container. Mount a named volume for any path that must survive:

```yaml
volumes:
  - "myapp_data:/app/data"
```

Point your app's writable paths at the mounted directory (e.g.
`DATABASE_URL=file:/app/data/production.db`), and `chown` that path to the container's
runtime user in the Dockerfile — Docker copies ownership from the image into a newly
created named volume on first use. Then confirm the data actually survives a **redeploy**
(run `kamal deploy` again and check) before trusting it — a plain `docker restart` keeps
the same container and proves nothing.

---

## Step 4: Fill In `.kamal/secrets`

The `registry/password` and any `env/secret` entries above are looked up by name
in your environment and in `.kamal/secrets`. Set the registry password in your
environment, then edit `.kamal/secrets` to read it (plus `RAILS_MASTER_KEY` for
a production Rails app):

```sh
# .kamal/secrets
KAMAL_REGISTRY_PASSWORD=$KAMAL_REGISTRY_PASSWORD
RAILS_MASTER_KEY=$(cat config/master.key)
```

Each line maps a secret name to a value: an environment variable
(`$KAMAL_REGISTRY_PASSWORD`) or the output of a command (`$(cat config/master.key)`).
For reading secrets from 1Password, LastPass, Bitwarden, AWS, GCP, Doppler, and
other vaults, see the **secrets** skill.

---

## Step 5: Bootstrap and Deploy with `kamal setup`

With the config and secrets in place, run your first deploy:

> **Preflight — commit first.** Kamal builds from a `git archive` of `HEAD`, not your
> working tree. Files that are new or modified but **uncommitted** — generated or newly
> added files (`config/*.rb`, freshly created credentials, view overrides) — are excluded from the image and
> fail the build with `COPY <file>: not found`. Commit everything the Dockerfile `COPY`s
> before running `kamal setup`. To build the working tree instead, set `context: .` (see
> the **build** skill).

```sh
kamal setup
```

`kamal setup` runs everything required to deploy to a fresh host:

1. Install Docker on all servers, if it has permission and it is not already installed.
2. Boot all accessories.
3. Deploy the app (the same work as `kamal deploy`).

### What `kamal setup` does step by step

Expanded, the first deploy:

1. Connects to the servers over SSH (root by default, authenticated by your SSH key).
2. Installs Docker on any server missing it (using get.docker.com); root access via SSH is needed for this.
3. Logs into the registry both locally and remotely.
4. Builds the image using the standard Dockerfile in the root of the application.
5. Pushes the image to the registry.
6. Pulls the image from the registry onto the servers.
7. Ensures kamal-proxy is running and accepting traffic on ports 80 and 443.
8. Starts a new container with the version of the app that matches the current Git version hash.
9. Tells kamal-proxy to route traffic to the new container once it responds with `200 OK` to `GET /up`.
10. Stops the old container running the previous version of the app.
11. Prunes unused images and stopped containers so servers don't fill up.

All servers are now serving the app on port 80. If you run a single server,
you're ready to go. If you run multiple servers, put a load balancer in front of
them.

> **If `kamal setup` is interrupted** (SSH drop, network reset) partway through:
> the deploy lock may still be held on the server — check with
> `kamal lock status`. If the image already built and pushed, resume without
> rebuilding: `kamal lock release`, boot any accessories that aren't running
> yet (`kamal accessory boot all`; a name-conflict error for one that already
> booted is harmless), then `kamal deploy --skip-push` to deploy the
> already-pushed image. If the failure happened during build or push, just
> release the lock and rerun `kamal setup`. For lock details, see the
> **deploy** skill.

### Bootstrapping Docker separately

`kamal setup` installs Docker for you when it has permission. To set up Docker on
the hosts explicitly — for example before a deploy — run:

```sh
kamal server bootstrap
```

This checks whether Docker is installed and, if not, attempts to install it via
[get.docker.com](https://get.docker.com/).

---

## After the First Deploy

For subsequent deploys, or if your servers already have Docker installed, you do
not need `setup` again — just run:

```sh
kamal deploy
```

`kamal deploy` builds and deploys the currently checked-out version of the app
to all servers. For the full release workflow, see the **deploy** skill.

---

## Useful Commands

| Command | What it does |
|---------|--------------|
| `kamal init` | Create config stub in `config/deploy.yml` and secrets stub in `.kamal` |
| `kamal setup` | Setup all accessories, push the env, and deploy app to servers |
| `kamal deploy` | Deploy app to servers |
| `kamal server bootstrap` | Set up Docker to run Kamal apps |
| `kamal docs [SECTION]` | Show Kamal configuration documentation |
| `kamal help [COMMAND]` | Describe available commands or one specific command |
| `kamal version` | Show Kamal version |

### Most-used global options

| Option | Description |
|--------|-------------|
| `-c, --config-file=CONFIG_FILE` | Path to config file (default `config/deploy.yml`) |
| `-d, --destination=DESTINATION` | Destination for the config file (`staging` → `deploy.staging.yml`) |
| `-v, --verbose` | Detailed logging |
| `-q, --quiet` | Minimal logging |
| `-p, --primary` | Run commands only on the primary host instead of all |
| `-h, --hosts=HOSTS` | Run on these hosts instead of all (comma-separated, supports `*` wildcards) |
| `-r, --roles=ROLES` | Run on these roles instead of all (comma-separated, supports `*` wildcards) |
| `-H, --skip-hooks` | Don't run hooks |

For the full command list, the `kamal server` subcommands, and every global
option, see [references/cli-reference.md](references/cli-reference.md). You can
also run `kamal --help` or `kamal help [command]` at any time.

---

## Related Skills

- **config**: For the full set of `config/deploy.yml` keys and defaults.
- **deploy**: For routine releases with `kamal deploy` after the first setup.
- **secrets**: For `.kamal/secrets` and reading secrets from vault adapters.
- **registry**: For configuring Docker Hub, ECR, GCP Artifact Registry, and other registries.
