/**
 * Modulo per la persistenza su localStorage delle configurazioni QC (Target/Media e Dev. Standard)
 * e dello storico delle determinazioni.
 */

const CONFIG_KEY = 'qc_config';
const HISTORY_KEY = 'qc_history';

/**
 * Salva la configurazione per un parametro e un determinato Sample_ID QC.
 * Struttura: { [Parameter]: { [Sample_ID]: { mean: number, sd: number, ... } } }
 */
export function saveConfig(parameter, sampleId, params) {
  const config = getConfig();
  if (!config[parameter]) {
    config[parameter] = {};
  }
  config[parameter][sampleId] = {
    mean: parseFloat(params.mean),
    sd: params.sd !== '' ? parseFloat(params.sd) : null,
    uncertPrep: params.uncertPrep !== '' ? parseFloat(params.uncertPrep) : null,
    uncertMeas: params.uncertMeas !== '' ? parseFloat(params.uncertMeas) : null,
    nInHouse: params.nInHouse !== '' ? parseInt(params.nInHouse, 10) : 20
  };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

/**
 * Recupera tutta la configurazione dal localStorage.
 */
export function getConfig() {
  const data = localStorage.getItem(CONFIG_KEY);
  return data ? JSON.parse(data) : {};
}

/**
 * Recupera la configurazione (mean e sd) per un analita e uno specifico tipo di controllo.
 */
export function getQCParams(parameter, sampleId) {
  const config = getConfig();
  if (config[parameter] && config[parameter][sampleId]) {
    return config[parameter][sampleId];
  }
  return null;
}

/**
 * Esporta la configurazione in formato JSON (stringa).
 */
export function exportConfigJSON() {
  return JSON.stringify(getConfig(), null, 2);
}

/**
 * Importa la configurazione da una stringa JSON.
 */
export function importConfigJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Errore nell'importazione della configurazione:", e);
    return false;
  }
}

/**
 * Salva i dati storici dei campioni QC in localStorage.
 * Effettua il merge con i dati esistenti, evitando duplicati basati su Batch_ID e Sample_ID.
 * @param {Array<Object>} newQcData - I nuovi record QC da inserire.
 */
export function appendQCHistory(newQcData) {
  const existingHistory = getQCHistory();

  // Utilizziamo una mappa per sovrascrivere o ignorare duplicati (Batch_ID + Sample_ID)
  // Assumiamo che Parameter sia lo stesso per un dato Sample_ID, ma includiamolo nella chiave se serve.
  // Chiave = Batch_ID + '|' + Sample_ID + '|' + Parameter
  const historyMap = new Map();

  existingHistory.forEach(record => {
    const key = `${record.Batch_ID}|${record.Sample_ID}|${record.Parameter}`;
    historyMap.set(key, record);
  });

  newQcData.forEach(record => {
    const key = `${record.Batch_ID}|${record.Sample_ID}|${record.Parameter}`;
    // Aggiungiamo o aggiorniamo il record
    historyMap.set(key, record);
  });

  const mergedHistory = Array.from(historyMap.values());
  localStorage.setItem(HISTORY_KEY, JSON.stringify(mergedHistory));
  return mergedHistory;
}

/**
 * Recupera tutti i dati storici QC salvati nel localStorage.
 * @returns {Array<Object>}
 */
export function getQCHistory() {
  const data = localStorage.getItem(HISTORY_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Cancella lo storico QC.
 */
export function clearQCHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
