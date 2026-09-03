---
ultima_atualizacao: "03/09/2026 às 06:44"

pasta_base: "3way"
padrao_pasta: "-djs"

senha_padrao: "3way-djs"
senha_admin: "3way-djs-adm"

tags_processo:
  - campo: parte
    nome: "Reclamante"
  - campo: parte_id
    nome: "CPF Reclamante"
  - campo: vlr_causa
    nome: "Valor da Causa"
  - campo: nr_processo
    nome: "Processo"
  - campo: jurisdicao
    nome: "Vara"
  - campo: obs
    nome: "Observações"
  - campo: arquivado
    nome: "Status"

tags_movimentacao:
  - campo: tags
    nome: "Peça Processual"
  - campo: resumo_prc
    nome: "Resumo da Peça"
  - campo: doc_anexos
    nome: "Documentos Anexos"
  - campo: ref_ato_prc
    nome: "Referência ao Ato Processual"
  - campo: data
    nome: "Data da Peça"
  - campo: dt_publicacao
    nome: "Data de Publicação"
  - campo: dt_prazo
    nome: "Data do Prazo"
  - campo: obs
    nome: "Observações"
  - campo: arquivado
    nome: "Arquivado"

filtro_geral:
  - todos
  - advogado
  - processo
  - parte

filtro_data:
  periodo: true
  campo_periodo: data
  prazo:
    - todos
    - arquivados
    - andamento

agrupar_por:
  - advogado
  - processo

ordenar_itens_por: data
ordenar_direcao: desc
---

# Configurações do Relatório — DJS / 3Way

Este arquivo controla como o `build_data.py` lê a base e como o dashboard (`index.html`) exibe e filtra os dados. Ele pode ser editado manualmente — o script de atualização sempre relê estas diretrizes antes de gerar `data.js`.

## O que cada bloco faz

- **pasta_base / padrao_pasta**: onde procurar os dados. O script varre `3way/` e usa apenas pastas cujo nome contenha `-djs`.
- **senha_padrao / senha_admin**: senhas de acesso ao dashboard publicado. `senha_admin` também libera o botão "Atualizar Base de Dados".
- **tags_processo**: colunas exibidas para o arquivo "processo" (📗) de cada cliente — campo YAML de origem e o rótulo mostrado no dashboard.
- **tags_movimentacao**: colunas exibidas para os demais arquivos (peças/andamentos), na mesma lógica.
- **filtro_geral**: opções do filtro "Ver por" (todos, advogado, processo, parte/reclamante).
- **filtro_data**: opções do filtro por data — período (com base no campo `data`) e filtro por prazo (todos / arquivados / em andamento).
- **agrupar_por**: ordem de agrupamento da tabela final (advogado → processo).
- **ordenar_itens_por / ordenar_direcao**: ordenação dos itens dentro de cada processo (por padrão, `data` decrescente).

## Última atualização da base

`ultima_atualizacao` é preenchido automaticamente pelo `build_data.py` toda vez que ele roda (data/hora local de Goiânia). Não precisa editar manualmente.

## Como alterar

1. Edite os campos desejados acima (por exemplo, para adicionar uma nova coluna, adicione um item em `tags_processo` ou `tags_movimentacao` com o `campo` (nome exato da tag YAML) e o `nome` (rótulo de exibição)).
2. Rode `python3 build_data.py` dentro desta pasta (veja `read.md`).
3. Publique (`git add`, `commit`, `push`) — o dashboard publicado passará a refletir a nova configuração.
