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

// Nested Spintax parser to choose synonyms randomly based on the seed
function spin(text, rand) {
  let spun = text;
  // Loop to handle nested spintax braces
  while (spun.includes('{')) {
    spun = spun.replace(/{([^{}]+)}/g, (match, choices) => {
      const options = choices.split('|');
      return options[Math.floor(rand() * options.length)];
    });
  }
  return spun;
}

const microRegions = [
  {
    id: "nice-metropole",
    name: "Nice Métropole & Collines",
    cities: ["nice", "villefranche-sur-mer", "eze", "cap-d-ail", "la-trinite", "saint-andre-de-la-roche", "drap", "colomars", "aspremont", "falicon"],
    description: "l'effet d'îlot de chaleur urbain niçois qui étouffe le centre historique et les collines résidentielles de Cimiez",
    typeHabitat: "appartement bourgeois niçois, copropriété de standing ou maison de ville sur les collines",
    acType: "climatisation réversible multi-split ou gainable basse pression ultra-discrète",
    landmark: "la Promenade des Anglais, le Vieux Nice, le Palais Lascaris ou la colline du Château",
    standing: 1.2,
    guideSlug: "climatisation-copropriete-standing-nice-cannes"
  },
  {
    id: "cote-azur-ouest",
    name: "Cannes, Antibes & Ouest Littoral",
    cities: ["cannes", "antibes", "mandelieu-la-napoule", "cagnes-sur-mer", "le-cannet", "vallauris", "saint-laurent-du-var", "villeneuve-loubet", "biot", "theoule-sur-mer", "mougins", "valbonne", "mouans-sartoux", "sophia-antipolis", "roquefort-les-pins", "la-colle-sur-loup", "auribeau-sur-siagne", "le-rouret", "opio", "chateauneuf-grasse", "la-roquette-sur-siagne", "le-tignet", "peymeinade"],
    description: "l'ensoleillement maximal du littoral ouest et des collines résidentielles, exposé à la fois au sel marin et aux fortes chaleurs d'été",
    typeHabitat: "villa azuréenne contemporaine, propriété avec piscine, mas modernisé ou appartement avec terrasse face à la mer",
    acType: "climatisation gainable invisible régulée par zone (Airzone) ou système multi-split haut de gamme",
    landmark: "la Croisette à Cannes, le Cap d'Antibes, le port Vauban ou le massif de l'Estérel",
    standing: 1.3,
    guideSlug: "climatisation-gainable-invisible-villa-cote-azur"
  },
  {
    id: "riviera-mentonnaise",
    name: "Riviera Mentonnaise & Frontière",
    cities: ["menton", "roquebrune-cap-martin", "beausoleil", "la-turbie", "peillon", "peille", "beaulieu-sur-mer"],
    description: "le microclimat unique de la Riviera, avec une chaleur humide côtière marquée par l'influence maritime directe de la frontière italienne",
    typeHabitat: "appartement de standing face à la mer, villa suspendue à flanc de falaise ou maison de caractère mentonnaise",
    acType: "pompe à chaleur air-air traitée anti-corrosion marine ou gainable haute performance",
    landmark: "les jardins de Menton, le Cap Martin, le trophée d'Auguste à La Turbie ou la frontière italienne",
    standing: 1.25,
    guideSlug: "climatisation-residence-secondaire-cote-azur"
  },
  {
    id: "arriere-pays-montagne",
    name: "Arrière-Pays & Montagne Azuréenne",
    cities: ["grasse", "vence", "carros", "la-gaude", "tourrette-levens", "levens", "sospel", "tende", "breil-sur-roya", "l-escarene", "saint-martin-du-var", "saint-jeannet", "gattieres", "tourrettes-sur-loup", "saint-cezaire-sur-siagne", "saint-paul-de-vence", "le-bar-sur-loup", "saint-vallier-de-thiey"],
    description: "les amplitudes thermiques marquées de l'arrière-pays montagneux, combinant des étés très chauds sous les toits et des hivers frais en colline",
    typeHabitat: "mas provençal traditionnel en pierre, bastide en colline, maison de village historique ou villa entourée d'oliviers",
    acType: "pompe à chaleur réversible Inverter A+++ (mural design ou console double flux)",
    landmark: "les parfumeries de Grasse, la cité historique de Vence, le village médiéval de Saint-Paul-de-Vence ou les gorges du Loup",
    standing: 1.1,
    guideSlug: "installateur-climatisation-premium-rge-alpes-maritimes"
  }
];

