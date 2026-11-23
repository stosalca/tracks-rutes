// Guió per explicar als clients a cada punt, organitzat en dos fils conductors:
// dia 1 · Güell, Asland i el carbó del Catllaràs · dia 2 · el bosc: fageda a l'obaga, pineda al solell.
// fil: 'guell' (fil del dia 1), 'bosc' (fil del dia 2). Un punt pot tocar tots dos.
const FILS = {
  guell: { nom: 'Fil · Güell, Asland i el carbó', col: '#8a5a2b',
    intro: "Eusebi Güell funda Asland el 1901 i construeix al Clot del Moro la primera fàbrica de ciment pòrtland del país. Per fer anar els forns necessita carbó: el treu de les mines del Catllaràs, el baixa amb telefèrics i hi aixeca un xalet per als enginyers, projectat per Gaudí. Avui caminem per aquest paisatge industrial." },
  bosc: { nom: 'Fil · Fageda o pineda?', col: '#3b7a3a',
    intro: "Al Catllaràs, on mira el vessant decideix el bosc: a l'obaga (nord, humida) hi ha fageda; al solell (sud, sec) hi ha pineda de pi roig. A finals de novembre el contrast és màxim: la fageda ja és marró i coure, o pelada, i la pineda segueix verda. El veurem sobretot entre P9 (fageda) i P10–P11 (pinedes)." }
};

