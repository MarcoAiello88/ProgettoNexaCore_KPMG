/* =====================================================================
   DATI (in futuro: personas.json, questions.json). Il motore sotto non
   dipende dai contenuti: cambiare personas o domande = cambiare qui.
   ===================================================================== */
const CONFIG = {
  soglia: 0.5,          // sopra = polo "alto" di ciascuna dimensione
  margine: 0.1          // entro ±margine dalla soglia = profilo "vicino alla soglia"
};

const CATEGORIE = {
  sfida:    { nome:"Sfida",    domanda:"Ce la faccio?",         etichetta:"Fiducia nei nuovi strumenti",  alto:"alta", basso:"bassa",
              teoria:"Autoefficacia (Bandura)", cosa:"Quanto la persona si sente capace di usare i nuovi strumenti e di cavarsela da sola." },
  autonomia:{ nome:"Motore",   domanda:"Perché lo faccio?",     etichetta:"Motivazione autonoma",          alto:"autonoma",  basso:"controllata",
              teoria:"Autodeterminazione (Deci e Ryan)", cosa:"Se la persona si impegna nel cambiamento perché ci crede o lo trova interessante (motivazione autonoma), oppure per premi, approvazione, senso di colpa o paura delle conseguenze (motivazione controllata), o se non ne vede il senso (amotivazione)." },
  bilancia: { nome:"Bilancia", domanda:"È giusto?",             etichetta:"Equilibrio tra dare e avere",  alto:"alta", basso:"bassa",
              teoria:"Equità (Adams)", cosa:"Se la persona sente equilibrato il rapporto tra ciò che dà e ciò che riceve, confrontandosi con un referente." }
};

const CAPITOLI = [
  { titolo:"L'annuncio", testo:"Lunedì, ore 9. Il CEO annuncia in streaming a tutte le sei sedi: in diciotto mesi arrivano il nuovo ERP in cloud, l'automazione dei processi e un assistente di intelligenza artificiale per tutti.", nexi:"Che notizia! Vediamo come la prendi." },
  { titolo:"La formazione", testo:"Tre settimane dopo partono i corsi. Aule piene, call con le altre sedi, chat di reparto che si accendono.", nexi:"Si torna a scuola! Mi sono messo elegante apposta." },
  { titolo:"Il go-live", testo:"Il nuovo ERP è acceso. I vecchi strumenti sono spenti. Il primo giorno è un po' caotico per tutti.", nexi:"Respira. Anche i sistemi nuovi hanno il loro primo giorno." },
  { titolo:"Il copilota AI", testo:"Arriva l'assistente AI: scrive bozze, riassume documenti, prepara report. Cambia il modo di lavorare di tutti.", nexi:"Un collega nuovo che non dorme mai. Un po' come me." }
];

/* Opzioni: v da 0 a 3 (3 = polo "alto" della dimensione). L'ordine a schermo viene mescolato. */
const DOMANDE = [
  // --- Capitolo 1
  { id:"S1", cap:0, cat:"sfida", tipo:"cursore",
    scena:"Il nuovo ERP sostituirà gli strumenti che usi ogni giorno.",
    testo:"Quanto sei sicuro/a di riuscire a fare bene il tuo lavoro con il nuovo sistema entro un mese?",
    estremi:["Per niente","Del tutto"], fonte:"Formato 0–100 «quanto sei sicuro di riuscire a…» (Bandura, 2006)" },
  { id:"A1", cap:0, cat:"autonomia",
    scena:"Il CEO chiede a ogni reparto di proporre come usare il nuovo ERP nel proprio lavoro. Chi vuole può partecipare ai gruppi di proposta.",
    testo:"Se ti impegni, perché lo fai soprattutto?",
    opzioni:[
      { t:"Perché mi incuriosisce: provare un modo nuovo di lavorare mi piace", v:3, forma:"intrinseca" },
      { t:"Perché credo che sia importante per il lavoro del mio reparto", v:2, forma:"identificata" },
      { t:"Perché chi si impegna verrà premiato, e chi no rischia di restare indietro", v:1, forma:"esterna (materiale)" },
      { t:"Mi impegno poco: non credo che ne valga la pena", v:0, forma:"amotivazione" } ],
    fonte:"Multidimensional Work Motivation Scale (Gagné e altri, 2015): «perché mi piace fare questo lavoro», «perché credo che sia importante farli», ricompensa e rischio di perdere l'impiego, «non credo che questo lavoro ne valga la pena»." },
  { id:"Q1", cap:0, cat:"bilancia",
    scena:"Il cambiamento ti chiederà ore di formazione e qualche mese di doppio lavoro. In cambio l'azienda promette nuove competenze e meno attività ripetitive.",
    testo:"Per te il conto torna?",
    opzioni:[
      { t:"Più o meno pari: do e ricevo in modo equilibrato", v:3 },
      { t:"Sì, anzi ci guadagno più di quanto metto", v:2 },
      { t:"Metto più di quanto riceverò", v:1 },
      { t:"Decisamente no: il conto lo pago io", v:0 } ],
    fonte:"Rapporto tra input e output (Adams, 1965); giustizia distributiva (Colquitt, 2001). Anche «ci guadagno di più» è uno squilibrio, quindi vale meno del pari." },
  // --- Capitolo 2
  { id:"S2", cap:1, cat:"sfida",
    scena:"Primo giorno di corso: il formatore va veloce e al terzo passaggio ti perdi.",
    testo:"Cosa pensi in quel momento?",
    opzioni:[
      { t:"Con un po' di pratica ci arrivo da solo/a", v:3 },
      { t:"Ce la farò, se qualcuno me lo rispiega con calma", v:2 },
      { t:"Temo di restare indietro rispetto agli altri", v:1 },
      { t:"Non è roba per me", v:0 } ],
    fonte:"Computer Self-Efficacy (Compeau e Higgins, 1995); General Self-Efficacy (Schwarzer e Jerusalem, 1995)" },
  { id:"A2", cap:1, cat:"autonomia",
    scena:"Il corso sul nuovo ERP finisce alle 17. Restano degli esercizi facoltativi sui casi reali del tuo reparto.",
    testo:"Se li fai, qual è il motivo principale?",
    opzioni:[
      { t:"Perché quello che sto imparando è interessante", v:3, forma:"intrinseca" },
      { t:"Perché mi servirà davvero per fare bene il mio lavoro", v:2, forma:"identificata" },
      { t:"Per non fare brutta figura con il responsabile e i colleghi", v:1, forma:"esterna (sociale)" },
      { t:"Non li faccio: tanto non dipende da me se il sistema funzionerà", v:0, forma:"amotivazione" } ],
    fonte:"MWMS (Gagné e altri, 2015): «il lavoro che faccio è interessante», «ha un significato personale per me», «per evitare le critiche di altri»; orientamento impersonale della GCOS (Deci e Ryan, 1985): gli esiti non dipendono da me." },
  { id:"Q2", cap:1, cat:"bilancia", segue:"R1",
    scena:"Un collega di un altro reparto ha fatto la formazione sull'AI un mese prima di te, e ora gli affidano i progetti nuovi.",
    testo:"Come reagisci?",
    opzioni:[
      { t:"Ha senso: il suo reparto partiva per primo", v:3 },
      { t:"Un po' mi dispiace, ma arriverà il mio turno", v:2 },
      { t:"Mi sembra un trattamento di favore", v:1 },
      { t:"Al solito: le cose belle vanno sempre agli stessi", v:0 } ],
    fonte:"Confronto con un referente (Adams, 1965); giustizia distributiva (Colquitt, 2001)" },
  { id:"R1", cap:1, cat:"bilancia", tipo:"referente", extra:true,
    testo:"E in generale, quando ti chiedi se il cambiamento è giusto, con chi ti confronti di più?",
    opzioni:[
      { t:"Con i colleghi del mio reparto", v:"i colleghi del tuo reparto" },
      { t:"Con chi lavora in altri reparti o sedi", v:"chi lavora in altri reparti o sedi" },
      { t:"Con i colleghi più giovani o appena arrivati", v:"i colleghi più giovani o appena arrivati" },
      { t:"Con me stesso/a, com'era prima", v:"te stesso/a prima del cambiamento" } ],
    fonte:"Scelta del referente (Adams, 1965). Non entra nel punteggio: serve all'azienda per capire con chi si confrontano le persone." },
  // --- Capitolo 3
  { id:"S3", cap:2, cat:"sfida",
    scena:"Un ordine resta bloccato con un errore mai visto. L'help desk non risponde.",
    testo:"Cosa fai?",
    opzioni:[
      { t:"Provo un paio di strade: di solito trovo la soluzione", v:3 },
      { t:"Cerco nella guida: con le istruzioni giuste ce la faccio", v:2 },
      { t:"Lo lascio lì e aspetto qualcuno che sappia", v:1 },
      { t:"Mi blocco: ho paura di peggiorare le cose", v:0 } ],
    fonte:"Occupational Self-Efficacy Scale, forma breve (Rigotti, Schyns e Mohr, 2008); Compeau e Higgins (1995)" },
  { id:"A3", cap:2, cat:"autonomia",
    scena:"Al go-live il nuovo ERP chiede passaggi diversi da quelli che fai da anni.",
    testo:"Che cosa ti spinge a seguirli con cura?",
    opzioni:[
      { t:"Scoprire come funziona il nuovo sistema mi stimola", v:3, forma:"intrinseca" },
      { t:"Ho capito a cosa servono quei passaggi e li ritengo giusti", v:2, forma:"identificata" },
      { t:"Altrimenti mi vergognerei di sbagliare davanti agli altri", v:1, forma:"introiettata" },
      { t:"Li seguo il meno possibile: non so nemmeno perché abbiano cambiato tutto", v:0, forma:"amotivazione" } ],
    fonte:"MWMS (Gagné e altri, 2015): «quello che faccio è stimolante», «soddisfa i miei valori personali», «diversamente avrei vergogna di me», «non so nemmeno perché faccio questo lavoro»." },
  { id:"Q3", cap:2, cat:"bilancia",
    scena:"Durante il go-live ti accorgi che un collega con il tuo stesso ruolo lavora molto meno di te, ma riceve lo stesso premio.",
    testo:"Cosa pensi?",
    opzioni:[
      { t:"Ognuno ha i suoi momenti: nel complesso è equilibrato", v:3 },
      { t:"Mi dà fastidio, ma è un caso isolato", v:2 },
      { t:"Non è giusto: chi si impegna di più non viene distinto", v:1 },
      { t:"Allora tanto vale impegnarsi meno anche io", v:0 } ],
    fonte:"Ricompensa rispetto all'impegno (Colquitt, 2001); riduzione degli input (Adams, 1965)" },
  // --- Capitolo 4
  { id:"S4", cap:3, cat:"sfida", tipo:"cursore",
    scena:"Il copilota AI ti propone una risposta per un cliente.",
    testo:"Quanto sei sicuro/a di accorgerti se la risposta contiene un errore?",
    estremi:["Per niente","Del tutto"], fonte:"Formato 0–100 (Bandura, 2006), applicato al controllo dell'AI" },
  { id:"A4", cap:3, cat:"autonomia",
    scena:"Il copilota fa al posto tuo le attività ripetitive. Puoi usare il tempo liberato per migliorare un processo del tuo reparto.",
    testo:"Se lo fai, perché?",
    opzioni:[
      { t:"Perché migliorare le cose mi diverte", v:3, forma:"intrinseca" },
      { t:"Perché migliorare quel processo ha un significato per me e per il reparto", v:2, forma:"identificata" },
      { t:"Perché così mi faccio notare e rispettare di più dal responsabile", v:1, forma:"esterna (sociale)" },
      { t:"Non lo farei: ho l'impressione che sarebbe tempo perso", v:0, forma:"amotivazione" } ],
    fonte:"MWMS (Gagné e altri, 2015): «mi piace fare questo lavoro», «ha un significato personale per me», «per farmi rispettare di più dagli altri», «ho l'impressione di perdere il mio tempo»." },
  { id:"Q4", cap:3, cat:"bilancia",
    scena:"Il copilota scrive in cinque minuti un report che a te costava un giorno. In riunione si lodano «i tempi record del team digitale».",
    testo:"Come ti senti?",
    opzioni:[
      { t:"Bene: il risultato è di tutti, anche mio", v:3 },
      { t:"Mi va bene, purché si riconosca chi ha controllato i dati", v:2 },
      { t:"La mia esperienza adesso sembra valere meno", v:1 },
      { t:"Anni di lavoro azzerati da un clic: non è giusto", v:0 } ],
    fonte:"Valore riconosciuto degli input (Adams, 1965; Colquitt, 2001)" }
];

