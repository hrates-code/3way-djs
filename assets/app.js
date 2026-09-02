/* Dashboard — Reclamações Trabalhistas DJS e 3Way
 * Lê window.DJS_DATA (gerado por build_data.py) e renderiza cards, gráficos e tabela.
 */
(function () {
  "use strict";

  var state = {
    role: null, // 'user' | 'admin'
    filtroGeral: "todos", // todos | advogado | processo | parte
    filtroGeralValor: "",
    filtroDataTipo: "todos", // todos | periodo | prazo
    dataDe: "",
    dataAte: "",
    filtroPrazoStatus: "todos", // todos | arquivados | andamento
    collapsedGroups: {},
  };

  var charts = {};

  // ---------- Utils ----------

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function humanizeTag(slug) {
    if (!slug) return "";
    return slug
      .replace(/_/g, " ")
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function formatDateBR(iso) {
    if (!iso) return "";
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return iso;
    return m[3] + "/" + m[2] + "/" + m[1];
  }

  function formatCurrencyBR(value) {
    try {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    } catch (e) {
      return "R$ " + value.toFixed(2).replace(".", ",");
    }
  }

  function monthLabelBR(iso) {
    var m = /^(\d{4})-(\d{2})/.exec(iso);
    if (!m) return null;
    var meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return meses[parseInt(m[2], 10) - 1] + "/" + m[1].slice(2);
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function joinOrDash(list, sep) {
    if (!list || !list.length) return "—";
    return list.join(sep || "; ");
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // ---------- Login ----------

  function initLogin() {
    var saved = sessionStorage.getItem("djs_role");
    if (saved === "user" || saved === "admin") {
      state.role = saved;
      if (saved === "admin") state.adminPassword = sessionStorage.getItem("djs_admin_pw") || "";
      showApp();
      return;
    }
    $("#login-screen").hidden = false;
    $("#app").hidden = true;

    var form = $("#login-form");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = $("#login-password").value.trim();
      var cfg = window.DJS_DATA.config;
      if (val === cfg.senha_admin) {
        state.role = "admin";
        state.adminPassword = val;
        sessionStorage.setItem("djs_role", "admin");
        sessionStorage.setItem("djs_admin_pw", val);
        showApp();
      } else if (val === cfg.senha_padrao) {
        state.role = "user";
        sessionStorage.setItem("djs_role", "user");
        showApp();
      } else {
        $("#login-error").textContent = "Senha incorreta. Tente novamente.";
        $("#login-password").focus();
        $("#login-password").select();
      }
    });
  }

  function showApp() {
    $("#login-screen").hidden = true;
    $("#app").hidden = false;
    $("#role-badge").textContent = state.role === "admin" ? "Modo administrador" : "Acesso padrão";
    $("#role-badge").classList.toggle("admin", state.role === "admin");
    $("#btn-update").hidden = state.role !== "admin";
    wireFilterEvents();
    populateFilterOptions();
    renderAll();
  }

  function logout() {
    sessionStorage.removeItem("djs_role");
    sessionStorage.removeItem("djs_admin_pw");
    location.reload();
  }

  // ---------- Data access / joins ----------

  function getProcessos() { return window.DJS_DATA.processos; }
  function getMovimentacoes() { return window.DJS_DATA.movimentacoes; }

  function processoByRef(ref) {
    return getProcessos().filter(function (p) { return p.ref_processo === ref; })[0];
  }

  // ---------- Filters ----------
  // wireFilterEvents() é chamado uma única vez (na carga inicial). populateFilterOptions()
  // pode ser chamado várias vezes (inclusive após "Atualizar Base de Dados") para
  // repovoar as listas sem duplicar listeners nos elementos fixos do DOM.

  function buildFiltroGeralValor() {
    var cfg = window.DJS_DATA.config;
    var procs = getProcessos();
    var advogados = uniqueSorted(procs.map(function (p) { return p.grupo_advogado; }));
    var processos = uniqueSorted(procs.map(function (p) { return p.nr_processo + " — " + p.parte; }));
    var partes = uniqueSorted(procs.map(function (p) { return p.parte; }));

    var wrap = $("#filtro-geral-valor-wrap");
    var sel = $("#filtro-geral-valor");
    sel.innerHTML = "";
    var list = [];
    if (state.filtroGeral === "advogado") list = advogados;
    if (state.filtroGeral === "processo") list = processos;
    if (state.filtroGeral === "parte") list = partes;

    if (state.filtroGeral === "todos" || !list.length) {
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    var optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "Todos";
    sel.appendChild(optAll);
    list.forEach(function (v) {
      var o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    });
    sel.value = state.filtroGeralValor;
  }

  function populateFilterOptions() {
    var cfg = window.DJS_DATA.config;

    var selGeral = $("#filtro-geral");
    selGeral.innerHTML = "";
    cfg.filtro_geral.forEach(function (opt) {
      var o = document.createElement("option");
      o.value = opt;
      o.textContent = labelFiltroGeral(opt);
      selGeral.appendChild(o);
    });
    selGeral.value = state.filtroGeral;

    buildFiltroGeralValor();

    var selPrazoStatus = $("#filtro-prazo-status");
    selPrazoStatus.innerHTML = "";
    cfg.filtro_data.prazo.forEach(function (opt) {
      var o = document.createElement("option");
      o.value = opt;
      o.textContent = labelPrazoStatus(opt);
      selPrazoStatus.appendChild(o);
    });
    selPrazoStatus.value = state.filtroPrazoStatus;
  }

  function wireFilterEvents() {
    var selGeral = $("#filtro-geral");
    var selDataTipo = $("#filtro-data-tipo");
    var selPrazoStatus = $("#filtro-prazo-status");

    selGeral.addEventListener("change", function () {
      state.filtroGeral = selGeral.value;
      state.filtroGeralValor = "";
      buildFiltroGeralValor();
      renderAll();
    });

    $("#filtro-geral-valor").addEventListener("change", function () {
      state.filtroGeralValor = $("#filtro-geral-valor").value;
      renderAll();
    });

    selDataTipo.addEventListener("change", function () {
      state.filtroDataTipo = selDataTipo.value;
      $("#filtro-periodo-wrap").hidden = state.filtroDataTipo !== "periodo";
      $("#filtro-prazo-wrap").hidden = state.filtroDataTipo !== "prazo";
      renderAll();
    });

    $("#filtro-data-de").addEventListener("change", function () {
      state.dataDe = $("#filtro-data-de").value;
      renderAll();
    });
    $("#filtro-data-ate").addEventListener("change", function () {
      state.dataAte = $("#filtro-data-ate").value;
      renderAll();
    });

    selPrazoStatus.addEventListener("change", function () {
      state.filtroPrazoStatus = selPrazoStatus.value;
      renderAll();
    });

    $("#filtro-clear").addEventListener("click", function () {
      state.filtroGeral = "todos";
      state.filtroGeralValor = "";
      state.filtroDataTipo = "todos";
      state.dataDe = "";
      state.dataAte = "";
      state.filtroPrazoStatus = "todos";
      selGeral.value = "todos";
      buildFiltroGeralValor();
      selDataTipo.value = "todos";
      $("#filtro-data-de").value = "";
      $("#filtro-data-ate").value = "";
      selPrazoStatus.value = "todos";
      $("#filtro-periodo-wrap").hidden = true;
      $("#filtro-prazo-wrap").hidden = true;
      renderAll();
    });
  }

  function labelFiltroGeral(opt) {
    return {
      todos: "Todos",
      advogado: "Por advogado",
      processo: "Por processo",
      parte: "Por parte (reclamante)",
    }[opt] || opt;
  }

  function labelPrazoStatus(opt) {
    return { todos: "Todos", arquivados: "Arquivados", andamento: "Em andamento" }[opt] || opt;
  }

  function uniqueSorted(arr) {
    var seen = {};
    var out = [];
    arr.forEach(function (v) {
      if (v && !seen[v]) { seen[v] = true; out.push(v); }
    });
    out.sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
    return out;
  }

  // Retorna { processos: [...filtrados], movimentacoes: [...filtradas] }
  function applyFilters() {
    var procs = getProcessos().slice();
    var movs = getMovimentacoes().slice();

    // Filtro geral
    if (state.filtroGeral !== "todos" && state.filtroGeralValor) {
      if (state.filtroGeral === "advogado") {
        procs = procs.filter(function (p) { return p.grupo_advogado === state.filtroGeralValor; });
      } else if (state.filtroGeral === "processo") {
        procs = procs.filter(function (p) { return (p.nr_processo + " — " + p.parte) === state.filtroGeralValor; });
      } else if (state.filtroGeral === "parte") {
        procs = procs.filter(function (p) { return p.parte === state.filtroGeralValor; });
      }
    }

    var allowedRefs = {};
    procs.forEach(function (p) { allowedRefs[p.ref_processo] = true; });
    movs = movs.filter(function (m) { return allowedRefs[m.processo_ref]; });

    // Filtro por data
    if (state.filtroDataTipo === "periodo") {
      if (state.dataDe) movs = movs.filter(function (m) { return m.data && m.data >= state.dataDe; });
      if (state.dataAte) movs = movs.filter(function (m) { return m.data && m.data <= state.dataAte; });
    } else if (state.filtroDataTipo === "prazo") {
      movs = movs.filter(function (m) { return !!m.dt_prazo; });
      if (state.filtroPrazoStatus === "arquivados") {
        movs = movs.filter(function (m) { return m.arquivado === true; });
      } else if (state.filtroPrazoStatus === "andamento") {
        movs = movs.filter(function (m) { return m.arquivado === false; });
      }
    }

    // Após filtrar movimentações por data/prazo, restringe processos aos que ainda têm movimentações
    // (exceto quando o filtro geral já selecionou um processo/advogado/parte específico e queremos manter o card do processo mesmo sem itens)
    if (state.filtroDataTipo !== "todos") {
      var refsWithMov = {};
      movs.forEach(function (m) { refsWithMov[m.processo_ref] = true; });
      procs = procs.filter(function (p) { return refsWithMov[p.ref_processo]; });
    }

    return { processos: procs, movimentacoes: movs };
  }

  function isPrazoAtivo(mov) {
    return !!mov.dt_prazo && mov.arquivado === false;
  }

  // ---------- Render: cards ----------

  function renderCards(filtered) {
    var allProcs = getProcessos();
    var arquivadosTotal = allProcs.filter(function (p) { return p.arquivado; }).length;
    var andamentoTotal = allProcs.length - arquivadosTotal;

    $("#card-arquivados .stat-value").textContent = arquivadosTotal;
    $("#card-andamento .stat-value").textContent = andamentoTotal;
    $("#card-total-processos .stat-value").textContent = allProcs.length;

    var valorTotal = allProcs.reduce(function (s, p) { return s + (p.vlr_causa || 0); }, 0);
    $("#card-valor-total .stat-value").textContent = formatCurrencyBR(valorTotal);

    var prazosAtivos = getMovimentacoes().filter(isPrazoAtivo).length;
    $("#card-prazos-ativos .stat-value").textContent = prazosAtivos;

    // Filtros ativos
    var chips = [];
    if (state.filtroGeral === "todos") {
      chips.push({ text: "Geral: todos", neutral: true });
    } else {
      chips.push({ text: labelFiltroGeral(state.filtroGeral) + (state.filtroGeralValor ? ": " + state.filtroGeralValor : " (todos)") });
    }
    if (state.filtroDataTipo === "periodo") {
      var de = state.dataDe ? formatDateBR(state.dataDe) : "início";
      var ate = state.dataAte ? formatDateBR(state.dataAte) : "hoje";
      chips.push({ text: "Período: " + de + " – " + ate });
    } else if (state.filtroDataTipo === "prazo") {
      chips.push({ text: "Prazo: " + labelPrazoStatus(state.filtroPrazoStatus) });
    } else {
      chips.push({ text: "Data: todos", neutral: true });
    }
    chips.push({ text: filtered.processos.length + " processo(s) · " + filtered.movimentacoes.length + " peça(s)", neutral: true });

    var chipRow = $("#filtros-ativos-chips");
    chipRow.innerHTML = "";
    chips.forEach(function (c) {
      var span = document.createElement("span");
      span.className = "chip" + (c.neutral ? " neutral" : "");
      span.textContent = c.text;
      chipRow.appendChild(span);
    });
  }

  // ---------- Render: charts ----------

  var CHART_COLORS = {
    accent: "#6d8bff",
    accent2: "#7ee0c3",
    accent3: "#ffb86b",
    danger: "#ff6b81",
    grid: "rgba(154,164,184,0.12)",
    text: "#9aa4b8",
  };

  function destroyChart(key) {
    if (charts[key]) { charts[key].destroy(); delete charts[key]; }
  }

  function baseChartOptions(extra) {
    var opts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false, labels: { color: CHART_COLORS.text } },
        tooltip: { backgroundColor: "#161c28", titleColor: "#eef1f7", bodyColor: "#eef1f7", borderColor: "#232a38", borderWidth: 1 },
      },
      scales: {
        x: { ticks: { color: CHART_COLORS.text, font: { size: 10.5 } }, grid: { color: CHART_COLORS.grid } },
        y: { ticks: { color: CHART_COLORS.text, font: { size: 10.5 } }, grid: { color: CHART_COLORS.grid } },
      },
    };
    return Object.assign(opts, extra || {});
  }

  function renderCharts(filtered) {
    if (typeof Chart === "undefined") {
      $all(".chart-card .chart-wrap").forEach(function (el) {
        el.innerHTML = '<div class="empty-state" style="border:none;padding:12px;font-size:12px;">Gráficos indisponíveis (biblioteca não carregada — verifique a conexão).</div>';
      });
      return;
    }
    renderStatusChart(filtered);
    renderTagsChart(filtered);
    renderTimelineChart(filtered);
    renderValorChart(filtered);
  }

  function renderStatusChart(filtered) {
    var procs = filtered.processos;
    var arquivados = procs.filter(function (p) { return p.arquivado; }).length;
    var andamento = procs.length - arquivados;
    destroyChart("status");
    var ctx = $("#chart-status");
    charts.status = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Em andamento", "Arquivados"],
        datasets: [{ data: [andamento, arquivados], backgroundColor: [CHART_COLORS.accent3, CHART_COLORS.grid.replace("0.12", "0.4")], borderColor: "#11161f", borderWidth: 3 }],
      },
      options: baseChartOptions({
        plugins: { legend: { display: true, position: "bottom", labels: { color: CHART_COLORS.text, boxWidth: 10, font: { size: 11 } } } },
        scales: {},
        cutout: "62%",
      }),
    });
    var total = procs.length || 1;
    var pct = Math.round((andamento / total) * 100);
    $("#chart-status-insight").textContent = procs.length
      ? pct + "% dos processos filtrados (" + andamento + " de " + procs.length + ") seguem em andamento."
      : "Sem processos para os filtros selecionados.";
  }

  function renderTagsChart(filtered) {
    var counts = {};
    filtered.movimentacoes.forEach(function (m) {
      (m.tags.length ? m.tags : ["sem_tag"]).forEach(function (t) {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    var entries = Object.keys(counts).map(function (k) { return [k, counts[k]]; });
    entries.sort(function (a, b) { return b[1] - a[1]; });
    entries = entries.slice(0, 8);

    destroyChart("tags");
    var ctx = $("#chart-tags");
    charts.tags = new Chart(ctx, {
      type: "bar",
      data: {
        labels: entries.map(function (e) { return humanizeTag(e[0]); }),
        datasets: [{ data: entries.map(function (e) { return e[1]; }), backgroundColor: CHART_COLORS.accent, borderRadius: 5, maxBarThickness: 22 }],
      },
      options: baseChartOptions({
        indexAxis: "y",
        scales: { x: { ticks: { color: CHART_COLORS.text, precision: 0 }, grid: { color: CHART_COLORS.grid } }, y: { ticks: { color: CHART_COLORS.text, font: { size: 10.5 } }, grid: { display: false } } },
      }),
    });

    var top = entries[0];
    $("#chart-tags-insight").textContent = top
      ? "Peça mais frequente: " + humanizeTag(top[0]) + " (" + top[1] + " ocorrência" + (top[1] > 1 ? "s" : "") + ")."
      : "Sem peças para os filtros selecionados.";
  }

  function renderTimelineChart(filtered) {
    var counts = {};
    filtered.movimentacoes.forEach(function (m) {
      var label = monthLabelBR(m.data);
      if (!label) return;
      counts[m.data.slice(0, 7)] = counts[m.data.slice(0, 7)] || { label: label, n: 0 };
      counts[m.data.slice(0, 7)].n++;
    });
    var keys = Object.keys(counts).sort();

    destroyChart("timeline");
    var ctx = $("#chart-timeline");
    charts.timeline = new Chart(ctx, {
      type: "line",
      data: {
        labels: keys.map(function (k) { return counts[k].label; }),
        datasets: [{
          data: keys.map(function (k) { return counts[k].n; }),
          borderColor: CHART_COLORS.accent2,
          backgroundColor: "rgba(126,224,195,0.12)",
          fill: true,
          tension: 0.35,
          pointBackgroundColor: CHART_COLORS.accent2,
          pointRadius: 3,
        }],
      },
      options: baseChartOptions({
        scales: { x: { ticks: { color: CHART_COLORS.text, font: { size: 10.5 } }, grid: { display: false } }, y: { ticks: { color: CHART_COLORS.text, precision: 0 }, grid: { color: CHART_COLORS.grid } } },
      }),
    });

    var peak = keys.reduce(function (best, k) { return !best || counts[k].n > counts[best].n ? k : best; }, null);
    $("#chart-timeline-insight").textContent = peak
      ? "Pico de movimentações em " + counts[peak].label + " (" + counts[peak].n + " peças)."
      : "Sem movimentações para os filtros selecionados.";
  }

  function renderValorChart(filtered) {
    var procs = filtered.processos.slice().sort(function (a, b) { return b.vlr_causa - a.vlr_causa; });
    destroyChart("valor");
    var ctx = $("#chart-valor");
    charts.valor = new Chart(ctx, {
      type: "bar",
      data: {
        labels: procs.map(function (p) { return p.parte.split(" ").slice(0, 2).join(" "); }),
        datasets: [{ data: procs.map(function (p) { return p.vlr_causa; }), backgroundColor: CHART_COLORS.danger, borderRadius: 5, maxBarThickness: 34 }],
      },
      options: baseChartOptions({
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function (c) { return formatCurrencyBR(c.raw); } }, backgroundColor: "#161c28", titleColor: "#eef1f7", bodyColor: "#eef1f7", borderColor: "#232a38", borderWidth: 1 },
        },
        scales: { y: { ticks: { color: CHART_COLORS.text, callback: function (v) { return "R$ " + (v / 1000).toFixed(0) + "k"; } }, grid: { color: CHART_COLORS.grid } }, x: { ticks: { color: CHART_COLORS.text, font: { size: 10.5 } }, grid: { display: false } } },
      }),
    });

    var total = procs.reduce(function (s, p) { return s + p.vlr_causa; }, 0);
    $("#chart-valor-insight").textContent = procs.length
      ? "Soma das causas filtradas: " + formatCurrencyBR(total) + " em " + procs.length + " processo(s)."
      : "Sem processos para os filtros selecionados.";
  }

  // ---------- Render: results (grouped table) ----------

  function renderResults(filtered) {
    var container = $("#results");
    container.innerHTML = "";

    if (!filtered.processos.length) {
      container.innerHTML =
        '<div class="empty-state"><div class="es-title">Nenhum resultado</div>Ajuste os filtros para ver processos e peças.</div>';
      return;
    }

    // Agrupa por advogado
    var groups = {};
    var groupOrder = [];
    filtered.processos.forEach(function (p) {
      var key = p.grupo_advogado;
      if (!groups[key]) { groups[key] = []; groupOrder.push(key); }
      groups[key].push(p);
    });
    groupOrder.sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });

    var movsByRef = {};
    filtered.movimentacoes.forEach(function (m) {
      movsByRef[m.processo_ref] = movsByRef[m.processo_ref] || [];
      movsByRef[m.processo_ref].push(m);
    });
    Object.keys(movsByRef).forEach(function (ref) {
      movsByRef[ref].sort(function (a, b) { return (b.data || "").localeCompare(a.data || ""); });
    });

    groupOrder.forEach(function (groupKey) {
      var procsInGroup = groups[groupKey].slice().sort(function (a, b) { return a.parte.localeCompare(b.parte, "pt-BR"); });
      var groupId = "g-" + groupKey.replace(/[^a-z0-9]/gi, "").slice(0, 40);
      var collapsed = !!state.collapsedGroups[groupId];

      var totalMovs = procsInGroup.reduce(function (s, p) { return s + (movsByRef[p.ref_processo] || []).length; }, 0);

      var block = document.createElement("div");
      block.className = "group-block" + (collapsed ? " collapsed" : "");

      var header = document.createElement("div");
      header.className = "group-header";
      header.innerHTML =
        '<div class="group-title"><span class="icon-caret"></span>' + escapeHtml(groupKey) + '</div>' +
        '<div class="group-meta">' + procsInGroup.length + ' processo(s) · ' + totalMovs + ' peça(s)</div>';
      header.addEventListener("click", function () {
        state.collapsedGroups[groupId] = !state.collapsedGroups[groupId];
        block.classList.toggle("collapsed");
      });
      block.appendChild(header);

      var body = document.createElement("div");
      body.className = "group-body";

      procsInGroup.forEach(function (p) {
        body.appendChild(renderProcessBlock(p, movsByRef[p.ref_processo] || []));
      });

      block.appendChild(body);
      container.appendChild(block);
    });
  }

  function renderProcessBlock(p, movs) {
    var cfgProc = window.DJS_DATA.config.tags_processo;
    var div = document.createElement("div");
    div.className = "process-block";

    var statusHtml = p.arquivado
      ? '<span class="status-pill arquivado">Arquivado</span>'
      : '<span class="status-pill andamento"><span class="dot-live"></span>Prazo em Andamento</span>';

    var fieldMap = {
      nr_processo: p.nr_processo,
      jurisdicao: p.jurisdicao,
      parte: p.parte,
      parte_id: p.parte_id,
      advogado: joinOrDash(p.advogado, "; "),
      adv_escritorio: p.adv_escritorio || "—",
      vlr_causa: p.vlr_causa_raw && p.vlr_causa_raw.replace("R$", "").trim() ? formatCurrencyBR(p.vlr_causa) : "Não informado",
      obs: p.obs || "—",
      arquivado: null, // renderizado à parte via statusHtml
    };

    var headHtml = cfgProc
      .filter(function (t) { return t.campo !== "arquivado"; })
      .map(function (t) {
        return '<div class="ph-item"><span class="ph-label">' + escapeHtml(t.nome) + '</span><span class="ph-value">' + escapeHtml(fieldMap[t.campo] || "—") + '</span></div>';
      })
      .join("");

    div.innerHTML =
      '<div class="process-head">' + headHtml + '<div class="ph-item"><span class="ph-label">Status</span>' + statusHtml + '</div></div>';

    div.appendChild(renderMovTable(movs));
    return div;
  }

  function renderMovTable(movs) {
    var cfgMov = window.DJS_DATA.config.tags_movimentacao;
    var wrap = document.createElement("div");
    wrap.className = "table-wrap";

    if (!movs.length) {
      wrap.innerHTML = '<div class="empty-state" style="border:none;padding:24px;">Nenhuma peça processual para este processo com os filtros atuais.</div>';
      return wrap;
    }

    var table = document.createElement("table");
    table.className = "mov-table";

    var thead = document.createElement("thead");
    var trh = document.createElement("tr");
    cfgMov.forEach(function (t) {
      var th = document.createElement("th");
      th.textContent = t.nome;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    movs.forEach(function (m) {
      var tr = document.createElement("tr");
      if (isPrazoAtivo(m)) tr.className = "row-prazo-ativo";

      cfgMov.forEach(function (t) {
        var td = document.createElement("td");
        switch (t.campo) {
          case "tags":
            td.className = "cell-nowrap";
            td.innerHTML = m.tags.length
              ? m.tags.map(function (tag) { return '<span class="cell-tag">' + escapeHtml(humanizeTag(tag)) + '</span>'; }).join(" ")
              : "—";
            break;
          case "resumo_prc":
            td.className = "cell-wrap";
            td.textContent = m.resumo_prc || "—";
            break;
          case "doc_anexos":
            td.className = "cell-wrap cell-muted";
            td.textContent = joinOrDash(m.doc_anexos);
            break;
          case "ref_ato_prc":
            td.className = "cell-wrap cell-muted";
            td.textContent = joinOrDash(m.ref_ato_prc);
            break;
          case "data":
            td.className = "cell-nowrap";
            td.textContent = formatDateBR(m.data) || "—";
            break;
          case "dt_publicacao":
            td.className = "cell-nowrap";
            td.textContent = formatDateBR(m.dt_publicacao) || "—";
            break;
          case "dt_prazo":
            td.className = "cell-nowrap";
            if (m.dt_prazo) {
              td.innerHTML = escapeHtml(formatDateBR(m.dt_prazo)) + (isPrazoAtivo(m) ? ' <span class="cell-tag" style="background:rgba(255,176,32,0.14);color:var(--warn)">ativo</span>' : "");
            } else {
              td.textContent = "—";
            }
            break;
          case "obs":
            td.className = "cell-wrap";
            td.textContent = m.obs || "—";
            break;
          case "arquivado":
            td.innerHTML = m.arquivado
              ? '<span class="status-pill arquivado">Arquivado</span>'
              : '<span class="status-pill andamento"><span class="dot-live"></span>Em Andamento</span>';
            break;
          default:
            td.textContent = m[t.campo] || "—";
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  // ---------- Meta / footer ----------

  function renderMeta() {
    var meta = window.DJS_DATA.meta;
    $("#last-updated").textContent = meta.ultima_atualizacao_fmt || "—";
  }

  // ---------- Admin: update button ----------

  function reloadDataJs(onDone, onFail) {
    var s = document.createElement("script");
    s.src = "assets/data.js?t=" + Date.now();
    s.onload = function () { s.remove(); onDone(); };
    s.onerror = function () { s.remove(); onFail(); };
    document.body.appendChild(s);
  }

  function initAdmin() {
    $("#btn-update").addEventListener("click", function () {
      var btn = $("#btn-update");
      btn.classList.add("loading");
      btn.textContent = "Atualizando…";

      function finish() {
        btn.classList.remove("loading");
        btn.textContent = "Atualizar Base de Dados";
      }

      function refetchOnly(afterMsg, isError) {
        reloadDataJs(
          function () {
            populateFilterOptions();
            renderMeta();
            renderAll();
            finish();
            showToast(afterMsg || ("Base atualizada — última atualização: " + window.DJS_DATA.meta.ultima_atualizacao_fmt), isError);
          },
          function () {
            finish();
            showToast("Não foi possível recarregar assets/data.js. Rode build_data.py e publique novamente.", true);
          }
        );
      }

      // Tenta pedir ao servidor local (server.py) para reler o vault e regravar
      // assets/data.js na hora. Se o dashboard não estiver rodando via server.py
      // (ex.: aberto como arquivo local, http.server simples, ou publicado no
      // GitHub Pages), a rota não existe e caímos de volta para apenas
      // recarregar o data.js já publicado.
      fetch("/api/atualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha_admin: state.adminPassword || "" }),
      })
        .then(function (resp) {
          if (!resp.ok) {
            return resp.json().catch(function () { return {}; }).then(function (body) {
              var err = new Error(body.erro || ("HTTP " + resp.status));
              err.fromServer = true;
              throw err;
            });
          }
          return resp.json();
        })
        .then(function () {
          refetchOnly();
        })
        .catch(function (err) {
          if (err.fromServer) {
            // server.py respondeu mas recusou/errou o build (ex.: senha admin errada).
            finish();
            showToast("Falha ao atualizar: " + err.message, true);
            return;
          }
          // Sem servidor local disponível (aberto como arquivo, http.server
          // simples, ou publicado no GitHub Pages): mantém o comportamento
          // anterior de apenas recarregar o data.js já publicado.
          refetchOnly(
            "Servidor local indisponível — recarregado assets/data.js já publicado. Para regerar de fato, rode server.py.",
            true
          );
        });
    });

    $("#btn-logout").addEventListener("click", logout);
  }

  function showToast(msg, isError) {
    var el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.style.cssText =
        "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:100;padding:12px 18px;border-radius:10px;font-size:13px;box-shadow:0 8px 30px rgba(0,0,0,.4);max-width:90vw;";
      document.body.appendChild(el);
    }
    el.style.background = isError ? "#3a1620" : "#132a20";
    el.style.color = isError ? "#ff9aa8" : "#7ee0c3";
    el.style.border = "1px solid " + (isError ? "rgba(255,107,129,0.35)" : "rgba(126,224,195,0.3)");
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.style.display = "none"; }, 4500);
  }

  // ---------- Orchestration ----------

  function renderAll() {
    var filtered = applyFilters();
    renderCards(filtered);
    renderCharts(filtered);
    renderResults(filtered);
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderMeta();
    initLogin();
    initAdmin();
  });
})();
