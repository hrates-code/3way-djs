#!/usr/bin/env python3
"""
Gera assets/data.js a partir dos arquivos .md em 3way/**/*-djs*/
lendo as diretrizes (tags, filtros, pastas, senhas) em configuracoes.md.

Uso:
    cd 3way/djs/relatorio-djs-3way
    python3 build_data.py

Requer: PyYAML (pip install pyyaml)
"""
import json
import os
import re
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(HERE, "configuracoes.md")
DATA_JS_PATH = os.path.join(HERE, "assets", "data.js")
TZ = ZoneInfo("America/Sao_Paulo")

WIKILINK_RE = re.compile(r"^\[\[(.*)\]\]$")


def read_config():
    with open(CONFIG_PATH, encoding="utf-8") as fh:
        content = fh.read()
    if not content.startswith("---"):
        raise SystemExit("configuracoes.md sem front matter YAML")
    end = content.find("\n---", 3)
    fm = content[3:end]
    cfg = yaml.safe_load(fm)
    body = content[end + 4 :]
    return cfg, content, body, end


def clean_scalar(v):
    """Remove [[wikilink]] e aspas de um valor de texto único."""
    if v is None:
        return ""
    v = str(v).strip()
    m = WIKILINK_RE.match(v)
    if m:
        v = m.group(1)
    v = v.strip().strip('"')
    return v


def clean_list(v):
    """Normaliza campo YAML (string única ou lista) numa lista de strings limpas,
    removendo entradas vazias."""
    if v is None:
        return []
    if not isinstance(v, list):
        v = [v]
    out = []
    for item in v:
        c = clean_scalar(item)
        if c:
            out.append(c)
    return out


def parse_frontmatter(path):
    with open(path, encoding="utf-8") as fh:
        content = fh.read()
    if not content.startswith("---"):
        return None
    end = content.find("\n---", 3)
    if end == -1:
        return None
    fm = content[3:end]
    try:
        data = yaml.safe_load(fm) or {}
    except yaml.YAMLError:
        return None
    return data


def parse_valor(raw):
    """'R$ 79.091,94' -> 79091.94 ; 'R$' ou vazio -> 0.0"""
    if not raw:
        return 0.0
    digits = re.sub(r"[^\d,]", "", str(raw)).strip()
    if not digits:
        return 0.0
    digits = digits.replace(".", "").replace(",", ".")
    try:
        return float(digits)
    except ValueError:
        return 0.0


def find_djs_folders(base_dir, padrao):
    found = []
    for entry in sorted(os.listdir(base_dir)):
        full = os.path.join(base_dir, entry)
        if os.path.isdir(full) and padrao in entry:
            found.append(full)
    return found