/* Chiave = Sfida (1 alta / 0 bassa) + Motore (1 motivazione autonoma / 0 controllata o amotivazione) + Bilancia (1 alta / 0 bassa).
   Nomi decisi dal gruppo il 15/11. */
const PERSONAS = {
  "111": { nome:"Pioniere", frase:"Ce la faccio, ci credo davvero ed è giusto così.",
           percorso:["Un ruolo attivo nella tua ondata di rilascio","Formazione sull'uso corretto e sul controllo dell'AI","Obiettivi sulla qualità, non solo sulla velocità"],
           rischio:"Fiducia eccessiva nell'AI. Se troppo esposto, diventa il referente che fa sentire svalutati gli altri.", timori:["AI non governata","Rischi cyber"] },
  "110": { nome:"Talento in bilico", frase:"Ce la faccio e ci credo, ma il conto non torna.",
           percorso:["Colloquio su riconoscimento e prospettive","Un ruolo visibile nella transizione, con criteri trasparenti","Chiarezza su chi riceve cosa, e perché"],
           rischio:"Uscita verso altre aziende e perdita di competenze chiave.", timori:["Perdita di conoscenze","Resistenza al cambiamento"] },
  "101": { nome:"Esecutore in cerca di senso", frase:"So farlo ed è giusto, ma mi muovo soprattutto se mi viene chiesto o se c'è qualcosa in gioco.",
           percorso:["Entra nel gruppo di lavoro del tuo reparto","Compiti con un risultato chiaro e un riscontro visibile","Un'occasione di crescita sui nuovi strumenti"],
           rischio:"Adozione solo formale: usa il sistema ma non segnala problemi e non propone miglioramenti.", timori:["Errori nella transizione","Resistenza al cambiamento"] },
  "100": { nome:"Esperto in cerca di garanzie", frase:"So farlo, ma lo faccio perché devo e il conto non torna.",
           percorso:["Ruolo di collegamento tra il tuo reparto e la task force","Trasferimento della tua esperienza, valutato da chi impara","Responsabilità del tuo processo nel nuovo sistema"],
           rischio:"Scorciatoie e AI non autorizzata, perdita di conoscenze chiave, uscite.", timori:["AI non governata","Rischi cyber","Perdita di conoscenze"] },
  "011": { nome:"Volenteroso in crescita", frase:"Ci credo ed è giusto, ma non so se ce la faccio.",
           percorso:["Un collega di riferimento per le prime settimane","Errori segnalabili senza colpa","Pratica guidata con riscontri frequenti"],
           rischio:"Errori nella transizione, a volte nascosti per paura.", timori:["Errori nella transizione"] },
  "010": { nome:"Contributore da sostenere", frase:"Ci credo, ma non mi sento pronto/a e il conto non torna.",
           percorso:["Un incontro di ascolto con il tuo team","Formazione insieme al tuo gruppo","Trasparenza su chi viene formato prima e perché"],
           rischio:"Resistenza di gruppo e vecchi strumenti usati in parallelo (fogli Excel, procedure ombra).", timori:["Resistenza al cambiamento","Errori nella transizione","Rischi cyber"] },
  "001": { nome:"Esploratore prudente", frase:"È giusto, ma non mi sento pronto/a: faccio quello che mi viene chiesto.",
           percorso:["Informazioni chiare sul futuro del tuo ruolo","Piccoli obiettivi raggiungibili","Affiancamento durante il go-live"],
           rischio:"Ansia, errori e chiusura.", timori:["Errori nella transizione","Resistenza al cambiamento"] },
  "000": { nome:"Professionista in cerca di stabilità", frase:"Non ne vedo il senso, non è giusto e tanto non ce la farò.",
           percorso:["Prima di tutto, essere ascoltato/a","Obiettivi piccoli e raggiungibili","Momenti in cui si celebrano i piccoli successi"],
           rischio:"Resistenza passiva: fa il minimo e svaluta il sistema con i colleghi.", timori:["Resistenza al cambiamento","Errori nella transizione"] }
};

const FONTI = [
  { cat:"sfida", strumento:"Guide for constructing self-efficacy scales", uso:"Formato delle domande a cursore: «quanto sei sicuro di riuscire a…» da 0 a 100, su compiti concreti del proprio lavoro (S1, S4).",
    cit:"Bandura, A. (2006). Guide for constructing self-efficacy scales. In F. Pajares e T. Urdan (a cura di), Self-efficacy beliefs of adolescents (pp. 307–337). Information Age Publishing." },
  { cat:"sfida", strumento:"Occupational Self-Efficacy Scale, forma breve (6 item)", uso:"Idea dell'item «davanti a un problema nel lavoro trovo di solito più soluzioni», trasformato nello scenario dell'ordine bloccato (S3).",
    cit:"Rigotti, T., Schyns, B. e Mohr, G. (2008). A short version of the Occupational Self-Efficacy Scale. Journal of Career Assessment, 16(2), 238–255.", doi:"10.1177/1069072707305763" },
  { cat:"sfida", strumento:"Computer Self-Efficacy Measure", uso:"Idea di «riesco a usare un nuovo software anche senza nessuno che mi aiuti», usata negli scenari del corso e dell'help desk (S2, S3).",
    cit:"Compeau, D. R. e Higgins, C. A. (1995). Computer self-efficacy: Development of a measure and initial test. MIS Quarterly, 19(2), 189–211." },
  { cat:"sfida", strumento:"General Self-Efficacy Scale (10 item)", uso:"Riferimento generale per la fiducia nel cavarsela davanti agli imprevisti (S2). Esiste una versione italiana.",
    cit:"Schwarzer, R. e Jerusalem, M. (1995). Generalized Self-Efficacy Scale. In J. Weinman, S. Wright e M. Johnston, Measures in health psychology (pp. 35–37). NFER-Nelson." },
  { cat:"autonomia", strumento:"Multidimensional Work Motivation Scale (19 item; traduzione italiana del Center for Self-Determination Theory, non inclusa nelle sette lingue della validazione)", uso:"Fonte del contenuto. Chiede quanto alcune ragioni spieghino l'impegno nel proprio lavoro, su sei forme di motivazione: amotivazione, regolazione esterna sociale e materiale, introiettata, identificata, intrinseca. Da qui le quattro risposte di ogni domanda (A1–A4), riprese dagli item italiani.",
    cit:"Gagné, M., Forest, J., Vansteenkiste, M. e altri (2015). The Multidimensional Work Motivation Scale: Validation evidence in seven languages and nine countries. European Journal of Work and Organizational Psychology, 24(2), 178–196.", doi:"10.1080/1359432X.2013.877892" },
  { cat:"autonomia", strumento:"Self-Regulation Questionnaire e Relative Autonomy Index", uso:"Fonte del formato e del calcolo: una situazione concreta, poi «perché lo fai?» con ragioni ordinate lungo il continuum dall'amotivazione alla motivazione intrinseca. Le ragioni si combinano in un unico indice di autonomia relativa.",
    cit:"Ryan, R. M. e Connell, J. P. (1989). Perceived locus of causality and internalization: Examining reasons for acting in two domains. Journal of Personality and Social Psychology, 57(5), 749–761.", doi:"10.1037/0022-3514.57.5.749" },
  { cat:"autonomia", strumento:"General Causality Orientations Scale (12 scenari)", uso:"Modello per le domande a scenario: ogni situazione ha una risposta autonoma, una controllata e una impersonale («gli esiti non dipendono da me»), usata nelle risposte di amotivazione.",
    cit:"Deci, E. L. e Ryan, R. M. (1985). The general causality orientations scale: Self-determination in personality. Journal of Research in Personality, 19(2), 109–134." },
  { cat:"autonomia", strumento:"Accettazione del cambiamento organizzativo", uso:"Perché proprio questa teoria: in un'azienda di telecomunicazioni in piena trasformazione, l'autodeterminazione ha favorito l'accettazione del cambiamento.",
    cit:"Gagné, M., Koestner, R. e Zuckerman, M. (2000). Facilitating acceptance of organizational change: The importance of self-determination. Journal of Applied Social Psychology, 30(9), 1843–1852." },
  { cat:"bilancia", strumento:"Teoria dell'equità", uso:"Rapporto tra ciò che si dà e ciò che si riceve (Q1), confronto con un referente (Q2, R1), riduzione dell'impegno come reazione allo squilibrio (Q3).",
    cit:"Adams, J. S. (1965). Inequity in social exchange. Advances in Experimental Social Psychology, 2, 267–299." },
  { cat:"bilancia", strumento:"Organizational Justice Measure, scala distributiva", uso:"Item del tipo «quello che ricevi riflette l'impegno che ci hai messo?», trasformati negli scenari del premio e del report (Q3, Q4).",
    cit:"Colquitt, J. A. (2001). On the dimensionality of organizational justice: A construct validation of a measure. Journal of Applied Psychology, 86(3), 386–400.", doi:"10.1037/0021-9010.86.3.386" }
];

