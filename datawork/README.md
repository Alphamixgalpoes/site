# Datawork — Data Engineering Workspace

Workspace interativo para exploração e limpeza de dados do MDM Petrus.

## Setup

```bash
cd datawork
pip install -e .
```

## Uso

1. Copiar um template de `templates/` para `notebooks/`
2. Abrir com JupyterLab: `jupyter lab`
3. Na primeira célula: `import datawork; datawork.setup()`
4. Seguir as células do template

## Estrutura

- `templates/` — notebooks template (versionados no git)
- `notebooks/` — notebooks de trabalho (gitignored)
- `data/` — CSVs de entrada (gitignored)
- `output/` — resultados (gitignored)
- `src/datawork/contracts/` — schemas pandera (Bronze/Silver/Gold)
- `src/datawork/pipeline/` — PipelineRunner + stages composíveis
- `src/datawork/io/` — carregar e exportar dados
