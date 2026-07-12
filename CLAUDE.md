# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.
Tradeoff: These guidelines bias toward caution over speed. For trivial tasks, use judgment.

# 0. What this is

Local stdio MCP server (`opf-br-mcp`) that gives coding agents token-efficient access to Open Finance Brasil regulatory knowledge (PCM `additionalInfo` rules from Confluence, Payments OpenAPI spec from GitHub). ESM, Node >= 20, TypeScript strict. User-facing strings, docs, and commit messages are in English.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.


## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.


## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```



Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Commands

```bash
npm test                                   # vitest run (all tests; local fixtures, no network)
npx vitest run test/contract.test.ts       # single test file
npx vitest run -t "nome do teste"          # single test by name
npm run typecheck                          # tsc --noEmit
npm run build                              # tsup → dist/index.js (bin with shebang)
```

Tests must never hit the network — parsers are tested against fixtures in `test/fixtures/`.

## Architecture

Two layers: a **domain-agnostic core** and pluggable **domains**. The server exposes only 4 generic tools (`list_domains`, `search`, `get_item`, `refresh`); adding knowledge means adding a domain, never a tool.

- `src/core/types.ts` — the `Domain` contract, a discriminated union: `ExtractedDomain` (`extract()` fetch + structure remote data, sync `search`/`getItem` over cached data, `ttlHours`) or `LiveDomain` (`live.search`/`live.getItem` hit the source on every call; no cache/refresh; `search` requires a query). Every result of either `search` has a stable `id`.
- `src/core/registry.ts` — the flat list of registered domains; the only wiring point.
- `src/core/data.ts` — lazy extraction orchestrator: serves fresh cache, else calls `extract()` and caches; if extraction fails but a (stale) cache exists, serves it with `stale: true` instead of erroring.
- `src/core/cache.ts` — JSON cache per domain in `~/.cache/opf-br-mcp/` (respects `XDG_CACHE_HOME`), 72h TTL per domain, atomic write via tmp file + rename.
- `src/core/server.ts` — registers the MCP tools, validates domain ids and filter keys, compacts results (drops nulls/empty arrays), returns tool errors via `isError: true` text rather than throwing.
- `src/core/http.ts` — `fetchWithRetry` with backoff delays from domain configs and a 30s per-request timeout.
- `src/domains/<id>/` — each domain has `config.ts` (URLs, page ids, retry delays), `fetcher.ts` and/or `parser.ts`, and `index.ts` exporting the `Domain` object.

`src/core/version.ts` hardcodes `PACKAGE_VERSION` — keep it in sync with `package.json` when bumping.

## Adding a new domain

1. Create `src/domains/<id>/index.ts` exporting a `Domain` object.
2. Register it in `src/core/registry.ts`.
3. Add a fixture in `test/fixtures/` and a builder entry in the `fixtureData` map of `test/contract.test.ts` — the conformance suite (`describe.each` over the registry) then automatically validates the contract: valid metadata, unique ids from `search`, every search id resolvable by `getItem`, empty result for no-match queries. A domain without a registered fixture fails the suite.
4. Live domains (no `extract`) register a fetch responder in the `liveFixtureFetch` map of `test/contract.test.ts` instead of `fixtureData`.

## Conventions

- ESM with `NodeNext` resolution: relative imports need explicit `.js` extensions.
- `search` results can be summaries (e.g. `payments-v4-openapi` strips the `detail` node); `get_item` returns the full record. Item ids are stable and only discoverable via `search` — tool descriptions tell the client agent this.
- Domain fetchers are polite to sources: inter-request delay (Confluence) and retry backoff come from `config.ts`, not hardcoded.
- Domains wrapping a versioned spec must encode the spec's major version in the domain id, e.g. `payments-v4-openapi` for Payments API v4 (`specVersion` in `config.ts`). When the source publishes a new major, add a new domain (`payments-v5-openapi`) alongside the old one rather than mutating the existing id — this keeps old ids stable for clients pinned to a version.
- Commits follow conventional-commit prefixes (`feat:`, `fix:`, `test:`, `docs:`) with messages in English.
