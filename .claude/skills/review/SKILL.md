---
name: review
description: Code review on 5 axes with pattern identification
---
Review the current changes: $ARGUMENTS

Use subagents in parallel when possible. Evaluate on 5 axes:

1. **Design** — Does it follow DDD + Hexagonal? Are SOLID principles respected?
   - S: Does each class/function do ONE thing?
   - O: Can it be extended without modifying existing code?
   - L: Can fakes substitute real implementations?
   - I: Are interfaces small and focused?
   - D: Do use cases depend on ABCs, not concrete classes?

2. **Readability** — Is the code clear? Could a new developer understand it?

3. **Performance** — N+1 queries? Unnecessary re-renders? Large bundles?

4. **Security** — OWASP Top 10: SQL injection, XSS, auth bypass, secrets in code, LGPD?

5. **Testability** — Are there tests? Do they cover edge cases? Are they using fakes (not mocks)?

For each finding:
- NAME the pattern or principle involved
- Rate severity: Pass / Minor / Major
- Suggest specific fix

Report ONLY actionable findings. No style preferences.
