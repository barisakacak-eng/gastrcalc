from pathlib import Path
import json
R=Path(__file__).resolve().parent.parent;p=R/'css/zeki.css';s=p.read_text();s+='\n'+','.join('.zeki--'+k for k in ['neutral','freude','import','warnung','frage','preis','hilfe','bestaetigt','aufmerksam','erleichtert','fehler'])+'{isolation:isolate}\n';p.write_text(s)
svg=(R/'assets/brand/zeki.svg').read_text()
for f in ['assets/brand/mascot-classic.svg','icons/logo-zeichen.svg']:(R/f).write_text(svg.replace('<svg xmlns=','<svg aria-label="GastroCash" xmlns=',1))
inner=svg[svg.index('>')+1:svg.rindex('</svg>')];logo='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1077 328" class="zeki" data-zeki-zustand="neutral">'+inner+'<text x="266" y="241" font-family="system-ui,sans-serif" font-size="145" font-weight="350" letter-spacing="-5.4" fill="var(--zeki-3d-0)">Gastro<tspan font-weight="800">Cash</tspan></text></svg>'
for f in ['assets/brand/gastrocash-logo.svg','icons/logo.svg']:(R/f).write_text(logo.replace('<svg xmlns=','<svg aria-label="GastroCash" xmlns=',1))
# Keep the original reference in design only.
(R/'assets/brand/zeki-referenz.jpeg').unlink(missing_ok=True)