function getMicroRegion(slug) {
  const match = microRegions.find(r => r.cities.includes(slug) || r.cities.some(c => slug.includes(c)));
  return match || microRegions[0]; // Default to Nice Métropole
}

// ----------------------------------------------------
// Deep Spintax Generators with multiple variation paths
// ----------------------------------------------------

function generateIntroText(c, installers, distance, region, rand, btu, savings, surfaceKm2) {
  let introTemplates = [
    // Variation 1
    `{Située au cœur de la magnifique région de ${region.name}, la commune de|Dans le cadre idyllique de la Côte d'Azur, la localité de|Bénéficiant d'un emplacement privilégié dans les Alpes-Maritimes, la ville de} {nom} ({codePostal}) {doit faire face à d'importants enjeux énergétiques et climatiques|fait face à des étés de plus en plus chauds sous l'influence du climat méditerranéen}. {Comptant actuellement {population} résidents établis sur un territoire de {surface} km², la gestion du confort d'été y est une priorité absolue.|Avec une population de {population} habitants répartis sur {surface} km², les besoins en climatisation de standing augmentent chaque année.}

    {L'effet combiné de {description} rend l'air parfois étouffant durant les mois les plus chauds, de juin à septembre.|En raison de {description}, les factures de climatisation en été et de chauffage en hiver peuvent s'envoler sans un système régulé.} {L'architecture résidentielle à {nom}, caractérisée par un bâti de type {typeHabitat}, requiert une intégration technique très propre.|Pour équiper des habitations raffinées comme {typeHabitat}, le choix d'un système de climatisation réversible intelligent est indispensable.}

    {Pour assurer une température idéale de 22°C dans un logement de 100 m² à {nom}, la puissance théorique recommandée est de {btu} kW.|Les bilans thermiques réalisés dans la zone de {nom} préconisent en moyenne une puissance de {btu} kW pour couvrir les besoins d'une villa standard.} {L'installation d'une PAC réversible air-air A+++ permet d'économiser environ {savings} € par an par rapport à de simples radiateurs électriques.|Cette solution aérothermique de pointe réduit les factures d'énergie de près de {savings} € par an tout en purifiant l'air ambiant.} {Grâce à la proximité des axes, les techniciens frigoristes agréés basés à seulement {distance} km de Nice interviennent sous des délais record.|La commune n'étant située qu'à {distance} km de Nice, les installateurs locaux proposent des visites de conception gratuites très rapidement.}`,

    // Variation 2
    `{À {nom} ({codePostal}), le confort thermique est indissociable de la qualité de vie azuréenne.|Pour les {population} habitants de la commune de {nom} ({codePostal}), s'équiper d'une climatisation performante est devenu un investissement thermique stratégique.} {Sur ce territoire de {surface} km², la densité résidentielle impose de choisir des compresseurs extérieurs extrêmement silencieux pour préserver le voisinage.|S'étendant sur {surface} km², la localité combine le charme architectural méditerranéen et des exigences d'intégration technique modernes.}

    {Les spécificités climatiques locales, marquées par {description}, justifient pleinement l'adoption de {acType}.|Face à {description}, les propriétaires se tournent en priorité vers {acType} pour leur habitat.} {Les bâtis traditionnels ou modernes de type {typeHabitat} exigent une étude technique préalable avant toute pose de liaisons frigorifiques.|Pour des propriétés exigeantes telles que {typeHabitat}, l'intégration esthétique doit être invisible et sans goulottes plastiques.}

    {Un dimensionnement précis de {btu} kW est généralement requis pour garantir une fraîcheur optimale lors des pics de canicule.|Les techniciens Qualipac RGE estiment à {btu} kW la puissance nécessaire pour un volume d'environ 250 m³.} {Grâce aux coefficients de performance (COP) de 4.8+, cette transition génère {savings} € d'économies annuelles sur le budget électricité.|Cette démarche permet de réduire l'empreinte carbone du logement tout en économisant {savings} € par an.} {La ville se trouve à {distance} km de l'agglomération niçoise, assurant une couverture technique quotidienne par nos équipes.|N'étant qu'à {distance} km de Nice, {nom} bénéficie d'antennes techniques locales très réactives pour la pose et la mise en service.}`
  ];

  const template = introTemplates[Math.floor(rand() * introTemplates.length)];

  const replaced = template
    .replace(/{nom}/g, c.nom)
    .replace(/{codePostal}/g, c.codePostal)
    .replace(/{population}/g, c.population.toLocaleString('fr-FR'))
    .replace(/{surface}/g, surfaceKm2)
    .replace(/{description}/g, region.description)
    .replace(/{typeHabitat}/g, region.typeHabitat)
    .replace(/{btu}/g, btu)
    .replace(/{savings}/g, savings)
    .replace(/{distance}/g, distance)
    .replace(/{acType}/g, region.acType);

  return spin(replaced, rand);
}

