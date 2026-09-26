import Plotly from 'plotly.js-dist-min';
import { calculateZScore } from './westgard.js';

/**
 * Traccia la carta di controllo (Levey-Jennings) per un determinato analita e QC.
 *
 * @param {string} elementId L'ID dell'elemento div del DOM dove renderizzare il grafico.
 * @param {Array<Object>} points Array di dati storici e nuovi per il QC.
 * @param {number} mean Il target/media.
 * @param {number} sd La deviazione standard.
 * @param {string} title Titolo del grafico (es. 'Parametro: Pb, Controllo: CRM_LOW').
 */
export function renderControlChart(elementId, points, mean, sd, title = 'Control Chart') {
  // Prepara i dati per l'asse X (timestamp o indice) e l'asse Y (Z-score o Valore assoluto)
  // Scegliamo di plottare lo Z-score per uniformare la scala su una Levey-Jennings classica,
  // oppure il valore reale con le fasce della deviazione standard. Plottiamo il valore reale.

  const xData = points.map((p, i) => p.Analysis_Timestamp || `Point ${i + 1}`);
  const yData = points.map(p => p.Result);

  // Traccia i punti e la linea di connessione
  const trace1 = {
    x: xData,
    y: yData,
    mode: 'lines+markers',
    name: 'Valore QC',
    marker: {
      size: 8,
      color: points.map(p => {
         const z = calculateZScore(p.Result, mean, sd);
         if (Math.abs(z) > 3) return 'red';
         if (Math.abs(z) > 2) return 'orange';
         return 'green';
      })
    },
    line: {
      color: '#3b82f6', // blue-500
      width: 2
    },
    text: points.map(p => {
       const z = calculateZScore(p.Result, mean, sd);
       return `Batch: ${p.Batch_ID}<br>Z-score: ${z.toFixed(2)}`;
    }),
    hoverinfo: 'x+y+text'
  };

  const shapes = [
    // Linea Media
    { type: 'line', x0: 0, x1: 1, xref: 'paper', y0: mean, y1: mean, yref: 'y', line: { color: 'green', width: 2, dash: 'dot' } },
    // +2 SD
    { type: 'line', x0: 0, x1: 1, xref: 'paper', y0: mean + (2 * sd), y1: mean + (2 * sd), yref: 'y', line: { color: 'orange', width: 2, dash: 'dash' } },
    // -2 SD
    { type: 'line', x0: 0, x1: 1, xref: 'paper', y0: mean - (2 * sd), y1: mean - (2 * sd), yref: 'y', line: { color: 'orange', width: 2, dash: 'dash' } },
    // +3 SD
    { type: 'line', x0: 0, x1: 1, xref: 'paper', y0: mean + (3 * sd), y1: mean + (3 * sd), yref: 'y', line: { color: 'red', width: 2, dash: 'dash' } },
    // -3 SD
    { type: 'line', x0: 0, x1: 1, xref: 'paper', y0: mean - (3 * sd), y1: mean - (3 * sd), yref: 'y', line: { color: 'red', width: 2, dash: 'dash' } }
  ];

  const layout = {
    title: title,
    xaxis: { title: 'Tempo / Indice' },
    yaxis: {
      title: 'Risultato',
      range: [mean - (4 * sd), mean + (4 * sd)]
    },
    shapes: shapes,
    margin: { t: 40, r: 20, l: 50, b: 80 },
    showlegend: false
  };

  const config = { responsive: true };

  Plotly.newPlot(elementId, [trace1], layout, config);
}