def build():
    cfg, raw_content, body, fm_end = read_config()

    vault_root = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
    base_dir = os.path.join(vault_root, cfg["pasta_base"])
    padrao = cfg["padrao_pasta"]

    folders = find_djs_folders(base_dir, padrao)
    if not folders:
        raise SystemExit(f"Nenhuma pasta '*{padrao}*' encontrada em {base_dir}")

    processos = []
    movimentacoes = []

    for folder in folders:
        pasta_nome = os.path.basename(folder)
        md_files = sorted(f for f in os.listdir(folder) if f.endswith(".md"))

        processo_file = None
        movimento_files = []
        for f in md_files:
            data = parse_frontmatter(os.path.join(folder, f))
            if data is None:
                continue
            tags = data.get("tags")
            tags_list = tags if isinstance(tags, list) else ([tags] if tags else [])
            if "processo" in [str(t) for t in tags_list]:
                processo_file = (f, data)
            else:
                movimento_files.append((f, data))

        if processo_file is None:
            print(f"[aviso] pasta sem arquivo de processo: {pasta_nome}", file=sys.stderr)
            continue

        fname, data = processo_file
        advogados = clean_list(data.get("advogado"))
        adv_escritorio = clean_scalar(data.get("adv_escritorio"))
        grupo_advogado = " / ".join(advogados) or "Sem advogado informado"
        ref_processo = clean_scalar(data.get("ref_processo")) or pasta_nome

        processo = {
            "ref_processo": ref_processo,
            "pasta": pasta_nome,
            "arquivo": fname,
            "nr_processo": clean_scalar(data.get("nr_processo")),
            "jurisdicao": clean_scalar(data.get("jurisdicao")),
            "parte": clean_scalar(data.get("parte")),
            "parte_id": clean_scalar(data.get("parte_id")),
            "advogado": advogados,
            "adv_escritorio": adv_escritorio,
            "grupo_advogado": grupo_advogado,
            "vlr_causa": parse_valor(data.get("vlr_causa")),
            "vlr_causa_raw": clean_scalar(data.get("vlr_causa")),
            "obs": clean_scalar(data.get("obs")),
            "arquivado": bool(data.get("arquivado", False)),
        }
        processos.append(processo)

        for mfname, mdata in movimento_files:
            mov = {
                "id": (clean_list(mdata.get("id")) or [mfname])[0],
                "pasta": pasta_nome,
                "arquivo": mfname,
                "processo_ref": ref_processo,
                "tags": clean_list(mdata.get("tags")),
                "resumo_prc": clean_scalar(mdata.get("resumo_prc")),
                "doc_anexos": clean_list(mdata.get("doc_anexos")),
                "ref_ato_prc": clean_list(mdata.get("ref_ato_prc")),
                "data": clean_scalar(mdata.get("data")),
                "dt_publicacao": clean_scalar(mdata.get("dt_publicacao")),
                "dt_prazo": clean_scalar(mdata.get("dt_prazo")),
                "obs": clean_scalar(mdata.get("obs")),
                "arquivado": bool(mdata.get("arquivado", False)),
            }
            movimentacoes.append(mov)

    now = datetime.now(TZ)
    ultima_atualizacao = now.strftime("%Y-%m-%dT%H:%M:%S%z")
    ultima_atualizacao_fmt = now.strftime("%d/%m/%Y às %H:%M")

    payload = {
        "meta": {
            "ultima_atualizacao": ultima_atualizacao,
            "ultima_atualizacao_fmt": ultima_atualizacao_fmt,
            "total_processos": len(processos),
            "total_movimentacoes": len(movimentacoes),
        },
        "config": {
            "senha_padrao": cfg["senha_padrao"],
            "senha_admin": cfg["senha_admin"],
            "tags_processo": cfg["tags_processo"],
            "tags_movimentacao": cfg["tags_movimentacao"],
            "filtro_geral": cfg["filtro_geral"],
            "filtro_data": cfg["filtro_data"],
            "agrupar_por": cfg["agrupar_por"],
            "ordenar_itens_por": cfg["ordenar_itens_por"],
            "ordenar_direcao": cfg["ordenar_direcao"],
        },
        "processos": processos,
        "movimentacoes": movimentacoes,
    }

    os.makedirs(os.path.dirname(DATA_JS_PATH), exist_ok=True)
    with open(DATA_JS_PATH, "w", encoding="utf-8") as fh:
        fh.write("// Gerado automaticamente por build_data.py — não editar manualmente.\n")
        fh.write("window.DJS_DATA = ")
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write(";\n")

    # Atualiza o campo ultima_atualizacao no front matter de configuracoes.md
    new_fm = re.sub(
        r'ultima_atualizacao: ".*?"',
        f'ultima_atualizacao: "{ultima_atualizacao_fmt}"',
        raw_content[3:fm_end],
        count=1,
    )
    new_content = "---" + new_fm + raw_content[fm_end:]
    with open(CONFIG_PATH, "w", encoding="utf-8") as fh:
        fh.write(new_content)

    print(f"OK: {len(processos)} processos, {len(movimentacoes)} movimentações.")
    print(f"data.js gerado em {DATA_JS_PATH}")
    print(f"Última atualização: {ultima_atualizacao_fmt}")

    return payload


if __name__ == "__main__":
    build()