const INFO = {
  dia1: {
    'P0': {
      titol: 'Monestir de Santa Maria de Lillet', fil: ['guell'],
      punts: [
        "Presentem el fil del dia: avui seguim el rastre d'Eusebi Güell. Industrial i mecenes de Gaudí, el 1901 va fundar a Barcelona la Companyia General d'Asfalts i Pòrtland Asland.",
        "La seva primera fàbrica, al Clot del Moro (Castellar de n'Hug, a frec de la Pobla), va ser la primera del país que va produir ciment pòrtland. Va començar a funcionar el 1903–1904 i va tancar el 1975.",
        "Per què aquí? Hi havia la pedra calcària per fer el ciment, l'aigua del Llobregat per moure les màquines i el carbó de la serra del Catllaràs per als forns. Només hi faltava el transport: per això es va fer el tren de Guardiola (avui el Tren del Ciment).",
        "En els seus millors anys, cap als anys 1950, la fàbrica produïa unes 80.000 tones de ciment l'any. Asland va arribar a ser durant anys la primera cimentera de l'Estat.",
        "I el monestir? Antiga canònica romànica, transformada durant segles. A 150 m hi ha Sant Miquel de Lillet (s. XI), una de les poques rotondes romàniques de Catalunya."
      ],
      pregunta: "Què creieu que necessitava una fàbrica de ciment el 1901 per funcionar enmig de la muntanya? (Pedra calcària, aigua i carbó: tot era aquí; el que faltava era el transport.)"
    },
    'P1': {
      titol: 'Castell de Lillet', fil: ['guell', 'bosc'],
      punts: [
        "Som al peu del turó on hi ha les ruïnes del Castell de Lillet, entre el riu Arija i el torrent de Junyent. Dominava la vall; el 1297 el poder es va desplaçar al nou castell de la Pobla.",
        "Primer rastre miner del dia: a peu de la pista cap a la masia del Castell de la Vila hi ha la bocamina de la mina del Castell de la Vila. Asland va comprar moltes mines de la zona a partir de 1901.",
        "Avís de bosc (fil de demà): aquí baix, al solell, dominen el roure martinenc, el boix i el pi roig esclarissat. A mesura que pugem, el bosc anirà canviant."
      ],
      pregunta: "Mirant el relleu, per què creieu que el castell es va fer aquí i no al fons de la vall?"
    },
    'P2': {
      titol: 'Encreuament del Xalet', fil: ['guell'],
      punts: [
        "Hem pujat uns 380 m. Som a la pista que porta al Xalet: molts camins i pistes que trepitgem són de l'època minera.",
        "Una mica més amunt, per sota de la pista i a l'alçada del torrent de les mines, hi ha la mina del Cable i les restes del telefèric. D'aquí sortia «el cable»: el telefèric general d'Asland.",
        "El cable feia 2.013 m i salvava 444 m de desnivell fins a l'estació de «l'Empalme», on el carbó passava als vagons del tren de Guardiola i anava fins al Clot del Moro.",
        "Abans del telefèric, el carbó es baixava a bast, amb animals. Després, des de les altres mines s'hi arribava amb vagonetes, pous i telefèrics petits (el de la Roca de la Lluna i el del Teixó).",
        "Bon lloc per beure i menjar alguna cosa abans d'arribar al Xalet."
      ],
      pregunta: "Com baixaríeu tones de carbó des d'aquí fins a la fàbrica, sense carretera?"
    },
    'P3': {
      titol: 'Xalet del Catllaràs', fil: ['guell'],
      punts: [
        "Construït entre 1901 i 1908, alhora que la fàbrica d'Asland, per allotjar els tècnics i enginyers de les mines que proveïen de carbó el Clot del Moro.",
        "Gaudí: l'autoria es comentava des de 1946. El febrer del 2026, en l'Any Gaudí, un estudi de Galdric Santana (Càtedra Gaudí, UPC), encarregat pel Departament de Cultura, l'ha confirmat: hi ha solucions, com l'arc parabòlic i la forma de funicular, que només feia servir Gaudí.",
        "Segons l'estudi, Gaudí no el va reivindicar mai perquè el resultat construït no era el que ell havia dibuixat. Va coincidir amb la Casa Batlló i el Park Güell.",
        "Mentre treballava en el Xalet, Gaudí es va allotjar a casa de la família Artigas, a la Pobla. En agraïment, va dissenyar els Jardins Artigas.",
        "Al costat hi havia la mina del Xalet. Sota la pista, vora la font, queden els murs de la Cantina, que donava servei als miners (alguns hi dormien).",
        "Deixem el material de bivac i fem el bucle lleugers."
      ],
      pregunta: "Per què un industrial com Güell faria dissenyar a Gaudí un allotjament per a enginyers enmig del bosc?"
    },
    'P4': {
      titol: 'Roc de la Lluna', fil: ['guell', 'bosc'],
      punts: [
        "Mirador: vistes al Pedraforca, l'Ensija i el Cadí-Moixeró. Bon moment per situar la vall del Llobregat i, cap al nord, la zona del Clot del Moro.",
        "Aquí arribava una de les cadenes del carbó: des de les mines del Teixó i de Font Freda, el carbó venia amb vagonetes sobre rails fins a la Roca de la Lluna. D'aquí, un telefèric el portava fins al cable general.",
        "Les mines van tenir el seu moment més rendible amb la Primera Guerra Mundial, que va encarir el carbó d'importació. El 1922 Asland va tancar totes les mines del Catllaràs.",
        "Avís de bosc: des d'aquí es veu bé com, als vessants que miren al nord, el bosc és més fosc i dens, i als que miren al sud, més clar. Demà ho veurem de prop."
      ]
    },
    'P5': {
      titol: 'Roca del Joc de Pilota · punt més alt del dia', fil: ['guell'],
      punts: [
        "Cim de la Roca del Joc de Pilota o Roca de la Devesa Jussana (1.615 m), el punt més alt de la jornada. A dalt hi ha una creu de ferro i una imatge de la Mare de Déu de Montserrat; per això també en diuen Roc de la Moreneta.",
        "El nom ve del prat del costat, el Joc de Pilota: segons la tradició, hi jugaven a pilota els enginyers estrangers (anglesos, diuen a la zona) de les mines i del Xalet.",
        "A prop hi ha les mines del Moreno (1908–1920), el pou del Moreno i la mina de Font Freda (1911–1922): un complex sistema de galeries, pous, vies i telefèrics per baixar el carbó.",
        "Geologia: tota la serra és calcària d'origen marí, plegada amb la formació dels Pirineus. És la mateixa roca que feia servir la fàbrica per fer ciment.",
        "Tanquem el fil del dia: de la roca al ciment, del carbó al forn, i Güell i Gaudí al mig. Espai protegit (PEIN des de 1992 i Xarxa Natura 2000)."
      ],
      pregunta: "Si aquesta serra és feta de sediments marins i ara és a 1.600 m, què ens explica de com es van formar els Pirineus?"
    },
    'P6': {
      titol: 'Xalet del Catllaràs (arribada)', fil: ['guell', 'bosc'],
      punts: [
        "Arribada al bivac, al costat del Xalet on dormien els enginyers fa més de cent anys. El sol es pon a les 17:23 i a les 17:54 ja és fosc: muntem amb llum.",
        "Aigua: Font del Catllaràs, al costat del Xalet.",
        "Avançament per a demà: al vespre l'aire fred baixa i s'acumula a les fondalades. Aquesta humitat és la que aprofita el faig, que demà trobarem a les obagues.",
        "Demà sortim a les 7:45 cap a la vall de l'Ardericó."
      ]
    }
  },
  dia2: {
    'X': {
      titol: 'Xalet del Catllaràs (sortida)', fil: ['bosc', 'guell'],
      punts: [
        "Presentem el fil del dia: el bosc. Al Catllaràs, on mira el vessant decideix l'arbre. A l'obaga (cara nord, ombrívola i humida) hi ha fageda; al solell (cara sud, assolellada i seca) hi ha pineda de pi roig.",
        "A finals de novembre és el millor moment per veure-ho: la fageda és marró i coure, o ja sense fulla, i la pineda segueix verda tot l'hivern.",
        "Últim rastre miner: passat el Xalet, la pista d'Ardericó passa per la mina i el pou d'Arderiu (pou 1906–1917, mina 1908–1922)."
      ]
    },
    'P7': {
      titol: "Coll d'Ardericó", fil: ['bosc'],
      punts: [
        "Coll entre la Roca Forcada i el Collet de la Llena. Canviem de vessant i baixem cap a la vall de l'Ardericó.",
        "Primer exercici d'observació: mireu les dues bandes del coll. Quina banda és més fosca i densa? Quina té més pins? Busqueu-hi el sol.",
        "Truc per reconèixer-los de lluny a la tardor: el faig fa taques marrons, coure o grises (si ja ha perdut la fulla); el pi roig fa taques verd fosc."
      ],
      pregunta: "Cap on mira cada vessant? On creieu que hi haurà més faigs?"
    },
    'P8': {
      titol: "Casa refugi d'Ardericó", fil: ['bosc'],
      punts: [
        "Masia del s. XVII, avui refugi. És a la Baga d'Ardericó: «baga» vol dir obaga, el vessant que mira al nord.",
        "La Història Natural dels Països Catalans posa aquesta obaga de l'Ardericó com a mostra perfecta del paisatge de muntanya mitjana: fageda, pineda de pi roig i prat.",
        "Antigament hi havia avets; avui només en queden alguns de dispersos a les obagues.",
        "La gent també ha fet el bosc: a l'edat mitjana els masos ja tenien drets de pastura aquí, i durant segles s'hi ha tallat fusta i fet carbó vegetal."
      ],
      pregunta: "Què vol dir «baga»? Per què creieu que la casa té aquest nom?"
    },
    'P9': {
      titol: 'Pleta de les Vaques · la fageda', fil: ['bosc'],
      punts: [
        "Som a l'obaga (cara nord): aquí manen els faigs. El faig necessita humitat tot l'any i no tolera la sequera d'estiu; a l'obaga hi arriba menys sol, s'evapora menys aigua i la boira i la rosada duren més.",
        "És una fageda amb boix, la típica dels sòls calcaris com aquests.",
        "Bosc-sala: sota els faigs gairebé no hi ha sotabosc. L'ombra d'estiu és tan densa que només hi creixen herbes que floreixen a la primavera, abans que el faig tregui la fulla.",
        "Tardor: el terra és una catifa de fulla marró i de fages (el fruit). Els faigs joves sovint guarden la fulla seca a les branques fins a la primavera (fulla marcescent).",
        "Reconeixeu-lo: escorça llisa i grisa, com pell d'elefant. «Pleta» vol dir el clos on es guardava el bestiar: aquí també hi ha hagut pastures."
      ],
      pregunta: "Per què creieu que sota la fageda gairebé no creix res?"
    },
    'P10': {
      titol: 'Pla Fondo de Baix · punt més alt del dia', fil: ['bosc'],
      punts: [
        "Punt més alt de la jornada. Hem sortit de l'obaga: aquí el vessant mira al sud-est i el bosc canvia de cop.",
        "Pi roig: escorça de color taronja a la part alta del tronc i fulla perenne (agulles en parelles). Aguanta millor la sequera i el sol, i per això guanya al solell.",
        "Contrast de tardor: girem-nos i mirem enrere cap a l'obaga que acabem de deixar. Marró i coure de la fageda contra el verd fosc de la pineda.",
        "A les parts altes del Catllaràs hi ha petits prats culminals d'aspecte subalpí, rars a l'Alt Berguedà."
      ],
      pregunta: "Quines diferències veieu entre aquest bosc i el de P9 (llum, terra, sotabosc, color)?"
    },
    'P11': {
      titol: 'Collada de Montclús · les pinedes', fil: ['bosc'],
      punts: [
        "Collada sota la Tossa de Montclús. El camí que ve ara baixa pel solell (cara sud): pineda de pi roig.",
        "No tot ho explica l'orientació: el pi roig necessita molta llum i és el primer a colonitzar camps i pastures abandonats. Des dels anys 1950 la serra s'ha despoblat i el pi ha guanyat terreny.",
        "Una pineda jove i uniforme sol voler dir que allà hi havia un camp o una pastura. Amb els anys, sota els pins hi pot tornar a entrar el faig o el roure, que toleren l'ombra.",
        "Recapitulem el contrast del dia: P9 obaga, fageda, humitat, ombra; P10–P11 solell, pineda, llum, sequera, i també la història de la gent."
      ],
      pregunta: "Si ningú no toqués aquest bosc en 100 anys, què creieu que hi trobaríem?"
    },
    'P12': {
      titol: 'Montclús de Baix', fil: ['bosc'],
      punts: [
        "Mas documentat ja a l'edat mitjana (Montclús surt als drets de pastura amb Ardericó, Arderiu i Junyent).",
        "Prats i clarianes: restes dels antics conreus i pastures. Mireu-ne les vores: el pi hi entra primer."
      ]
    },
    'P13': {
      titol: 'Coll de Llevat', fil: ['bosc'],
      punts: [
        "A la Roca del Corb es veu bé la roca de la serra: calcàries d'origen marí (la de la fàbrica de ciment d'ahir).",
        "Baixant entrem a les zones baixes i assolellades: hi apareix la vegetació submediterrània, amb roure martinenc, boix i pi roig més esclarissat.",
        "El roure martinenc també és marcescent: a la tardor guarda la fulla seca i dona el to marró als vessants baixos.",
        "Bon lloc per buscar rapinyaires planant sobre la vall."
      ]
    },
    'P14': {
      titol: 'Rec del Corb', fil: ['bosc', 'guell'],
      punts: [
        "Recapitulem tot el fil: la fageda a les obagues, la pineda de pi roig als solells i a les antigues pastures, i el roure i el boix a la part baixa.",
        "Aquests boscos s'han tallat durant segles per fer fusta, carbó vegetal i puntals per a les mines: el que veiem és un bosc que s'ha anat refent.",
        "El torrent de Junyent baixa fins al monestir, on hi havia el molí: és el mateix torrent que ahir passava al peu del castell."
      ]
    },
    'P0': {
      titol: 'Monestir de Santa Maria de Lillet (arribada)', fil: ['guell'],
      punts: [
        "Tanquem els dos fils: el paisatge del Catllaràs és fet tant per l'orientació (obaga i solell) com per la gent (pastures, carbó, mines i abandonament).",
        "Per acabar el fil de Güell: a pocs quilòmetres hi ha el Museu del Ciment (Clot del Moro), el Tren del Ciment i els Jardins Artigas de Gaudí.",
        "Si ahir no hi vam pujar, val la pena acostar-se a Sant Miquel de Lillet, la rotonda romànica, a 150 m."
      ]
    }
  }
};

