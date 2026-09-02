# Relatório DJS / 3Way — Como usar

Dashboard interativo com o andamento das reclamações trabalhistas contra **DJS Prestadora de Serviço Ltda.** e **Threeway Construções Ltda. (3Way)**, gerado a partir dos arquivos `.md` das pastas `3way/*-djs*` do vault.

## Arquivos desta pasta

| Arquivo                              | Função                                                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`                         | O dashboard em si (abrir no navegador ou publicar no GitHub Pages).                                                                                         |
| `assets/data.js`                     | Base de dados gerada automaticamente — **não editar à mão**.                                                                                                |
| `assets/style.css` / `assets/app.js` | Estilo e lógica do dashboard.                                                                                                                               |
| `configuracoes.md`                   | Diretrizes editáveis: colunas exibidas, filtros, ordenação, senhas, última atualização.                                                                     |
| `build_data.py`                      | Script que varre o vault e regenera `assets/data.js` a partir de `configuracoes.md`.                                                                        |
| `server.py`                          | Servidor local que serve o dashboard **e** expõe a rota que o botão "Atualizar Base de Dados" chama para reler o vault e regravar `assets/data.js` na hora. |
| `prompt-relatorio-djs-3way.md`       | Prompt original que originou este relatório.                                                                                                                |

## Como visualizar

- **Local, com atualização em um clique** (recomendado): rode o servidor próprio deste dashboard, que serve os arquivos **e** habilita o botão de administrador a regerar a base de verdade:
  ```bash
  cd 3way/djs/relatorio-djs-3way
  python3 server.py
  # depois acesse http://localhost:8000
  ```
- **Local, sem atualização em um clique**: abra `index.html` direto no navegador (duplo clique) ou use um servidor genérico:
  ```bash
  cd 3way/djs/relatorio-djs-3way
  python3 -m http.server 8000
  ```
  Nesse modo o botão "Atualizar Base de Dados" não consegue reler o vault (não existe a rota `/api/atualizar`) — ele só recarrega o `assets/data.js` que já estiver no disco, então é preciso rodar `build_data.py` manualmente antes de clicar.
- **Publicado no GitHub Pages**: veja a seção "Publicar no GitHub" abaixo — nesse caso o botão também só recarrega o `data.js` já publicado, pelo mesmo motivo (site estático, sem processo Python rodando).

### Senhas de acesso

| Senha          | Acesso                                                       |
| -------------- | ------------------------------------------------------------ |
| `3way-djs`     | Visualização normal (cards, gráficos, tabela, filtros).      |
| `3way-djs-adm` | Tudo do acesso normal + botão **"Atualizar Base de Dados"**. |

As senhas ficam em `configuracoes.md` (`senha_padrao` / `senha_admin`) e podem ser trocadas ali — depois rode `build_data.py` para que `data.js` reflita a mudança.

⚠️ **Aviso de segurança**: este é um gate de senha em JavaScript no navegador, não uma autenticação real de servidor. Qualquer pessoa com a URL pode abrir o "código-fonte" da página (`assets/data.js`) e ver todos os dados — inclusive os de clientes cujos dados constam nas tags (CPF, endereço, valor da causa) — mesmo sem saber a senha. Trate a senha como um filtro de conveniência, não como proteção de dados sensíveis. Se o repositório for publicado no GitHub Pages, ele fica **público na internet** por padrão. Recomendações:
- Mantenha o repositório **privado** sempre que possível (GitHub Pages a partir de repositório privado exige plano pago, mas evita exposição pública).
- Se precisar de acesso público, considere colocar o Pages atrás de um proxy com autenticação real (ex.: Cloudflare Access) antes de divulgar a URL.
- Nunca compartilhe o link publicamente sem avaliar a exposição de dados de terceiros (LGPD).

## Como atualizar a base de dados

### Opção A — rodando via `server.py` (atualização em um clique)

1. Inicie o servidor local desta pasta (veja "Como visualizar" acima) e acesse o dashboard com a senha de administrador (`3way-djs-adm`).
2. Clique em **"Atualizar Base de Dados"**. O botão chama a rota `/api/atualizar` do `server.py`, que roda a mesma lógica do `build_data.py` (relê `configuracoes.md` e todas as pastas `3way/*-djs*/*.md`), regrava `assets/data.js` no disco e devolve a nova data/hora — a página já recarrega os dados atualizados sem F5.
3. Se quiser publicar o resultado (GitHub Pages), faça `git add`, `commit`, `push` do `assets/data.js` e `configuracoes.md` atualizados depois de conferir os dados.

### Opção B — sem `server.py` (arquivo local ou já publicado)

Use quando abrir `index.html` direto, rodar `python3 -m http.server`, ou quando o dashboard já estiver publicado no GitHub Pages — nesses casos não há processo Python para reler o vault, então o botão só recarrega o `assets/data.js` que já está no disco/publicado.

1. No terminal, rode o script de build:
   ```bash
   cd 3way/djs/relatorio-djs-3way
   python3 build_data.py
   ```
   Isso relê `configuracoes.md` (tags, filtros, ordenação, senhas) e todas as pastas `3way/*-djs*/*.md`, gera `assets/data.js` de novo e grava a data/hora da atualização em `configuracoes.md` (`ultima_atualizacao`).
2. Publique a mudança (`git add`, `commit`, `push`) para o GitHub, se aplicável.
3. No dashboard, um administrador logado (senha `3way-djs-adm`) pode clicar em **"Atualizar Base de Dados"** para recarregar o `assets/data.js` gerado no passo 1 sem precisar dar F5.

Peça para o Claude Code rodar `build_data.py` (ou `server.py`) e publicar sempre que quiser atualizar o relatório — basta pedir algo como "atualize o relatório DJS 3way".

## Como editar o que é exibido

Abra `configuracoes.md` e edite:

- **`tags_processo` / `tags_movimentacao`**: cada item tem `campo` (nome exato da tag YAML) e `nome` (rótulo mostrado no dashboard). Adicionar, remover ou reordenar itens muda as colunas da tabela.
- **`filtro_geral`**: opções do filtro "Ver por" (todos / advogado / processo / parte).
- **`filtro_data.prazo`**: opções do sub-filtro de status do prazo.
- **`agrupar_por` / `ordenar_itens_por` / `ordenar_direcao`**: agrupamento (advogado → processo) e ordenação das peças dentro de cada processo (por padrão, data decrescente).
- **`pasta_base` / `padrao_pasta`**: onde o script busca os dados (`3way`, pastas contendo `-djs`).

Depois de editar, rode `python3 build_data.py` novamente.

## Estrutura de dados esperada

Cada pasta `3way/<cliente> -djs/` deve conter:
- **um arquivo "processo"** (tag `processo` no front matter) com `nr_processo`, `jurisdicao`, `parte`, `parte_id`, `advogado`, `adv_escritorio`, `vlr_causa`, `obs`, `arquivado`, `ref_processo`.
- **um ou mais arquivos de movimentação/peça**, cada um com `cliente`, `processo` (wikilinks), `tags`, `resumo_prc`, `id`, `doc_anexos`, `ref_ato_prc`, `data`, `dt_publicacao`, `dt_prazo`, `obs`, `arquivado`.

O agrupamento processo↔movimentações é feito pela **pasta** (todo arquivo dentro de `<cliente> -djs/` pertence ao processo daquela pasta), não pelo texto exato do wikilink — isso torna a extração robusta a pequenas inconsistências de digitação nos wikilinks.

## Publicar no GitHub

1. Se a pasta ainda não é um repositório git, inicialize um (`git init`) na raiz que você quiser publicar — recomenda-se publicar **apenas** esta pasta `relatorio-djs-3way` (ou um repositório dedicado), para não expor o restante do vault.
2. `git add`, `commit`, `push` para um repositório no GitHub.
3. Em Settings → Pages, ative o GitHub Pages apontando para a branch/pasta publicada.
4. A URL do Pages será o link do dashboard. Leia o aviso de segurança acima antes de compartilhar.

# GitHub

https://hrates-code.github.io/3way-djs/