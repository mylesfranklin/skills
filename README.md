# Claude Code Skills

A collection of reusable [Claude Code skills](https://docs.anthropic.com/en/docs/claude-code/skills) — drop any skill into your project with one command.

## Available Skills

### Music Intelligence — MOVED

> All six music-* skills have moved to a dedicated repo:
> **https://github.com/mylesfranklin/music-data**
>
> The old `skills/music-{discover,streams,youtube,market,social,rights}/` directories
> in this repo are preserved as historical artifacts but no longer maintained.
> Each contains a `DEPRECATED.md` pointing to the new location.
>
> The new repo bundles all 6 skills with shared docs (4-stage pipeline, cross-skill
> bridges, alpha ideas, screening runs), an idempotent runtime bootstrap script,
> and an end-to-end smoke test. See its README for the install flow.

### Polymarket / Blockchain
| Skill | Description | Usage |
|---|---|---|
| [wallet-api](skills/wallet-api/) | Query the Polymarket Wallet Hunter API and AlloyDB (53 endpoints, anomalies, wallets, Kyle Lambda) | `/wallet-api whales` |
| [goldrush](skills/goldrush/) | GoldRush (Covalent) blockchain data — wallet profiling, cross-chain analysis, streaming surveillance | `/goldrush 0xabc...` |

### Remotion (Programmatic Video)
| Skill | Description | Usage |
|---|---|---|
| [remotion-core](skills/remotion-core/) | Core Remotion framework — compositions, hooks, component patterns | Model-invocable |
| [remotion-animations](skills/remotion-animations/) | Spring physics, easing, interpolate, transitions, and effects | Model-invocable |
| [remotion-rendering](skills/remotion-rendering/) | Rendering pipelines, Lambda deployment, CI/CD, and production infrastructure | Model-invocable |
| [remotion-reference](skills/remotion-reference/) | Analyze YouTube videos as reference for creating Remotion short-form content | `/remotion-reference <youtube-url>` |

## Install a Skill

Copy the skill folder into your project's `.claude/skills/` directory:

```bash
# One-liner — replace <skill-name> with the skill you want
git clone --depth 1 https://github.com/mylesfranklin/skills.git /tmp/_skills && \
  mkdir -p .claude/skills && \
  cp -r /tmp/_skills/skills/<skill-name> .claude/skills/<skill-name> && \
  rm -rf /tmp/_skills
```

Example — install `wallet-api`:

```bash
git clone --depth 1 https://github.com/mylesfranklin/skills.git /tmp/_skills && \
  mkdir -p .claude/skills && \
  cp -r /tmp/_skills/skills/wallet-api .claude/skills/wallet-api && \
  rm -rf /tmp/_skills
```

After installing, the skill is immediately available as a slash command in Claude Code: `/wallet-api <query>`.

## Repo Structure

```
skills/
├── README.md
├── SCHEMA.md
├── HANDOFF.md
└── skills/
    └── <skill-name>/
        ├── SKILL.md              # Skill definition (frontmatter + prompt)
        ├── reference.md          # Supporting docs (flat structure)
        └── references/           # Supporting docs (directory structure)
            └── api_reference.md
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
4. Add `reference.md` or `references/` (optional) for API docs, code snippets, or examples the skill can reference
5. Update the table in this README

## License

MIT
