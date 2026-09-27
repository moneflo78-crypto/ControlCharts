# Sistema di Gestione Carte di Controllo (SPA Serverless)

Questa è una Single-Page Application (SPA) client-side pura, ideata per la gestione delle Carte di Controllo di laboratorio (valutazione campioni QC).
Il sistema è progettato per essere caricato e utilizzato direttamente da Microsoft SharePoint o OpenText Extended ECM, senza necessità di alcun backend (Zero-Infrastructure).

## Caratteristiche
- Vanilla ES6 + Vite: Applicazione snella e modulare, compilata in un singolo file HTML indipendente.
- Parsing Excel locale: Utilizza SheetJS per importare, validare ed esportare sequenze analitiche in locale nel browser, garantendo la privacy e la conformità (es. ISO/IEC 17025).
- Motore Westgard rigoroso: Logica statistica che valuta indipendentemente ogni analita e serie (Batch), applicando le regole: 1_2s, 1_3s, 2_2s, R_4s, 4_1s e 10_x.
- Tracciabilità (Override): L'esportazione LIMS è bloccata in caso di fuori controllo e richiede un inserimento formale per l'override.
- Salvataggio Locale: Anagrafica QC salvata in locale (localStorage) ed esportabile tramite JSON per la condivisione coi colleghi.

## Struttura del progetto
- /src/: Codice sorgente.
  - app.js: Logica UI, gestione tab e workflow dell'utente.
  - westgard.js: Motore matematico e di validazione regole.
  - excelHandler.js: Lettura, filtraggio ed esportazione dei file XLSX.
  - storage.js: Persistenza anagrafiche in locale.
  - chartRenderer.js: Integrazione Plotly per Carte di Levey-Jennings.
- /tests/: Unit tests del motore statistico in Vitest (documentazione validazione software).
- /templates/: Script per la generazione di file Excel di esempio.

## Requisiti e Installazione

Requisiti: Node.js (>= 18) e npm.

1. Clona il repository.
2. Installa le dipendenze:
   `npm install`
3. (Opzionale) Genera il file Excel di template per i test:
   `node templates/generate_template.js`

## Sviluppo e Build

Per eseguire gli Unit Test (Vitest):
`npm run test`

Per compilare la Single-Page Application (build di produzione a file singolo):
`npm run build`
Il file generato si troverà in dist/index.html.

## Deploy (SharePoint / OpenText)
Prendi semplicemente il file dist/index.html generato dopo la build, e caricalo all'interno di una cartella del tuo ambiente SharePoint. L'analista potrà aprirlo direttamente nel proprio browser web.
Per una configurazione condivisa tra il team, si consiglia di usare l'opzione "Esporta DB QC" e salvare il file qc_database.json nella stessa cartella condivisa.
