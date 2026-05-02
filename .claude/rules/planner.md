# Planner Rules
> Source of truth for planner.js hook. Edit triggers and checklist here.

## Complexity Triggers
Conditions that require a planning phase before writing code.
Entries are `name: threshold_or_description`.

- new file min lines: 50
- touched files threshold: 3
- api_route_pattern: (app|router|fastify|server)\.(get|post|put|patch|delete|head)\s*\(
- schema_change_pattern: (model\s+\w+|migration|ALTER\s+TABLE|CREATE\s+TABLE|prisma\.migrate|schema\.prisma)
- auth_change_pattern: (NextAuth|authOptions|requireAuth|requireTier|signIn|signOut|session)
- payment_change_pattern: (stripe\.|Stripe\(|checkout|webhook|subscription)
- new_service_pattern: export\s+(async\s+)?function\s+\w+(Service|Repository|Provider|Manager)
- db_query_pattern: prisma\.\w+\.(findMany|findUnique|create|update|delete|upsert)

## Planning Checklist
Questions Claude must answer before writing complex code.
The hook prints this checklist when a trigger is met.

- dependencies: Have all upstream dependencies been identified?
- risks: Have security, performance, and data risks been noted?
- phases: Is the work broken into independently-mergeable phases?
- tests: Has the test strategy been defined (unit/integration/e2e)?
- rollback: Is there a rollback plan if the change needs to be reverted?
- migrations: If touching DB schema, is the migration reversible?
- cache: If touching cached data, is cache invalidation handled?
- tier_enforcement: If touching Pro features, is tier enforcement server-side?

## Output Format
How the hook formats its output when a planning trigger is hit.

- phase_format: ### Phase N: [Name] — [Goal in one sentence]
- step_format: N. **[Action]** (`path/to/file.ts`) — one-line description
- risk_format: > ⚠️ Risk: [description] → Mitigation: [how to address]
- checklist_format: - [ ] [item from Planning Checklist above]

## Allowed Skip Conditions
File patterns that bypass the planner even if triggers match.

- test_files: \.(test|spec)\.(ts|js|tsx|jsx)$
- type_files: \.d\.ts$
- config_files: (\.config\.|turbo\.json|tsconfig|\.eslintrc|prettierrc)
- seed_files: (seed\.|fixture\.|mock\.)
- story_files: \.stories\.(ts|tsx)$
