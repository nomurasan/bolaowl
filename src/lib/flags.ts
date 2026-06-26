/**
 * Utility for mapping football team/national selection names to flag emojis.
 * Supports clean normalized checks (case insensitive, removing accents).
 */

const flagMap: Record<string, string> = {
  // Nations
  "brasil": "🇧🇷",
  "brazil": "🇧🇷",
  "argentina": "🇦🇷",
  "alemanha": "🇩🇪",
  "germany": "🇩🇪",
  "franca": "🇫🇷",
  "frança": "🇫🇷",
  "france": "🇫🇷",
  "espanha": "🇪🇸",
  "spain": "🇪🇸",
  "portugal": "🇵🇹",
  "italia": "🇮🇹",
  "itália": "🇮🇹",
  "italy": "🇮🇹",
  "inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "england": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "uruguai": "🇺🇾",
  "uruguay": "🇺🇾",
  "holanda": "🇳🇱",
  "paises baixos": "🇳🇱",
  "países baixos": "🇳🇱",
  "netherlands": "🇳🇱",
  "belgica": "🇧🇪",
  "bélgica": "🇧🇪",
  "belgium": "🇧🇪",
  "croacia": "🇭🇷",
  "croácia": "🇭🇷",
  "croatia": "🇭🇷",
  "marrocos": "🇲🇦",
  "morocco": "🇲🇦",
  "japao": "🇯🇵",
  "japão": "🇯🇵",
  "japan": "🇯🇵",
  "coreia do sul": "🇰🇷",
  "korea": "🇰🇷",
  "estados unidos": "🇺🇸",
  "eua": "🇺🇸",
  "usa": "🇺🇸",
  "canada": "🇨🇦",
  "canadá": "🇨🇦",
  "mexico": "🇲🇽",
  "méxico": "🇲🇽",
  "colombia": "🇨🇴",
  "colômbia": "🇨🇴",
  "equador": "🇪🇨",
  "ecuador": "🇪🇨",
  "senegal": "🇸🇳",
  "camaroes": "🇨🇲",
  "camarões": "🇨🇲",
  "cameroon": "🇨🇲",
  "gana": "🇬🇭",
  "ghana": "🇬🇭",
  "suica": "🇨🇭",
  "suíça": "🇨🇭",
  "switzerland": "🇨🇭",
  "servia": "🇷🇸",
  "sérvia": "🇷🇸",
  "serbia": "🇷🇸",
  "dinamarca": "🇩🇰",
  "denmark": "🇩🇰",
  "tunisia": "🇹🇳",
  "tunísia": "🇹🇳",
  "arabia saudita": "🇸🇦",
  "arábia saudita": "🇸🇦",
  "saudi arabia": "🇸🇦",
  "australia": "🇦🇺",
  "austrália": "🇦🇺",
  "costa rica": "🇨🇷",
  "polonia": "🇵🇱",
  "polônia": "🇵🇱",
  "poland": "🇵🇱",
  "gales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "ira": "🇮🇷",
  "irã": "🇮🇷",
  "iran": "🇮🇷",
  "catar": "🇶🇦",
  "qatar": "🇶🇦",
  "chile": "🇨🇱",
  "paraguai": "🇵🇾",
  "paraguay": "🇵🇾",
  "peru": "🇵🇪",
  "venezuela": "🇻🇪",
  "bolivia": "🇧🇴",
  "bolívia": "🇧🇴",
  "haiti": "🇭🇹",
  "egito": "🇪🇬",
  "egypt": "🇪🇬",
  "nigeria": "🇳🇬",
  "nigéria": "🇳🇬",
  "argelia": "🇩🇿",
  "argélia": "🇩🇿",
  "algeria": "🇩🇿",
  "suecia": "🇸🇪",
  "suécia": "🇸🇪",
  "sweden": "🇸🇪",
  "ucrania": "🇺🇦",
  "ucrânia": "🇺🇦",
  "ukraine": "🇺🇦",
  "grecia": "🇬🇷",
  "grécia": "🇬🇷",
  "greece": "🇬🇷",
  "turquia": "🇹🇷",
  "turkey": "🇹🇷",
  "china": "🇨🇳",
  "india": "🇮🇳",
  "índia": "🇮🇳",
  "africa do sul": "🇿🇦",
  "áfrica do sul": "🇿🇦",
  "south africa": "🇿🇦",

  // Clubs / Extras
  "flamengo": "🔴⚫",
  "corinthians": "⚪⚫",
  "palmeiras": "🟢⚪",
  "sao paulo": "🔴⚪⚫",
  "são paulo": "🔴⚪⚫",
  "santos": "⚪⚫🐳",
  "gremio": "🔵⚪⚫",
  "grêmio": "🔵⚪⚫",
  "internacional": "🔴⚪",
  "inter": "🔴⚪",
  "atletico mineiro": "⚫⚪🐓",
  "atlético mineiro": "⚫⚪🐓",
  "galo": "⚫⚪🐓",
  "cruzeiro": "🔵⚪⭐",
  "vasco": "⚫⚪💢",
  "botafogo": "⚫⚪🔥",
  "fluminense": "🔴🟢⚪",
  "bahia": "🔵🔴⚪",
  "almada": "🟢⚽",
};

