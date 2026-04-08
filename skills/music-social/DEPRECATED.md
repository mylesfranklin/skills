# DEPRECATED — moved to music-data

> This skill is no longer maintained in this repo.
> The canonical source is now part of the **Music-Data** consolidated stack.

## New location

**Repo:** https://github.com/mylesfranklin/music-data
**Path:** `skills/music-discover/`
**Local:** `~/workspace/music-data/skills/music-discover/`

## Why the move

`music-discover` is one of six Claude Code skills that together cover the four-stage music catalog acquisition pipeline. They were extracted from this general-purpose skills repo into a dedicated repo so they can evolve as a single project — with shared docs (`docs/pipeline.md`, `docs/cross-skill-bridges.md`), a one-command runtime bootstrap (`runtime/bootstrap.sh`), and end-to-end smoke tests (`runtime/smoke-test.sh`).

## What changed

Nothing functional. The SKILL.md and reference docs are byte-identical to the last version in this repo. The only difference is that `music-data` provides:

- A unified bootstrap script for all 6 music-* runtimes
- A skill installer that symlinks `~/.claude/skills/music-*` back to the repo (single source of truth)
- A cross-skill smoke test that hits all 5 free APIs in one command
- Shared documentation: pipeline coverage, cross-skill bridges, alpha ideas, screening runs

## Migrate

```bash
git clone https://github.com/mylesfranklin/music-data ~/workspace/music-data
cd ~/workspace/music-data
bash runtime/bootstrap.sh
bash runtime/install-skills.sh
bash runtime/smoke-test.sh "Shaboozey"
```

After that, all six music-* skills are linked into Claude Code from the new repo. This file (in the old repo) is preserved as a historical artifact and a forwarding pointer.

## Companion skills

| Skill | Purpose |
|---|---|
| [`music-discover`](https://github.com/mylesfranklin/music-data/tree/main/skills/music-discover) | MusicBrainz — metadata backbone |
| [`music-streams`](https://github.com/mylesfranklin/music-data/tree/main/skills/music-streams) | Spotify — streaming + copyright line |
| [`music-youtube`](https://github.com/mylesfranklin/music-data/tree/main/skills/music-youtube) | YouTube — views + Art Track distributor |
| [`music-market`](https://github.com/mylesfranklin/music-data/tree/main/skills/music-market) | Discogs — label chain + physical market |
| [`music-social`](https://github.com/mylesfranklin/music-data/tree/main/skills/music-social) | Last.fm — scrobbles + stickiness |
| [`music-rights`](https://github.com/mylesfranklin/music-data/tree/main/skills/music-rights) | BMI Songview via Browser Use Cloud — writer/publisher IPIs |

Moved 2026-04-08.
