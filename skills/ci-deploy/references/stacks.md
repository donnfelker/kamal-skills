# Stack Notes

What changes per stack: how Kamal is installed on the runner, which inputs `.kamal/secrets` usually reads, and what to check in `config/deploy.yml`. The workflow, deploy key, environment, and cache steps are the same for all of them.

Kamal is a Ruby gem. The [installation docs](https://kamal-deploy.org/docs/installation/) offer `gem install kamal`, or a Docker-wrapped Kamal [with some limitations](https://kamal-deploy.org/docs/installation/dockerized/). On a GitHub runner, installing Ruby just to run Kamal is the simpler choice. Pin the same Kamal version the user runs locally (`kamal version`).

Two Kamal defaults matter for every stack:

- kamal-proxy sends traffic to `proxy.app_port`, which defaults to 80. Set it to the port the app listens on.
- A deploy waits for `GET /up` to return 200 before switching traffic ([proxy healthcheck](https://kamal-deploy.org/docs/configuration/proxy/#healthcheck)). The app needs that route, or `proxy.healthcheck.path` must point at one it has.

These are worth confirming before the first CI deploy. A CI deploy fails the same way a local one would.

## Rails

- **Install Kamal:** Rails 7.2+ apps ship Kamal in the `Gemfile` and a `bin/kamal` binstub. Use `ruby/setup-ruby` with `bundler-cache: true` and run `bin/kamal deploy`.
- **Typical inputs:** `RAILS_MASTER_KEY` from `config/master.key` or `config/credentials/<env>.key`; database passwords; registry password unless the registry is local.
- **Watch for:** a test job in the CI workflow that already uses `secrets.RAILS_MASTER_KEY`. Keeping the production key in an environment keeps it away from tests.
- **Health:** Rails 7.1+ generates `/up`.

## Next.js (and other Node apps)

- **Install Kamal:** `ruby/setup-ruby` with a `ruby-version`, then `gem install kamal -v <version>`; run `kamal deploy`.
- **Typical inputs:** env vars read straight from the environment (`DATABASE_URL`, API keys). Map them in the workflow's `env:` from secrets; often no files need writing.
- **Build-time values:** `NEXT_PUBLIC_*` values are baked in at build time. Pass them with `builder.args`, or `builder.secrets` for secret ones ([builders](https://kamal-deploy.org/docs/configuration/builders/)), and make sure the workflow provides them.
- **Port:** Next.js listens on 3000 by default, so set `proxy.app_port: 3000`.
- **Health:** add an `/up` route (or set `proxy.healthcheck.path`).
- **Cache:** `mode=max` keeps the dependency-install stage cached across deploys.

## Phoenix (Elixir)

- **Install Kamal:** `ruby/setup-ruby` + `gem install kamal`.
- **Typical inputs:** `SECRET_KEY_BASE`, `DATABASE_URL`, `PHX_HOST`; registry password unless local.
- **Port:** Phoenix releases commonly listen on 4000, so set `proxy.app_port` to match the `PORT` the release uses.
- **Health:** add an `/up` route in the router (or set `proxy.healthcheck.path`).
- **Migrations:** run them the way the user does today (a release command in the container's start script is a common convention). CI doesn't change this.

## Rust (Axum, Actix, Rocket, and others)

- **Install Kamal:** `ruby/setup-ruby` + `gem install kamal`.
- **Typical inputs:** env vars (`DATABASE_URL`, keys) mapped from secrets.
- **Port:** whatever the binary binds, set as `proxy.app_port`. The app must bind `0.0.0.0`, not `127.0.0.1`, to be reachable inside the container network.
- **Health:** add an `/up` handler (or set `proxy.healthcheck.path`).
- **Cache:** cold Rust builds are slow, so the build cache matters most here. Use a multistage Dockerfile that builds dependencies in their own layer, with `cache.options: mode=max`.

## Static sites (Astro, Hugo, Jekyll, plain HTML)

- **Install Kamal:** `ruby/setup-ruby` + `gem install kamal` (Jekyll sites may already have Ruby).
- **Typical inputs:** often none beyond the ssh key and the registry password. The site is built in the Dockerfile and served by a web server image such as nginx.
- **Port:** nginx listens on 80, the `proxy.app_port` default.
- **Health:** serve a static `up` file (for example `up/index.html`) so `GET /up` returns 200, or point `proxy.healthcheck.path` at `/`.
- **Tests:** if there's no test workflow, gate on a build check workflow, or trigger the deploy on `push` and say nothing gates it.

## Django, Laravel, Go, and others

The same three questions decide the setup:

1. **How is Kamal installed?** Ruby in the repo → `bundle`; otherwise `gem install kamal`.
2. **What does `.kamal/secrets` read?** Files → write them back in the workflow; env vars → map them in `env:`.
3. **Port and health route?** Set `proxy.app_port`; make sure `GET /up` (or `proxy.healthcheck.path`) returns 200.
