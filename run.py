"""Arranca LEVELIFE: python run.py"""
from waitress import serve

from server import config, create_app

if __name__ == "__main__":
    print(f"\n  LEVELIFE listo en http://localhost:{config.PORT}\n")
    # El túnel avisa que la visita llegó por HTTPS; así las cookies de sesión salen protegidas.
    serve(create_app(), host="127.0.0.1", port=config.PORT, threads=8, trusted_proxy="127.0.0.1",
          trusted_proxy_headers={"x-forwarded-proto"}, clear_untrusted_proxy_headers=True)