function generateChallengeText(c, region, altitude, rand) {
  let challengeTemplates = [
    `{Installer une unité extérieure de climatisation à|La pose d'un compresseur de climatisation réversible à} {nom} {doit respecter scrupuleusement les règles locales d'urbanisme (PLU).|est soumise à des réglementations strictes d'intégration visuelle et acoustique.} {À une altitude de {altitude} mètres, l'orientation du groupe extérieur doit être réfléchie pour ne pas gêner le voisinage.|Située à une altitude moyenne de {altitude} mètres, la commune applique des normes restrictives sur les modifications de façade.} {Si votre projet se situe dans le périmètre d'un site historique protégé ou sous l'avis des Architectes des Bâtiments de France (ABF) de Nice ou Cannes, aucune liaison frigorifique ne doit être visible de la rue.|Les règlements de copropriété de standing à {nom} ou les avis ABF locaux imposent de camoufler le bloc extérieur sous un cache-clim ventilé assorti.} {Pour valider vos droits, vous pouvez consulter le cadastre sur [le site officiel du Géoportail de l'urbanisme](https://www.geoportail-urbanisme.gouv.fr/) ou déposer une déclaration préalable en mairie de {nom}.|Prenez conseil auprès du service d'urbanisme de la mairie de {nom} pour vous assurer de la conformité du modèle envisagé.}
    
    {Pour les appartements et villas de standing de la région, la solution préconisée est {acType}.|Afin de préserver l'authenticité des façades et l'esthétique des intérieurs, les frigoristes recommandent {acType}.} {Ces équipements de classe A+++ garantissent un fonctionnement silencieux à 19 dB, idéal pour respecter la tranquillité nocturne.|Ce type d'intégration permet de distribuer l'air de manière homogène dans les pièces de nuit sans aucun impact visuel.} {La pose sur silent-blocks amortisseurs élimine les transmissions vibratoires dans la dalle en béton.|Les supports au sol anti-vibrations sont indispensables pour éviter les nuisances sonores directes ou indirectes.}`,

    `{Le défi d'une installation de climatisation à|Les contraintes techniques de pose d'une pompe à chaleur à} {nom} {résident dans l'adéquation entre performance thermique et exigences esthétiques.|tiennent à la fois à l'implantation des blocs extérieurs et aux règles de copropriété.} {À l'altitude de {altitude} mètres, les variations de température exigent une pose fiable pour résister aux intempéries.|À cette altitude moyenne de {altitude} mètres, l'unité extérieure doit être protégée du rayonnement solaire direct pour maintenir un SEER optimal.} {Il est impératif de déposer une déclaration préalable de travaux (DP) en mairie de {nom} avant toute pose sur mur porteur.|Le Plan Local d'Urbanisme (PLU) interdit toute goulotte plastique apparente sur les façades des résidences de standing.} {Vérifiez les restrictions paysagères sur le [Géoportail de l'urbanisme](https://www.geoportail-urbanisme.gouv.fr/) pour éviter toute demande de mise en conformité a posteriori.|Les Architectes des Bâtiments de France (ABF) rejettent régulièrement les blocs extérieurs non peints ou non masqués.}
    
    {L'utilisation de {acType} permet de s'affranchir des contraintes esthétiques les plus strictes.|La pose de {acType} est la réponse technique idéale pour les propriétés exigeantes de la commune.} {Le niveau sonore intérieur descend sous le seuil d'audibilité humaine, favorisant un confort optimal.|La technologie Inverter régule la puissance en continu, ce qui évite les pics de bruit au démarrage du compresseur.} {Les installateurs locaux intègrent des cache-climats en aluminium laqué pour fondre le système dans l'environnement.|Des habillages sur mesure en bois noble traité ou en composite de couleur sombre permettent une intégration paysagère parfaite.}`
  ];

  const template = challengeTemplates[Math.floor(rand() * challengeTemplates.length)];

  const replaced = template
    .replace(/{nom}/g, c.nom)
    .replace(/{acType}/g, region.acType)
    .replace(/{altitude}/g, altitude)
    .replace(/{regionName}/g, region.name);

  return spin(replaced, rand);
}

