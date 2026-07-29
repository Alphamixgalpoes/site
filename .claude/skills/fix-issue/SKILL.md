---
name: fix-issue
description: Fix a GitHub issue end-to-end using TDD
---
Analyze and fix the GitHub issue: $ARGUMENTS

1. Read the issue details (use gh or GitHub API)
2. Search the codebase for relevant files
3. **IDENTIFY applicable patterns** — does this bug suggest a missing Guard Clause? Null Object? Validation at boundary? Input sanitization?
4. **EXPLAIN the pattern** to the user before implementing
5. Create a feature branch: `fix/issue-<number>-<short-description>`
6. Write a test that REPRODUCES the bug (RED phase of TDD)
7. Implement the MINIMUM fix to make the test pass (GREEN phase)
8. Refactor if needed (REFACTOR phase)
9. Run full test suite + lint
10. Create descriptive commit linking the issue
11. Push and create PR with `Fixes #<number>` in the body
