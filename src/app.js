import { readExcelFile, getQCSamples, exportToLIMS } from './excelHandler.js';
import { saveConfig, getConfig, getQCParams, exportConfigJSON, importConfigJSON } from './storage.js';
import { evaluateWestgardRules } from './westgard.js';
import { renderControlChart } from './chartRenderer.js';

let currentExcelData = [];
let currentViolations = [];
let sequenceBlocked = false;

// UI Elements
const tabs = {
  upload: document.getElementById('tab-upload'),
  config: document.getElementById('tab-config'),
  charts: document.getElementById('tab-charts')
};
const sections = {
  upload: document.getElementById('section-upload'),
  config: document.getElementById('section-config'),
  charts: document.getElementById('section-charts')
};

function switchTab(activeTabKey) {
  Object.keys(tabs).forEach(key => {
    if (key === activeTabKey) {
      tabs[key].className = "px-4 py-2 rounded font-semibold bg-blue-100 text-blue-700";
      sections[key].classList.remove('hidden');
    } else {
      tabs[key].className = "px-4 py-2 rounded font-semibold text-slate-600 hover:bg-slate-50";
      if (!tabs[key].classList.contains('hidden')) { // Charts tab might be hidden initially
         sections[key].classList.add('hidden');
      }
    }
  });
}

tabs.upload.addEventListener('click', () => switchTab('upload'));
tabs.config.addEventListener('click', () => { refreshConfigDisplay(); switchTab('config'); });
tabs.charts.addEventListener('click', () => { if (currentExcelData.length > 0) switchTab('charts'); });

// --- GESTIONE DRAG & DROP / FILE UPLOAD ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('bg-slate-100'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('bg-slate-100'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('bg-slate-100');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

async function handleFile(file) {
  uploadStatus.classList.remove('hidden');
  uploadStatus.className = "mt-4 text-sm font-medium text-blue-600";
  uploadStatus.textContent = "Lettura del file in corso...";

  try {
    const data = await readExcelFile(file);
    currentExcelData = data;
    uploadStatus.textContent = `File caricato con successo: ${data.length} righe totali.`;
    uploadStatus.className = "mt-4 text-sm font-medium text-green-600";

    // Raccogli parametri unici
    const parameters = [...new Set(data.map(d => d.Parameter).filter(Boolean))];
    const select = document.getElementById('select-param');
    select.innerHTML = '';
    parameters.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      select.appendChild(opt);
    });

    tabs.charts.classList.remove('hidden'); // Sblocca tab
    if (parameters.length > 0) {
      processParameter(parameters[0]);
    }
    switchTab('charts');

  } catch (e) {
    uploadStatus.textContent = "Errore durante la lettura del file Excel.";
    uploadStatus.className = "mt-4 text-sm font-medium text-red-600";
    console.error(e);
  }
}

// --- GESTIONE CONFIGURAZIONI ---
function refreshConfigDisplay() {
  document.getElementById('cfg-display').textContent = JSON.stringify(getConfig(), null, 2);
}

document.getElementById('btn-save-cfg').addEventListener('click', () => {
  const p = document.getElementById('cfg-param').value.trim();
  const qc = document.getElementById('cfg-qc').value.trim();
  const m = document.getElementById('cfg-mean').value;
  const s = document.getElementById('cfg-sd').value;

  if (p && qc && m !== '' && s !== '') {
    saveConfig(p, qc, m, s);
    refreshConfigDisplay();
    alert('Configurazione salvata!');
  } else {
    alert('Compila tutti i campi!');
  }
});

