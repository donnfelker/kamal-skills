---
name: building-images
description: Configure Kamal builders and build then push your app image. Use this skill when the user wants to set up the `builder` block in config/deploy.yml — choosing local, remote, multi-arch, or Docker Build Cloud builds, picking a `driver`, passing build `args`, build `secrets`, or `cache`, switching the `dockerfile`, `context`, or `target`, or building without a Dockerfile via buildpacks (`pack`) — and when they want to run `kamal build push`, `kamal build dev`, or other `kamal build` subcommands. Trigger phrases include "kamal build," "build my image," "push the image to the registry," "build for amd64/arm64," "remote builder," "Apple Silicon cross-build is slow," "speed up my builds with cache," "pass a build arg," "use a build secret," or "build without a Dockerfile." For configuring the container registry, see registry. For the one-step flow that builds and ships in a single command, see deploying. For managing the secret values that build secrets reference, see secrets.
metadata:
  version: 1.0.0
---

# Building Images

You are an expert in building and shipping container images with Kamal. Your goal is to configure the `builder` block in `config/deploy.yml` for the user's architecture and registry, then build and push a working app image with `kamal build`.

## Before You Start

Read what already exists before asking questions:

1. **`config/deploy.yml`** — look for an existing `builder:` block, the `image:` name, and the `registry:` it pushes to.
2. **`.kamal/secrets`** — if the build needs a secret (like `GITHUB_TOKEN`), it is read from here.
3. **`Dockerfile`** — confirm there is one (the default build path uses it), or whether the user wants buildpacks instead.

The `builder` configuration controls how the application is built with `docker build`. All options go under the `builder` key in the root configuration.

## How Kamal Builds

Understand the defaults before changing anything:

- `kamal build` builds your app image and pushes it to your servers. These commands are called indirectly by `kamal deploy` and `kamal redeploy`.
- By default, Kamal **only builds files you have committed to Git** — it uses a `git archive` of `HEAD`, which guarantees a clean build with no uncommitted changes.
- The image is tagged with the current Git version hash **and** `latest`, and labeled with the service name.
- If you are on Apple Silicon (ARM64) but deploy to AMD64, Kamal by default sets up a local `buildx` configuration that cross-builds through **QEMU emulation**. This works but can be slow, especially on the first build — a remote builder fixes that (see below).

## Walk-Through

### Step 1 — Inspect the current setup

Show the configured build setup before changing it:

```bash
kamal build details
```

This reflects whatever `builder:` block (if any) is in `config/deploy.yml`.

### Step 2 — Choose a build strategy

Pick based on where you develop versus where you deploy:

| Situation | Strategy |
|-----------|----------|
| Same architecture local and remote, single arch | Local single-arch builder |
| Develop on ARM64, deploy on AMD64, want speed | Remote builder for the non-local arch |
| Need an image that runs on both `amd64` and `arm64` | Multi-arch build (remote builds the other arch) |
| No build machine / want managed builders | Docker Build Cloud driver |
| No Dockerfile, want Heroku-style buildpacks | `pack` (Cloud Native Buildpacks) |

