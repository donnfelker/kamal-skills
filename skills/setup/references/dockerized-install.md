# Running Kamal via Docker

If you do not have a Ruby environment, you can run Kamal from a Docker container
using a shell alias. This avoids installing Ruby, but it has limitations (see
below).

## Aliases

### macOS

```sh
alias kamal='docker run -it --rm -v "${PWD}:/workdir" -v "/run/host-services/ssh-auth.sock:/run/host-services/ssh-auth.sock" -e SSH_AUTH_SOCK="/run/host-services/ssh-auth.sock" -v /var/run/docker.sock:/var/run/docker.sock ghcr.io/basecamp/kamal:latest'
```

### Linux

```sh
alias kamal='docker run -it --rm -v "${PWD}:/workdir" -v "${SSH_AUTH_SOCK}:/ssh-agent" -v /var/run/docker.sock:/var/run/docker.sock -e "SSH_AUTH_SOCK=/ssh-agent" ghcr.io/basecamp/kamal:latest'
```

## Limitations

When using the Docker alias, Kamal commands run inside the container and not
directly on your host, so there are limitations. To avoid them, install Kamal
with Ruby (`gem install kamal`).

### Agent forwarding only

The alias forwards the SSH agent into the container and avoids injecting your
private keys. If you need the full SSH config in the container you can add
`-v "$HOME/.ssh:/root/.ssh"`, but note that this exposes your private keys into
the container.

### Secrets

You won't be able to use the Kamal secret adapters, as the secret manager
command-line tools will not be available in the container.

### Environment variables

Environment variables from your host will not be available, unless you alter the
command to inject them by adding something like
`-e KAMAL_REGISTRY_PASSWORD=$KAMAL_REGISTRY_PASSWORD`.

---

Source: [Running Kamal via Docker](https://kamal-deploy.org/docs/installation/dockerized/)
