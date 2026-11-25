#!/usr/bin/env python3
"""Mapa topogràfic A3 per imprimir (sense la ruta), a escala exacta, amb quadrícula UTM.
Ús: python3 eines/mapa_a3.py --gpx 'catllaras/fitxa/Catllaras_*.gpx' --titol 'Serra del Catllaràs' --sortida out/
"""
import argparse, glob, math, os, re, io, concurrent.futures as cf, urllib.request
from PIL import Image, ImageDraw, ImageFont

# UTM 31N (ETRS89 ≈ WGS84) sense dependències
_a, _f = 6378137.0, 1/298.257222101; _e2 = _f*(2-_f); _ep2 = _e2/(1-_e2); _k0 = 0.9996; _L0 = math.radians(3)
def ll2utm(lat, lon):
  p, l = math.radians(lat), math.radians(lon); N = _a/math.sqrt(1-_e2*math.sin(p)**2); T = math.tan(p)**2; C = _ep2*math.cos(p)**2; A = math.cos(p)*(l-_L0)
  M = _a*((1-_e2/4-3*_e2**2/64-5*_e2**3/256)*p-(3*_e2/8+3*_e2**2/32+45*_e2**3/1024)*math.sin(2*p)+(15*_e2**2/256+45*_e2**3/1024)*math.sin(4*p)-(35*_e2**3/3072)*math.sin(6*p))
  x = _k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*_ep2)*A**5/120)+500000
  y = _k0*(M+N*math.tan(p)*(A*A/2+(5-T+9*C+4*C*C)*A**4/24+(61-58*T+T*T+600*C-330*_ep2)*A**6/720))
  return x, y
def utm2ll(x, y):
  x -= 500000; M = y/_k0; mu = M/(_a*(1-_e2/4-3*_e2**2/64-5*_e2**3/256)); e1 = (1-math.sqrt(1-_e2))/(1+math.sqrt(1-_e2))
  p1 = mu+(3*e1/2-27*e1**3/32)*math.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*math.sin(4*mu)+(151*e1**3/96)*math.sin(6*mu)+(1097*e1**4/512)*math.sin(8*mu)
  N1 = _a/math.sqrt(1-_e2*math.sin(p1)**2); T1 = math.tan(p1)**2; C1 = _ep2*math.cos(p1)**2; R1 = _a*(1-_e2)/(1-_e2*math.sin(p1)**2)**1.5; D = x/(N1*_k0)
  lat = p1-(N1*math.tan(p1)/R1)*(D*D/2-(5+3*T1+10*C1-4*C1*C1-9*_ep2)*D**4/24+(61+90*T1+298*C1+45*T1*T1-252*_ep2-3*C1*C1)*D**6/720)
  lon = _L0+(D-(1+2*T1+C1)*D**3/6+(5-2*C1+28*T1-3*C1*C1+8*_ep2+24*T1*T1)*D**5/120)/math.cos(p1)
  return math.degrees(lat), math.degrees(lon)

MAPES = {
  'ICGC': ('Topogràfic ICGC', 'WMS:https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=topografic&STYLES=&SRS=EPSG:3857&FORMAT=image/png', '© Institut Cartogràfic i Geològic de Catalunya (ICGC), CC BY 4.0'),
  'IGN_MTN': ('Mapa Topográfico Nacional IGN (MTN25)', 'https://www.ign.es/wmts/mapa-raster?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=MTN&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg', '© Instituto Geográfico Nacional (IGN), CC BY 4.0'),
  'IGN_BASE': ('Mapa base IGN', 'https://www.ign.es/wmts/ign-base?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=IGNBaseTodo&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png', '© Instituto Geográfico Nacional (IGN), CC BY 4.0'),
}
R = 6378137.0
def merc(lat, lon): return (R*math.radians(lon), R*math.log(math.tan(math.pi/4+math.radians(lat)/2)))
def unmerc(x, y): return (math.degrees(2*math.atan(math.exp(y/R))-math.pi/2), math.degrees(x/R))

