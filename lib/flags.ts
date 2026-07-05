export const FLAG_CODES: Record<string, string> = {
  "Mexique": "mx",
  "Afrique du Sud": "za",
  "Corée du Sud": "kr",
  "Tchéquie": "cz",
  "Canada": "ca",
  "Bosnie-Herzégovine": "ba",
  "Qatar": "qa",
  "Suisse": "ch",
  "Brésil": "br",
  "Maroc": "ma",
  "Haïti": "ht",
  "Écosse": "gb-sct",
  "États-Unis": "us",
  "Paraguay": "py",
  "Australie": "au",
  "Turquie": "tr",
  "Allemagne": "de",
  "Curaçao": "cw",
  "Côte d'Ivoire": "ci",
  "Équateur": "ec",
  "Pays-Bas": "nl",
  "Japon": "jp",
  "Suède": "se",
  "Tunisie": "tn",
  "Belgique": "be",
  "Égypte": "eg",
  "Iran": "ir",
  "Nouvelle-Zélande": "nz",
  "Espagne": "es",
  "Cap-Vert": "cv",
  "Arabie Saoudite": "sa",
  "Uruguay": "uy",
  "France": "fr",
  "Sénégal": "sn",
  "Irak": "iq",
  "Norvège": "no",
  "Argentine": "ar",
  "Algérie": "dz",
  "Autriche": "at",
  "Jordanie": "jo",
  "Portugal": "pt",
  "RD Congo": "cd",
  "Ouzbékistan": "uz",
  "Colombie": "co",
  "Angleterre": "gb-eng",
  "Croatie": "hr",
  "Ghana": "gh",
  "Panama": "pa",
};

const normalize = (s: string) => s.normalize("NFC").toLowerCase().trim();
const FLAG_CODES_NORMALIZED = Object.fromEntries(
  Object.entries(FLAG_CODES).map(([k, v]) => [normalize(k), v])
);

export function getFlagUrl(teamName: string, _size: "sm" | "md" | "lg" = "md"): string {
  const code = FLAG_CODES[teamName] ?? FLAG_CODES_NORMALIZED[normalize(teamName)];
  if (!code) return "";
  // flag-icons : tous les SVG normalisés au même ratio 4:3 → taille identique pour tous les pays
  return `https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/flags/4x3/${code}.svg`;
}
