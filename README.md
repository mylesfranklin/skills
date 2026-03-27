# Claude Code Skills

A collection of reusable [Claude Code skills](https://docs.anthropic.com/en/docs/claude-code/skills) — drop any skill into your project with one command.

## Available Skills

| Skill | Description | Usage |
|---|---|---|
| [music-discover](skills/music-discover/) | Search and analyze music catalogs for investment value via MusicBrainz | `/music-discover Radiohead` |

## Install a Skill

Copy the skill folder into your project's `.claude/skills/` directory:

```bash
# One-liner — replace <skill-name> with the skill you want
git clone --depth 1 https://github.com/mylesfranklin/skills.git /tmp/_skills && \
  mkdir -p .claude/skills && \
  cp -r /tmp/_skills/skills/<skill-name> .claude/skills/<skill-name> && \
  rm -rf /tmp/_skills
```

Example — install `music-discover`:

```bash
git clone --depth 1 https://github.com/mylesfranklin/skills.git /tmp/_skills && \
  mkdir -p .claude/skills && \
  cp -r /tmp/_skills/skills/music-discover .claude/skills/music-discover && \
  rm -rf /tmp/_skills
```

After installing, the skill is immediately available as a slash command in Claude Code: `/music-discover <query>`.

## Repo Structure

```
skills/
├── README.md
└── skills/
    └── <skill-name>/
        ├── SKILL.md        # Skill definition (frontmatter + prompt)
        └── reference.md    # Supporting docs, API references, examples
```

## Creating a New Skill

1. Create a folder under `skills/` with your skill name
2. Add a `SKILL.md` with the required frontmatter:

```yaml
---
name: my-skill
description: "When to trigger this skill — be specific"
argument-hint: "[what the user passes in]"
allowed-tools:
  - Bash
  - Read
  # ... any tools the skill needs
---
```

3. Write the prompt body below the frontmatter — this is what Claude executes
4. Add `reference.md` (optional) for API docs, code snippets, or examples the skill can reference
5. Update the table in this README

## License

MIT
