@AGENTS.md

# Projeto
Alphamix Galpoes — sistema para corretor de galpoes industriais.
Next.js 16 + FastAPI + Supabase. Repo: Alphamixgalpoes/site

# Modo de Trabalho
- O USUARIO esta aprendendo — SEMPRE explicar conceitos, tradeoffs e "por que" antes de agir
- Antes de tarefas nao-triviais, pesquisar na internet o estado-da-arte (DDD, TDD, CQRS, etc.)
- Identificar padroes de engenharia aplicaveis e EXPLICAR antes de implementar
- NUNCA configurar plataformas externas diretamente — explicar o passo e o usuario executa
- Plataformas que o usuario opera: GitHub (merge/secrets), Supabase (DDL/DML), Vercel, AWS Console, Cloudflare
- Supabase: Claude gera SQL explicado linha por linha, USUARIO executa no SQL Editor do dashboard
- Logs: Claude mostra ONDE encontrar (Vercel/GitHub Actions/CloudWatch), usuario navega
- Apresentar alternativas e tradeoffs quando houver mais de uma abordagem

# Comandos
- Frontend: `npm run dev`, `npm run build`, `npm run lint`
- Backend: `cd backend && pip install -e ".[dev]" && pytest`
- Lint backend: `ruff check src/ tests/ && ruff format --check src/`

# Convencoes
- TypeScript strict, sem `any`
- Componentes React: PascalCase, arquivos: kebab-case
- Backend: DDD + Hexagonal — ABCs no domain, adapters na infra
- Testes: TDD quando possivel (RED→GREEN→REFACTOR). Fakes in-memory, NUNCA mocks para repos
- Commits: `tipo: descricao` (feat/fix/refactor/chore/style)

# Git
- NUNCA commitar na main — sempre feature branch + PR
- NUNCA fazer merge — apenas o usuario aprova PRs no GitHub
- Explicar cada acao de git antes de executar
- Branches: `feat/nome`, `fix/nome`, `refactor/nome`, `chore/nome`
- Apos rebase, usar `--force-with-lease` (nunca `--force`)
- Nunca deletar branches remotas sem confirmacao explicita

# Verificacao
- Rodar pytest + ruff check antes de push
- CI: 4 checks (Backend Lint, Backend Tests, Frontend Build, Frontend Lint)
- Branch protection impede merge se algum check falhar
- Se CI falhar: ler o log, corrigir, push. NUNCA bypass
