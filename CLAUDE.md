# AzerothTracker – rules for agents

Read this before working on the project. These rules come from the project owner and apply to
every agent and every task.

## Research and third-party material

- Research only through web search and reading web pages. **Never attach, clone or request
  access to other GitHub repositories** (no add-repo, no `git clone` of third-party projects).
- **Never copy third-party code or data** (other addons, Wowhead, game databases) into this
  repository. Take ideas only; write our own code and build our own data.
- Wowhead: manual checks and outbound links only. No scraping or automated downloads.
- If something can only be verified by reading another project's source, mark it "unverified".

## Approvals

- Never trigger anything that asks the owner for approval (new repository access, permissions,
  publishing, deleting) without first explaining in the chat what it is, why it is needed and
  what it changes, and waiting for a yes.

## Fair play (see README "What it does NOT do")

- Never read or modify the game's memory or game files.
- Never simulate key presses or clicks or automate anything in the game.
- Never use or calculate combat data.
- Never collect data about other players – only the owner's own characters.
- No Windows/OS notifications, ever. In-app indicators only.

## Product and workflow

- Everything in English (UI, addon messages, docs). The repo name appears only in the
  `DATA_PACK_URL` constant, never in the UI.
- Class icons and all artwork are our own originals – never Blizzard's icons or imitations.
- Work on a `feat/*` branch; tests run in GitHub Actions (no local npm). Write the failing test
  first, watch CI fail, then implement and watch CI pass.
- When a decision is needed, offer the owner about three quick options to choose from.
