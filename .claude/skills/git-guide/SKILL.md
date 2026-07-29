---
name: git-guide
description: Explain a git concept with practical examples
---
Explain the git concept: $ARGUMENTS

Use simple analogies and concrete examples from this project.

Key concepts to cover (based on what the user asks):
- **branch** — galho isolado para trabalhar sem afetar producao
- **commit** — snapshot do codigo num ponto no tempo
- **diff** — comparacao visual entre duas versoes (vermelho=removido, verde=adicionado)
- **merge** — incorporar o galho de volta ao tronco (main)
- **rebase** — reescrever historico para ficar linear (mais limpo, mas reescreve hashes)
- **PR (Pull Request)** — pedido formal para juntar branch na main, com review
- **conflict** — quando duas pessoas mudam a mesma linha
- **stash** — guardar mudancas temporariamente sem commitar
- **cherry-pick** — copiar um commit especifico para outra branch
- **tag** — marcador permanente num commit (usado para releases)

Always:
1. Explain the concept in plain language with analogy
2. Show the relevant git commands
3. Give a concrete example using this project's workflow
4. Mention common mistakes and how to avoid them