def tile(url, z, x, y):
  u = url.format(z=z, x=x, y=y)
  import time
  for i in range(8):
    try:
      req = urllib.request.Request(u, headers={'User-Agent': 'Petjada-mapa-A3 (stosalca)'})
      with urllib.request.urlopen(req, timeout=40) as r: return Image.open(io.BytesIO(r.read())).convert('RGB')
    except Exception as e: err = e; time.sleep(2+3*i)
  if z > 12:  # tessel·la que el servidor no dona: s'agafa la del nivell de sobre i se n'amplia el quart
    print('  tessel·la fallida', z, x, y, err, '-> nivell', z-1)
    p = tile(url, z-1, x//2, y//2); q = (x % 2)*128, (y % 2)*128
    return p.crop((q[0], q[1], q[0]+128, q[1]+128)).resize((256, 256), Image.LANCZOS)
  print('  tessel·la fallida', z, x, y, err); return Image.new('RGB', (256, 256), (235, 235, 235))

def wms(url, bbox, w, h):
  import time
  u = f'{url}&BBOX={bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}&WIDTH={w}&HEIGHT={h}'
  for i in range(8):
    try:
      req = urllib.request.Request(u, headers={'User-Agent': 'Petjada-mapa-A3 (stosalca)'})
      with urllib.request.urlopen(req, timeout=90) as r: return Image.open(io.BytesIO(r.read())).convert('RGB')
    except Exception as e: err = e; time.sleep(2+3*i)
  raise RuntimeError(f'WMS fallit: {err}')

def osm_camins(s, w, n, e):
  """Corriols i pistes d'OpenStreetMap dins la caixa (graus). Retorna [(tipus, [(lat, lon), ...])]."""
  import json, time, urllib.parse
  q = f'[out:json][timeout:120];way["highway"~"^(path|footway|steps|bridleway|track)$"]({s},{w},{n},{e});out geom;'
  for i in range(6):
    for ep in ('https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'):
      try:
        req = urllib.request.Request(ep, data=urllib.parse.urlencode({'data': q}).encode(), headers={'User-Agent': 'Petjada-mapa-A3 (stosalca)'})
        with urllib.request.urlopen(req, timeout=150) as r: j = json.load(r)
        out = [('pista' if el['tags'].get('highway') == 'track' else 'corriol', [(p['lat'], p['lon']) for p in el.get('geometry', [])]) for el in j.get('elements', [])]
        print(f'  camins OSM: {sum(1 for t, _ in out if t == "corriol")} corriols, {sum(1 for t, _ in out if t == "pista")} pistes ({ep.split("/")[2]})')
        return out
      except Exception as ex: print('  overpass', ep.split('/')[2], ex)
    time.sleep(10+10*i)
  raise RuntimeError("No s'han pogut baixar els camins d'OpenStreetMap")

def linia_disc(d, pts, color, w, on, off):
  """Línia discontínua seguint una polilínia."""
  pen, rest = True, on
  for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
    L = math.hypot(xb-xa, yb-ya); t = 0
    while t < L:
      st = min(rest, L-t); x0, y0 = xa+(xb-xa)*t/L, ya+(yb-ya)*t/L; x1, y1 = xa+(xb-xa)*(t+st)/L, ya+(yb-ya)*(t+st)/L
      if pen: d.line((x0, y0, x1, y1), fill=color, width=w)
      t += st; rest -= st
      if rest <= 1e-6: pen = not pen; rest = on if pen else off

def font(sz, bold=False):
  for f in (['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'] if bold else []) + ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
    if os.path.exists(f): return ImageFont.truetype(f, sz)
  return ImageFont.load_default()

def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--gpx', required=True); ap.add_argument('--titol', required=True); ap.add_argument('--sortida', default='out')
  ap.add_argument('--escala', type=int, default=25000); ap.add_argument('--z', type=int, default=16)
  ap.add_argument('--mapes', default='ICGC,IGN_MTN,IGN_BASE'); ap.add_argument('--osm', type=int, default=1)
  ap.add_argument('--vertical', type=int, default=0); ap.add_argument('--marge', type=int, default=400)
  a = ap.parse_args(); os.makedirs(a.sortida, exist_ok=True)
  la, lo = [], []
  for f in glob.glob(a.gpx):
    for p, q in re.findall(r'lat="([-\d.]+)"\s+lon="([-\d.]+)"', open(f, encoding='utf-8').read()): la.append(float(p)); lo.append(float(q))
  # A3 apaïsat: 420 x 297 mm; marc del mapa 400 x 270 mm (marges per a la impressora i el peu)
  W_MM, H_MM, MX, MT, MB = (297, 420, 10, 10, 17) if a.vertical else (420, 297, 10, 10, 17)
  FW, FH = W_MM-2*MX, H_MM-MT-MB
  pxmm = 300/25.4; DPI = 300                                       # full a 300 ppp
  PW, PH = round(W_MM*pxmm), round(H_MM*pxmm); fw, fh = round(FW*pxmm), round(FH*pxmm)
  mlat = (min(la)+max(la))/2; k = 1/math.cos(math.radians(mlat))  # m de Mercator per m de terreny
  # zona a cobrir (itinerari + 400 m de marge) i fulls que calen, amb 300 m de solapament
  MG, OV = a.marge*k, 300*k
  ax0, ay0 = merc(min(la), min(lo)); ax1, ay1 = merc(max(la), max(lo)); ax0 -= MG; ay0 -= MG; ax1 += MG; ay1 += MG
  SW, SH = FW*a.escala/1000*k, FH*a.escala/1000*k
  NXs = max(1, math.ceil((ax1-ax0-OV)/(SW-OV))); NYs = max(1, math.ceil((ay1-ay0-OV)/(SH-OV)))
  gx = (NXs*(SW-OV)+OV-(ax1-ax0))/2; gy = (NYs*(SH-OV)+OV-(ay1-ay0))/2
  fulls = []
  for r in range(NYs):
    for c in range(NXs):
      x0 = ax0-gx+c*(SW-OV); y1 = ay1+gy-r*(SH-OV); fulls.append((r, c, x0, x0+SW, y1-SH, y1))
  print(f'escala 1:{a.escala} · {DPI} ppp · {len(fulls)} fulls ({NYs} files × {NXs} columnes)')
  CAMINS = []
  if a.osm:
    blo, bla = unmerc(ax0-gx, ay0-gy), unmerc(ax0-gx+NXs*(SW-OV)+OV, ay1+gy)
    CAMINS = osm_camins(blo[0], blo[1], bla[0], bla[1])
  import unicodedata; slug = re.sub(r"[^A-Za-z0-9]+", "_", unicodedata.normalize('NFKD', a.titol).encode('ascii', 'ignore').decode()).strip("_")
  for clau in a.mapes.split(','):
    nom, url, credit = MAPES[clau]
    print('mapa', clau); pagines = []
    for (r, c, x0, x1, y0, y1) in fulls:
      if url.startswith('WMS:'):
        # mapa vectorial: es demana a ~200 ppp perquè els rètols quedin d'una mida llegible en paper, i s'escala a 300 ppp
        wd = 200/25.4; ww, wh = round(FW*wd), round(FH*wd); NX, NY = 4, 3
        mos = Image.new('RGB', (ww, wh)); jobs = {}
        with cf.ThreadPoolExecutor(4) as ex:
          for i in range(NX):
            for j in range(NY):
              px0, px1 = round(ww*i/NX), round(ww*(i+1)/NX); py0, py1 = round(wh*j/NY), round(wh*(j+1)/NY)
              bb = (x0+(x1-x0)*px0/ww, y1-(y1-y0)*py1/wh, x0+(x1-x0)*px1/ww, y1-(y1-y0)*py0/wh)
              jobs[(px0, py0)] = ex.submit(wms, url[4:], bb, px1-px0, py1-py0)
        for (px, py), f in jobs.items(): mos.paste(f.result(), (px, py))
        mapa = mos.resize((fw, fh), Image.LANCZOS)
      else:
        z = a.z
        n = 2**z; res = 2*math.pi*R/n/256
        tx0, tx1 = int((x0+math.pi*R)/res/256), int((x1+math.pi*R)/res/256)
        ty0, ty1 = int((math.pi*R-y1)/res/256), int((math.pi*R-y0)/res/256)
        with cf.ThreadPoolExecutor(8) as ex:
          fut = {(x, y): ex.submit(tile, url, z, x, y) for x in range(tx0, tx1+1) for y in range(ty0, ty1+1)}
        mos = Image.new('RGB', ((tx1-tx0+1)*256, (ty1-ty0+1)*256))
        for (x, y), f in fut.items(): mos.paste(f.result(), ((x-tx0)*256, (y-ty0)*256))
        ox, oy = tx0*256*res-math.pi*R, math.pi*R-ty0*256*res
        cl = round((x0-ox)/res); ct = round((oy-y1)/res)
        mapa = mos.crop((cl, ct, cl+round((x1-x0)/res), ct+round((y1-y0)/res))).resize((fw, fh), Image.LANCZOS)
      d = ImageDraw.Draw(mapa)
      if CAMINS:  # camins d'OSM per sobre: pistes marrons, corriols vermells, discontinus amb vora blanca
        for tipus in ('pista', 'corriol'):
          col = (139, 90, 43) if tipus == 'pista' else (208, 52, 44); wpx = round((0.55 if tipus == 'pista' else 0.45)*pxmm)
          for t2, g in CAMINS:
            if t2 != tipus or len(g) < 2: continue
            pp = [((merc(p, q)[0]-x0)/(x1-x0)*fw, (y1-merc(p, q)[1])/(y1-y0)*fh) for p, q in g]
            if max(x for x, _ in pp) < 0 or min(x for x, _ in pp) > fw or max(y for _, y in pp) < 0 or min(y for _, y in pp) > fh: continue
            d.line(pp, fill=(255, 255, 255), width=wpx+round(0.35*pxmm), joint='curve')
            linia_disc(d, pp, col, wpx, round(2.2*pxmm), round(1.1*pxmm))
      def topx(e, nn):
        lat, lon = utm2ll(e, nn); mx, my = merc(lat, lon)
        return ((mx-x0)/(x1-x0)*fw, (y1-my)/(y1-y0)*fh)
      corners = [unmerc(x0, y0), unmerc(x0, y1), unmerc(x1, y0), unmerc(x1, y1)]
      U = [ll2utm(lat, lon) for lat, lon in corners]
      e0, e1 = int(min(u[0] for u in U)//1000), int(max(u[0] for u in U)//1000)+1
      n0, n1 = int(min(u[1] for u in U)//1000), int(max(u[1] for u in U)//1000)+1
      blau = (30, 90, 200); fl = font(round(2.6*pxmm))
      for e in range(e0, e1+1):
        d.line([topx(e*1000, nn*1000) for nn in (n0, n1)], fill=blau, width=max(2, round(0.25*pxmm)))
        xb = topx(e*1000, (n0+n1)/2*1000)[0]
        if 0 < xb < fw: d.text((xb+4, fh-round(4*pxmm)), f'{e % 100:02d}', font=fl, fill=blau, stroke_width=3, stroke_fill='white')
      for nn in range(n0, n1+1):
        d.line([topx(e*1000, nn*1000) for e in (e0, e1)], fill=blau, width=max(2, round(0.25*pxmm)))
        yb = topx((e0+e1)/2*1000, nn*1000)[1]
        if 0 < yb < fh: d.text((round(1.5*pxmm), yb-round(3.2*pxmm)), f'{nn % 100:02d}', font=fl, fill=blau, stroke_width=3, stroke_fill='white')
      # caixa de títol, escala, nord i esquema de fulls; a la cantonada on tapa menys itinerari
      bw, bh = round(122*pxmm), round(44*pxmm)+(round(6*pxmm) if CAMINS else 0); m6 = round(6*pxmm)
      rp = [((merc(p, q)[0]-x0)/(x1-x0)*fw, (y1-merc(p, q)[1])/(y1-y0)*fh) for p, q in zip(la, lo)]
      cand = [(m6, m6), (fw-bw-m6, m6), (m6, fh-bh-m6), (fw-bw-m6, fh-bh-m6)]
      bx, by = min(cand, key=lambda cc: sum(1 for x, y in rp if cc[0]-50 <= x <= cc[0]+bw+50 and cc[1]-50 <= y <= cc[1]+bh+50))
      d.rectangle((bx, by, bx+bw, by+bh), fill=(255, 255, 255), outline=(30, 30, 30), width=max(2, round(0.3*pxmm)))
      d.text((bx+round(4*pxmm), by+round(3*pxmm)), a.titol, font=font(round(7*pxmm), True), fill=(20, 20, 20))
      nf = r*NXs+c+1
      d.text((bx+round(4*pxmm), by+round(12.5*pxmm)), f'{nom} · 1:{a.escala:,}'.replace(',', '.') + (f' · full {nf} de {len(fulls)}' if len(fulls) > 1 else ''), font=font(round(3.6*pxmm)), fill=(20, 20, 20))
      d.text((bx+round(4*pxmm), by+round(18.5*pxmm)), 'Quadrícula UTM 31N ETRS89 cada 1 km', font=font(round(3.2*pxmm)), fill=blau)
      if CAMINS:
        lx, ly = bx+round(4*pxmm), by+round(38*pxmm); fl2 = font(round(2.8*pxmm))
        for k2, (lab, col) in enumerate((('corriol (OSM)', (208, 52, 44)), ('pista (OSM)', (139, 90, 43)))):
          xx = lx+k2*round(40*pxmm); linia_disc(d, [(xx, ly+round(1.6*pxmm)), (xx+round(10*pxmm), ly+round(1.6*pxmm))], col, round(0.5*pxmm), round(2.2*pxmm), round(1.1*pxmm))
          d.text((xx+round(12*pxmm), ly), lab, font=fl2, fill=(20, 20, 20))
      sb = 1000/a.escala*1000*pxmm; L = 1000 if sb <= 85*pxmm else 500; sb = L/a.escala*1000*pxmm
      sx, sy = bx+round(4*pxmm), by+round(28*pxmm)
      for i in range(2):
        d.rectangle((sx+i*sb/2, sy, sx+(i+1)*sb/2, sy+round(2*pxmm)), fill=(20, 20, 20) if i == 0 else (255, 255, 255), outline=(20, 20, 20), width=2)
      for i, t in enumerate(['0', f'{L//2} m', '1 km' if L == 1000 else '500 m']): d.text((sx+i*sb/2-(0 if i == 0 else round(4*pxmm)), sy+round(2.6*pxmm)), t, font=font(round(2.6*pxmm)), fill=(20, 20, 20))
      if len(fulls) > 1:  # esquema dels fulls, amb aquest en negre
        cw, ch = round(5*pxmm), round(3.4*pxmm); qx = bx+bw-round(5*pxmm)-NXs*cw; qy = by+round(25*pxmm)
        for rr in range(NYs):
          for cc in range(NXs):
            d.rectangle((qx+cc*cw, qy+rr*ch, qx+(cc+1)*cw, qy+(rr+1)*ch), fill=(20, 20, 20) if (rr, cc) == (r, c) else (235, 235, 235), outline=(20, 20, 20), width=2)
            d.text((qx+cc*cw+round(1.2*pxmm), qy+rr*ch+round(0.3*pxmm)), str(rr*NXs+cc+1), font=font(round(2.4*pxmm)), fill=(255, 255, 255) if (rr, cc) == (r, c) else (20, 20, 20))
        axx, ayy = qx-round(9*pxmm), by+round(26*pxmm)
      else:
        axx, ayy = bx+bw-round(12*pxmm), by+round(8*pxmm)
      d.polygon([(axx, ayy), (axx-round(3*pxmm), ayy+round(10*pxmm)), (axx, ayy+round(7*pxmm)), (axx+round(3*pxmm), ayy+round(10*pxmm))], fill=(20, 20, 20))
      d.text((axx-round(1.6*pxmm), ayy+round(10.5*pxmm)), 'N', font=font(round(3.8*pxmm), True), fill=(20, 20, 20))
      # veïns: fletxes als marges amb el número del full contigu
      fv = font(round(3.4*pxmm), True)
      for dr, dc, pos in ((-1, 0, 'n'), (1, 0, 's'), (0, -1, 'o'), (0, 1, 'e')):
        rr, cc = r+dr, c+dc
        if 0 <= rr < NYs and 0 <= cc < NXs:
          t = {'n': '▲', 's': '▼', 'o': '◀', 'e': '▶'}[pos]+f' full {rr*NXs+cc+1}'
          tw = d.textlength(t, font=fv)
          xy = {'n': (fw/2-tw/2, round(2*pxmm)), 's': (fw/2-tw/2, fh-round(7*pxmm)), 'o': (round(2*pxmm), fh/2), 'e': (fw-tw-round(2*pxmm), fh/2)}[pos]
          d.text(xy, t, font=fv, fill=(20, 20, 20), stroke_width=4, stroke_fill='white')
      full = Image.new('RGB', (PW, PH), 'white')
      full.paste(mapa, (round(MX*pxmm), round(MT*pxmm)))
      fd = ImageDraw.Draw(full)
      fd.rectangle((round(MX*pxmm)-2, round(MT*pxmm)-2, round(MX*pxmm)+fw+1, round(MT*pxmm)+fh+1), outline=(20, 20, 20), width=max(3, round(0.4*pxmm)))
      peu = f'{credit} · Imprimir en A3 a mida real (100 %, sense «ajustar a la pàgina») perquè l\'escala sigui 1:{a.escala:,}. Comprova-ho amb la barra d\'escala.'.replace(',', '.')
      if a.vertical:
        p1, p2 = peu.split(' · Imprimir'); fd.text((round(MX*pxmm), round((H_MM-MB+1.5)*pxmm)), p1, font=font(round(2.6*pxmm)), fill=(60, 60, 60)); fd.text((round(MX*pxmm), round((H_MM-MB+5.5)*pxmm)), 'Imprimir'+p2, font=font(round(2.6*pxmm)), fill=(60, 60, 60))
      else: fd.text((round(MX*pxmm), round((H_MM-MB+3)*pxmm)), peu, font=font(round(2.8*pxmm)), fill=(60, 60, 60))
      fd.text((round(MX*pxmm), round((H_MM-MB+(9.5 if a.vertical else 8))*pxmm)), 'Petjada · viatges de senderisme · mapa sense itinerari marcat' + (' · camins © col·laboradors d\'OpenStreetMap (ODbL)' if CAMINS else '') + (' · els fulls se solapen 300 m' if len(fulls) > 1 else ''), font=font(round(2.8*pxmm)), fill=(60, 60, 60))
      pagines.append(full); print(f'  full {nf}')
    fn = os.path.join(a.sortida, f'Mapa_A3_{slug}_{clau}_1-{a.escala:,}.pdf'.replace(',', '.'))
    pagines[0].save(fn, 'PDF', resolution=DPI, quality=85, save_all=True, append_images=pagines[1:])
    print('  desat', fn, os.path.getsize(fn)//1024, 'kB')

if __name__ == '__main__': main()
