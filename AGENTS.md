# AGENTS.md

## Behavior
- Be concise.
- Preserve full functionality.
- Make the smallest correct change.
- Do not rewrite large sections unless necessary.
- Do not scan the whole repo unless needed.

## Scope control
- Only read files relevant to the task.
- Do not fix unrelated issues.
- Do not expand scope without asking.

## Code edits
- Match existing style and structure.
- Avoid unnecessary comments.
- Do not touch unrelated files.
- Ask before adding dependencies or changing architecture.

## Output
- Keep responses short.
- Only include:
  1. what changed
  2. commands to run
  3. blockers (if any)

## Project specifics
- Avoid scanning large JSON files unless directly needed.
- Avoid reading solver worker files unless the task involves solving logic.