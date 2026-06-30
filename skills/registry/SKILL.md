---
name: registry
description: Configure the Docker registry Kamal pushes your app image to and pulls it from — Docker Hub (the default), AWS ECR, GCP Artifact Registry, a local registry, or any custom/self-hosted registry such as GHCR — and log in or out with `kamal registry login` / `logout`. Use when the user says "set up my Docker registry," "kamal registry login," "configure ECR/GCR/GHCR for Kamal," "where does Kamal push my image," "docker login failed on deploy," "use a private Docker Hub repo," or needs the `registry` block (`server`, `username`, `password`) in `config/deploy.yml` wired to a `KAMAL_REGISTRY_PASSWORD` secret. For building and pushing the image itself, see build. For storing the registry password safely, see secrets. For first-time project setup, see setup.
metadata:
  version: 1.0.0
---

# Docker Registry

You are an expert in deploying applications with Kamal. This skill configures the **container registry** Kamal pushes your app image to and pulls it from, and logs that registry in and out on your servers with `kamal registry`.

The default registry is **Docker Hub**, but you can point Kamal at AWS ECR, GCP Artifact Registry, a local registry, or any other Docker-compatible registry by setting the `registry` block in `config/deploy.yml`.

## Before you start

Read what the project already has before asking the user questions:

- **`config/deploy.yml`** — look for an existing `registry:` block (`server`, `username`, `password`).
- **`.kamal/secrets`** — look for `KAMAL_REGISTRY_PASSWORD`, the secret Kamal looks up for the registry password.

Knowing which registry the user is on (Docker Hub, ECR, GCP, local, or self-hosted) determines everything below.

## How the registry block works

Registry settings live under the `registry` key in `config/deploy.yml`:

| Key | Purpose |
|-----|---------|
| `server` | The registry host. Omit it to use Docker Hub (the default); set it for ECR, GCP, a local registry, or any other host. |
| `username` | The account Kamal authenticates as. |
| `password` | The password or token, normally given as a secret reference rather than a literal value. |

The `password` references a **secret by name** — e.g. `KAMAL_REGISTRY_PASSWORD`. Kamal looks that name up in your local environment (loaded from `.kamal/secrets`) instead of storing the literal value in `config/deploy.yml`, keeping credentials out of source control:

```yaml
registry:
  username:
    - my-docker-username
  password:
    - KAMAL_REGISTRY_PASSWORD
```

A local registry (`server: localhost:...`) is the exception — it needs only `server`.

## Walk-through

### 1. Choose your registry

| Registry | `server` value |
|----------|----------------|
| Docker Hub (default) | omit `server` |
| AWS ECR | `<aws-account-id>.dkr.ecr.<region>.amazonaws.com` |
| GCP Artifact Registry | `<region>-docker.pkg.dev` |
| Local registry | `localhost:<port>` (e.g. `localhost:5555`) |
| Other / self-hosted | your registry host |

### 2. Store the registry password as a secret

Put the password or token in `.kamal/secrets` as `KAMAL_REGISTRY_PASSWORD` so it is read from the environment and kept out of `config/deploy.yml`. See the **secrets** skill for pulling this from a vault such as 1Password or AWS Secrets Manager.

### 3. Add the `registry` block

Use the snippet for your provider (below), referencing `KAMAL_REGISTRY_PASSWORD` for the password.

### 4. Validate

```shell
kamal registry login
```

This logs in to the registry locally and on every server. A clean exit means your `server`, `username`, and `password` are correct.

## Registry configurations

### Docker Hub (default)

Docker Hub is the default, so you set only `username` and `password`:

```yaml
registry:
  username:
    - your-docker-hub-username
  password:
    - KAMAL_REGISTRY_PASSWORD
```

Docker Hub creates **public** repositories by default. To keep your image private, set up a private repository before deploying, or change your Docker Hub default repository privacy to private. See [references/registry-providers.md](references/registry-providers.md).

### AWS ECR

Requires the AWS CLI installed locally. An ECR access token is only valid for 12 hours, so use ERB to shell out to the AWS CLI and fetch a fresh token on each run:

```yaml
registry:
  server: <your aws account id>.dkr.ecr.<your aws region id>.amazonaws.com
  username: AWS
  password: <%= %x(aws ecr get-login-password) %>
```

### GCP Artifact Registry

Use a base64-encoded service account JSON key as the password, with `_json_key_base64` as the username:

```yaml
registry:
  server: <your registry region>-docker.pkg.dev
  username: _json_key_base64
  password:
    - KAMAL_REGISTRY_PASSWORD
```

Set `KAMAL_REGISTRY_PASSWORD` to the base64-encoded key. See [references/registry-providers.md](references/registry-providers.md) for creating the service account, granting `roles/artifactregistry.writer`, and encoding the key.

### Local registry

If `server` starts with `localhost`, Kamal starts a local Docker registry on that port and pushes the app image to it:

```yaml
registry:
  server: localhost:5555
```

### Other registries (custom / self-hosted)

Any other Docker-compatible registry — a self-hosted registry, GitHub Container Registry (`ghcr.io`), and so on — uses the same three keys: set `server` to the registry host and provide `username` / `password`. See [references/registry-providers.md](references/registry-providers.md).

## Logging in and out

`kamal registry` manages registry authentication locally and on all servers.

| Command | What it does |
|---------|--------------|
| `kamal registry login` | Log in to the remote registry locally and remotely |
| `kamal registry logout` | Log out of the remote registry locally and remotely |

```bash
$ kamal registry login
$ kamal registry logout
```

You usually don't run these by hand for a normal deploy — `kamal deploy` logs in to the Docker registry locally and on all servers as its first step, then builds, pushes, and pulls the image. Use `kamal registry login` mainly to **validate** your configuration.

For the full subcommand list (`setup`, `remove`, `help`) and example output, see [references/registry-commands.md](references/registry-commands.md).

## Troubleshooting

- **`docker login` fails on deploy** — run `kamal registry login` to surface the error in isolation; check `server`, `username`, and that `KAMAL_REGISTRY_PASSWORD` resolves in `.kamal/secrets`.
- **Image is public on Docker Hub** — Docker Hub defaults new repositories to public; create a private repository or change your default privacy setting before deploying.
- **ECR auth keeps expiring** — the ECR token lasts only 12 hours; the ERB `aws ecr get-login-password` approach regenerates it on each run.

## Related Skills

- **build**: For building the app image and pushing it to the registry you configure here.
- **secrets**: For storing `KAMAL_REGISTRY_PASSWORD` in `.kamal/secrets` and pulling it from a vault.
- **setup**: For first-time Kamal setup, where the `registry` block is first filled in.
