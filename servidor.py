#!/usr/bin/env python3
"""
Servidor local para testar o site — com suporte a Range requests.
-----------------------------------------------------------------
O `python3 -m http.server` padrão não entende Range, e o Safari precisa disso
para tocar vídeo com áudio e permitir avançar/voltar. Este aqui entende.

Rode:   python3 servidor.py
Abra:   http://localhost:8000
Pare:   Ctrl+C
"""

import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORTA = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class ComRange(SimpleHTTPRequestHandler):

    def send_head(self):
        caminho = self.translate_path(self.path)
        if os.path.isdir(caminho):
            return super().send_head()

        faixa = self.headers.get("Range")
        if not faixa or not os.path.isfile(caminho):
            return super().send_head()

        m = re.match(r"bytes=(\d*)-(\d*)", faixa)
        if not m:
            return super().send_head()

        tamanho = os.path.getsize(caminho)
        ini = int(m.group(1)) if m.group(1) else 0
        fim = int(m.group(2)) if m.group(2) else tamanho - 1
        fim = min(fim, tamanho - 1)

        if ini > fim or ini >= tamanho:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{tamanho}")
            self.end_headers()
            return None

        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(caminho))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", f"bytes {ini}-{fim}/{tamanho}")
        self.send_header("Content-Length", str(fim - ini + 1))
        self.end_headers()

        f = open(caminho, "rb")
        f.seek(ini)
        self._resto = fim - ini + 1
        return f

    def copyfile(self, origem, destino):
        resto = getattr(self, "_resto", None)
        if resto is None:
            return super().copyfile(origem, destino)
        while resto > 0:
            pedaco = origem.read(min(64 * 1024, resto))
            if not pedaco:
                break
            destino.write(pedaco)
            resto -= len(pedaco)
        self._resto = None

    def end_headers(self):
        # Sem cache no dev: toda alteração aparece no F5
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        # silencia o log de cada arquivo; só mostra erros
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with ThreadingHTTPServer(("", PORTA), ComRange) as s:
        print(f"Site no ar em http://localhost:{PORTA}  (Ctrl+C para parar)")
        try:
            s.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor parado.")
