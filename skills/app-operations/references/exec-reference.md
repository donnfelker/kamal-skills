# `kamal app exec` Reference

`kamal app exec [CMD...]` executes a custom command on servers within the app container. Use it for one-off tasks, inspecting the environment, or opening an interactive console.

You can use [aliases](https://kamal-deploy.org/docs/configuration/aliases/) for common commands.

## Run a command on all servers

```bash
$ kamal app exec 'ruby -v'
App Host: 192.168.0.1
ruby 3.1.3p185 (2022-11-24 revision 1a6b16756e) [x86_64-linux]

App Host: 192.168.0.2
ruby 3.1.3p185 (2022-11-24 revision 1a6b16756e) [x86_64-linux]
```

## Run a command on the primary server

```bash
$ kamal app exec --primary 'cat .ruby-version'
App Host: 192.168.0.1
3.1.3
```

## Run a Rails command on all servers

```bash
kamal app exec 'bin/rails about'
```

Runs `bin/rails about` inside the app container on every server and prints each host's output.

## Run a Rails runner on the primary server

`-p` is the short form of `--primary`:

```bash
$ kamal app exec -p 'bin/rails runner "puts Rails.application.config.time_zone"'
UTC
```

## Run interactive commands over SSH

You can run interactive commands, like a Rails console or a bash session, on a server. The default is the primary; use `--hosts` to connect to another.

Start a bash session in a **new** container made from the most recent app image:

```bash
kamal app exec -i bash
```

Start a bash session in the **currently running** container for the app:

```bash
kamal app exec -i --reuse bash
```

Start a Rails console in a new container made from the most recent app image:

```bash
kamal app exec -i 'bin/rails console'
```

`-i` / `--interactive` runs the command interactively over SSH. `--reuse` runs in the currently running container instead of starting a fresh one from the latest image.

## Get unmodified output with `--raw`

By default `exec` runs the command's output through SSHKit's capture, which strips leading and trailing whitespace — including trailing newlines and NUL bytes. That corrupts binary output such as a `tar` stream. Pass `--raw` to emit stdout exactly as produced. It also lowers the logging level so only the command's output is written.

```bash
kamal app exec --raw 'tar c -C /rails/storage .' > storage.tar
```

`--raw` can't be combined with `--interactive` or `--detach`.

## Option summary

| Option | Short | What it does |
|--------|-------|--------------|
| `--primary` | `-p` | Run on the primary server only. |
| `--interactive` | `-i` | Run the command interactively over SSH (e.g. a console or bash). |
| `--reuse` | | Run in the currently running container instead of a new one from the latest image. |
| `--hosts` | | Choose which host(s) to connect to for an interactive command (default is the primary). |
| `--raw` | | Emit stdout exactly as produced; lowers the logging level. Cannot combine with `--interactive` or `--detach`. |
| `--detach` | | Run detached. Cannot combine with `--raw`. |

## Source

- Official docs: <https://kamal-deploy.org/docs/commands/running-commands-on-servers/>
