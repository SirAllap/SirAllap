#!/usr/bin/env python3
"""Vectoriza el monograma DPR original en piezas para scripts/dpr.mjs.

Cada forma cerrada sale como su propio path (con sus huecos), para que el
generador pueda mover las piezas sueltas por separado. Guarda también los
puntos del borde izquierdo de la D de donde salen las gotas.

  pip install potracer pillow numpy
  python3 scripts/trace_dpr.py <png> [x0,y0,x1,y1]

El recorte es la caja del logo en versión clara (tinta oscura sobre fondo
claro). Escribe assets/dpr-pieces.json.
"""
OUT='assets/dpr-pieces.json'
import json, sys, numpy as np, potrace
from PIL import Image
SRC=sys.argv[1]
im=Image.open(SRC).convert('L').crop(tuple(map(int,sys.argv[2].split(','))) if len(sys.argv)>2 else None)
S=2
im=im.resize((im.width*S,im.height*S),Image.LANCZOS)
a=np.array(im)<120
ys,xs=np.where(a); x0,y0,x1,y1=xs.min(),ys.min(),xs.max(),ys.max()
a=a[y0:y1+1,x0:x1+1]; H,W=a.shape; PAD=10; a=np.pad(a,PAD)
sc=100/H
bm=potrace.Bitmap(~a)
path=bm.trace(turdsize=20,alphamax=1.0,opticurve=True,opttolerance=0.3)
f=lambda p:f"{(p.x-PAD)*sc:.2f} {(p.y-PAD)*sc:.2f}"
subs=[];subs_d=[]
for c in path:
    d="M"+f(c.start_point)
    for s in c.segments:
        if s.is_corner: d+=" L"+f(s.c)+" L"+f(s.end_point)
        else: d+=" C"+f(s.c1)+" "+f(s.c2)+" "+f(s.end_point)
    d+="Z"
    pts=[(c.start_point.x,c.start_point.y)]+[(s.end_point.x,s.end_point.y) for s in c.segments]
    X=[p[0]*sc for p in pts];Y=[p[1]*sc for p in pts]
    subs.append(dict(d=d,bb=(min(X),min(Y),max(X),max(Y))));subs_d.append(d)

def poly(c):
    pts=[((c.start_point.x-PAD)*sc,(c.start_point.y-PAD)*sc)]
    for s_ in c.segments:
        if s_.is_corner: pts.append(((s_.c.x-PAD)*sc,(s_.c.y-PAD)*sc))
        pts.append(((s_.end_point.x-PAD)*sc,(s_.end_point.y-PAD)*sc))
    return pts
def sarea(p): return sum(p[i][0]*p[i-1][1]-p[i-1][0]*p[i][1] for i in range(len(p)))/2
def inside(pt,p):
    x,y=pt;n=len(p);ins=False
    for i in range(n):
        x1,y1=p[i];x2,y2=p[i-1]
        if (y1>y)!=(y2>y) and x<(x2-x1)*(y-y1)/(y2-y1)+x1: ins=not ins
    return ins
P=[poly(c) for c in path]
A=[sarea(p) for p in P]
sign=1 if A[max(range(len(A)),key=lambda i:abs(A[i]))]>0 else -1
outers=[i for i in range(len(P)) if A[i]*sign>0]
groups={i:dict(d=subs_d[i],bb=subs[i]['bb'],area=abs(A[i]),holes=0) for i in outers}
for i in range(len(P)):
    if i in groups: continue
    cands=[o for o in outers if inside(P[i][0],P[o])]
    o=min(cands,key=lambda o:abs(A[o]))
    groups[o]['d']+=subs_d[i]; groups[o]['holes']+=1

# bordes izquierdos del lado deshecho: de ahí salen las gotas
b=a[PAD:-PAD,PAD:-PAD]
em=[]
for y in range(4,H-4,3):
    for x in range(8,int(W*0.42)):
        if b[y,x] and not b[y,x-6:x].any():
            em.append((x*sc,y*sc));break
emit=[]
for p in em:
    if not emit or p[1]-emit[-1][1]>7: emit.append(p)
G=sorted(groups.values(),key=lambda g:-g['area'])
print('size',round(W*sc,1),'x 100; pieces',len(G))
for g in G: print([round(v,1) for v in g['bb']],round(g['area']),g['holes'])
json.dump(dict(w=W*sc,emit=[[round(x,2),round(y,2)] for x,y in emit],pieces=[dict(d=g['d'],bb=g['bb'],area=g['area']) for g in G]),open(OUT,'w'))
