let mapa;
let camadaMarcadores;

function iniciarMapaOffline() {
  // Coordenadas aproximadas de Pastos Bons - MA
  mapa = L.map("mapa").setView([-6.6019, -44.0767], 15);

  // Camada de mapa (os tiles visitados/pré-carregados ficam em cache no sw.js)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "Mapa de Campo Offline"
  }).addTo(mapa);

  camadaMarcadores = L.layerGroup().addTo(mapa);
  atualizarMarcadoresDoBanco();
}

// Captura coordenadas GPS direto do hardware do celular (funciona sem internet)
function capturarGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject("GPS não suportado");
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precisao: Math.round(pos.coords.accuracy)
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// Plota todos os cadastros salvos no banco local
async function atualizarMarcadoresDoBanco() {
  camadaMarcadores.clearLayers();
  const registros = await db.visitas.toArray();

  const cores = {
    Inspecionado: "#16a34a", // Verde
    Recuperado: "#2563eb",   // Azul
    F: "#f59e0b",            // Amarelo (Fechado)
    R: "#dc2626"             // Vermelho (Recusado)
  };

  registros.forEach((r) => {
    if (r.lat && r.lng) {
      L.circleMarker([r.lat, r.lng], {
        radius: 8,
        fillColor: cores[r.situacao] || "#6b7280",
        color: "#ffffff",
        weight: 2,
        fillOpacity: 0.9
      })
        .bindPopup(
          `<b>Q-${r.quarteirao} | Seq ${r.sequencia}</b><br>
           ${r.logradouro}, ${r.numero}<br>
           Situação: ${r.situacao} | Ciclo ${r.ciclo} (SE ${r.semanaEpi})`
        )
        .addTo(camadaMarcadores);
    }
  });
}