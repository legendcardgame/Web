<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Diagnóstico · Preregistro</title>
  <link rel="stylesheet" href="./styles.css">
  <style>
    .status { display:inline-block; margin-left:10px; font-weight:600; }
    .ok  { color:#7CFC8A; }
    .bad { color:#ff7676; }
    pre  { background:#1f1f1f; color:#fff; padding:12px; border-radius:10px; overflow:auto; }
    .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin:10px 0; }
    input, select { padding:8px 10px; border-radius:8px; border:1px solid #444; background:#111; color:#fff; }
    button { padding:10px 14px; border:0; border-radius:10px; background:#e74c3c; color:#fff; font-weight:700; cursor:pointer; }
    button.secondary { background:#333; }
    fieldset { border:1px solid #333; border-radius:12px; padding:12px; }
    legend { padding:0 6px; color:#ccc; }
  </style>
</head>
<body>
  <h1>Diagnóstico</h1>

  <div class="row">
    <button id="btnPing">Ping</button>
    <button id="btnList">Listar (admin)</button>
    <span id="status" class="status"></span>
  </div>

  <fieldset>
    <legend>Prueba de carga (Pareos)</legend>
    <div class="row">
      <label>Total solicitudes <input id="ltTotal" type="number" value="400" min="1" step="1"></label>
      <label>Concurrencia <input id="ltConc"  type="number" value="25"  min="1" step="1"></label>
      <label>Timeout (ms) <input id="ltTO"    type="number" value="5000" min="100" step="100"></label>
      <button id="btnLoadTest">Ejecutar prueba</button>
    </div>
    <div class="row">
      <small>Endpoint: <code id="ltUrlView">—</code></small>
    </div>
  </fieldset>

  <pre id="output">Listo.</pre>

  <!-- Carga la configuración global -->
  <script src="./js/config.js"></script>
  <!-- Lógica del diagnóstico -->
  <script src="./js/diagnostico.js?v=4"></script>
</body>
</html>
