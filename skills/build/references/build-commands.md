# kamal build Commands Reference

`kamal build` builds your app images and pushes them to your servers. These commands are called indirectly by `kamal deploy` and `kamal redeploy`.

By default, Kamal only builds files you have committed to your Git repository. You can configure Kamal to use the current context (instead of a Git archive of `HEAD`) by setting the [build context](https://kamal-deploy.org/docs/configuration/builders/#build-context).

## Subcommands

```bash
$ kamal build
Commands:
  kamal build create          # Create a build setup
  kamal build deliver         # Build app and push app image to registry then pull image on servers
  kamal build details         # Show build setup
  kamal build dev             # Build using the working directory, tag it as dirty, and push to local image store.
  kamal build help [COMMAND]  # Describe subcommands or one specific subcommand
  kamal build pull            # Pull app image from registry onto servers
  kamal build push            # Build and push app image to registry
  kamal build remove          # Remove build setup
```

| Command | Description |
|---------|-------------|
| `kamal build create` | Create a build setup. |
| `kamal build deliver` | Build the app and push the app image to the registry, then pull the image on the servers. |
| `kamal build details` | Show the build setup. |
| `kamal build dev` | Build using the working directory, tag it as `dirty`, and push to the local image store. |
| `kamal build help [COMMAND]` | Describe subcommands or one specific subcommand. |
| `kamal build pull` | Pull the app image from the registry onto the servers. |
| `kamal build push` | Build and push the app image to the registry. |
| `kamal build remove` | Remove the build setup. |

## The --output option

The `build dev` and `build push` commands support an `--output` option, which specifies where the image should be pushed:

- `build push` defaults to `registry`.
- `build dev` defaults to `docker`, which is the local image store.

Any exported type supported by the `docker buildx build` [`--output`](https://docs.docker.com/reference/cli/docker/buildx/build/#output) option is allowed.

## Example: kamal build push

A `kamal build push` run executes the pre-connect and pre-build hooks, acquires the deploy lock, builds, pushes, and releases the lock. The core build-and-push step is the equivalent of:

```bash
git archive --format=tar HEAD \
  | docker build \
      -t registry:4443/app:75bf6fa40b975cbd8aec05abf7164e0982f185ac \
      -t registry:4443/app:latest \
      --label service="app" \
      --build-arg [REDACTED] \
      --file Dockerfile - \
  && docker push registry:4443/app:75bf6fa40b975cbd8aec05abf7164e0982f185ac \
  && docker push registry:4443/app:latest
```

Key things to notice:

- The build context comes from `git archive --format=tar HEAD` — only committed files.
- The image is tagged twice: with the Git version hash and with `latest`.
- It is labeled with the service name (`--label service="app"`).
- Build args are passed through but redacted in the log output (`--build-arg [REDACTED]`).
- Both tags are pushed to the registry after a successful build.

## Source

- [kamal build](https://kamal-deploy.org/docs/commands/build/)
