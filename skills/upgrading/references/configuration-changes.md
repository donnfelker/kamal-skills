# Kamal 2: Configuration Changes Reference

The full set of backward-incompatible `config/deploy.yml` changes when upgrading from Kamal 1.x to 2.0. Use this when converting configuration in step 3 of the upgrade walk-through.

Official docs: <https://kamal-deploy.org/docs/upgrading/configuration-changes/>

## Builder

The [builder configuration](https://kamal-deploy.org/docs/configuration/builders/) has been simplified.

### Arch

You must specify the architecture(s) you are building for:

```yaml
# single arch
builder:
  arch: amd64

# multi arch
builder:
  arch:
    - amd64
    - arm64
```

### Remote builders

Set the remote directly with the `remote` option. By default, it will only be used if the arch you are building doesn't match the local machine:

```yaml
builder:
  arch: amd64
  remote: ssh://docker@docker-builder
```

Force Kamal to use only the remote builder by setting `local: false`:

```yaml
builder:
  arch: amd64
  local: false
  remote: ssh://docker@docker-builder
```

### Driver

Kamal will now always use the Docker container driver by default. Set the driver yourself to change this:

```yaml
builder:
  driver: docker
```

The Docker driver has limited capabilities — it doesn't support build caching or multiarch images.

## Traefik → Proxy

The `traefik` configuration is **no longer valid**. Instead, configure kamal-proxy under [`proxy`](https://kamal-deploy.org/docs/configuration/proxy/).

If you were using custom Traefik labels or args, check the proxy configuration to determine whether you can convert them.

By default kamal-proxy forwards traffic to container port **80**, because it assumes your container is running Thruster, which listens on port 80. If you are running a different service or port, configure the `app_port` setting:

```yaml
proxy:
  app_port: 3000
```

kamal-proxy supports common requirements such as buffering, max request/response sizes, and forwarding headers, but it does **not** encompass the full breadth of everything Traefik can do. If something you need is missing, you can raise an issue — but support isn't promised, and you might need to run Traefik or another proxy elsewhere in your stack.

## Healthchecks

The `healthcheck` section has been **removed**.

### Proxy roles

For roles running with a proxy, healthchecks are performed externally by kamal-proxy, not via internal Docker healthchecks. Configure them under [`proxy/healthcheck`](https://kamal-deploy.org/docs/configuration/proxy/#healthcheck):

```yaml
proxy:
  healthcheck:
    path: /health
    interval: 2
    timeout: 2
```

These healthchecks use the `app_port` setting, which defaults to port 80. Previously, healthchecks defaulted to port 3000. Change it back with:

```yaml
proxy:
  app_port: 3000
```

### Non-proxy roles

For roles that do not run the proxy, set a custom Docker healthcheck via the role [`options`](https://kamal-deploy.org/docs/configuration/roles/#custom-role-configuration):

```yaml
servers:
  web:
    ...
  jobs:
    options:
      health-cmd: bin/jobs-healthy
```

For those containers, Kamal will wait for the `healthy` status if they have a healthcheck, or `running` if they don't. You can set a `readiness_delay`, used when Kamal sees the `running` status: it waits that long and confirms the container is still running before continuing.

### All roles

At the root of the config you can set timeouts that apply across all roles, whether or not they use a proxy:

```yaml
# how long to wait for new containers to boot
deploy_timeout: 20

# how long to wait for requests to complete before stopping old containers
# Replaces stop_wait_time
drain_timeout: 20

# how long to wait for 'non-proxy role' containers without healthchecks to stay in the running state
readiness_delay: 10
```

Note that `drain_timeout` replaces the old `stop_wait_time` setting.