const FLORA = {
  titol: 'Fageda o pineda? (resum)',
  intro: "Al Catllaràs domina el pi roig; a les obagues i fondalades hi ha fageda amb boix. A la tardor el contrast es veu de lluny: la fageda és marró i coure (o pelada) i la pineda, verda.",
  factors: [
    ['Orientació', "El faig vol humitat tot l'any i guanya a les obagues; als solells, més secs, hi va millor el pi roig."],
    ['Llum', "El pi roig colonitza llocs oberts; el faig creix a l'ombra sota els pins i, amb el temps, els pot substituir."],
    ['Història', "Tala, carbó, mines i pastures, i després el despoblament, han afavorit el pi a moltes vessants."]
  ],
  reconeixer: [
    "Faig: escorça llisa i grisa; al novembre, catifa de fulla marró. Els joves guarden la fulla seca.",
    "Pi roig: escorça taronja a la part alta del tronc; verd tot l'any.",
    "Boix: arbust de fulla petita i lluent, típic de sòl calcari."
  ],
  fonts: "Fonts: Inventari del Patrimoni Cultural Local (Diputació de Barcelona); Gran Enciclopèdia Catalana i Història Natural dels Països Catalans; L'Erol; Departament de Cultura / UPC (Xalet, 2026)."
};
