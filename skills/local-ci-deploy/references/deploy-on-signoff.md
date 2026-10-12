# Deploy on a Signoff

Start a GitHub Actions deploy when a gh-signoff status turns green on the tip of `main`, instead of after a test workflow. This builds on the **ci-deploy** skill: set that up first (deploy key, `production` environment, secrets, build cache), then swap its trigger for the one on this page.

Everything here is GitHub Actions and gh-signoff configuration (**external conventions, not Kamal features**), except the `kamal deploy` step, which stays exactly as **ci-deploy** writes it. See GitHub's docs on the [`status` event](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#status) when in doubt.

## How It Works

1. A developer pushes to `main`, runs the tests locally, and runs `gh signoff`.
2. gh-signoff posts a `signoff` commit status with state `success`.
3. GitHub fires a `status` event, which starts this workflow.
4. The gate job deploys only when the signed-off commit is the current tip of `main` and every required context is green.
5. The deploy job checks out that commit and runs `kamal deploy`, the same as **ci-deploy**.

## The Workflow

Take the deploy workflow from **ci-deploy** and change four things: the trigger, a `permissions` block, a new `gate` job, and the deploy job's `needs`, `if`, `concurrency`, and checkout ref.

```yaml
# .github/workflows/deploy.yml
#
# Deploys main with Kamal when a gh-signoff status turns green on its tip.
name: Deploy

on:
  status:

permissions:
  contents: read
  statuses: read

jobs:
  gate:
    name: Check the signoff
    runs-on: ubuntu-latest
    if: ${{ github.event.state == 'success' && startsWith(github.event.context, 'signoff') }}
    outputs:
      go: ${{ steps.check.outputs.go }}
    env:
      GH_TOKEN: ${{ github.token }}
      SHA: ${{ github.event.sha }}
      REPO: ${{ github.repository }}
      # Every context that must be green, one per line.
      REQUIRED: |
        signoff
    steps:
      - id: check
        run: |
          tip=$(gh api "repos/$REPO/commits/main" --jq .sha)
          if [ "$tip" != "$SHA" ]; then
            echo "$SHA is not the tip of main ($tip). Not deploying."
            echo "go=false" >> "$GITHUB_OUTPUT"; exit 0
          fi
          states=$(gh api "repos/$REPO/commits/$SHA/status?per_page=100" \
            --jq '.statuses[] | "\(.context | ascii_downcase)=\(.state)"')
          while IFS= read -r context; do
            [ -z "$context" ] && continue
            context=$(printf '%s' "$context" | tr '[:upper:]' '[:lower:]')
            if ! grep -qxF "$context=success" <<<"$states"; then
              echo "$context is not green on $SHA yet. Not deploying."
              echo "go=false" >> "$GITHUB_OUTPUT"; exit 0
            fi
          done <<<"$REQUIRED"
          echo "go=true" >> "$GITHUB_OUTPUT"

  deploy:
    name: Deploy with Kamal
    needs: gate
    if: ${{ needs.gate.outputs.go == 'true' }}
    runs-on: ubuntu-latest            # ubuntu-24.04-arm when builder.arch is arm64
    timeout-minutes: 30
    environment: production

    # On the job, not the workflow: every status from every tool starts a run,
    # and a workflow-level group would let those runs cancel a pending deploy.
    concurrency:
      group: deploy-production
      cancel-in-progress: false

    env:
      # Lets the pre-deploy signoff hook call gh on the runner.
      GH_TOKEN: ${{ github.token }}
      # ...the same env entries as the ci-deploy workflow...

    steps:
      - name: Checkout the signed-off commit
        uses: actions/checkout@v7
        with:
          ref: ${{ github.event.sha }}

      # ...every remaining step from the ci-deploy workflow, unchanged,
      # ending with: bin/kamal deploy
```

## Choices in the Workflow

| Line | Why |
|---|---|
| `on: status` | Fires on every commit status from any tool (GitHub behavior). GitHub runs it only from the workflow file on the default branch. |
| `startsWith(context, 'signoff')` | Skips statuses from other tools cheaply. The gate still checks every required context. |
| Tip-of-`main` check | Signing off an older commit never rolls production back. It also replaces the event's `branches` list, which GitHub caps at 10 entries. |
| `go=false` exits 0 | A skipped deploy is not a failure. The next signoff on the tip starts a new run. |
| Lowercase + `grep -qxF` | gh-signoff and GitHub treat contexts as case-insensitive. `-F` matches the name literally, and one per line allows spaces (`signoff/qa review`). |
| `?per_page=100` | The combined status endpoint returns 30 statuses per page by default. |
| Job-level `concurrency` | Only runs that passed the gate queue for the deploy. A push mid-deploy waits instead of cancelling it. |
| `statuses: read` | The gate and the signoff hook read commit statuses with the job's token. `actions/checkout` needs `contents: read`. |
| `ref: github.event.sha` | Deploys exactly the commit that was signed off. |

## Things to Tell the User

- **Merges make new commits.** A signoff belongs to one SHA. Merge commits, squash merges, and GitHub's "Rebase and merge" all put a new commit on `main` with no signoff. Nothing deploys until someone pulls `main`, runs the tests, and signs off on it. Only a direct push or fast-forward keeps the signed SHA.
- **A signoff is the deploy button.** `gh signoff` on the tip of `main` deploys production. Put that in the deploy docs and `AGENTS.md`.
- **Who can deploy.** Anyone who can post a commit status (write access to the repo) can start a deploy by signing off.
- **Partial signoffs can deploy twice.** `gh signoff tests lint` posts one status per context, and each starts a run. If two gates both see every context green, the same commit deploys twice in a row. The job-level concurrency runs them one after the other, and the second deploy of the same version is harmless.
- **Re-running.** To redeploy the same commit, re-run the deploy job from the Actions tab.
