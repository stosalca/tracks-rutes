// Guió per explicar als clients a cada punt. Els topònims marcats amb (≈) estan situats
// sobre el mapa per coordenades: cal confirmar-los al reconeixement.
const INFO = {
  dia1: {
    'P0': {
      titol: 'Monestir de Santa Maria de Lillet',
      punts: [
        "Antiga canònica romànica, al peu del turó del castell. El conjunt s'ha anat transformant durant segles (romànic, gòtic, barroc), per això costa llegir-ne la planta original.",
        "Fins al segle XIX va ser la parròquia de tota la vall de Lillet (valls de l'Arija i del Llobregat), tot i que la Pobla ja havia crescut com a nucli.",
        "A uns 150 m, una mica més amunt, hi ha Sant Miquel de Lillet (s. XI): una església de planta rodona, una de les poques rotondes romàniques de Catalunya i de les més petites.",
        "La lipsanoteca d'alabastre del monestir (s. X, la capseta on es guardaven relíquies a l'altar) és una peça única: avui es conserva al Museu Comarcal de Manresa.",
        "Vora el torrent de Junyent queden restes del molí del monestir. Aquest torrent l'anirem resseguint demà a la baixada."
      ],
      pregunta: "Per què creieu que una església es faria rodona? (Una interpretació habitual de les rotondes és que evoquen el Sant Sepulcre de Jerusalem; és una forma molt rara en el romànic català.)"
    },
    'P1': {
      titol: 'Castell de la Vila (≈)',
      punts: [
        "Som al peu del turó on hi ha les ruïnes del Castell de Lillet, entre el riu Arija i el torrent de Junyent. Dominava la vall i el camí cap a la Cerdanya.",
        "El 1297 la Pobla va rebre carta de poblament i el poder es va desplaçar al nou castell de la Pobla. Als segles XIV i XV el castell de Lillet ja apareix en decadència.",
        "La masia del Castell de la Vila ja surt documentada el 1573 com una de les cases de la parròquia del monestir.",
        "Primer indici minaire: a peu de la pista cap a la masia hi ha la bocamina de la mina del Castell de la Vila. Avui en veurem moltes més."
      ],
      pregunta: "Mirant el relleu, per què creieu que el castell es va fer aquí i no al fons de la vall?"
    },
    'P2': {
      titol: 'Collet Cerdanà (≈)',
      punts: [
        "Hem pujat uns 400 m des del monestir i el bosc ha canviat: deixem enrere el roure martinenc i el boix dels vessants baixos i entrem a la pineda de pi roig.",
        "Pi roig: es reconeix per l'escorça de color taronja a la part alta del tronc. És l'arbre dominant del Catllaràs.",
        "Fixeu-vos si sota els pins hi creixen faigs joves: és un bosc en transició (ho expliquem a l'apartat de flora).",
        "Bon lloc per fer la primera parada per beure i menjar alguna cosa abans d'arribar al Xalet."
      ]
    },
    'P3': {
      titol: 'Xalet del Catllaràs',
      punts: [
        "Construït entre 1901 i 1908 per encàrrec d'Eusebi Güell, per allotjar els enginyers i tècnics de les mines de carbó del Catllaràs.",
        "Les mines eren de la companyia Asland i el carbó alimentava els forns de la fàbrica de ciment del Clot del Moro (Castellar de n'Hug), també de Güell.",
        "L'autoria de Gaudí es comentava des de 1946. Un estudi encarregat per la Generalitat i fet a la UPC (arquitecte Galderic Santana) l'ha confirmat el 2026, analitzant-ne els arcs, els angles i els materials.",
        "Ben a prop hi havia la mina del Xalet (explotada entre 1906 i 1917). Sota la pista, al costat de la font, queden els murs de la Cantina, que donava servei als miners i on alguns s'hi quedaven a dormir.",
        "Si fem el bucle P4–P5 i tornem a dormir aquí, deixem el material de bivac al Xalet i anem lleugers."
      ],
      pregunta: "Què hi devia fer un edifici de Gaudí al mig del bosc, a 1.366 m?"
    },
    'P4': {
      titol: 'Sota la Roca de la Lluna (≈)',
      punts: [
        "Som a la zona de mines del Catllaràs: la mina del Xalet, les mines del Cable i la mina d'Arderiu queden a pocs centenars de metres.",
        "El carbó (lignit) primer es baixava a bast amb animals. Després Asland va instal·lar un telefèric, «el cable», que el portava fins al tren de Guardiola al Clot del Moro.",
        "La Primera Guerra Mundial va encarir el carbó d'importació i va fer rendibles aquestes mines. El 1922 Asland les va tancar totes.",
        "Molts camins i pistes que trepitgem són d'aquella època minera."
      ]
    },
    'P5': {
      titol: 'Entre el Roc de la Devesa Jussana i la Moreneta (≈) · punt més alt del dia',
      punts: [
        "Aquí arribem al punt més alt de la jornada (1.511 m). Al nord, la gran barrera del Cadí, el Moixeró i el Mogrony. El Catllaràs és una serra prepirinenca que s'aixeca just al sud d'aquesta alineació.",
        "Tota la serra és de roca calcària: sediments que es van dipositar al fons del mar durant el Cretaci superior i l'Eocè, i que després es van plegar i desplaçar amb la formació dels Pirineus.",
        "Espai protegit: és un PEIN des de 1992 i forma part de la Xarxa Natura 2000. Ocupa 5.605 ha entre el Berguedà i el Ripollès.",
        "Fauna: hi és molt abundant el senglar, hi viuen la marta i el cérvol, i algunes espècies pirinenques, com el gall fer, hi són al límit de la seva àrea."
      ],
      pregunta: "Si una serra feta de sediments marins és ara a 1.500 m, què ens explica això de com es van formar els Pirineus?"
    },
    'P6': {
      titol: 'Xalet del Catllaràs (arribada)',
      punts: [
        "Arribada al bivac. Recordeu que el sol es pon a les 17:23 i que a les 17:54 ja és fosc: muntem el bivac amb llum.",
        "Aigua: font del Catllaràs, al costat del Xalet (cal haver-ne verificat el cabal).",
        "Al vespre fa fred. L'aire fred baixa i s'acumula a les fondalades, i aquell punt de més humitat és el que aprofita el faig.",
        "Demà sortim a les 7:45 cap a la vall de l'Ardericó."
      ]
    }
  },
  dia2: {
    'X': {
      titol: 'Xalet del Catllaràs (sortida)',
      punts: [
        "Sortim d'hora i amb fred. Veurem com canvia el bosc segons si caminem per una obaga o per un solell: avui és el dia de la flora.",
        "Passat el Xalet, la pista d'Ardericó passa per la bocamina de la mina d'Arderiu: el pou es va obrir el 1906 i la mina es va explotar entre 1908 i 1922."
      ]
    },
    'P7': {
      titol: "Coll d'Ardericó (≈)",
      punts: [
        "Coll entre la Roca Forcada (1.539 m) i el Collet de la Llena. Canviem de vessant i baixem cap a la vall de l'Ardericó.",
        "La masia d'Arderiu queda just al davant de la Roca Forcada: el cognom Arderiu surt sovint en documents baixmedievals.",
        "Mireu les dues bandes del coll: el contrast entre obaga i solell es veu molt bé."
      ]
    },
    'P8': {
      titol: "Refugi d'Ardericó (≈)",
      punts: [
        "Masia del segle XVII, avui refugi (unes 20 places). És a la Baga d'Ardericó, entre la serra del Catllaràs i la serra de Puig Lluent.",
        "La Gran Enciclopèdia posa l'obaga de l'Ardericó com a exemple perfecte del paisatge de muntanya mitjana: fageda, pineda de pi roig i prat.",
        "Antigament hi havia una avetosa. Avui ha desaparegut i només queden alguns avets dispersos a les obagues.",
        "Prop de la casa hi ha una «trumfera»: una construcció de pedra amb volta de canó per guardar les patates (trumfes).",
        "A l'edat mitjana, els homes de Montclús, Ardericó, Arderiu i Junyent ja tenien drets de pastura en aquesta zona, cosa que els va enfrontar amb el senyor de Mataplana."
      ],
      pregunta: "Què vol dir «baga»? (Obaga: el vessant que mira al nord i rep menys sol.)"
    },
    'P9': {
      titol: 'Obaga del Rec de la Llena (≈)',
      punts: [
        "Bon lloc per explicar la fageda (vegeu l'apartat de flora). El faig necessita humitat tot l'any, plou més de 800–1.000 mm i no hi ha sequera d'estiu: per això el trobem a les obagues i a les fondalades.",
        "Fageda amb boix: és la fageda típica dels sòls calcaris com aquests.",
        "Fixeu-vos que sota la fageda gairebé no hi ha sotabosc: l'ombra és tan densa que només creixen herbes que s'avancen a les fulles a la primavera. És el que en diuen un «bosc-sala».",
        "A finals de novembre el terra està cobert de fulla seca i de fages (el fruit del faig). Molts faigs joves encara conserven la fulla seca a les branques fins a la primavera."
      ]
    },
    'P10': {
      titol: 'Carena del límit Berguedà–Ripollès (≈) · punt més alt del dia',
      punts: [
        "És el punt més alt de la jornada (1.472 m). La carena fa de límit entre el Berguedà i el Ripollès.",
        "A les parts altes del Catllaràs hi ha petits prats culminals d'aspecte subalpí, rars a l'Alt Berguedà.",
        "Les clapes de pi negre (de les més meridionals del país) només apareixen per sobre dels 1.700 m, que no hi arribem.",
        "La fauna del Catllaràs és de transició entre la pirinenca i la mediterrània. Als torrents hi viuen, per exemple, el tritó pirinenc i la granota roja."
      ]
    },
    'P11': {
      titol: 'Collada de Montclús (≈)',
      punts: [
        "Collada a 1.312 m, sota la Tossa de Montclús (1.466 m). Montclús és un dels masos que ja surten als documents medievals de drets de pastura.",
        "Bon lloc per mirar la vall i explicar per què una banda té pinedes i l'altra només fageda (vegeu l'apartat de flora): l'orientació hi té molt a veure, però també què hi ha fet la gent."
      ],
      pregunta: "Per què creieu que a la banda que mira al nord hi ha faig i a la que mira al sud no?"
    },
    'P12': {
      titol: 'Clarianes de la Tossa de Montclús (≈)',
      punts: [
        "Prats i clarianes: són restes dels antics conreus i pastures dels masos.",
        "Des dels anys 1950 la serra s'ha despoblat. Les pastures abandonades les colonitza primer el pi roig, que necessita molta llum. Una pineda jove i uniforme sol voler dir que allà hi havia un camp o una pastura.",
        "Amb els anys, sota aquests pins hi pot entrar el faig o el roure, que toleren l'ombra."
      ]
    },
    'P13': {
      titol: 'Roca del Corb (≈)',
      punts: [
        "Cinglera calcària (1.301 m). Aquí es veu bé la roca de la serra: calcàries d'origen marí.",
        "Baixant, entrem a les zones baixes i assolellades, on apareix la vegetació mediterrània i submediterrània: roure martinenc, boix i pi roig més esclarissat.",
        "Bon lloc per buscar rapinyaires planant sobre la vall (sense garantia!)."
      ]
    },
    'P14': {
      titol: 'Baixada cap al torrent de Junyent (≈)',
      punts: [
        "Recapitulem el que hem vist: la fageda a les obagues, la pineda de pi roig als solells i a les antigues pastures, i el roure i el boix a la part baixa.",
        "El torrent de Junyent baixa fins al monestir, on hi havia el molí. És el mateix torrent que al principi passava al peu del castell.",
        "Aquests boscos s'han tallat durant segles per fer fusta i carbó vegetal i per a les mines: el que veiem avui és un bosc que s'ha anat refent."
      ]
    },
    'P0': {
      titol: 'Monestir de Santa Maria de Lillet (arribada)',
      punts: [
        "Si ahir no hi vam pujar, val la pena acostar-se a Sant Miquel de Lillet, la rotonda romànica, a 150 m.",
        "L'oficina de turisme de la Pobla de Lillet ofereix visites guiades al monestir i a Sant Miquel.",
        "Per acabar, una idea per als clients: el Clot del Moro (el museu del ciment, la fàbrica on anava el carbó del Catllaràs) i els Jardins Artigas de Gaudí són a pocs quilòmetres."
      ]
    }
  }
};

