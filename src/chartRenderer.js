import Plotly from 'plotly.js-dist-min';
import { calculateZScore } from './westgard.js';

/**
 * Traccia la carta di controllo (Levey-Jennings) per un determinato analita e QC.
 *
 * @param {string} elementId L'ID dell'elemento div del DOM dove renderizzare il grafico.
 * @param {Array<Object>} evaluatedPoints Array of points containing original point, effectiveMean, and effectiveSd.
 * @param {string} title Titolo del grafico (es. 'Parametro: Pb, Controllo: CRM_LOW').
 */
export function renderControlChart(elementId, evaluatedPoints, title = 'Control Chart') {
  const xData = evaluatedPoints.map((ep, i) => ep.originalPoint.Analysis_Timestamp || `Point ${i + 1}`);
  const yData = evaluatedPoints.map(ep => ep.value);

  // Traccia i punti e la linea di connessione
  const trace1 = {
    x: xData,
    y: yData,
    mode: 'lines+markers',
    name: 'Valore QC',
    marker: {
      size: 8,
      color: evaluatedPoints.map(ep => {
         if (!ep.evaluable) return 'gray';
         const z = calculateZScore(ep.value, ep.effectiveMean, ep.effectiveSd);
         if (Math.abs(z) > 3) return 'red';
         if (Math.abs(z) > 2) return 'orange';
         return 'green';
      })
    },
    line: {
      color: '#3b82f6', // blue-500
      width: 2
    },
    text: evaluatedPoints.map(ep => {
       if (!ep.evaluable) return `Batch: ${ep.batchId}<br>Not evaluable (No SD)`;
       const z = calculateZScore(ep.value, ep.effectiveMean, ep.effectiveSd);
       return `Batch: ${ep.batchId}<br>Z-score: ${z.toFixed(2)}`;
    }),
    hoverinfo: 'x+y+text'
  };

  // Create piecewise lines (as arrays of values) for Mean, +2SD, -2SD, +3SD, -3SD
  const meanLine = { x: xData, y: evaluatedPoints.map(ep => ep.effectiveMean), mode: 'lines', line: { color: 'green', width: 2, dash: 'dot' }, hoverinfo: 'skip' };
  const plus2SdLine = { x: xData, y: evaluatedPoints.map(ep => ep.effectiveMean + (2 * ep.effectiveSd)), mode: 'lines', line: { color: 'orange', width: 2, dash: 'dash' }, hoverinfo: 'skip' };
  const minus2SdLine = { x: xData, y: evaluatedPoints.map(ep => ep.effectiveMean - (2 * ep.effectiveSd)), mode: 'lines', line: { color: 'orange', width: 2, dash: 'dash' }, hoverinfo: 'skip' };
  const plus3SdLine = { x: xData, y: evaluatedPoints.map(ep => ep.effectiveMean + (3 * ep.effectiveSd)), mode: 'lines', line: { color: 'red', width: 2, dash: 'dash' }, hoverinfo: 'skip' };
  const minus3SdLine = { x: xData, y: evaluatedPoints.map(ep => ep.effectiveMean - (3 * ep.effectiveSd)), mode: 'lines', line: { color: 'red', width: 2, dash: 'dash' }, hoverinfo: 'skip' };

  // Calculate dynamic range for Y axis
  let minY = Infinity, maxY = -Infinity;
  evaluatedPoints.forEach(ep => {
    if (ep.evaluable) {
      minY = Math.min(minY, ep.effectiveMean - (4 * ep.effectiveSd));
      maxY = Math.max(maxY, ep.effectiveMean + (4 * ep.effectiveSd));
    }
    minY = Math.min(minY, ep.value);
    maxY = Math.max(maxY, ep.value);
  });

  if (minY === Infinity) { minY = 0; maxY = 100; } // Fallback

  // Add some padding to Y axis
  const padding = (maxY - minY) * 0.1;

  const layout = {
    title: title,
    xaxis: { title: 'Tempo / Indice' },
    yaxis: {
      title: 'Risultato',
      range: [minY - padding, maxY + padding]
    },
    margin: { t: 40, r: 20, l: 50, b: 80 },
    showlegend: false
  };

  const config = { responsive: true, displayModeBar: true };

  Plotly.newPlot(elementId, [trace1, meanLine, plus2SdLine, minus2SdLine, plus3SdLine, minus3SdLine], layout, config).then(() => {
    // Automatically trigger resize to ensure full width
    Plotly.Plots.resize(document.getElementById(elementId));
  });
}
