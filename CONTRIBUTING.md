# Contributing

Thanks for your interest in contributing to Kamal Skills! This guide will help you add new skills or improve existing ones.

## Requesting a Skill

You can also suggest new skills by [opening a skill request](https://github.com/donnfelker/kamal-skills/issues/new).

## Grounding Requirement

Kamal Skills exist to give agents accurate, current knowledge about [Kamal](https://kamal-deploy.org). Every Kamal fact in a skill must be traceable to the **official Kamal documentation**.

- Do not invent commands, subcommands, flags, configuration keys, defaults, or behaviors.
- If something is not documented, omit it or clearly mark it as an external convention rather than presenting it as fact.
- When in doubt, verify against the docs at https://kamal-deploy.org before writing it into a skill.

## Adding a New Skill

### 1. Create the skill directory

```bash
mkdir -p skills/your-skill-name
```

### 2. Create the SKILL.md file

Every skill needs a `SKILL.md` file with YAML frontmatter:

```yaml
---
name: your-skill-name
description: When to use this skill. Include trigger phrases and keywords that help agents identify relevant tasks.
---

# Your Skill Name

Instructions for the agent go here...
```

Optional frontmatter fields: `license` (default: MIT), `metadata` (author, version, etc.)

### 3. Follow the naming conventions

- **Directory name**: lowercase, hyphens only (e.g., `deploying`)
- **Name field**: must match directory name exactly
- **Description**: 1-1024 characters, include trigger phrases

### 4. Structure your skill

```
skills/your-skill-name/
├── SKILL.md           # Required - main instructions
├── references/        # Optional - additional documentation
│   └── guide.md
├── scripts/           # Optional - executable code
│   └── helper.sh
└── assets/            # Optional - templates, images, data
    └── template.yml
```

### 5. Write effective instructions

- Keep `SKILL.md` under 500 lines
- Move detailed reference material to `references/`
- Include step-by-step instructions
- Add examples of inputs and outputs
- Cover common edge cases
- Ground every Kamal command, flag, and config key in the official docs

## Improving Existing Skills

1. Read the existing skill thoroughly
2. Test your changes locally
3. Keep changes focused and minimal
4. Re-verify any Kamal facts against the official docs
5. Update the version in metadata if making significant changes

## Submitting Your Contribution

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-skill-name`)
3. Make your changes
4. Test locally with an AI agent
5. Run `./validate-skills.sh` to check frontmatter and structure
6. Submit a pull request

## Skill Quality Checklist

- [ ] `name` matches directory name
- [ ] `description` clearly explains when to use the skill
- [ ] Instructions are clear and actionable
- [ ] Every Kamal fact is grounded in the official Kamal docs (no invented commands, flags, keys, defaults, or behaviors)
- [ ] No sensitive data or credentials
- [ ] Follows existing skill patterns in the repo

## Questions?

Open an issue if you have questions or need help with your contribution.
