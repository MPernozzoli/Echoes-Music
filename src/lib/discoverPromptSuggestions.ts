import type { UserTasteProfile } from "@/types/conversation";

/** Codici lingua come in Profile.tsx (select Description Language). */
export const SUGGESTION_UI_LANGS = ["it", "en", "es", "fr", "de", "pt", "ja", "ko"] as const;
export type SuggestionUiLang = (typeof SUGGESTION_UI_LANGS)[number];

function isSuggestionUiLang(code: string): code is SuggestionUiLang {
  return (SUGGESTION_UI_LANGS as readonly string[]).includes(code);
}

/**
 * Allinea i testi dei suggerimenti alla lingua impostata in Profilo (`descriptionLanguage`).
 * Con `auto` usa la lingua del browser se supportata, altrimenti inglese.
 */
export function resolveSuggestionUiLang(descriptionLanguage: string): SuggestionUiLang {
  const raw = (descriptionLanguage || "auto").trim().toLowerCase();
  if (isSuggestionUiLang(raw)) return raw;
  if (raw === "auto" && typeof navigator !== "undefined" && navigator.language) {
    const primary = navigator.language.split("-")[0]?.toLowerCase() ?? "";
    if (isSuggestionUiLang(primary)) return primary;
  }
  return "en";
}

export const COLD_DISCOVER_PROMPTS_IT: string[] = [
  "Brani per camminare da soli di notte in città",
  "Musica per quando torni a casa stanco ma non triste",
  "Qualcosa tra malinconia e speranza, senza retorica",
  "Canzoni che sembrano un messaggio in bottiglia",
  "Ritmo leggero ma testo che resta addosso",
  "Atmosfera da fine estate, porte aperte, vento caldo",
  "Musica per studiare senza addormentarsi",
  "Brani che sanno di pioggia sul vetro",
  "Qualcosa di intimo da ascoltare con le cuffie",
  "Energia alta ma non da palestra — da strada",
  "Canzoni su amicizie finite senza litigi",
  "Musica per quando hai bisogno di un abbraccio sonoro",
  "Vibe da viaggio in treno, finestrino, pensieri",
  "Brani che profumano di nostalgia leggera",
  "Qualcosa di cinematico ma non epico",
  "Musica per cucinare di domenica sera",
  "Canzoni su ricominciare senza voler cancellare il passato",
  "Atmosfera notturna, luci al neon, solitudine buona",
  "Brani con cori che ti fanno venire i brividi",
  "Musica per quando vuoi piangere e poi alzarti",
  "Qualcosa tra elettronica e calore umano",
  "Canzoni che sembrano scritte per te ieri",
  "Musica per correre sotto la pioggia (metaforicamente)",
  "Brani da ascoltare dopo un messaggio lasciato in segreteria",
  "Atmosfera da camera oscura, luci basse, verità",
  "Musica per quando il mondo è troppo rumoroso",
  "Canzoni su confini rispettati e desideri tenuti",
  "Qualcosa di rarefatto, quasi sottovoce",
  "Brani che sanno di libertà appena ritrovata",
  "Musica per un tramonto in collina",
  "Canzoni su crescere e non riconoscersi del tutto",
  "Vibe da disco/funk ma con anima malinconica",
  "Musica per quando hai vinto una piccola battaglia",
  "Brani che odorano di libro vecchio e tè",
  "Qualcosa per ballare da soli in salotto",
  "Musica per quando ami qualcuno da lontano",
  "Canzoni su città che non sono più tue",
  "Atmosfera da primo giorno di qualcosa di nuovo",
  "Brani con chitarra acustica e silenzi importanti",
  "Musica per spegnere il telefono un’ora",
];

