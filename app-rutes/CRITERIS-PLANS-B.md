# Criteris dels plans B (apresos amb en Sergi)

Aquest fitxer recull com vol en Sergi els plans B. Cada vegada que valora uns plans B, o que en dissenya uns de propis, s'hi afegeix el que se n'aprèn i, si es pot, es tradueix en una regla de `CRIT_PB` a `core.js`.

## Principis generals

- **Entre 2 i 4 plans B per ruta, i bons.** Si no n'hi ha prou que compleixin els criteris, se'n proposen menys: cap pla B dubtós només per fer número.
- **Un pla B ha de resoldre un problema real**: arribar tard a la posta o a l'hora objectiu, el mal temps, una persona que no pot seguir, o un pas difícil que no es pot fer.
- **Al costat d'un poble o d'una carretera no cal pla B**: si pel mateix pla A s'arriba en poca estona a un lloc amb accés de vehicles, ja és la sortida.
- **Refugis, sí, però només quan som lluny de tot.** Si hi ha un poble o una carretera a prop, un refugi no aporta res.
- **Tornar enrere (track back) val**, sempre que sigui millor que seguir el pla A: menys temps, i ni més distància ni més desnivell.
- **Una drecera ha d'estalviar temps de veritat.** Estalviar 20 minuts no justifica un pla B.

- **Camí transitat.** Per saber-ho, mirem la capa de Strava. Un camí gens transitat no serveix de pla B encara que sigui més curt.
- **Ha de retallar de veritat.** Ha de ser més curt en temps que el pla A fins al punt segur, el final o la tornada, i no més llarg ni amb més desnivell. Es compara amb les hores límit: un pla B ens ha de garantir arribar a l'objectiu amb seguretat i bé de temps.
- **Res de camins drets o perillosos.** Una drecera amb pendents molt forts (més del 60 %) no és un pla B.

## Patró dels plans B dissenyats per en Sergi (Catllaràs, 28-29/11/2026)

- **Dia 1**
  - B1: arribats al Xalet, ens hi quedem i no fem el bucle.
  - B2: després del mirador, tornem al Xalet.
  - B3: camí per sota del cim fins al Xalet.
  - B4: a la cruïlla de sota el cim, no pugem al P5 ni fem la grimpada.
- **Dia 2**
  - B1: baixada directa a l'inici des del lloc de bivac.
  - B2: des del coll, drecera a la collada (ens saltem tres punts).
  - B3: desviament per pista.

El que tenen en comú:

- Són **retalls del pla A**: ens saltem un bucle, un cim o el pas difícil, i tornem al pla A o anem directes al punt de dormir o al final.
- Surten de **cruïlles clau, just abans del tram exigent**, amb una hora de decisió.
- Cap no és «tornar a l'inici», ni un refugi quan el Xalet ja és el punt de pernocta.

## Valoracions de rutes

### Sant Miquel del Fai · Cingles de Bertí (25/11/2026), versió amb 7 plans B

- B1 (drecera des de P3 tornant pel camí de pujada): absurd.
- B4 (drecera de 22 min al final): absurd.
- B6: no té sentit.
- B7: bo.
- Comentari general: si estem al costat d'un municipi, no té sentit fer-hi un pla B; i millor menys plans B i més bons.

Regles que n'han sortit (`CRIT_PB`):

- `maxPerDia` = 3
- `accesProper` = 20 min
- `dreceraMinH` = 30 min, i `dreceraMinFrac` = 20 %
- `dreceraMaxPlaA` = 50 %
- `refugiSiAccesH` = 1 h
- `vehicleMinGuany` = 30 min

### Sant Miquel del Fai, 2a valoració (25/11/2026)

- El pla B que proposava l'app (drecera des de P4 cap a Riells) passava per un camí gens transitat i perillós. Al model del terreny té una pendent màxima del 78 %.
- Vol entre 2 i 4 plans B per ruta. Tornar enrere també val, si és millor que el pla A.

Regles que n'han sortit:

- `maxPerDia` = 4 i `minPerDia` = 2 (aquest mínim és orientatiu)
- `pendentMax` = 60 %
- `stravaMin` = 0,5 de la intensitat del pla A
- Les tornades enrere s'accepten si són millors que seguir.

Limitació: sense claus de Strava, el heatmap públic només arriba al zoom 12 (uns 30 m per píxel) i no distingeix un corriol poc transitat d'un camí concorregut que passi a tocar. Amb claus (secrets de GitHub o mòbil), es mira al zoom 15.
