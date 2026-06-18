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

// Calcul du bonus buteur
// Retourne 1 si le joueur pronostiqué a marqué, 0 sinon
export function calculateScorerBonus(
  predictedPlayerId: string,
  actualScorerIds: string[]
): number {
  return actualScorerIds.includes(predictedPlayerId) ? 1 : 0;
}