/* Reazione 8 bit per ogni risposta: chiave = valore dell'opzione (3 → 0). m = espressione di Nexi, p = oggetto in scena, f = effetti, t = didascalia */
const ANIM = {
  S2: { 3:{ m:"proud", p:"libro", f:"lampadina", t:"Ci arrivo!" }, 2:{ m:"idle", p:"libro", f:"domanda", t:"Me lo rispieghi?" },
        1:{ m:"worried", p:"libro", f:"sudore", t:"Resto indietro?" }, 0:{ m:"sad", p:"libro", f:"nuvola", t:"Non fa per me" } },
  S3: { 3:{ m:"proud", p:"pc", f:"lampadina", t:"Trovato!" }, 2:{ m:"think", p:"libro", f:"stelle", t:"Leggo la guida" },
        1:{ m:"doubt", p:"pc", f:"domanda", t:"Aspetto..." }, 0:{ m:"scared", p:"pc", f:"esclama", t:"Aiuto!" } },
  A1: { 3:{ m:"cheer", p:"pc", f:"lampadina", t:"Che curiosita!" }, 2:{ m:"proud", p:"pc", f:"stelle", t:"E importante" },
        1:{ m:"doubt", p:"trofeo", f:"domanda", t:"C'e un premio?" }, 0:{ m:"sleepy", p:"none", f:"zzz", t:"Non ne vale la pena" } },
  A2: { 3:{ m:"happy", p:"libro", f:"lampadina", t:"Interessante!" }, 2:{ m:"proud", p:"libro", f:"stelle", t:"Mi servira" },
        1:{ m:"worried", p:"libro", f:"sudore", t:"Che figura..." }, 0:{ m:"sad", p:"none", f:"nuvola", t:"Non dipende da me" } },
  A3: { 3:{ m:"wow", p:"pc", f:"stelle", t:"Lo scopro!" }, 2:{ m:"proud", p:"pc", f:"lampadina", t:"Ha senso" },
        1:{ m:"worried", p:"pc", f:"sudore", t:"Che vergogna..." }, 0:{ m:"angry", p:"pc", f:"domanda", t:"Ma perche?!" } },
  A4: { 3:{ m:"cheer", p:"ai", f:"cuori", t:"Mi diverte!" }, 2:{ m:"proud", p:"ai", f:"stelle", t:"Conta per me" },
        1:{ m:"think", p:"trofeo", f:"domanda", t:"Mi noteranno?" }, 0:{ m:"sleepy", p:"ai", f:"zzz", t:"Tempo perso" } },
  Q1: { 3:{ m:"happy", p:"bilancia", tilt:0, f:"stelle", t:"In equilibrio" }, 2:{ m:"wow", p:"bilancia", tilt:-12, f:"stelle", t:"Ci guadagno!" },
        1:{ m:"doubt", p:"bilancia", tilt:10, f:"domanda", t:"Metto di piu" }, 0:{ m:"angry", p:"bilancia", tilt:20, f:"fulmine", t:"Lo pago io!" } },
  Q2: { 3:{ m:"idle", p:"bilancia", tilt:0, f:"stelle", t:"Ha senso" }, 2:{ m:"doubt", p:"orologio", f:null, t:"Il mio turno arrivera" },
        1:{ m:"angry", p:"bilancia", tilt:14, f:"fulmine", t:"Favoritismo!" }, 0:{ m:"angry", p:"none", f:["nuvola","fulmine"], t:"Sempre agli stessi" } },
  Q3: { 3:{ m:"idle", p:"bilancia", tilt:0, f:"stelle", t:"Equilibrato" }, 2:{ m:"doubt", p:"bilancia", tilt:8, f:null, t:"Mmh..." },
        1:{ m:"angry", p:"bilancia", tilt:16, f:"fulmine", t:"Non e giusto!" }, 0:{ m:"sleepy", p:"none", f:"zzz", t:"Mi impegno meno" } },
  Q4: { 3:{ m:"cheer", p:"ai", f:"cuori", t:"Siamo un team!" }, 2:{ m:"think", p:"ai", f:"domanda", t:"Chi ha controllato?" },
        1:{ m:"sad", p:"ai", f:"nuvola", t:"Valgo meno" }, 0:{ m:"angry", p:"ai", f:"fulmine", t:"Anni azzerati!" } },
  R1: [ { m:"think", p:"chat", f:null, t:"Il mio reparto" }, { m:"think", p:"chat", f:"domanda", t:"Altre sedi" },
        { m:"think", p:"none", f:"stelle", t:"I piu giovani" }, { m:"think", p:"orologio", f:null, t:"Io, prima" } ]
};
function animFor(q, value, opt){
  if (q.tipo === "cursore"){
    const p = q.id === "S4" ? "ai" : "pc";
    if (value >= 0.8) return { m:"proud", p, f:"lampadina", t:"Sicurissimo!" };
    if (value >= 0.55) return { m:"happy", p, f:"stelle", t:"Ce la faccio" };
    if (value >= 0.3) return { m:"doubt", p, f:"domanda", t:"Vedremo..." };
    return { m:"worried", p, f:"sudore", t:"Che ansia!" };
  }
  if (q.tipo === "referente") return ANIM.R1[q.opzioni.indexOf(opt)] || null;
  return (ANIM[q.id] || {})[opt.v] || null;
}

/* Trasformazione di ogni domanda: [item di partenza, scenario nel trivia, fonte] */
const TRASF = {
  S1:["«Quanto sei sicuro di poter fare…?» da 0 a 100","Stesso formato, su un compito del caso: lavorare bene con il nuovo ERP entro un mese","Bandura (2006)"],
  S2:["«Riuscirei a usare un nuovo software da solo / se qualcuno mi aiutasse / se me lo mostrassero prima»","La scala dell'aiuto diventa le 4 risposte: ci arrivo da solo, se me lo rispiegano, temo di restare indietro, non fa per me","Compeau e Higgins (1995); Schwarzer e Jerusalem (1995)"],
  S3:["«Di fronte a un problema di solito trovo più soluzioni»","Errore mai visto al go-live, help desk assente: provo più strade, uso la guida, aspetto qualcuno, mi blocco","Schwarzer e Jerusalem (1995); Rigotti e altri (2008)"],
  S4:["«Quanto sei sicuro di poter fare…?» da 0 a 100","Compito nato con la GenAI: accorgersi che una risposta dell'AI è sbagliata","Bandura (2006)"],
  A1:["«Perché mi piace fare questo lavoro» · «perché credo che sia importante farli» · ricompensa e rischio di perdere l'impiego · «non credo che questo lavoro ne valga la pena»","Proporre come usare il nuovo ERP: per curiosità, perché è importante, per premio o per non restare indietro, non ne vale la pena","Gagné e altri (2015); Ryan e Connell (1989)"],
  A2:["«Il lavoro che faccio è interessante» · «ha un significato personale per me» · «per evitare le critiche di altri» · risposta impersonale della GCOS","Gli esercizi facoltativi del corso: interessanti, utili, per non fare brutta figura, tanto non dipende da me","Gagné e altri (2015); Deci e Ryan (1985)"],
  A3:["«Quello che faccio è stimolante» · «soddisfa i miei valori personali» · «diversamente avrei vergogna di me» · «non so nemmeno perché faccio questo lavoro»","I passaggi nuovi del go-live: mi stimola, li ritengo giusti, per non vergognarmi, non so perché abbiano cambiato tutto","Gagné e altri (2015)"],
  A4:["«Mi piace fare questo lavoro» · «ha un significato personale per me» · «per farmi rispettare di più dagli altri» · «ho l'impressione di perdere il mio tempo»","Il tempo liberato dal copilota: mi diverte, conta per me e per il reparto, per farmi notare, tempo perso","Gagné e altri (2015)"],
  Q1:["«Quello che ricevi riflette l'impegno che metti?» e il rapporto dare/avere","Formazione e doppio lavoro contro nuove competenze: pari, ci guadagno, metto di più, lo pago io","Adams (1965); Colquitt (2001)"],
  Q2:["Il confronto con un referente e «il risultato è giustificato dalla prestazione?»","Il collega di un altro reparto formato un mese prima di te riceve i progetti nuovi","Adams (1965); Colquitt (2001)"],
  R1:["I tipi di referente: altri, se stessi, il sistema","Con chi ti confronti: il tuo reparto, altre sedi, i più giovani, te stesso prima","Adams (1965); Goodman (1974)"],
  Q3:["Le reazioni all'iniquità, tra cui ridurre il proprio impegno","Stesso premio a chi lavora meno: da «è equilibrato» a «mi impegno meno anch'io»","Adams (1965); Colquitt (2001)"],
  Q4:["«Quello che ricevi riflette ciò che hai dato?» e l'esperienza come input","Il report scritto dall'AI e lodato al «team digitale»","Adams (1965); Colquitt (2001)"]
};

const REAZIONI = ["Annotato!","Chiaro, grazie.","Ok, capito.","Ricevuto!","Interessante.","Ci sta.","Grazie della sincerità."];
const SOLLETICO = ["Ehi, soffro il solletico!","Attento allo smoking, è a noleggio.","Sono qui, sono qui!","Un inchino per te.","Concentrati sulla storia!"];

/* =====================================================================
   MOTORE
   ===================================================================== */
let S;
const $ = id => document.getElementById(id);
const scored = DOMANDE.filter(d => !d.extra);
const perCat = c => scored.filter(d => d.cat === c);
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;

