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
5. Claude pode abrir o Pull Request no GitHub — **somente o usuário aprova e faz merge**
6. Após merge aprovado → Vercel faz deploy automaticamente
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

No Windows, `git worktree remove` pode falhar por permissão mesmo com a pasta vazia.
Se isso acontecer, delete a pasta manualmente e rode:
```bash
git worktree prune
```

## Comportamento obrigatório do Claude

1. **Forçar o procedimento padrão sempre** — se o usuário tentar um atalho (commitar na main, pular PR, merge local sem motivo), recusar e redirecionar para o fluxo correto. Explicar o risco antes de qualquer alternativa.

2. **Explicar cada ação de git** — antes de executar qualquer comando relacionado a branch, worktree, commit, push ou merge, explicar em linguagem simples o que está prestes a acontecer e por quê. O usuário está aprendendo o fluxo e precisa entender cada passo.

3. **Claude pode criar PRs, nunca fazer merge** — abrir PR é permitido e desejado. Aprovar, mergear ou fechar PRs é decisão exclusiva do usuário. Nunca chamar a API de merge do GitHub.

4. **Nunca deletar branches remotas sem confirmação explícita** — deletar branch remota é irreversível para colaboradores. Sempre listar o que será deletado e aguardar o "pode deletar" do usuário antes de executar.

5. **Sempre verificar antes de deletar branches** — rodar os três comandos abaixo e apresentar o resultado antes de qualquer deleção:
   ```bash
   git branch --merged main          # branches já incorporadas
   git log main..<branch>            # commits que seriam perdidos
   git worktree list                 # detectar branch em uso em worktree
   ```

## Push após rebase

Após `git rebase`, o histórico é reescrito — o push normal é rejeitado.
Usar sempre `--force-with-lease`, nunca `--force`:
```bash
git push --force-with-lease origin feat/nome
```
`--force-with-lease` falha se alguém else tiver pushado na branch enquanto isso — protege contra sobrescrever trabalho alheio.

## Deletar branches: `-d` vs `-D`

`git branch -d` só deleta se o conteúdo estiver em main pelo mesmo hash.
Quando uma branch foi rebaseada antes do merge, o hash muda — o git reclama mesmo o conteúdo estando em main.
Nesse caso, `-D` (force) é correto e seguro, desde que você tenha confirmado via `git log` que o conteúdo está na main.

## Resolução de conflito no rebase

Quando a branch a ser rebaseada modifica um arquivo que a main já evoluiu significativamente:
1. Verificar qual versão é mais completa: `git diff origin/main...<branch> -- arquivo.tsx`
2. Se a main tem versão mais avançada, aceitar HEAD: `git checkout --ours arquivo.tsx`
3. Se a branch tem algo novo que não está na main, integrar manualmente
4. Nunca aceitar cegamente nenhum dos lados sem ler o diff

## Commits
Mensagens no formato: `tipo: descrição curta no imperativo`
Exemplos:
- `feat: cria página de contato`
- `fix: corrige upload de imagens duplicadas`
- `chore: atualiza telefone no rodapé`

Commits pequenos e frequentes — um commit por mudança lógica, não por sessão de trabalho.
