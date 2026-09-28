# Keeping Skills in Sync with the Kamal Docs

Every skill is grounded in the official Kamal docs at [kamal-deploy.org](https://kamal-deploy.org). That site is built from [basecamp/kamal-site](https://github.com/basecamp/kamal-site), so a commit in that repo is an exact, diffable version of the docs. This file explains how the repo tracks it and how to update the skills when it changes.

## How tracking works

| Piece | What it does |
|-------|--------------|
| `kamal-docs.json` | Maps each skill to the doc pages it depends on (`docs`), and records the kamal-site commit and Kamal version it was last verified against (`verified`). Pages listed in `ignore` are index pages no skill needs. |
| `.github/scripts/check-kamal-docs.js` | Compares each skill's verified commit to the current docs and reports changed pages per skill, new or removed pages, links a skill cites but does not track, and new Kamal versions. |
| `.github/workflows/check-kamal-docs.yml` | Runs the check every Monday (and on demand). Opens or updates an issue labeled `kamal-docs-drift` with the report, and closes it once everything is synced. |
| `VERSIONS.md` | The **Kamal Docs** column shows which Kamal version and docs commit each skill was verified against. `--mark-synced` rewrites it. |

The Kamal version comes from the site's own `_data/github.yml`, so it reflects what the docs describe, which can lag a gem release by a few days. The report notes when that happens.

## Cadence

1. **Weekly, automatic:** the workflow runs Mondays at 13:00 UTC. Watch for `kamal-docs-drift` issues.
2. **On a Kamal release:** run the check by hand (Actions > Check Kamal Docs > Run workflow, or locally) once the site publishes its docs update.
3. **Before a skills release:** run the check so you never ship against stale docs.

## Run the check locally

```bash
GITHUB_TOKEN=$(gh auth token) node .github/scripts/check-kamal-docs.js
```

Exit code `0` means in sync, `2` means drift, `1` means an error. The token is optional but avoids GitHub API rate limits. Add `--output report.md` to save the report.

## Update the affected skills

Work on a branch named `fix/sync-kamal-docs-<version>` (for example `fix/sync-kamal-docs-2.13.0`).

1. **Read the report.** For each skill under "Skills to review", open the diff for each changed page. Read the full compare link when a diff is omitted for length.
2. **Update the skill.** Edit `SKILL.md`, `references/`, and `evals/` so every Kamal fact matches the new docs. Add new documented commands, flags, keys, and defaults. Remove or correct anything the docs changed or dropped. Do not add anything the docs do not state (see Grounding in [AGENTS.md](AGENTS.md)).
3. **A page changed but the skill needs no edit?** That is fine. Mark it synced anyway so the report stays clean.
4. **Handle structural changes.**
   - *Doc pages no skill tracks:* add the page to the right skill's `docs` list in `kamal-docs.json`, write the coverage, or add it to `ignore`.
   - *Tracked pages that no longer exist:* find where the content moved, then fix `kamal-docs.json` and every link in the skills.
   - *Manifest gaps:* add the cited page to that skill's `docs` list.
5. **Bump versions** for each skill you edited, in both `metadata.version` in `SKILL.md` and `VERSIONS.md` (version and Last Updated), and add a Recent Changes entry.
   - Patch (`1.0.1`): corrections and wording.
   - Minor (`1.1.0`): new documented commands, flags, keys, or behaviors.
   - Major (`2.0.0`): a Kamal change that breaks what the skill told users to do.
6. **Mark synced** only the skills you verified:
   ```bash
   GITHUB_TOKEN=$(gh auth token) node .github/scripts/check-kamal-docs.js --mark-synced --skills deploy,proxy
   ```
   Omit `--skills` to mark every skill. This updates `kamal-docs.json` and the Kamal Docs column in `VERSIONS.md`.
7. **Verify:** run `./validate-skills.sh` and the check again. It should exit `0` (or list only skills you have not finished).
8. **Open a PR** with `Closes #<drift issue>`, commit message `fix: sync skills with Kamal <version> docs`.

## Prompt for an AI agent

Paste this into your agent from the repo root to run the whole update:

```text
Run `GITHUB_TOKEN=$(gh auth token) node .github/scripts/check-kamal-docs.js` and follow DOCS-SYNC.md
to update every affected skill. Ground each change in the kamal-site diff, never in memory.
Show me the proposed skill edits and version bumps before running --mark-synced.
```
