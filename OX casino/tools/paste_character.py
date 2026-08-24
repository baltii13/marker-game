#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PASTE CHARACTER — gestiona los personajes (PJ) del juego.

Uso:
    python paste_character.py --list              # ver todos los disponibles
    python paste_character.py swat                # registra swat como tu PJ
    python paste_character.py swat --copy         # registra Y copia el bloque al portapapeles

Busca GLB/GLTF en:
    <proyecto>/assets/models/characters/**
    Desktop/OX casino/assets/models/characters/**   (donde sueltan los packs)

El modelo elegido se copia a assets/models/characters/current_player.glb
y el juego lo usa como personaje principal (con fallback al Soldier si falla).
"""
import sys, os, re, glob, shutil, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))          # raiz del proyecto
DESK_OX = os.path.join(os.path.expanduser("~"), "Desktop", "OX casino")
CHAR_DIRS = [
    os.path.join(ROOT, "assets", "models", "characters"),
    os.path.join(DESK_OX, "assets", "models", "characters"),
]
CURRENT = os.path.join(ROOT, "assets", "models", "characters", "current_player.glb")


def fail(msg):
    print("")
    print("  [X] " + msg)
    sys.exit(1)


def human(n):
    for unit in ("B", "KB", "MB"):
        if n < 1024 or unit == "MB":
            return ("%.1f %s" % (n, unit)) if unit != "B" else ("%d B" % n)
        n /= 1024.0


def all_models():
    """[(nombre, ruta)] de cada GLB/GLTF en las carpetas de personajes."""
    out = []
    seen = set()
    for base in CHAR_DIRS:
        for ext in ("*.glb", "*.gltf"):
            for p in glob.glob(os.path.join(base, "**", ext), recursive=True):
                rp = os.path.normpath(p)
                if rp in seen:
                    continue
                seen.add(rp)
                name = os.path.splitext(os.path.basename(p))[0].lower()
                out.append((name, rp))
    return out


def cmd_list():
    models = all_models()
    if not models:
        print("")
        print("  No hay modelos de personaje todavia.")
        print("  Suelta packs en: assets/models/characters/")
        print("  o en: " + DESK_OX + "\\assets\\models\\characters")
        print("")
        return
    active_size = os.path.getsize(CURRENT) if os.path.isfile(CURRENT) else None
    print("")
    print("  PJ DISPONIBLES (%d modelos)" % len(models))
    print("  " + "-" * 44)
    last_dir = None
    for name, path in models:
        d = os.path.basename(os.path.dirname(path))
        if d != last_dir:
            print("  [" + d + "]")
            last_dir = d
        mark = ""
        if active_size is not None and \
           os.path.getsize(path) == active_size and \
           os.path.basename(path) == os.path.basename(CURRENT):
            mark = "   <-- ACTIVO"
        print("    %-22s %10s%s" % (name, human(os.path.getsize(path)), mark))
    print("")
    print("  Usa: python tools/paste_character.py <nombre>")
    print("")


def pick(name_query):
    q = name_query.lower().strip()
    models = all_models()
    if not models:
        fail("No hay modelos registrados. Mira python tools/paste_character.py --list")
    exact = [(n, p) for n, p in models if n == q]
    if exact:
        return exact[0][1], os.path.splitext(os.path.basename(exact[0][1]))[0]
    hits = [(n, p) for n, p in models if q in n]
    if len(hits) == 1:
        return hits[0][1], os.path.splitext(os.path.basename(hits[0][1]))[0]
    if len(hits) > 1:
        lines = "\n".join("      - " + n for n, _ in hits[:12])
        fail("'%s' es ambiguo:\n%s\n      Se mas especifico." % (q, lines))
    similar = sorted({n for n, _ in models},
                     key=lambda n: 0 if q[0] == n[0] else 1)[:8]
    fail("No encuentro '%s'.\n      Parecidos: %s" %
         (q, ", ".join(similar) if similar else "(ninguno)"))


def main():
    args = [a for a in sys.argv[1:]]
    do_copy = "--copy" in args
    pos = [a for a in args if not a.startswith("--")]

    if "--list" in args or (not pos and not do_copy):
        cmd_list()
        return

    src, pretty = pick(pos[0])

    os.makedirs(os.path.dirname(CURRENT), exist_ok=True)
    shutil.copyfile(src, CURRENT)

    # arrastrar la licencia del pack si existe junto al modelo
    for lic in glob.glob(os.path.join(os.path.dirname(src), "..", "*LICENSE*")) + \
               glob.glob(os.path.join(os.path.dirname(src), "LICENSE*")) + \
               glob.glob(os.path.join(os.path.dirname(src), "..", "*", "LICENSE*")):
        if os.path.isfile(lic):
            dst_lic = os.path.join(os.path.dirname(CURRENT),
                                   "LICENSE-current-" + os.path.basename(lic))
            if not os.path.isfile(dst_lic):
                shutil.copyfile(lic, dst_lic)
            break

    print("")
    print("  PJ ACTUALIZADO -> %s (%s)" % (pretty, human(os.path.getsize(CURRENT))))
    print("      El juego lo carga como personaje principal.")
    print("      (quita current_player.glb para volver al Soldier)")

    # regenerar el paquete paste; --copy ademas deja el bloque en portapapeles
    builder = os.path.join(HERE, "paste_builder.py")
    cmd = [sys.executable, builder]
    if do_copy:
        cmd.append("--copy")
    r = subprocess.run(cmd)
    sys.exit(r.returncode if r.returncode else 0)


if __name__ == "__main__":
    main()
