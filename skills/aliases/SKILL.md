---
name: aliases
description: Define custom command aliases under the top-level `aliases` key in `config/deploy.yml` so a long, repeated `kamal` invocation becomes a single `kamal <name>`. Use it when the user says "add a Kamal alias," "shortcut kamal app exec," "make `kamal console` open a Rails console," "create a one-liner to deploy staging," "I keep retyping the same kamal command," or asks about the `aliases` config key, alias naming rules, or a `deploy -d staging` shortcut. Covers how an alias expands into a `kamal` subcommand, the lowercase letters/numbers/dashes/underscores naming rule, and the documented examples `console: app exec -i --reuse "bin/rails console"`, `uname: app exec -p -q -r web "uname -a"`, and `staging_deploy: deploy -d staging`. For the rest of `config/deploy.yml` and DRYing it up with YAML anchors, see configuration. For the underlying app exec / console / logs commands the aliases wrap, see app-operations.
metadata:
  version: 1.0.0
---

# Kamal Aliases

You are an expert in deploying applications with Kamal. Your goal is to turn the long, repetitive `kamal` commands a user keeps typing into short, memorable shortcuts.

Aliases are shortcuts for Kamal commands. You define them once under the top-level `aliases` key in `config/deploy.yml`, and from then on `kamal <name>` runs the full command for you.

## Before You Start

Look at what the user already runs before inventing shortcuts:

- Read `config/deploy.yml`. Check whether an `aliases:` block already exists so you extend it instead of duplicating it.
- Ask which `kamal` commands they retype most — a long `app exec` for a console, a per-destination `deploy`, a one-off shell command across a role. Those are the best alias candidates.
- Note any destinations in play (`config/deploy.staging.yml`, etc.). A destination-specific alias like `staging_deploy` is a common win.

## How Aliases Work

An alias maps a **name** to everything you would type *after* `kamal`. Define it under the root `aliases` key:

```yaml
aliases:
  console: app exec -i --reuse "bin/rails console"
```

Now this:

```shell
kamal console
```

runs the command the alias expands to:

```shell
kamal app exec -i --reuse "bin/rails console"
```

| Concept | Detail |
|---------|--------|
| Config key | `aliases`, at the root of `config/deploy.yml` |
| Alias value | The command text that follows `kamal` (drop the leading `kamal`) |
| Invocation | `kamal <name>` |
| Name characters | Lowercase letters, numbers, dashes (`-`), and underscores (`_`) only |

## Step-by-Step Walk-Through

### Step 1: Find the command worth shortcutting

Start from a real command the user runs often, for example opening a Rails console:

```shell
kamal app exec -i --reuse "bin/rails console"
```

### Step 2: Add it under the `aliases` key

Copy the command into `config/deploy.yml`, dropping the leading `kamal`:

```yaml
aliases:
  console: app exec -i --reuse "bin/rails console"
```

### Step 3: Name it within the rules

Each alias is named and can only contain lowercase letters, numbers, dashes, and underscores. Underscores are allowed here, so `staging_deploy` and `db_console` are valid names.

### Step 4: Run it

```shell
kamal console
```

### Step 5 (optional): Target a destination

An alias can include a destination with the `-d` flag, which is handy for per-environment shortcuts:

```yaml
aliases:
  staging_deploy: deploy -d staging
```

```shell
kamal staging_deploy
```

## Flags You'll Use in Alias Values

These are the flags that appear in the documented alias examples. Use them inside an alias value exactly as you would on the command line.

| Flag | Meaning |
|------|---------|
| `-i`, `--interactive` | Run an interactive command, e.g. a Rails console or `bash` session |
| `--reuse` | Run inside the currently running app container instead of a fresh one |
| `-p`, `--primary` | Run only on the primary host |
| `-q`, `--quiet` | Minimal logging |
| `-r`, `--roles` | Run only on the given roles (e.g. `-r web`) |
| `-d`, `--destination` | Use a destination's config (e.g. `deploy -d staging` reads `deploy.staging.yml`) |

## Documented Examples

```yaml
aliases:
  # Open a Rails console in the currently running container
  console: app exec -i --reuse "bin/rails console"

  # Print kernel info from the web role's primary host, quietly
  uname: app exec -p -q -r web "uname -a"

  # Deploy to the staging destination
  staging_deploy: deploy -d staging
```

Each value is just a documented `kamal` command with its leading `kamal` removed. Compose your own the same way — for a fuller catalog of practical aliases and the naming rules in detail, see [references/alias-cookbook.md](references/alias-cookbook.md).

For the official documentation, see [Aliases](https://kamal-deploy.org/docs/configuration/aliases/).

## Related Skills

- **configuration**: For the rest of `config/deploy.yml` — required keys, destinations, and DRYing up the file with YAML anchors.
- **app-operations**: For the underlying commands aliases wrap — `kamal app exec`, opening a console, and running commands on servers.
