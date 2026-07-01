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
// actualIds    : tous les buteurs réels du match (doublons inclus si hat-trick)
// Règle : +1 pt par buteur correctement pronostiqué (matching multiset)
export function calculateScorerBonusMulti(
  predictedIds: string[],
  actualIds: string[]
): number {
  if (!predictedIds.length || !actualIds.length) return 0;

  const remaining = [...actualIds];
  let points = 0;

  for (const id of predictedIds) {
    const idx = remaining.indexOf(id);
    if (idx !== -1) {
      points++;
      remaining.splice(idx, 1);
    }
  }

  return points;
}

// Compat ancienne API (1 joueur unique)
export function calculateScorerBonus(
  predictedPlayerId: string,
  actualScorerIds: string[]
): number {
  return actualScorerIds.includes(predictedPlayerId) ? 1 : 0;
}
