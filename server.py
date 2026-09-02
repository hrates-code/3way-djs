#!/usr/bin/env python3
"""
Servidor local do dashboard Relatório DJS / 3Way.

Serve os arquivos estáticos desta pasta (index.html, assets/...) e expõe
a rota POST /api/atualizar, que relê o vault (via build_data.build()),
regrava assets/data.js na hora e, em seguida, comita e publica (push) só
essa pasta no repositório GitHub configurado como remoto "origin" — é o
que o botão "Atualizar Base de Dados" chama quando o dashboard roda
através deste servidor.

Só funciona rodando localmente. Não tem efeito quando o dashboard é
publicado como site estático (ex.: GitHub Pages), pois lá não existe
processo Python nem acesso de escrita ao vault.

Uso:
    cd 3way/djs/relatorio-djs-3way
    python3 server.py [porta]
    # depois acesse http://localhost:8000 (porta padrão)
"""
import json
import subprocess
import sys
from datetime import datetime

import yaml
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import build_data

DEFAULT_PORT = 8000
REPO_DIR = build_data.HERE


def git(*args):
    """Roda um comando git com cwd nesta pasta (raiz do repo), sempre —
    garante que nenhum commit/push toque em nada fora de relatorio-djs-3way."""
    return subprocess.run(
        ["git", *args],
        cwd=REPO_DIR,
        capture_output=True,
        text=True,
        timeout=30,
    )


def publicar_no_github():
    """Comita e publica (push) as mudanças desta pasta no GitHub.

    Retorna um dict {"comitado": bool, "publicado": bool, "mensagem": str}.
    Nunca levanta exceção — falhas de git (sem remoto, sem rede, sem
    credenciais) são reportadas na mensagem, sem interromper a atualização
    da base local, que já aconteceu antes desta função ser chamada.
    """
    status = git("status", "--porcelain")
    if status.returncode != 0:
        return {"comitado": False, "publicado": False, "mensagem": "Repositório git não encontrado nesta pasta."}

    if not status.stdout.strip():
        return {"comitado": False, "publicado": False, "mensagem": "Nada para comitar — base já estava em dia."}

    add = git("add", "-A")
    if add.returncode != 0:
        return {"comitado": False, "publicado": False, "mensagem": "Falha ao preparar arquivos (git add): " + add.stderr.strip()}

    msg = "Atualiza base de dados — " + datetime.now().strftime("%d/%m/%Y %H:%M")
    commit = git("commit", "-m", msg)
    if commit.returncode != 0:
        return {"comitado": False, "publicado": False, "mensagem": "Falha ao comitar: " + (commit.stderr.strip() or commit.stdout.strip())}

    push = git("push", "origin", "HEAD:main")
    if push.returncode != 0:
        return {"comitado": True, "publicado": False, "mensagem": "Comitado localmente, mas falhou o push pro GitHub: " + push.stderr.strip()}

    return {"comitado": True, "publicado": True, "mensagem": "Publicado no GitHub."}


def admin_password():
    with open(build_data.CONFIG_PATH, encoding="utf-8") as fh:
        content = fh.read()
    end = content.find("\n---", 3)
    cfg = yaml.safe_load(content[3:end])
    return cfg["senha_admin"]


class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path.rstrip("/") != "/api/atualizar":
            self.send_error(404, "Rota não encontrada")
            return

        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            req = json.loads(raw or b"{}")
        except json.JSONDecodeError:
            req = {}

        if req.get("senha_admin") != admin_password():
            self._json(401, {"ok": False, "erro": "Senha de administrador inválida."})
            return

        try:
            payload = build_data.build()
        except Exception as exc:  # noqa: BLE001 — reportar qualquer falha do build ao cliente
            self._json(500, {"ok": False, "erro": str(exc)})
            return

        git_result = publicar_no_github()

        self._json(200, {"ok": True, "meta": payload["meta"], "git": git_result})

    def _json(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    server = ThreadingHTTPServer(("localhost", port), Handler)
    print(f"Servindo em http://localhost:{port} (Ctrl+C para parar)")
    print("Botão 'Atualizar Base de Dados' disponível para o administrador.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