const STATE_VERSION = 4; // cambia quando cambia la forma dello stato: uno stato vecchio viene scartato
function freshState(){ return { v:STATE_VERSION, screen:"intro", eta:null, cap:0, coda:[], answers:{}, referente:null, current:null, hist:[] }; }
function validState(s){
  return s && s.v === STATE_VERSION && Array.isArray(s.coda) && Array.isArray(s.hist) && s.coda.every(id => scored.some(d => d.id === id))
    && Object.keys(s.answers || {}).every(id => scored.some(d => d.id === id));
}
function shuffle(a){ a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function esc(t){ return String(t).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }
function mean(a){ return a.length ? a.reduce((x,y) => x + y, 0) / a.length : 0; }

/* ---- Nexi, in pixel e smoking ---- */
function px(x,y,w,h,c){ return `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="px-${c}"/>`; }
function nexiSVG(expr = "idle"){ return `<svg viewBox="-1 -1 18 14.6" aria-hidden="true">${nexiBody(expr)}</svg>`; }
/* Espressioni: idle, happy, cheer, wave, think, wow, proud, worried, sad, angry, scared, doubt, sleepy */
let FEZ = false; // easter egg: dal 50° tocco Nexi indossa il fez
function nexiBody(expr = "idle"){
  let s = FEZ
    ? px(5.5,0,5,0.5,"fzd") + px(5.5,0.5,5,1,"fz") + px(5,1.5,6,1.6,"fz") + px(7.8,-0.4,0.6,0.5,"e") + px(8.1,-0.2,2.6,0.4,"e") + px(10.5,0.2,0.4,1.8,"e") + px(10.25,2,0.9,0.8,"e")
    : px(8,1,1,2,"d") + `<g class="spark">${px(7.5,-0.4,2,1.4,"s")}</g>`;
  // corpo
  s += px(3,3,10,8,"b") + px(2,4,12,6,"b") + px(3,4,1,2,"l") + px(4,3.4,2,0.6,"l") + px(13,4,1,4,"d");
  // smoking: giacca, camicia, bottoni, papillon
  s += px(2,8,12,2,"k") + px(3,10,10,1,"k");
  s += px(6.6,8,2.8,0.8,"w") + px(7,8.8,2,2.2,"w");
  s += px(7.75,9.3,0.5,0.5,"k") + px(7.75,10.2,0.5,0.5,"k");
  s += px(5.9,7.6,1.6,1.2,"r") + px(8.5,7.6,1.6,1.2,"r") + px(7.4,7.8,1.2,0.8,"rd");
  // due gambe
  [4.2,10.4].forEach(x => s += px(x,11,1.4,1.6,"k"));
  // braccia
  const armL = { down: px(1,8,1,1.4,"k") + px(1,9.4,1,0.7,"b"), up: px(1,6,1,2,"k") + px(0,4.4,1,1.7,"k") + px(0,3.7,1,0.8,"b"),
                 chin: px(1,7,1,1.6,"k") + px(1.7,6.2,1,0.9,"b") };
  const armR = { down: px(14,8,1,1.4,"k") + px(14,9.4,1,0.7,"b"), up: px(14,6,1,2,"k") + px(15,4.4,1,1.7,"k") + px(15,3.7,1,0.8,"b"),
                 chin: px(14,7,1,1.6,"k") + px(13.3,6.2,1,0.9,"b") };
  const L = (expr === "cheer" || expr === "scared") ? "up" : expr === "worried" ? "chin" : "down";
  const R = (expr === "cheer" || expr === "wave" || expr === "proud" || expr === "scared") ? "up" : (expr === "think" || expr === "worried") ? "chin" : "down";
  s += armL[L] + armR[R];
  // occhi
  if (["happy","cheer","wave","proud"].includes(expr)){
    [3.6,9.6].forEach(x => s += px(x,5.1,0.8,0.8,"e") + px(x+0.7,4.4,0.8,0.8,"e") + px(x+1.4,5.1,0.8,0.8,"e"));
  } else if (expr === "sleepy"){
    [4,10].forEach(x => s += px(x,5.3,2,0.5,"e"));
  } else {
    const dx = expr === "think" ? 0.5 : 0;
    const dy = expr === "think" ? -0.4 : expr === "sad" ? 0.4 : expr === "angry" ? 0.5 : 0;
    const big = (expr === "wow" || expr === "scared") ? 0.4 : 0;
    const h = expr === "angry" ? 1.5 : 2 + big;
    let e = "";
    [4,10].forEach(x => e += px(x+dx-big/2,4.2+dy-big/2,2+big,h,"e") + px(x+dx+0.3-big/2,4.5+dy-big/2,0.7,0.7,"w"));
    s += `<g class="eyes">${e}</g>`;
  }
  // sopracciglia
  if (expr === "worried" || expr === "sad") s += px(4,3.8,1,0.5,"e") + px(5,3.4,1,0.5,"e") + px(10,3.4,1,0.5,"e") + px(11,3.8,1,0.5,"e");
  else if (expr === "angry") s += px(4,3.4,1,0.5,"e") + px(5,3.9,1,0.5,"e") + px(10,3.9,1,0.5,"e") + px(11,3.4,1,0.5,"e");
  else if (expr === "doubt") s += px(4,3.7,2,0.5,"e") + px(10,3.1,2,0.5,"e");
  else if (expr === "scared") s += px(3.8,3.1,2.2,0.5,"e") + px(10,3.1,2.2,0.5,"e");
  // guance
  s += px(2.6,6.3,1.6,0.8,"p") + px(11.8,6.3,1.6,0.8,"p");
  if (expr === "angry") s += px(2.6,6.3,1.6,0.8,"a") + px(11.8,6.3,1.6,0.8,"a");
  if (expr === "sad") s += px(4.6,6.5,0.6,1.1,"t");
  // bocca
  if (expr === "wow") s += px(7.3,6.1,1.4,1.2,"e");
  else if (expr === "scared") s += px(7.5,6.1,1,1,"e");
  else if (expr === "think" || expr === "doubt") s += px(7.4,6.5,1.8,0.5,"e");
  else if (expr === "angry") s += px(6.8,6.4,2.4,0.6,"e");
  else if (expr === "sad") s += px(6.6,6.7,0.7,0.6,"e") + px(7.3,6.1,1.4,0.6,"e") + px(8.7,6.7,0.7,0.6,"e");
  else if (expr === "worried") s += px(6.6,6.5,0.7,0.5,"e") + px(7.3,6.2,0.7,0.5,"e") + px(8,6.5,0.7,0.5,"e") + px(8.7,6.2,0.7,0.5,"e");
  else if (expr === "proud") s += px(6.6,6,2.8,0.7,"e") + px(7.2,6.7,1.6,0.5,"r");
  else if (expr === "sleepy") s += px(7.5,6.4,1,0.6,"e");
  else s += px(6.6,6.1,0.7,0.6,"e") + px(7.3,6.6,1.4,0.6,"e") + px(8.7,6.1,0.7,0.6,"e");
  // easter egg "kpmg": occhiali da consulente
  if (expr === "kpmg") [3.4,9.4].forEach(x => s += px(x,3.7,3.2,0.45,"e") + px(x,6.2,3.2,0.45,"e") + px(x,3.7,0.45,2.95,"e") + px(x+2.75,3.7,0.45,2.95,"e"));
  if (expr === "kpmg") s += px(6.6,4.4,2.8,0.45,"e") + px(2.4,4.4,1,0.45,"e") + px(12.6,4.4,1,0.45,"e");
  return s;
}

/* ---- Scenette 8 bit dopo ogni risposta ---- */
function rr(x,y,w,h,c,cls = ""){ return `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="c-${c} ${cls}"/>`; }
const PROPS = {
  none: () => "",
  pc: () => rr(34,12,10,7,"dk") + rr(35,13,8,5,"cy") + rr(36,14,4,0.8,"dk") + rr(36,15.5,3,0.8,"dk") + rr(39.6,15.5,0.8,0.8,"wh","fx-blink") + rr(38,19,2,1.5,"gr") + rr(36.5,20.5,5,1.2,"gr"),
  ai: () => rr(38.5,10,1,2,"gr") + rr(38,9,2,1,"rd","fx-blink") + rr(35,12,8,7,"gr") + rr(36,13,6,4,"dk") + rr(37,14,1.2,1.2,"cy","fx-twinkle") + rr(39.8,14,1.2,1.2,"cy","fx-twinkle") + rr(37.5,16,3,0.6,"cy") + rr(36.5,19,5,2.5,"gr"),
  soldi: () => rr(34,17,8,4,"gn") + rr(35,18,6,2,"gn2") + rr(37.5,18.4,1,1.2,"gn") + `<g class="fx-rise d2">${rr(42,15,3,1,"gd")}</g>` + rr(42,18,3,1,"gd") + rr(42,19.2,3,1,"gd2") + rr(42,20.4,3,1,"gd"),
  chat: () => `<g class="fx-pop">${rr(34,9,8,4,"wh") + rr(35,13,1,1,"wh") + rr(35.5,10.5,1,1,"dk") + rr(37.5,10.5,1,1,"dk") + rr(39.5,10.5,1,1,"dk")}</g>` + `<g class="fx-pop d2">${rr(37,15,8,4,"cy") + rr(43,19,1,1,"cy") + rr(38.5,16.5,5,1,"dk")}</g>`,
  trofeo: () => rr(36,12,6,4,"gd") + rr(35,12.5,1,2,"gd") + rr(42,12.5,1,2,"gd") + rr(37,12.5,1,2,"wh","fx-twinkle") + rr(38.5,16,1,2,"gd") + rr(37,18,4,1.5,"gd2") + rr(36.5,19.5,5,1.5,"dk"),
  libro: () => rr(34,16,5,4,"wh") + rr(39,16,5,4,"wh2") + rr(38.8,16,0.4,4,"dk") + rr(35,17,3,0.5,"gr") + rr(35,18.2,3,0.5,"gr") + rr(40,17,3,0.5,"gr") + rr(40,18.2,2,0.5,"gr") + rr(33.5,20,11,1,"rd"),
  orologio: () => rr(36,11,6,8,"wh") + rr(35,12,8,6,"wh") + rr(38.7,12.3,0.6,2.9,"dk") + `<g class="fx-spin">${rr(38.7,14.9,2.6,0.6,"dk")}</g>` + rr(38.6,14.8,0.8,0.8,"rd") + rr(37.5,19,3,2,"gr"),
  valigia: () => rr(37,13.5,3,1.5,"dk") + rr(34,15,9,6,"br") + rr(36,15,0.8,6,"dk") + rr(40.2,15,0.8,6,"dk"),
  scudo: () => rr(35,11,8,6,"cy") + rr(36,17,6,2,"cy") + rr(37.5,19,3,1.5,"cy") + rr(38.5,12.5,1,5,"wh") + rr(37,14,4,1,"wh"),
  carte: () => [20.6,19,17.4,15.8,14.2].map((y,i) => rr(34 + (i % 2) * 0.6, y, 9, 1.3, i % 2 ? "wh2" : "wh")).join("") + `<g class="fx-fallin">${rr(34.3,12.6,9,1.3,"wh")}</g>`,
  bilancia: t => rr(38.5,10,1,11,"gr") + rr(36,20.5,6,1.5,"gr") +
    `<g class="beam" style="--t:${t || 0}deg">${rr(33,9.5,12,1,"gd") + rr(33.8,10.5,0.4,4,"gr") + rr(43.8,10.5,0.4,4,"gr") + rr(32.5,14.5,3,1,"gd2") + rr(42.5,14.5,3,1,"gd2")}</g>`
};
function heart(x,y,cls){ return `<g class="${cls}">${rr(x,y,1,1,"rd") + rr(x+2,y,1,1,"rd") + rr(x,y+1,3,1,"rd") + rr(x+1,y+2,1,1,"rd")}</g>`; }
function star(x,y,cls){ return `<g class="${cls}">${rr(x,y-1,1,3,"gd") + rr(x-1,y,3,1,"gd")}</g>`; }
function zed(x,y,cls){ return `<g class="${cls}">${rr(x,y,3,0.7,"wh") + rr(x+1.5,y+0.7,0.8,0.8,"wh") + rr(x+0.7,y+1.4,0.8,0.8,"wh") + rr(x,y+2.1,3,0.7,"wh")}</g>`; }
const FX = {
  lampadina: () => `<g class="fx-blink">${rr(22.5,1.5,4,2,"gd") + rr(23,1,3,3,"gd") + rr(21,0,1,1,"gd") + rr(27,0,1,1,"gd") + rr(20.5,2.5,1,0.6,"gd") + rr(27.5,2.5,1,0.6,"gd")}</g>` + rr(23.5,4,2,1,"gr"),
  sudore: () => `<g class="fx-fall">${rr(31,10,1,1.4,"bl")}</g><g class="fx-fall d2">${rr(30.6,12.5,0.8,1.2,"bl")}</g><g class="fx-fall d1">${rr(16.4,11,1,1.4,"bl")}</g>`,
  cuori: () => heart(18,6,"fx-rise") + heart(26,5,"fx-rise d2") + heart(30,8,"fx-rise d1"),
  nuvola: () => `<g class="fx-shake">${rr(19,2,10,3,"gy") + rr(20,1,4,1,"gy") + rr(24,0.5,4,1.5,"gy")}</g><g class="fx-fall">${rr(21,5.5,0.5,1.2,"bl")}</g><g class="fx-fall d1">${rr(24,6,0.5,1.2,"bl")}</g><g class="fx-fall d2">${rr(27,5.5,0.5,1.2,"bl")}</g>`,
  stelle: () => star(18,5,"fx-twinkle") + star(31,3,"fx-twinkle d1") + star(29,9,"fx-twinkle d2"),
  fulmine: () => `<g class="fx-pulse">${rr(29,8,1,3,"rd") + rr(28,9,3,1,"rd")}</g><g class="fx-blink">${rr(19,1,2,1,"gd") + rr(18.5,2,2,1,"gd") + rr(19.5,3,2,1,"gd") + rr(19,4,1.5,1,"gd")}</g>`,
  domanda: () => `<g class="fx-blink">${rr(23,0,3,1,"wh") + rr(26,1,1,2,"wh") + rr(24,3,2,1,"wh") + rr(24,4,1,1,"wh") + rr(24,6,1,1,"wh")}</g>`,
  esclama: () => `<g class="fx-shake">${rr(24,0,1.4,5,"rd") + rr(24,6,1.4,1.4,"rd")}</g>`,
  zzz: () => zed(26,5,"fx-rise") + zed(29,2,"fx-rise d2")
};
const MOVE = { proud:"a-bounce", cheer:"a-bounce", happy:"a-bounce", worried:"a-shake", scared:"a-shake", angry:"a-stomp", sad:"a-droop", think:"a-tilt", doubt:"a-tilt", sleepy:"a-droop", idle:"a-bob", wow:"a-bob", wave:"a-bob" };
function sceneHTML(cat, a){
  let bg = rr(0,0,48,28,"bg");
  [[3,3],[9,6],[14,2],[38,3],[44,7],[33,1]].forEach(([x,y],i) => bg += rr(x,y,0.6,0.6,"wh", `fx-twinkle d${i % 3}`));
  bg += rr(0,22,48,6,"fl");
  for (let x = 0; x < 48; x += 4) bg += rr(x,22,2,1,"fl2") + rr(x + 2,24,2,1,"fl2") + rr(x,26,2,1,"fl2");
  const fx = [].concat(a.f || []).map(f => FX[f] ? FX[f]() : "").join("");
  const prop = (PROPS[a.p] || PROPS.none)(a.tilt);
  return `<div class="px-screen">
    <svg class="px-svg" viewBox="0 0 48 28" aria-hidden="true">
      ${bg}
      ${prop}
      <g transform="translate(16 9.4)"><g class="${MOVE[a.m] || "a-bob"}">${nexiBody(a.m)}</g></g>
      ${fx}
    </svg>
    <p class="px-cap ${cat}-ctx"><span>${esc(a.t)}</span></p>
  </div>`;
}
/* Nexi vive nella scena: espressione, oggetto accanto, effetti sopra la testa, fumetto. Una sola mascotte in pagina. */
let walkTimer, curSide = "left", walking = false;
function replay(el, cls){ el.classList.remove("hop","spin"); void el.getBoundingClientRect(); el.classList.add(cls); }
function nexi(text, expr = "idle", o = {}){
  const side = o.side || curSide, moved = side !== curSide; curSide = side;
  $("walker").style.transform = `translateX(${side === "left" ? -8 : 20}px)`;
  $("propG").setAttribute("transform", `translate(${side === "left" ? 0 : -26} 0)`);
  $("propG").innerHTML = (PROPS[o.p] || PROPS.none)(o.tilt);
  $("fxG").innerHTML = [].concat(o.f || []).map(f => FX[f] ? FX[f]() : "").join("");
  const mood = $("moodG"), cls = MOVE[expr] || "a-bob";
  mood.innerHTML = nexiBody(expr);
  if (moved && !REDUCE){
    walking = true; mood.setAttribute("class", "a-walk");
    clearTimeout(walkTimer); walkTimer = setTimeout(() => { walking = false; $("moodG").setAttribute("class", MOVE[$("moodG").dataset.expr] || "a-bob"); }, 950);
  } else if (!walking) mood.setAttribute("class", cls);
  mood.dataset.expr = expr;
  if (o.hop && !REDUCE && !moved) replay($("hopG"), "hop");
  const b = $("bubble");
  b.textContent = text; b.classList.toggle("tail-right", side === "right");
  b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
}
let sideFlip = false;
const nextSide = () => (sideFlip = !sideFlip) ? "right" : "left";
let pokes = 0;
function pokeNexi(){
  pokes++;
  // easter egg: al ventesimo tocco Nexi si arrabbia, al ventunesimo ci ripensa
  if (pokes === 20) return nexi("Se mi tocchi ancora ti denuncio!", "angry", { f:"fulmine", hop:true });
  if (pokes === 21) return nexi("Scherzavo!", "happy", { f:"cuori", hop:true });
  if (pokes === 50){ FEZ = true; if (!REDUCE) replay($("hopG"), "spin"); return nexi("Bismillah!", "happy", { f:"stelle" }); }
  if (!REDUCE) replay($("hopG"), "spin");
  nexi(SOLLETICO[Math.floor(Math.random() * SOLLETICO.length)], "wave", { f:"stelle" });
}
// piccolo saltello ogni tanto, quando Nexi è fermo
setInterval(() => { if (!REDUCE && !walking && S && S.screen !== "method") replay($("hopG"), "hop"); }, 7000);

/* ---- Easter egg ---- */
// Un minuto senza toccare nulla: Nexi si addormenta
let idleT, asleep = false;
function armIdle(){
  clearTimeout(idleT);
  if (asleep){ asleep = false; nexi("Eccomi! Dove eravamo?", "wow", { hop:true }); }
  idleT = setTimeout(() => {
    if (!S || ["method","calc"].includes(S.screen)) return;
    asleep = true; nexi("Zzz… Mi sveglio al prossimo go-live.", "sleepy", { f:"zzz" });
  }, 60000);
}
["pointerdown","keydown"].forEach(ev => addEventListener(ev, armIdle, { capture:true }));
armIdle();

// Codice segreto: scrivi "kpmg" sulla tastiera
let typed = "";
addEventListener("keydown", e => {
  if (e.key.length !== 1) return;
  typed = (typed + e.key.toLowerCase()).slice(-4);
  if (typed === "kpmg") nexi("Consulente in ascolto. Senza diritto di voto, eh.", "kpmg", { hop:true });
});

/* ---- Ufficio in pixel art, sfondo di tutta la pagina ---- */
function oo(x,y,w,h,c,cls = ""){ return `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="o-${c} ${cls}"/>`; }
function officeSVG(){
  let s = oo(0,0,160,62,"wall");
  for (let x = 2; x < 160; x += 8) s += oo(x,4,3,52,"wall2");
  s += oo(0,0,160,4,"ceil");
  // finestre con la città
  const win = (x) => {
    let w = oo(x,10,40,30,"frame") + oo(x+2,12,36,26,"sky");
    w += `<g class="cloud">${oo(x+6,15,8,2,"cloud") + oo(x+8,14,4,1,"cloud")}</g><g class="cloud slow">${oo(x+22,18,9,2,"cloud") + oo(x+24,17,5,1,"cloud")}</g>`;
    [[2,26,6,12,"b1"],[8,22,7,16,"b2"],[15,28,5,10,"b3"],[20,20,6,18,"b1"],[26,25,7,13,"b2"],[33,23,5,15,"b3"]].forEach(([dx,y,bw,bh,c]) => {
      w += oo(x+dx,y,bw,bh,c);
      for (let yy = y + 2; yy < 37; yy += 3) for (let xx = x + dx + 1; xx < x + dx + bw - 1; xx += 2) if ((xx + yy) % 3) w += oo(xx,yy,1,1,"lit");
    });
    w += oo(x+19,12,2,26,"frame") + oo(x+2,24,36,1.5,"frame") + oo(x-1,40,42,2,"sill");
    return w;
  };
  s += win(10) + win(110);
  // lavagna al centro con grafico e post-it
  s += oo(58,10,44,26,"wbb") + oo(59,11,42,24,"wb");
  [[63,28,3,4],[68,25,3,7],[73,22,3,10],[78,18,3,14]].forEach(([x,y,w,h]) => s += oo(x,y,w,h,"bar"));
  s += oo(62,32,20,0.6,"ink");
  s += oo(86,14,6,6,"n1") + oo(93,15,6,6,"n2") + oo(88,23,6,6,"n3") + oo(95,24,5,5,"n1");
  s += oo(60,36,40,1.5,"wbb");
  // orologio e lampade
  s += oo(76,5,8,4,"clock") + oo(79.6,5.6,0.8,2,"ink") + oo(80,7,2.2,0.7,"ink");
  [30,130].forEach(x => s += oo(x-6,4,12,2,"lampb") + oo(x-4,6,8,1,"lamp","glow"));
  // zoccolo e pavimento in legno
  s += oo(0,55,160,1,"wain2") + oo(0,56,160,6,"wain");
  s += oo(0,62,160,28,"floor");
  [66,71,77,84].forEach((y,i) => { s += oo(0,y,160,0.6,"floor2"); for (let x = (i % 2) * 10; x < 160; x += 20) s += oo(x,y - (i ? 5 : 4),0.6,i ? 5 : 4,"floor2"); });
  s += oo(52,70,56,12,"rug") + oo(54,72,52,8,"rug2");
  // scrivania sinistra con monitor e sedia
  s += oo(14,40,14,9,"mon") + oo(15,41,12,7,"screen","glow") + oo(16,42,6,0.8,"ink") + oo(16,44,8,0.8,"ink") + oo(20,49,2,1,"mon");
  s += oo(6,50,34,3,"desk") + oo(8,53,2,9,"leg") + oo(36,53,2,9,"leg") + oo(30,47,4,3,"mug");
  s += oo(42,48,8,3,"chair") + oo(44,44,4,4,"chair") + oo(45.4,51,1.2,8,"leg") + oo(43,59,6,1,"leg");
  // pianta
  s += oo(50,52,7,6,"pot") + oo(51,44,2,8,"leaf") + oo(53,41,2,11,"leaf2") + oo(55,45,2,7,"leaf") + oo(49,47,2,3,"leaf2") + oo(57,48,2,3,"leaf2");
  // scrivania destra con portatile, libri, erogatore d'acqua
  s += oo(120,50,34,3,"desk") + oo(122,53,2,9,"leg") + oo(150,53,2,9,"leg");
  s += oo(128,44,12,6,"mon") + oo(129,45,10,4,"screen","glow") + oo(126,50,16,0.8,"mon");
  s += oo(144,44,2,6,"bk1") + oo(146,45,2,5,"bk2") + oo(148,43,2,7,"bk3");
  s += oo(103,44,7,14,"cool") + oo(104,38,5,6,"water") + oo(105,48,1,2,"ink");
  return `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMax slice">${s}</svg>`;
}
$("office").innerHTML = officeSVG();
// in verticale si inquadra la parte sinistra dell'ufficio (finestra con la città dietro Nexi), in orizzontale il centro
(() => {
  const mq = matchMedia("(orientation: portrait)");
  const fit = () => $("office").querySelector("svg").setAttribute("preserveAspectRatio", mq.matches ? "xMinYMax slice" : "xMidYMax slice");
  fit();
  mq.addEventListener ? mq.addEventListener("change", fit) : mq.addListener(fit);
})();

/* ---- Avanzamento ---- */
function renderTop(){
  const done = scored.filter(d => d.id in S.answers).length;
  $("bar").style.width = (done / scored.length * 100) + "%";
  $("count").textContent = `${done}/${scored.length}`;
}
/* ---- Tasto Indietro: ogni schermata visitata entra nella cronologia; tornando indietro si ripristina lo stato di allora (le risposte date dopo si cancellano) ---- */
let advT;
function snap(){ const { hist, ...rest } = S; return JSON.parse(JSON.stringify(rest)); }
function goBack(){
  if (S.hist.length < 2) return;
  clearTimeout(advT);
  S.hist.pop();
  S = Object.assign(JSON.parse(JSON.stringify(S.hist[S.hist.length - 1])), { hist:S.hist });
  resume();
}
function show(html, cls = ""){
  if (!["method","calc"].includes(S.screen)){
    const cur = snap(), top = S.hist[S.hist.length - 1];
    if (top && top.screen === cur.screen && top.current === cur.current && top.cap === cur.cap) S.hist[S.hist.length - 1] = cur;
    else S.hist.push(cur);
  }
  $("backNav").hidden = ["method","calc"].includes(S.screen) || S.hist.length < 2;
  $("app").classList.toggle("wide", S.screen === "method");
  $("progressRow").hidden = S.screen === "method";
  $("howBtn").textContent = S.screen === "method" ? "Torna al trivia" : "Come funziona";
  $("screen").innerHTML = `<section class="card enter ${cls}">${html}</section>`;
  $("screen").scrollTop = 0;
  renderTop();
}

/* ---- Schermate del trivia ---- */
function intro(){
  S.screen = "intro";
  nexi("Ciao! Sono Nexi, la mascotte di NexaCore. Ti accompagno in una breve storia.", "wave", { side:"left" });
  show(`<span class="eyebrow">5 minuti · 12 domande · 4 capitoli</span>
    <h1>Come stai vivendo il cambiamento?</h1>
    <p class="muted">Ti raccontiamo i prossimi mesi di NexaCore e ti chiediamo come reagiresti. Alla fine ricevi il tuo profilo e un percorso pensato per te.</p>
    <ul class="list">
      <li>Non ci sono risposte giuste o sbagliate.</li>
      <li>È obbligatorio e nominativo: il tuo profilo lo vedi tu, HR e il responsabile del pilota, per affidarti un ruolo nel cambiamento.</li>
      <li>Non entra mai nella valutazione delle persone.</li>
    </ul>
    <button class="btn" id="go">Inizia</button>
    <button class="link" id="demo">Demo: salta alla fine con risposte casuali</button>`);
  $("go").onclick = age;
  $("demo").onclick = demoFill;
}

function age(){
  S.screen = "age";
  nexi("Una sola domanda su di te, solo per i dati aggregati. Puoi anche saltarla.", "idle", { side:"right" });
  const opts = ["Under 30","Tra 30 e 50","Over 50","Preferisco non dirlo"];
  show(`<span class="eyebrow">Facoltativo</span>
    <h2>Quanti anni hai?</h2>
    <div class="answers autonomia-ctx">${opts.map((o,i) => `<button class="ans" style="--i:${i}" data-i="${i}">${o}</button>`).join("")}</div>`);
  document.querySelectorAll(".ans").forEach(b => b.onclick = () => { S.eta = opts[+b.dataset.i]; startChapter(0); });
}

function startChapter(i){
  S.screen = "chapter"; S.cap = i;
  S.coda = scored.filter(d => d.cap === i).map(d => d.id);
  const c = CAPITOLI[i];
  nexi(c.nexi, i === 0 ? "wow" : "happy", { side: i % 2 ? "right" : "left", hop:true });
  show(`<div class="chapter-big">${i + 1}</div>
    <span class="chapter-num">Capitolo ${i + 1} di ${CAPITOLI.length}</span>
    <h2>${c.titolo}</h2>
    <p>${c.testo}</p>
    <button class="btn" id="next">Continua</button>`);
  $("next").onclick = nextQuestion;
}

function nextQuestion(){
  while (S.coda.length){
    const id = S.coda.shift();
    const q = DOMANDE.find(d => d.id === id);
    if (q) return question(q);
  }
  return S.cap + 1 < CAPITOLI.length ? startChapter(S.cap + 1) : calc();
}

function question(q){
  S.screen = "question"; S.current = q.id;
  const cat = CATEGORIE[q.cat];
  nexi(q.tipo === "referente" ? "Ancora una, sullo stesso tema." : `${cat.nome}! ${cat.domanda}`, "think", { side: nextSide() });
  const head = `<div class="qhead"><span class="cat-tag ${q.cat}">${cat.nome}</span><span class="eyebrow">Capitolo ${q.cap + 1} · ${CAPITOLI[q.cap].titolo}</span></div>
    ${q.scena ? `<p class="scene">${esc(q.scena)}</p>` : ""}
    <p class="qtext">${esc(q.testo)}</p>`;
  // la scenetta 8 bit cambia con la risposta selezionata; si va avanti solo confermando
  let last = null;
  const preview = a => {
    if (!a || last === a.t) return;            // stessa reazione: non far ripartire l'animazione
    last = a.t;
    nexi(a.t, a.m, { p:a.p, f:a.f, tilt:a.tilt, hop:true });
  };
  const ATTESA = { m:"think", p:"none", f:"domanda", t:"Scegli una risposta" };
  if (q.tipo === "cursore"){
    show(`${head}
      <div class="meter-big"><span id="val">50</span><small>/100</small></div>
      <input type="range" id="rng-${q.id}" min="0" max="100" step="5" value="50" aria-label="${esc(q.testo)}">
      <div class="scale-ends"><span>${q.estremi[0]}</span><span>${q.estremi[1]}</span></div>
      <button class="btn" id="ok">Conferma risposta</button>`, `${q.cat}-ctx`);
    const r = $("rng-" + q.id);
    preview(animFor(q, 0.5));
    r.oninput = () => {
      $("val").textContent = r.value;
      const v = +r.value, p = q.id === "S4" ? "ai" : "pc";
      // easter egg: cursore agli estremi
      if (v === 100){ last = "__max"; nexi("100? Nemmeno Bandura era così sicuro.", "proud", { p, f:"stelle", hop:true }); }
      else if (v === 0){ last = "__min"; nexi("Respira. Ti offro un caffè virtuale.", "worried", { p:"none", f:"sudore", hop:true }); }
      else preview(animFor(q, v / 100));
    };
    $("ok").onclick = () => { $("ok").disabled = true; const v = r.value / 100; record(q, v, animFor(q, v)); };
  } else {
    const opts = shuffle(q.opzioni);
    let sel = null;
    show(`${head}
      <div class="answers" id="answers" role="radiogroup">${opts.map((o,i) => `<button class="ans" role="radio" aria-checked="false" style="--i:${i}" data-i="${i}">${esc(o.t)}</button>`).join("")}</div>
      <button class="btn" id="ok" disabled>Conferma risposta</button>`, `${q.cat}-ctx`);
    preview(ATTESA);
    document.querySelectorAll(".ans").forEach(b => b.onclick = () => {
      sel = opts[+b.dataset.i];
      document.querySelectorAll(".ans").forEach(x => { const on = x === b; x.classList.toggle("picked", on); x.setAttribute("aria-checked", String(on)); });
      preview(animFor(q, null, sel));
      $("ok").disabled = false;
    });
    $("ok").onclick = () => {
      if (!sel) return;
      $("ok").disabled = true;
      $("answers").setAttribute("aria-disabled","true");
      record(q, q.tipo === "referente" ? sel.v : sel.v / 3, animFor(q, null, sel));
    };
  }
}

function afterAnswer(){
  const next = S.after; S.after = null;
  return next ? question(DOMANDE.find(d => d.id === next)) : nextQuestion();
}
function record(q, value, anim){
  if (q.tipo === "referente") S.referente = value; else S.answers[q.id] = value;
  S.after = q.segue || null;
  renderTop();
  if (anim) nexi(anim.t, anim.m, { hop:true });
  else nexi(REAZIONI[Math.floor(Math.random() * REAZIONI.length)], "happy", { hop:true });
  advT = setTimeout(afterAnswer, 650);
}
function reaction(q, a){
  S.screen = "reaction";
  nexi(a.t, a.m, { hop:true });
  show(`<div class="qhead"><span class="cat-tag ${q.cat}">${CATEGORIE[q.cat].nome}</span><span class="eyebrow">La tua scelta</span></div>
    ${sceneHTML(q.cat, a)}
    <button class="btn" id="pxNext">Avanti</button>`, `${q.cat}-ctx`);
  let done = false;
  const go = () => { if (done || S.screen !== "reaction") return; done = true; clearTimeout(timer); afterAnswer(); };
  const timer = setTimeout(go, REDUCE ? 1800 : 2800);
  $("pxNext").onclick = go;
}

/* ---- Calcolo del profilo ---- */
function profile(){
  const v = id => S.answers[id] ?? 0;
  const sfida = mean(perCat("sfida").map(d => v(d.id)));
  // Motore = indice di autonomia relativa (Ryan e Connell, 1989) riportato su 0–1:
  // intrinseca 1, identificata 0,67, controllata (esterna o introiettata) 0,33, amotivazione 0.
  const autonomia = mean(perCat("autonomia").map(d => v(d.id)));
  const bilancia = mean(perCat("bilancia").map(d => v(d.id)));
  const E = sfida >= CONFIG.soglia ? 1 : 0;
  const A = autonomia >= CONFIG.soglia ? 1 : 0;
  const Q = bilancia >= CONFIG.soglia ? 1 : 0;
  const key = `${E}${A}${Q}`;
  const near = x => Math.abs(x - CONFIG.soglia) < CONFIG.margine;
  // Quante risposte di amotivazione: non cambia il codice, è un segnale in più per il gruppo.
  const amotivazione = perCat("autonomia").filter(d => d.id in S.answers && S.answers[d.id] === 0).length;
  return { key, persona:PERSONAS[key], E, A, Q, amotivazione,
    punteggi:{ sfida, autonomia, bilancia },
    confine:{ sfida:near(sfida), autonomia:near(autonomia), bilancia:near(bilancia) } };
}

function calc(){
  S.screen = "calc";
  nexi("Metto insieme i pezzi della tua storia…", "think", { side:"right", p:"pc", f:"domanda" });
  show(`<div class="calc"><div class="dots"><i></i><i></i><i></i></div><h2>Sto calcolando il tuo profilo</h2></div>`);
  setTimeout(result, 1500);
}

function cubeHTML(key){
  const layer = m => {
    const cell = (e,q) => { const k = `${e}${m}${q}`; return `<div class="cell${k === key ? " me" : ""}">${PERSONAS[k].nome}</div>`; };
    return `<div class="layer"><h4>Motivazione ${m ? CATEGORIE.autonomia.alto : CATEGORIE.autonomia.basso}</h4>
      <div class="grid2">
        <div></div><div class="ax">Equità alta</div><div class="ax">Equità bassa</div>
        <div class="ax">Fiducia alta</div>${cell(1,1)}${cell(1,0)}
        <div class="ax">Fiducia bassa</div>${cell(0,1)}${cell(0,0)}
      </div></div>`;
  };
  return `<div class="cube">${layer(1)}${layer(0)}</div>`;
}

/* ---- Cubo 3D: X = equità (alta a sinistra), Y = fiducia (alta in alto), Z = motivazione (autonoma davanti) ---- */
const CUBE = { half:34, off:38, plate:88 };
function cubePos(k){ return { sx: k[2] === "1" ? -1 : 1, sy: k[0] === "1" ? -1 : 1, sz: k[1] === "1" ? 1 : -1 }; }
function cube3dHTML(key){
  const H = CUBE.half;
  const faces = name => [
    ["fz", `translateZ(${H}px)`], ["fz", `rotateY(180deg) translateZ(${H}px)`],
    ["fx", `rotateY(90deg) translateZ(${H}px)`], ["fx", `rotateY(-90deg) translateZ(${H}px)`],
    ["fy", `rotateX(90deg) translateZ(${H}px)`], ["fy", `rotateX(-90deg) translateZ(${H}px)`]
  ].map(([c,t]) => `<div class="face ${c}" style="transform:${t}">${name}</div>`).join("");
  const cubelets = Object.keys(PERSONAS).map(k => {
    const { sx, sy, sz } = cubePos(k), o = CUBE.off;
    return `<div class="cubelet${k === key ? " me sel" : ""}" data-k="${k}" style="transform:translate3d(${sx * o}px,${sy * o}px,${sz * o}px)">${faces(PERSONAS[k].nome)}</div>`;
  }).join("");
  // etichette degli assi: sul piano di ogni faccia del cubo grande, appena oltre il bordo, così non coprono i cubi
  const E = CUBE.off + CUBE.half, P = CUBE.plate;
  const plates = [
    ["py", `rotateX(90deg) translateZ(${E}px) translateY(-${P}px)`, "Fiducia alta"], ["py", `rotateX(-90deg) translateZ(${E}px) translateY(${P}px)`, "Fiducia bassa"],
    ["px", `rotateY(-90deg) translateZ(${E}px) translateY(${P}px)`, "Equità alta"], ["px", `rotateY(90deg) translateZ(${E}px) translateY(${P}px)`, "Equità bassa"],
    ["pz", `translateZ(${E}px) translateY(${P}px)`, "Motivazione autonoma"], ["pz", `rotateY(180deg) translateZ(${E}px) translateY(${P}px)`, "Motivazione controllata"]
  ].map(([c,t,txt]) => `<div class="plate ${c}" style="transform:${t}">${txt}</div>`).join("");
  return `<div class="cube-scene" id="cubeScene" aria-label="Cubo degli 8 profili: trascina per ruotarlo">
      <div class="cube3d" id="cube3d">${cubelets}${plates}</div>
    </div>
    <div class="cube-tools">
      <span class="cube-hint">Trascina per ruotare · tocca un cubo per leggerlo</span>
      <button class="btn alt small" id="cubeHome">Torna alla tua cella</button>
    </div>
    <div class="legend">
      <span style="--fc:var(--sfida)"><i></i>Fiducia nei nuovi strumenti</span>
      <span style="--fc:var(--autonomia)"><i></i>Motivazione autonoma</span>
      <span style="--fc:var(--bilancia)"><i></i>Equità</span>
    </div>
    <p class="cube-cap" id="cubeCap"></p>`;
}
function cubeTarget(key){
  const { sx, sy, sz } = cubePos(key);
  let best = { rx:-24, ry:-36, z:-Infinity };
  for (const rx of [-24, 24]) for (const ry of [-36, 36, 144, -144]){
    let z;
    try { z = new DOMMatrix(`rotateX(${rx}deg) rotateY(${ry}deg)`).transformPoint(new DOMPoint(sx, sy, sz)).z; } catch (e) { z = 0; }
    if (z > best.z) best = { rx, ry, z };
  }
  return best;
}
function initCube3d(key){
  const scene = $("cubeScene"), cube = $("cube3d"); if (!scene) return;
  const home = cubeTarget(key);
  const rot = { rx: home.rx, ry: home.ry };
  const apply = () => { cube.style.transform = `rotateX(${rot.rx}deg) rotateY(${rot.ry}deg)`; };
  const caption = k => {
    const p = PERSONAS[k];
    $("cubeCap").innerHTML = `<b>${p.nome}</b>${k === key ? " (il tuo profilo)" : ""} · Fiducia ${k[0] === "1" ? "alta" : "bassa"} · Motivazione ${k[1] === "1" ? "autonoma" : "controllata"} · Equità ${k[2] === "1" ? "alta" : "bassa"}<br>«${esc(p.frase)}»`;
    cube.querySelectorAll(".cubelet").forEach(c => c.classList.toggle("sel", c.dataset.k === k));
  };
  caption(key);
  // ingresso: parte girato e ruota fino alla cella accesa
  cube.classList.add("dragging");
  cube.style.transform = `rotateX(${rot.rx - 30}deg) rotateY(${rot.ry - 220}deg)`;
  void cube.offsetWidth;
  setTimeout(() => { cube.classList.remove("dragging"); apply(); }, 60);
  let drag = null;
  scene.addEventListener("pointerdown", e => {
    drag = { x:e.clientX, y:e.clientY, rx:rot.rx, ry:rot.ry, moved:0, target:e.target };
    scene.setPointerCapture(e.pointerId); cube.classList.add("dragging"); scene.classList.add("grabbing");
  });
  scene.addEventListener("pointermove", e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
    rot.ry = drag.ry + dx * 0.5;
    rot.rx = Math.max(-85, Math.min(85, drag.rx - dy * 0.5));
    apply();
  });
  const end = () => {
    if (!drag) return;
    if (drag.moved < 6){ const c = drag.target.closest && drag.target.closest(".cubelet"); if (c) caption(c.dataset.k); }
    drag = null; cube.classList.remove("dragging"); scene.classList.remove("grabbing");
  };
  scene.addEventListener("pointerup", end);
  scene.addEventListener("pointercancel", end);
  $("cubeHome").onclick = () => { rot.rx = home.rx; rot.ry = home.ry; apply(); caption(key); };
}