function generateHelpText(c, installers, delai, rand, priceMin, priceMax) {
  const template = `{Afin d'amortir le coût de votre installation thermique à|Pour financer votre projet de climatisation réversible à} {nom}, {de nombreuses aides de l'État et primes énergies sont applicables en 2026.|vous pouvez bénéficier de subventions publiques importantes et de dispositifs fiscaux attractifs.} {L'obtention de la Prime CEE (Certificats d'Économie d'Énergie) et d'un taux de TVA réduit à 10% sur la pose impose obligatoirement de confier les travaux à un professionnel certifié RGE Qualipac.|Le recours à un installateur certifié Reconnu Garant de l'Environnement (RGE) est une condition essentielle pour déduire ces primes de votre reste à charge.} {Pour effectuer une simulation d'éligibilité gratuite, consultez le portail officiel de l'Agence de la transition écologique ([ADEME](https://www.ademe.fr/)) ou contactez un conseiller France Rénov' du 06.|Retrouvez les barèmes d'aides à jour et les conseils d'isolation sur le site de l'[ADEME](https://www.ademe.fr/) ou de l'Anah.}
  
  {Le marché de la climatisation autour de {nom} compte {installers} entreprises certifiées RGE Qualipac en activité.|On dénombre environ {installers} climaticiens qualifiés RGE capables d'intervenir rapidement sur {nom}.} {Une étude de conception et un devis gratuit sont généralement réalisés sous un délai de {delai} jours.|Les artisans partenaires s'engagent à planifier une visite technique chez vous sous {delai} jours.} {Pour l'installation complète d'un système multi-split design de 3 pièces (salon + 2 chambres), prévoyez un budget moyen de {priceMin} € à {priceMax} € TTC posé.|Le budget moyen constaté pour équiper une habitation individuelle de 3 pièces avec un matériel Inverter A+++ oscille entre {priceMin} € et {priceMax} € TTC tout compris.}`;

  const replaced = template
    .replace(/{nom}/g, c.nom)
    .replace(/{installers}/g, installers)
    .replace(/{delai}/g, delai)
    .replace(/{priceMin}/g, priceMin.toLocaleString('fr-FR'))
    .replace(/{priceMax}/g, priceMax.toLocaleString('fr-FR'));

  return spin(replaced, rand);
}

