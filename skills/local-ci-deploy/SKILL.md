---
name: local-ci-deploy
description: Opt-in local CI for Kamal deploys: tie deploys to a gh-signoff commit status, for teams that run tests on their own machines and mark passing commits with `gh signoff` (basecamp/gh-signoff) instead of cloud CI. Two pieces, used alone or together: a `pre-deploy` hook that refuses to deploy a commit without a green signoff, and a GitHub Actions workflow that deploys when a signoff turns green on the tip of main. Use only when the user asks for it: "only deploy signed-off commits," "require gh signoff to deploy," "block deploys without a signoff," "deploy when I gh signoff," "deploy on signoff," "local CI deploy," "gate kamal deploy on local tests," or "we run tests locally, not in CI." Do not add it to a project by default. For hooks in general, see hooks. For deploying from GitHub Actions after a test workflow, see ci-deploy. For rollbacks, see rollback.
metadata:
  version: 1.0.0
---

# Local CI Deploy

You are an expert in gating Kamal deploys on a [gh-signoff](https://github.com/basecamp/gh-signoff) commit status. gh-signoff is a GitHub CLI extension: a developer runs the tests locally, then `gh signoff` posts a green `signoff` status on the commit. This skill makes Kamal respect that status.

> **Grounding note:** The hook mechanics (the `pre-deploy` hook, `KAMAL_VERSION`, `KAMAL_COMMAND`, `KAMAL_DESTINATION`, non-zero exit aborting the command, `--skip-hooks`) come from the [Kamal docs](https://kamal-deploy.org/docs/hooks/overview/). gh-signoff, GitHub commit statuses, the `gh` CLI, and GitHub Actions are **external conventions, not Kamal features**. Check their docs when in doubt.

## Ground Rules

1. **Opt-in only.** Add this when the user asks for it. Never add it to a project as part of another task, and never suggest it in place of a test workflow the user already relies on.
2. **Fail closed.** No `gh`, no network, no GitHub access, or no green signoff all abort the deploy. A gate that passes when it can't check is no gate.
3. **Never sign off for the user.** This skill reads signoffs. Posting one is the developer's call after their tests pass.
4. **Confirm before changing GitHub.** Replacing a deploy workflow's trigger changes what starts a production deploy. Show the change and get a yes.

## Pick the Pieces

| The user wants... | Use |
|---|---|
| `kamal deploy` (from a laptop or CI) to refuse unsigned commits | [The pre-deploy gate](#the-pre-deploy-gate) |
| A green signoff on `main` to start a deploy in GitHub Actions | [Deploy on signoff](#deploy-on-signoff), plus the gate as a second check |

## Before You Start

- **`.kamal/hooks/`**: is there already a `pre-deploy` hook? If so, add the signoff check to it instead of replacing it.
- **`config/deploy.yml`**: a `hooks_path` setting moves the hooks folder.
- **How the team signs off**: plain `gh signoff` posts `signoff`. `gh signoff tests lint` posts `signoff/tests` and `signoff/lint` only. Ask which contexts must be green, or read them with `gh signoff contexts` if the repo requires signoff to merge.
- **`gh` on every deploy machine**: `gh auth status` must pass wherever `kamal deploy` runs. The gh-signoff extension itself is only needed by whoever signs off.
- **Git remotes**: `gh api` picks the repo from the remotes. With a fork setup (both `origin` and `upstream`), run `gh repo set-default <owner>/<repo>` or set `GH_REPO`, or the hook reads the wrong repo (gh behavior).

## The pre-deploy Gate

The Kamal docs name `pre-deploy` as the place for "checking CI completed." Create `.kamal/hooks/pre-deploy` (no extension) and make it executable with `chmod +x .kamal/hooks/pre-deploy`:

```bash
#!/usr/bin/env bash
# .kamal/hooks/pre-deploy: refuse to deploy a commit without a green gh-signoff status.
set -euo pipefail

# Contexts that must be green. Plain `gh signoff` posts "signoff";
# `gh signoff tests` posts "signoff/tests". A team that only signs off
# partial contexts lists just those: required=("signoff/tests" "signoff/lint")
required=("signoff")

# A rollback returns to a version that already ran in production. Let it through.
if [[ "${KAMAL_COMMAND:-}" == "rollback" ]]; then
  echo "Rollback: skipping the signoff check."
  exit 0
fi

command -v gh >/dev/null || {
  echo "The GitHub CLI (gh) is not installed. Refusing to deploy." >&2
  exit 1
}

sha=$(git rev-parse --verify --quiet "${KAMAL_VERSION}^{commit}") || {
  echo "Version ${KAMAL_VERSION} is not a plain commit SHA (custom --version or uncommitted changes?). Refusing to deploy." >&2
  exit 1
}

states=$(gh api "repos/{owner}/{repo}/commits/${sha}/status?per_page=100" \
  --jq '.statuses[] | "\(.context | ascii_downcase)=\(.state)"') || {
  echo "Could not read commit statuses for ${sha} from GitHub. Refusing to deploy." >&2
  exit 1
}

for context in "${required[@]}"; do
  context=$(printf '%s' "$context" | tr '[:upper:]' '[:lower:]')
  if ! grep -qxF "${context}=success" <<<"$states"; then
    echo "${context} is not green on ${sha}. Run the tests, then 'gh signoff'." >&2
    exit 1
  fi
done

echo "Signoff verified on ${sha}."
```

### How it works

- **The commit.** `KAMAL_VERSION` is the full version being deployed. The script resolves it with `git rev-parse` and refuses anything that is not a commit in the repo, rather than guessing.
- **The check.** It reads the commit's combined status from GitHub and requires each listed context to be `success`. Matching is case-insensitive and literal, like gh-signoff's own.
- **Rollbacks pass.** Kamal's source runs `pre-deploy` during `kamal rollback` too (the docs don't say either way), and the hook gets `KAMAL_COMMAND=rollback`. Blocking a rollback mid-incident because an old version predates the gate helps no one. Delete that block if the user wants rollbacks gated as well.
- **Fails closed.** A non-zero exit is what stops Kamal.

### Options

- **Gate only production.** To leave a staging destination ungated, add after the rollback block:

  ```bash
  [[ "${KAMAL_DESTINATION:-}" == "staging" ]] && exit 0
  ```

- **Skip once.** `kamal deploy --skip-hooks` (`-H`) runs without any hooks, this gate included. Use it for a true emergency, and say so in the deploy notes.
- **Stick with `pre-deploy`.** The docs also list "CI has passed" as a `pre-build` use, but `kamal deploy --skip-push` (`-P`) skips the build, so a `pre-build` gate can be bypassed by accident.

### Running the gate in GitHub Actions

GitHub's hosted runners have `gh` installed but not logged in (GitHub behavior). In the deploy job, set:

```yaml
permissions:
  contents: read
  statuses: read
# and on the deploy job:
env:
  GH_TOKEN: ${{ github.token }}
```

Without the token, the hook can't read statuses and aborts the deploy.

## Deploy on Signoff

When a team signs off on `main` locally instead of running a test workflow, a green signoff can start the GitHub Actions deploy. This needs the **ci-deploy** setup first (deploy key, `production` environment, secrets, build cache). Then follow [references/deploy-on-signoff.md](references/deploy-on-signoff.md): it swaps the `workflow_run` trigger for `on: status`, adds a gate job that deploys only the tip of `main` once every required context is green, and keeps the deploy steps.

Before the user picks this, tell them:

- **Merges make new commits.** Merge commits, squash merges, and GitHub's "Rebase and merge" all land a new SHA on `main` with no signoff. Someone has to pull `main`, run the tests, and sign off before it deploys.
- **`gh signoff` on `main` becomes the deploy button**, for anyone with write access.

## Verify

1. Deploy an unsigned commit and watch the gate refuse it:

   ```bash
   kamal deploy        # expect: "signoff is not green on <sha>" and an aborted deploy
   ```

2. Run the tests, `gh signoff`, then deploy again. Expect "Signoff verified on <sha>."
3. For the workflow, sign off on the tip of `main` and watch the run: `gh run list -w Deploy -L 1`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "is not a plain commit SHA" | A custom `--version`, or the working tree had uncommitted changes | Commit or stash, then deploy. Or deploy with `--skip-hooks` if the version is intentional. |
| "Could not read commit statuses" | `gh` not logged in, no network, or the wrong repo | `gh auth status`; `gh repo set-default`; in Actions, set `GH_TOKEN` and `statuses: read`. |
| "signoff is not green" right after `gh signoff` | The signoff went on a different commit, or the team signs off partial contexts only | `gh signoff status`; match `required` to the contexts the team posts. |
| Deploy workflow never starts | The workflow file is not on the default branch, or the status was not a signoff | Merge the workflow to `main`; check the run list for skipped gate jobs. |
| Gate says "not the tip of main" | Someone signed off an older commit, or `main` moved | Sign off on the current tip of `main`. |

## Related Skills

- **hooks**: how hooks work, every hook name, and the `KAMAL_*` variables.
- **ci-deploy**: the GitHub Actions deploy this skill's workflow builds on.
- **deploy**: `kamal deploy` and its flags, including `--skip-hooks`.
- **rollback**: rolling back, which this gate lets through by default.
