#!/usr/bin/env node
/**
 * Check the skills against the official Kamal documentation.
 *
 * kamal-docs.json maps each skill to the kamal-site doc pages it depends on,
 * plus the kamal-site commit the skill was last verified against. This script
 * compares each skill's verified commit to the current docs and reports which
 * pages changed, which skills they affect, and any new or removed pages.
 *
 * Usage:
 *   node .github/scripts/check-kamal-docs.js                  # check, print report
 *   node .github/scripts/check-kamal-docs.js --output r.md    # also write report to a file
 *   node .github/scripts/check-kamal-docs.js --mark-synced    # mark every skill verified against current docs
 *   node .github/scripts/check-kamal-docs.js --mark-synced --skills deploy,proxy
 *
 * Exit codes: 0 in sync, 2 drift found, 1 error.
 * Set GITHUB_TOKEN (or GH_TOKEN) to avoid GitHub API rate limits.
 */

const fs = require("fs");

const MANIFEST_FILE = "kamal-docs.json";
const VERSIONS_FILE = "VERSIONS.md";
const SKILLS_DIR = "skills";
const PATCH_BUDGET = 40000; // keep reports under GitHub's 65536-char issue body limit

function parseArgs(argv) {
  const args = { output: null, markSynced: false, skills: null };
  const value = (i, flag) => {
    if (!argv[i] || argv[i].startsWith("--")) throw new Error(`${flag} needs a value`);
    return argv[i];
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--output") args.output = value(++i, arg);
    else if (arg === "--mark-synced") args.markSynced = true;
    else if (arg === "--skills") args.skills = value(++i, arg).split(",").map((s) => s.trim());
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

async function github(path) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "kamal-skills-docs-check" };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub API ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"));
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + "\n");
}

async function currentDocs(source) {
  const commit = await github(`/repos/${source.repo}/commits/${source.branch}`);
  const tree = await github(`/repos/${source.repo}/git/trees/${commit.sha}?recursive=1`);
  const pages = tree.tree
    .filter((node) => node.type === "blob" && node.path.startsWith("docs/") && node.path.endsWith(".md"))
    .map((node) => node.path);

  // The site records the Kamal version its docs describe in _data/github.yml.
  let version = null;
  try {
    const file = await github(`/repos/${source.repo}/contents/_data/github.yml?ref=${commit.sha}`);
    const yml = Buffer.from(file.content, "base64").toString("utf8");
    version = (yml.match(/^tag_name:\s*"?v?([^"\s]+)"?/m) || [])[1] || null;
  } catch (e) {
    console.error(`Warning: could not read the docs' Kamal version: ${e.message}`);
  }

  let release = null;
  try {
    const latest = await github(`/repos/${source.release_repo}/releases/latest`);
    release = { version: latest.tag_name.replace(/^v/, ""), date: latest.published_at.slice(0, 10) };
  } catch (e) {
    console.error(`Warning: could not read latest Kamal release: ${e.message}`);
  }

  return { sha: commit.sha, date: commit.commit.committer.date.slice(0, 10), pages, version, release };
}

/**
 * Collect every kamal-deploy.org/docs link in a skill so we can warn when a skill
 * cites a page its manifest entry does not track.
 */