export const COLD_DISCOVER_PROMPTS_EN: string[] = [
  "Songs about past friendships that ended without a fight",
  "A song that feels like missing someone without wanting them back",
  "Music for walking alone in a city at night",
  "Songs that sound like emotional relief after a difficult time",
  "Something that captures gentle hope after heartbreak",
  "Music that feels like nostalgia without regret",
  "Tracks for a long train ride with nowhere to be",
  "Songs that feel like sunlight through blinds",
  "High energy but emotionally honest — not just hype",
  "Music for cleaning your room and resetting your head",
  "Songs about boundaries, softness, and self-respect",
  "Something cinematic for a midnight drive",
  "Music for when you’re proud of yourself but shy about it",
  "Songs that taste like rain and streetlights",
  "Warm analog vibes with a bittersweet lyric",
  "Music for the first week after a big change",
  "Songs about quiet rebellion and staying kind",
  "Something sparse and intimate — headphone music",
  "Tracks that feel like a hug from a stranger’s playlist",
  "Music for dancing alone in your kitchen",
  "Songs about places you’ll never live in again",
  "Angry-but-beautiful — not pure rage, something layered",
  "Music for studying late without feeling hollow",
  "Songs that sound like forgiveness you’re still earning",
  "Something between indie and R&B, late-night texture",
  "Music for when the city is loud but you’re still",
  "Songs about learning to trust yourself again",
  "Dreamy shoegaze-adjacent but with a pulse",
  "Music for a rainy Sunday and zero obligations",
  "Songs that feel like closing a chapter cleanly",
];

const COLD_DISCOVER_PROMPTS_ES: string[] = [
  "Música para caminar solo por la ciudad de noche",
  "Canciones sobre amistades que terminaron sin pelea",
  "Algo que suene a alivio emocional después de un mal trago",
  "Música con esperanza suave después de un desamor",
  "Canciones con nostalgia pero sin amargura",
  "Temas para un viaje largo en tren mirando por la ventana",
  "Ritmo alegre pero letra que se queda dentro",
  "Música para estudiar sin quedarte dormido",
  "Canciones que saben a lluvia en el cristal",
  "Algo íntimo para auriculares",
  "Energía alta pero con sentimiento, no solo fiesta",
  "Música para cuando necesitas un abrazo en forma de sonido",
  "Canciones sobre volver a empezar sin borrar el pasado",
  "Ambiente de neón nocturno y soledad buena",
  "Algo cinematográfico pero sin épica exagerada",
  "Música para cocinar un domingo por la tarde",
  "Canciones sobre límites sanos y deseos guardados",
  "Algo etéreo, casi en susurro",
  "Música para un atardecer en la colina",
  "Canciones sobre crecer y ya no reconocerte del todo",
  "Funk/disco con alma melancólica",
  "Música para cuando ganaste una pequeña batalla",
  "Canciones que huelen a libro viejo y té",
  "Algo para bailar solo en el salón",
  "Música para cuando quieres llorar y luego levantarte",
  "Canciones sobre ciudades que ya no son tuyas",
  "Ambiente de primer día de algo nuevo",
  "Guitarra acústica y silencios que pesan",
  "Música para apagar el móvil una hora",
];

const COLD_DISCOVER_PROMPTS_FR: string[] = [
  "Musique pour marcher seul dans une ville la nuit",
  "Chansons sur des amitiés finies sans dispute",
  "Quelque chose qui sonne comme un soulagement après une épreuve",
  "Musique qui garde un espoir doux après une rupture",
  "Chansons nostalgiques mais sans amertume",
  "Morceaux pour un long trajet en train, regard sur la vitre",
  "Rythme léger mais des paroles qui restent",
  "Musique pour réviser sans s’endormir",
  "Chansons qui sentent la pluie sur la fenêtre",
  "Quelque chose d’intime au casque",
  "Énergie haute mais sincère — pas que de la hype",
  "Musique pour quand il te faut un câlin sonore",
  "Chansons sur repartir sans effacer le passé",
  "Ambiance néon nocturne, solitude douce",
  "Quelque chose de cinématique sans être épique",
  "Musique pour cuisiner un dimanche soir",
  "Chansons sur des limites respectées et des désirs contenus",
  "Quelque chose d’aéré, presque chuchoté",
  "Musique pour un coucher de soleil sur la colline",
  "Chansons sur grandir sans tout à fait se reconnaître",
  "Disco/funk avec une âme mélancolique",
  "Musique pour après une petite victoire",
  "Chansons qui sentent le vieux livre et le thé",
  "Quelque chose pour danser seul au salon",
  "Musique pour pleurer puis se relever",
  "Chansons sur des villes qui ne sont plus les tiennes",
  "Ambiance de premier jour de quelque chose de neuf",
  "Guitare acoustique et des silences qui comptent",
  "Musique pour éteindre le téléphone une heure",
];

