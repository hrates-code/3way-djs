Você é um especialista em visualização de dados e UI/UX design, com expertise em criar dashboards executivos de nível profissional.

Todos a estrutura dessa página deverá ser gerada dentro da pasta "relatorio-djs-3way"

# Contexto

A base de dados são todos os arquivos .md dentro da pasta "3way" que contenham no nome da pasta o termo "-djs".

Cada pasta contem arquivos com tags (yaml) contendo informações dos andamentos processuais.

# Informações das tags (yaml)

- cliente: em formato de wikilink. Mostrar sem "[[]]". Separar cada valor da tag por ;
- processo: em formato de wikilink. Mostrar sem "[[]]". Separar cada valor da tag por ;
- tags: em formato de texto. Separar cada valor da tag por ;
- resumo_prc: em formato de texto
- id: em formato de texto. Mostrar sem "". Separar cada valor da tag por ;
- doc_anexos: em formato de texto e wikilink. Mostrar sem "[[]]" ou sem "". Separar cada valor da tag por ;
- ref_ato_prc: em formato de texto e wikilink. Mostrar sem "[[]]" ou sem "". Separar cada valor da tag por ;
- data: data no formato AAAA-MM-DD
- dt_publicacao:  data no formato AAAA-MM-DD
- dt_prazo: data no formato AAAA-MM-DD
- obs: em formato de texto
- arquivado: em formato boolean

# Objetivo

Criar um dashboard interativo COMPLETO com visual de nível agência de design — moderno, elegante.

O dashboard deverá ser gerado em html para ser publicado no GitHub e deverá ter uma senha de acesso padrao "3way-djs" e uma senha de administrador "3way-djs-adm".

# Análises Obrigatórias do Dashboard

Crie um arquivo configuracoes.md com as tags que serão listadas, filtros e ordenações, e um campo com a data e horário da última atualização da base de dados.

O arquivo configuracoes.md poderá ser modificado manualmente e sempre que atualizar o relatório deverá ler as diretrizes que estarão especificadas nesse arquivo. 

Crie um arquivo read.md com todas as informações detalhadas de como atualizar o relatório, visualizar e atualizar o resultado.

# Tags (yaml) a serem exibidas:

## Arquivos com tags "processo"

- nr_processo com nome "Processo"
- jurisdicao com nome "Vara"
- parte com nome "Reclamante"
- parte_id com nome "CPF Reclamante"
- advogado com nome "Advogado(s)"
- adv_escritorio com nome "Escritório do Advogado"
- vlr_causa com nome "Valor da Causa"
- obs com nome "Observações"
- arquivado com nome "Arquivado" se tiver o valor true ou "Prazo em Andamento" Se for false.

## Arquivos com tags diferentes de "processo"

- tags com nome "Peça Processual"
- resumo_prc com nome "Resumo da Peça"
- doc_anexos com nome "Documentos Anexos"
- ref_ato_prc com nome "Referência ao Ato Processual"
- data com nome "Data da Peça" (formato DD/MM/AAAA)
- dt_publicacao com nome "Data de Publicação" (formato DD/MM/AAAA)
- dt_prazo com nome "Data do Prazo" (formato DD/MM/AAAA)
- obs com nome "Observações"
- arquivado com nome "Arquivado" se tiver o valor true ou "Prazo em Andamento" Se for false.

# Resultados

Os resultados deverão ser agrupados pela tag de advogado e, depois, por processo.

Para cada processo deve listar todas as tags em ordem decrescente, de acordo com a data (data da peça).

Deverá ser criado os seguintes filtros:

Filtro Geral:

- todos
- por advogado
- por processo
- por parte (reclamante)

Filtro por Data:

- todos
- data por período
- data do prazo com a opção de filtrar por todos, pelos arquivados ou em andamento.

Destacar sempre o prazo em andamento.

Deverá ser criado cards no topo com:

- a quantidade total de ações arquivadas e em andamento
- os filtros selecionados, mostrando sempre os dados filtrados

**Tabela final:** Todas as tags especificadas no configuracoes.md mostrando cada campo devidamente em seu formato.


# Layout

- Header com título "Reclamações Trabalhistas DJS e 3Way"
- Grid responsivo
- Todos os gráficos devem ter título + insight curto abaixo
- Formatação de números em padrão brasileiro: R$ 1.234.567,89

# Dados

Use os dados reais conforme especificado. Faça a agregação dos registros encontrados para gerar os cards, gráficos e tabelas. Não invente números — puxe da base criada.

Os resultados deverão ser armazenados em uma base facilmente atualizada que ficará no GitHub.

Coloque no topo um botão de atualização para ser visível somente quando acessado com senha de administrador.

O botão de atualização deverá reler a pasta raiz e atualizar a base de dados do html, bem como atualizar a data e horário da última atualização da base de dados.