function citedPages(skill) {
  const cited = new Set();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(full);
      else if (/\.(md|json)$/.test(entry.name)) {
        const text = fs.readFileSync(full, "utf8");
        for (const m of text.matchAll(/kamal-deploy\.org\/docs\/([a-z0-9/-]+?)\/?(?=[#)\s"'`>]|$)/g)) {
          cited.add(`docs/${m[1]}.md`);
        }
      }
    }
  };
  if (fs.existsSync(`${SKILLS_DIR}/${skill}`)) walk(`${SKILLS_DIR}/${skill}`);
  return [...cited];
}

async function check(manifest, docs) {
  const skills = manifest.skills;
  const shas = [...new Set(Object.values(skills).map((s) => s.verified.sha))];

  // One compare per distinct verified commit: which docs files changed since then.
  const changesBySha = {};
  for (const sha of shas) {
    if (sha === docs.sha) {
      changesBySha[sha] = { files: [], commits: [] };
      continue;
    }
    const cmp = await github(`/repos/${manifest.source.repo}/compare/${sha}...${docs.sha}`);
    changesBySha[sha] = {
      files: (cmp.files || []).filter(
        (f) => f.filename.startsWith("docs/") || (f.previous_filename || "").startsWith("docs/")
      ),
      commits: (cmp.commits || []).map((c) => ({
        sha: c.sha.slice(0, 7),
        date: c.commit.committer.date.slice(0, 10),
        message: c.commit.message.split("\n")[0],
      })),
    };
  }

  const affected = {}; // skill -> [file]
  const changedFiles = {}; // filename -> file (deduped across compares)
  for (const [skill, entry] of Object.entries(skills)) {
    for (const file of changesBySha[entry.verified.sha].files) {
      const touched = entry.docs.includes(file.filename) || entry.docs.includes(file.previous_filename);
      if (!touched) continue;
      (affected[skill] ||= []).push(file);
      changedFiles[file.filename] = file;
    }
  }

  const tracked = new Set(Object.values(skills).flatMap((s) => s.docs));
  const ignored = new Set(manifest.ignore || []);
  const livePages = new Set(docs.pages);

  const untracked = docs.pages.filter((p) => !tracked.has(p) && !ignored.has(p));
  const missing = [...tracked].filter((p) => !livePages.has(p));

  const citedButUntracked = {};
  for (const [skill, entry] of Object.entries(skills)) {
    const extra = citedPages(skill).filter((p) => !entry.docs.includes(p));
    if (extra.length) citedButUntracked[skill] = extra;
  }

  const oldestSha = shas.find((sha) => sha !== docs.sha);
  const commits = oldestSha ? changesBySha[oldestSha].commits : [];
  const recordedKamal = [...new Set(Object.values(skills).map((s) => s.verified.kamal))];
  const newVersion = docs.version && !recordedKamal.every((v) => v === docs.version) ? docs.version : null;
  const siteLags = docs.release && docs.version && docs.release.version !== docs.version ? docs.release : null;

  const drift =
    Object.keys(affected).length > 0 || untracked.length > 0 || missing.length > 0 || newVersion !== null;

  return { drift, affected, changedFiles, untracked, missing, citedButUntracked, commits, newVersion, siteLags, recordedKamal, oldestSha };
}

function renderReport(manifest, docs, result) {
  const { repo } = manifest.source;
  const lines = [];
  const pageUrl = (p) => `${manifest.source.site}/${p.replace(/\.md$/, "/")}`;

  lines.push("# Kamal docs drift report", "");
  lines.push(`- Current docs: [\`${docs.sha.slice(0, 7)}\`](https://github.com/${repo}/commit/${docs.sha}) (${docs.date})`);
  if (docs.version) lines.push(`- Docs describe Kamal: **${docs.version}**`);
  if (docs.release) lines.push(`- Latest Kamal release: ${docs.release.version} (${docs.release.date})`);
  lines.push(`- Skills verified against Kamal: ${result.recordedKamal.join(", ")}`);
  if (result.oldestSha) {
    lines.push(`- Full docs diff: https://github.com/${repo}/compare/${result.oldestSha.slice(0, 7)}...${docs.sha.slice(0, 7)}`);
  }
  lines.push("");

  if (!result.drift) {
    lines.push("All skills are in sync with the current Kamal documentation.");
  }

  if (result.newVersion) {
    lines.push(
      "## New Kamal version in the docs",
      "",
      `The docs now describe Kamal ${result.newVersion}. Skills are verified against ${result.recordedKamal.join(", ")}. Read the [release notes](https://github.com/${manifest.source.release_repo}/releases/tag/v${result.newVersion}) alongside the diffs below.`,
      ""
    );
  }

  if (result.siteLags) {
    lines.push(
      "## Docs site behind the latest release",
      "",
      `Kamal ${result.siteLags.version} was released on ${result.siteLags.date}, but the docs still describe ${docs.version}. Skills follow the docs, so no action is needed until the site updates. Watch the [release notes](https://github.com/${manifest.source.release_repo}/releases/tag/v${result.siteLags.version}).`,
      ""
    );
  }

  const affectedSkills = Object.keys(result.affected).sort();
  if (affectedSkills.length) {
    lines.push("## Skills to review", "", "| Skill | Changed doc pages |", "|-------|-------------------|");
    for (const skill of affectedSkills) {
      const pages = result.affected[skill].map((f) => `[${f.filename.replace(/^docs\//, "")}](${pageUrl(f.filename)})`);
      lines.push(`| ${skill} | ${pages.join(", ")} |`);
    }
    lines.push("");
  }

  if (result.untracked.length) {
    lines.push(
      "## Doc pages no skill tracks",
      "",
      "New pages, or pages not mapped to any skill. Decide whether an existing skill should cover each one (add it to that skill's `docs` list in `kamal-docs.json`) or add it to `ignore`.",
      "",
      ...result.untracked.map((p) => `- [${p}](${pageUrl(p)})`),
      ""
    );
  }

  if (result.missing.length) {
    lines.push(
      "## Tracked pages that no longer exist",
      "",
      "These pages were removed or renamed. Find where the content moved and update `kamal-docs.json` and the skills that link to them.",
      "",
      ...result.missing.map((p) => `- ${p}`),
      ""
    );
  }

  const cited = Object.keys(result.citedButUntracked).sort();
  if (cited.length) {
    lines.push("## Manifest gaps", "", "These skills link to doc pages their `kamal-docs.json` entry does not track:", "");
    for (const skill of cited) lines.push(`- **${skill}**: ${result.citedButUntracked[skill].join(", ")}`);
    lines.push("");
  }

  if (result.commits.length) {
    lines.push("## Docs commits since the oldest verified baseline", "");
    for (const c of result.commits) {
      lines.push(`- [\`${c.sha}\`](https://github.com/${repo}/commit/${c.sha}) ${c.date} ${c.message}`);
    }
    lines.push("");
  }

  const files = Object.values(result.changedFiles).sort((a, b) => a.filename.localeCompare(b.filename));
  if (files.length) {
    lines.push("## Diffs", "");
    let budget = PATCH_BUDGET;
    for (const f of files) {
      const patch = f.patch || "(no textual diff available)";
      if (patch.length > budget) {
        lines.push(`- \`${f.filename}\` (${f.status}): diff omitted for length, see the full docs diff link above.`);
        continue;
      }
      budget -= patch.length;
      lines.push(
        "<details>",
        `<summary><code>${f.filename}</code> (${f.status}, +${f.additions}/-${f.deletions})</summary>`,
        "",
        "```diff",
        patch,
        "```",
        "</details>",
        ""
      );
    }
  }

  if (result.drift) {
    lines.push(
      "## Next steps",
      "",
      "Follow [DOCS-SYNC.md](https://github.com/donnfelker/kamal-skills/blob/main/DOCS-SYNC.md) to update the affected skills, then run:",
      "",
      "```bash",
      "node .github/scripts/check-kamal-docs.js --mark-synced --skills <skills you verified>",
      "```"
    );
  }

  return lines.join("\n") + "\n";
}

/**
 * Rewrite the "Kamal Docs" column of the VERSIONS.md table from the manifest.
 */
function syncVersionsTable(manifest) {
  if (!fs.existsSync(VERSIONS_FILE)) return;
  const text = fs.readFileSync(VERSIONS_FILE, "utf8");
  const out = text.split("\n").map((line) => {
    if (/^\|\s*Skill\s*\|/.test(line)) return "| Skill | Version | Last Updated | Kamal Docs |";
    if (/^\|-+\|/.test(line)) return "|-------|---------|--------------|------------|";
    const m = line.match(/^\|\s*([a-z0-9-]+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (!m || !manifest.skills[m[1]]) return line;
    const v = manifest.skills[m[1]].verified;
    return `| ${m[1]} | ${m[2]} | ${m[3]} | ${v.kamal} (\`${v.sha.slice(0, 7)}\`) |`;
  });
  fs.writeFileSync(VERSIONS_FILE, out.join("\n"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = loadManifest();
  const docs = await currentDocs(manifest.source);

  if (args.markSynced) {
    const targets = args.skills || Object.keys(manifest.skills);
    const unknown = targets.filter((s) => !manifest.skills[s]);
    if (unknown.length) throw new Error(`Unknown skills: ${unknown.join(", ")}`);

    const kamal = docs.version || manifest.skills[targets[0]].verified.kamal;
    const today = new Date().toISOString().slice(0, 10);
    for (const skill of targets) manifest.skills[skill].verified = { sha: docs.sha, kamal, date: today };

    saveManifest(manifest);
    syncVersionsTable(manifest);
    console.log(`Marked ${targets.length} skill(s) verified against ${docs.sha.slice(0, 7)} (Kamal ${kamal}).`);
    return;
  }

  const result = await check(manifest, docs);
  const report = renderReport(manifest, docs, result);
  process.stdout.write(report);
  if (args.output) fs.writeFileSync(args.output, report);
  process.exitCode = result.drift ? 2 : 0;
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