const COLD_DISCOVER_PROMPTS_DE: string[] = [
  "Musik zum allein durch die Stadt laufen bei Nacht",
  "Lieder über Freundschaften, die ohne Streit endeten",
  "Etwas, das sich nach emotionaler Erleichterung anfühlt",
  "Musik mit sanfter Hoffnung nach Liebeskummer",
  "Lieder mit Nostalgie, aber ohne Bitterkeit",
  "Tracks für eine lange Zugfahrt am Fenster",
  "Leichter Groove, aber Texte, die bleiben",
  "Musik zum Lernen ohne wegzudösen",
  "Lieder, die nach Regen auf der Scheibe klingen",
  "Etwas Intimes für den Kopfhörer",
  "Hohe Energie, aber ehrlich gefühlt — nicht nur Party",
  "Musik, wenn du eine klangliche Umarmung brauchst",
  "Lieder über Neuanfang ohne das Alte zu löschen",
  "Nacht-Stimmung, Neon, gute Einsamkeit",
  "Etwas Cinematic, aber nicht überladen episch",
  "Musik zum Sonntagabend-Kochen",
  "Lieder über Grenzen und zurückgehaltene Wünsche",
  "Etwas Luftiges, fast flüsternd",
  "Musik für den Sonnenuntergang am Hügel",
  "Lieder darüber, erwachsen zu werden und sich fremd zu fühlen",
  "Disco/Funk mit melancholischer Seele",
  "Musik nach einem kleinen Sieg",
  "Lieder, die nach altem Buch und Tee riechen",
  "Etwas zum Alleine-Tanzen in der Küche",
  "Musik zum Weinen und dann wieder Aufstehen",
  "Lieder über Städte, in denen du nicht mehr lebst",
  "Stimmung vom ersten Tag von etwas Neuem",
  "Akustikgitarre und bedeutsame Pausen",
  "Musik, um das Handy eine Stunde auszulassen",
];

const COLD_DISCOVER_PROMPTS_PT: string[] = [
  "Música para caminhar sozinho à noite na cidade",
  "Canções sobre amizades que acabaram sem briga",
  "Algo que soe a alívio depois de um período difícil",
  "Música com esperança suave depois de um desgosto",
  "Canções nostálgicas mas sem ressentimento",
  "Faixas para uma viagem longa de comboio à janela",
  "Ritmo leve mas letra que fica na cabeça",
  "Música para estudar sem adormecer",
  "Canções com cheiro a chuva no vidro",
  "Algo íntimo para ouvir de fones",
  "Energia alta mas emocionalmente honesta",
  "Música para quando precisas de um abraço em som",
  "Canções sobre recomeçar sem apagar o passado",
  "Ambiente de néon à noite, solidão boa",
  "Algo cinematográfico sem ser épico demais",
  "Música para cozinhar num domingo à tarde",
  "Canções sobre limites e desejos guardados",
  "Algo rarefeito, quase em sussurro",
  "Música para o pôr do sol na colina",
  "Canções sobre crescer e já não te reconheceres",
  "Disco/funk com alma melancólica",
  "Música depois de uma pequena vitória",
  "Canções que cheiram a livro velho e chá",
  "Algo para dançar sozinho na sala",
  "Música para chorar e depois levantar",
  "Canções sobre cidades que já não são tuas",
  "Ambiente de primeiro dia de algo novo",
  "Violão acústico e silêncios importantes",
  "Música para desligar o telemóvel uma hora",
];

const COLD_DISCOVER_PROMPTS_JA: string[] = [
  "夜の街を一人で歩きたくなるような曲",
  "喧嘩別れでは終わらなかった友情の歌",
  "辛い時期のあとに心が軽くなるような音楽",
  "失恋のあとにも穏やかな希望がにじむ曲",
  "後悔より懐かしさが勝つようなノスタルジー",
  "窓際の長い電車の旅に合うプレイリスト",
  "明るいのに歌詞が胸に残る曲",
  "眠くならずに勉強できるBGM",
  "窓に雨が伝う夜みたいな雰囲気の曲",
  "ヘッドフォンで聴きたい親密な一曲",
  "テンションは高いけど感情がこもった曲",
  "ぎゅっと抱きしめてほしい夜のための音楽",
  "過去を消さずに前に進む気持ちの曲",
  "ネオンと静かな孤独の夜用",
  "映画のワンシーンみたいだけど大げさじゃない曲",
  "日曜の夕方の料理に合う音楽",
  "境界線と抑えた願いについての歌",
  "かすかで息のような静かな曲",
  "丘の上の夕焼けに合うプレイリスト",
  "大人になって自分が少し違って見える頃の曲",
  "メランコリーが滲むディスコ／ファンク",
  "小さな勝利のあとの一曲",
  "古い本とお茶の匂いがするような曲",
  "キッチンで一人で踊りたくなる音楽",
  "泣いたあと立ち上がれる曲",
  "もう住まない街についての歌",
  "何かが始まった初日の空気の音楽",
  "アコギと意味のある沈黙の曲",
  "スマホを一時間オフにしたいときの音楽",
];

