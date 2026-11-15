/* =====================================================================
   SITO: trivia e dashboard nella stessa pagina (index.html).
   Si carica nella <head>, prima del resto, così la vista giusta è già
   decisa al primo disegno della pagina (niente lampi).

   Ogni vista ha il suo foglio di stile; quello della vista nascosta resta
   spento (media="not all"). Così le classi con lo stesso nome nei due
   fogli (.card, .btn, .pill, .steps...) non si scontrano.

   Indirizzi:
     index.html                    trivia
     index.html#metodo             trivia, pagina "Come funziona"
     index.html#dashboard          dashboard
     index.html#governance         dashboard, vista governance
     index.html#p-... / #g-...     dashboard, una sezione precisa
     index.html?profilo=111        dashboard con quel profilo (vecchi link)
   ===================================================================== */
(() => {
  "use strict";
  const TITOLI = { trivia:"Trivia NexaCore", dashboard:"Dashboard NexaCore" };
  const eDashboard = h => h === "#dashboard" || h === "#governance" || /^#[pg]-/.test(h);
  /* Se c'è un #, decide il #; altrimenti conta ?profilo= dei vecchi link alla dashboard. */
  const daIndirizzo = () => {
    if (location.hash && location.hash !== "#") return eDashboard(location.hash) ? "dashboard" : "trivia";
    return /^[01]{3}$/.test(new URLSearchParams(location.search).get("profilo") || "") ? "dashboard" : "trivia";
  };

  let attuale = "";
  function applica(v){
    if (v === attuale) return;
    attuale = v;
    document.documentElement.dataset.vista = v;
    document.title = TITOLI[v];
    const css = id => document.getElementById(id);
    if (css("css-trivia")) css("css-trivia").media = v === "trivia" ? "all" : "not all";
    if (css("css-dashboard")) css("css-dashboard").media = v === "dashboard" ? "all" : "not all";
  }

  /* Cambio di vista dopo un cambio d'indirizzo (clic su un link, tasto Indietro). */
  function segui(){
    const v = daIndirizzo(), prima = attuale;
    applica(v);
    if (v === prima) return;
    window.scrollTo(0, 0);
    if (v === "dashboard") window.NexaDash?.mostrata();
    /* "#trivia" è solo il link di ritorno: si toglie dall'indirizzo, poi il trivia riprende da dove era (js/trivia.js) */
    else if (location.hash === "#trivia") history.replaceState(null, "", location.pathname);
  }

  window.NexaSito = {
    vista: () => attuale,
    /* Fine del trivia: passa il profilo (codice a 3 cifre) alla dashboard e la mostra. */
    apriDashboard(codice){
      window.NexaDash?.apri(codice);
      if (location.hash === "#dashboard") return segui();
      location.hash = "dashboard";   // lascia una voce nella cronologia: Indietro torna al risultato del trivia
    }
  };

  applica(daIndirizzo());
  /* Registrato prima di quello del trivia: quando il trivia riceve l'evento, la vista è già aggiornata. */
  addEventListener("hashchange", segui);
})();
