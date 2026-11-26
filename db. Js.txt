// Importe Dexie no index.html via CDN (e deixe em cache no sw.js)
const db = new Dexie("PNCD_Campo_Offline");

db.version(1).stores({
  visitas: "id, dataAtividade, anoEpi, semanaEpi, ciclo, localidade, quarteirao, statusSync"
});

// Calcula o Ciclo Bimestral (1 a 6) a partir da data (AAAA-MM-DD)
function calcularCicloBimestral(dataStr) {
  const mes = parseInt(dataStr.split("-")[1], 10); // 1 a 12
  return Math.ceil(mes / 2); // Jan-Fev=1, Mar-Abr=2, ..., Nov-Dez=6
}

// Calcula Semana Epidemiológica (padrão MMWR/CDC: semana começa no domingo)
function calcularSemanaEpidemiologica(dataStr) {
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);

  // Encontra o domingo da semana atual
  const domingoAtual = new Date(data);
  domingoAtual.setDate(data.getDate() - data.getDay());

  // 1º de janeiro do ano
  const jan1 = new Date(ano, 0, 1);
  const diaSemanaJan1 = jan1.getDay(); // 0=Dom .. 6=Sab

  // Primeiro domingo da SE 1 (regra MMWR: semana com >= 4 dias no ano novo)
  const inicioSE1 = new Date(jan1);
  if (diaSemanaJan1 <= 3) {
    inicioSE1.setDate(jan1.getDate() - diaSemanaJan1);
  } else {
    inicioSE1.setDate(jan1.getDate() + (7 - diaSemanaJan1));
  }

  // Se a data cair antes da SE 1 deste ano, pertence à última SE do ano anterior
  if (domingoAtual < inicioSE1) {
    return calcularSemanaEpidemiologica(`${ano - 1}-12-31`);
  }

  const diffDias = Math.round((domingoAtual - inicioSE1) / (1000 * 60 * 60 * 24));
  const semana = Math.floor(diffDias / 7) + 1;
  return { anoEpi: ano, semanaEpi: semana };
}

// Salvar visita localmente (100% offline)
async function salvarVisitaLocal(dados) {
  const { anoEpi, semanaEpi } = calcularSemanaEpidemiologica(dados.dataAtividade);
  const registro = {
    id: crypto.randomUUID(),
    ...dados,
    ciclo: calcularCicloBimestral(dados.dataAtividade),
    anoEpi,
    semanaEpi,
    statusSync: "pendente",
    criadoEm: new Date().toISOString()
  };

  await db.visitas.put(registro);
  return registro;
}