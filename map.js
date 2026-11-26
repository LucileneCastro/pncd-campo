// Gera consolidação de uma lista de registros (espelhando o registro diário PNCD)
function consolidarIndicadores(lista) {
  return lista.reduce(
    (acc, item) => {
      acc.totalImoveis += 1;
      if (item.situacao === "Inspecionado") acc.inspecionados += 1;
      if (item.situacao === "Recuperado") acc.recuperados += 1;
      if (item.situacao === "F") acc.fechados += 1;
      if (item.situacao === "R") acc.recusados += 1;
      if (item.tratado) acc.tratados += 1;
      acc.amostras += Number(item.amostras || 0);
      acc.depositos.A2 += Number(item.depA2 || 0);
      acc.depositos.B += Number(item.depB || 0);
      acc.depositos.C += Number(item.depC || 0);
      acc.depositos.D1 += Number(item.depD1 || 0);
      acc.depositos.D2 += Number(item.depD2 || 0);
      acc.depositos.E += Number(item.depE || 0);
      return acc;
    },
    {
      totalImoveis: 0,
      inspecionados: 0,
      recuperados: 0,
      fechados: 0,
      recusados: 0,
      tratados: 0,
      amostras: 0,
      depositos: { A2: 0, B: 0, C: 0, D1: 0, D2: 0, E: 0 }
    }
  );
}

// 1. Resumo Diário (offline)
async function obterResumoDiario(dataAtividade) {
  const registros = await db.visitas.where("dataAtividade").equals(dataAtividade).toArray();
  return consolidarIndicadores(registros);
}

// 2. Resumo Semanal por Semana Epidemiológica (offline)
async function obterResumoSemanal(anoEpi, semanaEpi) {
  const registros = await db.visitas
    .where("semanaEpi")
    .equals(Number(semanaEpi))
    .filter((r) => r.anoEpi === Number(anoEpi))
    .toArray();
  return consolidarIndicadores(registros);
}

// 3. Sincronizar registros pendentes quando voltar a internet
async function sincronizarPendentes(urlApi) {
  if (!navigator.onLine) {
    alert("Sem conexão com a internet. Os dados continuam salvos no aparelho.");
    return;
  }

  const pendentes = await db.visitas.where("statusSync").equals("pendente").toArray();
  if (pendentes.length === 0) {
    alert("Todos os registros já estão sincronizados!");
    return;
  }

  const resposta = await fetch(urlApi, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ registros: pendentes })
  });

  if (resposta.ok) {
    const ids = pendentes.map((r) => r.id);
    await db.visitas.where("id").anyOf(ids).modify({ statusSync: "sincronizado" });
    alert(`${ids.length} registros sincronizados com sucesso!`);
  }
}