function generateAnecdoteText(c, region, rand) {
  let anecdoteTemplates = [
    `{L'intégration paysagère des systèmes de confort à|La préservation du patrimoine visuel et historique à} {nom} est une priorité, notamment en raison de la proximité de sites célèbres comme {landmark}. {Pour masquer l'unité extérieure fixée sur les murs en pierre ou les enduits ocre traditionnels, les installateurs proposent des cache-climats de standing.|Afin de respecter l'identité architecturale des ruelles et des propriétés de la commune, la pose d'un coffrage ventilé en aluminium thermolaqué est fortement recommandée.} {Ce dispositif esthétique protège le compresseur des rayons UV intenses de la Côte d'Azur, prolongeant la durée de vie du fluide R32 et augmentant le rendement saisonnier.|Ces caches ajourés n'entravent pas la circulation d'air nécessaire aux échanges thermiques et atténuent le niveau sonore extérieur de près de 3 dB.}`,

    `{Pour conserver le charme unique des propriétés à|Afin de préserver le cachet historique des habitations de} {nom}, {la discrétion visuelle de votre pompe à chaleur est essentielle près de {landmark}.|les groupes extérieurs font l'objet d'une intégration minutieuse à proximité directe de {landmark}.} {Il est d'usage d'implanter le groupe extérieur au sol derrière un paravent végétal ou de l'habiller d'un coffrage en bois de standing.|Les installateurs du 06 conçoivent des structures d'intégration sur mesure en harmonie avec les façades provençales ou contemporaines.} {Ces coffrages robustes protègent l'échangeur des vents chargés de sable ou d'humidité marine tout en éliminant toute nuisance sonore.|Ces habillages haut de gamme protègent les raccordements frigorifiques des intempéries et améliorent le SEER global de votre équipement.}`
  ];

  const template = anecdoteTemplates[Math.floor(rand() * anecdoteTemplates.length)];

  const replaced = template
    .replace(/{nom}/g, c.nom)
    .replace(/{landmark}/g, region.landmark);

  return spin(replaced, rand);
}