/**
 * Normalizes a string by converting it to lowercase and removing special accents.
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Resolves the flag emoji for a given team name.
 * If not matched directly, attempts a substring match.
 * Falls back to "⚽" if no match is found.
 */
export function getTeamFlag(teamName: string): string {
  if (!teamName) return "⚽";
  const normalized = normalizeString(teamName);

  // Exact match
  if (flagMap[normalized]) {
    return flagMap[normalized];
  }

  // Substring match
  const matchedKey = Object.keys(flagMap).find((key) => {
    return normalized.includes(key) || key.includes(normalized);
  });

  if (matchedKey) {
    return flagMap[matchedKey];
  }

  // Fallback
  return "⚽";
}

export interface Country {
  name: string;
  flag: string;
}

export const countriesList: Country[] = [
  { name: "Alemanha", flag: "🇩🇪" },
  { name: "Arábia Saudita", flag: "🇸🇦" },
  { name: "Argélia", flag: "🇩🇿" },
  { name: "Argentina", flag: "🇦🇷" },
  { name: "Austrália", flag: "🇦🇺" },
  { name: "Bélgica", flag: "🇧🇪" },
  { name: "Bolívia", flag: "🇧🇴" },
  { name: "Brasil", flag: "🇧🇷" },
  { name: "Camarões", flag: "🇨🇲" },
  { name: "Canadá", flag: "🇨🇦" },
  { name: "Catar", flag: "🇶🇦" },
  { name: "Chile", flag: "🇨🇱" },
  { name: "China", flag: "🇨🇳" },
  { name: "Colômbia", flag: "🇨🇴" },
  { name: "Coreia do Sul", flag: "🇰🇷" },
  { name: "Costa Rica", flag: "🇨🇷" },
  { name: "Croácia", flag: "🇭🇷" },
  { name: "Dinamarca", flag: "🇩🇰" },
  { name: "Equador", flag: "🇪🇨" },
  { name: "Escócia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { name: "Espanha", flag: "🇪🇸" },
  { name: "Estados Unidos", flag: "🇺🇸" },
  { name: "França", flag: "🇫🇷" },
  { name: "Gales", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  { name: "Gana", flag: "🇬🇭" },
  { name: "Grécia", flag: "🇬🇷" },
  { name: "Haiti", flag: "🇭🇹" },
  { name: "Holanda", flag: "🇳🇱" },
  { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Irã", flag: "🇮🇷" },
  { name: "Itália", flag: "🇮🇹" },
  { name: "Japão", flag: "🇯🇵" },
  { name: "Marrocos", flag: "🇲🇦" },
  { name: "México", flag: "🇲🇽" },
  { name: "Nigéria", flag: "🇳🇬" },
  { name: "Paraguai", flag: "🇵🇾" },
  { name: "Países Baixos", flag: "🇳🇱" },
  { name: "Peru", flag: "🇵🇪" },
  { name: "Polônia", flag: "🇵🇱" },
  { name: "Portugal", flag: "🇵🇹" },
  { name: "Senegal", flag: "🇸🇳" },
  { name: "Sérvia", flag: "🇷🇸" },
  { name: "Suécia", flag: "🇸🇪" },
  { name: "Suíça", flag: "🇨🇭" },
  { name: "Tunísia", flag: "🇹🇳" },
  { name: "Turquia", flag: "🇹🇷" },
  { name: "Ucrânia", flag: "🇺🇦" },
  { name: "Uruguai", flag: "🇺🇾" },
  { name: "Venezuela", flag: "🇻🇪" }
];