function recapHTML(){
  return CAPITOLI.map((c,i) => `<h4 class="rc-h">Capitolo ${i + 1} · ${esc(c.titolo)}</h4>` + DOMANDE.filter(d => d.cap === i).map(d => {
    let ans = "Non risposta", pts = "";
    if (d.tipo === "referente"){
      const o = d.opzioni.find(o => o.v === S.referente); if (o) ans = o.t; pts = "non conta";
    } else if (S.answers[d.id] != null){
      const v = S.answers[d.id];
      if (d.tipo === "cursore") ans = `${Math.round(v * 100)} su 100`;
      else { const o = d.opzioni.find(o => o.v === Math.round(v * 3)); if (o) ans = o.t; }
      pts = `${Math.round(v * 100)} punti`;
    }
    return `<div class="rc">
      <div class="rc-top"><span class="qid">${d.id}</span><span class="cat-tag mini ${d.cat}">${CATEGORIE[d.cat].nome}</span><span class="rc-pts">${pts}</span></div>
      <p class="src">${esc(d.testo)}</p>
      <p><b>${esc(ans)}</b></p>
    </div>`;
  }).join("")).join("");
}

function confetti(){
  if (REDUCE) return;
  const box = document.createElement("div"); box.className = "confetti";
  const cols = ["var(--sfida)","var(--autonomia)","var(--bilancia)","var(--gold)","#fff"];
  for (let i = 0; i < 60; i++){
    const c = document.createElement("i");
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = cols[i % cols.length];
    c.style.setProperty("--x", (Math.random() * 160 - 80) + "px");
    c.style.setProperty("--r", (Math.random() * 900 - 450) + "deg");
    c.style.setProperty("--d", (1.6 + Math.random() * 1.4) + "s");
    c.style.animationDelay = Math.random() * .4 + "s";
    box.appendChild(c);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3600);
}

