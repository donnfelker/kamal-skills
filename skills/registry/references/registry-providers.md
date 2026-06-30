# Registry Providers

Detailed setup for each registry you can configure through the `registry` block in `config/deploy.yml`. Examples that reference `KAMAL_REGISTRY_PASSWORD` rely on a secret Kamal reads from your local environment (loaded from `.kamal/secrets`) — see the **secrets** skill.

## Contents
- Docker Hub
- AWS ECR
- GCP Artifact Registry
- Local registry
- Other / self-hosted registries

## Docker Hub

Docker Hub is the default registry, so you don't set `server` — only `username` and `password`:

```yaml
registry:
  username:
    - your-docker-hub-username
  password:
    - KAMAL_REGISTRY_PASSWORD
```

`KAMAL_REGISTRY_PASSWORD` is a secret reference: Kamal looks the name up in your local environment rather than using it as a literal value.

**Repository privacy:** By default, Docker Hub creates public repositories. To avoid making your images public, either:

- Set up a private repository before deploying, or
- Change the default repository privacy to private in your Docker Hub default-privacy settings (`https://hub.docker.com/repository-settings/default-privacy`).

## AWS ECR

You need the AWS CLI installed locally.

An ECR access token is only valid for **12 hours**. To avoid regenerating it manually every time, use ERB in `config/deploy.yml` to shell out to the AWS CLI and obtain a fresh token on each run:

```yaml
registry:
  server: <your aws account id>.dkr.ecr.<your aws region id>.amazonaws.com
  username: AWS
  password: <%= %x(aws ecr get-login-password) %>
```

## GCP Artifact Registry

To sign in to Artifact Registry:

1. Create a service account (`https://cloud.google.com/iam/docs/service-accounts-create#creating`).
2. Set up roles and permissions (`https://cloud.google.com/artifact-registry/docs/access-control#permissions`). Assigning the `roles/artifactregistry.writer` role is normally sufficient.
3. Generate and download a JSON key for the service account, then base64-encode it:

```shell
base64 -i /path/to/key.json | tr -d "\n"
```

4. Set the `KAMAL_REGISTRY_PASSWORD` secret to that base64 value.
5. Use `_json_key_base64` as the username and the secret as the password:

```yaml
registry:
  server: <your registry region>-docker.pkg.dev
  username: _json_key_base64
  password:
    - KAMAL_REGISTRY_PASSWORD
```

## Local registry

If the registry server starts with `localhost`, Kamal starts a local Docker registry on that port and pushes the app image to it:

```yaml
registry:
  server: localhost:5555
```

`kamal registry setup` sets up the local registry (or logs in to a remote registry locally and remotely); `kamal registry remove` removes the local registry (or logs out of a remote registry locally and remotely). See [registry-commands.md](registry-commands.md).

## Other / self-hosted registries

Any other Docker-compatible registry — a self-hosted registry, GitHub Container Registry at `ghcr.io`, and so on — uses the same three keys. Set `server` to the registry host, `username` to your account, and `password` to a secret reference:

```yaml
registry:
  server: ghcr.io
  username:
    - your-username
  password:
    - KAMAL_REGISTRY_PASSWORD
```

Validate any registry with `kamal registry login`.
