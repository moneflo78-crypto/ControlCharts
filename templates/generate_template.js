const XLSX = require('xlsx');
const fs = require('fs');

const data = [
  { Sample_ID: 'BLK_01', Parameter: 'Pb', Analytical_Method: 'ICP-MS', Matrix: 'Acqua', Result: 0.1, Unit: 'ug/L', Analysis_Timestamp: '2023-10-01T10:00:00', Instrument_ID: 'ICP01', Operator: 'Mario Rossi', Batch_ID: 'B001' },
  { Sample_ID: 'SAMP_01', Parameter: 'Pb', Analytical_Method: 'ICP-MS', Matrix: 'Acqua', Result: 5.2, Unit: 'ug/L', Analysis_Timestamp: '2023-10-01T10:05:00', Instrument_ID: 'ICP01', Operator: 'Mario Rossi', Batch_ID: 'B001' },
  { Sample_ID: 'CRM_LOW', Parameter: 'Pb', Analytical_Method: 'ICP-MS', Matrix: 'Acqua', Result: 48, Unit: 'ug/L', Analysis_Timestamp: '2023-10-01T10:10:00', Instrument_ID: 'ICP01', Operator: 'Mario Rossi', Batch_ID: 'B001' }, // Supponiamo target=50, sd=2.5 => z=-0.8
  { Sample_ID: 'CRM_HIGH', Parameter: 'Pb', Analytical_Method: 'ICP-MS', Matrix: 'Acqua', Result: 104, Unit: 'ug/L', Analysis_Timestamp: '2023-10-01T10:15:00', Instrument_ID: 'ICP01', Operator: 'Mario Rossi', Batch_ID: 'B001' }, // Supponiamo target=100, sd=5 => z=0.8
  { Sample_ID: 'SAMP_02', Parameter: 'Pb', Analytical_Method: 'ICP-MS', Matrix: 'Acqua', Result: 2.1, Unit: 'ug/L', Analysis_Timestamp: '2023-10-01T10:20:00', Instrument_ID: 'ICP01', Operator: 'Mario Rossi', Batch_ID: 'B001' },
  { Sample_ID: 'DUP_01', Parameter: 'Pb', Analytical_Method: 'ICP-MS', Matrix: 'Acqua', Result: 5.3, Unit: 'ug/L', Analysis_Timestamp: '2023-10-01T10:25:00', Instrument_ID: 'ICP01', Operator: 'Mario Rossi', Batch_ID: 'B001' },

  // Un altro batch, stesso parametro
  { Sample_ID: 'BLK_02', Parameter: 'Pb', Analytical_Method: 'ICP-MS', Matrix: 'Acqua', Result: 0.05, Unit: 'ug/L', Analysis_Timestamp: '2023-10-02T10:00:00', Instrument_ID: 'ICP01', Operator: 'Luigi Verdi', Batch_ID: 'B002' },
  { Sample_ID: 'CRM_LOW', Parameter: 'Pb', Analytical_Method: 'ICP-MS', Matrix: 'Acqua', Result: 44, Unit: 'ug/L', Analysis_Timestamp: '2023-10-02T10:05:00', Instrument_ID: 'ICP01', Operator: 'Luigi Verdi', Batch_ID: 'B002' }, // z=-2.4 (1_2s)
  { Sample_ID: 'CRM_HIGH', Parameter: 'Pb', Analytical_Method: 'ICP-MS', Matrix: 'Acqua', Result: 111, Unit: 'ug/L', Analysis_Timestamp: '2023-10-02T10:10:00', Instrument_ID: 'ICP01', Operator: 'Luigi Verdi', Batch_ID: 'B002' }, // z=2.2 (R_4s con CRM_LOW)

  // Un altro parametro
  { Sample_ID: 'BLK_01', Parameter: 'Cd', Analytical_Method: 'ICP-MS', Matrix: 'Acqua', Result: 0.01, Unit: 'ug/L', Analysis_Timestamp: '2023-10-01T10:00:00', Instrument_ID: 'ICP01', Operator: 'Mario Rossi', Batch_ID: 'B001' },
  { Sample_ID: 'CRM_STD', Parameter: 'Cd', Analytical_Method: 'ICP-MS', Matrix: 'Acqua', Result: 9.8, Unit: 'ug/L', Analysis_Timestamp: '2023-10-01T10:10:00', Instrument_ID: 'ICP01', Operator: 'Mario Rossi', Batch_ID: 'B001' } // Supponiamo target=10, sd=0.5
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sequence");

XLSX.writeFile(wb, 'templates/sample_sequence.xlsx');
console.log('File Excel di esempio generato in templates/sample_sequence.xlsx');
