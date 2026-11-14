"""Baut SVG und Bewegungsfolgen aus der gesicherten 3D-Quelle. Nur Entwicklung."""
import pathlib,subprocess,sys
R=pathlib.Path(__file__).resolve().parent.parent
for name in ['zeki_front_3d.py','zeki_rendern.py','zeki_marke.py']:subprocess.run([sys.executable,str(R/'tools'/name)],check=True,cwd=R)
