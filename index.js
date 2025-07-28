// index.js  –  NSW Witness‑Statement generator (polName / polRego added)

// ── dependencies ───────────────────────────────────────────────
const fs             = require('fs');
const path           = require('path');
const express        = require('express');
const bodyParser     = require('body-parser');
const PizZip         = require('pizzip');
const Docxtemplater  = require('docxtemplater');
const ImageModule    = require('docxtemplater-image-module-free');

// ── express setup ──────────────────────────────────────────────
const app  = express();
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

// ── /generate endpoint ─────────────────────────────────────────
app.post('/generate', (req, res) => {
  const {
    MATTER, LOCATION, DATE, NAME, AGE,
    polName, polRego,                       // ← NEW FIELDS
    PARAGRAPH,
    policeSignature, witnessSignature
  } = req.body;

  // build array for numbered list
  const paragraphArray = PARAGRAPH
    .split(/\r?\n/)
    .filter(line => line.trim() !== '')
    .map(text => ({ value: text.trim() }));

  // strip data‑URL prefix from signatures
  const base64Police  = (policeSignature  || '').split(',')[1] || '';
  const base64Witness = (witnessSignature || '').split(',')[1] || '';

  // load template
  const templatePath = path.resolve(__dirname, 'templates', 'p190A-Template.docx');
  const content      = fs.readFileSync(templatePath);
  const zip          = new PizZip(content);

  // image module
  const imageModule = new ImageModule({
    fileType : 'docx',
    centered : false,
    getImage : b64 => Buffer.from(b64, 'base64'),
    getSize  : () => [180, 70]
  });

  const doc = new Docxtemplater(zip, { modules: [imageModule] });

  // inject data
  doc.setData({
    MATTER, LOCATION, DATE, NAME, AGE,
    PARAGRAPH       : paragraphArray,
    policeSignature : base64Police,
    witnessSignature: base64Witness,
    polName,                              // ← NEW
    polRego                               // ← NEW
  });

  // render & send
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
    res.status(400).send(`Template error:\n${err.message || err}`);
  }
});

// ── start server (Render‑friendly) ─────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running – listening on port ${PORT}`)
);
