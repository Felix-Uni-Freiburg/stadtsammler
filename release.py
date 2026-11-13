#!/usr/bin/env python3
"""Erzeugt index.html, sw.js und version.json für eine neue Version.

Jede Datei bekommt einen Namen mit Fingerabdruck ihres Inhalts (assets/app.3f9a1c2b.js).
So können Startseite und Skripte nach einem Update nie aus verschiedenen Versionen
gemischt werden – auch nicht, wenn der Zwischenspeicher von GitHub Pages noch alte Dateien hat.

Aufruf:  python3 release.py 1.4.1 "Was ist neu (kurz)"
"""
import hashlib, json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
ASSETS = ["vendor/leaflet.css", "styles.css", "vendor/leaflet.js", "germany.js", "cities.js", "app.js"]
STATIC = ["manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"]

def main():
    if len(sys.argv) < 2 or not re.fullmatch(r"\d+\.\d+\.\d+", sys.argv[1]):
        sys.exit('Aufruf: python3 release.py 1.4.1 "Was ist neu"')
    version, notes = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "")
    os.makedirs(os.path.join(ROOT, "assets"), exist_ok=True)
    names = {}
    for rel in ASSETS:
        data = open(os.path.join(ROOT, rel), "rb").read()
        h = hashlib.sha256(data).hexdigest()[:10]
        base, ext = os.path.splitext(os.path.basename(rel))
        out = "assets/%s.%s%s" % (base, h, ext)
        dest = os.path.join(ROOT, out)
        if not os.path.exists(dest):
            with open(dest, "wb") as f: f.write(data)
        names[rel] = out
    html = open(os.path.join(ROOT, "index.template.html"), encoding="utf-8").read()
    html = html.replace("{{VERSION}}", version)
    for rel, out in names.items():
        html = html.replace("{{%s}}" % rel, out)
    left = re.findall(r"\{\{[^}]+\}\}", html)
    if left: sys.exit("Unbekannte Platzhalter in index.template.html: %s" % left)
    open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(html)
    sw = open(os.path.join(ROOT, "sw.template.js"), encoding="utf-8").read()
    sw = sw.replace("{{VERSION}}", version).replace("{{FILES}}", json.dumps(["./"] + list(names.values()) + STATIC))
    open(os.path.join(ROOT, "sw.js"), "w", encoding="utf-8").write(sw)
    json.dump({"version": version, "notes": notes}, open(os.path.join(ROOT, "version.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("Version %s vorbereitet:" % version)
    for rel, out in names.items(): print("  %-20s -> %s" % (rel, out))

if __name__ == "__main__":
    main()
