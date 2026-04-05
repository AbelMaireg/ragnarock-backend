# Commit Skill

Create a commit only after format, lint, and build checks pass.

## Goal

- Verify code quality and build health before committing.
- Create a commit with a clear title and explanatory body.
- Never add `Co-authored-by` trailers.

## Inputs

- `title`: short commit subject line.
- `body`: 1-3 paragraphs explaining why the change was made and key impact.
- `paths` (optional): file paths to commit. If omitted, stage all tracked/untracked changes.

## Steps

1. Run format check (no writes):

```bash
bunx oxfmt --check src test
```

2. Run lint check (no autofix):

```bash
oxlint src test
```

3. Run build status:

```bash
bun run build
```

4. Stage changes:

- If `paths` provided:

```bash
git add <paths>
```

- Otherwise:

```bash
git add .
```

5. Commit with message and explanatory body:

```bash
git commit -m "<title>" -m "<body>"
```

## Rules

- Stop immediately if any check fails; do not commit.
- Do not use `--amend` unless explicitly requested.
- Do not add any co-author trailer. Specifically, do not include:

## Example

```bash
bunx oxfmt --check src test && oxlint src test && bun run build && git add . && git commit -m "feat: add booking validation" -m "Add server-side validation for booking payloads to prevent invalid radius and date combinations. This improves API reliability and returns actionable validation errors to clients."
```
