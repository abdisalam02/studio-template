# Global rules (all workspaces)

Universal only. Project details live in each workspace's `GEMINI.md`, and **the workspace file wins on conflict**.

## 1. Working rules (tokens and tools)
1. Start each task by reading `docs/STATE.md` and `docs/ARCHITECTURE.md` if they exist. Don't search first.
2. Search before reading (grep/glob), then open files by line range. Never open a file over 500 lines whole, or any lockfile, build output or `node_modules`.
3. Batch independent reads and searches into one step. Batch edits: several hunks per file in one edit, and edits to different files together. Never run parallel edits on the same file.
4. Edit in place with minimal diffs. Don't regenerate a whole file. Don't re-read a file after a successful edit.
5. Verify once per task, after the last edit, with the workspace's verify command (`npm run verify` if defined; otherwise `tsc --noEmit` plus lint). Full builds only for structural changes or before an approved push.
6. Fix failures at most twice. Then stop and report what's blocking.
7. Plan in at most 10 lines. Final reply at most 8 lines: what changed, which files, open items. Don't paste long code or diffs in chat.
8. When a task is finished, add at most 5 lines to `docs/STATE.md`. Completed work lives in git history, not in docs. Don't re-read finished logs or `docs/archive/`.
9. Ask one question only when blocked by a stop gate. Otherwise state the assumption in one line and continue.

## 2. Stop gates (ask first)
- `git push`, deploys, publishing, or destructive commands (`rm -rf`, force push, reset --hard, dropping data).
- Adding third-party scripts, pixels, embeds, CDN fonts or new dependencies.
- Adding images, icons, fonts or code from outside the project without a recorded licence.
- Changing prices, legal text, terms or privacy wording.
- Deleting files.

## 3. Code quality
- Comments explain **why** only, never what. Navigation anchors like `@section NAME` in files over 500 lines are allowed.
- Stay inside the blast radius. Don't refactor working files outside the request.
- Never commit or hardcode secrets, API keys, passcodes or credentials. Passcodes are checked server-side only.
- Semantic HTML (`main`, `section`, `nav`, `article`). No `div` towers.
- Mobile: no fixed widths that break 375px. Never use `100vh` or `min-h-screen` for full-height mobile layouts (Tailwind's `min-h-screen` is `100vh`). Use `min-h-dvh` / `h-dvh` or `100dvh`.

## 4. Copy
- Direct, concrete, human. Facts over adjectives ("Pick a set. Pick a time. Pay with Vipps.").
- Maximum one em dash per page. No exclamation marks.
- Banned verbs: elevate, empower, unleash, unlock, harness, revolutionize, transform, delve, curate, craft, amplify, supercharge.
- Banned adjectives: seamless, bespoke, cutting-edge, robust, dynamic, intuitive, holistic, tailored, frictionless, mission-critical.
- Banned phrases: "In today's fast-paced world", "Whether you're an X or Y", "Say goodbye to X", "Look no further".
- Never invent testimonials, stats, clients, prices or awards.
- Voice comes from the workspace. On client sites, write in the client's voice and language, not mine.

## 5. Design
- Read the workspace `docs/DESIGN.md` before UI work. Commit to a direction derived from the client's own brand and photos before writing UI code. Don't start from a house palette.
- No radial-gradient backgrounds, blurred neon orbs, rainbow borders, glassmorphism, lazy 3-box bento grids, sparkle badges, or a single italicised word in a headline.
- Also avoid purple/indigo defaults, stock font defaults (Inter, Roboto, Poppins, Space Grotesk, Geist), untouched UI-kit components and generic fade-up-on-everything motion.
- Pick at most two border radii and assign them by role.
- Mock data is realistic but fictional: no lorem ipsum, no real businesses, people or addresses. Label demos as demos.
