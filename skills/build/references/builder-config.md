# Builder Configuration Reference

The full set of `builder` keys for `config/deploy.yml`. All options go under the `builder` key in the root configuration, and they control how the application is built with `docker build`.

```yaml
builder:
```

## Full Key Table

| Key | Default | Description |
|-----|---------|-------------|
| `arch` | — | The architectures to build for. A single value or an array. Allowed values: `amd64` and `arm64`. |
| `remote` | — | Connection string for a remote builder (e.g. `ssh://docker@docker-builder`). If supplied, Kamal uses it for builds that do not match the local architecture of the deployment host. |
| `local` | `true` | If `false`, Kamal always uses the remote builder even when building the local architecture. |
| `pack` | — | Build configuration for using `pack` to build a Cloud Native Buildpack image. |
| `cache` | — | Multistage build cache. `type` must be either `gha` or `registry`. |
| `context` | Git clone of the repo | Build context. If not set, a local Git clone of the repo is used (a clean build with no uncommitted changes). Set to `.` or a path to another directory to use the local checkout. |
| `dockerfile` | `Dockerfile` | The Dockerfile to use for building. |
| `target` | default target | The build target. If not set, the default target is used. |
| `args` | — | Additional build arguments, passed to `docker build` as `--build-arg <key>=<value>`. |
| `secrets` | — | Build secrets. Values are read from `.kamal/secrets`. |
| `ssh` | — | SSH agent socket or keys to expose to the build. |
| `driver` | `docker-container` | The build driver to use. |
| `provenance` | — | Configures provenance attestations for the build result. Can also be a boolean to enable or disable provenance attestations. |
| `sbom` | — | Configures SBOM (Software Bill of Materials) generation for the build result. Can also be a boolean to enable or disable SBOM generation. |

## Arch

The architectures to build for — set an array or a single value. Allowed values are `amd64` and `arm64`:

```yaml
builder:
  arch:
    - amd64
```

## Remote

The connection string for a remote builder. If supplied, Kamal will use this for builds that do not match the local architecture of the deployment host:

```yaml
builder:
  remote: ssh://docker@docker-builder
```

## Local

If set to `false`, Kamal will always use the remote builder even when building the local architecture. Defaults to `true`:

```yaml
builder:
  local: true
```

## Buildpacks (pack)

The build configuration for using `pack` to build a Cloud Native Buildpack image. For additional buildpack customization you can create a project descriptor file (`project.toml`) that the Pack CLI will automatically use:

```yaml
builder:
  pack:
    builder: heroku/builder:24
    buildpacks:
      - heroku/ruby
      - heroku/procfile
```

This example uses Heroku's `ruby` and `procfile` buildpacks to build the final image instead of a `Dockerfile` and the default `docker build` process.

## Cache

The multistage build cache. The `type` must be either `gha` or `registry`. The `image` is only used for the registry cache and is not compatible with the Docker driver:

```yaml
builder:
  cache:
    type: registry
    options: mode=max
    image: kamal-app-build-cache
```

### Registry cache with a different cache image

The default image name is `<image>-build-cache`:

```yaml
builder:
  cache:
    type: registry
    image: application-cache-image
```

### Registry cache with additional cache-to options

```yaml
builder:
  cache:
    type: registry
    options: mode=max,image-manifest=true,oci-mediatypes=true
```

### GHA cache configuration

To make the GHA cache work in a GitHub Actions workflow, set up `buildx` and expose the authentication configuration for the cache. Example setup in `.github/workflows/sample-ci.yml`:

```yaml
- name: Set up Docker Buildx for cache
  uses: docker/setup-buildx-action@v3

- name: Expose GitHub Runtime for cache
  uses: crazy-max/ghaction-github-runtime@v3
```

When set up correctly, you should see the cache entries in the GHA workflow's actions cache section.

## Build Context

If `context` is not set, a local Git clone of the repo is used, which ensures a clean build with no uncommitted changes. To use the local checkout instead, set the context to `.` or a path to another directory:

```yaml
builder:
  context: .
```

## Dockerfile

The Dockerfile to use for building, defaults to `Dockerfile`:

```yaml
builder:
  dockerfile: Dockerfile.production
```

## Build Target

If not set, the default target is used:

```yaml
builder:
  target: production
```

## Build Arguments

Any additional build arguments, passed to `docker build` with `--build-arg <key>=<value>`:

```yaml
builder:
  args:
    ENVIRONMENT: production
```

Reference a build argument in the Dockerfile:

```dockerfile
ARG RUBY_VERSION
FROM ruby:$RUBY_VERSION-slim as base
```

## Build Secrets

Values are read from `.kamal/secrets`:

```yaml
builder:
  secrets:
    - SECRET1
    - SECRET2
```

Reference a build secret in the Dockerfile by mounting it so it does not persist in a layer:

```dockerfile
# Install dependencies, including private repositories via access token
# Then remove bundle cache with exposed GITHUB_TOKEN
RUN --mount=type=secret,id=GITHUB_TOKEN \
  BUNDLE_GITHUB__COM=x-access-token:$(cat /run/secrets/GITHUB_TOKEN) \
  bundle install && \
  rm -rf /usr/local/bundle/cache
```

## SSH

SSH agent socket or keys to expose to the build:

```yaml
builder:
  ssh: default=$SSH_AUTH_SOCK
```

## Driver

The build driver to use, defaults to `docker-container`:

```yaml
builder:
  driver: docker
```

To use Docker Build Cloud, set the driver to `cloud` with your org and builder name:

```yaml
builder:
  driver: cloud org-name/builder-name
```

## Provenance

Configures provenance attestations for the build result. The value can also be a boolean to enable or disable provenance attestations:

```yaml
builder:
  provenance: mode=max
```

## SBOM (Software Bill of Materials)

Configures SBOM generation for the build result. The value can also be a boolean to enable or disable SBOM generation:

```yaml
builder:
  sbom: true
```

## Source

- [Builder configuration](https://kamal-deploy.org/docs/configuration/builders/)
- [Builder examples](https://kamal-deploy.org/docs/configuration/builder-examples/)
