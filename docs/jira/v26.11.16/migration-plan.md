# zod-to-from migration plan v26.11.16

Standing: UNVERIFIED

## Identity
- Path: /Users/sac/zod-to-from
- Remote: https://github.com/seanchatmangpt/zod-to-from.git (origin/main)
- Branch: main@faf1212; last commit 2025-10-02; 9 commits; 14 MB
- Languages/build: Node ESM (package.json, pnpm, build.config.mjs), Justfile; CLAUDE.md
  (claude-flow / SPARC boilerplate)
- Nested repos: none

## Observed state
- Dirty 20: src/ adapters (9: ai.mjs, communications.mjs, ...), test/ (7), .claude/ (6:
  deleted command docs, helpers/github-safe.js modified), docs/ (4), CLAUDE.md, README.md,
  package.json, pnpm-lock.yaml, test-results
- Untracked 20: Justfile, docs/decisions/, docs/jira/, docs/*.md (2), examples/,
  test/adapters/*-edge-cases / *-errors tests
- Ahead 0 / behind 2 vs origin/main; stash 0; unpushed branches 0
- Build dirs: none (node_modules absent); .claude-flow/, .hive-mind/, .swarm/ present
  (claude-flow runtime dirs — may contain sqlite memory DBs)
- Submodules: none

## What it is
ZTF: format-conversion library (47 adapters, 94 export functions) with Zod schema validation
and a from/to API, v1.0.1.

## Classification
DORMANT (census agrees; last commit 2025-10-02)

## Migration risk
MEDIUM. 9 adapter source edits + 7 test edits + new edge-case tests are uncommitted and
behind-2 means origin moved. .hive-mind/ and .swarm/ may hold local sqlite state (regenerable).

## Recommended action
COMMIT-PUSH
1. `cd /Users/sac/zod-to-from && git diff --stat src test | tail -3`
2. `git checkout -b wip/adapter-fixes-2025-10 && git add -A -- . ':!.hive-mind' ':!.swarm' \
   ':!.claude-flow' ':!test-results' && git commit -m "wip: adapter + edge-case tests"`
3. `git push -u origin wip/adapter-fixes-2025-10`
4. DECISION: drop .hive-mind/, .swarm/, .claude-flow/ (claude-flow runtime) — not needed.
5. Re-clone on new machine.

## First commands on the new machine
`pnpm install --frozen-lockfile && pnpm test`

## See Also
- ../v26.9.19/
- /Users/sac/docs/jira/v26.11.16/README.md (master index)
