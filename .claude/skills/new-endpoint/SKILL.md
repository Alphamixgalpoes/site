---
name: new-endpoint
description: Create a new FastAPI endpoint following DDD + Hexagonal patterns
---
Create a new API endpoint: $ARGUMENTS

Before implementing, **RESEARCH and EXPLAIN** which patterns apply:
- Is this read-heavy (consider CQRS separation)?
- Does it call external services (consider Circuit Breaker)?
- Does it need validation (consider Guard Clauses at the boundary)?

Follow the existing DDD + Hexagonal pattern:
1. Read `backend/src/petrus/api/routers/leads.py` as reference
2. Define domain entity/value object in `domain/` if needed
3. Create repository interface (ABC) in `domain/repositories/` if needed
4. Create Supabase repository in `infrastructure/database/repositories/`
5. Create use case/service in `application/`
6. Create router in `api/routers/`
7. Register router in `main.py`
8. Write tests using TDD with fakes from `tests/fakes/`
9. Run `pytest` and `ruff check src/ tests/`

**EXPLAIN each layer** to the user:
- Domain = "what IS a Galpao?" (entities, rules, interfaces)
- Application = "what CAN you DO?" (use cases)
- Infrastructure = "HOW does it work?" (Supabase, APIs)
- API = "how does the world ACCESS it?" (HTTP endpoints)
