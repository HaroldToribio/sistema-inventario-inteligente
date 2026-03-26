const API = "http://127.0.0.1:5000";

// ─────────────────────────────────────────
// MENU & NAVEGACIÓN
// ─────────────────────────────────────────

document.getElementById("menu-toggle").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("active");
});

function mostrarSeccion(id) {
  document.querySelectorAll(".seccion").forEach(sec => sec.classList.remove("activa"));
  document.getElementById(id).classList.add("activa");
}

// ─────────────────────────────────────────
// DASHBOARD PRINCIPAL
// ─────────────────────────────────────────

let graficaPrincipal = null;

async function cargarDashboardResumen() {
  try {
    const res  = await fetch(`${API}/dashboard?producto=1&dias=7`);
    const data = await res.json();

    document.getElementById("totalVentas").innerText =
      "$" + parseFloat(data.total_ventas || 0).toLocaleString("en-US", { minimumFractionDigits: 2 });
    document.getElementById("promedioVentas").innerText =
      "$" + parseFloat(data.promedio_ventas || 0).toLocaleString("en-US", { minimumFractionDigits: 2 });
    document.getElementById("totalProductosDash").innerText = data.total_productos || 0;
    document.getElementById("productoTop").innerText = data.producto_top || "—";

  } catch (err) {
    console.error("Error dashboard resumen:", err);
  }
}

async function cargarVentas() {
  try {
    const res  = await fetch(`${API}/ventas-por-producto`);
    const data = await res.json();

    const labels  = data.map(p => p.nombre);
    const valores = data.map(p => parseFloat(p.total));

    if (graficaPrincipal) graficaPrincipal.destroy();

    graficaPrincipal = new Chart(document.getElementById("graficaVentas"), {
      type: "pie",
      data: {
        labels,
        datasets: [{
          label: "Ventas por Producto ($)",
          data: valores,
          backgroundColor: ["#6c63ff", "#48cfad", "#fc6e51", "#a0d468", "#ffce54"]
        }]
      },
      options: {
        plugins: {
          legend: { labels: { color: "#ccc" } }
        }
      }
    });

  } catch (err) {
    console.error("Error cargando ventas:", err);
  }
}

// ─────────────────────────────────────────
// PRODUCTOS
// ─────────────────────────────────────────

async function cargarProductos() {
  const res  = await fetch(`${API}/productos`);
  const data = await res.json();

  const lista = document.getElementById("lista-productos");
  lista.innerHTML = "";

  data.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${p.nombre} — $${parseFloat(p.precio).toFixed(2)}</span>
      <button class="btn-delete" onclick="eliminarProducto(${p.id_producto})">🗑</button>
    `;
    lista.appendChild(li);
  });

  document.getElementById("totalProductos").innerText = data.length;

  // Llenar select de predicción con los mismos productos
  const select = document.getElementById("selectProducto");
  select.innerHTML = "";
  data.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id_producto;
    opt.textContent = p.nombre;
    select.appendChild(opt);
  });
}

document.getElementById("form-producto").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre          = document.getElementById("nombre").value;
  const precio          = parseFloat(document.getElementById("precio").value);
  const promedio_ventas = parseInt(document.getElementById("promedio_ventas").value);

  try {
    const res = await fetch(`${API}/productos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, precio, promedio_ventas })
    });

    if (!res.ok) {
      const err = await res.text();
      alert("Error: " + err);
      return;
    }

    document.getElementById("form-producto").reset();

    await cargarProductos();
    await cargarResumenProductos();
    await cargarVentas();
    await cargarDashboardResumen();

  } catch (err) {
    console.error(err);
  }
});

async function eliminarProducto(id) {
  if (!confirm("¿Eliminar este producto y sus ventas?")) return;

  await fetch(`${API}/productos/${id}`, { method: "DELETE" });
  await cargarProductos();
  await cargarResumenProductos();
  await cargarDashboardResumen();
  await cargarVentas();
}

// ─────────────────────────────────────────
// RESUMEN LATERAL (sección Productos)
// ─────────────────────────────────────────

let graficoMini = null;

async function cargarResumenProductos() {
  const res  = await fetch(`${API}/ventas`);
  const data = await res.json();

  const total = data.reduce((sum, v) => sum + parseFloat(v.total), 0);
  document.getElementById("totalVentasProductos").innerText = "$" + total.toFixed(2);

  const labels  = data.slice(0, 10).map(v => v.fecha);
  const valores = data.slice(0, 10).map(v => parseFloat(v.total));

  if (graficoMini) graficoMini.destroy();

  graficoMini = new Chart(document.getElementById("graficoMini"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Ventas ($)",
        data: valores,
        backgroundColor: "#6c63ff"
      }]
    },
    options: {
      plugins: { legend: { labels: { color: "#ccc" } } },
      scales: {
        x: { ticks: { color: "#ccc", maxRotation: 45 } },
        y: { ticks: { color: "#ccc" } }
      }
    }
  });
}