const COLD_DISCOVER_PROMPTS_KO: string[] = [
  "밤에 도시를 혼자 걸을 때 어울리는 음악",
  "다툼 없이 끝난 우정에 대한 노래",
  "힘든 시간 뒤 마음이 조금 나아지는 듯한 곡",
  "이별 뒤에도 부드러운 희망이 느껴지는 음악",
  "후회보다 그리움이 큰 노스탤지어",
  "창가 자리 기차 여행에 맞는 플레이리스트",
  "경쾌하지만 가사가 마음에 남는 곡",
  "졸지 않고 공부할 때 듣기 좋은 음악",
  "빗방울이 유리에 흐르는 밤 같은 분위기",
  "헤드폰으로 듣고 싶은 은밀한 한 곡",
  "텐션은 높지만 감정이 솔직한 음악",
  "누군가의 포옹이 필요한 밤을 위한 곡",
  "과거를 지우지 않고 다시 시작하는 마음",
  "네온과 조용한 고독이 어우러진 밤",
  "영화 한 장면 같지만 과하지 않은 곡",
  "일요일 저녁 요리할 때 듣기 좋은 음악",
  "경계와 참아온 바람에 대한 노래",
  "속삭임처럼 옅고 조용한 곡",
  "언덕 위 노을에 어울리는 플레이리스트",
  "자라면서 나답지 않게 느껴질 때의 음악",
  "멜랑꼴리가 스며드는 디스코/펑크",
  "작은 승리 직후에 듣고 싶은 곡",
  "오래된 책과 차 향이 나는 듯한 노래",
  "부엌에서 혼자 춤추고 싶을 때",
  "울고 나서 다시 일어설 수 있는 음악",
  "더 이상 살지 않는 도시에 대한 노래",
  "무언가가 시작된 첫날의 공기",
  "어쿠스틱 기타와 의미 있는 침묵",
  "한 시간 동안 휴대폰을 끄고 싶을 때",
];

const COLD_BY_LANG: Record<SuggestionUiLang, string[]> = {
  it: COLD_DISCOVER_PROMPTS_IT,
  en: COLD_DISCOVER_PROMPTS_EN,
  es: COLD_DISCOVER_PROMPTS_ES,
  fr: COLD_DISCOVER_PROMPTS_FR,
  de: COLD_DISCOVER_PROMPTS_DE,
  pt: COLD_DISCOVER_PROMPTS_PT,
  ja: COLD_DISCOVER_PROMPTS_JA,
  ko: COLD_DISCOVER_PROMPTS_KO,
};

/** Pool freddo solo nella lingua UI scelta in Profilo. */
function coldPoolForLocale(locale: SuggestionUiLang): string[] {
  return dedupeLowercase([...COLD_BY_LANG[locale]]);
}

interface PersonalCopy {
  theme: ((t: string) => string)[];
  genre: ((g: string) => string)[];
  moodA: (m: string) => string;
  moodB: (m: string) => string;
  energyLow: [string, string];
  energyHigh: [string, string];
  energyMid: string;
  summary: (hint: string) => string;
}

