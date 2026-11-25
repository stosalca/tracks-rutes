# Petjada · app de rutes

App web per guiar rutes de senderisme amb clients. Carregues el GPX de la ruta (track i waypoints del roadbook) i l'app calcula al mòbil:

- km, desnivells i temps per trams (3,5 km/h · 300 m/h de pujada · 400 m/h de baixada · +20 %), hores de pas i hores límit a partir de l'hora de sortida i l'hora objectiu d'arribada de cada dia;
- mapa base a triar (es poden activar diversos): topogràfic ICGC (Catalunya), topogràfic IGN MTN, mapa base IGN i ortofoto PNOA (tot Espanya); per defecte l'ICGC a Catalunya i l'IGN fora;
- alçades, pendents i obagues/solells amb el model del terreny (teselles Terrarium a AWS);
- plans B sobre els camins d'OpenStreetMap (OpenFreeMap): cap al final, de tornada a l'inici o cap a un accés amb vehicle, només si estalvien temps; amb tipus de camí, pendent màxima i enllaç al heatmap de Strava;
- si el GPX no porta waypoints, l'app en posa sola: cims, colls, refugis i fonts d'OpenStreetMap a tocar del track, peu i dalt de les pujades fortes, inici de les baixades fortes, punts de descans perquè cap tram passi d'1 h 15 i un punt a cada cruïlla de pla B (prova: eines/prova-auto.html?gpx=…);
- plans B cap a refugis propers (per fer-hi nit o protegir-se), a més de dreceres, tornada a l'inici i sortides a pista o carretera;
- parades previstes editables per punt (per defecte, primera parada de 10 min al primer punt): compten a les hores previstes, als límits, a «Fins al final» i als plans B;
- plans B amb **hora de decisió**: un pla B només es recomana si, saltant-se'l, ni amb el pla A ni amb un pla B posterior s'arriba a l'hora objectiu; taules de la cruïlla fins al final i arribada des d'on ets;
- mode prova amb hora simulada, descàrrega dels tracks en GPX (pla A i cada pla B);
- pestanya Briefing (guió generat amb les dades de la ruta, amb camps per completar);
- meteo per hores a tres alçades de la ruta (Open-Meteo), sol i ombra, pestanya 112 amb coordenades, protocol i captura del mapa de cobertura del 112.

Amb una clau d'API d'Anthropic (de cada usuari, desada només al seu mòbil), Claude redacta el guió interpretatiu de cada punt, busca els telèfons de la zona i valora els plans B.

Obrir: https://stosalca.github.io/tracks-rutes/app-rutes/

## Ruta nova des del xat amb Claude (sense clau d'API)

1. Passes el GPX (track + waypoints) a Claude al xat, amb el nom de la ruta, les dates, l'hora de sortida i l'hora objectiu d'arribada de cada dia.
2. Claude crea `rutes/entrada/<carpeta>/` amb el GPX, `ruta.json` (nom, dies, dates, hores) i `guio.json`, on hi ha, buscat a fonts fiables:
   - `zona`: informació d'interès de la zona (espai protegit i normativa, geologia, història, restriccions d'accés);
   - `fils` i `filDia`: 1 o 2 fils conductors que travessen la ruta, amb color i introducció;
   - `punts`: guió de cada punt (frases curtes, `fil` que treballa, `pregunta` per al grup);
   - `tels`, `acces`, `notaTels`: telèfons de la zona i accés de vehicles i ambulàncies;
   - `plansB`: valoració de cada pla B.
3. En fer push, la tasca de GitHub `rutes.yml` calcula trams, plans B, alçades i vessants i publica la ruta; l'app la baixa sola a «Rutes».
4. La meteo (previsió punt per punt, avisos de l'AEMET, radar i fronts) la calcula l'app a partir de les coordenades: no cal preparar-la.