const faqPool = [
  {
    topic: "prix",
    q: "Quel est le prix moyen d'une climatisation réversible à {city} ?",
    a: "À {city}, pour un mono-split mural design de grande marque posé dans une seule pièce, comptez entre 1 500 € et 3 000 € TTC. Pour un système multi-split de standing ou un gainable invisible desservant 3 à 4 pièces, le budget moyen oscille de 4 500 € à 12 000 € TTC selon les contraintes de pose et de régulation thermique."
  },
  {
    topic: "aides",
    q: "Quelles subventions énergies sont disponibles à {city} en 2026 ?",
    a: "La pose d'une climatisation réversible (PAC air-air) de classe A+++ à {city} ouvre droit aux primes CEE (Certificats d'Économie d'Énergie) versées par les fournisseurs d'énergie, ainsi qu'à un taux de TVA réduit à 10% sur la pose. Ces aides de l'État sont réservées aux installations réalisées par un artisan certifié RGE Qualipac."
  },
  {
    topic: "copropriete",
    q: "Faut-il l'autorisation de la mairie ou du syndic pour poser une clim à {city} ?",
    a: "Oui, toute installation modifiant l'aspect extérieur d'un bâtiment à {city} requiert l'accord préalable écrit du syndic de copropriété et le dépôt d'une déclaration préalable (DP) en mairie. Si vous êtes dans un périmètre classé, l'accord des Architectes des Bâtiments de France (ABF) est également requis."
  },
  {
    topic: "consommation",
    q: "Quelle économie de chauffage peut-on faire avec une PAC à {city} ?",
    a: "Grâce à des coefficients de performance (COP) élevés, une climatisation réversible consomme 1 kW d'électricité pour restituer plus de 4 kW de chaleur. En remplaçant des radiateurs électriques grille-pain à {city}, vous pouvez diviser vos factures de chauffage hivernal par 3 ou 4."
  },
  {
    topic: "bruit",
    q: "Existe-t-il des risques de nuisances sonores pour les voisins à {city} ?",
    a: "Pour éviter tout conflit de voisinage à {city}, les frigoristes Qualipac installent les compresseurs extérieurs sur des plots amortisseurs de vibrations (silent-blocks) et préconisent des modèles silencieux (Daikin, Mitsubishi Electric) équipés de modes nuit limitant le niveau sonore extérieur sous les 40 dB(A)."
  },
  {
    topic: "entretien",
    q: "L'entretien d'une climatisation réversible est-il obligatoire à {city} ?",
    a: "Conformément à la réglementation de 2020, un entretien bisannuel par un frigoriste certifié est obligatoire pour les pompes à chaleur d'une puissance supérieure à 4 kW. Dans les Alpes-Maritimes, en raison de l'humidité littorale et du sel marin, un nettoyage annuel des filtres est fortement conseillé pour garantir la qualité de l'air."
  },
  {
    topic: "gainable",
    q: "Pourquoi choisir une climatisation gainable pour une villa à {city} ?",
    a: "La climatisation gainable est la solution invisible par excellence. L'unité intérieure est dissimulée en faux-plafond, et l'air est diffusé par des grilles de soufflage discrètes. Elle offre un confort acoustique exceptionnel (19 dB) et une régulation pièce par pièce intelligente (Airzone) idéale pour les villas de standing à {city}."
  },
  {
    topic: "residence",
    q: "Comment protéger sa résidence secondaire de l'humidité à {city} ?",
    a: "Grâce au mode déshumidification (Dry) ou hors-gel (10°C) programmable à distance via Wi-Fi, la climatisation réversible régule l'hygrométrie de votre résidence secondaire à {city} en votre absence. Elle protège vos peintures, boiseries et meubles haut de gamme du sel marin et des moisissures."
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
      let altitude = Math.round(5 + rand() * 45); // 5 to 50m (Littoral)
      if (region.id === "arriere-pays-montagne") {
        altitude = Math.round(150 + rand() * 650); // 150 to 800m (Collines/Montagne)
      }

      // Standing calculations (Nice / Cannes / Mougins have higher standing, adjust pricing)
      const baseStanding = region.standing;
      const localStandingMultiplier = baseStanding + (rand() * 0.15); // Add deterministic random variance

      // Climate & Market variables
      const installersCount = Math.round(8 + rand() * 14); // 8 to 22 premium installers
      const delaiMoyen = Math.round(1 + rand() * 2); // 1 to 3 days
      const hotDays = Math.round(15 + rand() * 25); // 15 to 40 hot days in 06

      // Math calculations for local authority data
      const btuRequired = (10 * (1 + (altitude / 1200))).toFixed(1);
      const savingsEstimated = Math.round(800 + rand() * 400);

      // Price brackets adjusted by standing
      const priceMin = Math.round(1400 * localStandingMultiplier);
      const priceMax = Math.round(4000 * localStandingMultiplier);
      const priceGainableMin = Math.round(5500 * localStandingMultiplier);
      const priceGainableMax = Math.round(13000 * localStandingMultiplier);

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
      const certifiedLevel = "Climaticien RGE Qualipac / Attestation réglementaire de manipulation des fluides";

      // Price Tiers object for page use
      const priceTiers = {
        splitMono: `${priceMin.toLocaleString('fr-FR')} €`,
        splitBi: `${Math.round(priceMin * 1.8).toLocaleString('fr-FR')} €`,
        splitTri: `${Math.round(priceMin * 2.5).toLocaleString('fr-FR')} €`,
        gainable: `${priceGainableMin.toLocaleString('fr-FR')} € – ${priceGainableMax.toLocaleString('fr-FR')} €`
      };

      // Guide contextual linking logic
      let featuredGuide = {
        title: "Aides financières climatisation 2026",
        slug: "aides-financieres-climatisation-2026"
      };

      if (region.guideSlug === "climatisation-copropriete-standing-nice-cannes") {
        featuredGuide = {
          title: "Climatisation en copropriété de standing à Nice et Cannes",
          slug: "climatisation-copropriete-standing-nice-cannes"
        };
      } else if (region.guideSlug === "climatisation-gainable-invisible-villa-cote-azur") {
        featuredGuide = {
          title: "Climatisation gainable invisible pour villas Côte d'Azur",
          slug: "climatisation-gainable-invisible-villa-cote-azur"
        };
      } else if (region.guideSlug === "climatisation-residence-secondaire-cote-azur") {
        featuredGuide = {
          title: "Climatisation de résidence secondaire sur la Côte d'Azur",
          slug: "climatisation-residence-secondaire-cote-azur"
        };
      } else if (region.guideSlug === "installateur-climatisation-premium-rge-alpes-maritimes") {
        featuredGuide = {
          title: "Sélectionner un installateur de climatisation premium RGE",
          slug: "installateur-climatisation-premium-rge-alpes-maritimes"
        };
      }

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
        faq,
        priceTiers,
        featuredGuide,
        standingMultiplier: localStandingMultiplier
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