// ─────────────────────────────────────────
// REPORTES
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// REPORTES AVANZADOS
// ─────────────────────────────────────────

const COLORES = ["#6c63ff", "#48cfad", "#fc6e51", "#a0d468", "#ffce54", "#ed5565", "#4fc1e9", "#ac92ec"];

let graficaReportes       = null;
let graficaParticipacion  = null;
let graficaTendencia      = null;
let graficaIngresosMes    = null;
let graficaPares          = null;

function chartDefaults(overrides = {}) {
  return {
    plugins: { legend: { labels: { color: "#ccc", font: { size: 12 } } } },
    scales: {
      x: { ticks: { color: "#aaa" }, grid: { color: "rgba(255,255,255,0.05)" } },
      y: { ticks: { color: "#aaa" }, grid: { color: "rgba(255,255,255,0.05)" } }
    },
    ...overrides
  };
}

async function cargarReportes() {
  try {
    const [resProductos, resMes, resPares] = await Promise.all([
      fetch(`${API}/ventas-por-producto`),
      fetch(`${API}/reportes/ventas-por-mes`),
      fetch(`${API}/reportes/pares-productos`)
    ]);

    const productos = await resProductos.json();
    const meses     = await resMes.json();
    const pares     = await resPares.json();

    // ── KPIs rápidos ────────────────────────────────────────────────
    if (productos.length) {
      const topUnd = productos.reduce((a, b) => parseInt(a.unidades) > parseInt(b.unidades) ? a : b);
      const topIng = productos.reduce((a, b) => parseFloat(a.total) > parseFloat(b.total) ? a : b);
      document.getElementById("rTopUnidades").innerText = `${topUnd.nombre} (${topUnd.unidades} uds)`;
      document.getElementById("rTopIngresos").innerText = `${topIng.nombre} ($${parseFloat(topIng.total).toFixed(2)})`;
    }

    if (meses.length) {
      const mejorMes = meses.reduce((a, b) => parseFloat(a.total_ingresos) > parseFloat(b.total_ingresos) ? a : b);
      document.getElementById("rMejorMes").innerText = `${mejorMes.mes} ($${parseFloat(mejorMes.total_ingresos).toFixed(2)})`;
    }

    if (pares.length) {
      const top = pares[0];
      document.getElementById("rTopPar").innerText = `${top.producto_a} + ${top.producto_b} (${top.veces_juntos}x)`;
    }

    // ── Gráfica 1: Ingresos por producto (barras horizontales) ───────
    if (graficaReportes) graficaReportes.destroy();
    graficaReportes = new Chart(document.getElementById("graficaProductos"), {
      type: "bar",
      data: {
        labels: productos.map(p => p.nombre),
        datasets: [{
          label: "Ingresos totales ($)",
          data: productos.map(p => parseFloat(p.total)),
          backgroundColor: COLORES.slice(0, productos.length),
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: "y",
        ...chartDefaults({ plugins: { legend: { display: false } } })
      }
    });

    // ── Gráfica 2: Participación en unidades (dona) ──────────────────
    if (graficaParticipacion) graficaParticipacion.destroy();
    graficaParticipacion = new Chart(document.getElementById("graficaParticipacion"), {
      type: "doughnut",
      data: {
        labels: productos.map(p => p.nombre),
        datasets: [{
          data: productos.map(p => parseInt(p.unidades)),
          backgroundColor: COLORES.slice(0, productos.length),
          borderWidth: 2,
          borderColor: "#1a1a2e"
        }]
      },
      options: {
        plugins: {
          legend: { labels: { color: "#ccc" } },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} uds`
            }
          }
        }
      }
    });

    // ── Gráfica 3: Tendencia mensual en unidades (línea) ─────────────
    if (graficaTendencia) graficaTendencia.destroy();
    graficaTendencia = new Chart(document.getElementById("graficaTendencia"), {
      type: "line",
      data: {
        labels: meses.map(m => m.mes),
        datasets: [{
          label: "Unidades vendidas",
          data: meses.map(m => parseInt(m.total_unidades)),
          borderColor: "#6c63ff",
          backgroundColor: "rgba(108,99,255,0.12)",
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: "#6c63ff"
        }]
      },
      options: chartDefaults()
    });

    // ── Gráfica 4: Ingresos mensuales (barras agrupadas) ─────────────
    if (graficaIngresosMes) graficaIngresosMes.destroy();
    graficaIngresosMes = new Chart(document.getElementById("graficaIngresosMes"), {
      type: "bar",
      data: {
        labels: meses.map(m => m.mes),
        datasets: [{
          label: "Ingresos ($)",
          data: meses.map(m => parseFloat(m.total_ingresos)),
          backgroundColor: "#48cfad",
          borderRadius: 4
        }]
      },
      options: chartDefaults({ plugins: { legend: { labels: { color: "#ccc" } } } })
    });

    // ── Gráfica 5: Pares de productos (barras) ───────────────────────
    if (graficaPares) graficaPares.destroy();

    if (pares.length) {
      const paresLabels = pares.map(p => `${p.producto_a} + ${p.producto_b}`);
      const paresValores = pares.map(p => parseInt(p.veces_juntos));

      graficaPares = new Chart(document.getElementById("graficaPares"), {
        type: "bar",
        data: {
          labels: paresLabels,
          datasets: [{
            label: "Veces comprados juntos",
            data: paresValores,
            backgroundColor: paresValores.map((_, i) =>
              `rgba(108,99,255,${1 - i * 0.08})`
            ),
            borderRadius: 5
          }]
        },
        options: {
          indexAxis: "y",
          ...chartDefaults({ plugins: { legend: { display: false } } })
        }
      });

      // Tabla de pares con insight
      const tablaDiv = document.getElementById("tablaPares");
      let html = `<table class="tabla-modelos">
        <thead><tr><th>Par de productos</th><th>Frecuencia</th><th>Insight</th></tr></thead><tbody>`;
      pares.forEach((p, i) => {
        const pct = ((p.veces_juntos / pares[0].veces_juntos) * 100).toFixed(0);
        html += `<tr>
          <td><strong>${p.producto_a}</strong> + ${p.producto_b}</td>
          <td>${p.veces_juntos}x</td>
          <td>${i === 0 ? "🔥 Combinación estrella" : pct >= 75 ? "⭐ Muy frecuente" : pct >= 40 ? "📈 Frecuente" : "💡 Ocasional"}</td>
        </tr>`;
      });
      html += "</tbody></table>";
      tablaDiv.innerHTML = html;
    } else {
      document.getElementById("graficaPares").parentElement.innerHTML =
        '<p style="color:#666; padding:1rem">No hay suficientes datos de pares. Agrega más clientes con historial.</p>';
    }

  } catch (err) {
    console.error("Error reportes:", err);
  }
}

// ─────────────────────────────────────────
// PREDICCIÓN ML
// ─────────────────────────────────────────

let graficaPrediccion = null;

async function cargarPrediccion() {
  const productoId = document.getElementById("selectProducto").value;
  const dias       = document.getElementById("selectDias").value;

  if (!productoId) { alert("Selecciona un producto"); return; }

  document.getElementById("prediccion-resultado").style.display = "none";
  document.getElementById("prediccion-loading").style.display  = "block";

  try {
    const res  = await fetch(`${API}/prediccion/${productoId}?dias=${dias}`);
    const data = await res.json();

    document.getElementById("prediccion-loading").style.display = "none";

    if (data.error) {
      alert("Error: " + data.error);
      return;
    }

    // ── Estadísticas históricas ──────────────
    document.getElementById("modeloUsado").innerText  = data.modelo_seleccionado || "—";
    document.getElementById("histPromedio").innerText = data.estadisticas_historicas.promedio_diario + " uds/día";
    document.getElementById("histTotal").innerText    = data.estadisticas_historicas.total_vendido   + " uds";
    document.getElementById("histDias").innerText     = data.estadisticas_historicas.dias_registrados;

    // ── Tabla comparación de modelos ─────────
    const comparacion = data.comparacion_modelos;
    let html = `<table class="tabla-modelos">
      <thead><tr><th>Modelo</th><th>MAE ↓</th><th>R² ↑</th><th></th></tr></thead><tbody>`;

    for (const [nombre, metricas] of Object.entries(comparacion)) {
      const esMejor = nombre === data.modelo_seleccionado;
      html += `<tr class="${esMejor ? 'mejor-modelo' : ''}">
        <td>${nombre}</td>
        <td>${metricas.MAE !== null ? metricas.MAE : "—"}</td>
        <td>${metricas.R2  !== null ? metricas.R2  : "—"}</td>
        <td>${esMejor ? "✅ Seleccionado" : ""}</td>
      </tr>`;
    }
    html += "</tbody></table>";
    document.getElementById("tablaModelos").innerHTML = html;

    // ── Gráfica de predicciones ───────────────
    const fechas = data.predicciones.map(p => p.fecha);
    const preds  = data.predicciones.map(p => p.prediccion);

    if (graficaPrediccion) graficaPrediccion.destroy();

    graficaPrediccion = new Chart(document.getElementById("graficaPrediccion"), {
      type: "line",
      data: {
        labels: fechas,
        datasets: [{
          label: "Demanda Predicha (unidades)",
          data: preds,
          borderColor: "#6c63ff",
          backgroundColor: "rgba(108,99,255,0.15)",
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: "#6c63ff"
        }]
      },
      options: {
        plugins: {
          legend: { labels: { color: "#ccc" } },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.y.toFixed(1)} unidades`
            }
          }
        },
        scales: {
          x: { ticks: { color: "#ccc" } },
          y: {
            ticks: { color: "#ccc" },
            title: { display: true, text: "Unidades", color: "#aaa" }
          }
        }
      }
    });

    document.getElementById("prediccion-resultado").style.display = "block";

  } catch (err) {
    document.getElementById("prediccion-loading").style.display = "none";
    console.error("Error predicción:", err);
    alert("No se pudo obtener la predicción.");
  }
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────

