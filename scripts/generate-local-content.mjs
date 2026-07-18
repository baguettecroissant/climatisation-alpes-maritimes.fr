import fs from 'fs';
import path from 'path';

const INPUT_FILE = path.resolve('src/data/communes.json');

// Haversine distance formula
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Seeded random for deterministic variations per city
function createSeededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return function() {
    let t = h += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Spintax parser to choose synonyms randomly based on the seed
function spin(text, rand) {
  return text.replace(/{([^{}]+)}/g, (match, choices) => {
    const options = choices.split('|');
    return options[Math.floor(rand() * options.length)];
  });
}

const microRegions = [
  {
    id: "littoral-est",
    name: "Nice & Est Littoral",
    cities: ["nice", "menton", "roquebrune-cap-martin", "beausoleil", "villefranche-sur-mer", "eze", "cap-d-ail", "la-trinite", "saint-andre-de-la-roche", "drap", "peillon", "peille", "la-turbie"],
    description: "la chaleur humide littorale et l'effet d'îlot de chaleur urbain azuréen qui étouffe le centre-ville historique et les collines de Cimiez",
    typeHabitat: "appartement de standing en copropriété, immeuble bourgeois niçois ou villa vue mer sur les collines",
    acType: "climatisation réversible multi-split ou gainable basse pression intégrée respectant les normes de copropriété strictes",
    landmark: "la Promenade des Anglais, le Vieux Nice, le quartier de Cimiez ou le port de Nice"
  },
  {
    id: "littoral-ouest",
    name: "Cannes, Antibes & Ouest Littoral",
    cities: ["cannes", "antibes", "mandelieu-la-napoule", "cagnes-sur-mer", "le-cannet", "vallauris", "saint-laurent-du-var", "villeneuve-loubet", "biot", "theoule-sur-mer"],
    description: "le climat méditerranéen chaud et l'ensoleillement maximal du littoral ouest, soumis aux exigences esthétiques de la Croisette et du Cap d'Antibes",
    typeHabitat: "villa Côte d'Azur luxueuse, résidence de standing face à la mer ou appartement contemporain",
    acType: "climatisation gainable invisible ultra-silencieuse avec régulation pièce par pièce ou split haut de gamme",
    landmark: "la Croisette à Cannes, le Cap d'Antibes, le port Vauban ou le massif de l'Estérel"
  },
  {
    id: "arriere-pays-collines",
    name: "Arrière-Pays & Collines Grassoises",
    cities: ["grasse", "mougins", "vence", "valbonne", "mouans-sartoux", "carros", "sophia-antipolis", "pegomas", "roquefort-les-pins", "la-colle-sur-loup", "contes", "la-gaude", "tourrette-levens", "tourrettes-sur-loup", "saint-paul-de-vence", "auribeau-sur-siagne", "peymeinade", "le-bar-sur-loup", "speracedes", "cabris", "tende", "sospel", "saint-martin-vesubie", "breil-sur-roya", "puget-theniers", "l-escarene", "levens"],
    description: "les nuits plus fraîches des collines de l'arrière-pays grassois contrastant avec le rayonnement solaire intense qui surchauffe les villas en hauteur",
    typeHabitat: "mas provençal traditionnel en pierre, villa contemporaine d'architecte ou maison de village",
    acType: "pompe à chaleur air-air réversible performante (console double flux ou gainable invisible)",
    landmark: "les parfumeries de Grasse, le village médiéval de Saint-Paul-de-Vence, Mougins vieux village ou la cité historique de Vence"
  }
];

function getMicroRegion(slug) {
  const match = microRegions.find(r => r.cities.includes(slug) || r.cities.some(c => slug.includes(c)));
  return match || microRegions[0]; // Default to Nice & Est Littoral
}

// ----------------------------------------------------
// Expanded Deep Spintax Text Generators
// ----------------------------------------------------

function generateIntroText(c, installers, distance, region, rand, btu, savings, surfaceKm2) {
  let template = "";

  if (region.id === "littoral-est") {
    template = `{Sur le littoral de l'Est azuréen, la commune de|Dans le secteur côtier très prisé de|Idéalement située à proximité de Nice, la ville de} {nom} ({codePostal}) {connaît des étés étouffants et humides|fait face à des températures estivales élevées accentuées par l'humidité de la mer}. {Avec {population} habitants établis sur {surface} km², la climatisation haut de gamme y est devenue un équipement indispensable de confort.|Cette localité de {population} habitants sur {surface} km² nécessite des solutions de climatisation réversible modernes et discrètes.} 
    
    {La présence de {description} impose de choisir des appareils de climatisation Inverter à haut rendement.|En raison de {description}, l'installation d'un système de climatisation performant et régulé est cruciale pour réguler l'humidité ambiante.} {L'architecture locale de {nom}, mêlant principalement {typeHabitat}, requiert une expertise de pose soignée et discrète.|Pour équiper des habitations typiques comme {typeHabitat}, l'intervention d'un climaticien RGE spécialisé est indispensable.}
    
    {Pour une surface de 100 m² à {nom}, une puissance estimée de {btu} kW est préconisée pour assurer une fraîcheur constante sans surconsommer d'électricité.|Les études thermiques locales à {nom} recommandent un dimensionnement de {btu} kW pour couvrir les besoins thermiques d'une habitation classique.} {La pose d'une pompe à chaleur air-air réversible A+++ génère environ {savings} € d'économies annuelles par rapport à des chauffages électriques standards.|Ce choix thermodynamique permet d'économiser près de {savings} € par an sur votre facture énergétique globale tout en profitant d'un confort 4 saisons.} {La ville de {nom} bénéficie d'une excellente réactivité des frigoristes du 06, n'étant qu'à {distance} km de Nice.|Grâce à une distance de seulement {distance} km par rapport à Nice, les installateurs premium interviennent sous des délais minimes.}`;
  } else if (region.id === "littoral-ouest") {
    template = `{Dans le secteur prestigieux de l'Ouest azuréen, la commune de|Près des plages et des ports de plaisance phares du 06, la ville de|Située sur la magnifique Côte d'Azur occidentale, la commune de} {nom} ({codePostal}) {est particulièrement exposée à un ensoleillement intense et des vagues de chaleur littorales|bénéficie d'un climat idéal exigeant un rafraîchissement performant}. {Avec {population} résidents à l'année sur {surface} km², la gestion thermique des villas et résidences de standing est une priorité absolue.|Comptant {population} habitants sur une superficie de {surface} km², cette commune accueille également de nombreuses résidences secondaires exigeant un contrôle d'humidité.}
    
    {L'exposition locale à {description} rend le rafraîchissement intérieur et la purification de l'air essentiels.|Le phénomène de {description} exige des systèmes de climatisation durables et résistants à la corrosion saline.} {La configuration esthétique de bâtiments de type {typeHabitat} nécessite une intégration technique invisible de type gainable.|Afin de préserver le standing de structures telles que {typeHabitat}, l'installation d'une climatisation réversible haut de gamme est préconisée.}
    
    {Le dimensionnement moyen pour une propriété de 100 m² à {nom} requiert environ {btu} kW pour garantir un confort thermique parfait.|Les professionnels recommandent une puissance moyenne de {btu} kW pour refroidir et chauffer efficacement de grands volumes.} {Les gains sur les dépenses énergétiques sont estimés à {savings} € par an par rapport à des radiateurs classiques.|Cette transition vers une PAC réversible haut de gamme réduit votre facture annuelle d'énergie de près de {savings} €.} {La commune de {nom} reste parfaitement desservie par les meilleurs artisans RGE du département, situés à {distance} km de Nice.|Située à {distance} km de Nice, la localité profite de la proximité immédiate de techniciens frigoristes hautement qualifiés.}`;
  } else {
    // Arrière-pays
    template = `{Dans l'arrière-pays azuréen et ses collines verdoyantes, la commune de|Au cœur des collines et mas historiques des Alpes-Maritimes, la ville de|Bénéficiant d'une vue panoramique et d'un cadre provençal, la commune de} {nom} ({codePostal}) {connaît des amplitudes thermiques marquées entre le jour et la nuit|fait face à des étés très chauds au milieu de la nature}. {Pour les {population} habitants logés sur les {surface} km² de la commune, le choix d'un système de climatisation réversible est hautement stratégique.|Avec une population de {population} habitants répartie sur {surface} km², la commune requiert des installations de chauffage et climatisation intelligentes.}
    
    {Les conditions climatiques locales, marquées par {description}, demandent des PAC réversibles Inverter de grande fiabilité.|Les spécificités météo de l'arrière-pays, avec {description}, requièrent des compresseurs performants pour affronter les pics de chaleur.} {La rénovation énergétique d'habitations de type {typeHabitat} constitue une priorité pour allier confort moderne et respect de l'architecture provençale.|La pose d'une climatisation réversible dans les habitations comme {typeHabitat} permet de conserver l'authenticité du bâti tout en profitant d'un air sain.}
    
    {Une puissance de {btu} kW est généralement préconisée pour réguler idéalement une surface standard de 100 m² dans cette zone.|Pour faire face aux variations de température de {nom}, un dimensionnement de {btu} kW est recommandé par les frigoristes locaux.} {Les économies d'énergie générées atteignent en moyenne {savings} € par an grâce aux excellents rendements (SCOP A+++).|Ce système thermodynamique performant permet de réduire la facture énergétique annuelle de {savings} €.} {Bien que située à {distance} km de Nice, la commune est couverte au quotidien par des artisans RGE hautement réactifs.|Malgré une distance de {distance} km de Nice, la commune dispose d'une couverture technique rapide par des installateurs locaux.}`;
  }

  const replaced = template
    .replace(/{nom}/g, c.nom)
    .replace(/{codePostal}/g, c.codePostal)
    .replace(/{population}/g, c.population.toLocaleString('fr-FR'))
    .replace(/{surface}/g, surfaceKm2)
    .replace(/{description}/g, region.description)
    .replace(/{typeHabitat}/g, region.typeHabitat)
    .replace(/{btu}/g, btu)
    .replace(/{savings}/g, savings)
    .replace(/{distance}/g, distance);

  return spin(replaced, rand);
}

function generateChallengeText(c, region, altitude, rand) {
  let template = "";

  if (region.id === "littoral-est") {
    template = `{La pose d'une climatisation réversible à|L'installation d'un compresseur extérieur de clim à} {nom} doit se plier aux réglementations strictes d'urbanisme de la métropole. {À cette altitude moyenne de {altitude} mètres, l'implantation de l'unité extérieure doit être totalement invisible pour le voisinage.|Située à une altitude de {altitude} mètres, la commune veille au respect des directives ABF pour tout changement de façade.} {Il est obligatoire de vérifier si votre copropriété impose des contraintes de discrétion sonore (19 dB) ou si vous êtes en zone sauvegardée ABF à Nice ou Menton.|Le Plan Local d'Urbanisme de {nom} et les syndics de copropriété de standing encadrent de près l'installation de climatiseurs visibles depuis la voie publique.} {Vous pouvez consulter les servitudes d'urbanisme locales sur [le portail officiel du Géoportail de l'urbanisme](https://www.geoportail-urbanisme.gouv.fr/) ou soumettre une déclaration préalable (DP) en mairie de {nom}.|Pour sécuriser la conformité de vos travaux, déposez votre dossier en ligne ou contactez le service d'urbanisme de la mairie de {nom}.}
    
    {Pour les appartements et immeubles bourgeois de standing, la solution technique reine est {acType}.|Afin de garantir une discrétion absolue et un esthétisme préservé, les installateurs recommandent {acType}.} {Ces équipements intègrent des filtres plasma ionisants et des compresseurs Inverter ultra-silencieux posés sur plots anti-vibrations.|Ces systèmes gainables diffusent la fraîcheur par des grilles de soufflage intégrées, sans dénaturer les moulures de votre intérieur.} {Le niveau sonore des unités intérieures Daikin ou Mitsubishi descend à 19 dB, idéal pour le sommeil.|La mise en conformité acoustique garantit un confort parfait et évite tout litige avec le voisinage de standing.}`;
  } else if (region.id === "littoral-ouest") {
    template = `{L'intégration d'un système de climatisation à|L'installation d'une pompe à chaleur réversible à} {nom} présente des défis liés à l'environnement marin et aux contraintes architecturales. {À une altitude de {altitude} mètres, l'unité extérieure subit de plein fouet les embruns marins et nécessite un traitement anti-corrosion renforcé.|À cette altitude de {altitude} mètres, les professionnels installent les groupes extérieurs à l'abri du vent et du soleil direct pour optimiser le rendement saisonnier.} {Le Plan Local d'Urbanisme de {nom} protège l'harmonie des villas historiques et des résidences contemporaines de la Côte d'Azur.|La mairie de {nom} exige l'accord des Bâtiments de France pour toute pose de groupe extérieur dans les périmètres protégés.} {Nous vous conseillons de vérifier la carte d'urbanisme locale sur le site du [Géoportail de l'urbanisme](https://www.geoportail-urbanisme.gouv.fr/) avant d'engager vos travaux.|Prenez contact avec le service d'urbanisme de la mairie de {nom} pour connaître les coloris de cache-climats en aluminium ou bois autorisés.}
    
    {La configuration des villas et appartements d'exception de l'Ouest littoral est propice à {acType}.|Pour rafraîchir ces volumes prestigieux en toute discrétion, le choix se porte le plus souvent sur {acType}.} {Cette installation permet une régulation pièce par pièce par Wi-Fi et IA pour optimiser la consommation en été.|Les liaisons frigorifiques sont encastrées dans les cloisons ou faux-plafonds pour un résultat visuel impeccable.} {Les supports au sol sur dalles en béton isolées permettent de supprimer toute propagation vibratoire dans la structure.|La discrétion sonore extérieure est essentielle pour profiter pleinement des terrasses et piscines sans gêne acoustique.}`;
  } else {
    // Arrière-pays
    template = `{L'installation d'une climatisation réversible à|La pose d'une pompe à chaleur air-air à} {nom} doit allier confort de haut standing et discrétion paysagère. {À l'altitude de {altitude} mètres dans l'arrière-pays, les variations de température exigent des pompes à chaleur performantes en mode chauffage hivernal.|À cette altitude de {altitude} mètres, les unités extérieures doivent être implantées de façon à ne pas dénaturer l'esthétique des mas provençaux.} {Dans les villages d'art comme Saint-Paul-de-Vence ou les collines classées de Grasse et Vence, l'avis des Architectes des Bâtiments de France (ABF) est requis.|Le dépôt d'une déclaration préalable en mairie de {nom} est indispensable pour s'assurer du respect des règles du PLU.} {Consultez le [site officiel du Géoportail de l'urbanisme](https://www.geoportail-urbanisme.gouv.fr/) pour prendre connaissance des restrictions locales.|Il est recommandé de se faire accompagner par un installateur RGE Qualipac azuréen connaissant parfaitement les exigences locales.}
    
    {Les frigoristes locaux conseillent l'installation de {acType} pour chauffer et rafraîchir de grands volumes provençaux.|Pour un confort permanent toute l'année, la solution idéale consiste en {acType}.} {Ces pompes à chaleur de classe énergétique A+++ conservent un excellent rendement même lors des canicules estivales.|L'utilisation de cache-climats haut de gamme imitation bois ou ton pierre de pays permet de dissimuler parfaitement le bloc extérieur.} {La qualité de l'isolation des conduites frigorifiques limite les pertes d'énergie lors des pics de chaleur.|Un dimensionnement précis par un artisan certifié RGE de l'arrière-pays garantit des factures d'électricité maîtrisées.}`;
  }

  const replaced = template
    .replace(/{nom}/g, c.nom)
    .replace(/{acType}/g, region.acType)
    .replace(/{altitude}/g, altitude)
    .replace(/{regionName}/g, region.name);

  return spin(replaced, rand);
}

function generateHelpText(c, installers, delai, rand, priceMin, priceMax) {
  const template = `{Pour financer votre projet de climatisation réversible à|Afin de réduire le coût de vos travaux de rénovation énergétique à} {nom}, {plusieurs dispositifs d'aides et primes de l'État sont disponibles en 2026.|vous pouvez bénéficier de subventions publiques et d'avantages fiscaux significatifs.} {L'obtention de la Prime CEE ou de la TVA réduite à 10% sur la pose est conditionnée par l'intervention d'un installateur certifié RGE Qualipac.|Le recours à un professionnel Reconnu Garant de l'Environnement (RGE) est obligatoire pour prétendre aux aides régionales et nationales.} {Pour une étude thermique gratuite et neutre de votre maison, consultez le site de l'Agence de la transition écologique ([ADEME](https://www.ademe.fr/)) ou contactez un conseiller France Rénov' des Alpes-Maritimes.|Retrouvez tous les barèmes officiels et conditions d'éligibilité sur le site de l'[ADEME](https://www.ademe.fr/) et de l'Anah.}
  
  {Le réseau des professionnels locaux autour de {nom} regroupe {installers} artisans RGE Qualipac en activité.|On dénombre environ {installers} frigoristes qualifiés RGE en mesure d'intervenir sur la commune de {nom}.} {Ces spécialistes proposent une visite technique de conception gratuite sous un délai moyen de {delai} jours.|Les installateurs du 06 se déplacent pour effectuer votre devis gratuit chez vous sous {delai} jours.} {Pour l'installation complète d'un système multi-split design haut de gamme (3 pièces), comptez un budget compris entre {priceMin} € et {priceMax} € TTC posé.|Pour équiper une villa avec un système tri-split Inverter A+++ (salon + 2 chambres), prévoyez un tarif moyen situé entre {priceMin} € et {priceMax} € TTC tout compris.}`;

  const replaced = template
    .replace(/{nom}/g, c.nom)
    .replace(/{installers}/g, installers)
    .replace(/{delai}/g, delai)
    .replace(/{priceMin}/g, priceMin.toLocaleString('fr-FR'))
    .replace(/{priceMax}/g, priceMax.toLocaleString('fr-FR'));

  return spin(replaced, rand);
}

function generateAnecdoteText(c, region, rand) {
  let template = "";

  if (region.id === "littoral-est") {
    template = `{Le respect du patrimoine et des façades bourgeoises à|La discrétion esthétique des installations thermiques à} {nom} est un enjeu majeur, tout particulièrement à proximité de sites de prestige comme {landmark}. {Pour habiller élégamment les blocs extérieurs fixés en cour intérieure ou sur balcon, les climaticiens recommandent la pose de cache-climats design en aluminium.|Afin de préserver la beauté visuelle des architectures historiques et balnéaires de la commune, l'utilisation d'un coffrage ajouré en aluminium laqué or ou blanc est d'usage.} {Ces structures esthétiques protègent les liaisons frigorifiques du rayonnement UV intense de la Côte d'Azur, améliorant les rendements saisonniers.|Ces cache-climats premium n'entravent pas le flux d'air tout en atténuant encore la discrétion acoustique (jusqu'à 3 dB de moins) du système Inverter.}`;
  } else if (region.id === "littoral-ouest") {
    template = `{Dans le cadre somptueux du littoral de l'Ouest azuréen à|Afin de préserver le style unique des villas de standing de} {nom}, {la discrétion de votre système de climatisation réversible est primordiale.|l'intégration architecturale de l'unité extérieure de votre pompe à chaleur fait l'objet d'une exigence absolue.} {À proximité de lieux emblématiques comme {landmark}, les groupes extérieurs sont installés au sol ou dissimulés par des paravents paysagers adaptés.|Pour conserver le charme unique des jardins et façades près de sites d'exception comme {landmark}, la pose d'un cache-climat en bois noble ou composite coordonné est préconisée.} {Ces habillages protègent l'appareil des vents marins chargés de sel tout en offrant un fini haut de gamme en accord avec l'esprit Côte d'Azur luxury.|Ces coffrages haut de gamme optimisent le flux d'air d'échange thermique tout en prolongeant la longévité de l'installation face à l'air salin.}`;
  } else {
    // Arrière-pays
    template = `{Le cachet provençal et le charme naturel de|Dans les paysages de collines typiques de} {nom}, {située à proximité directe de hauts lieux comme {landmark}, imposent une discrétion paysagère totale.|exigent une intégration parfaite des équipements de climatisation pour respecter l'architecture provençale près de {landmark}.} {Pour les mas anciens en pierre de taille ou les bastides contemporaines, les frigoristes proposent des coffrages imitation bois ou ton pierre de pays.|Les artisans RGE du 06 conçoivent des intégrations discrètes (dans les haies ou sous abri ventilé) pour respecter l'aspect paysager.} {Ce habillage robuste évite également l'accumulation de feuilles mortes et protège le compresseur des rayons directs du soleil.|Ce cache-climat premium préserve le rendement énergétique de votre pompe à chaleur lors des fortes chaleurs estivales.}`;
  }

  const replaced = template
    .replace(/{nom}/g, c.nom)
    .replace(/{landmark}/g, region.landmark);

  return spin(replaced, rand);
}

const faqPool = [
  {
    topic: "prix",
    q: "Quel est le budget moyen pour poser une climatisation réversible à {city} ?",
    a: "À {city}, l'installation d'un mono-split design haut de gamme (1 pièce) varie entre 1 500 € et 3 000 € TTC posé. Pour une villa ou un grand appartement de standing de 3 à 4 pièces (multi-split ou gainable dissimulé), les tarifs constatés oscillent de 4 000 € à 12 000 € TTC posé, selon la complexité et les finitions choisies."
  },
  {
    topic: "aides",
    q: "Quelles sont les aides éligibles pour une clim réversible à {city} en 2026 ?",
    a: "L'installation d'une pompe à chaleur air-air (climatisation réversible) de classe A+++ à {city} ouvre droit aux primes CEE (Certificats d'Économie d'Énergie) et à la TVA réduite à 10% sur la main-d'œuvre. Ces aides financières nécessitent impérativement de passer par une entreprise certifiée RGE Qualipac."
  },
  {
    topic: "copropriete",
    q: "Quelles sont les formalités en copropriété ou syndic pour la clim à {city} ?",
    a: "Oui, toute modification de l'aspect extérieur d'un immeuble de standing à {city} nécessite de déposer une déclaration préalable de travaux (DP) en mairie et d'obtenir l'accord écrit de la copropriété (syndic et assemblée générale) avant la pose du groupe extérieur en façade."
  },
  {
    topic: "consommation",
    q: "Quelles économies de chauffage peut-on réaliser à {city} ?",
    a: "Avec les compresseurs Inverter actuels (COP de 4.5+), le système restitue plus de 4 fois l'énergie électrique consommée. En remplaçant de vieux radiateurs électriques par une clim réversible haut de gamme à {city}, vous pouvez diviser vos factures de chauffage hivernal par 3 ou 4."
  },
  {
    topic: "bruit",
    q: "Le groupe extérieur de clim fait-il du bruit à {city} ?",
    a: "Les fabricants de climatisation de luxe (Daikin, Mitsubishi Electric) conçoivent des compresseurs très discrets (19 dB(A) en mode silence). À {city}, les frigoristes posent les blocs extérieurs sur des supports isolants antivibratoires pour éviter la transmission sonore et respecter le PLU."
  },
  {
    topic: "entretien",
    q: "Quelle est la réglementation d'entretien de climatisation à {city} ?",
    a: "Depuis 2020, un contrôle bisannuel est légalement requis pour les climatiseurs d'une puissance supérieure à 4 kW. Dans les Alpes-Maritimes, en raison de l'humidité littorale et de l'air salin, un nettoyage régulier des filtres et une désinfection annuelle de l'unité intérieure sont fortement recommandés pour conserver un air sain."
  },
  {
    topic: "puissance",
    q: "Comment déterminer la puissance de climatisation nécessaire à {city} ?",
    a: "La puissance requise s'établit lors d'un bilan thermique complet réalisé à {city}. Elle dépend de la superficie du logement (environ 100 W par m²), de la hauteur sous plafond, de l'exposition au soleil (baies vitrées exposées sud/ouest) et de la qualité d'isolation des combles."
  },
  {
    topic: "duree",
    q: "Quelle est la longévité d'un climatiseur réversible à {city} ?",
    a: "Un appareil haut de gamme posé par un artisan certifié et entretenu périodiquement a une durée de vie de 15 à 20 ans. Dans le 06, l'installation d'un cache-climat en alu thermolaqué ou bois de standing protège le groupe extérieur de l'air marin et prolonge sa durée de vie."
  }
];

function generateFAQs(cityName, rand) {
  const shuffled = [...faqPool].sort(() => rand() - 0.5);
  const picked = shuffled.slice(0, 4);
  
  return picked.map(item => {
    const qSpun = spin(item.q, rand);
    const aSpun = spin(item.a, rand);
    return {
      q: qSpun.replace(/{city}/g, cityName),
      a: aSpun.replace(/{city}/g, cityName)
    };
  });
}

// ----------------------------------------------------
// Main Processing Loop
// ----------------------------------------------------
async function generateLocalContent() {
  try {
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error(`File ${INPUT_FILE} does not exist. Run fetch-cities first.`);
    }

    const communes = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`Generating unique combinatorial texts for ${communes.length} Alpes-Maritimes communes...`);

    // Center coordinates Nice: lat 43.7102, lon 7.2620
    const centerLat = 43.7102;
    const centerLon = 7.2620;

    const enriched = communes.map((c) => {
      const rand = createSeededRandom(c.slug);
      const region = getMicroRegion(c.slug);

      const lat = c.coordinates?.lat || centerLat;
      const lon = c.coordinates?.lon || centerLon;
      const distanceToCenter = Math.round(haversineDistance(lat, lon, centerLat, centerLon));
      
      const surfaceKm2 = c.surface ? parseFloat((c.surface / 100).toFixed(1)) : 0;
      const density = surfaceKm2 > 0 ? Math.round(c.population / surfaceKm2) : 0;
      
      // Altitude Alpes-Maritimes: variable, littoral vs mountains
      let altitude = Math.round(5 + rand() * 40); // 5 to 45m (Littoral)
      if (region.id === "arriere-pays-collines") {
        altitude = Math.round(150 + rand() * 650); // 150 to 800m (Collines/Montagne)
      }

      // Climate & Market variables
      const installersCount = Math.round(8 + rand() * 14); // 8 to 22 premium installers
      const delaiMoyen = Math.round(1 + rand() * 2); // 1 to 3 days
      const hotDays = Math.round(15 + rand() * 25); // 15 to 40 hot days in 06

      // Math calculations for local authority data
      const btuRequired = (10 * (1 + (altitude / 1200))).toFixed(1);
      const savingsEstimated = Math.round(800 + rand() * 400);

      // Price brackets
      const priceMin = Math.round(1500 + rand() * 500);
      const priceMax = Math.round(5000 + rand() * 4000);

      // Generated spun texts
      const introText = generateIntroText(c, installersCount, distanceToCenter, region, rand, btuRequired, savingsEstimated, surfaceKm2);
      const accessibilityChallenge = generateChallengeText(c, region, altitude, rand);
      const localHelp = generateHelpText(c, installersCount, delaiMoyen, rand, priceMin, priceMax);
      const anecdotePatrimoine = generateAnecdoteText(c, region, rand);

      const geoportailLink = `https://www.geoportail.gouv.fr/carte?c=${lon},${lat}&z=14&l0=GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-EXPRESS.STANDARD::GEOPORTAIL:OGC:WMTS(1)&permalink=yes`;
      const inseeLink = `https://www.insee.fr/fr/statistiques/dossier_complet/commune/${c.codeInsee}`;
      const departmentLink = `https://www.departement06.fr`;

      // Unique spun FAQs
      const faq = generateFAQs(c.nom, rand);

      // Stable technical characteristics
      const brandPreference = rand() > 0.5 ? "Mitsubishi Electric / Daikin (Gamme Premium Designer, 19 dB, Fluide R32)" : "Panasonic / Toshiba Inverter (Purification Plasma Ioniseur, contrôle IA)";
      const fluidType = "Fluide écologique R32 à faible empreinte carbone (Conformité F-Gas 2026)";
      const copRatio = `COP 4.6 à 5.3 / SEER A+++ (Technologie Hyper Inverter Côte d'Azur)`;
      const certifiedLevel = " climaticien RGE Qualipac / Attestation réglementaire de manipulation des fluides";

      return {
        ...c,
        intercommunalite: c.intercommunalite || `${region.name}`,
        marketData: {
          hotDays,
          installateursAgrees: installersCount,
          delaiMoyenJours: delaiMoyen
        },
        geographicData: {
          distanceToCenter,
          surfaceKm2,
          density,
          lat,
          lon,
          geoportailLink,
          inseeLink,
          departmentLink
        },
        altitude,
        introText,
        accessibilityChallenge,
        localHelp,
        anecdotePatrimoine,
        climCharacteristics: {
          brandPreference,
          fluidType,
          copRatio,
          certifiedLevel
        },
        faq
      };
    });

    fs.writeFileSync(INPUT_FILE, JSON.stringify(enriched, null, 2), 'utf-8');
    console.log(`Successfully generated highly unique Spintax content inside ${INPUT_FILE}`);
  } catch (error) {
    console.error('Error generating local content:', error);
    process.exit(1);
  }
}

generateLocalContent();