const PERSONAL_COPY: Record<SuggestionUiLang, PersonalCopy> = {
  it: {
    theme: [
      (t) => `Brani dove si sente forte: ${t}`,
      (t) => `Musica che resta attaccata a: ${t}`,
      (t) => `Qualcosa nel segno di «${t}», emotivo`,
      (t) => `Canzoni che respirano ${t}`,
    ],
    genre: [
      (g) => `Altro ${g}, ma intimo — non solo genere`,
      (g) => `Musica ${g} per quando la testa non spegne`,
      (g) => `${g} con profondità, non superficie`,
    ],
    moodA: (m) => `Musica coerente con questo stato d’animo: ${m}`,
    moodB: (m) => `Brani che continuano il filo di: ${m}`,
    energyLow: ["Qualcosa di molto calmo, quasi sottovoce", "Musica morbida per abbassare i giri"],
    energyHigh: ["Brani intensi che scaricano tensione", "Musica ad alta energia ma con sentimento"],
    energyMid: "Equilibrio tra ritmo e malinconia",
    summary: (hint) => `Qualcosa che si allinea a come ascolti ultimamente: ${hint}`,
  },
  en: {
    theme: [
      (t) => `Tracks where you really feel: ${t}`,
      (t) => `Music that keeps circling around: ${t}`,
      (t) => `Something in the spirit of “${t}”, emotionally`,
      (t) => `Songs that breathe ${t}`,
    ],
    genre: [
      (g) => `More ${g}, but intimate — not just the genre tag`,
      (g) => `${g} for when your mind won’t quiet down`,
      (g) => `${g} with depth, not surface`,
    ],
    moodA: (m) => `Music that fits this mood: ${m}`,
    moodB: (m) => `Songs that continue the thread of: ${m}`,
    energyLow: ["Something very calm, almost whispered", "Soft music to slow your RPMs"],
    energyHigh: ["Intense tracks that release tension", "High-energy music that still has heart"],
    energyMid: "Balance between groove and melancholy",
    summary: (hint) => `Something aligned with how you’ve been listening lately: ${hint}`,
  },
  es: {
    theme: [
      (t) => `Canciones donde se note fuerte: ${t}`,
      (t) => `Música que se queda pegada a: ${t}`,
      (t) => `Algo en la línea de «${t}», emocional`,
      (t) => `Temas que respiran ${t}`,
    ],
    genre: [
      (g) => `Más ${g}, pero íntimo — no solo la etiqueta`,
      (g) => `Música ${g} para cuando la cabeza no para`,
      (g) => `${g} con profundidad, no superficialidad`,
    ],
    moodA: (m) => `Música que encaje con este estado de ánimo: ${m}`,
    moodB: (m) => `Canciones que siguen el hilo de: ${m}`,
    energyLow: ["Algo muy calmado, casi en susurro", "Música suave para bajar revoluciones"],
    energyHigh: ["Temas intensos que sueltan tensión", "Música enérgica pero con sentimiento"],
    energyMid: "Equilibrio entre ritmo y melancolía",
    summary: (hint) => `Algo alineado con cómo escuchas últimamente: ${hint}`,
  },
  fr: {
    theme: [
      (t) => `Morceaux où l’on sent fortement : ${t}`,
      (t) => `Musique qui reste accrochée à : ${t}`,
      (t) => `Quelque chose dans l’esprit de « ${t} », émotionnel`,
      (t) => `Chansons qui respirent ${t}`,
    ],
    genre: [
      (g) => `Plus de ${g}, mais intime — pas juste le genre`,
      (g) => `Musique ${g} quand la tête ne s’arrête pas`,
      (g) => `${g} avec de la profondeur, pas en surface`,
    ],
    moodA: (m) => `Musique qui colle à cette humeur : ${m}`,
    moodB: (m) => `Chansons qui prolongent le fil de : ${m}`,
    energyLow: ["Quelque chose de très calme, presque chuchoté", "Musique douce pour ralentir"],
    energyHigh: ["Morceaux intenses qui relâchent la tension", "Musique très énergique mais avec du cœur"],
    energyMid: "Équilibre entre rythme et mélancolie",
    summary: (hint) => `Quelque chose aligné avec tes écoutes récentes : ${hint}`,
  },
  de: {
    theme: [
      (t) => `Lieder, in denen man stark spürt: ${t}`,
      (t) => `Musik, die an hängen bleibt: ${t}`,
      (t) => `Etwas im Geist von „${t}“, emotional`,
      (t) => `Songs, die ${t} atmen`,
    ],
    genre: [
      (g) => `Mehr ${g}, aber intim — nicht nur das Genre`,
      (g) => `${g}-Musik, wenn der Kopf nicht ausgeht`,
      (g) => `${g} mit Tiefe, nicht nur Oberfläche`,
    ],
    moodA: (m) => `Musik, die zu dieser Stimmung passt: ${m}`,
    moodB: (m) => `Lieder, die den Faden weiterziehen: ${m}`,
    energyLow: ["Etwas sehr Ruhiges, fast geflüstert", "Sanfte Musik zum Runterkommen"],
    energyHigh: ["Intensive Tracks, die Spannung lösen", "Energiegeladene Musik mit Herz"],
    energyMid: "Balance zwischen Groove und Melancholie",
    summary: (hint) => `Etwas, das zu deinem letzten Hörgewohnheiten passt: ${hint}`,
  },
  pt: {
    theme: [
      (t) => `Músicas onde se sinta forte: ${t}`,
      (t) => `Música que fica presa a: ${t}`,
      (t) => `Algo no espírito de «${t}», emocional`,
      (t) => `Canções que respiram ${t}`,
    ],
    genre: [
      (g) => `Mais ${g}, mas íntimo — não só o género`,
      (g) => `Música ${g} para quando a cabeça não para`,
      (g) => `${g} com profundidade, não superficialidade`,
    ],
    moodA: (m) => `Música que combine com este estado de espírito: ${m}`,
    moodB: (m) => `Canções que continuam o fio de: ${m}`,
    energyLow: ["Algo muito calmo, quase num sussurro", "Música suave para baixar as rotações"],
    energyHigh: ["Temas intensos que libertam tensão", "Música energética mas com sentimento"],
    energyMid: "Equilíbrio entre ritmo e melancolia",
    summary: (hint) => `Algo alinhado com o que tens ouvido ultimamente: ${hint}`,
  },
  ja: {
    theme: [
      (t) => `「${t}」が強く伝わる曲`,
      (t) => `「${t}」に心が留まる音楽`,
      (t) => `「${t}」のニュアンスがにじむ、感情のこもった一曲`,
      (t) => `「${t}」の空気をまとうような曲`,
    ],
    genre: [
      (g) => `ジャンルだけじゃなく、親密な${g}`,
      (g) => `頭が止まらない夜の${g}`,
      (g) => `表面だけじゃない深みのある${g}`,
    ],
    moodA: (m) => `この気分に合う音楽: ${m}`,
    moodB: (m) => `この流れをつなぐ曲: ${m}`,
    energyLow: ["とても静かで、ささやきに近い一曲", "テンポを落としたい夜のやわらかい音楽"],
    energyHigh: ["緊張をほどく激しめの曲", "勢いはあるのに心のこもった音楽"],
    energyMid: "リズムとメランコリーのバランス",
    summary: (hint) => `最近の聴き方に沿う一曲: ${hint}`,
  },
  ko: {
    theme: [
      (t) => `「${t}」이 강하게 느껴지는 곡`,
      (t) => `「${t}」에 마음이 머무는 음악`,
      (t) => `「${t}」의 뉘앙스가 스며드는 감성적인 한 곡`,
      (t) => `「${t}」의 공기를 닮은 노래`,
    ],
    genre: [
      (g) => `장르 태그만이 아닌, 친밀한 ${g}`,
      (g) => `머리가 멈추지 않을 때의 ${g}`,
      (g) => `겉만이 아닌 깊이 있는 ${g}`,
    ],
    moodA: (m) => `이 기분에 맞는 음악: ${m}`,
    moodB: (m) => `이 흐름을 이어 주는 곡: ${m}`,
    energyLow: ["아주 잔잔하고 속삭임에 가까운 곡", "템포를 낮추고 싶을 때의 부드러운 음악"],
    energyHigh: ["긴장을 풀어 주는 강한 곡", "에너지는 있지만 마음이 담긴 음악"],
    energyMid: "리듬과 멜랑콜리의 균형",
    summary: (hint) => `요즘 듣는 방식과 맞는 한 곡: ${hint}`,
  },
};

