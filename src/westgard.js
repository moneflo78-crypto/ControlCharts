/**
 * Calcola lo Z-score per un valore dato.
 * @param {number} value - Il valore del campione QC.
 * @param {number} mean - Il valore atteso (target).
 * @param {number} sd - La deviazione standard.
 * @returns {number} Lo Z-score.
 */
export function calculateZScore(value, mean, sd) {
  if (sd === 0) return 0; // Prevenire divisione per zero
  return (value - mean) / sd;
}

/**
 * Valuta un array di punti QC per un singolo parametro applicando le regole di Westgard.
 * @param {Array<{value: number, batchId: string}>} points - Array di punti QC in ordine cronologico.
 * @param {number} mean - Il valore target del parametro.
 * @param {number} sd - La deviazione standard del parametro.
 * @returns {Array<{index: number, rule: string, status: string, zScore: number, batchId: string}>} Array con le violazioni.
 */
export function evaluateWestgardRules(points, mean, sd) {
  const violations = [];
  const zScores = points.map(p => ({
    ...p,
    zScore: calculateZScore(p.value, mean, sd)
  }));

  for (let i = 0; i < zScores.length; i++) {
    const current = zScores[i];
    const z = current.zScore;
    let ruleViolated = null;
    let status = 'verde'; // conforme

    // 1_3s: Un punto oltre 3SD
    if (Math.abs(z) > 3) {
      ruleViolated = '1_3s';
      status = 'rosso';
    }
    // 2_2s: Due punti consecutivi oltre 2SD dallo stesso lato
    else if (i >= 1) {
      const prev = zScores[i - 1];
      if ((z > 2 && prev.zScore > 2) || (z < -2 && prev.zScore < -2)) {
        ruleViolated = '2_2s';
        status = 'rosso';
      }
    }

    // R_4s: Differenza tra due punti dello stesso batch > 4SD
    if (!ruleViolated && i >= 1) {
       const prev = zScores[i - 1];
       if (current.batchId === prev.batchId && Math.abs(z - prev.zScore) > 4) {
         ruleViolated = 'R_4s';
         status = 'rosso';
       } else if (i >= 2) {
           // Cerca altri punti nello stesso batch per R_4s
           const batchPoints = zScores.slice(0, i+1).filter(p => p.batchId === current.batchId);
           if (batchPoints.length > 1) {
              const minZ = Math.min(...batchPoints.map(p => p.zScore));
              const maxZ = Math.max(...batchPoints.map(p => p.zScore));
              if (maxZ - minZ > 4) {
                 // Identifica se il punto corrente è uno dei colpevoli (per non flaggare punti precedenti innocenti)
                 if (z === maxZ || z === minZ) {
                     ruleViolated = 'R_4s';
                     status = 'rosso';
                 }
              }
           }
       }
    }

    // 4_1s: 4 punti consecutivi oltre 1SD dallo stesso lato
    if (!ruleViolated && i >= 3) {
      const p1 = zScores[i - 3].zScore;
      const p2 = zScores[i - 2].zScore;
      const p3 = zScores[i - 1].zScore;
      if (
        (z > 1 && p1 > 1 && p2 > 1 && p3 > 1) ||
        (z < -1 && p1 < -1 && p2 < -1 && p3 < -1)
      ) {
        ruleViolated = '4_1s';
        status = 'rosso';
      }
    }

    // 10_x: 10 punti consecutivi dallo stesso lato della media
    if (!ruleViolated && i >= 9) {
      const last10 = zScores.slice(i - 9, i + 1);
      const allPositive = last10.every(p => p.zScore > 0);
      const allNegative = last10.every(p => p.zScore < 0);
      if (allPositive || allNegative) {
        ruleViolated = '10_x';
        status = 'rosso';
      }
    }

    // 1_2s: Warning
    if (!ruleViolated && Math.abs(z) > 2 && Math.abs(z) <= 3) {
      ruleViolated = '1_2s';
      status = 'giallo';
    }

    if (ruleViolated) {
      violations.push({
        index: i,
        rule: ruleViolated,
        status: status,
        zScore: z,
        batchId: current.batchId
      });
    }
  }

  return violations;
}
