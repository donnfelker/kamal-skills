# Kamal 2: Continuing to Use Traefik

Kamal 2 requires kamal-proxy, but it's possible to continue using Traefik if required. You run it as a Kamal accessory and route requests through it and then on to kamal-proxy.

Official docs: <https://kamal-deploy.org/docs/upgrading/continuing-to-use-traefik/>

## Set the kamal-proxy boot config

You need to change kamal-proxy's default boot config so that:

1. It doesn't publish ports on the host.
2. It adds the labels Traefik needs to route requests to it.

Add a [pre-deploy hook](https://kamal-deploy.org/docs/hooks/pre-deploy/) for Traefik to pick up:

```shell
#!/bin/sh
kamal proxy boot_config set \
  --publish false \
  --docker_options label=traefik.http.services.kamal_proxy.loadbalancer.server.scheme=http \
                   label=traefik.http.routers.kamal_proxy.rule=PathPrefix\(\`/\`\)
```

Adding the `kamal proxy boot_config set` command to a pre-deploy hook ensures it is set correctly when deploying to a host for the first time.

## Create the accessory

Add Traefik as an accessory to `config/deploy.yml`, binding to the host port:

```yaml
accessories:
  traefik:
    service: traefik
    image: traefik:v2.10
    port: 80
    cmd: "--providers.docker"
    options:
      volume:
        - "/var/run/docker.sock:/var/run/docker.sock"
    roles:
      - web
```

## Running with Traefik

When you call `kamal setup`, it will boot the Traefik accessory, call the pre-deploy hook to update kamal-proxy's boot config, and then boot kamal-proxy and the app. Requests will flow from Traefik to kamal-proxy to your app.

```
$ docker ps
CONTAINER ID   IMAGE                          COMMAND                  STATUS              PORTS                               NAMES
3729c50d9d94   .../app_with_traefik:...       "/docker-entrypoint.…"   Up 10 seconds       80/tcp                              app_with_traefik-web-...
3c87e1c649e3   basecamp/kamal-proxy:v0.4.0    "kamal-proxy run"        Up 11 seconds       80/tcp, 443/tcp                     kamal-proxy
609a18d8ecd7   traefik:v2.10                  "/entrypoint.sh --pr…"   Up About a minute   0.0.0.0:80->80/tcp, :::80->80/tcp   traefik
```

## Switching on a host already running kamal-proxy

If you are already running kamal-proxy, you'll need to:

1. Manually run the `kamal proxy boot_config set` command from the deploy hook.
2. Run `kamal proxy reboot` to pick up those boot config changes.
3. Run `kamal accessory boot traefik` to start Traefik.
