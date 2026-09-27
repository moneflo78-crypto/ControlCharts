const XLSX = require('xlsx');
const fs = require('fs');

const data = [];

// Base timestamp
let currentDate = new Date('2023-10-01T10:00:00');

const parameters = ['Pb', 'Cd'];
const batches = ['B001', 'B002', 'B003', 'B004', 'B005'];

// Targets and SDs for generating data
// We assume for CRM_HIGH:
// Pb: Target 100, SD 5
// Cd: Target 50, SD 2.5
const crmHighConfig = {
  'Pb': { target: 100, sd: 5 },
  'Cd': { target: 50, sd: 2.5 }
};

// Generate 120 samples
let crmHighCount = 0;
let negativeOutlierGenerated = false;

for (let i = 0; i < 120; i++) {
  const param = parameters[i % parameters.length];
  const batch = batches[Math.floor(i / 24)]; // distribute across 5 batches (24 samples each)

  // Create timestamp
  currentDate.setMinutes(currentDate.getMinutes() + 5);
  const timestamp = currentDate.toISOString().slice(0, 19);

  let sampleId = `SAMP_${String(i).padStart(3, '0')}`;
  let result = 0;

  if (crmHighCount < 20 && i % 6 === 0) {
    // Inject CRM_HIGH
    sampleId = 'CRM_HIGH';

    let zScore = 0;

    if (!negativeOutlierGenerated) {
      // 1 sample must have z-score < -3
      zScore = -3.2;
      negativeOutlierGenerated = true;
    } else {
      // The rest have z-score between -3 and +3
      // We'll distribute them roughly between -2.5 and +2.5
      // To show well in the chart without violating 1_3s
      zScore = (Math.random() * 5) - 2.5; // -2.5 to 2.5
    }

    result = crmHighConfig[param].target + (zScore * crmHighConfig[param].sd);
    crmHighCount++;
  } else {
    // Normal sample
    // Just some random numbers
    if (param === 'Pb') {
      result = (Math.random() * 10).toFixed(2);
    } else {
      result = (Math.random() * 5).toFixed(2);
    }
  }

  // Format result to 2 decimal places if it's a number, avoiding string conversion issues later
  result = Number(Number(result).toFixed(2));

  data.push({
    Sample_ID: sampleId,
    Parameter: param,
    Analytical_Method: 'ICP-MS',
    Matrix: 'Acqua',
    Result: result,
    Unit: 'ug/L',
    Analysis_Timestamp: timestamp,
    Instrument_ID: 'ICP01',
    Operator: 'Mario Rossi',
    Batch_ID: batch
  });
}

// Ensure at least some BLK and CRM_LOW to mimic the previous structure a bit,
// though the user just wanted 100+ results with 20 CRM_HIGH.

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sequence");

XLSX.writeFile(wb, 'templates/sample_sequence.xlsx');
console.log('File Excel di esempio generato in templates/sample_sequence.xlsx');