function buildPersonalizedCandidates(taste: UserTasteProfile, locale: SuggestionUiLang): string[] {
  const copy = PERSONAL_COPY[locale];
  const out: string[] = [];
  const themes = (taste.userStandardAxes.dominantThemes || []).map((x) => x.trim()).filter(Boolean);
  const genres = (taste.genreAffinityTags || []).map((x) => x.trim()).filter(Boolean);
  const mood = truncateMood(taste.userStandardAxes.moodLabel || "", 90);
  const energy = taste.userStandardAxes.energy;

  themes.slice(0, 6).forEach((t, i) => {
    out.push(copy.theme[i % copy.theme.length](t));
  });
  genres.slice(0, 5).forEach((g, i) => {
    out.push(copy.genre[i % copy.genre.length](g));
  });

  if (mood) {
    out.push(copy.moodA(mood));
    out.push(copy.moodB(mood));
  }

  if (energy === "low") {
    out.push(copy.energyLow[0], copy.energyLow[1]);
  } else if (energy === "high") {
    out.push(copy.energyHigh[0], copy.energyHigh[1]);
  } else {
    out.push(copy.energyMid);
  }

  const summary = (taste.globalSummary || "").trim();
  if (summary.length > 50) {
    out.push(copy.summary(truncateMood(summary, 100)));
  }

  return out;
}

