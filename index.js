// index.js  –  P190A Witness‑Statement generator (final list‑fix)
// ------------------------------------------------------------------
//  • Builds a true numbered list (one paragraph per item)
//  • Embeds hand‑drawn signatures into {%policeSignature}/{%witnessSignature}
//  • Streams a clean DOCX back to the browser

// ── dependencies ────────────────────────────────────────────────────────────
const fs             = require('fs');
const path           = require('path');
const express        = require('express');
const bodyParser     = require('body-parser');
const PizZip         = require('pizzip');
const Docxtemplater  = require('docxtemplater');
const ImageModule    = require('docxtemplater-image-module-free');

// ── basic server setup ──────────────────────────────────────────────────────
const app = express();
app.use(bodyParser.json({ limit: '10mb' }));   // signatures arrive as base64 data URLs
app.use(express.static('public'));             // serves index.html & script.js

// ── /generate endpoint ──────────────────────────────────────────────────────
app.post('/generate', (req, res) => {
  const {
    MATTER, LOCATION, DATE, NAME, AGE,
    PARAGRAPH,                // textarea content with \n line breaks
    policeSignature,          // data:image/png;base64,……
    witnessSignature          // data:image/png;base64,……
  } = req.body;

  // 1️⃣  Build an *array* of items (no manual numbers – Word handles numbering)
  const paragraphArray = PARAGRAPH
    .split(/\r?\n/)                  // split on CRLF or LF
    .filter(line => line.trim() !== '')
    .map(text => ({ value: text.trim() }));   // no numbering here

  // 2️⃣  Strip the data‑URL prefixes so we keep only raw base‑64
  const base64Police  = (policeSignature  || '').split(',')[1] || '';
  const base64Witness = (witnessSignature || '').split(',')[1] || '';

  // 3️⃣  Load the DOCX template
  const templatePath = path.resolve(__dirname, 'templates', 'p190A-Template.docx');
  const content      = fs.readFileSync(templatePath);
  const zip          = new PizZip(content);

  // 4️⃣  Configure the free image module (expects base‑64 strings)
  const imageModule = new ImageModule({
    fileType : 'docx',
    centered : false,                       // change to true if you prefer centred images
    getImage : base64 => Buffer.from(base64, 'base64'),
    getSize  : () => [180, 70]              // width, height in px – tweak once to fit footer
  });

  // 5️⃣  Create the document & inject data
  const doc = new Docxtemplater(zip, { modules: [imageModule] });

  doc.setData({
    MATTER,
    LOCATION,
    DATE,
    NAME,
    AGE,
    PARAGRAPH       : paragraphArray,   // ← array to feed the {#PARAGRAPH} loop
    policeSignature : base64Police,
    witnessSignature: base64Witness
  });

  // 6️⃣  Render and stream back
  try {
    doc.render();
    const buffer   = doc.getZip().generate({ type: 'nodebuffer' });
    const filename = `P190A_${Date.now()}.docx`;

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`
    });
    res.send(buffer);
  } catch (err) {
    // If something inside the template is wrong, show the error plainly
    res.status(400).send(`Template error:\n${err.message || err}`);
  }
});

// ── start the server ────────────────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