document.getElementById('btn-export-config').addEventListener('click', () => {
  const blob = new Blob([exportConfigJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'qc_database.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('import-config').addEventListener('change', (e) => {
  if (!e.target.files.length) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    if (importConfigJSON(event.target.result)) {
      alert('Configurazione importata con successo!');
      refreshConfigDisplay();
    }
  };
  reader.readAsText(e.target.files[0]);
});

// --- MOTORE DI VALUTAZIONE E RENDER ---
document.getElementById('select-param').addEventListener('change', (e) => {
  processParameter(e.target.value);
});

function processParameter(parameter) {
  const qcData = getQCSamples(currentExcelData);
  const paramQCData = qcData.filter(d => d.Parameter === parameter);

  const chartsContainer = document.getElementById('charts-container');
  chartsContainer.innerHTML = '';
  const tbody = document.getElementById('violations-tbody');
  tbody.innerHTML = '';

  let paramBlocked = false;

  // 1. Ordiniamo TUTTI i campioni QC del parametro cronologicamente
  paramQCData.sort((a, b) => new Date(a.Analysis_Timestamp) - new Date(b.Analysis_Timestamp));

  // 2. Prepariamo i dati per la valutazione calcolando preliminarmente gli Z-Score
  // e creando un array unificato per westgard.js
  const evalPoints = [];
  const pointsWithConfig = [];

  for (let p of paramQCData) {
      const cfg = getQCParams(parameter, p.Sample_ID);
      if (!cfg) {
          // Segnala errore bloccante se manca config per un QC
          paramBlocked = true;
          const tr = document.createElement('tr');
          tr.innerHTML = `<td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">Configurazione mancante per ${p.Sample_ID} (Parametro: ${parameter}). Impossibile valutare.</td>`;
          tbody.appendChild(tr);
      } else {
          pointsWithConfig.push(p);
          evalPoints.push({
             value: p.Result,
             batchId: p.Batch_ID || 'UNKNOWN',
             sampleId: p.Sample_ID,
             // Pre-calcoliamo qui se necessario, oppure lasciamo fare a westgard
             // siccome westgard accetta mean e sd globali, Dobbiamo ADATTARE westgard.js o passare z-score direttamente.
             // Per evitare di stravolgere westgard, gli passiamo il RESULT NORMALIZZATO o trasformiamo la logica di westgard.
             // SOLUZIONE MIGLIORE: Modificare westgard per accettare array di z-scores calcolati a monte.
          });
      }
  }

  if(paramBlocked) {
      updateExportStatus(true);
      return;
  }

  // --- RENDERING DEI GRAFICI PER SINGOLO SAMPLE_ID (come prima) ---
  const qcsById = {};
  pointsWithConfig.forEach(d => {
    if (!qcsById[d.Sample_ID]) qcsById[d.Sample_ID] = [];
    qcsById[d.Sample_ID].push(d);
  });

  Object.keys(qcsById).forEach((sampleId, idx) => {
    const points = qcsById[sampleId];
    const cfg = getQCParams(parameter, sampleId);

    const chartDiv = document.createElement('div');
    chartDiv.id = `chart-${idx}`;
    chartDiv.className = "bg-white p-4 border rounded shadow-sm";
    chartsContainer.appendChild(chartDiv);

    renderControlChart(chartDiv.id, points, cfg.mean, cfg.sd, `${parameter} - ${sampleId}`);
  });

  // --- VALUTAZIONE UNIFICATA WESTGARD (Novità per R_4s corretto) ---
  // Modifichiamo il westgard passandogli direttamente un array di oggetti
  // che hanno già i metadati (valore, mean, sd per quel punto)
  // oppure aggiorniamo westgard.js (fatto nel file) per ricevere l'array con {zScore, batchId}.

  // Calcoliamo lo zScore a monte per ogni punto, usando il proprio mean e sd

  const preCalculatedZScores = pointsWithConfig.map(p => {
      const cfg = getQCParams(parameter, p.Sample_ID);
      return {
          originalPoint: p,
          zScore: calculateZScore(p.Result, cfg.mean, cfg.sd),
          batchId: p.Batch_ID || 'UNKNOWN',
          value: p.Result // non usato dalla logica modificata se ha già zScore
      };
  });

  // Chiamiamo una variante unificata o adattata di evaluateWestgardRules.
  // evaluateWestgardRulesZ(preCalculatedZScores) -> restituisce le violazioni
  const violations = evaluateWestgardRulesUnified(preCalculatedZScores);

  violations.forEach(v => {
      const pt = preCalculatedZScores[v.index].originalPoint;
      if (v.status === 'rosso') paramBlocked = true;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold">${pt.Sample_ID}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${pt.Batch_ID || '-'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${pt.Result}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${v.zScore.toFixed(2)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-mono">${v.rule}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${v.status === 'rosso' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">
            ${v.status === 'rosso' ? 'Errore' : 'Avviso'}
          </span>
        </td>
      `;
      tbody.appendChild(tr);
  });

  updateExportStatus(paramBlocked);
}

// Funzione helper per valutare le regole su array pre-calcolato
function evaluateWestgardRulesUnified(zScores) {
  const violations = [];

  for (let i = 0; i < zScores.length; i++) {
    const current = zScores[i];
    const z = current.zScore;
    let ruleViolated = null;
    let status = 'verde';

    // 1_3s
    if (Math.abs(z) > 3) { ruleViolated = '1_3s'; status = 'rosso'; }
    // 2_2s
    else if (i >= 1) {
      const prev = zScores[i - 1];
      if ((z > 2 && prev.zScore > 2) || (z < -2 && prev.zScore < -2)) { ruleViolated = '2_2s'; status = 'rosso'; }
    }
    // R_4s
    if (!ruleViolated && i >= 1) {
       const prev = zScores[i - 1];
       if (current.batchId === prev.batchId && Math.abs(z - prev.zScore) > 4) {
         ruleViolated = 'R_4s'; status = 'rosso';
       } else if (i >= 2) {
           const batchPoints = zScores.slice(0, i+1).filter(p => p.batchId === current.batchId);
           if (batchPoints.length > 1) {
              const minZ = Math.min(...batchPoints.map(p => p.zScore));
              const maxZ = Math.max(...batchPoints.map(p => p.zScore));
              if (maxZ - minZ > 4 && (z === maxZ || z === minZ)) { ruleViolated = 'R_4s'; status = 'rosso'; }
           }
       }
    }
    // 4_1s
    if (!ruleViolated && i >= 3) {
      const p1 = zScores[i - 3].zScore; const p2 = zScores[i - 2].zScore; const p3 = zScores[i - 1].zScore;
      if ((z > 1 && p1 > 1 && p2 > 1 && p3 > 1) || (z < -1 && p1 < -1 && p2 < -1 && p3 < -1)) { ruleViolated = '4_1s'; status = 'rosso'; }
    }
    // 10_x
    if (!ruleViolated && i >= 9) {
      const last10 = zScores.slice(i - 9, i + 1);
      if (last10.every(p => p.zScore > 0) || last10.every(p => p.zScore < 0)) { ruleViolated = '10_x'; status = 'rosso'; }
    }
    // 1_2s
    if (!ruleViolated && Math.abs(z) > 2 && Math.abs(z) <= 3) { ruleViolated = '1_2s'; status = 'giallo'; }

    if (ruleViolated) violations.push({ index: i, rule: ruleViolated, status: status, zScore: z, batchId: current.batchId });
  }
  return violations;
}


function updateExportStatus(isBlocked) {
  sequenceBlocked = isBlocked;
  const badge = document.getElementById('batch-status-badge');
  const btnExport = document.getElementById('btn-export-lims');
  const overrideForm = document.getElementById('override-form');

  if (isBlocked) {
    badge.className = "px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-red-100 text-red-800";
    badge.textContent = "FUORI CONTROLLO";
    btnExport.disabled = true;
    overrideForm.classList.remove('hidden');
  } else {
    badge.className = "px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800";
    badge.textContent = "CONFORME";
    btnExport.disabled = false;
    overrideForm.classList.add('hidden');
  }
}

// --- OVERRIDE E EXPORT ---
document.getElementById('btn-submit-override').addEventListener('click', () => {
  const r = document.getElementById('ovr-reason').value;
  const a = document.getElementById('ovr-action').value;
  const auth = document.getElementById('ovr-authorizer').value;

  if (r && a && auth) {
    currentExcelData.forEach(d => {
      d.Override_Reason = r;
      d.Override_Action = a;
      d.Override_Authorizer = auth;
    });

    document.getElementById('btn-export-lims').disabled = false;
    document.getElementById('batch-status-badge').className = "px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-orange-100 text-orange-800";
    document.getElementById('batch-status-badge').textContent = "OVERRIDE ATTIVO";
    alert("Override applicato. Esportazione sbloccata.");
  } else {
    alert("Compila tutti i campi dell'override!");
  }
});

document.getElementById('btn-export-lims').addEventListener('click', () => {
  exportToLIMS(currentExcelData, `LIMS_Export_${new Date().getTime()}.xlsx`);
});