See [Choosing a Build Strategy](#choosing-a-build-strategy) for the YAML for each.

### Step 3 — Write the `builder` block

Add a `builder:` block to `config/deploy.yml`. Start minimal — pick your architecture:

```yaml
builder:
  arch: amd64
```

`arch` accepts a single value or an array, and the allowed values are `amd64` and `arm64`.

### Step 4 — Add build inputs as needed

Layer in only what the build actually requires:

- **Build args** for non-secret values (`RUBY_VERSION`, `ENVIRONMENT`).
- **Build secrets** for tokens that must not bake into a layer (`GITHUB_TOKEN`).
- **Cache** (`gha` or `registry`) to speed up multistage builds.

See [Build Args and Secrets](#build-args-and-secrets) and [Build Cache](#build-cache).

### Step 5 — Build and push

Build the image and push it to the registry:

```bash
kamal build push
```

Under the hood this runs the equivalent of `git archive --format=tar HEAD | docker build -t <registry>/<image>:<git-sha> -t <registry>/<image>:latest --label service="<app>" --file Dockerfile -` followed by `docker push` of both tags. The pre-connect and pre-build hooks run, and the deploy lock is acquired and released around the build.

To pull the pushed image onto the servers afterward:

```bash
kamal build pull
```

Or do build, push, and pull in one step with `kamal build deliver`. In practice, `kamal deploy` calls these for you.

### Step 6 — Iterate locally without committing

To test a build from your working directory (including uncommitted changes), use:

```bash
kamal build dev
```

This builds using the working directory, tags it as `dirty`, and pushes to the **local image store** rather than the registry.

## Builder Configuration

The most commonly used keys, with their defaults:

| Key | Default | Purpose |
|-----|---------|---------|
| `arch` | — | Architecture(s) to build for. `amd64`, `arm64`, or an array of both. |
| `remote` | — | Connection string for a remote builder, e.g. `ssh://docker@docker-builder`. Used for builds that do not match the local architecture of the deployment host. |
| `local` | `true` | If `false`, always use the remote builder even when building the local architecture. |
| `driver` | `docker-container` | The build driver to use. |
| `dockerfile` | `Dockerfile` | The Dockerfile to build from. |
| `context` | Git clone of the repo | Build context. Set to `.` (or another path) to build from the local checkout instead. |
| `target` | default target | The build target stage. |
| `args` | — | Build arguments passed to `docker build` as `--build-arg <key>=<value>`. |
| `secrets` | — | Build secrets, read from `.kamal/secrets`. |
| `cache` | — | Multistage build cache (`gha` or `registry`). |

For the complete set of keys — including `pack`, `ssh`, `provenance`, and `sbom` — see [references/builder-config.md](references/builder-config.md).

## Choosing a Build Strategy

### Local single-arch

Always build locally for one architecture using a local `buildx` instance:

```yaml
builder:
  arch: amd64
```

### Remote builder for single-arch

Develop on ARM64 (Apple Silicon) but deploy on AMD64, and build the AMD64 image natively on a remote AMD64 host instead of via emulation:

```yaml
builder:
  arch: amd64
  remote: ssh://root@192.168.0.1
```

Kamal uses the remote to build when deploying from an ARM64 machine, and builds locally when deploying from an AMD64 machine. You must have Docker running on the remote host; share that instance only for builds using the same registry and credentials.

### Multi-arch

Build an image for both architectures. When a `remote` is set, Kamal builds the architecture matching your deployment server locally and the other architecture remotely:

```yaml
builder:
  arch:
    - amd64
    - arm64
  remote: ssh://root@192.168.0.1
```

### Always use the remote builder

Force the remote even when building the local architecture:

```yaml
builder:
  arch: amd64
  remote: ssh://root@192.168.0.1
  local: false
```

### Docker Build Cloud

Use managed cloud builders by setting the driver:

```yaml
builder:
  driver: cloud org-name/builder-name
```

### Different Dockerfile or context (monorepos)

Point at a non-default Dockerfile and/or context — useful in a monorepo or when you keep multiple Dockerfiles:

```yaml
builder:
  dockerfile: "../Dockerfile.xyz"
  context: ".."
```

### Build without a Dockerfile (buildpacks)

Build with Cloud Native Buildpacks via `pack` instead of a Dockerfile. See [references/builder-config.md](references/builder-config.md#buildpacks-pack) for the `pack` options.

## Build Args and Secrets

### Build args

Non-secret values configured under `args` are passed to `docker build` as `--build-arg <key>=<value>`:

```yaml
builder:
  args:
    RUBY_VERSION: 3.2.0
```

Reference the arg in your Dockerfile:

```dockerfile
ARG RUBY_VERSION
FROM ruby:$RUBY_VERSION-slim as base
```

### Build secrets

Secrets — like a `GITHUB_TOKEN` for private gem repositories — are read from `.kamal/secrets`, then listed under `secrets`. First set the secret:

```bash
# .kamal/secrets
GITHUB_TOKEN=$(gh config get -h github.com oauth_token)
```

Then reference it in the builder config:

```yaml
builder:
  secrets:
    - GITHUB_TOKEN
```

And mount it in the Dockerfile so it never persists in a layer:

```dockerfile
RUN --mount=type=secret,id=GITHUB_TOKEN \
  BUNDLE_GITHUB__COM=x-access-token:$(cat /run/secrets/GITHUB_TOKEN) \
  bundle install && \
  rm -rf /usr/local/bundle/cache
```

For where these secret values come from (vaults, password managers), see the **secrets** skill.

## Build Cache

Docker multistage build cache can speed up your builds. Kamal supports the GHA cache or the registry cache — the `type` must be either `gha` or `registry`:

```yaml
# GitHub Actions cache
builder:
  cache:
    type: gha

# Registry cache
builder:
  cache:
    type: registry
    options: mode=max
    image: kamal-app-build-cache
```

The `image` is only used for the registry cache and is **not** compatible with the Docker driver. The default cache image name is `<image>-build-cache`. For registry cache with extra `cache-to` options and the GitHub Actions workflow setup needed for the GHA cache, see [references/builder-config.md](references/builder-config.md#cache).

## kamal build Commands

The most-used subcommands:

| Command | What it does |
|---------|--------------|
| `kamal build push` | Build and push the app image to the registry. |
| `kamal build pull` | Pull the app image from the registry onto the servers. |
| `kamal build deliver` | Build and push the image, then pull it onto the servers. |
| `kamal build dev` | Build from the working directory, tag it as `dirty`, and push to the local image store. |
| `kamal build details` | Show the build setup. |

`build push` and `build dev` also accept an `--output` option. For the full subcommand list, the `--output` behavior, and an annotated `kamal build push` run, see [references/build-commands.md](references/build-commands.md).

## Notes and Gotchas

- **Uncommitted changes won't be built** by default — Kamal builds a `git archive` of `HEAD`. Commit your work, set `context: .` to build the local checkout, or use `kamal build dev` for quick local iteration.
- **First emulated cross-build is slow** — if you build AMD64 from an ARM64 Mac via the default QEMU path and it drags, add a `remote` AMD64 builder.
- **Registry cache `image` + Docker driver don't mix** — the cache `image` is for the registry cache only and is not compatible with the Docker driver.
- **Remote builders need Docker running** and should only be shared across builds using the same registry and credentials.

## Related Skills

- **registry**: Configure and log into the container registry (`registry/server`, username, password) that `kamal build push` pushes to.
- **deploying**: Run `kamal deploy`, which builds, pushes, pulls, and releases in one step — calling these build commands for you.
- **secrets**: Manage the secret values in `.kamal/secrets` that build `secrets` reference, including fetching them from vaults and password managers.
