#!/usr/bin/env python3
"""
Servidor local do dashboard Relatório DJS / 3Way.

Serve os arquivos estáticos desta pasta (index.html, assets/...) e expõe
a rota POST /api/atualizar, que relê o vault (via build_data.build()) e
regrava assets/data.js na hora — é o que o botão "Atualizar Base de Dados"
chama quando o dashboard roda através deste servidor.

Só funciona rodando localmente. Não tem efeito quando o dashboard é
publicado como site estático (ex.: GitHub Pages), pois lá não existe
processo Python nem acesso de escrita ao vault.

Uso:
    cd 3way/djs/relatorio-djs-3way
    python3 server.py [porta]
    # depois acesse http://localhost:8000 (porta padrão)
"""
import json
import sys
import yaml
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import build_data

DEFAULT_PORT = 8000


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

        self._json(200, {"ok": True, "meta": payload["meta"]})

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
