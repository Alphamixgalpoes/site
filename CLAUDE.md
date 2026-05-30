@AGENTS.md

# Git Workflow — Padrão do Projeto

## Regras absolutas
- NUNCA commitar diretamente na `main`
- NUNCA fazer `git push origin main` manualmente
- A `main` só recebe código via Pull Request no GitHub
- Produção (Vercel) atualiza automaticamente quando `origin/main` muda

## Nomenclatura de branches
```
feat/nome        ← nova funcionalidade
fix/nome         ← correção de bug
refactor/nome    ← reorganização sem mudar comportamento
style/nome       ← somente visual/CSS
chore/nome       ← configs, dependências, textos, dados
```

## Fluxo para toda nova tarefa
1. `git checkout main && git pull origin main`
2. `git checkout -b feat/nome-da-tarefa`
3. Trabalha e commita em pedaços pequenos e descritivos
4. `git push origin feat/nome-da-tarefa`
5. Abre Pull Request no GitHub: branch → main
6. Merge aprovado → Vercel faz deploy automaticamente
7. `git checkout main && git pull`
8. Deleta o branch local e remoto

## Worktrees — quando usar
Usar worktrees quando houver duas ou mais tarefas paralelas ativas.
Cada worktree fica em uma pasta irmã ao repositório principal:

```
C:\Users\joaos\Petros\petrusweb\        ← main (nunca mexer diretamente)
C:\Users\joaos\Petros\petrusweb-docs\   ← feat/modulo-documentos
C:\Users\joaos\Petros\petrusweb-fix\    ← fix/nome-do-bug
```

Criação:
```bash
git worktree add ../petrusweb-docs -b feat/modulo-documentos main
```

Limpeza após merge:
```bash
git worktree remove ../petrusweb-docs
git branch -d feat/modulo-documentos
git push origin --delete feat/modulo-documentos
```

## Comportamento obrigatório do Claude

1. **Forçar o procedimento padrão sempre** — se o usuário tentar um atalho (commitar na main, pular PR, merge local sem motivo), recusar e redirecionar para o fluxo correto. Explicar o risco antes de qualquer alternativa.

2. **Explicar cada ação de git** — antes de executar qualquer comando relacionado a branch, worktree, commit, push ou merge, explicar em linguagem simples o que está prestes a acontecer e por quê. O usuário está aprendendo o fluxo e precisa entender cada passo.

## Commits
Mensagens no formato: `tipo: descrição curta no imperativo`
Exemplos:
- `feat: cria página de contato`
- `fix: corrige upload de imagens duplicadas`
- `chore: atualiza telefone no rodapé`

Commits pequenos e frequentes — um commit por mudança lógica, não por sessão de trabalho.