(async () => {
  await cargarDashboardResumen();
  await cargarVentas();
  await cargarProductos();
  await cargarResumenProductos();
  await cargarReportes();
  await cargarClientes();
})();

// ─────────────────────────────────────────
// CLIENTES
// ─────────────────────────────────────────

async function cargarClientes() {
  const res  = await fetch(`${API}/clientes`);
  const data = await res.json();

  // Lista en sección Clientes
  const lista = document.getElementById("lista-clientes");
  lista.innerHTML = "";
  data.forEach(c => {
    const li = document.createElement("li");
    li.innerHTML = `<span>👤 ${c.nombre}${c.email ? ' — ' + c.email : ''}</span>`;
    lista.appendChild(li);
  });

  document.getElementById("totalClientes").innerText = data.length;

  // Select en sección Recomendaciones
  const sel = document.getElementById("selectCliente");
  sel.innerHTML = "";
  data.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id_cliente;
    opt.textContent = c.nombre;
    sel.appendChild(opt);
  });
}

document.getElementById("form-cliente").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("cliente-nombre").value;
  const email  = document.getElementById("cliente-email").value;

  try {
    const res = await fetch(`${API}/clientes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email })
    });

    if (!res.ok) {
      const err = await res.text();
      alert("Error: " + err);
      return;
    }

    document.getElementById("form-cliente").reset();
    await cargarClientes();

  } catch (err) {
    console.error(err);
  }
});

// ─────────────────────────────────────────
// RECOMENDACIONES (Filtrado Colaborativo)
// ─────────────────────────────────────────

async function cargarRecomendaciones() {
  const idCliente = document.getElementById("selectCliente").value;
  const topN      = document.getElementById("selectTopN").value;

  if (!idCliente) { alert("Selecciona un cliente"); return; }

  document.getElementById("rec-resultado").style.display = "none";
  document.getElementById("rec-loading").style.display   = "block";

  try {
    const res  = await fetch(`${API}/recomendaciones/${idCliente}?top=${topN}`);
    const data = await res.json();

    document.getElementById("rec-loading").style.display = "none";

    if (data.error) {
      alert("Error: " + data.error);
      return;
    }

    // ── Stats ────────────────────────────────────────────────────────
    document.getElementById("recTotalClientes").innerText = data.total_clientes_analizados;
    document.getElementById("recHistorialCount").innerText = data.historial_compras.length;

    // ── Historial (chips) ────────────────────────────────────────────
    const histDiv = document.getElementById("recHistorial");
    histDiv.innerHTML = "";
    if (data.historial_compras.length === 0) {
      histDiv.innerHTML = '<span class="chip chip-empty">Sin historial de compras</span>';
    } else {
      data.historial_compras.forEach(p => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = `${p.nombre} ×${p.cantidad}`;
        histDiv.appendChild(chip);
      });
    }

    // ── Tarjetas de recomendaciones ──────────────────────────────────
    const tarjetasDiv = document.getElementById("recTarjetas");
    tarjetasDiv.innerHTML = "";

    if (data.recomendaciones.length === 0) {
      tarjetasDiv.innerHTML = '<p style="color:#888">No hay suficientes datos para generar recomendaciones. Agrega más clientes con historial.</p>';
    } else {
      data.recomendaciones.forEach((rec, i) => {
        const card = document.createElement("div");
        card.className = "rec-card";
        card.innerHTML = `
          <div class="rec-rank">#${i + 1}</div>
          <div class="rec-nombre">${rec.nombre}</div>
          <div class="rec-precio">$${parseFloat(rec.precio).toFixed(2)}</div>
          ${rec.categoria ? `<div class="rec-cat">${rec.categoria}</div>` : ''}
          <div class="rec-razon">💡 ${rec.razon}</div>
          <div class="rec-score">Score de afinidad: ${rec.score}</div>
        `;
        tarjetasDiv.appendChild(card);
      });
    }

    document.getElementById("rec-resultado").style.display = "block";

  } catch (err) {
    document.getElementById("rec-loading").style.display = "none";
    console.error("Error recomendaciones:", err);
    alert("No se pudo obtener recomendaciones.");
  }
}