function result(fromResume){
  S.screen = "result";
  const p = profile(), P = p.persona;
  nexi(`Ecco il tuo profilo: ${P.nome}! Grazie per aver giocato.`, "cheer", { side:"left", hop:true, p:"trofeo", f:"stelle" });
  const dim = (c, score, alto, flag) => `<div class="dim ${c}-ctx">
      <div class="dim-top"><span>${CATEGORIE[c].etichetta}${flag ? '<span class="chip">vicino alla soglia</span>' : ""}</span><span>${Math.round(score * 100)} · ${alto ? CATEGORIE[c].alto : CATEGORIE[c].basso}</span></div>
      <div class="bar"><b style="width:${Math.max(3, score * 100)}%"></b><span class="tick" style="left:${CONFIG.soglia * 100}%"></span></div>
    </div>`;
  const dashBtn = `<button class="btn big" id="dashBtn">Vai alla dashboard</button>`;
  show(`<div class="result-head">
      <span class="eyebrow">Il tuo profilo</span>
      <h1>${P.nome}</h1>
      <span class="code">Fiducia ${p.E ? "alta" : "bassa"} · Motivazione ${p.A ? CATEGORIE.autonomia.alto : CATEGORIE.autonomia.basso} · Equità ${p.Q ? "alta" : "bassa"}</span>
    </div>
    <p class="quote">«${P.frase}»</p>
    <div class="dims">
      ${dim("sfida", p.punteggi.sfida, p.E, p.confine.sfida)}
      ${dim("autonomia", p.punteggi.autonomia, p.A, p.confine.autonomia)}
      ${dim("bilancia", p.punteggi.bilancia, p.Q, p.confine.bilancia)}
    </div>
    ${S.referente ? `<p class="muted">Quando valuti se è giusto, ti confronti soprattutto con <b>${esc(S.referente)}</b>.</p>` : ""}
    <h3>Il tuo percorso</h3>
    <ul class="list">${P.percorso.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    <h3>Dove ti trovi tra gli 8 profili</h3>
    ${cube3dHTML(p.key)}
    ${dashBtn}
    <details>
      <summary>Per il team del cambiamento</summary>
      <div class="inner">
        <p><b>Rischio per NexaCore:</b> ${esc(P.rischio)}</p>
        <p><b>Timori del Board collegati:</b> ${P.timori.join(", ")}.</p>
        <p><b>Risposte senza senso del cambiamento:</b> ${p.amotivazione} su 4 nelle domande sul motore.</p>
        <p><b>Chi vede il risultato:</b> il profilo individuale lo vedono solo la persona, HR e il responsabile del pilota, per assegnare i ruoli nel cambiamento. Non entra mai nella valutazione delle persone. Il resto dell'azienda vede solo dati aggregati, con almeno 10 risposte per gruppo.</p>
        ${S.eta ? `<p class="src">Fascia d'età dichiarata: ${esc(S.eta)}.</p>` : ""}
      </div>
    </details>
    <button class="btn alt" id="recapBtn" aria-expanded="false" aria-controls="recap">Rivedi le tue risposte</button>
    <div class="recap" id="recap" hidden>${recapHTML()}</div>
    <div class="row">
      <button class="btn alt" id="again">Rigioca</button>
      <button class="btn alt" id="how2">Come è stato calcolato</button>
    </div>`);
  initCube3d(p.key);
  $("dashBtn").onclick = () => NexaSito.apriDashboard(p.key);   // stessa pagina: il profilo passa alla dashboard (js/sito.js)
  $("recapBtn").onclick = () => {
    const box = $("recap"), open = box.hidden;
    box.hidden = !open;
    $("recapBtn").setAttribute("aria-expanded", String(open));
    $("recapBtn").textContent = open ? "Nascondi le risposte" : "Rivedi le tue risposte";
    if (open) box.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block:"start" });
  };
  $("again").onclick = () => { S = freshState(); intro(); };
  $("how2").onclick = () => { location.hash = "metodo"; };
  if (!fromResume) confetti();
}

function demoFill(){
  scored.forEach(d => { S.answers[d.id] = d.tipo === "cursore" ? Math.round(Math.random() * 20) * 5 / 100 : Math.floor(Math.random() * 4) / 3; });
  const r = DOMANDE.find(d => d.tipo === "referente");
  S.referente = r.opzioni[Math.floor(Math.random() * 4)].v;
  calc();
}

/* ---- Pagina "Come funziona" ---- */
function method(){
  const back = S.screen === "method" ? S.back : S.screen;
  S.back = back; S.screen = "method";
  nexi("Qui ti mostro cosa c'è dietro le quinte: domande, calcolo e fonti.", "think", { side:"right", p:"libro", f:"lampadina" });
  const pts = v => Math.round(v / 3 * 100);
  const qcard = d => {
    const c = CATEGORIE[d.cat];
    let body;
    if (d.tipo === "cursore") body = `<p class="src">Risposta con un cursore da 0 a 100: il valore scelto è il punteggio.</p>`;
    else if (d.tipo === "referente") body = `<ul class="opts">${d.opzioni.map(o => `<li><span class="pts">—</span><span>${esc(o.t)}</span></li>`).join("")}</ul>`;
    else body = `<ul class="opts">${d.opzioni.slice().sort((a,b) => b.v - a.v).map(o => `<li><span class="pts">${pts(o.v)}</span><span>${esc(o.t)}${o.forma ? ` <span class="src">· ${esc(o.forma)}</span>` : ""}</span></li>`).join("")}</ul>`;
    return `<div class="qcard">
      <div class="qh"><span class="qid">${d.id}</span><span class="cat-tag mini ${d.cat}">${c.nome}</span>${d.extra ? `<span class="eyebrow">non conta nel punteggio</span>` : ""}</div>
      ${d.scena ? `<p class="src">${esc(d.scena)}</p>` : ""}
      <p><b>${esc(d.testo)}</b></p>
      ${body}
      <p class="src">Fonte: ${esc(d.fonte)}</p>
    </div>`;
  };
  const personeRows = Object.entries(PERSONAS).map(([k,p]) => `<tr>
      <td class="c">${k}</td><td>${k[0] === "1" ? "alta" : "bassa"}</td><td>${k[1] === "1" ? "autonoma" : "controllata"}</td><td>${k[2] === "1" ? "alta" : "bassa"}</td>
      <td><b>${p.nome}</b><br><span class="src">${esc(p.frase)}</span></td><td class="src">${esc(p.rischio)}</td></tr>`).join("");
  show(`<span class="eyebrow">Dietro le quinte</span>
    <h1>Come funziona il trivia</h1>
    <p class="muted">Il trivia assegna ogni persona a uno degli 8 profili che nascono incrociando tre domande: <b>ce la faccio?</b> (autoefficacia, Bandura), <b>perché lo faccio?</b> (autodeterminazione, Deci e Ryan), <b>è giusto?</b> (equità, Adams).</p>

    <section>
      <h2>Il processo, dall'inizio alla fine</h2>
      <ol class="steps">
        <li><span><b>Scelta dei questionari</b>Per ogni teoria abbiamo preso i questionari validati più usati in ambito lavorativo (elenco sotto).</span></li>
        <li><span><b>Adattamento in scenari</b>Gli item dei questionari («quanto sei sicuro di…», «quello che ricevi riflette il tuo impegno?») sono diventati situazioni concrete della transizione di NexaCore, raccontate in 4 capitoli.</span></li>
        <li><span><b>Somministrazione</b>12 domande che contano (4 per teoria, una per teoria in ogni capitolo) più una sul referente. Circa 5 minuti, obbligatorio e nominativo: serve solo ad assegnare i ruoli nel cambiamento, mai a valutare. L'ordine delle risposte viene mescolato.</span></li>
        <li><span><b>Calcolo</b>Ogni risposta diventa un punteggio da 0 a 100, poi si fa la media per teoria (dettagli sotto).</span></li>
        <li><span><b>Assegnazione</b>Tre «alto o basso» danno un codice a tre cifre, che corrisponde a uno degli 8 profili.</span></li>
        <li><span><b>Restituzione</b>La persona riceve il suo profilo e un percorso. Oltre a lei, il profilo individuale lo vedono solo HR e il responsabile del pilota; il resto dell'azienda vede dati aggregati, per gruppi di almeno 10.</span></li>
        <li><span><b>Rimisurazione</b>Il trivia si ripete prima di ogni ondata di rilascio: lo spostamento delle persone tra i profili è il KPI.</span></li>
      </ol>
    </section>

    <section>
      <h2>Dai questionari al trivia</h2>
      <p class="muted">Non abbiamo preso solo «le domande più significative» dei questionari. Ogni domanda nasce da tre tecniche combinate.</p>
      <div class="tech">
        <div><b>Selezione per contenuto</b><span>Un item per ogni sfaccettatura della teoria, scelto per pertinenza al caso NexaCore. Per l'autodeterminazione, ogni domanda copre tutte e quattro le zone del continuum (intrinseca, identificata, controllata, amotivazione), e le forme controllate ruotano tra esterna materiale, esterna sociale e introiettata. Non con criteri statistici, come tenere gli item che misurano meglio il tratto: per quello servono dati che non abbiamo.</span></div>
        <div><b>Formato a scenario</b><span>Ogni item diventa una situazione concreta della transizione con risposte graduate. È il formato del Situational Judgment Test, usato nella selezione del personale: coinvolge di più e riduce le risposte «da bravo dipendente».</span></div>
        <div><b>Ancoraggi comportamentali</b><span>Ogni livello della scala originale («per niente… del tutto») diventa un pensiero o una reazione tipica di chi si trova a quel livello, come nelle scale ad ancoraggio comportamentale (Behaviorally Anchored Rating Scales).</span></div>
      </div>
      <p class="src">Eccezione: le due domande a cursore (S1, S4) tengono il formato originale di Bandura, da 0 a 100. Nelle altre usiamo quattro livelli senza punto centrale: chi risponde deve scegliere da che parte stare, e questo serve per decidere «alto» o «basso».</p>
      <h3>Domanda per domanda</h3>
      ${DOMANDE.map(d => TRASF[d.id] ? `<div class="tr-row">
          <div class="meta"><span class="qid">${d.id}</span><span class="cat-tag mini ${d.cat}">${CATEGORIE[d.cat].nome}</span><span class="src">${esc(TRASF[d.id][2])}</span></div>
          <span class="from">${esc(TRASF[d.id][0])}</span><span class="arrow" aria-hidden="true">→</span><span class="to">${esc(TRASF[d.id][1])}</span>
        </div>` : "").join("")}
      <p class="src">Le schede complete (item tradotti, passaggi e punti deboli di ogni domanda) sono nella pagina <a href="https://claude.ai/artifact/9AbuvC5HAfwM5nTwoPMy7C" target="_blank" rel="noopener">Dai questionari al trivia</a>.</p>
    </section>

    <section>
      <h2>Come si calcola il profilo</h2>
      <div class="flow"><span>Risposta</span><em>→</em><span>Punteggio 0–100</span><em>→</em><span>Media per teoria</span><em>→</em><span>Confronto con 50</span><em>→</em><span>Codice a 3 cifre</span><em>→</em><span>Profilo</span></div>
      <ol class="steps">
        <li><span><b>Punteggio di ogni risposta</b>Nelle domande a scelta le 4 risposte valgono 100, 67, 33 e 0 (100 = più fiducia, motivazione più autonoma, più equità). Nelle domande a cursore vale il numero scelto.</span></li>
        <li><span><b>Il motore (autodeterminazione)</b>Le risposte di A1–A4 seguono il continuum di Deci e Ryan: intrinseca (mi piace) 100, identificata (ci credo, è importante) 67, controllata (premio, approvazione, vergogna, paura di restare indietro) 33, amotivazione (non ne vedo il senso) 0. È l'ordine dell'indice di autonomia relativa (Ryan e Connell, 1989). Da 50 in su la motivazione è autonoma, cioè almeno «ci credo» in media.</span></li>
        <li><span><b>Media per teoria</b>Sfida = media di S1–S4. Motore = media di A1–A4. Bilancia = media di Q1–Q4. Le risposte di amotivazione si contano anche a parte: non cambiano il codice, ma sono un segnale in più per il gruppo.</span></li>
        <li><span><b>Confronto con la soglia</b>Media ≥ ${CONFIG.soglia * 100} = alto (1), sotto = basso (0). Se la media cade tra ${(CONFIG.soglia - CONFIG.margine) * 100} e ${(CONFIG.soglia + CONFIG.margine) * 100} il risultato mostra «vicino alla soglia»: il profilo è meno sicuro.</span></li>
        <li><span><b>Codice e profilo</b>Le tre cifre, nell'ordine Sfida-Motore-Bilancia, danno il codice. Esempio: fiducia alta, motivazione controllata, equità bassa = 100 = Esperto in cerca di garanzie.</span></li>
      </ol>
      <p class="src">Una scelta voluta su Q1: chi pensa di «guadagnarci più di quanto mette» prende 67 e non 100, perché per Adams anche sentirsi sovra-ricompensati è uno squilibrio.</p>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Codice</th><th>Fiducia</th><th>Motivazione</th><th>Equità</th><th>Profilo</th><th>Rischio per l'azienda</th></tr></thead>
        <tbody>${personeRows}</tbody>
      </table></div>
      ${cubeHTML("")}
    </section>

    <section>
      <h2>Tutte le domande</h2>
      ${CAPITOLI.map((c,i) => `<h3>Capitolo ${i + 1} · ${c.titolo}</h3><p class="src">${esc(c.testo)}</p>${DOMANDE.filter(d => d.cap === i).map(qcard).join("")}`).join("")}
    </section>

    <section>
      <h2>Fonti dei questionari</h2>
      ${Object.keys(CATEGORIE).map(k => `<h3>${CATEGORIE[k].nome} · ${CATEGORIE[k].teoria}</h3><p class="src">${CATEGORIE[k].cosa}</p>
        ${FONTI.filter(f => f.cat === k).map(f => `<div class="ref ${k}-ctx"><b>${esc(f.strumento)}</b><span>${esc(f.uso)}</span><span class="src">${esc(f.cit)}${f.doi ? ` <a href="https://doi.org/${f.doi}" target="_blank" rel="noopener">doi:${f.doi}</a>` : ""}</span></div>`).join("")}`).join("")}
      <p class="src">Escluso di proposito: l'Equity Sensitivity Instrument (Huseman, Hatfield e Miles, 1987), perché misura quanto una persona è sensibile all'equità, non quanta equità percepisce.</p>
    </section>

    <section>
      <h2>Limiti</h2>
      <ul class="list">
        <li>Le domande si ispirano agli item dei questionari ma non li riproducono: il risultato è indicativo, non una misura validata.</li>
        <li>Gli item sono stati scelti per contenuto e non con criteri statistici: un pilota direbbe quali scenari misurano davvero meglio ciascuna teoria.</li>
        <li>Con quattro domande per teoria, una risposta pesa molto: per questo segnaliamo i profili vicini alla soglia.</li>
        <li>Sul motore conta molto il desiderio di dare la risposta «giusta», tanto più in un trivia nominativo: chi risponde tende a scegliere «ci credo». Per questo la collocazione si conferma con il comportamento osservato nel pilota.</li>
        <li>La MWMS misura la motivazione verso il lavoro in generale; qui le ragioni sono riferite a momenti del cambiamento. È un adattamento, da validare.</li>
        <li>Prima di usarlo davvero servirebbe un test pilota: coerenza tra le domande di ogni teoria e confronto con i questionari originali.</li>
        <li>La soglia a 50 è uguale per tutti; con dati reali andrebbe tarata sulla distribuzione dei dipendenti di NexaCore.</li>
      </ul>
    </section>
    <button class="btn" id="backBtn">Torna al trivia</button>`, "method");
  $("backBtn").onclick = leaveMethod;
}
function leaveMethod(){ history.replaceState(null, "", location.pathname + location.search); route(); }

function resume(){
  const q = S.current && DOMANDE.find(d => d.id === S.current);
  const where = S.screen === "method" ? S.back : S.screen;
  S.screen = where;
  if (where === "result" || where === "calc") return result(true);
  if (where === "reaction") return afterAnswer();
  if (where === "question" && q) return question(q);
  if (where === "chapter") return startChapter(S.cap);
  if (where === "age") return age();
  intro();
}
function route(){
  if (NexaSito.vista() === "dashboard") return;   // indirizzi della dashboard: li gestisce js/sito.js
  location.hash === "#metodo" ? method() : resume();
}

$("howBtn").onclick = () => { S.screen === "method" ? leaveMethod() : (location.hash = "metodo"); };
$("actor").onclick = pokeNexi;
$("backNav").onclick = goBack;
$("actor").onkeydown = e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); pokeNexi(); } };
addEventListener("hashchange", route);

function start(data){
  S = data && validState(data.state) ? data.state : freshState();
  window.claude?.hot?.snapshot?.(() => ({ state:S }));
  route();
}
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
