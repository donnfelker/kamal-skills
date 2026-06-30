# Accessory configuration keys

Full reference for the keys you can set under an accessory. Every key nests under the top-level `accessories:` key, then under the accessory's name:

```yaml
accessories:
  mysql:
    # keys go here
```

## Key summary

| Key | Purpose | Default |
|-----|---------|---------|
| `service` | Name used in the service label | `<service>-<accessory>` |
| `image` | Docker image to run | — |
| `registry` | Per-accessory registry | Docker Hub |
| `host` / `hosts` / `role` / `roles` / `tag` / `tags` | Where the accessory runs (set one) | — |
| `cmd` | Custom command instead of the image default | image default |
| `port` | Port mapping | — |
| `labels` | Extra Docker labels | — |
| `options` | Extra `docker run` options | — |
| `env` | Environment variables | — |
| `files` | Files to upload and mount | — |
| `directories` | Host directories to create and mount | — |
| `volumes` | Additional volume mounts | — |
| `network` | Network to attach to | `kamal` |
| `proxy` | Run behind the Kamal proxy | — |

## service

Used in the service label. Defaults to `<service>-<accessory>`, where `<service>` is the main service name from the root configuration.

```yaml
    service: mysql
```

## image

The Docker image to use. Prefix it with its server when using a root-level registry different from Docker Hub. Define the registry directly or via anchors when it differs from the root-level registry.

```yaml
    image: mysql:8.0
```

## registry

By default accessories use the Docker Hub registry. You can specify a different registry per accessory with this option. Don't prefix the image with this registry server. Use anchors if you need to set the same specific registry for several accessories.

```yaml
    registry:
      <<: *specific-registry
```

```yaml
    registry:
      ...
```

See the official [Docker Registry](https://kamal-deploy.org/docs/configuration/docker-registry/) docs for the full registry configuration.

## Accessory hosts

Specify one of `host`, `hosts`, `role`, `roles`, `tag`, or `tags`. The hosts do not need to be defined in the Kamal `servers` configuration.

```yaml
    host: mysql-db1
    hosts:
      - mysql-db1
      - mysql-db2
    role: mysql
    roles:
      - mysql
    tag: writer
    tags:
      - writer
      - reader
```

## cmd

A custom command to run in the container if you do not want to use the image default.

```yaml
    cmd: "bin/mysqld"
```

## port

Port mapping. Review the [Docker networking](https://docs.docker.com/network/) docs and especially the warning about the security implications of exposing ports publicly.

```yaml
    port: "127.0.0.1:3306:3306"
```

## labels

```yaml
    labels:
      app: myapp
```

## options

Passed to the Docker run command in the form `--<name> <value>`:

```yaml
    options:
      restart: always
      cpus: 2
```

## env

Environment variables. See the official [Environment variables](https://kamal-deploy.org/docs/configuration/environment-variables/) docs (and the `environment-variables` and `secrets` skills) for `clear` vs. `secret`, aliasing, and tags.

```yaml
    env:
      ...
```

## files

Files to mount into the container. They are uploaded from the local repo to the host and then mounted. **ERB files are evaluated before being copied.**

String format — `local:remote` or `local:remote:options`, where `options` can be `ro` (read-only) or `z`/`Z` (SELinux labels):

```yaml
    files:
      - config/my.cnf.erb:/etc/mysql/my.cnf
      - config/myoptions.cnf:/etc/mysql/myoptions.cnf:ro
      - config/certs:/etc/mysql/certs:ro,Z
```

Hash format for custom mode and ownership. **Setting `owner` requires root access:**

```yaml
    files:
      - local: config/secret.key
        remote: /etc/mysql/secret.key
        mode: "0600"
        owner: "mysql:mysql"
      - local: config/ca-cert.pem
        remote: /etc/mysql/certs/ca-cert.pem
        mode: "0644"
        owner: "1000:1000"
        options: "Z"
```

## directories

Directories to mount into the container. They are created on the host before being mounted.

String format — `local:remote` or `local:remote:options`, where `options` can be `ro` (read-only) or `z`/`Z` (SELinux labels):

```yaml
    directories:
      - mysql-logs:/var/log/mysql
      - mysql-data:/var/lib/mysql:z
```

Hash format for custom mode and ownership. **Setting `owner` requires root access:**

```yaml
    directories:
      - local: mysql-data
        remote: /var/lib/mysql
        mode: "0750"
        owner: "mysql:mysql"
      - local: mysql-logs
        remote: /var/log/mysql
        mode: "0755"
        options: "z"
```

## volumes

Any other volumes to mount, in addition to the files and directories. They are **not** created or copied before mounting:

```yaml
    volumes:
      - /path/to/mysql-logs:/var/log/mysql
```

## network

The network the accessory will be attached to. Defaults to `kamal`:

```yaml
    network: custom
```

## proxy

Run the accessory behind the Kamal proxy. See the official [Proxy](https://kamal-deploy.org/docs/configuration/proxy/) docs for details.

```yaml
    proxy:
      ...
```

---

Source: [Accessories configuration](https://kamal-deploy.org/docs/configuration/accessories/).
