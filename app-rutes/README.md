# Petjada · app de rutes

App web per guiar rutes de senderisme amb clients. Carregues el GPX de la ruta (track i waypoints del roadbook) i l'app calcula al mòbil:

- km, desnivells i temps per trams (3,5 km/h · 300 m/h de pujada · 400 m/h de baixada · +20 %), hores de pas i hores límit a partir de l'hora de sortida i l'hora objectiu d'arribada de cada dia;
- alçades, pendents i obagues/solells amb el model del terreny (teselles Terrarium a AWS);
- plans B sobre els camins d'OpenStreetMap (OpenFreeMap): cap al final, de tornada a l'inici o cap a un accés amb vehicle, només si estalvien temps; amb tipus de camí, pendent màxima i enllaç al heatmap de Strava;
- parades previstes editables per punt (per defecte, primera parada de 10 min al primer punt): compten a les hores previstes, als límits, a «Fins al final» i als plans B;
- plans B amb **hora de decisió**: un pla B només es recomana si, saltant-se'l, ni amb el pla A ni amb un pla B posterior s'arriba a l'hora objectiu; taules de la cruïlla fins al final i arribada des d'on ets;
- mode prova amb hora simulada, descàrrega dels tracks en GPX (pla A i cada pla B);
- pestanya Briefing (guió generat amb les dades de la ruta, amb camps per completar);
- meteo per hores a tres alçades de la ruta (Open-Meteo), sol i ombra, pestanya 112 amb coordenades, protocol i captura del mapa de cobertura del 112.

Amb una clau d'API d'Anthropic (de cada usuari, desada només al seu mòbil), Claude redacta el guió interpretatiu de cada punt, busca els telèfons de la zona i valora els plans B.

Obrir: https://stosalca.github.io/tracks-rutes/app-rutes/
