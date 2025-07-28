/* --------------------------------------------------------------------------
   script.js  –  front‑end logic (Hi‑DPI signature pads + form submit)
   -------------------------------------------------------------------------- */

/* ---------- Hi‑DPI, perfectly‑aligned signature pad class ----------------- */
function SigPad(canvas) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  // Match the bitmap size to the CSS size × devicePixelRatio
  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);          // 1 drawing unit = 1 CSS px
    ctx.lineWidth   = 2;
    ctx.lineCap     = "round";
    ctx.strokeStyle = "#000";
  }
  resize();
  window.addEventListener("resize", resize);   // stay crisp on zoom/orientation

  // Map pointer coords → canvas coords
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  let drawing = false;
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    drawing = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  });

  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) =>
    canvas.addEventListener(ev, () => (drawing = false))
  );

  // Public helpers
  this.clear      = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
  this.toDataURL  = () => canvas.toDataURL("image/png");
}

/* ---------- initialise the two pads -------------------------------------- */
const wPad = new SigPad(document.getElementById("witnessPad"));
const pPad = new SigPad(document.getElementById("policePad"));
function clearPad(pad) { pad.clear(); }

/* ---------- form submission → /generate ---------------------------------- */
document
  .getElementById("statementForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target).entries());
    formData.witnessSignature = wPad.toDataURL();
    formData.policeSignature  = pPad.toDataURL();

    const res  = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = "Witness_Statement.docx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
