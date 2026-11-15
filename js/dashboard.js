(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const MESI = 24;

  /* Icone del menu (tratti SVG). */
  const IC = {
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    map:'<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
    role:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    chat:'<path d="M21 12a8 8 0 0 1-12 7l-6 2 2-5a8 8 0 1 1 16-4z"/>',
    star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    team:'<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2.4.6 4 2.4 4 5.5"/>'
  };
  const MENU = {
    personale:[["p-profilo","Profilo","user"],["p-indicatori","I tuoi KPI","chart"],["p-pilota","Pilota ERP","flag"],["p-roadmap","Roadmap","map"],["p-automazioni","Automazioni","bolt"],["p-ruolo","Ruolo e formazione","role"],["p-feedback","Feedback","chat"],["p-recognition","Recognition","star"]],
    governance:[["g-roadmap","Roadmap","map"],["g-kpi","KPI della governance","chart"],["g-kpipers","KPI delle persone","team"],["g-pilota","Pilota ERP","flag"],["g-automazioni","Automazioni","bolt"],["g-persone","Persone e ascolto","team"],["g-recognition","Recognition","star"]]
  };

  /* Roadmap (da piano/roadmap.md). */
  const ROADMAP = [
    { nome:"Avvio",                     nota:"Trivia, classificazione, linea pilota, contratto AI", da:1,  a:1,  tipo:"avvio" },
    { nome:"Pilota ERP",                nota:"Linea Servizi finanziari · tranche 1",  da:2,  a:10, tipo:"pil" },
    { nome:"Automazioni dei Champions", nota:"In parallelo, entro il semaforo",    da:4,  a:22, tipo:"aut" },
    /* Ondate sulla stessa riga: blocchi separati, su due corsie alternate perché si sovrappongono. */
    { nome:"Ondate sulle altre linee",  nota:"Manifatturiero, Energia, Logistica, 4ª linea · tranche 2", da:11, a:22, tipo:"est",
      segmenti:[ { lbl:"1", da:11, a:14 }, { lbl:"2", da:13, a:16 }, { lbl:"3", da:16, a:19 }, { lbl:"4", da:18, a:22 } ] },
    { nome:"Chiusura",                  nota:"Valutazione finale, strutture sciolte", da:23, a:24, tipo:"chi" }
  ];
  const PILOTA = [
    { quando:"M2",     cosa:"Scheda della persona, plenaria, avvio del team, utenti chiave" },
    { quando:"M2-M3",  cosa:"Workshop sui processi con KPMG" },
    { quando:"M3-M5",  cosa:"Configurazione, migrazione dei dati, accessi" },
    { quando:"M6",     cosa:"Prova generale e formazione dei colleghi", gate:"Go/no-go go-live" },
    { quando:"M7",     cosa:"Go-live con il vecchio sistema in parallelo" },
    { quando:"M7-M8",  cosa:"Affiancamento, errori rivisti senza colpe; KPMG in calo da M8" },
    { quando:"M9-M10", cosa:"Nasce l'ERP core team, vecchio sistema spento, misura finale e T1", gate:"Go/no-go estensione e tranche 2" }
  ];

  /* Personas di Marco (profilazione.js, branch marco/v10-autodeterminazione, 13/11).
     Codice = Fiducia + Motivazione + Equità (1 alta, 0 bassa), stesso ordine del trivia.
     Categoria (decisione del 15/11, regola di Marco): Champion = motivazione autonoma più almeno un'altra dimensione alta;
     Cinico = motivazione ed equità basse; gli altri Fence sitter. */
  const PERSONAS = {
    "111": { nome:"Pioniere",                            cat:"Champion", frase:"So cavarmela, trovo un senso nel cambiamento e il conto mi sembra equo." },
    "110": { nome:"Talento in bilico",                   cat:"Champion", frase:"So cavarmela e vedo il senso del cambiamento, ma il conto non torna." },
    "101": { nome:"Esecutore in cerca di senso",         cat:"Fence sitter", frase:"So farlo e mi sembra equo, ma devo capire perché valga la pena impegnarmi." },
    "100": { nome:"Esperto in cerca di garanzie",        cat:"Cinico", frase:"So farlo, ma non vedo ancora un motivo mio per impegnarmi e il conto non torna." },
    "011": { nome:"Volenteroso in crescita",             cat:"Champion", frase:"Il cambiamento ha senso e mi sembra equo, ma mi serve ancora pratica." },
    "010": { nome:"Contributore da sostenere",           cat:"Fence sitter", frase:"Vedo il senso del cambiamento, ma non mi sento pronto e il conto non torna." },
    "001": { nome:"Esploratore prudente",                cat:"Fence sitter", frase:"Il conto mi sembra equo, ma non mi sento pronto e non vedo ancora un motivo per partire." },
    "000": { nome:"Professionista in cerca di stabilità",  cat:"Cinico", frase:"Non mi sento pronto, non vedo ancora un senso nel cambiamento e il conto non torna." }
  };
  const CODICI = ["111","110","011","101","010","001","100","000"];   // ordine esplicito: JS riordina le chiavi numeriche
  /* Linee di prodotto = settori dei clienti indicati nel caso; funzioni = gli 8 reparti del caso. */
  /* Ipotesi della dashboard: il pilota ERP si fa sul team di prodotto Servizi finanziari. */
  const LINEA_PILOTA = "Servizi Finanziari – Pilota ERP";
  const LINEE = ["Manifatturiero", "Energia", "Logistica", LINEA_PILOTA, "Nessuna linea (funzione trasversale)"];
  const FUNZIONI = ["Operations", "Finance & Administration", "Sales", "Marketing", "Human Resources", "IT & Digital Transformation", "Procurement", "Customer Service"];
  const ASSI = [
    { nome:"Fiducia nei nuovi strumenti", alto:"Alta",     basso:"Bassa" },
    { nome:"Motivazione",                 alto:"Autonoma", basso:"Controllata" },
    { nome:"Equilibrio dare/avere",       alto:"Alto",     basso:"Basso" }
  ];

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const pct = m => (m - 1) / MESI * 100;

  function roadmapHTML(){
    const righe = ROADMAP.map(f => {
      const w = (f.a - f.da + 1) / MESI * 100;
      const barre = f.segmenti
        ? f.segmenti.map((s, i) => {
            const ws = (s.a - s.da + 1) / MESI * 100;
            return `<span class="bar ${f.tipo} seg ${i % 2 ? "giu" : "su"}" style="left:${pct(s.da)}%; width:${ws}%" title="Ondata ${s.lbl}: M${s.da}–M${s.a}">${ws > 12 ? `${s.lbl} · M${s.da}–M${s.a}` : s.lbl}</span>`;
          }).join("")
        : `<span class="bar ${f.tipo}" style="left:${pct(f.da)}%; width:${w}%">${w > 12 ? `M${f.da}–M${f.a}` : ""}</span>`;
      const aria = f.segmenti
        ? `${f.nome}: ` + f.segmenti.map(s => `ondata ${s.lbl} da M${s.da} a M${s.a}`).join(", ")
        : `${f.nome}: da M${f.da} a M${f.a}`;
      return `<div class="lbl"><b>${esc(f.nome)}</b><span>${esc(f.nota)}</span></div>
        <div class="track${f.segmenti ? " multi" : ""}" role="img" aria-label="${esc(aria)}">
          ${barre}
          <span class="now" style="left:${pct(ORA + .5)}%"></span>
        </div>`;
    }).join("");
    const tacche = [1, 6, 12, 18, 24].map(m => `<span style="left:${pct(m + .5)}%">M${m}</span>`).join("");
    return `<div class="gantt">${righe}<div class="axis-pad"></div><div class="axis">${tacche}</div></div>`;
  }

  const SPARK = `<svg class="spark" viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 26 C15 24 25 28 40 22 S65 18 80 20 S105 12 120 10" fill="none" stroke="var(--line)" stroke-width="2" stroke-dasharray="4 4"/></svg>`;
  function kpiHTML(n, nome){
    return Array.from({ length:n }, (_, i) => `
      <div class="kpi">
        <div class="top"><span>${nome} ${i + 1}</span><span class="delta">— vs T0</span></div>
        <div class="val">—<small>da definire</small></div>
        ${SPARK}
        <div class="meta"><span>Obiettivo —</span><span>Fonte —</span></div>
      </div>`).join("");
  }


  /* Automazioni dei Champions (piano/fasi/4_azione_pilota_automazioni.md e piano/roadmap.md). Valori segnaposto. */
  const TAPPE_AUTO = [
    { quando:"M2-M3", cosa:"Account con profilo avanzato, formazione avanzata sull'AI, laboratori con specialisti" },
    { quando:"M3",    cosa:"Semaforo del rischio e registro, con il costo stimato di ogni automazione", gate:"Decisione della governance" },
    { quando:"M4",    cosa:"Prime automazioni e call mensili con i Champions ERP" },
    { quando:"M6",    cosa:"Revisione delle prime automazioni", gate:"Allargare il perimetro?" },
    { quando:"M10",   cosa:"Le migliori diventano candidate all'ERP" },
    { quando:"M11-M22", cosa:"Le automazioni migliori arrivano sulle altre linee insieme all'ERP" }
  ];
  const mini = voci => `<div class="mini">${voci.map(v => `<div><span>${v}</span><b>—</b></div>`).join("")}</div>`;
  function automazioniHTML(personale){
    const numeri = personale
      ? mini(["Le tue automazioni", "Ore risparmiate al mese", "Con istruzioni e sostituto", "Riconoscimenti ricevuti"])
      : autoGovHTML().numeri;
    const tappe = `<h3 class="sub">Tappe</h3><ol class="steps six">${passiHTML(TAPPE_AUTO)}</ol>`;
    const extra = personale
      ? `<p class="note muted" style="font-size:12.5px; margin:16px 0 0">Ogni mese: un'ora di call con i Champions del pilota ERP della tua funzione (<span class="autoFunz"></span>), per non automatizzare attività che l'ERP cambierà.</p>`
      : autoGovHTML().tabella;
    return numeri + tappe + extra;
  }


  /* ---------- Dati simulati della vista Governance: nuovi a ogni apertura, plausibili e coerenti tra loro ---------- */
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const fmt = n => n.toLocaleString("it-IT");
  const SIM = (() => {
    /* Trivia: in M1 (settimane 2-3) è ancora aperto, quindi la partecipazione è parziale; da M2 hanno risposto quasi tutti. */
    const triviaM1 = rnd(560, 790), triviaPieno = rnd(838, 850);
    const qChamp = rnd(17, 24) / 100, qCinici = rnd(8, 13) / 100, qRisp = rnd(55, 75) / 100, qSi = rnd(58, 70) / 100, qParte = rnd(18, 27) / 100;
    const qColl = rnd(35, 60) / 100, qCollParte = rnd(5, 12) / 100;
    const kpi = Array.from({ length:4 }, () => {
      const t0 = rnd(40, 70), ora = t0 + rnd(-6, 18), punti = [t0];
      for (let i = 1; i < 7; i++) punti.push(Math.round(t0 + (ora - t0) * i / 6 + rnd(-4, 4)));
      punti[6] = ora;
      return { t0, ora, obiettivo: Math.min(95, t0 + rnd(10, 25)), punti };
    });
    const champFunz = FUNZIONI.map(() => rnd(3, 4));      // Champions incaricati per funzione (massimo 4)
    const pesoFunz = FUNZIONI.map(() => rnd(6, 14));      // quanto automatizza ogni funzione
    return { triviaM1, triviaPieno, qChamp, qCinici, qRisp, qSi, qParte, qColl, qCollParte,
      feedback: rnd(45, 160), kpi, champFunz, pesoFunz, sostituto: rnd(72, 94), oreUna: rnd(6, 10) };
  })();
  /* Partecipazione e ascolto del mese corrente, dalle quote generate all'apertura. */
  function persone(){
    const S = SIM, trivia = ORA === 1 ? S.triviaM1 : S.triviaPieno;
    const champ = Math.round(trivia * S.qChamp), cinici = Math.round(trivia * S.qCinici);
    const risposte = Math.round(trivia * S.qRisp), si = Math.round(risposte * S.qSi), parte = Math.round(risposte * S.qParte), no = risposte - si - parte;
    return { trivia, champ, cinici, fence: trivia - champ - cinici, risposte, si, parte, no,
      colloqui: Math.max(1, Math.round(no * S.qColl + parte * S.qCollParte)), feedback: S.feedback };
  }
  /* Automazioni in funzione del mese: incarichi da M3, prime automazioni da M4, candidate all'ERP da M10. */
  function autoSim(){
    const incaricatiF = SIM.champFunz.map(c => ORA < 3 ? 0 : c);
    const mesi = Math.max(0, ORA - 3);
    const autoF = SIM.pesoFunz.map((p, i) => Math.round(incaricatiF[i] * Math.min(5, mesi * p / 20)));
    const oreF = autoF.map(a => a * SIM.oreUna);
    const tot = autoF.reduce((s, x) => s + x, 0);
    return { incaricatiF, autoF, oreF, tot, incaricati: incaricatiF.reduce((s, x) => s + x, 0),
      ore: oreF.reduce((s, x) => s + x, 0), candidate: ORA >= 10 ? Math.round(tot * .15) : 0 };
  }
  /* Anello che si riempie (circonferenza 100). */
  /* Scala cromatica: 0 = rosso, 0,5 = ambra, 1 = verde. */
  const scala = (f, a = 1) => `hsl(${Math.round(Math.max(0, Math.min(1, f)) * 130)} 74% 45% / ${a})`;
  const ring = (frac, size = 34, inverti = false) => {
    const f = Math.max(0, Math.min(1, frac)), c = scala(inverti ? 1 - f : f);
    return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 36 36" aria-hidden="true">
    <circle cx="18" cy="18" r="15.915" class="rt" style="stroke:${scala(inverti ? 1 - f : f, .16)}"/><circle cx="18" cy="18" r="15.915" class="rf" style="stroke:${c}" stroke-dasharray="${f * 100} 100" transform="rotate(-90 18 18)"/></svg>`;
  };
  const pc = (a, b) => b ? Math.round(a / b * 100) : 0;
  function partecipazioneHTML(){
    const s = persone(), fr = [s.champ, s.fence, s.cinici].map(x => x / s.trivia * 100);
    return `<div class="big-ring">${ring(s.trivia / 850, 64)}<div><b>${fmt(s.trivia)}<small> / 850</small></b><span>trivia completati · ${pc(s.trivia, 850)}%</span></div></div>
      <div class="meter" aria-hidden="true"><i style="width:${fr[0]}%; background:var(--c-champ)"></i><i style="width:${fr[1]}%; background:var(--c-fence)"></i><i style="width:${fr[2]}%; background:var(--c-cinici)"></i></div>
      <div class="legend"><span><i style="background:var(--c-champ)"></i>Champions</span><span><i style="background:var(--c-fence)"></i>Fence sitters</span><span><i style="background:var(--c-cinici)"></i>Cinici</span></div>
      <table style="margin-top:14px"><thead><tr><th>Categoria</th><th class="n">Persone</th><th class="n">Quota</th></tr></thead><tbody>
        <tr><td><i class="dotc" style="background:var(--c-champ)"></i>Champions</td><td class="n">${fmt(s.champ)}</td><td class="n"><span class="pct" style="--pc:var(--c-champ)">${pc(s.champ, s.trivia)}%</span></td></tr>
        <tr><td><i class="dotc" style="background:var(--c-fence)"></i>Fence sitters</td><td class="n">${fmt(s.fence)}</td><td class="n"><span class="pct" style="--pc:var(--c-fence)">${pc(s.fence, s.trivia)}%</span></td></tr>
        <tr><td><i class="dotc" style="background:var(--c-cinici)"></i>Cinici</td><td class="n">${fmt(s.cinici)}</td><td class="n"><span class="pct" style="--pc:var(--c-cinici)">${pc(s.cinici, s.trivia)}%</span></td></tr>
      </tbody></table>`;
  }
  function ascoltoHTML(){
    const s = persone(), riga = (t, n, tot, inv = false) => `<tr><td>${t}</td><td class="n">${fmt(n)}</td><td class="n ringcell">${ring(n / tot, 22, inv)}${pc(n, tot)}%</td></tr>`;
    return `<div class="big-ring">${ring(s.risposte / s.trivia, 64)}<div><b>${fmt(s.risposte)}<small> / ${fmt(s.trivia)}</small></b><span>hanno risposto a «Ti ritrovi nel tuo profilo?»</span></div></div>
      <table><thead><tr><th>Risposta</th><th class="n">Persone</th><th class="n">Quota</th></tr></thead><tbody>
        ${riga("Si ritrovano", s.si, s.risposte)}${riga("In parte", s.parte, s.risposte, true)}${riga("Non si ritrovano", s.no, s.risposte, true)}
        ${riga("Colloqui richiesti sul profilo", s.colloqui, s.risposte, true)}
        ${riga("Feedback anonimi ricevuti", s.feedback, s.trivia)}
      </tbody></table>`;
  }
  function kpiSimHTML(lista = SIM.kpi, nome = "KPI"){
    return lista.map((k, i) => {
      const d = k.ora - k.t0, min = Math.min(...k.punti) - 4, max = Math.max(...k.punti) + 4;
      const xy = k.punti.map((v, j) => `${(j / 6 * 120).toFixed(1)},${(34 - (v - min) / (max - min) * 32).toFixed(1)}`);
      return `<div class="kpi">
        <div class="top"><span>${nome} ${i + 1} <small class="muted">da definire</small></span><span class="delta ${d >= 0 ? "up" : "down"}">${d >= 0 ? "+" : ""}${d} pt vs T0</span></div>
        <div class="kpi-row"><div class="val" style="color:${scala(k.ora / k.obiettivo * 1.1 - .1)}">${k.ora}%</div>${ring(k.ora / k.obiettivo, 40)}</div>
        <svg class="spark" viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,36 ${xy.join(" ")} 120,36" fill="${d >= 0 ? "var(--c-champ)" : "var(--c-cinici)"}" opacity=".12"/><polyline points="${xy.join(" ")}" fill="none" stroke="${d >= 0 ? "var(--c-champ)" : "var(--c-cinici)"}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>
        <div class="meta"><span>Obiettivo ${k.obiettivo}%</span><span>T0 ${k.t0}%</span></div>
      </div>`;
    }).join("");
  }
  function autoGovHTML(){
    const a = autoSim(), card = (t, v, r) => `<div class="has-ring">${r ?? ""}<span>${t}</span><b class="on">${v}</b></div>`;
    const numeri = `<div class="mini">${[
      card("Champions incaricati", `${a.incaricati}<small> / 32</small>`, ring(a.incaricati / 32, 30)),
      card("Automazioni nel registro", fmt(a.tot)),
      card("Ore risparmiate al mese", fmt(a.ore)),
      card("Con istruzioni e sostituto", a.tot ? `${SIM.sostituto}%` : "—", a.tot ? ring(SIM.sostituto / 100, 30) : ""),
      card("Candidate all'ERP", fmt(a.candidate))].join("")}</div>`;
    const tabella = `<h3 class="sub" style="margin-top:18px">Per funzione</h3><table><thead><tr><th>Funzione</th><th class="n">Champions</th><th class="n">Automazioni</th><th class="n">Ore/mese</th></tr></thead>
      <tbody>${FUNZIONI.map((f, i) => `<tr><td>${esc(f)}</td><td class="n ringcell">${ring(a.incaricatiF[i] / 4, 22)}${a.incaricatiF[i]} / 4</td><td class="n">${fmt(a.autoF[i])}</td><td class="n">${fmt(a.oreF[i])}</td></tr>`).join("")}</tbody></table>`;
    return { numeri, tabella };
  }

  /* ---------- Dati simulati della vista personale: nuovi a ogni apertura, legati a persona, linea, funzione e mese ---------- */
  const genKpi = n => Array.from({ length:n }, () => {
    const t0 = rnd(40, 70), ora = t0 + rnd(-6, 18), punti = [t0];
    for (let i = 1; i < 7; i++) punti.push(Math.round(t0 + (ora - t0) * i / 6 + rnd(-4, 4)));
    punti[6] = ora;
    return { t0, ora, obiettivo: Math.min(95, t0 + rnd(10, 25)), punti };
  });
  const PSIM = { kpi: genKpi(3), peso: rnd(8, 14), oreUna: rnd(6, 10), sostituto: rnd(75, 100),
    ricon: rnd(6, 14) / 10, puntiMese: rnd(30, 90), jitter: Array.from({ length:6 }, () => rnd(-12, 8) / 100), msg: rnd(0, 2) };
  /* Esempi di automazioni per funzione (registro simulato). */
  const ESEMPI_AUTO = {
    "Operations": ["Promemoria scadenze delle commesse", "Report settimanale avanzamento ordini", "Controllo anomalie nelle consegne", "Aggiornamento stato commesse da e-mail", "Riepilogo turni e carichi"],
    "Finance & Administration": ["Riconciliazione estratti conto", "Solleciti di pagamento", "Controllo fatture duplicate", "Report mensile dei costi", "Raccolta note spese"],
    "Sales": ["Bozza delle offerte standard", "Aggiornamento anagrafica clienti", "Report pipeline settimanale", "Promemoria rinnovi contrattuali", "Riepilogo visite ai clienti"],
    "Marketing": ["Report campagne mensile", "Bozze dei post da approvare", "Smistamento richieste di materiali", "Controllo budget campagne", "Raccolta lead dagli eventi"],
    "Human Resources": ["Risposte alle domande frequenti", "Promemoria scadenze dei corsi", "Smistamento richieste ferie", "Report presenze mensile", "Onboarding: lista documenti"],
    "IT & Digital Transformation": ["Smistamento ticket", "Report accessi settimanale", "Reset password guidato", "Inventario licenze", "Avvisi di manutenzione"],
    "Procurement": ["Confronto preventivi fornitori", "Promemoria scadenze ordini", "Controllo ricezione merci", "Report spesa per fornitore", "Aggiornamento anagrafica fornitori"],
    "Customer Service": ["Smistamento richieste clienti", "Bozze di risposta standard", "Report reclami settimanale", "Stato ordini su richiesta", "Promemoria richiami ai clienti"]
  };
  const MESSAGGI = [
    "«Hai documentato la procedura e il collega l'ha ripetuta da solo.»",
    "«Hai segnalato subito l'errore nei dati: l'abbiamo corretto prima del go-live.»",
    "«Hai affiancato due colleghi sul nuovo processo: ora lavorano in autonomia.»"
  ];
  function ruoloPersonale(){
    const cat = PERSONAS[scelta.codice].cat, pil = scelta.linea === LINEA_PILOTA, f = scelta.funzione;
    if (cat === "Champion") return pil
      ? ["Utente chiave del pilota ERP", `Per ${f}: provi i nuovi processi con KPMG, formi i colleghi della linea e li affianchi dopo il go-live.`]
      : ["Champion delle automazioni", `Per ${f}: automatizzi i compiti ripetitivi entro il perimetro della governance e ogni mese ti confronti con i Champions del pilota ERP.`];
    if (cat === "Fence sitter") return pil
      ? ["Utente del pilota ERP", "Ricevi la formazione di base e le guide pronte dagli utenti chiave, partecipi ai workshop di aggiornamento e segnali i problemi che incontri."]
      : ["Utente dei nuovi strumenti", "Ricevi informazioni chiare e la formazione di base quando il cambiamento arriva al tuo lavoro, partecipi ai workshop di aggiornamento e puoi chiedere un incontro di ascolto."];
    return pil
      ? ["Revisore nel team pilota", "Partecipi agli incontri di revisione delle soluzioni: le tue osservazioni su rischi e problemi ricevono una risposta motivata."]
      : ["Voce critica nella revisione", "Sei invitato agli incontri di confronto sulle soluzioni: le tue osservazioni su rischi e problemi ricevono una risposta motivata."];
  }
  function corsiPersonali(){
    const cat = PERSONAS[scelta.codice].cat, pil = scelta.linea === LINEA_PILOTA;
    /* Calendario come piano/roadmap.md: Cyber essentials M3-M5, AI per tutte le funzioni M4-M6, Champions delle automazioni M2-M5. */
    const c = [{ t:"Cyber essentials, con simulazione di phishing", da:3, a:5 }];
    if (cat === "Champion" && pil) c.push({ t:"Formazione AI del tuo livello", da:4, a:6 }, { t:"Utente chiave ERP, con KPMG", da:2, a:6 }, { t:"Train-the-trainer: formatore della linea successiva", da:7, a:10 });
    if (cat === "Champion" && !pil) c.push({ t:"AI generativa avanzata (24 ore)", da:2, a:3 }, { t:"Piattaforma di automazione, con specialisti esterni", da:3, a:5 });
    if (cat !== "Champion") c.push({ t:"Formazione AI del tuo livello", da:4, a:6 });
    if (cat !== "Champion" && pil) c.push({ t:"Nuovo ERP: i processi della tua linea", da:6, a:7 });
    if (!pil) {
      const S = ONDATE[scelta.linea];
      c.push(S ? { t:"Nuovo ERP: i processi della tua linea", da:S, a:S + 2 } : { t:"Nuovo ERP, quando arriva nella tua funzione", da:11, a:13 });
    }
    return c.map((x, i) => {
      const base = (ORA - x.da + 1) / (x.a - x.da + 1);
      const frac = ORA < x.da ? 0 : ORA > x.a ? 1 : Math.max(.05, Math.min(1, base + PSIM.jitter[i % 6]));
      return { ...x, frac };
    });
  }
  function autoPersonali(){
    const mesi = Math.max(0, ORA - 3), n = Math.round(Math.min(5, mesi * PSIM.peso / 20));
    return { n, ore: n * PSIM.oreUna, esempi: (ESEMPI_AUTO[scelta.funzione] || []).slice(0, n) };
  }
  function aggiornaPersonale(){
    const [titolo, testo] = ruoloPersonale();
    $("rCorpo").innerHTML = `<div class="role-big">${esc(titolo)}</div><p class="muted" style="margin:6px 0 0">${esc(testo)}</p>
      <p class="note-s">${ORA >= 2 ? "Comunicato a inizio M2" : "Ruolo previsto: ti viene comunicato a inizio M2"} · ${esc($("rDove").textContent)}</p>`;
    $("formP").innerHTML = corsiPersonali().map(c => `<li class="course">${ring(c.frac, 26)}<div><b>${esc(c.t)}</b><span>M${c.da}${c.a !== c.da ? "–M" + c.a : ""} · ${ORA < c.da ? "da iniziare" : c.frac >= 1 ? "completato" : Math.round(c.frac * 100) + "%"}</span></div></li>`).join("");
    $("kpiP").innerHTML = kpiPersHTML();
    const a = autoPersonali();
    const autoNum = $("autoP").querySelector(".mini");
    if (autoNum) autoNum.outerHTML = `<div class="mini">
      <div><span>Le tue automazioni</span><b class="on">${a.n}</b></div>
      <div><span>Ore risparmiate al mese</span><b class="on">${fmt(a.ore)}</b></div>
      <div class="has-ring">${a.n ? ring(PSIM.sostituto / 100, 30) : ""}<span>Con istruzioni e sostituto</span><b class="on">${a.n ? PSIM.sostituto + "%" : "—"}</b></div>
      <div><span>Riconoscimenti ricevuti</span><b class="on">${Math.round(a.n * PSIM.ricon)}</b></div></div>`;
    const ric = ORA >= 3 ? Math.round((ORA - 2) * PSIM.ricon) : 0, punti = ORA >= 6 ? (ORA - 5) * PSIM.puntiMese : 0;
    $("recP").innerHTML = `<div class="mini">
      <div><span>Riconoscimenti ricevuti</span><b class="on">${ric}</b></div>
      <div><span>Punti disponibili</span><b class="on">${ORA >= 6 ? fmt(punti) : "dal M6"}</b></div>
      <div><span>Riconoscimenti che puoi dare</span><b class="on">${ORA >= 3 ? "sempre" : "dal M3"}</b></div></div>
      ${ric ? `<p class="quote" style="margin:0">${MESSAGGI[PSIM.msg]}</p>` : `<p class="ph-text">I riconoscimenti partono dal M3: prima solo messaggi, poi punti e catalogo dal M6.</p>`}`;
  }

  /* ================= KPI del programma (piano/kpis.md, 15/11) ================= */
  /* Valori simulati: un numero casuale fisso per KPI all'apertura, poi valore e stato seguono il mese. */
  const SEME = {};
  const seme = k => (SEME[k] ??= Math.random());
  const STATI = { ok:["In soglia","ok"], warn:["Attenzione","warn"], ko:["Fuori soglia","ko"], na:["Non ancora","na"] };
  /* Generatori: r = seme casuale (0-1). Ogni tipo restituisce testo, stato e riempimento dell'anello. */
  const GEN = {
    pctMin: (r, t, u = "%") => { const v = Math.min(100, Math.round(t + (r - .35) * 14)); return { v:`${v}${u}`, st: v >= t ? "ok" : v >= t - 3 ? "warn" : "ko", fr: v / 100 }; },
    max: (r, t, u = "%", dec = 0) => { const v = +(t * (.55 + r * .62)).toFixed(dec); return { v:`${String(v).replace(".", ",")}${u}`, st: v <= t ? "ok" : v <= t * 1.12 ? "warn" : "ko", fr: Math.max(0, 1 - v / (t * 2)) }; },
    zero: r => { const v = r < .8 ? 0 : r < .93 ? 1 : 2; return { v:String(v), st: v === 0 ? "ok" : "ko", fr: v === 0 ? 1 : .2 }; },
    count: (r, t, u = "") => { const v = Math.round(t * (.75 + r * .6)); return { v:`${v}${u}`, st: v >= t ? "ok" : v >= t * .8 ? "warn" : "ko", fr: Math.min(1, v / t) }; },
    su: (r, u = " pt") => { const d = Math.round((r - .22) * 10); return { v:`${d > 0 ? "+" : ""}${d}${u}`, st: d > 0 ? "ok" : d === 0 ? "warn" : "ko", fr: Math.max(.05, Math.min(1, .5 + d / 10)) }; },
    giu: (r, u = " pt") => { const d = Math.round((.22 - r) * 10); return { v:`${d > 0 ? "+" : ""}${d}${u}`, st: d < 0 ? "ok" : d === 0 ? "warn" : "ko", fr: Math.max(.05, Math.min(1, .5 - d / 10)) }; },
    stabile: (r, u = " pt") => { const d = Math.round((r - .3) * 6); return { v:`${d > 0 ? "+" : ""}${d}${u}`, st: d >= 0 ? "ok" : d === -1 ? "warn" : "ko", fr: Math.max(.05, Math.min(1, .6 + d / 8)) }; },
    volte: (r, t) => { const v = +(t * (.8 + r * 3)).toFixed(1); return { v:`×${String(v).replace(".", ",")}`, st: v > t ? "ok" : v > t * .9 ? "warn" : "ko", fr: Math.min(1, v / (t * 3)) }; },
    fatto: r => { const ok = r > .15; return { v: ok ? "Sì" : "No", st: ok ? "ok" : "ko", fr: ok ? 1 : .1 }; }
  };

  /* A. KPI della governance: 10 per fase (piano/kpis.md). Cambiando fase alcuni escono e altri entrano, il totale resta 10. */
  /* Avanzamento atteso da un mese all'altro: utile per i KPI "entro Mx". */
  const avanz = (r, da, a, t = 100, u = "%") => {
    const att = Math.max(0, Math.min(1, (ORA - da + 1) / (a - da + 1))) * t;
    const v = Math.round(Math.max(0, Math.min(t, att + (r - .3) * t * .12)));
    return { v:`${v}${u}`, st: v >= att - t * .05 ? "ok" : v >= att - t * .15 ? "warn" : "ko", fr: v / t };
  };
  const FASI_KPI = [
    { id:1, nome:"Preparazione", da:1, a:6, scopo:"arrivare pronti al go-live" },
    { id:2, nome:"Go-live e stabilizzazione", da:7, a:10, scopo:"il pilota regge?" },
    { id:3, nome:"Estensione a tutta l'azienda", da:11, a:22, scopo:"il modello si ripete sulle altre linee" },
    { id:4, nome:"Chiusura", da:23, a:24, scopo:"il cambiamento è diventato ordinario?" }
  ];
  const faseKpi = () => FASI_KPI.find(f => ORA >= f.da && ORA <= f.a);
  const AREE = [
    { id:"cont", nome:"Continuità operativa" },
    { id:"rischi", nome:"Rischi tecnologici" },
    { id:"persone", nome:"Persone e conoscenze" },
    { id:"budget", nome:"Budget" }
  ];
  const G = (fase, a, n, m, s, f, src, g) => ({ fase, a, n, m, s, f, src, g });
  const KPI_GOV = [
    /* Fase 1 · Preparazione (M1-M6) */
    G(1, "cont", "Configurazione nei tempi", "% cicli di configurazione chiusi come da piano", "≥90%", "mensile", "ERP core team, KPMG", r => ORA < 3 ? { v:"piano pronto", st:"ok", fr:1 } : GEN.pctMin(r, 90)),
    G(1, "cont", "Dati pronti alla migrazione", "% dati della linea puliti e validati", "≥98% entro M6", "mensile", "ERP core team", r => avanz(r, 2, 6, 98)),
    G(1, "cont", "Champions delle automazioni attivi", "formati e con account, sui ~32 previsti", "100% entro M4", "mensile", "registro formazione", r => avanz(r, 2, 4)),
    G(1, "rischi", "Incidenti cyber gravi", "incidenti classificati gravi", "0", "mensile", "CISO", r => GEN.zero(r)),
    G(1, "rischi", "Cyber essentials", "% dipendenti formati", "100% entro M5", "mensile", "registro formazione", r => avanz(r, 2, 5)),
    G(1, "rischi", "AI dentro i profili", "% utenti attivi sull'assistente aziendale", "in crescita ogni mese", "mensile", "console AI", r => ({ v:`${Math.round(15 + ORA * 6 + r * 5)}%`, st:"ok", fr:(15 + ORA * 6) / 100 })),
    G(1, "persone", "Trivia e restituzione", "% con trivia completato e scheda aperta", "≥95% entro M2", "mensile", "sito, HR", r => ORA === 1 ? { v:`${Math.round(persone().trivia / 8.5)}%`, st:"ok", fr:persone().trivia / 850 } : GEN.pctMin(r, 95)),
    G(1, "persone", "Benessere e stress", "pulse WHO-5 e HSE rispetto a T0", "nessun peggioramento", "mensile", "pulse fase 5", r => GEN.stabile(r)),
    G(1, "persone", "Formazione nel tempo protetto", "% ore di formazione svolte nelle ore dedicate", "≥90%", "mensile", "registro formazione", r => GEN.pctMin(r, 90)),
    G(1, "budget", "Spesa rispetto alla tranche", "spesa cumulata / tranche 1", "≤100%", "mensile", "CFO", r => GEN.max(r, 100)),
    /* Fase 2 · Go-live e stabilizzazione (M7-M10) */
    G(2, "cont", "Consegne puntuali della linea", "% ordini in tempo rispetto a T0", "≥95% di T0", "mensile", "ERP", r => GEN.pctMin(r, 95)),
    G(2, "cont", "Errori nelle transazioni", "errori ogni 1.000 transazioni (T0 = 4‰)", "a T0 entro 8 settimane dal go-live", "settimanale", "ERP", r => GEN.max(r, ORA >= 9 ? 4 : 6, "‰", 1)),
    G(2, "cont", "Transazioni nel nuovo ERP", "% transazioni della linea a sistema", "≥90% entro M9", "mensile", "ERP", r => ORA >= 9 ? GEN.pctMin(r, 90) : avanz(r, 7, 9, 90)),
    G(2, "rischi", "Incidenti cyber gravi", "incidenti classificati gravi", "0", "mensile", "CISO", r => GEN.zero(r)),
    G(2, "rischi", "Profili di accesso rivisti", "% profili controllati prima del go-live", "100%", "al go-live", "CISO, KPMG", r => GEN.pctMin(r, 100)),
    G(2, "rischi", "Automazioni sotto controllo", "% automazioni con istruzioni e sostituto", "100%", "mensile", "registro", r => GEN.pctMin(r, 100)),
    G(2, "persone", "Benessere e stress", "pulse WHO-5 e HSE rispetto a T0", "nessun peggioramento", "mensile", "pulse fase 5", r => GEN.stabile(r)),
    G(2, "persone", "Copertura della recognition", "% che danno e ricevono un riconoscimento a trimestre", "≥70%, divario presenza/remoto <10 punti", "trimestrale", "piattaforma", r => GEN.pctMin(r, 70)),
    G(2, "persone", "Dipendenza da KPMG", "ore KPMG nel team ERP rispetto al mese prima", "in calo da M8", "mensile", "Change & Risk Office", r => ORA < 8 ? { v:"presenza piena", st:"ok", fr:1 } : GEN.giu(r, "%")),
    G(2, "budget", "Spesa rispetto alla tranche", "spesa cumulata / tranche 1", "≤100%", "mensile", "CFO", r => GEN.max(r, 100)),
    /* Fase 3 · Estensione a tutta l'azienda (M11-M22) */
    G(3, "cont", "Consegne puntuali delle linee in ondata", "% ordini in tempo rispetto a T0", "≥92% di T0", "mensile", "ERP", r => GEN.pctMin(r, 92)),
    G(3, "cont", "Transazioni nel nuovo ERP", "% transazioni delle linee in ondata a sistema", "≥90% entro 3 mesi dal go-live", "mensile", "ERP", r => GEN.pctMin(r, 90)),
    G(3, "cont", "Ondate formate internamente", "% formazione delle ondate fatta da personale NexaCore", "≥80%", "a ogni ondata", "registro formazione", r => GEN.pctMin(r, 80)),
    G(3, "rischi", "Incidenti cyber gravi", "incidenti classificati gravi", "0", "mensile", "CISO", r => GEN.zero(r)),
    G(3, "rischi", "AI fuori dagli strumenti aziendali", "quota che usa strumenti personali, rispetto al trimestre prima", "in calo ogni trimestre", "trimestrale", "pulse anonimo", r => GEN.giu(r)),
    G(3, "rischi", "Automazioni integrate nell'ERP", "automazioni migliori portate nell'ERP, per linea passata", "≥1 per linea", "a ogni ondata", "registro", r => { const n = Object.values(ONDATE).filter(m => ORA >= m + 2).length + 1, v = n + Math.round(r * 2); return { v:`${v} su ${n} linee`, st: v >= n ? "ok" : "warn", fr: Math.min(1, v / n) }; }),
    G(3, "persone", "Commitment al cambiamento", "quota \"voglio\" rispetto a \"devo\", da T0", "in crescita", "T1-T2", "questionario fase 5", r => GEN.su(r)),
    G(3, "persone", "Movimento tra categorie", "% Fence sitters diventati Champions, da T0", "in crescita", "T1-T2", "trivia ripetuto", r => GEN.su(r, "%")),
    G(3, "persone", "Turnover volontario", "uscite volontarie annue (T0 ~8%)", "≤ T0", "trimestrale", "HR", r => GEN.max(r, 8, "%", 1)),
    G(3, "budget", "Spesa rispetto alla tranche", "spesa cumulata / tranche 2", "≤100%", "mensile", "CFO", r => GEN.max(r, 100)),
    /* Fase 4 · Chiusura (M23-M24) */
    G(4, "cont", "ERP in tutta l'azienda", "% transazioni di tutte le linee a sistema", "≥95%", "mensile", "ERP", r => GEN.pctMin(r, 95)),
    G(4, "cont", "Tempo del processo", "giorni dall'ordine all'incasso (T0 = 45)", "≤ T0", "mensile", "ERP", r => GEN.max(r, 45, " gg")),
    G(4, "cont", "Ore liberate e reinvestite", "% ore risparmiate con reinvestimento dichiarato", "100%", "trimestrale", "registro", r => GEN.pctMin(r, 100)),
    G(4, "rischi", "Incidenti cyber gravi", "incidenti classificati gravi", "0", "mensile", "CISO", r => GEN.zero(r)),
    G(4, "rischi", "Phishing", "% di clic nelle simulazioni", "≤5%", "trimestrale", "CISO", r => GEN.max(r, 5, "%", 1)),
    G(4, "rischi", "Costo delle automazioni", "valore delle ore risparmiate / costo dei token", "> ×1 per ogni automazione", "trimestrale", "registro", r => GEN.volte(r, 1)),
    G(4, "persone", "Commitment al cambiamento", "quota \"voglio\" a T3 rispetto a T0", "in crescita", "T3", "questionario fase 5", r => GEN.su(r)),
    G(4, "persone", "Benessere e burnout", "WHO-5, HSE e CBI dei ruoli extra a T3, rispetto a T0", "nessun peggioramento", "T3", "questionario fase 5", r => GEN.stabile(r)),
    G(4, "persone", "Presidio passato alla gestione ordinaria", "% processi con ruoli, SOP e sostituti formalizzati", "100%", "a fine programma", "Change & Risk Office", r => avanz(r, 23, 24)),
    G(4, "budget", "Spesa totale rispetto al budget", "spesa del programma / budget approvato", "≤100%", "a fine programma", "CFO", r => GEN.max(r, 100))
  ];
  const aperte = new Set();   // compatibilità con l'evento "toggle" (non più usato)
  const statoChip = st => `<span class="st ${STATI[st][1]}">${STATI[st][0]}</span>`;
  const valutaGov = k => k.g(seme(`${k.fase}-${k.n}`));
  /* Vista dei KPI di governance: la fase attuale con i suoi 10 KPI, raggruppati per area, in una sola tabella. */
  function kpiGovHTML(){
    const fase = faseKpi(), ks = KPI_GOV.filter(k => k.fase === fase.id), xs = ks.map(valutaGov);
    const n = s => xs.filter(x => x.st === s).length;
    const prima = FASI_KPI.find(f => f.id === fase.id - 1), nomiPrima = prima ? KPI_GOV.filter(k => k.fase === prima.id).map(k => k.n) : [];
    const nuovi = ks.filter(k => !nomiPrima.includes(k.n)).length;
    const passi = FASI_KPI.map(f => `<span class="kf${f.id === fase.id ? " on" : f.a < ORA ? " done" : ""}"><b>${f.id}</b>${esc(f.nome)}<small>M${f.da}–M${f.a}</small></span>`).join("");
    const righe = AREE.map(a => {
      const gruppo = ks.map((k, i) => [k, xs[i]]).filter(([k]) => k.a === a.id);
      if (!gruppo.length) return "";
      return `<tr class="kg-grp"><td colspan="4">${esc(a.nome)}</td></tr>` + gruppo.map(([k, x]) => `<tr class="${x.st}">
          <td><b>${esc(k.n)}</b><small>${esc(k.m)}</small></td>
          <td class="n kg-val">${x.v}</td>
          <td class="kg-soglia">${esc(k.s)}<small>${esc(k.f)} · ${esc(k.src)}</small></td>
          <td class="n">${statoChip(x.st)}</td></tr>`).join("");
    }).join("");
    return `<div class="kf-steps">${passi}</div>
      <div class="kg-sum">
        <div class="kg-big">${ring(n("ok") / ks.length, 56)}<div><b>${n("ok")} su ${ks.length}</b><span>KPI in soglia · fase ${fase.id}, ${esc(fase.scopo)}</span></div></div>
        <div class="kg-pills"><span class="st ok">${n("ok")} in soglia</span><span class="st warn">${n("warn")} attenzione</span><span class="st ko">${n("ko")} fuori soglia</span>${prima ? `<span class="st na">${nuovi} nuovi rispetto alla fase ${prima.id}</span>` : ""}</div>
      </div>
      <div class="kg-area"><table class="kg-tab"><thead><tr><th>KPI della fase ${fase.id} · ${esc(fase.nome)}</th><th class="n">Valore</th><th>Soglia</th><th class="n">Stato</th></tr></thead><tbody>${righe}</tbody></table></div>
      <p class="note-s">Sempre 10 KPI: cambiando fase alcuni escono e altri entrano. Soglie di esempio, da tarare con la governance a M1 sulla situazione di partenza (T0).</p>`;
  }

  /* B e C. KPI per persona: sempre 3, ciascuno con una variante "prima" e una "dopo" (piano/kpis.md). */
  const ONDATE = { "Manifatturiero":11, "Energia":13, "Logistica":16 };   // ondate 1-3 (roadmap: M11, M13, M16; la 4a, M18-M22, non ha ancora una linea nella dashboard)
  const FINE_ONDATA = { "Manifatturiero":14, "Energia":16, "Logistica":19 }; // come piano/roadmap.md
  function contesto(){
    if (scelta.linea === LINEA_PILOTA) return { erp:true, S:2, G:7, nome:"pilota (M2-M10)" };
    const S = ONDATE[scelta.linea];
    if (S && ORA >= S) return { erp:true, S, G:S + 2, nome:`ondata ${Object.keys(ONDATE).indexOf(scelta.linea) + 1} (M${S}-M${FINE_ONDATA[scelta.linea]})` };
    return { erp:false, S, G: S ? S + 2 : null, nome: S ? `ondata ${Object.keys(ONDATE).indexOf(scelta.linea) + 1} da M${S}` : "" };
  }
  const k = (n, m, s, f, g) => ({ n, m, s, f, g });
  /* Uno slot: KPI fisso, oppure { pre, post, cambio(c) }: da "cambio" in poi vale la variante "post". */
  const V = (pre, post, cambio) => ({ pre, post, cambio });
  const DOPO_GOLIVE = c => c.G, A_M = m => () => m;
  const AUTONOMIA_ERP = k("Compiti in autonomia sul nuovo ERP", "compiti del mese verificati dall'utente chiave", "in crescita", "mensile", r => GEN.count(r, 8));
  const ADOZIONE = {
    erp: V(k("Preparazione al nuovo ERP", "% formazione e prove in sandbox completate", "100% entro il go-live", "mensile", (r, c) => avanz(r, c.S, c.G - 1)),
           k("Adozione del nuovo ERP", "% delle tue attività registrate nell'ERP", "≥90% entro 3 mesi dal go-live", "mensile", (r, c) => ORA >= c.G + 3 ? GEN.pctMin(r, 90) : avanz(r, c.G, c.G + 2, 90)), DOPO_GOLIVE),
    non: V(k("Formazione di base sull'AI", "% delle 4 ore svolte", "100% entro M5", "mensile", r => avanz(r, 2, 5)),
           k("Adozione dell'AI aziendale", "settimane con uso dell'assistente", "≥3 su 4", "mensile", r => { const v = r < .12 ? 2 : r < .45 ? 3 : 4; return { v:`${v} su 4`, st: v >= 3 ? "ok" : "ko", fr: v / 4 }; }), A_M(6))
  };
  const RUOLO = {
    erp: V(k("Colleghi formati", "colleghi formati e autonomi", "tutta la tua funzione entro il go-live", "mensile", (r, c) => avanz(r, c.S, c.G - 1, 6, "")),
           k("Richieste risolte senza KPMG", "% ticket della linea chiusi da te", "≥50% a M8, ≥80% a M10", "mensile", r => GEN.pctMin(r, ORA >= 10 ? 80 : 50)), DOPO_GOLIVE),
    non: V(k("Formazione avanzata sull'AI", "% delle 24 ore svolte", "100% entro M3", "mensile", r => avanz(r, 2, 3)),
           k("Automazioni attive", "automazioni nel registro", "~5 a fine anno 1", "trimestrale", () => { const n = autoPersonali().n; return { v:String(n), st: ORA >= 12 && n < 5 ? "warn" : "ok", fr: Math.min(1, n / 5) }; }), A_M(4))
  };
  const KPI_PERS = {
    "111": { erp:[k("AI entro le regole", "usi fuori profilo", "0", "mensile", r => GEN.zero(r))],
             non:[k("AI entro le regole", "usi fuori profilo", "0", "mensile", r => GEN.zero(r))] },
    "110": { erp:[V(k("Accordi su carico e riconoscimento", "% accordi rispettati dall'azienda", "100%", "trimestrale", r => GEN.pctMin(r, 100)), k("Equità percepita", "punteggio di equità nel trivia, da T0", "in crescita da T0", "T1-T3", r => GEN.su(r)), A_M(10))],
             non:[V(k("Accordi su carico e riconoscimento", "% accordi rispettati dall'azienda", "100%", "trimestrale", r => GEN.pctMin(r, 100)), k("Equità percepita", "punteggio di equità nel trivia, da T0", "in crescita da T0", "T1-T3", r => GEN.su(r)), A_M(10))] },
    "011": { erp:[V(k("Pratica in sandbox", "esercizi completati", "≥10 prima del go-live", "mensile", (r, c) => avanz(r, c.S, c.G - 1, 10, "")), AUTONOMIA_ERP, DOPO_GOLIVE)],
             non:[V(k("Formazione AI completata", "% ore del tuo livello svolte", "100%", "mensile", r => avanz(r, 2, 5)), k("Autoefficacia", "punteggio di autoefficacia nel trivia", "sopra 50 a T1", "T1-T3", r => GEN.pctMin(r, 50, "")), A_M(10))] },
    "101": { erp:[k("Workshop di aggiornamento", "partecipazione agli incontri", "≥80%", "trimestrale", r => GEN.pctMin(r, 80)),
                  V(k("Prova scelta e discussa", "prove concordate con il responsabile e discusse", "≥1", "trimestrale", r => GEN.count(r, 1)), k("Motivazione", "punteggio di autodeterminazione nel trivia, da T0", "in crescita da T0", "T1-T3", r => GEN.su(r)), A_M(10))],
             non:[k("Workshop di aggiornamento", "partecipazione agli incontri", "≥80%", "trimestrale", r => GEN.pctMin(r, 80)),
                  V(k("Prima iniziativa", "caso d'uso o proposta nati da te", "≥1 entro M10", "trimestrale", r => ({ v: r > .45 ? "1" : "0", st: r > .45 ? "ok" : "warn", fr: r > .45 ? 1 : .2 })), k("Motivazione", "punteggio di autodeterminazione nel trivia, da T0", "in crescita da T0", "T1-T3", r => GEN.su(r)), A_M(10))] },
    "010": { erp:[k("Formazione nel tempo protetto", "% ore di formazione ERP svolte nelle ore dedicate", "100%", "mensile", r => GEN.pctMin(r, 100)),
                  V(k("Prova in coppia", "attività sul nuovo ERP con un utente chiave", "≥3 prima del go-live", "mensile", (r, c) => avanz(r, c.S, c.G - 1, 3, "")), AUTONOMIA_ERP, DOPO_GOLIVE)],
             non:[k("Formazione nel tempo protetto", "% ore di formazione AI svolte nelle ore dedicate", "100%", "mensile", r => GEN.pctMin(r, 100)),
                  V(k("Prova in coppia", "compiti AI svolti con un Champion", "≥2 entro M8", "trimestrale", r => avanz(r, 2, 7, 2, "")), k("Compiti AI in autonomia", "compiti svolti da solo nel mese", "≥1 al mese", "mensile", r => GEN.count(r, 1)), A_M(8))] },
    "001": { erp:[V(k("Prove guidate in sandbox", "prove completate", "≥5 prima del go-live", "mensile", (r, c) => avanz(r, c.S, c.G - 1, 5, "")), AUTONOMIA_ERP, DOPO_GOLIVE),
                  V(k("Affiancamento svolto", "ore con il collega di riferimento", "≥6 ore", "mensile", r => GEN.count(r, 6, " h")), k("Autoefficacia", "punteggio di autoefficacia nel trivia, da T0", "in crescita da T0", "T1-T3", r => GEN.su(r)), A_M(10))],
             non:[V(k("Primo compito guidato", "primo compito AI con verifica dell'output", "entro M6", "una tantum", r => GEN.fatto(r)), k("Compiti AI con verifica", "compiti con output controllato nel mese", "≥2 al mese", "mensile", r => GEN.count(r, 2)), A_M(6)),
                  V(k("Affiancamento svolto", "ore con il collega di riferimento", "≥6 ore", "mensile", r => GEN.count(r, 6, " h")), k("Fiducia nel controllare l'AI", "cursore S4 del trivia, da T0", "in crescita da T0", "T1-T3", r => GEN.su(r)), A_M(10))] },
    "100": { erp:[k("Critiche che cambiano il processo", "segnalazioni sul nuovo processo accolte", "≥1 a trimestre", "trimestrale", r => GEN.count(r, 1)),
                  V(k("Conoscenza trasferita", "SOP o casi limite del vecchio processo documentati", "≥2 entro il go-live", "trimestrale", (r, c) => avanz(r, c.S, c.G - 1, 2, "")), k("Strumenti paralleli abbandonati", "file o procedure tenuti fuori ERP", "0", "mensile", r => GEN.zero(r)), DOPO_GOLIVE)],
             non:[k("Critiche che cambiano il processo", "segnalazioni accolte", "≥1 a trimestre", "trimestrale", r => GEN.count(r, 1)),
                  k("Conoscenza trasferita", "SOP, casi limite o ore di mentoring", "≥2 a trimestre", "trimestrale", r => GEN.count(r, 2))] },
    "000": { erp:[V(k("Prova circoscritta", "prova assistita su un processo del nuovo ERP", "entro il go-live", "una tantum", r => GEN.fatto(r)), AUTONOMIA_ERP, DOPO_GOLIVE),
                  k("Impegni rispettati", "accordi presi con HR e mantenuti dall'azienda", "100%", "trimestrale", r => GEN.pctMin(r, 100))],
             non:[V(k("Prova circoscritta", "primo compito AI con aiuto", "entro M8", "una tantum", r => GEN.fatto(r)), k("Compiti AI con aiuto", "compiti svolti con un collega nel mese", "≥1 al mese", "mensile", r => GEN.count(r, 1)), A_M(8)),
                  k("Impegni rispettati", "accordi presi con HR e mantenuti dall'azienda", "100%", "trimestrale", r => GEN.pctMin(r, 100))] }
  };
  /* Sceglie la variante dello slot per il mese corrente; restituisce anche il prossimo cambio, se c'è. */
  function risolvi(slot, c){
    if (!slot.pre) return { kd: slot };
    const m = slot.cambio(c);
    return ORA >= m ? { kd: slot.post, da: m } : { kd: slot.pre, poi: slot.post, a: m };
  }
  /* I 3 KPI di una persona: 1) adozione, 2) KPI della persona, 3) KPI del ruolo (Champions) o della persona nel suo ruolo. */
  function treKpiFor(p, c, ruoloNome){
    const t = c.erp ? "erp" : "non", lista = KPI_PERS[p][t], nome = PERSONAS[p].nome, champ = PERSONAS[p].cat === "Champion";
    const ruolo = champ ? (c.erp ? "Utente chiave ERP" : "Champion delle automazioni") : null;
    const slot = [[ADOZIONE[t], "Adozione"], [lista[0], `Persona · ${nome}`],
      champ ? [RUOLO[t], `Ruolo · ${ruolo}`] : [lista[1], ruoloNome ? `Persona nel ruolo · ${ruoloNome}` : "Persona nel ruolo"]];
    return slot.map(([s, tag], i) => ({ ...risolvi(s, c), tag, chiave:`${p}-${t}-${i}` }));
  }
  function kpiCard(x, c){
    const v = x.kd.g(seme(`${x.chiave}-${x.kd.n}`), c);
    const nota = x.poi ? `Da M${x.a} diventa: <b>${esc(x.poi.n)}</b>` : x.da ? `Da M${x.da} · prima era un KPI di preparazione` : "Uguale per tutto il programma";
    return `<div class="kpi2 ${v.st}">
      <span class="k-src">${esc(x.tag)}</span>
      <div class="k-top"><b>${esc(x.kd.n)}</b>${statoChip(v.st)}</div>
      <div class="k-mid"><span class="k-val">${v.v}</span>${ring(v.fr, 34)}</div>
      <div class="k-m">${esc(x.kd.m)}</div>
      <div class="k-meta"><span>Soglia: <b>${esc(x.kd.s)}</b> · ${esc(x.kd.f)}</span><span class="k-next">${nota}</span></div>
    </div>`;
  }
  function kpiPersHTML(){
    const c = contesto(), tre = treKpiFor(scelta.codice, c, ruoloPersonale()[0]);
    const testa = `<div class="k-ctx"><span class="pill-s ${c.erp ? "erp" : ""}">${c.erp ? "Team ERP · " + esc(c.nome) : "Non ERP" + (c.nome ? " · " + esc(c.nome) : "")}</span>
      <span class="muted">Sempre 3 KPI, che cambiano con la fase. Li vedete solo tu e HR, che li usa per offrirti supporto: non servono a valutare la tua performance.</span></div>`;
    return testa + `<div class="kpi-grid three">${tre.map(x => kpiCard(x, c)).join("")}</div>`;
  }

  /* ---------- KPI delle persone in forma aggregata (vista della governance) ---------- */
  const RUOLI_GOV = ["Utente chiave ERP", "Champion delle automazioni", "Referente di funzione e sede", "Change & Risk Office", "ERP core team", "Process owner"];
  const aggSel = { p:"111", erp:true };
  const QUOTA_PERS = {};   // peso di ogni persona dentro la sua categoria (fisso per apertura)
  function personeNelGruppo(p, erp){
    const s = persone(), cat = PERSONAS[p].cat;
    const nCat = cat === "Champion" ? s.champ : cat === "Cinico" ? s.cinici : s.fence;
    const pari = CODICI.filter(x => PERSONAS[x].cat === cat);
    pari.forEach(x => { QUOTA_PERS[x] ??= .7 + Math.random() * .6; });
    const quota = QUOTA_PERS[p] / pari.reduce((t, x) => t + QUOTA_PERS[x], 0);
    /* Team ERP: il pilota ha la composizione della roadmap (18 Champions, 36 Fence sitters, 6 Cinici);
       ogni ondata aggiunge ~110 persone con le quote aziendali. */
    const ondateIniziate = Object.values(ONDATE).filter(m => ORA >= m).length;
    const pilota = ORA < 2 ? 0 : cat === "Champion" ? 18 : cat === "Cinico" ? 6 : 36;
    const erpCat = pilota + Math.round(ondateIniziate * 110 * nCat / s.trivia);
    return Math.round(quota * (erp ? erpCat : Math.max(0, nCat - erpCat)));
  }
  /* Contesto del gruppo ERP: il pilota fino a M10, poi l'ultima ondata partita. */
  const ctxAgg = erp => {
    if (!erp) return { erp:false };
    const S = Math.max(2, ...Object.values(ONDATE).filter(m => ORA >= m));
    return S === 2 ? { erp:true, S:2, G:7 } : { erp:true, S, G:S + 2 };
  };
  const quotaInSoglia = key => Math.round(52 + seme(key + "-quota") * 44);
  const statoQuota = q => q >= 75 ? "ok" : q >= 60 ? "warn" : "ko";
  const aggregatoGruppo = (p, erp) => {
    const qs = treKpiFor(p, ctxAgg(erp)).map(x => quotaInSoglia(`agg-${x.chiave}-${x.kd.n}`));
    return Math.round(qs.reduce((t, q) => t + q, 0) / qs.length);
  };
  let aggScelto = false;   // finché la persona non sceglie, si mostra il primo gruppo con almeno 10 persone
  function aggregatiHTML(){
    if (!aggScelto && personeNelGruppo(aggSel.p, aggSel.erp) < 10) {
      const primo = CODICI.flatMap(p => [[p, true], [p, false]]).find(([p, e]) => personeNelGruppo(p, e) >= 10);
      if (primo) [aggSel.p, aggSel.erp] = primo;
    }
    const tinta = p => `var(${PERSONAS[p].cat === "Champion" ? "--c-champ" : PERSONAS[p].cat === "Cinico" ? "--c-cinici" : "--c-fence"})`;
    const cella = (p, erp) => {
      const n = personeNelGruppo(p, erp), sel = aggSel.p === p && aggSel.erp === erp;
      const dentro = n < 10 ? `<span class="muted">${n ? "&lt; 10 persone" : "—"}</span>` : (q => `${ring(q / 100, 22)}${q}%`)(aggregatoGruppo(p, erp));
      return `<td class="n ringcell agg-cell${sel ? " sel" : ""}" data-p="${p}" data-erp="${erp ? 1 : 0}" tabindex="0" role="button" aria-pressed="${sel}">${dentro}</td>`;
    };
    const righe = CODICI.map(p => `<tr><td><i class="dotc" style="background:${tinta(p)}"></i>${esc(PERSONAS[p].nome)}</td>${cella(p, true)}${cella(p, false)}</tr>`).join("");

    /* Dettaglio del gruppo scelto: gli stessi 3 KPI della vista personale, aggregati. */
    const p = aggSel.p, erp = aggSel.erp, c = ctxAgg(erp), n = personeNelGruppo(p, erp);
    const titolo = `${esc(PERSONAS[p].nome)} · ${erp ? "team ERP" : "non ERP"}`;
    let dettaglio;
    if (n < 10) {
      dettaglio = `<p class="ph-text">Il gruppo ha ${n} persone: sotto la soglia minima di 10, i dati non si mostrano per proteggere l'anonimato.</p>`;
    } else {
      dettaglio = `<div class="kpi-grid">${treKpiFor(p, c).map(x => {
        const key = `agg-${x.chiave}-${x.kd.n}`, q = quotaInSoglia(key), st = statoQuota(q);
        /* valore mediano coerente con lo stato del gruppo */
        let med = null;
        for (let t = 0; t < 30; t++) { med = x.kd.g(seme(`${key}-med-${t}`), c); if ((med.st === "ok") === (st === "ok")) break; }
        return `<div class="kpi2 ${st}"><span class="k-src">${esc(x.tag)}</span>
          <div class="k-top"><b>${esc(x.kd.n)}</b>${statoChip(st)}</div>
          <div class="k-mid"><span class="k-val">${q}%</span>${ring(q / 100, 34)}</div>
          <div class="k-m">delle persone in soglia · valore mediano <b>${med.v}</b></div>
          <div class="k-meta"><span>Soglia individuale: <b>${esc(x.kd.s)}</b> · ${esc(x.kd.f)}</span>${x.poi ? `<span class="k-next">Da M${x.a} diventa: <b>${esc(x.poi.n)}</b></span>` : ""}</div></div>`;
      }).join("")}</div>`;
    }
    const ruoli = RUOLI_GOV.map(r => {
      const q = Math.round(55 + seme("agg-ruolo-" + r + faseKpi().id) * 40);
      return `<tr><td>${esc(r)}</td><td class="n ringcell">${ring(q / 100, 22)}${q}%</td></tr>`;
    }).join("");
    return `<div class="agg-wrap">
        <div><h3 class="sub">Per persona · % di persone in soglia sui loro 3 KPI</h3>
          <table class="agg-tab"><thead><tr><th>Persona</th><th class="n">Team ERP</th><th class="n">Non ERP</th></tr></thead><tbody>${righe}</tbody></table>
          <p class="note-s">Clicca una cella per vedere i 3 KPI di quel gruppo.</p></div>
        <div class="agg-det"><h3 class="sub">Dettaglio · ${titolo} <span class="muted">· ${n} persone</span></h3>${dettaglio}</div>
      </div>
      <h3 class="sub" style="margin-top:20px">Per ruolo nel cambiamento · % in soglia</h3>
      <table><thead><tr><th>Ruolo</th><th class="n">In soglia</th></tr></thead><tbody>${ruoli}</tbody></table>
      <p class="note-s">Solo gruppi con almeno 10 persone. Se un gruppo resta sotto soglia, la causa si cerca prima nel contesto (formazione, carico, strumenti), non nelle persone.</p>`;
  }

  /* Mese corrente dello scenario, scelto dal selettore "Fase attuale" (ricordato nel browser). */
  /* All'apertura si parte sempre da metà pilota (M8), così tutti i valori simulati sono visibili; la rotaia porta indietro o avanti. */
  let ORA = 8;
  const rango = q => { const n = q.match(/\d+/g).map(Number); return q.endsWith("+") ? [n[0], MESI] : [n[0], n[n.length - 1]]; };
  const stato = (da, a) => ORA > a ? "fatto" : ORA >= da ? "corso" : "todo";
  const faseDi = m => m === 1 ? "Avvio" : m <= 10 ? "Pilota ERP" : m <= 22 ? "Estensione all'azienda" : "Chiusura";
  function passiHTML(lista){
    return lista.map(t => {
      const [da, a] = rango(t.quando), s = stato(da, a);
      return `<li class="${t.gate ? "gate " : ""}${s}"><span class="pt"></span>
        <div class="when">${t.quando}${s === "corso" ? ' <span class="now-chip">in corso</span>' : ""}</div><div class="what">${esc(t.cosa)}</div>${t.gate ? `<div class="g">◆ ${esc(t.gate)}</div>` : ""}</li>`;
    }).join("");
  }
  function tagStato(da, a){
    const s = stato(da, a);
    return s === "fatto" ? ["Concluso", "done"] : s === "corso" ? [`In corso · M${ORA}`, "run"] : ["Da iniziare", ""];
  }
  /* Decisioni go/no-go e della governance, per la pillola "Prossima decisione". */
  const DECISIONI = [
    { m:3,  cosa:"semaforo delle automazioni" },
    { m:6,  cosa:"go/no-go go-live del pilota" },
    { m:10, cosa:"go/no-go estensione e tranche 2" },
    { m:13, cosa:"go/no-go go-live ondata 1" },
    { m:15, cosa:"go/no-go go-live ondata 2" },
    { m:18, cosa:"go/no-go go-live ondata 3" },
    { m:20, cosa:"go/no-go go-live ondata 4" }
  ];
  function aggiorna(){
    document.querySelectorAll(".faseSel").forEach(s => { s.value = String(ORA); s.style.setProperty("--p", `${(ORA - 1) / (MESI - 1) * 100}%`); s.setAttribute("aria-valuetext", `${faseDi(ORA)}, mese ${ORA}`); });
    document.querySelectorAll(".faseTxt").forEach(e => { e.textContent = `${faseDi(ORA)} · M${ORA}`; });
    document.querySelectorAll(".oggi").forEach(e => { e.textContent = `Oggi (M${ORA})`; });
    $("roadmapP").innerHTML = roadmapHTML();
    $("roadmapG").innerHTML = roadmapHTML();
    $("pilota").innerHTML = passiHTML(PILOTA);
    $("pilotaP").innerHTML = passiHTML(PILOTA);
    $("autoP").innerHTML = automazioniHTML(true);
    $("autoG").innerHTML = automazioniHTML(false);
    $("kpiG").innerHTML = kpiGovHTML();
    $("aggG").innerHTML = aggregatiHTML();
    $("partG").innerHTML = partecipazioneHTML();
    $("ascoltoG").innerHTML = ascoltoHTML();
    document.querySelectorAll(".autoFunz").forEach(e => e.textContent = scelta.funzione);
    for (const [cls, da, a] of [["tagPilota", 2, 10], ["tagAuto", 2, 22]]) {
      const [testo, c] = tagStato(da, a);
      document.querySelectorAll("." + cls).forEach(e => { e.textContent = testo; e.className = `tag ${cls} ${c}`; });
    }
    const prossima = DECISIONI.find(d => d.m >= ORA);
    $("prossima").textContent = prossima ? `Prossima decisione: M${prossima.m} · ${prossima.cosa}` : "Nessuna decisione go/no-go in programma";
    aggiornaPersonale();
  }

  /* Profilo: dall'URL (dashboard.html?profilo=111, dal trivia) oppure dal menu; linea e funzione dal menu. */
  const qs = new URLSearchParams(location.search);
  const daTrivia = CODICI.includes(qs.get("profilo"));
  const scelta = { codice: daTrivia ? qs.get("profilo") : "111", linea: LINEA_PILOTA, funzione: FUNZIONI[0] };
  try {
    const salvata = JSON.parse(localStorage.getItem("nexacore.scelta") || "{}");
    if (!daTrivia && CODICI.includes(salvata.codice)) scelta.codice = salvata.codice;
    // la linea non si recupera: all'apertura si parte sempre dalla linea pilota (Servizi Finanziari – Pilota ERP)
    if (FUNZIONI.includes(salvata.funzione)) scelta.funzione = salvata.funzione;
  } catch (e) {}

  const iniziali = nome => nome.split(" ").filter(p => p.length > 3).slice(0, 2).map(p => p[0]).join("").toUpperCase();
  function mostraProfilo(){
    const p = PERSONAS[scelta.codice];
    const dove = scelta.linea.startsWith("Nessuna") ? scelta.funzione : `${scelta.funzione} · linea ${scelta.linea}`;
    $("pNome").textContent = p.nome;
    $("pIni").textContent = iniziali(p.nome);
    $("pFrase").textContent = `«${p.frase}»`;
    $("pDove").textContent = dove;
    $("rDove").textContent = dove;
    const nelPilota = scelta.linea === LINEA_PILOTA;
    $("p-pilota").hidden = !nelPilota;
    $("p-automazioni").hidden = !(PERSONAS[scelta.codice].cat === "Champion" && !nelPilota);
    document.querySelectorAll(".autoFunz").forEach(e => e.textContent = scelta.funzione);
    if (vistaCorrente === "personale") menuSezioni("personale");
    $("pAssi").innerHTML = ASSI.map((a, i) => {
      const alto = scelta.codice[i] === "1";
      return `<div class="chip${alto ? " hi" : ""}">${esc(a.nome)}<b>${alto ? a.alto : a.basso}</b></div>`;
    }).join("");
    try { localStorage.setItem("nexacore.scelta", JSON.stringify(scelta)); } catch (e) {}
    if ($("autoP").innerHTML) aggiornaPersonale();
  }
  const opzioni = (id, voci, valore, etichetta = v => v) => {
    $(id).innerHTML = voci.map(v => `<option value="${esc(v)}">${esc(etichetta(v))}</option>`).join("");
    $(id).value = valore;
  };
  /* Menu delle personas raggruppato per categoria: "Pioniere – Champion". */
  $("selProfilo").innerHTML = [["Champion","Champions"],["Fence sitter","Fence sitters"],["Cinico","Cinici"]].map(([c, g]) =>
    `<optgroup label="${g}">${CODICI.filter(k => PERSONAS[k].cat === c).map(k => `<option value="${k}">${esc(PERSONAS[k].nome)} – ${c}</option>`).join("")}</optgroup>`).join("");
  $("selProfilo").value = scelta.codice;
  opzioni("selLinea", LINEE, scelta.linea);
  opzioni("selFunzione", FUNZIONI, scelta.funzione);
  $("selProfilo").onchange = e => { scelta.codice = e.target.value; mostraProfilo(); };
  $("selLinea").onchange = e => { scelta.linea = e.target.value; mostraProfilo(); };
  $("selFunzione").onchange = e => { scelta.funzione = e.target.value; mostraProfilo(); };

  $("ritrovi").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    $("ritrovi").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  });
  document.querySelectorAll("[data-invia]").forEach(b => b.onclick = () => {
    const ok = $(b.dataset.invia);
    ok.textContent = b.dataset.invia === "ritroviOk" && $("colloquio").checked
      ? "Grazie. Hai chiesto un colloquio: HR ti contatterà. (Demo: non viene salvato nulla.)"
      : "Grazie. Demo: non viene salvato nulla.";
    ok.hidden = false;
  });

  /* Tema chiaro o scuro, ricordato nel browser. */
  const SOLE = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
  const LUNA = '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>';
  function tema(t){
    const scuro = t === "dark";
    document.documentElement.dataset.theme = scuro ? "dark" : "light";
    $("themeBtn").setAttribute("aria-pressed", String(scuro));
    $("themeIc").innerHTML = scuro ? SOLE : LUNA;
    $("themeTxt").textContent = scuro ? "Tema chiaro" : "Tema scuro";
    try { localStorage.setItem("nexacore.tema", scuro ? "dark" : "light"); } catch (e) {}
  }
  $("themeBtn").onclick = () => tema(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  { let t = "light"; try { t = localStorage.getItem("nexacore.tema") || "light"; } catch (e) {} tema(t); }

  /* Tendina (telefono e tablet). */
  const tendina = aperta => {
    document.body.classList.toggle("drawer", aperta);
    $("menuBtn").setAttribute("aria-expanded", String(aperta));
  };
  $("menuBtn").onclick = () => tendina(!document.body.classList.contains("drawer"));
  $("scrim").onclick = () => tendina(false);
  document.addEventListener("keydown", e => { if (e.key === "Escape") tendina(false); });

  /* Vista e menu delle sezioni, con evidenza della sezione visibile. */
  /* Mentre si scorre: evidenzia l'ultima sezione il cui inizio ha superato il 30% della finestra.
     Sezioni affiancate (stessa altezza) contano come una sola: vince la prima.
     Dopo un clic la voce scelta resta evidenziata finché lo scorrimento non termina. */
  let sezioni = [], bloccoClic = 0;
  let vistaCorrente = "";
  const accendi = id => $("menu").querySelectorAll("a").forEach(a => {
    const on = a.dataset.id === id;
    a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
  });
  function evidenzia(){
    if (bloccoClic || !sezioni.length) return;
    const soglia = innerHeight * .3;
    let attiva = sezioni[0], topPrec = -Infinity;
    sezioni.forEach(s => {
      const top = s.getBoundingClientRect().top;
      if (top <= soglia && top > topPrec + 4) { attiva = s; topPrec = top; }
    });
    accendi(attiva.id);
  }
  addEventListener("scroll", () => requestAnimationFrame(evidenzia), { passive:true });
  function vaiA(id){
    const el = $(id); if (!el) return;
    accendi(id);
    clearTimeout(bloccoClic);
    bloccoClic = setTimeout(() => { bloccoClic = 0; }, 1200);   // copre lo scorrimento animato
    el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start" });
    history.replaceState(null, "", "#" + id);
  }
  addEventListener("wheel", () => { if (bloccoClic) { clearTimeout(bloccoClic); bloccoClic = 0; } }, { passive:true });
  addEventListener("touchmove", () => { if (bloccoClic) { clearTimeout(bloccoClic); bloccoClic = 0; } }, { passive:true });
  /* Menu delle sezioni: solo quelle visibili (il pilota compare nella vista personale solo per la linea pilota). */
  function menuSezioni(nome){
    const voci = MENU[nome].filter(([id]) => !$(id).hidden);
    $("menu").innerHTML = voci.map(([id, testo, ic], i) =>
      `<a href="#${id}" data-id="${id}" class="${i === 0 ? "on" : ""}"><svg viewBox="0 0 24 24">${IC[ic]}</svg>${testo}</a>`).join("");
    sezioni = voci.map(([id]) => $(id));
    evidenzia();
  }
  function vista(nome){
    vistaCorrente = nome;
    document.querySelectorAll(".seg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.vista === nome)));
    $("vista-personale").hidden = nome !== "personale";
    $("vista-governance").hidden = nome !== "governance";
    menuSezioni(nome);
    try { localStorage.setItem("nexacore.vista", nome); } catch (e) {}
  }
  document.querySelectorAll(".seg button").forEach(b => b.onclick = () => { vista(b.dataset.vista); window.scrollTo(0, 0); });
  $("menu").addEventListener("click", e => {
    const a = e.target.closest("a"); if (!a) return;
    e.preventDefault();
    tendina(false);
    vaiA(a.dataset.id);
  });

  const scegliGruppo = e => { const td = e.target.closest(".agg-cell"); if (!td) return; aggSel.p = td.dataset.p; aggSel.erp = td.dataset.erp === "1"; aggScelto = true; $("aggG").innerHTML = aggregatiHTML(); };
  $("aggG").addEventListener("click", scegliGruppo);
  $("aggG").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); scegliGruppo(e); } });
  $("kpiG").addEventListener("toggle", e => { const d = e.target; if (d.matches?.("details[data-area]")) d.open ? aperte.add(d.dataset.area) : aperte.delete(d.dataset.area); }, true);
  /* Rotaia del mese (M1-M24): il pallino si trascina, si clicca o si sposta con le frecce. */
  document.querySelectorAll(".faseSel").forEach(s => {
    s.oninput = s.onchange = e => {
      const m = parseInt(e.target.value, 10);
      if (m === ORA) return;
      ORA = m;
      /* rotaie allineate tra le due viste, poi il resto della pagina */
      document.querySelectorAll(".faseSel").forEach(x => { if (x !== s) x.value = String(m); x.style.setProperty("--p", `${(m - 1) / (MESI - 1) * 100}%`); });
      document.querySelectorAll(".faseTxt").forEach(t => { t.textContent = `${faseDi(m)} · M${m}`; });
      aggiorna();
    };
  });
  mostraProfilo();
  document.body.classList.add("anim");
  aggiorna();
  setTimeout(() => document.body.classList.remove("anim"), 1300);   // gli anelli si riempiono solo all'apertura

  let iniziale = "personale";
  if (location.hash.startsWith("#g-") || location.hash === "#governance") iniziale = "governance";
  else if (!daTrivia) { try { if (localStorage.getItem("nexacore.vista") === "governance") iniziale = "governance"; } catch (e) {} }
  vista(iniziale);
  if (/^#[pg]-/.test(location.hash) && $(location.hash.slice(1))) vaiA(location.hash.slice(1));

  /* Collegamento con il trivia nella stessa pagina (js/sito.js). */
  window.NexaDash = {
    /* Alla fine del trivia: profilo della persona, vista personale, anelli animati. */
    apri(codice){
      if (CODICI.includes(codice)) { scelta.codice = codice; $("selProfilo").value = codice; mostraProfilo(); }
      tendina(false);
      vista("personale");
      document.body.classList.add("anim");
      aggiorna();
      setTimeout(() => document.body.classList.remove("anim"), 1300);
    },
    /* Ogni volta che la dashboard torna visibile: ricalcola la sezione evidenziata nel menu. */
    mostrata(){ menuSezioni(vistaCorrente); }
  };
  $("toTrivia").onclick = () => tendina(false);
})();
