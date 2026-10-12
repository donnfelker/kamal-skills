# Workflow Template

A complete `.github/workflows/deploy.yml`. Replace each `<...>` and adjust the marked steps for the stack (see [stacks.md](stacks.md)).

Everything in this file is GitHub Actions configuration (a GitHub convention, not a Kamal feature), except the `kamal deploy` command and the cache actions the [Kamal builder examples](https://kamal-deploy.org/docs/configuration/builder-examples/#gha-cache-configuration) name. Action versions move. Check each action's releases page for its current major before using this template.

```yaml
# .github/workflows/deploy.yml
#
# Deploys <branch> with Kamal once the test workflow passes on it. Secrets live
# in the "production" environment, so test jobs never see them.
name: Deploy

on:
  workflow_run:
    workflows: ["<name: of the test workflow, e.g. CI>"]
    branches: [main]
    types: [completed]

# One deploy at a time. A push that lands mid-deploy waits instead of cancelling it.
concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  deploy:
    name: Deploy with Kamal
    runs-on: ubuntu-latest            # ubuntu-24.04-arm when builder.arch is arm64
    timeout-minutes: 30
    if: ${{ github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.event == 'push' }}
    environment: production

    env:
      # Non-secret values config/deploy.yml reads with ERB. One line per ENV it reads.
      SOME_FLAG: ${{ vars.SOME_FLAG }}
      # Secrets .kamal/secrets reads straight from the environment.
      KAMAL_REGISTRY_PASSWORD: ${{ secrets.KAMAL_REGISTRY_PASSWORD }}

    steps:
      - name: Checkout the commit CI tested
        uses: actions/checkout@v5
        with:
          ref: ${{ github.event.workflow_run.head_sha }}

      # --- Install Kamal: pick ONE (see stacks.md) ---
      # A. Kamal is in the Gemfile (Rails, most Ruby apps): use bin/kamal below.
      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          bundler-cache: true
      # B. No Ruby app: install Ruby only to run Kamal.
      # - uses: ruby/setup-ruby@v1
      #   with:
      #     ruby-version: "3.4"
      # - run: gem install kamal -v <version the user runs locally>

      - name: Set up Docker Buildx for cache
        uses: docker/setup-buildx-action@v3

      # Exposes the Actions cache to Docker, for builder.cache type gha.
      - name: Expose the GitHub Actions runtime
        uses: crazy-max/ghaction-github-runtime@v4

      - name: Load the deploy ssh key
        uses: webfactory/ssh-agent@v0.10.0
        with:
          ssh-private-key: ${{ secrets.KAMAL_SSH_PRIVATE_KEY }}

      - name: Trust the servers' host keys
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.KAMAL_KNOWN_HOSTS }}" >> ~/.ssh/known_hosts

      # Recreate the git-ignored files .kamal/secrets (and any hooks) read.
      # Delete this step if .kamal/secrets only reads environment variables.
      - name: Write the deploy inputs
        env:
          MASTER_KEY: ${{ secrets.RAILS_MASTER_KEY }}
          POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
        run: |
          umask 077
          printf '%s' "$MASTER_KEY" > config/master.key
          printf 'POSTGRES_PASSWORD=%s\n' "$POSTGRES_PASSWORD" > .env

      - name: Deploy
        run: bin/kamal deploy        # "kamal deploy" when installed with gem install
```

## Choices in the template

| Line | Why |
|---|---|
| `workflow_run` + `conclusion == 'success'` | Deploys only after the tests pass. A failing CI run still triggers this workflow, so the `if:` is what blocks the deploy. |
| `event == 'push'` | Pull-request runs of the test workflow also complete; only a push to the branch deploys. |
| `ref: head_sha` | Deploys the tested commit even if `main` has moved since. |
| `cancel-in-progress: false` | Killing a deploy mid-boot can leave the deploy lock held. Waiting is safer. |
| `umask 077` | The written files are readable only by the runner user. |
| `printf '%s'` | No trailing newline added to keys; `echo` adds one. |

## Destinations

For a staging destination (`config/deploy.staging.yml`), copy the job, use a `staging` environment with its own secrets, trigger on the staging branch, and run `kamal deploy -d staging`. Remember that with a destination, Kamal reads `.kamal/secrets-common` and `.kamal/secrets.staging`, not `.kamal/secrets` ([environment variables docs](https://kamal-deploy.org/docs/configuration/environment-variables/#secrets)).

## Manual approval

Add required reviewers to the `production` environment in the repo settings (Settings → Environments). The deploy job then waits for a click in the Actions UI before it gets the secrets.
