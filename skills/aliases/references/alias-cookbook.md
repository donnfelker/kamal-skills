# Alias Cookbook

Practical Kamal aliases plus the naming rules in full. Source: [Kamal Aliases](https://kamal-deploy.org/docs/configuration/aliases/).

Every alias below is just a **documented `kamal` command with its leading `kamal` removed**, placed under the root `aliases` key in `config/deploy.yml`. Compose your own the same way — there is no special alias syntax beyond "the text you'd type after `kamal`."

## Naming Rules

Aliases are defined in the root config under the `aliases` key. Each alias is named and can only contain:

- lowercase letters (`a`–`z`)
- numbers (`0`–`9`)
- dashes (`-`)
- underscores (`_`)

Underscores are permitted, so `staging_deploy`, `db_console`, and `tail-logs` are all valid names.

## Cookbook

Drop any of these into your `aliases` block. The middle column is the literal alias value; you invoke it as `kamal <alias>`.

| Alias | Value (expands to `kamal …`) | What it does |
|-------|------------------------------|--------------|
| `console` | `app exec -i --reuse "bin/rails console"` | Open a Rails console in the currently running container |
| `shell` | `app exec -i --reuse bash` | Start a bash session in the currently running container |
| `bash` | `app exec -i bash` | Start a bash session in a new container from the most recent app image |
| `uname` | `app exec -p -q -r web "uname -a"` | Print kernel info from the web role's primary host, quietly |
| `logs` | `app logs` | Show log lines from the app on servers |
| `containers` | `app containers` | Show app containers on servers |
| `details` | `app details` | Show details about app containers |
| `maintenance` | `app maintenance` | Set the app to maintenance mode |
| `live` | `app live` | Set the app back to live mode |
| `staging_deploy` | `deploy -d staging` | Deploy to the `staging` destination |

```yaml
aliases:
  console: app exec -i --reuse "bin/rails console"
  shell: app exec -i --reuse bash
  bash: app exec -i bash
  uname: app exec -p -q -r web "uname -a"
  logs: app logs
  containers: app containers
  details: app details
  maintenance: app maintenance
  live: app live
  staging_deploy: deploy -d staging
```

## Building Blocks

The aliases above are assembled from documented commands and flags.

### Commands (`kamal app …`)

| Command | Purpose |
|---------|---------|
| `app exec [CMD...]` | Execute a custom command on servers within the app container |
| `app logs` | Show log lines from the app on servers |
| `app containers` | Show app containers on servers |
| `app details` | Show details about app containers |
| `app maintenance` | Set the app to maintenance mode |
| `app live` | Set the app to live mode |

### `app exec` flags

| Flag | Meaning |
|------|---------|
| `-i`, `--interactive` | Run an interactive command (Rails console, `bash`) |
| `--reuse` | Run inside the currently running app container instead of a new one |
| `-p`, `--primary` | Run only on the primary host |
| `-q`, `--quiet` | Minimal logging |
| `-r`, `--roles` | Run only on the given roles |

### `deploy` flag for destinations

| Flag | Meaning |
|------|---------|
| `-d`, `--destination` | Specify the destination, e.g. `deploy -d staging` reads `deploy.staging.yml` |

## Notes

- An alias value is substituted verbatim after `kamal`, so quote multi-word commands the same way you would on the command line — e.g. `"bin/rails console"`.
- Keep alias names stable; teammates and scripts will rely on `kamal <name>`.
- For the interactive `app exec` commands above (consoles and shells), see the app-operations skill. For where the `aliases` key sits among the other config options, see the configuration skill.