const FLORA = {
  titol: 'Per què fagedes aquí i pinedes allà?',
  intro: "Al Catllaràs domina el pi roig, però a les obagues i a les fondalades hi ha fagedes amb boix. La diferència entre una banda i l'altra de la vall s'explica per quatre factors que actuen alhora:",
  factors: [
    ['1 · Orientació (obaga i solell)', "El faig vol humitat constant: plujes abundants, boires i, sobretot, cap sequera a l'estiu. A les obagues (cara nord) toca menys el sol, s'evapora menys aigua i el sòl es manté humit, i allà el faig hi guanya. Als solells (cara sud) fa més calor i més sequera: hi va millor el pi roig, que aguanta més l'eixut, juntament amb el roure martinenc i el boix. Per això d'una vessant a l'altra de la mateixa vall el bosc canvia tant."],
    ['2 · Llum i ombra (la successió)', "El pi roig és un arbre de llum: per germinar i créixer necessita espais oberts. El faig, en canvi, tolera l'ombra quan és jove. Per això sota molts pins hi veiem faigs petits. Quan els pins vells moren, si el clima ho permet, el faig ocupa el seu lloc. Una pineda amb faigs a sota és un bosc en transició; una fageda pura és el bosc «final» de les obagues."],
    ['3 · Una fageda no deixa créixer res a sota', "El faig fa una ombra tan densa que el sotabosc és molt pobre: troncs grisos i llisos, terra cobert de fulles i poca cosa més. És un «bosc-sala». La pineda deixa passar més llum, i a sota hi creix boix, ginebre i herbes."],
    ['4 · La mà de l\'home', "Durant segles aquests boscos s'han tallat per obtenir fusta, carbó vegetal i fusta per a les mines, i s'hi han obert camps i pastures. Sovint s'ha afavorit el pi, que creix de pressa i és productiu. Des dels anys 1950 la serra s'ha despoblat i el pi roig ha colonitzat les pastures abandonades. A més, hi havia avets (l'antiga avetosa de l'Ardericó) que han desaparegut. Una vall amb fageda neta pot ser una obaga que s'ha tallat menys o que ha tingut temps de refer-se, i la de davant, una antiga zona de pastures."]
  ],
  reconeixer: [
    "Faig: escorça llisa i grisa, fulla ovalada de vora ondulada, fruit (fages) amb closca punxeguda. Al novembre fa una catifa de fulla marró, i els faigs joves conserven la fulla seca a les branques.",
    "Pi roig: escorça grisa i esquerdada a baix i de color taronja a la part alta del tronc; agulles curtes de dues en dues, sovint lleugerament torçades.",
    "Boix: arbust de fulla petita, perenne i lluent, típic dels sòls calcaris; acompanya tant la fageda com la pineda.",
    "Pi negre: només per sobre dels 1.700 m, en clapes (no el veurem en aquesta ruta)."
  ],
  fonts: "Fonts: Història Natural dels Països Catalans (Enciclopèdia Catalana); Inventari del Patrimoni Cultural Local de la Diputació de Barcelona (fitxes de la Pobla de Lillet); Generalitat de Catalunya / UPC (atribució del Xalet a Gaudí, 2026)."
};
