---
name: security-check
description: Security audit following OWASP Top 10
---
Run a security audit on: $ARGUMENTS (or entire codebase if not specified)

Check for OWASP Top 10 vulnerabilities:
1. **Injection** — SQL injection in Supabase queries, command injection in Bash
2. **Broken Auth** — JWT handling, token expiration, refresh flow
3. **Sensitive Data Exposure** — secrets in code, .env committed, PII in logs
4. **XXE** — XML parsing vulnerabilities
5. **Broken Access Control** — RLS bypass, missing auth on endpoints
6. **Security Misconfiguration** — CORS too permissive, debug mode in prod
7. **XSS** — dangerouslySetInnerHTML, unescaped user input in React
8. **Insecure Deserialization** — untrusted data parsing
9. **Vulnerable Components** — outdated dependencies with known CVEs
10. **Insufficient Logging** — missing audit trail for sensitive operations

Also check:
- LGPD compliance (Brazilian data protection law)
- Secrets or credentials in code or git history
- Principle of Least Privilege in RLS policies

For each finding:
- Severity: Critical / High / Medium / Low
- Name the security principle violated
- Provide specific fix with code example
