import * as XLSX from 'xlsx';

/**
 * Legge un file Excel e restituisce i dati in formato JSON.
 * @param {File} file Il file Excel caricato dall'utente.
 * @returns {Promise<Array<Object>>} Array di righe Excel.
 */
export function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Filtra i dati identificando quali sono campioni di controllo (QC).
 * @param {Array<Object>} data L'intero set di dati dal file Excel.
 * @param {Array<string>} qcPrefixes Array di prefissi (es. 'BLK_', 'CRM_', 'DUP_').
 * @returns {Array<Object>} Solo le righe che rappresentano un QC.
 */
export function getQCSamples(data, qcPrefixes = ['BLK', 'CRM', 'DUP', 'QC']) {
  return data.filter(row => {
    const sampleId = row.Sample_ID ? row.Sample_ID.toUpperCase() : '';
    return qcPrefixes.some(prefix => sampleId.startsWith(prefix.toUpperCase()));
  });
}

/**
 * Genera un nuovo file Excel a partire dai dati validati e avvia il download.
 * @param {Array<Object>} data I dati da esportare.
 * @param {string} filename Il nome del file (default 'validated_sequence.xlsx').
 */
export function exportToLIMS(data, filename = 'validated_sequence.xlsx') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Validated Sequence");
  XLSX.writeFile(wb, filename);
}