function mulberry32(seed: number): () => number {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(parts: string[]): number {
  let h = 0;
  for (const p of parts) {
    for (let i = 0; i < p.length; i++) {
      h = Math.imul(31, h) + p.charCodeAt(i) | 0;
    }
  }
  return h >>> 0;
}

function shuffleInPlace<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function tasteStrength(taste: UserTasteProfile): number {
  const summary = (taste.globalSummary || "").trim();
  const themes = taste.userStandardAxes.dominantThemes?.length ?? 0;
  const genres = taste.genreAffinityTags?.length ?? 0;
  const mood = (taste.userStandardAxes.moodLabel || "").trim().length;

  let s = 0;
  if (summary.length > 80) s += 0.38;
  else if (summary.length > 35) s += 0.22;
  if (themes >= 4) s += 0.28;
  else if (themes >= 2) s += 0.16;
  if (genres >= 3) s += 0.2;
  else if (genres >= 1) s += 0.1;
  if (mood > 40) s += 0.18;
  else if (mood > 12) s += 0.1;
  return Math.min(1, s);
}

/** Peso 0–1: quanto il profilo globale deve influenzare i suggerimenti. */
export function personalizationWeight(
  completedSearchCount: number,
  taste: UserTasteProfile
): number {
  const strength = tasteStrength(taste);
  const countFactor = Math.min(1, completedSearchCount / 7);
  return Math.min(1, 0.45 * strength + 0.55 * countFactor);
}

function truncateMood(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function dedupeLowercase(prompts: string[]): string[] {
  const seen = new Set<string>();
  const res: string[] = [];
  for (const p of prompts) {
    const k = p.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    res.push(p.trim());
  }
  return res;
}

export interface PickDiscoverPromptSuggestionsOptions {
  userTasteProfile: UserTasteProfile;
  /** Numero di ricerche completate (turni assistant) su tutte le chat. */
  completedSearchCount: number;
  /** Stesso valore del select "Description Language" in Profilo (`useApp().descriptionLanguage`). */
  descriptionLanguage?: string;
  count?: number;
  /** Per variare il mazzo tra chat vuote diverse. */
  sessionKey?: string;
}

export function pickDiscoverPromptSuggestions(options: PickDiscoverPromptSuggestionsOptions): string[] {
  const {
    userTasteProfile,
    completedSearchCount,
    descriptionLanguage = "auto",
    count = 6,
    sessionKey = "",
  } = options;

  const uiLang = resolveSuggestionUiLang(descriptionLanguage);
  const coldPool = coldPoolForLocale(uiLang);
  const w = personalizationWeight(completedSearchCount, userTasteProfile);
  let nPersonal = Math.round(count * w);
  if (completedSearchCount === 0 && tasteStrength(userTasteProfile) < 0.15) {
    nPersonal = 0;
  }

  const seed = hashSeed([
    sessionKey,
    String(completedSearchCount),
    uiLang,
    userTasteProfile.globalSummary.slice(0, 40),
    (userTasteProfile.genreAffinityTags || []).join(","),
  ]);
  const rand = mulberry32(seed);

  const personalizedRaw = buildPersonalizedCandidates(userTasteProfile, uiLang);
  shuffleInPlace(personalizedRaw, rand);
  const personalized = dedupeLowercase(personalizedRaw);

  const pickedPersonal = personalized.slice(0, nPersonal);
  const needCold = count - pickedPersonal.length;

  const coldCopy = [...coldPool];
  shuffleInPlace(coldCopy, rand);
  const pickedCold = coldCopy.filter((c) => !pickedPersonal.some((p) => p.toLowerCase() === c.toLowerCase())).slice(0, needCold);

  const combined: string[] = [...pickedPersonal, ...pickedCold];
  if (combined.length < count) {
    const extra = coldCopy.filter((c) => !combined.some((x) => x.toLowerCase() === c.toLowerCase()));
    for (const c of extra) {
      if (combined.length >= count) break;
      combined.push(c);
    }
  }

  shuffleInPlace(combined, rand);
  return dedupeLowercase(combined).slice(0, count);
}

/** Compatibilità: primi prompt freddi in inglese. */
export const examplePrompts: string[] = COLD_DISCOVER_PROMPTS_EN.slice(0, 6);
