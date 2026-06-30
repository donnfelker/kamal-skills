# Kamal 2: Secrets Changes Reference

The full migration of secrets from Kamal 1.x to 2.0. Use this when moving from `.env` to `.kamal/secrets` in step 4 of the upgrade walk-through.

Official docs: <https://kamal-deploy.org/docs/upgrading/secrets-changes/>

## Where secrets live

Secrets have moved from `.env`/`.env.rb` to **`.kamal/secrets`**.

If you are using destinations, secrets will be read from `.kamal/secrets.<DESTINATION>` first, or `.kamal/secrets-common` if that is not found.

## Interpolating secrets

The `kamal envify` and `kamal env` commands have been **removed**, and secrets no longer have a separate lifecycle.

If you were generating secrets with `kamal envify`, you can instead use dotenv's [command substitution](https://github.com/bkeepers/dotenv?tab=readme-ov-file#command-substitution) and [variable substitution](https://github.com/bkeepers/dotenv?tab=readme-ov-file#variable-substitution). The substitution is performed on demand when running Kamal commands that need the secrets:

```bash
# .kamal/secrets

SECRET_FROM_ENV=$SECRET_FROM_ENV
SECRET_FROM_COMMAND=$(op read ...)
```

See the [environment variables docs](https://kamal-deploy.org/docs/configuration/environment-variables/#using-kamal-secrets) for more details.

## Environment variables in deploy.yml

In Kamal 1, `.env` was loaded into the environment, so you could refer to values from it via ERB in `deploy.yml`. **This is no longer the case in Kamal 2.** Values from `.kamal/secrets` are not loaded either.

Kamal 1:

```yaml
# .env
SERVER_IP=127.0.0.1

# config/deploy.yml
servers
  - <%= ENV["SERVER_IP"] %>
```

To make this work in Kamal 2, you can manually load `.env`:

```yaml
# .env
SERVER_IP=127.0.0.1

# config/deploy.yml

<% require "dotenv"; Dotenv.load(".env") %>

servers
  - <%= ENV["SERVER_IP"] %>
```
