#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PASTE BUILDER — empaqueta el juego en un bloque de texto compartible.

Uso:
    python paste_builder.py [ruta\a\otro\juego.html]

Sin argumento busca MARKER.html en la raíz del proyecto.
Genera en ../paste/ :
    MARKER_bloque.txt   <- UN bloque unico para copiar/pegar (chat, nota, foro)
    demo.html           <- doble clic y juega (identico al original)
    LEEME.txt           <- instrucciones en cristiano
"""
import sys, os, re, hashlib, datetime, shutil, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
# tools/ -> "OX casino"/ -> raiz del proyecto (donde vive MARKER.html)
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, "..", "paste")
OUT = os.path.normpath(OUT)

CLIPBOARD_HINT = (
    "  [i] El bloque NO se pudo copiar automatico.\n"
    "      Abre paste\\MARKER_bloque.txt, Ctrl+A, Ctrl+C."
)


def copy_to_clipboard_windows(text):
    """Copia al portapapeles en Windows. Devuelve True si funciono."""
    try:
        import ctypes
        CF_UNICODETEXT = 13
        GMEM_MOVEABLE = 0x0002
        k32 = ctypes.windll.kernel32
        u32 = ctypes.windll.user32
        data = text.encode("utf-16-le")
        u32.OpenClipboard(0)
        try:
            u32.EmptyClipboard()
            h = k32.GlobalAlloc(GMEM_MOVEABLE, len(data) + 2)
            p = k32.GlobalLock(h)
            ctypes.memmove(p, data + b"\x00\x00", len(data) + 2)
            k32.GlobalUnlock(h)
            u32.SetClipboardData(CF_UNICODETEXT, h)
        finally:
            u32.CloseClipboard()
        return True
    except Exception:
        pass
    try:  # Git Bash / WSL fallbacks
        for cmd in (["clip.exe"], ["wl-copy"], ["pbcopy"]):
            r = subprocess.run(cmd, input=text.encode("utf-8"),
                               capture_output=True)
            if r.returncode == 0:
                return True
    except Exception:
        pass
    return False


def fail(msg):
    print("")
    print("  [X] " + msg)
    sys.exit(1)


def human(n):
    for unit in ("B", "KB", "MB"):
        if n < 1024 or unit == "MB":
            return ("%.1f %s" % (n, unit)) if unit != "B" else ("%d B" % n)
        n /= 1024.0


def main():
    args = sys.argv[1:]
    do_copy = "--copy" in args
    pos = [a for a in args if not a.startswith("--")]

    src = os.path.join(ROOT, "MARKER.html")
    if pos:
        candidate = os.path.abspath(pos[0])
        ext = os.path.splitext(candidate)[1].lower()
        if ext in (".glb", ".gltf"):
            # CUALQUIER modelo: copiarlo al proyecto y usarlo como casa del mapa
            houses_dir = os.path.join(ROOT, "assets", "models", "houses")
            if not os.path.isfile(candidate):
                fail("No encuentro el modelo: " + candidate)
            os.makedirs(houses_dir, exist_ok=True)
            dst = os.path.join(houses_dir, "house_custom" + ext)
            shutil.copyfile(candidate, dst)
            lic = os.path.join(os.path.dirname(candidate), "LICENSE*.txt")
            import glob as _g
            for lf in _g.glob(lic):
                shutil.copyfile(lf, os.path.join(
                    houses_dir, "LICENSE-custom-" + os.path.basename(lf)))
            print("")
            print("  MODELO REGISTRADO -> assets/models/houses/"
                  + os.path.basename(dst))
            print("      El juego lo usara como casa en las parcelas bajas.")
            src = os.path.join(ROOT, "MARKER.html")   # sigue empaquetando el juego
        elif ext in (".html", ".htm"):
            src = candidate
        else:
            fail("Extension no reconocida: " + ext +
                 "\n      Pasa un .html (juego) o .glb/.gltf (modelo de casa).")
    src = os.path.abspath(src)

    print("")
    print("  OX CASINO - PASTE BUILDER")
    print("  -------------------------")

    if not os.path.isfile(src):
        fail("No encuentro el juego: " + src +
             "\n      Arrastra el .html sobre PASTE_CASA.bat o revisa la ruta.")

    raw = open(src, "rb").read()
    try:
        html = raw.decode("utf-8")
    except UnicodeDecodeError:
        html = raw.decode("utf-8", errors="replace")

    # --- validaciones basicas: que sea el juego y no un archivo roto ---
    checks = {
        "canvas del juego": 'id="c"' in html,
        "titulo MARKER":    "MARKER" in html[:4000],
        "cierre </html>":   "</html>" in html[-400:].lower(),
        "script principal": re.search(r"<script>\s*\(function\(\)\{", html) is not None,
    }
    broken = [k for k, ok in checks.items() if not ok]
    if broken:
        fail("El archivo no parece el juego completo. Falta: " + ", ".join(broken))

    m_title = re.search(r"<title>(.*?)</title>", html)
    title = (m_title.group(1).strip() if m_title else "MARKER")
    size = len(raw)
    sha = hashlib.sha1(raw).hexdigest()[:10]
    today = datetime.date.today().strftime("%d/%m/%Y")

    os.makedirs(OUT, exist_ok=True)

    # ¿que modelo de casa usa el juego ahora mismo?
    houseLib_note = None
    m_house = re.search(r"HOUSE_URL\s*=\s*'([^']+)'", html)
    if m_house:
        hp = os.path.join(ROOT, m_house.group(1).replace("/", os.sep))
        houseLib_note = (os.path.basename(m_house.group(1)) +
                         (" (" + human(os.path.getsize(hp)) + ")" if os.path.isfile(hp) else " (falta)"))

    # ---------- 1) EL BLOQUE ----------
    # valla mas larga que cualquier secuencia de backticks del contenido
    longest = 0
    for run in re.findall(r"`+", html):
        longest = max(longest, len(run))
    fence = "`" * max(3, longest + 1)

    block_body = fence + "html\n" + html.rstrip() + "\n" + fence + "\n"

    header = (
        "=" * 46 + "\n"
        "  OX CASINO * PASTE - " + today + "\n"
        "  " + title + "\n"
        "  juego completo en UN solo archivo\n"
        + "-" * 46 + "\n"
        "  COMO USARLO\n"
        "  1) copia TODO el bloque de aqui abajo\n"
        "  2) pégalo en un archivo nuevo: MARKER.html\n"
        "     (bloc de notas -> guardar como -> MARKER.html)\n"
        "  3) doble clic para jugar (pide internet la 1a vez)\n"
        "=" * 46 + "\n\n"
    )
    block_path = os.path.join(OUT, "MARKER_bloque.txt")
    with open(block_path, "w", encoding="utf-8") as f:
        f.write(header)
        f.write(block_body)

    # ---------- 2) DEMO JUGABLE ----------
    demo_path = os.path.join(OUT, "demo.html")
    with open(demo_path, "w", encoding="utf-8", newline="") as f:
        f.write(html)

    # ---------- 3) LEEME ----------
    leeme = f"""\
