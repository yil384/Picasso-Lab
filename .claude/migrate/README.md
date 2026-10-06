# Moving this project to another Mac
GitHub holds the code, the skills (.claude/skills) and every committed asset. `pack.sh` carries the rest in one archive:
the git-ignored course files (Prof. Ding's PDFs and lecture video, not public), notes and slides, the packed line-art
sprites, Claude Code's memory/rules/settings (no API keys), the session's audio assets (her cut clips, sound packs,
music) and optionally the finished videos and the session transcripts.

1. Old Mac: commit and push everything, then `.claude/migrate/pack.sh /Volumes/USB` (add `--with-downloads`,
   `--with-session` if wanted). Wait for any background renders or workflows to finish first.
2. New Mac: clone the repo, `tar -xzf picasso-migrate-*.tar.gz`, run `picasso-migrate/restore.sh <repo path>`, install
   the tools it prints, log in to Claude Code, GitHub and Codex.
3. Keep the repo at the same path (`~/UCSD/Picasso-Lab`) if you want `claude --resume` to find old sessions.
Secrets are never packed: re-enter API keys (Muse, Hugging Face) on the new Mac as environment variables.
