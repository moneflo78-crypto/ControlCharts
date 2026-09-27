/**
 * Modulo per la persistenza su localStorage delle configurazioni QC (Target/Media e Dev. Standard)
 * e dello storico delle determinazioni.
 */

const CONFIG_KEY = 'qc_config';

/**
 * Salva la configurazione per un parametro e un determinato Sample_ID QC.
 * Struttura: { [Parameter]: { [Sample_ID]: { mean: number, sd: number } } }
 */
export function saveConfig(parameter, sampleId, mean, sd) {
  const config = getConfig();
  if (!config[parameter]) {
    config[parameter] = {};
  }
  config[parameter][sampleId] = { mean: parseFloat(mean), sd: parseFloat(sd) };
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