==================================================
  OX CASINO - {title}
  generado el {today} * hash {sha} * {human(size)}
==================================================

QUE ES ESTO
  Un juego completo de mundo abierto (estilo Schedule 1 x casino)
  metido en UN SOLO archivo .html. Sin instalacion, sin cuentas,
  sin servidor. Se genera automaticamente desde el proyecto con
  PASTE_CASA.bat.

ARCHIVOS DE ESTA CARPETA
  MARKER_bloque.txt   El juego entero dentro de un bloque de texto.
                      Para compartirlo por chat, nota o foro.
  demo.html           El juego listo para jugar: doble clic y ya.
  LEEME.txt           Este archivo.

COMO JUGAR EL DEMO
  1) Doble clic en demo.html (Chrome / Edge / Firefox).
  2) La primera vez necesita internet (descarga el motor 3D).
  3) Click en la pantalla para capturar el raton. ESC lo suelta.

CONTROLES
  WASD ......... moverte        SHIFT ...... correr
  RATON ........ camara         V .......... 1a persona / 3a persona
  E ............ interactuar (entrar, comprar, hablar, conducir)
  Rueda ........ zoom de camara M .......... silenciar
  ESC .......... soltar raton / cerrar panel
  En el coche: W acelera, S frena/atras, A D giran.

COMO USAR EL BLOQUE (MARKER_bloque.txt)
  1) Abre MARKER_bloque.txt y copia desde la valla ```html
     hasta la valla de cierre (TODO).
  2) Pegalo en el bloc de notas y guarda como MARKER.html
     (tipo: todos los archivos, codificacion: UTF-8).
  3) Doble clic. Listo.

REQUISITOS
  - Navegador moderno con WebGL.
  - Internet la primera vez (CDN de three.js y modelos GLTF).
  - Equipo modesto: usa QUALITY > LOW en el menu inicial.

PROBLEMAS
  - Pantalla negra -> mira si hay texto de error; casi siempre es
    falta de internet o WebGL desactivado.
  - Va lento -> QUALITY LOW (menu inicial).
  - El sonido no suena -> haz un click en la pagina (regla del navegador).

Generado por tools/paste_builder.py * no editar a mano.
"""
    leeme_path = os.path.join(OUT, "LEEME.txt")
    with open(leeme_path, "w", encoding="utf-8") as f:
        f.write(leeme)

    # ---------- resumen ----------
    b = os.path.getsize(block_path)
    d = os.path.getsize(demo_path)
    l = os.path.getsize(leeme_path)
    print("  fuente : " + os.path.basename(src) + " (" + human(size) + ", sha " + sha + ")")
    if houseLib_note:
        print("  casas  : " + houseLib_note)
    print("  OK -> paste/MARKER_bloque.txt  " + human(b))
    print("  OK -> paste/demo.html          " + human(d))
    print("  OK -> paste/LEEME.txt          " + human(l))
    print("")
    if do_copy:
        block_text = header + block_body
        if copy_to_clipboard_windows(block_text):
            print("  📋 COPIADO AL PORTAPAPELES — pega donde quieras (Ctrl+V).")
        else:
            print(CLIPBOARD_HINT)
        print("")
    print("  Comparte MARKER_bloque.txt, o manda demo.html directo.")
    print("")


if __name__ == "__main__":
    main()
