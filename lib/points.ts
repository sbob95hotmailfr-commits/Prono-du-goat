// Calcule les points d'un pronostic selon le système Standard (SPEC section 5)
export function calculatePoints(
  homePred: number,
  awayPred: number,
  homeReal: number,
  awayReal: number
): number {
  // Score exact → 3 points
  if (homePred === homeReal && awayPred === awayReal) return 3;

  // Bon vainqueur ou bon match nul → 1 point
  const predResult = Math.sign(homePred - awayPred); // -1, 0, ou 1
  const realResult = Math.sign(homeReal - awayReal);
  if (predResult === realResult) return 1;

  return 0;
}

export function getPointsLabel(points: number): string {
  if (points === 3) return "⭐ Score exact";
  if (points === 1) return "✓ Bon résultat";
  return "✗ Raté";
}

// Calcul du bonus buteur (multi-slots)
// predictedIds : tous les joueurs pronostiqués par l'utilisateur pour ce match
// actualIds    : tous les buteurs réels du match (peut avoir doublons si hat-trick)
// Règles :
//   - Tous les buteurs réels prédits exactement (même multiset) → 3 pts bonus
//   - Au moins 1 buteur prédit se trouve parmi les réels        → 1 pt bonus
//   - Aucun match                                               → 0
export function calculateScorerBonusMulti(
  predictedIds: string[],
  actualIds: string[]
): number {
  if (!predictedIds.length || !actualIds.length) return 0;

  const actualSet = [...actualIds].sort().join(",");
  const predSet   = [...predictedIds].sort().join(",");

  if (predSet === actualSet) return 3;

  const hasOne = predictedIds.some((id) => actualIds.includes(id));
  return hasOne ? 1 : 0;
}

// Compat ancienne API (1 joueur unique)
export function calculateScorerBonus(
  predictedPlayerId: string,
  actualScorerIds: string[]
): number {
  return actualScorerIds.includes(predictedPlayerId) ? 1 : 0;
}
