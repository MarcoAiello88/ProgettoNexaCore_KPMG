/* =====================================================================
   TRIVIA IN 3D: Nexi e l'ufficio in tre dimensioni. Solo grafica.

   Sostituisce la pixel art con una scena three.js senza toccare il
   trivia: domande, testi, punteggi e logica restano in js/trivia.js.
   Questo file legge lo stato di Nexi dal suo SVG (#moodG espressione,
   #walker lato, #propG oggetto, #fxG effetti, #hopG salti) e lo
   ridisegna in 3D. L'SVG resta nella pagina, invisibile ma cliccabile,
   per il tocco su Nexi e per l'accessibilità.

   Movimenti in più, sempre solo grafica: Nexi sbuca da dietro un
   computer, quando è fermo fa piccoli gesti, segue il puntatore con gli
   occhi e si può trascinare (poi torna al suo posto). La stanza è viva:
   cielo con nuvole che si formano, uccelli, aereo, luci della città,
   lampade, polvere nei raggi di sole, schermi, vapore, bolle, sedia,
   pianta, post-it, aeroplanino di carta.

   Se WebGL manca, se three.js non si carica o se il dispositivo è
   troppo lento, la pagina resta com'era (pixel art).
   ===================================================================== */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const root = document.documentElement;
const $ = id => document.getElementById(id);
const REDUCE_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;
const OFF = /[?&]3d=0\b/.test(location.search);   // ?3d=0: pixel art, per confrontare
const FORCE = /[?&]3d=1\b/.test(location.search); // ?3d=1: 3D anche su dispositivi lenti
const els = {
  office: $("office"), actor: $("actor"), stage: document.querySelector(".actor-stage"),
  mood: $("moodG"), walker: $("walker"), prop: $("propG"), fx: $("fxG"), hop: $("hopG")
};
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const rand = (a, b) => a + Math.random() * (b - a);
const nowS = () => performance.now() / 1000;
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
/* Valore lungo una sequenza di chiavi [tempo, valore], con raccordi morbidi. */
function track(s, keys){
  if (s <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++){
    const [t1, v1] = keys[i], [t0, v0] = keys[i - 1];
    if (s <= t1){ const u = (s - t0) / ((t1 - t0) || 1); return lerp(v0, v1, u * u * (3 - 2 * u)); }
  }
  return keys[keys.length - 1][1];
}

let stopAll = () => {};
function giveUp(why){
  try { stopAll(); } catch (e) {}
  root.classList.remove("t3d", "t3d-wait", "t3d-drag", "t3d-lift");
  document.querySelectorAll("canvas.t3d-office, canvas.t3d-nexi").forEach(c => c.remove());
  if (why) console.info("Trivia 3D disattivato, resta la pixel art:", why);
}

/* =====================================================================
   ATTREZZI
   ===================================================================== */
function rng(seed){
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
/* Schiarisce (k > 0) o scurisce (k < 0) un colore esadecimale. */
function shade(hex, k){
  const n = parseInt(hex.slice(1), 16), t = k < 0 ? 0 : 255, p = Math.abs(k);
  const ch = s => Math.round(s + (t - s) * p);
  return `rgb(${ch(n >> 16 & 255)},${ch(n >> 8 & 255)},${ch(n & 255)})`;
}
const std = (color, roughness = .6, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: .5, ...o });
const basic = o => new THREE.MeshBasicMaterial(o);
function mesh(geo, mat, cast = true, receive = true){ const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = receive; return m; }
function at(o, x, y, z){ o.position.set(x, y, z); return o; }
function box(w, h, d, mat, cast = true){ return mesh(new THREE.BoxGeometry(w, h, d), mat, cast); }
function group(...kids){ const g = new THREE.Group(); kids.forEach(k => k && g.add(k)); return g; }

/* Parallelepipedo con spigoli arrotondati (raggio r), normali esatte. */
function roundedBox(hx, hy, hz, r, detail = 5){
  r = Math.min(r, hx, hy, hz);
  const seg = h => Math.max(2, Math.min(40, Math.ceil(2 * h / (r / detail))));
  const g = new THREE.BoxGeometry(2 * hx, 2 * hy, 2 * hz, seg(hx), seg(hy), seg(hz));
  const p = g.attributes.position, n = g.attributes.normal;
  const v = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
  const ex = hx - r, ey = hy - r, ez = hz - r;
  for (let i = 0; i < p.count; i++){
    v.fromBufferAttribute(p, i);
    c.set(clamp(v.x, -ex, ex), clamp(v.y, -ey, ey), clamp(v.z, -ez, ez));
    d.subVectors(v, c);
    if (d.lengthSq() < 1e-12) d.fromBufferAttribute(n, i); else d.normalize();
    v.copy(c).addScaledVector(d, r);
    p.setXYZ(i, v.x, v.y, v.z); n.setXYZ(i, d.x, d.y, d.z);
  }
  g.computeBoundingSphere();
  return g;
}
function canvasTex(w, h, draw, { repeat = null, srgb = true } = {}){
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat){ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
let GLOW;
function glowTex(){
  return GLOW ||= canvasTex(128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.25, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
}
function glow(color, size, opacity = .6, additive = true){
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
  s.scale.set(size, size, 1); return s;
}
function shapeFrom(points){ const s = new THREE.Shape(); points.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s; }
function extrude(shape, depth, bevel = .08){
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 18 });
  g.center(); return g;
}
function heartShape(s = 1){
  const h = new THREE.Shape();
  h.moveTo(0, -1.1 * s);
  h.bezierCurveTo(-.2 * s, -.8 * s, -1.25 * s, -.15 * s, -1.25 * s, .45 * s);
  h.bezierCurveTo(-1.25 * s, 1.05 * s, -.45 * s, 1.25 * s, 0, .7 * s);
  h.bezierCurveTo(.45 * s, 1.25 * s, 1.25 * s, 1.05 * s, 1.25 * s, .45 * s);
  h.bezierCurveTo(1.25 * s, -.15 * s, .2 * s, -.8 * s, 0, -1.1 * s);
  return h;
}
function starShape(R = 1, r = .45){
  const pts = [];
  for (let i = 0; i < 10; i++){ const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  return shapeFrom(pts);
}
function dropMesh(mat, s = 1){
  return group(mesh(new THREE.SphereGeometry(.42 * s, 16, 12), mat, false, false),
    at(mesh(new THREE.ConeGeometry(.4 * s, .75 * s, 16), mat, false, false), 0, .5 * s, 0));
}
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
/* La stessa curva della transizione CSS di #walker: cubic-bezier(.55,0,.3,1). */
function cssBezier(x1, y1, x2, y2){
  const bx = t => 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
  const by = t => 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
  return x => { let lo = 0, hi = 1; for (let i = 0; i < 24; i++){ const m = (lo + hi) / 2; bx(m) < x ? lo = m : hi = m; } return by((lo + hi) / 2); };
}
const walkEase = cssBezier(.55, 0, .3, 1);

/* =====================================================================
   TEXTURE DIPINTE A MANO (canvas)
   ===================================================================== */
function woodTexture(base, { planks = false, seed = 7, w = 1024, h = 1024 } = {}){
  return canvasTex(w, h, (g, W, H) => {
    const R = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    const rows = planks ? 8 : 1, rh = H / rows;
    for (let r = 0; r < rows; r++){
      let x = -R() * W * .5;
      while (x < W){
        const len = planks ? W * (.32 + R() * .36) : W * 2;
        g.fillStyle = shade(base, (R() - .5) * .22); g.fillRect(x, r * rh, len, rh);
        for (let k = 0; k < (planks ? 16 : 70); k++){
          const y0 = r * rh + R() * rh, amp = 1 + R() * 3, fq = .004 + R() * .01, ph = R() * 9;
          g.strokeStyle = `rgba(40,22,10,${.05 + R() * .09})`; g.lineWidth = .6 + R() * 1.8;
          g.beginPath(); g.moveTo(x, y0);
          for (let xx = x; xx <= x + len; xx += 16) g.lineTo(xx, y0 + Math.sin(xx * fq + ph) * amp);
          g.stroke();
        }
        if (planks){ g.fillStyle = "rgba(25,14,6,.55)"; g.fillRect(x, r * rh, 3, rh); }
        x += len;
      }
      if (planks){ g.fillStyle = "rgba(25,14,6,.6)"; g.fillRect(0, r * rh, W, 3); g.fillStyle = "rgba(255,240,220,.06)"; g.fillRect(0, r * rh + 3, W, 2); }
    }
  }, { repeat: [1, 1] });
}
function wallTexture(){
  return canvasTex(512, 512, (g, W, H) => {
    const R = rng(3);
    g.fillStyle = "#3D4D80"; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 64){ g.fillStyle = "rgba(20,30,70,.16)"; g.fillRect(x + 20, 0, 24, H); }
    for (let i = 0; i < 9000; i++){ g.fillStyle = `rgba(${R() < .5 ? "255,255,255" : "0,0,20"},${R() * .035})`; g.fillRect(R() * W, R() * H, 2, 2); }
  }, { repeat: [1, 1] });
}
/* Una fila di palazzi su fondo trasparente; `dynamic` lascia spente alcune finestre da accendere dopo. */
function cityLayer(seed, { W = 2048, H = 512, hMin, hMax, colors, light, haze = 0, dynamic = 0 }){
  const R = rng(seed), wins = [];
  const tex = canvasTex(W, H, g => {
    let x = -20;
    while (x < W){
      const bw = 26 + R() * 62, bh = H * (hMin + R() * (hMax - hMin)), top = H - bh;
      const col = colors[Math.floor(R() * colors.length)];
      g.fillStyle = col; g.fillRect(x, top, bw, bh);
      g.fillStyle = "rgba(255,255,255,.09)"; g.fillRect(x, top, bw * .18, bh);
      g.fillStyle = "rgba(0,0,30,.13)"; g.fillRect(x + bw * .82, top, bw * .18, bh);
      if (R() < .3){ g.fillStyle = col; g.fillRect(x + bw * .45, top - 14, 3, 14); g.fillStyle = "#FF4D5E"; g.fillRect(x + bw * .45 - 1, top - 17, 5, 4); }
      for (let yy = top + 7; yy < H - 4; yy += 11) for (let xx = x + 5; xx < x + bw - 7; xx += 9){
        const r = R();
        if (dynamic && r < dynamic){ wins.push({ x: xx, y: yy, w: 5, h: 6 }); g.fillStyle = "rgba(20,30,70,.35)"; }
        else g.fillStyle = r < light ? `rgba(255,226,122,${.6 + R() * .4})` : `rgba(20,30,70,${.2 + R() * .2})`;
        g.fillRect(xx, yy, 5, 6);
      }
      if (haze){ g.fillStyle = `rgba(205,228,255,${haze})`; g.fillRect(x, top, bw, bh); }
      x += bw + 2 + R() * 9;
    }
  });
  return { tex, wins, W, H };
}
/* Schermo che cambia da solo: grafico che scorre (monitor) o foglio di calcolo (portatile). */
function liveScreen(kind){
  const c = document.createElement("canvas"); c.width = 512; c.height = 320;
  const g = c.getContext("2d"), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const data = Array.from({ length: 26 }, (_, i) => .5 + Math.sin(i * .55) * .22);
  let step = -1;
  function draw(k){
    const W = 512, H = 320;
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#0B1A44"); bg.addColorStop(1, "#102A66");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = "#4DE1FF"; g.fillRect(0, 0, W, 26);
    g.fillStyle = "#0E1433"; [14, 34, 54].forEach(x => { g.beginPath(); g.arc(x, 13, 6, 0, 7); g.fill(); });
    if (kind === "monitor"){
      g.fillStyle = "rgba(255,255,255,.1)"; g.fillRect(0, 26, 92, H - 26);
      [52, 80, 108, 136, 164].forEach((y, i) => { const on = i === k % 5; g.fillStyle = on ? "#4DE1FF" : "rgba(255,255,255,.55)"; g.fillRect(14, y, on ? 64 : 50, 10); });
      g.strokeStyle = "rgba(77,225,255,.22)"; g.lineWidth = 2;
      for (let y = 60; y <= 290; y += 46){ g.beginPath(); g.moveTo(110, y); g.lineTo(W - 18, y); g.stroke(); }
      const px = i => 110 + i * (W - 128) / (data.length - 1), py = v => 290 - v * 200;
      const fill = g.createLinearGradient(0, 80, 0, 290); fill.addColorStop(0, "rgba(124,240,176,.45)"); fill.addColorStop(1, "rgba(124,240,176,0)");
      g.beginPath(); g.moveTo(px(0), 290); data.forEach((v, i) => g.lineTo(px(i), py(v))); g.lineTo(px(data.length - 1), 290); g.closePath(); g.fillStyle = fill; g.fill();
      g.strokeStyle = "#7CF0B0"; g.lineWidth = 5; g.lineJoin = "round"; g.beginPath(); data.forEach((v, i) => i ? g.lineTo(px(i), py(v)) : g.moveTo(px(i), py(v))); g.stroke();
      g.fillStyle = "#FFFFFF"; g.beginPath(); g.arc(px(data.length - 1), py(data[data.length - 1]), 8, 0, 7); g.fill();
      if (k % 2){ g.fillStyle = "#FFD23F"; g.fillRect(W - 54, 36, 30, 10); }
    } else {
      g.strokeStyle = "rgba(77,225,255,.45)"; g.lineWidth = 2;
      for (let y = 46; y < H; y += 26){ g.beginPath(); g.moveTo(16, y); g.lineTo(W - 16, y); g.stroke(); }
      for (let x = 16; x < W; x += 96){ g.beginPath(); g.moveTo(x, 40); g.lineTo(x, H - 10); g.stroke(); }
      const cell = k % 20, cx = 16 + (cell % 5) * 96, cy = 46 + Math.floor(cell / 5) * 26;
      g.fillStyle = "rgba(255,210,63,.85)"; g.fillRect(cx + 2, cy + 2, 92, 22);
      g.fillStyle = "#7CF0B0"; g.fillRect(214, 126, 80, 16);
      const typed = 20 + (k * 23) % 300;
      g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(24, H - 30, typed, 10);
      if (k % 2){ g.fillStyle = "#FFFFFF"; g.fillRect(28 + typed, H - 33, 4, 16); }
    }
  }
  draw(0);
  return { tex, update(t){
    const k = Math.floor(t * 3); if (k === step) return; step = k;
    data.shift(); data.push(clamp(data[data.length - 1] + (Math.random() - .46) * .16, .12, .92));
    draw(k); tex.needsUpdate = true;
  } };
}
function boardTexture(){
  return canvasTex(1024, 600, (g, W, H) => {
    const R = rng(5);
    g.fillStyle = "#F4F6FF"; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++){ g.fillStyle = `rgba(120,130,170,${R() * .04})`; g.beginPath(); g.ellipse(R() * W, R() * H, 40 + R() * 120, 10 + R() * 30, R() * 3, 0, 7); g.fill(); }
    [[90, 140], [190, 220], [290, 300], [390, 390]].forEach(([x, h]) => { g.fillStyle = "#1FB876"; g.fillRect(x, 470 - h, 70, h); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(x, 470 - h, 14, h); });
    g.strokeStyle = "#1B1F3B"; g.lineWidth = 7; g.lineCap = "round";
    g.beginPath(); g.moveTo(60, 60); g.lineTo(60, 472); g.lineTo(520, 472); g.stroke();
    g.strokeStyle = "#D9488F"; g.lineWidth = 5; g.setLineDash([16, 12]); g.beginPath(); g.moveTo(110, 330); g.lineTo(220, 260); g.lineTo(320, 180); g.lineTo(430, 90); g.stroke(); g.setLineDash([]);
    g.strokeStyle = "rgba(27,31,59,.8)"; g.lineWidth = 6;
    [[600, 90, 260], [600, 140, 200], [600, 190, 240]].forEach(([x, y, w]) => { g.beginPath(); g.moveTo(x, y); for (let k = 0; k <= w; k += 20) g.lineTo(x + k, y + Math.sin(k * .3) * 4); g.stroke(); });
  });
}
function rugTexture(){
  return canvasTex(1024, 512, (g, W, H) => {
    const R = rng(9);
    g.fillStyle = "#4B3F7A"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#6A5BA8"; g.lineWidth = 18; g.strokeRect(34, 34, W - 68, H - 68);
    g.strokeStyle = "#FFD23F"; g.lineWidth = 4; g.strokeRect(62, 62, W - 124, H - 124);
    g.fillStyle = "#5A4D8E";
    for (let x = 120; x < W - 100; x += 110) for (let y = 120; y < H - 100; y += 110){ g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-22, -22, 44, 44); g.restore(); }
    for (let i = 0; i < 26000; i++){ g.fillStyle = `rgba(${R() < .5 ? "255,255,255" : "0,0,0"},${R() * .07})`; g.fillRect(R() * W, R() * H, 2, 2); }
  });
}
function pageTexture(){
  return canvasTex(256, 320, (g, W, H) => {
    g.fillStyle = "#FBFAF5"; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(60,70,110,.55)";
    for (let y = 40; y < H - 30; y += 22) g.fillRect(26, y, W - 52 - (y % 3) * 30, 7);
    g.fillStyle = "#4DE1FF"; g.fillRect(26, 14, 90, 12);
  });
}
function clockFace(){
  return canvasTex(256, 256, (g, W) => {
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, W, W);
    g.translate(W / 2, W / 2);
    for (let i = 0; i < 60; i++){ g.save(); g.rotate(i * Math.PI / 30); g.fillStyle = "#1B1F3B"; i % 5 ? g.fillRect(-1.5, -112, 3, 10) : g.fillRect(-4, -116, 8, 22); g.restore(); }
  });
}
/* Fascio di luce: chiaro in alto, sfuma in basso e ai lati. */
function beamTexture(){
  return canvasTex(128, 256, (g, W, H) => {
    const v = g.createLinearGradient(0, 0, 0, H); v.addColorStop(0, "rgba(255,244,214,.95)"); v.addColorStop(.55, "rgba(255,244,214,.35)"); v.addColorStop(1, "rgba(255,244,214,0)");
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    const h = g.createLinearGradient(0, 0, W, 0); h.addColorStop(0, "rgba(0,0,0,1)"); h.addColorStop(.25, "rgba(0,0,0,0)"); h.addColorStop(.75, "rgba(0,0,0,0)"); h.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out"; g.fillStyle = h; g.fillRect(0, 0, W, H);
  });
}
function trailTexture(){
  return canvasTex(256, 16, (g, W, H) => {
    const r = g.createLinearGradient(0, 0, W, 0); r.addColorStop(0, "rgba(255,255,255,.9)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, W, H);
  });
}

/* Cielo dietro le finestre: nuvole fatte di rumore frattale che si formano, si sfaldano e scorrono col vento. */
const SKY_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FS = `
uniform float uTime; uniform vec2 uSize; varying vec2 vUv;
float hash(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = .5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * noise(p); p = p * 2.02 + vec3(1.7, 9.2, 3.1); a *= .5; } return s; }
void main(){
  vec2 uv = vUv; float y = uv.y, asp = uSize.x / uSize.y;
  vec3 zen = vec3(.27, .55, .87), hor = vec3(.80, .90, .98);
  vec3 sky = mix(hor, zen, pow(smoothstep(.12, 1.0, y), .75));
  float sd = length(vec2((uv.x - .82) * asp, y - .86));
  sky += vec3(1.0, .93, .78) * (.45 * exp(-sd * 7.0) + .16 * exp(-sd * 1.6));
  float persp = 1.0 / (y * 1.3 + .3);
  vec3 P = vec3((uv.x - .5) * asp * persp * 3.2 + uTime * .045, persp * 2.4, uTime * .02);
  float w = fbm(P * .6);
  float d = fbm(P * 1.2 + w * .9);
  float cover = smoothstep(.47, .68, d) * smoothstep(.14, .36, y);
  float d2 = fbm((P + vec3(.06, .1, 0.0)) * 1.2 + w * .9);
  float lit = clamp(.62 + (d - d2) * 5.5, 0.0, 1.0);
  vec3 cloud = mix(vec3(.60, .66, .78), vec3(1.0, .99, .97), lit);
  cloud += vec3(1.0, .95, .85) * .22 * exp(-sd * 2.5) * lit;
  cloud = mix(cloud, hor, (1.0 - smoothstep(.15, .6, y)) * .45);
  gl_FragColor = vec4(mix(sky, cloud, cover), 1.0);
}`;

/* =====================================================================
   L'UFFICIO (sfondo di tutta la pagina)
   1 unità = 10 pixel della vecchia pixel art: parete larga 16, alta 5,8.
   ===================================================================== */
function buildOffice(scene){
  const wood = woodTexture("#9A6A44", { seed: 21, w: 512, h: 512 });
  const M = {
    floor: std("#FFFFFF", .55, 0, { map: woodTexture("#6E4F3A", { planks: true }) }),
    wall: std("#FFFFFF", .92, 0, { map: wallTexture() }),
    ceil: std("#2A3560", .9), wain: std("#2B3763", .7), trim: std("#5463A0", .45), reveal: std("#26305A", .8),
    frame: std("#1F2748", .45, .2), sill: std("#CBD3F0", .35),
    desk: std("#FFFFFF", .5, 0, { map: wood }), leg: std("#5A3C24", .6), metal: std("#8A93B8", .32, .7),
    dark: std("#1B1F3B", .35, .2), black: phys("#121320", { roughness: .3, clearcoat: .6 }),
    chair: phys("#2E3550", { roughness: .7, sheen: .8, sheenColor: new THREE.Color("#6070A0") }),
    pot: std("#C0603A", .75), soil: std("#3A2618", 1), leaf: phys("#2FBF6A", { roughness: .45, clearcoat: .3 }), leaf2: phys("#1E9A52", { roughness: .45, clearcoat: .3 }),
    mug: phys("#FF4D5E", { roughness: .25, clearcoat: .8 }), silver: std("#C9CED8", .3, .8),
    cooler: phys("#E6EAF8", { roughness: .4, clearcoat: .3 }), water: phys("#5AB8FF", { roughness: .05, transparent: true, opacity: .55 }),
    lampShade: std("#1F2748", .4, .4), bulb: basic({ color: "#FFE9A8" })
  };
  const add = (...o) => o.forEach(x => scene.add(x));
  const anim = [];

  // pavimento, soffitto, zoccolo e cornice
  const floor = mesh(new THREE.PlaneGeometry(40, 16), M.floor, false, true);
  floor.rotation.x = -Math.PI / 2; at(floor, 8, 0, 7); M.floor.map.repeat.set(5, 2);
  const ceil = mesh(new THREE.PlaneGeometry(40, 16), M.ceil, false, false); ceil.rotation.x = Math.PI / 2; at(ceil, 8, 5.85, 7);
  add(floor, ceil);
  add(at(box(40, .72, .07, M.wain, false), 8, .36, .035), at(box(40, .07, .12, M.trim, false), 8, .74, .06), at(box(40, .14, .09, M.dark, false), 8, .07, .05));
  add(at(box(40, .12, .18, M.trim, false), 8, 5.79, .09), at(box(40, .06, .1, M.trim, false), 8, 5.68, .05));
  const ao = mesh(new THREE.PlaneGeometry(40, 1.4), basic({ map: canvasTex(8, 128, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, "rgba(0,0,0,.35)"); r.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false }), false, false);
  ao.rotation.x = -Math.PI / 2; at(ao, 8, .004, .7); add(ao);

  // parete con due vani finestra veri: dietro ci sono il cielo e la città
  const WINS = [3, 13], WW = 3.8, WH = 2.9, WY = 3.7;
  const wallShape = shapeFrom([[-12, 0], [28, 0], [28, 7], [-12, 7]]);
  WINS.forEach(x => { const h = new THREE.Path(); h.moveTo(x - WW / 2, WY - WH / 2); h.lineTo(x + WW / 2, WY - WH / 2); h.lineTo(x + WW / 2, WY + WH / 2); h.lineTo(x - WW / 2, WY + WH / 2); h.closePath(); wallShape.holes.push(h); });
  M.wall.map.repeat.set(.15, .214);
  add(mesh(new THREE.ShapeGeometry(wallShape), M.wall, false, true));

  const skyMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSize: { value: new THREE.Vector2(30, 7) } }, vertexShader: SKY_VS, fragmentShader: SKY_FS });
  add(at(new THREE.Mesh(new THREE.PlaneGeometry(30, 7), skyMat), 8, 4.4, -3.2));
  anim.push(t => skyMat.uniforms.uTime.value = t);

  const CW = 26, CH = 6.5, nearY0 = .2;
  const far = cityLayer(2, { hMin: .24, hMax: .44, colors: ["#8EA4D6", "#9BB0DE", "#A7BAE3"], light: .04, haze: .25 });
  const near = cityLayer(1, { hMin: .2, hMax: .5, colors: ["#5B6CA8", "#4A5A94", "#6C7DB8", "#56659F"], light: .22, dynamic: .07 });
  add(at(mesh(new THREE.PlaneGeometry(CW, CH), basic({ map: far.tex, transparent: true }), false, false), 8, 1.0 + CH / 2, -2.5));
  add(at(mesh(new THREE.PlaneGeometry(CW, CH), basic({ map: near.tex, transparent: true }), false, false), 8, nearY0 + CH / 2, -1.3));
  // finestre dei palazzi che si accendono e si spengono
  const lights = near.wins.filter((_, i) => i % 2 === 0).slice(0, 40).map(r => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r.w / near.W * CW, r.h / near.H * CH), basic({ color: "#FFE27A" }));
    at(m, 8 - CW / 2 + (r.x + r.w / 2) / near.W * CW, nearY0 + (1 - (r.y + r.h / 2) / near.H) * CH, -1.29);
    m.visible = Math.random() < .5; add(m); return m;
  });
  let litT = 0;
  anim.push((t, dt) => { litT -= dt; if (litT < 0 && lights.length){ litT = rand(.3, 1.3); const m = lights[Math.floor(Math.random() * lights.length)]; m.visible = !m.visible; } });

  // stormo di uccelli che passa ogni tanto
  const birdMat = basic({ color: "#2A3550", side: THREE.DoubleSide });
  const wingGeo = new THREE.BufferGeometry(); wingGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, -1, .12, -.35, -.25, 0, .3], 3));
  const flock = new THREE.Group(); flock.visible = false; add(flock);
  const birds = [[0, 0], [-.55, .2], [-.95, -.14], [-1.45, .28], [-1.85, .04]].map(([x, y], i) => {
    const b = new THREE.Group(), l = new THREE.Mesh(wingGeo, birdMat), r = new THREE.Mesh(wingGeo, birdMat); r.scale.x = -1;
    b.add(l, r); at(b, x, y, 0); b.scale.setScalar(.09); b.userData = { l, r, ph: i * 1.3 }; flock.add(b); return b;
  });
  let flockT = rand(3, 7), flockS = -1;
  anim.push((t, dt) => {
    if (flockS < 0){ flockT -= dt; if (flockT < 0){ flockS = 0; flock.visible = true; flock.userData = { dir: Math.random() < .5 ? 1 : -1, y: rand(3.7, 4.7) }; } return; }
    flockS += dt; const { dir, y } = flock.userData;
    at(flock, dir > 0 ? -3 + flockS * 2.6 : 19 - flockS * 2.6, y + Math.sin(flockS * 1.3) * .15, -2.0); flock.scale.x = dir;
    birds.forEach(b => { const a = Math.sin(t * 11 + b.userData.ph) * .8; b.userData.l.rotation.z = a; b.userData.r.rotation.z = -a; });
    if (flockS > 9.5){ flockS = -1; flock.visible = false; flockT = rand(9, 18); }
  });
  // aereo lontano con la scia
  const plane = group(mesh(new THREE.CapsuleGeometry(.025, .26, 4, 8), basic({ color: "#F4F7FF" }), false, false),
    at(box(.04, .01, .32, basic({ color: "#DDE3F5" }), false), 0, 0, 0), at(box(.02, .08, .05, basic({ color: "#DDE3F5" }), false), .12, .04, 0));
  plane.children[0].rotation.z = Math.PI / 2;
  const trail = mesh(new THREE.PlaneGeometry(1, .035), basic({ map: trailTexture(), transparent: true, depthWrite: false }), false, false);
  const flight = group(plane, trail); flight.visible = false; add(flight);
  let planeT = rand(6, 12), planeS = -1;
  anim.push((t, dt) => {
    if (planeS < 0){ planeT -= dt; if (planeT < 0){ planeS = 0; flight.visible = true; } return; }
    planeS += dt; const x = 19.5 - planeS * .7, y = 5.15 - planeS * .015;
    at(plane, x, y, -3.0); const len = Math.min(5, planeS * .7); trail.scale.x = len; at(trail, x + .15 + len / 2, y, -3.0);
    if (planeS > 35){ planeS = -1; flight.visible = false; planeT = rand(18, 34); }
  });
  // vani, vetri, telai, davanzali
  const glassTex = canvasTex(256, 256, (g, W, H) => {
    const r = g.createLinearGradient(0, 0, W, H); r.addColorStop(0, "rgba(255,255,255,0)"); r.addColorStop(.45, "rgba(255,255,255,.14)"); r.addColorStop(.52, "rgba(255,255,255,0)"); r.addColorStop(.62, "rgba(255,255,255,.09)"); r.addColorStop(.7, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, W, H);
  });
  WINS.forEach(x => {
    const cy = WY, d = .45, t = .2, fd = .22;
    add(at(box(.05, WH, d, M.reveal, false), x - WW / 2 - .025, cy, -d / 2), at(box(.05, WH, d, M.reveal, false), x + WW / 2 + .025, cy, -d / 2),
      at(box(WW, .05, d, M.reveal, false), x, cy + WH / 2 + .025, -d / 2), at(box(WW, .05, d, M.sill, false), x, cy - WH / 2 - .025, -d / 2));
    add(at(mesh(new THREE.PlaneGeometry(WW, WH), basic({ map: glassTex, transparent: true, depthWrite: false }), false, false), x, cy, -.22));
    add(at(box(WW + 2 * t, t, fd, M.frame), x, cy + WH / 2 + t / 2, fd / 2), at(box(WW + 2 * t, t, fd, M.frame), x, cy - WH / 2 - t / 2, fd / 2),
      at(box(t, WH, fd, M.frame), x - WW / 2 - t / 2, cy, fd / 2), at(box(t, WH, fd, M.frame), x + WW / 2 + t / 2, cy, fd / 2),
      at(box(.1, WH, .08, M.frame), x, cy, -.22), at(box(WW, .1, .08, M.frame), x, cy - .25, -.22),
      at(box(WW + .8, .14, .42, M.sill), x, cy - WH / 2 - t - .07, .2));
  });
  // raggi di sole dalle finestre, con la polvere che ci galleggia
  const beamTex = beamTexture();
  const beams = WINS.map(x => {
    const b = mesh(new THREE.PlaneGeometry(WW * .95, 5.6), basic({ map: beamTex, color: "#FFF1D0", transparent: true, opacity: .15, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), false, false);
    at(b, x + .3, WY - 1.9, 1.7); b.rotation.set(-.62, 0, -.08); add(b); return b;
  });
  anim.push(t => beams.forEach((b, i) => b.material.opacity = .13 + Math.sin(t * .4 + i * 2) * .03));
  const N = 150, dPos = new Float32Array(N * 3), dBase = [];
  for (let i = 0; i < N; i++){ const x = WINS[i % 2], yy = rand(.3, 3.8); dBase.push([x + rand(-1.7, 2.0), yy, clamp((4.1 - yy) * .85 + rand(-.5, .5), .2, 3.4), Math.random() * 10]); }
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ size: .05, map: glowTex(), color: "#FFF4DA", transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.frustumCulled = false; add(dust);
  anim.push(t => {
    for (let i = 0; i < N; i++){ const [x, y, z, p] = dBase[i];
      dPos[i * 3] = x + Math.sin(t * .23 + p) * .25; dPos[i * 3 + 1] = y + Math.sin(t * .17 + p * 1.7) * .2 + ((t * .03 + p) % 1) * .1; dPos[i * 3 + 2] = z + Math.cos(t * .19 + p) * .2; }
    dGeo.attributes.position.needsUpdate = true;
  });

  // lavagna con il grafico e i post-it (uno si muove con l'aria)
  add(at(mesh(new THREE.PlaneGeometry(4.2, 2.45), std("#FFFFFF", .25, 0, { map: boardTexture() }), false, true), 8, 3.85, .05));
  [[8, 5.13, 4.4, .1], [8, 2.57, 4.4, .1], [5.85, 3.85, .1, 2.66], [10.15, 3.85, .1, 2.66]].forEach(([x, y, w, h]) => add(at(box(w, h, .12, M.metal), x, y, .06)));
  add(at(box(4.0, .07, .22, M.metal), 8, 2.5, .14));
  ["#1B1F3B", "#D9488F", "#1FB876"].forEach((c, i) => { const m = mesh(new THREE.CylinderGeometry(.035, .035, .34, 8), std(c, .4)); m.rotation.z = Math.PI / 2; add(at(m, 7.2 + i * .45, 2.57, .18)); });
  [[8.75, 4.55, "#FFD23F", .08], [9.45, 4.45, "#FF8FB3", -.1], [8.95, 3.68, "#7CF0B0", .05], [9.6, 3.6, "#FFD23F", -.06]].forEach(([x, y, c, r], i) => {
    const n = box(.55, .55, .02, std(c, .8), false); n.rotation.z = r;
    if (i === 1){ const p = new THREE.Group(); at(p, x, y + .27, .08); n.position.y = -.27; p.add(n); add(p); anim.push(t => p.rotation.x = Math.sin(t * 2.3) * .16 + Math.sin(t * 5.3) * .05); }
    else add(at(n, x, y, .07));
  });

  // orologio vero: segna l'ora del dispositivo
  const clock = new THREE.Group(); at(clock, 8, 5.5, .06);
  const face = mesh(new THREE.CylinderGeometry(.36, .36, .06, 40), [std("#1F2748", .4), std("#FFFFFF", .4, 0, { map: clockFace() }), std("#1F2748", .4)]);
  face.rotation.x = Math.PI / 2; clock.add(face, mesh(new THREE.TorusGeometry(.37, .045, 10, 40), std("#1F2748", .35, .3)));
  const hand = (len, wd, c) => { const p = new THREE.Group(); p.add(at(box(wd, len, .015, std(c, .4), false), 0, len / 2 - .03, 0)); p.position.z = .05; clock.add(p); return p; };
  const hH = hand(.2, .035, "#1B1F3B"), hM = hand(.29, .025, "#1B1F3B"), hS = hand(.31, .01, "#E8364F");
  add(clock);
  anim.push(() => { const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = d.getHours() % 12 + m / 60;
    hS.rotation.z = -Math.floor(s) / 60 * Math.PI * 2; hM.rotation.z = -m / 60 * Math.PI * 2; hH.rotation.z = -h / 12 * Math.PI * 2; });

  // lampade a sospensione che oscillano appena
  const lamps = [5.4, 10.6].map((x, i) => {
    const pivot = new THREE.Group(); at(pivot, x, 5.85, 1.3);
    const shade = mesh(new THREE.LatheGeometry([new THREE.Vector2(.05, .5), new THREE.Vector2(.14, .46), new THREE.Vector2(.3, .22), new THREE.Vector2(.5, 0), new THREE.Vector2(.48, -.02)], 32), M.lampShade);
    shade.material.side = THREE.DoubleSide;
    const light = new THREE.PointLight("#FFD9A0", 5, 7, 2); light.position.y = -1.1;
    pivot.add(at(mesh(new THREE.CylinderGeometry(.012, .012, .9, 6), M.dark, false), 0, -.45, 0), at(shade, 0, -1.0, 0),
      at(mesh(new THREE.SphereGeometry(.13, 16, 12), M.bulb, false, false), 0, -.93, 0), at(glow("#FFD38A", 1.6, .55), 0, -1.05, 0), light);
    add(pivot); return { pivot, light, ph: i * 1.7 };
  });
  anim.push(t => lamps.forEach(l => { l.pivot.rotation.z = Math.sin(t * .8 + l.ph) * .03; l.pivot.rotation.x = Math.sin(t * .55 + l.ph) * .02; l.light.intensity = 5 + Math.sin(t * 1.3 + l.ph) * .15; }));

  // scrivanie
  const desk = (cx, w) => {
    const g = group(at(box(w, .1, 1.2, M.desk), cx, 1.2, .72), at(box(w - .2, .5, .04, M.desk), cx, .92, .2));
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => g.add(at(box(.08, 1.15, .08, M.leg), cx + sx * (w / 2 - .12), .575, .72 + sz * .48)));
    add(g);
  };
  desk(2.3, 3.4); desk(13.7, 3.4);

  // scrivania sinistra: monitor con il grafico che scorre, tastiera, tazza fumante, sedia
  const monLive = liveScreen("monitor"), lapLive = liveScreen("sheet");
  anim.push(t => { monLive.update(t); lapLive.update(t); });
  const mon = group(at(box(.5, .03, .28, M.metal), 0, 0, 0), at(box(.07, .42, .05, M.metal), 0, .22, -.06),
    at(mesh(roundedBox(.68, .42, .035, .04), M.black), 0, .62, -.02),
    at(mesh(new THREE.PlaneGeometry(1.26, .74), basic({ map: monLive.tex }), false, false), 0, .62, .018));
  at(mon, 2.0, 1.27, .55); mon.rotation.y = .12; add(mon);
  add(at(glow("#4DE1FF", 1.9, .22), 2.0, 1.9, .7));
  add(at(box(.9, .03, .28, M.dark), 2.05, 1.265, 1.0), at(box(.12, .03, .18, M.dark), 2.8, 1.265, 1.0));
  const mug = group(mesh(new THREE.CylinderGeometry(.09, .08, .2, 20), M.mug), at(mesh(new THREE.TorusGeometry(.06, .016, 8, 16), M.mug), .1, .01, 0));
  at(mug, 3.3, 1.35, .85); add(mug);
  const steam = [0, 1, 2].map(i => { const s = glow("#FFFFFF", .2, 0, false); s.userData.p = i / 3; add(s); return s; });
  anim.push(t => steam.forEach(s => { const k = (t * .32 + s.userData.p) % 1;
    at(s, 3.3 + Math.sin(k * 6 + s.userData.p * 9) * .05, 1.5 + k * .6, .85); s.scale.setScalar(.08 + k * .3); s.material.opacity = Math.sin(k * Math.PI) * .3; }));
  const chair = new THREE.Group();
  chair.add(at(mesh(roundedBox(.27, .05, .26, .04), M.chair), 0, .62, 0), at(mesh(roundedBox(.26, .3, .04, .04), M.chair), 0, 1.0, -.25));
  chair.add(at(mesh(new THREE.CylinderGeometry(.03, .03, .5, 10), M.metal), 0, .36, 0), at(mesh(new THREE.CylinderGeometry(.02, .02, .3, 8), M.metal), 0, .78, -.23));
  for (let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2, arm = box(.36, .04, .05, M.dark); arm.rotation.y = a; at(arm, Math.cos(a) * .17, .1, -Math.sin(a) * .17); chair.add(arm, at(mesh(new THREE.SphereGeometry(.04, 8, 6), M.black), Math.cos(a) * .34, .04, -Math.sin(a) * .34)); }
  at(chair, 4.75, 0, 1.55); add(chair);
  anim.push(t => chair.rotation.y = -2.3 + Math.sin(t * .35) * .3);

  // pianta (sansevieria) che si muove con l'aria
  const pot = mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(.24, 0), new THREE.Vector2(.3, .5), new THREE.Vector2(.33, .52), new THREE.Vector2(.33, .58), new THREE.Vector2(0, .58)], 28), M.pot);
  const plant = group(pot, at(mesh(new THREE.CylinderGeometry(.29, .29, .02, 20), M.soil, false), 0, .55, 0));
  const PR = rng(4), leaves = [];
  for (let i = 0; i < 9; i++){
    const hgt = .8 + PR() * .9, leaf = mesh(new THREE.SphereGeometry(1, 12, 10), i % 2 ? M.leaf : M.leaf2);
    leaf.scale.set(.07, hgt / 2, .022); const a = i / 9 * Math.PI * 2;
    leaf.position.set(Math.cos(a) * .12, .55 + hgt / 2, Math.sin(a) * .1); leaf.rotation.set(Math.sin(a) * .25, a, Math.cos(a) * .25);
    leaf.userData = { rx: leaf.rotation.x, rz: leaf.rotation.z }; plant.add(leaf); leaves.push(leaf);
  }
  at(plant, 5.45, 0, .55); add(plant);
  anim.push(t => leaves.forEach((l, i) => { l.rotation.x = l.userData.rx + Math.sin(t * 1.1 + i) * .03; l.rotation.z = l.userData.rz + Math.sin(t * .9 + i * 1.3) * .035; }));

  // scrivania destra: portatile con il foglio di calcolo, libri
  const lap = new THREE.Group();
  lap.add(at(box(1.0, .03, .68, M.silver), 0, 0, 0));
  const lid = group(at(box(1.0, .66, .02, M.silver), 0, .33, 0), at(mesh(new THREE.PlaneGeometry(.92, .58), basic({ map: lapLive.tex }), false, false), 0, .33, .012));
  at(lid, 0, .015, -.33); lid.rotation.x = -.28; lap.add(lid);
  at(lap, 13.3, 1.27, .78); lap.rotation.y = -.15; add(lap);
  [["#FF9F1C", .62], ["#D9488F", .55], ["#4DE1FF", .7], ["#FFD23F", .5]].forEach(([c, h], i) => {
    const b = box(.16, h, .44, phys(c, { roughness: .55, clearcoat: .2 })); b.rotation.z = i === 3 ? .18 : 0; add(at(b, 14.55 + i * .18, 1.25 + h / 2, .55));
  });

  // erogatore d'acqua con le bolle
  const cool = group(at(mesh(roundedBox(.27, .5, .24, .06), M.cooler), 0, .5, 0), at(box(.14, .06, .03, std("#E8364F", .4)), -.06, .78, .24), at(box(.14, .06, .03, std("#4D7DFF", .4)), .08, .78, .24),
    at(mesh(new THREE.CylinderGeometry(.2, .2, .55, 24), M.water), 0, 1.3, 0), at(mesh(new THREE.CylinderGeometry(.08, .1, .08, 16), std("#4D7DFF", .4)), 0, 1.03, 0));
  at(cool, 10.65, 0, .45); add(cool);
  const bubbleMat = basic({ color: "#E2F4FF", transparent: true, opacity: .85 });
  const bubbles = Array.from({ length: 7 }, () => { const b = mesh(new THREE.SphereGeometry(.022, 8, 6), bubbleMat, false, false); b.userData = { p: Math.random(), x: rand(-.12, .12), z: rand(-.12, .12), s: rand(.8, 1.3) }; add(b); return b; });
  let glug = rand(3, 6), burst = 0;
  anim.push((t, dt) => {
    glug -= dt; if (glug < 0){ burst = 1.3; glug = rand(5, 10); } burst = Math.max(0, burst - dt);
    bubbles.forEach((b, i) => { const k = (t * (burst ? .9 : .22) * b.userData.s + b.userData.p) % 1; at(b, 10.65 + b.userData.x, 1.06 + k * .5, .45 + b.userData.z); b.visible = burst > 0 || i < 2; });
  });

  // tappeto
  const rug = mesh(roundedBox(2.8, .012, 1.3, .012), [std("#4B3F7A", .95), std("#4B3F7A", .95), std("#FFFFFF", .95, 0, { map: rugTexture() }), std("#4B3F7A", .95), std("#4B3F7A", .95), std("#4B3F7A", .95)], false, true);
  at(rug, 8, .012, 3.4); add(rug);

  // aeroplanino di carta che attraversa la stanza ogni tanto
  const ppGeo = new THREE.BufferGeometry();
  ppGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, .35, -.2, .02, -.25, 0, 0, -.2, 0, 0, .35, 0, 0, -.2, .2, .02, -.25, 0, 0, .35, 0, -.07, -.18, 0, 0, -.2], 3));
  ppGeo.computeVertexNormals();
  const pp = mesh(ppGeo, std("#FFFFFF", .6, 0, { side: THREE.DoubleSide }), false, false); pp.visible = false; add(pp);
  const ppPath = new THREE.CatmullRomCurve3([[17, 3.4, 1.0], [13, 3.9, 2.0], [8, 3.0, 3.2], [3.5, 2.4, 4.4], [-2, 2.0, 5.2]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const ppNext = new THREE.Vector3();
  let ppT = rand(8, 14), ppS = -1;
  anim.push((t, dt) => {
    if (ppS < 0){ ppT -= dt; if (ppT < 0){ ppS = 0; pp.visible = true; } return; }
    ppS += dt / 6.5; if (ppS >= 1){ ppS = -1; pp.visible = false; ppT = rand(22, 38); return; }
    ppPath.getPointAt(ppS, pp.position); ppPath.getPointAt(Math.min(1, ppS + .01), ppNext); pp.lookAt(ppNext); pp.rotateZ(Math.sin(ppS * 12) * .35);
  });

  return { tick(t, dt){ anim.forEach(f => f(t, dt)); } };
}

/* =====================================================================
   NEXI
   Coordinate locali: piedi a y = 0, larghezza 16 unità come nella
   pixel art (1 unità = 1 pixel di Nexi).
   ===================================================================== */
const BODY = { hx: 6.0, hy: 4.2, hz: 4.4, r: 2.3, cy: 5.8 };
const JACKET = { hx: 6.3, hy: 1.65, hz: 4.75, r: .6, cy: 3.1 };
/* Punto e normale sulla faccia anteriore del corpo, per incollarci occhi, bocca, guance. */
function onBody(x, y, lift = 0){
  const { hx, hy, hz, r, cy } = BODY, ex = hx - r, ey = hy - r, ez = hz - r;
  const yy = y - cy, dx = x - clamp(x, -ex, ex), dy = yy - clamp(yy, -ey, ey);
  const dz = Math.sqrt(Math.max(0, r * r - dx * dx - dy * dy));
  const nrm = new THREE.Vector3(dx, dy, dz).normalize();
  return { pos: new THREE.Vector3(x, y, ez + dz).addScaledVector(nrm, lift), nrm };
}
function stick(o, x, y, lift = 0){ const { pos, nrm } = onBody(x, y, lift); o.position.copy(pos); o.quaternion.setFromUnitVectors(Z_AXIS, nrm); return o; }

const EXPR = {
  idle:   { eyes: "o", mouth: "smile" },
  happy:  { eyes: "^", mouth: "smile" },
  cheer:  { eyes: "^", mouth: "smile", L: "up", R: "up" },
  wave:   { eyes: "^", mouth: "smile", R: "up", wave: true },
  proud:  { eyes: "^", mouth: "grin", R: "up" },
  think:  { eyes: "o", look: [.45, .4], mouth: "line", R: "chin" },
  wow:    { eyes: "o", big: 1.2, mouth: "O" },
  worried:{ eyes: "o", brows: "worried", mouth: "wavy", L: "chin", R: "chin" },
  sad:    { eyes: "o", look: [0, -.4], brows: "worried", mouth: "frown", tear: true },
  angry:  { eyes: "o", squint: .72, look: [0, -.35], brows: "angry", mouth: "lineWide", angry: true },
  scared: { eyes: "o", big: 1.2, brows: "scared", mouth: "o", L: "up", R: "up" },
  doubt:  { eyes: "o", brows: "doubt", mouth: "line" },
  sleepy: { eyes: "-", mouth: "o" },
  kpmg:   { eyes: "o", mouth: "smile", glasses: true }
};
const MOVE3D = { proud: "bounce", cheer: "bounce", happy: "bounce", worried: "shake", scared: "shake", angry: "stomp", sad: "droop", sleepy: "droop", think: "tilt", doubt: "tilt" };
const POSE = { down: { z: .3, x: 0 }, up: { z: 2.75, x: .2 }, chin: { z: 3.3, x: 1.2 } };

function buildNexi(){
  const M = {
    body: phys("#FFF1DC", { roughness: .42, clearcoat: .35, clearcoatRoughness: .45 }),
    suit: phys("#1E2030", { roughness: .62, sheen: 1, sheenColor: new THREE.Color("#5A6488"), sheenRoughness: .55 }),
    shirt: std("#F7F5F0", .5),
    bow: phys("#E8364F", { roughness: .3, clearcoat: .6 }), bowD: phys("#A81E33", { roughness: .35, clearcoat: .5 }),
    eye: phys("#1E120E", { roughness: .12, clearcoat: 1, clearcoatRoughness: .08 }), shine: basic({ color: "#FFFFFF" }),
    mouth: phys("#3A1414", { roughness: .3, clearcoat: .6 }), tongue: phys("#E8364F", { roughness: .4 }),
    blush: std("#FF8FA3", .85, 0, { transparent: true, opacity: .72, depthWrite: false }),
    shoe: phys("#15161F", { roughness: .25, clearcoat: .8 }), stalk: std("#E2C49C", .5),
    spark: std("#FFD23F", .4, 0, { emissive: new THREE.Color("#FFB000"), emissiveIntensity: 1.2 }),
    tear: phys("#5AB8FF", { roughness: .05, clearcoat: 1, transparent: true, opacity: .9 }),
    fez: phys("#C8102E", { roughness: .55, sheen: .6, sheenColor: new THREE.Color("#FF6A7A") }), glasses: phys("#16171F", { roughness: .2, clearcoat: 1 })
  };
  const root3 = new THREE.Group(), rig = new THREE.Group(), torso = new THREE.Group();
  root3.add(rig); rig.add(torso);

  torso.add(at(mesh(roundedBox(BODY.hx, BODY.hy, BODY.hz, BODY.r), M.body), 0, BODY.cy, 0));
  torso.add(at(mesh(roundedBox(JACKET.hx, JACKET.hy, JACKET.hz, JACKET.r), M.suit), 0, JACKET.cy, 0));
  // pettorina, bottoni, papillon
  const bib = mesh(new THREE.ExtrudeGeometry(shapeFrom([[-1.45, 4.42], [1.45, 4.42], [1.45, 3.75], [1.0, 3.75], [1.0, 1.75], [-1.0, 1.75], [-1.0, 3.75], [-1.45, 3.75]]),
    { depth: .05, bevelEnabled: true, bevelThickness: .03, bevelSize: .05, bevelSegments: 2 }), M.shirt);
  bib.position.z = JACKET.hz - .03; torso.add(bib);
  [3.1, 2.3].forEach(y => torso.add(at(mesh(new THREE.SphereGeometry(.2, 12, 10), M.shoe), 0, y, JACKET.hz + .1)));
  const wingGeo = new THREE.SphereGeometry(1, 22, 16);
  [-1, 1].forEach(s => { const w = mesh(wingGeo, M.bow); w.scale.set(1.08, .72, .5); w.rotation.z = s * -.18; torso.add(at(w, s * 1.05, 4.5, JACKET.hz + .38)); });
  const knot = mesh(new THREE.SphereGeometry(.44, 16, 12), M.bowD); knot.scale.set(1, .92, .85); torso.add(at(knot, 0, 4.5, JACKET.hz + .62));

  // occhi: tondi lucidi, ad arco (^) o chiusi (-)
  const eyeGeo = new THREE.SphereGeometry(1, 28, 20);
  const makeEye = () => {
    const g = new THREE.Group(), ball = mesh(eyeGeo, M.eye, false, false); ball.scale.set(1, 1.05, .42); g.add(ball);
    g.add(at(mesh(new THREE.SphereGeometry(.27, 12, 10), M.shine, false, false), -.32, .42, .36), at(mesh(new THREE.SphereGeometry(.12, 10, 8), M.shine, false, false), .32, -.36, .38));
    return g;
  };
  const eyes = [makeEye(), makeEye()];
  const arcGeo = new THREE.TorusGeometry(.78, .22, 10, 24, Math.PI), lineGeo = new THREE.CapsuleGeometry(.17, 1.5, 4, 10);
  const happy = [0, 1].map(() => mesh(arcGeo, M.eye, false, false)), shut = [0, 1].map(() => { const m = mesh(lineGeo, M.eye, false, false); m.rotation.z = Math.PI / 2; return group(m); });
  const eyeHolders = [0, 1].map(i => { const h = group(eyes[i], happy[i], shut[i]); h.userData.base = new THREE.Vector3(); torso.add(h); return h; });
  // sopracciglia
  const browGeo = new THREE.CapsuleGeometry(.24, 1.0, 4, 10);
  const brows = [0, 1].map(() => { const m = mesh(browGeo, M.eye, false, false); m.rotation.z = Math.PI / 2; const h = group(m); torso.add(h); return h; });
  // bocche
  const smile = mesh(new THREE.TorusGeometry(.72, .17, 10, 22, Math.PI), M.mouth, false, false); smile.rotation.z = Math.PI;
  const frown = at(mesh(new THREE.TorusGeometry(.62, .17, 10, 22, Math.PI), M.mouth, false, false), 0, -.35, 0);
  const line = mesh(new THREE.CapsuleGeometry(.16, 1.2, 4, 10), M.mouth, false, false); line.rotation.z = Math.PI / 2;
  const lineWide = mesh(new THREE.CapsuleGeometry(.17, 2.0, 4, 10), M.mouth, false, false); lineWide.rotation.z = Math.PI / 2;
  const bigO = mesh(new THREE.SphereGeometry(1, 20, 14), M.mouth, false, false); bigO.scale.set(.68, .6, .28);
  const smallO = mesh(new THREE.SphereGeometry(1, 16, 12), M.mouth, false, false); smallO.scale.set(.42, .4, .24);
  const wavy = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-1.1, 0], [-.55, .26], [0, 0], [.55, .26], [1.1, 0]].map(([x, y]) => new THREE.Vector3(x, y, 0))), 30, .14, 8), M.mouth, false, false);
  const grinShape = new THREE.Shape(); grinShape.moveTo(-1.35, 0); grinShape.lineTo(1.35, 0); grinShape.absarc(0, 0, 1.35, 0, Math.PI, true);
  const grin = group(mesh(new THREE.ExtrudeGeometry(grinShape, { depth: .1, bevelEnabled: true, bevelThickness: .05, bevelSize: .06, bevelSegments: 2, curveSegments: 20 }), M.mouth, false, false));
  const tongue = mesh(new THREE.SphereGeometry(1, 16, 10), M.tongue, false, false); tongue.scale.set(.62, .34, .12); grin.add(at(tongue, 0, -.82, .14));
  grin.position.y = .45;
  const mouths = { smile, frown, line, lineWide, O: bigO, o: smallO, wavy, grin };
  const mouthHolder = group(...Object.values(mouths)); torso.add(stick(mouthHolder, 0, 6.3, .02));
  // guance, lacrima, occhiali (easter egg)
  const cheekGeo = new THREE.SphereGeometry(1, 18, 12);
  [-1, 1].forEach(s => { const c = mesh(cheekGeo, M.blush, false, false); c.scale.set(.95, .52, .2); torso.add(stick(c, s * 4.55, 6.05, -.04)); });
  const tear = dropMesh(M.tear, .85); const tearHolder = group(tear); torso.add(stick(tearHolder, -3.25, 5.75, .15));
  const glasses = new THREE.Group();
  [-1, 1].forEach(s => {
    const f = (w, h, x, y) => glasses.add(at(box(w, h, .22, M.glasses, false), s * 3 + x, y, 0));
    f(3.2, .42, 0, 1.25); f(3.2, .42, 0, -1.25); f(.42, 2.9, -1.4, 0); f(.42, 2.9, 1.4, 0);
    glasses.add(at(box(1.9, .3, .22, M.glasses, false), s * 5.5, .55, -1.1));
  });
  glasses.add(at(box(1.6, .3, .22, M.glasses, false), 0, .55, 0));
  glasses.position.set(0, 7.55, BODY.hz + .55); torso.add(glasses);

  // braccia
  const armGeo = new THREE.CapsuleGeometry(.72, 1.7, 6, 14), handGeo = new THREE.SphereGeometry(.88, 20, 14);
  const arms = [-1, 1].map(s => {
    const p = new THREE.Group(); p.position.set(s * 6.2, 5.0, .4);
    p.add(at(mesh(armGeo, M.suit), 0, -1.3, 0), at(mesh(handGeo, M.body), 0, -2.7, 0));
    p.userData = { s, z: POSE.down.z, x: 0, pose: POSE.down, ov: null }; torso.add(p); return p;
  });
  // gambe e scarpe
  const legGeo = new THREE.CapsuleGeometry(.78, .55, 6, 14), shoeGeo = new THREE.SphereGeometry(1, 20, 14);
  const legs = [-1, 1].map(s => {
    const hip = new THREE.Group(); hip.position.set(s * 3.1, 1.75, .2);
    const shoe = mesh(shoeGeo, M.shoe); shoe.scale.set(1.0, .55, 1.35);
    hip.add(at(mesh(legGeo, M.suit), 0, -.55, 0), at(shoe, 0, -1.2, .35)); rig.add(hip); return hip;
  });
  // antenna con la scintilla, o il fez
  const antenna = group(at(mesh(new THREE.CylinderGeometry(.17, .22, 2.4, 12), M.stalk), .5, 10.9, 0), at(mesh(new THREE.SphereGeometry(.72, 20, 14), M.spark), .5, 12.45, 0));
  const sparkGlow = at(glow("#FFD23F", 4.6, .5), .5, 12.45, .2); antenna.add(sparkGlow);
  const fez = group(at(mesh(new THREE.CylinderGeometry(2.0, 2.55, 2.5, 30), M.fez), 0, 10.9, 0), at(mesh(new THREE.CylinderGeometry(.08, .08, 1.6, 6), M.glasses), 1.1, 11.6, .2));
  fez.add(at(mesh(new THREE.SphereGeometry(.32, 10, 8), M.glasses), 1.7, 10.9, .3)); fez.children[1].rotation.z = -1.1;
  torso.add(antenna, fez); fez.visible = false;

  const state = { base: "idle", fez: false, faceNow: "", move: "bob", e: EXPR.idle, blinkT: 2 + Math.random() * 3, blink: 0, tearT: 0, look: new THREE.Vector2(), lookT: new THREE.Vector2() };
  /* Espressione del trivia (temp = false) o faccia momentanea dei gesti (temp = true). */
  function setExpr(expr, fezOn, temp = false){
    const e = EXPR[expr] || EXPR.idle;
    if (!temp){ state.base = expr; state.fez = !!fezOn; state.move = MOVE3D[expr] || "bob"; }
    state.e = e; state.faceNow = expr;
    const big = e.big || 1, sq = e.squint || 1, [lx, ly] = e.look || [0, 0];
    [-1, 1].forEach((s, i) => {
      stick(eyeHolders[i], s * 3.0 + lx, 7.45 + ly); eyeHolders[i].userData.base.copy(eyeHolders[i].position);
      eyes[i].visible = e.eyes === "o"; happy[i].visible = e.eyes === "^"; shut[i].visible = e.eyes === "-";
      eyes[i].scale.set(big, big * sq, 1);
    });
    // sopracciglia: [inclinazione verso il centro, spostamento in alto]
    const BROW = { worried: [.3, .1], angry: [-.42, -.25], scared: [.08, .55] };
    [-1, 1].forEach((s, i) => {
      const h = brows[i]; h.visible = !!e.brows;
      if (!e.brows) return;
      const [tilt, dy] = e.brows === "doubt" ? [0, i ? .6 : 0] : BROW[e.brows];
      stick(h, s * 3.0, 8.95 + dy, .14);
      h.rotateZ(-s * tilt);
    });
    Object.entries(mouths).forEach(([k, m]) => m.visible = k === e.mouth);
    M.blush.color.set(e.angry ? "#FF4D5E" : "#FF8FA3"); M.blush.opacity = e.angry ? .85 : .72;
    tearHolder.visible = !!e.tear; glasses.visible = !!e.glasses;
    arms[0].userData.pose = POSE[e.L || "down"]; arms[1].userData.pose = POSE[e.R || "down"];
    antenna.visible = !state.fez; fez.visible = state.fez;
  }
  function face(expr){ const want = expr || state.base; if (want !== state.faceNow) setExpr(want, state.fez, true); }
  setExpr("idle");

  /* Animazioni continue: braccia, occhi che seguono il puntatore, ciglia, lacrima, antenna. */
  const tmp = new THREE.Vector3();
  function animate(t, dt, walking){
    const e = state.e || EXPR.idle;
    arms.forEach((a, i) => {
      const p = a.userData.ov || a.userData.pose || POSE.down; let z = p.z, x = p.x;
      if (!REDUCE_MOTION && !a.userData.ov){
        if (e.wave && i === 1) z += Math.sin(t * 9) * .32;
        if (state.faceNow === "cheer") z += Math.sin(t * 10 + i * Math.PI) * .22;
        if (state.faceNow === "scared") z += Math.sin(t * 40 + i) * .06;
        if (walking && p === POSE.down) x += Math.sin(t * 16 + i * Math.PI) * .45;
      }
      const k = 1 - Math.exp(-dt * 14);
      a.userData.z = lerp(a.userData.z, z, k); a.userData.x = lerp(a.userData.x, x, k);
      a.rotation.set(a.userData.x, 0, a.userData.s * a.userData.z);
    });
    state.look.lerp(state.lookT, 1 - Math.exp(-dt * 8));
    eyeHolders.forEach(h => h.position.copy(tmp.copy(h.userData.base)).add(tmp.set(state.look.x, state.look.y, 0)));
    if (!REDUCE_MOTION){
      state.blinkT -= dt;
      if (state.blinkT < 0){ state.blink = .14; state.blinkT = 3 + Math.random() * 3; }
      state.blink = Math.max(0, state.blink - dt);
      const k = state.blink > 0 ? .12 : 1, big = e.big || 1, sq = e.squint || 1;
      eyes.forEach(o => o.scale.y = big * sq * k);
      if (tearHolder.visible){ state.tearT = (state.tearT + dt) % 1.6; tear.position.y = -state.tearT * 1.1; tear.scale.setScalar(1 - state.tearT * .25); }
    }
    M.spark.emissiveIntensity = 1.1 + (REDUCE_MOTION ? 0 : Math.sin(t * 5) * .5);
    sparkGlow.material.opacity = .4 + (REDUCE_MOTION ? 0 : Math.sin(t * 5) * .15);
  }
  return { root: root3, rig, torso, legs, arms, setExpr, face, animate, state };
}

/* =====================================================================
   OGGETTI ACCANTO A NEXI (stessi nomi di PROPS in js/trivia.js)
   Ogni oggetto: base a y = 0, alto circa 10 unità.
   ===================================================================== */
const PM = () => ({
  dark: phys("#1B1F3B", { roughness: .3, clearcoat: .5 }), grey: std("#8A93B8", .35, .6), white: phys("#FFFFFF", { roughness: .35, clearcoat: .4 }),
  gold: std("#E9B52F", .25, 1), goldD: std("#B8860B", .35, 1), cyan: std("#4DE1FF", .3, 0, { emissive: new THREE.Color("#2AB8E0"), emissiveIntensity: .8 }),
  red: std("#FF4D5E", .3, 0, { emissive: new THREE.Color("#FF2A40"), emissiveIntensity: .9 }), green: phys("#3BE37F", { roughness: .5 }), greenD: phys("#22A85A", { roughness: .5 }),
  brown: phys("#B0703A", { roughness: .55, clearcoat: .2 }), paper: std("#FBFAF5", .7), cover: phys("#E8364F", { roughness: .45, clearcoat: .3 })
});
let PMAT;
const PROP3D = {
  pc(){
    const m = PMAT, g = new THREE.Group(), live = liveScreen("monitor");
    g.add(at(mesh(new THREE.CylinderGeometry(2.0, 2.4, .5, 32), m.grey), 0, .25, 0), at(box(.9, 2.4, .6, m.grey), 0, 1.6, -.4));
    g.add(at(mesh(roundedBox(5.1, 3.5, .45, .35), m.dark), 0, 6.1, 0));
    g.add(at(mesh(new THREE.PlaneGeometry(9.2, 6.0), basic({ map: live.tex }), false, false), 0, 6.1, .47));
    g.add(at(glow("#4DE1FF", 13, .18), 0, 6.1, .6));
    return { g, tick: t => live.update(t) };
  },
  ai(){
    const m = PMAT, g = new THREE.Group();
    g.add(at(mesh(roundedBox(2.6, .6, 1.6, .5), m.dark), 0, .6, 0), at(mesh(new THREE.CylinderGeometry(.6, .8, 1.2, 16), m.grey), 0, 1.7, 0));
    g.add(at(mesh(roundedBox(4.0, 3.5, 2.3, 1.0), m.grey), 0, 5.9, 0), at(mesh(roundedBox(3.1, 2.2, .15, .6), m.dark), 0, 6.1, 2.2));
    const eyesAI = [-1.25, 1.25].map(x => at(mesh(new THREE.SphereGeometry(.55, 16, 12), m.cyan, false, false), x, 6.6, 2.35));
    eyesAI.forEach(e => { e.scale.z = .4; g.add(e); });
    g.add(at(box(2.4, .4, .1, m.cyan, false), 0, 5.2, 2.36));
    g.add(at(mesh(new THREE.CylinderGeometry(.18, .18, 2.2, 8), m.grey), 0, 10.4, 0));
    const bulb = at(mesh(new THREE.SphereGeometry(.65, 16, 12), m.red), 0, 11.8, 0), bg = at(glow("#FF4D5E", 4, .5), 0, 11.8, .3); g.add(bulb, bg);
    [-1, 1].forEach(s => g.add(at(mesh(new THREE.SphereGeometry(.9, 14, 10), m.grey), s * 4.3, 6.2, 0)));
    return { g, tick: t => { const on = Math.floor(t * 4) % 2 === 0; bulb.visible = bg.visible = on; eyesAI.forEach((e, i) => e.scale.setScalar(.85 + Math.sin(t * 7 + i) * .15)); } };
  },
  libro(){
    const m = PMAT, g = new THREE.Group(), pt = pageTexture(), open = new THREE.Group();
    [-1, 1].forEach(s => {
      const side = new THREE.Group(); side.rotation.y = s * -.32;
      side.add(at(box(5.0, 6.6, .35, m.cover), s * 2.55, 0, -.25));
      side.add(at(mesh(new THREE.BoxGeometry(4.7, 6.2, .5), [m.paper, m.paper, m.paper, m.paper, std("#FFFFFF", .7, 0, { map: pt }), m.paper]), s * 2.45, 0, .1));
      open.add(side);
    });
    open.rotation.x = -.55; open.position.set(0, 3.5, 0); g.add(open, at(box(9, .6, 3.2, m.dark), 0, .3, -.6));
    return { g, tick: t => open.rotation.z = Math.sin(t * 1.5) * .03 };
  },
  trofeo(){
    const m = PMAT, g = new THREE.Group();
    const cup = mesh(new THREE.LatheGeometry([[0, 0], [1.2, .2], [2.4, 1.4], [3.0, 3.4], [3.1, 4.3], [2.9, 4.3], [2.8, 3.4], [2.2, 1.5], [0, .5]].map(([x, y]) => new THREE.Vector2(x, y)), 40), m.gold);
    cup.material.side = THREE.DoubleSide;
    const top = group(cup, ...[-1, 1].map(s => { const h = mesh(new THREE.TorusGeometry(1.1, .28, 10, 20, Math.PI), m.gold); h.rotation.z = s * Math.PI / 2; h.position.set(s * 2.9, 2.6, 0); return h; }));
    top.position.y = 4.6;
    g.add(at(mesh(roundedBox(2.8, .8, 2.2, .25), m.dark), 0, .8, 0), at(box(2.4, .5, .1, m.gold), 0, .9, 2.22), at(mesh(new THREE.CylinderGeometry(.5, .9, 3.2, 20), m.gold), 0, 3.0, 0), top);
    const sp = at(glow("#FFFFFF", 3.2, .9), -1.8, 8.2, 3.2); g.add(sp);
    return { g, tick: t => { g.rotation.y = Math.sin(t * .8) * .5; sp.material.opacity = Math.max(0, Math.sin(t * 5)) * .9; } };
  },
  bilancia(tilt = 0){
    const m = PMAT, g = new THREE.Group();
    g.add(at(mesh(roundedBox(3.0, .55, 1.6, .4), m.grey), 0, .55, 0), at(mesh(new THREE.CylinderGeometry(.42, .5, 10.8, 16), m.grey), 0, 6.0, 0));
    g.add(at(mesh(new THREE.SphereGeometry(.7, 16, 12), m.gold), 0, 11.6, 0));
    const beam = new THREE.Group(); beam.position.y = 11.6; g.add(beam);
    beam.add(at(box(12, .7, .7, m.gold), 0, 0, 0));
    const pans = [-1, 1].map(s => {
      const pan = new THREE.Group(); pan.position.x = s * 5.6; beam.add(pan);
      [-1, 0, 1].forEach(k => { const c = mesh(new THREE.CylinderGeometry(.05, .05, 4.2, 5), m.goldD, false); c.position.set(k * .9, -2.1, k === 0 ? .8 : -.4); c.rotation.z = -k * .2; pan.add(c); });
      pan.add(at(mesh(new THREE.LatheGeometry([[0, 0], [1.6, .05], [2.0, .55], [1.95, .6], [1.5, .15], [0, .1]].map(([x, y]) => new THREE.Vector2(x, y)), 30), m.goldD), 0, -4.4, 0));
      return pan;
    });
    let t0 = null; const target = THREE.MathUtils.degToRad(tilt);
    const settle = k => k < .4 ? target * 1.6 * (k / .4) : k < .7 ? lerp(target * 1.6, target * .7, (k - .4) / .3) : lerp(target * .7, target, Math.min(1, (k - .7) / .3));
    return { g, tick: t => { if (t0 === null) t0 = t; const k = REDUCE_MOTION ? 1 : Math.min(1, (t - t0) / 1.4); beam.rotation.z = -settle(k) + (REDUCE_MOTION ? 0 : Math.sin(t * 1.7) * .012); pans.forEach(p => p.rotation.z = -beam.rotation.z); } };
  },
  orologio(){
    const m = PMAT, g = new THREE.Group();
    const body = mesh(new THREE.CylinderGeometry(3.3, 3.3, 1.6, 40), [m.white, std("#FFFFFF", .4, 0, { map: clockFace() }), m.white]); body.rotation.x = Math.PI / 2;
    g.add(at(body, 0, 5.6, 0), at(mesh(new THREE.TorusGeometry(3.3, .3, 12, 40), std("#E8364F", .35, .2)), 0, 5.6, .5));
    [-1, 1].forEach(s => { const b = mesh(new THREE.SphereGeometry(1.2, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), PMAT.gold); b.rotation.z = s * .5; g.add(at(b, s * 2.2, 8.6, -.2));
      const l = box(.4, 2.2, .4, m.dark); l.rotation.z = s * -.4; g.add(at(l, s * 2.0, 1.4, 0)); });
    const hand = new THREE.Group(); hand.position.set(0, 5.6, .9); hand.add(at(box(.3, 2.4, .1, m.dark), 0, 1.0, 0)); g.add(hand);
    g.add(at(box(.35, 1.6, .1, m.dark), 0, 6.3, .88), at(mesh(new THREE.SphereGeometry(.4, 12, 10), PMAT.red), 0, 5.6, 1.0));
    return { g, tick: t => { hand.rotation.z = REDUCE_MOTION ? -1 : -Math.floor(t / 1.2 * 8) / 8 * Math.PI * 2; if (!REDUCE_MOTION) g.rotation.z = Math.sin(t * 40) * .015 * (Math.floor(t / 1.2) % 4 === 0 ? 1 : 0); } };
  },
  chat(){
    const m = PMAT, g = new THREE.Group();
    const b1 = group(mesh(roundedBox(4.0, 2.0, .6, .8), m.white), at(mesh(new THREE.ConeGeometry(.7, 1.4, 12), m.white), -2.6, -2.0, 0));
    b1.children[1].rotation.z = .6;
    const dots = [-1.5, 0, 1.5].map(x => { const d = at(mesh(new THREE.SphereGeometry(.45, 12, 10), m.dark), x, 0, .55); b1.add(d); return d; });
    const b2 = group(mesh(roundedBox(4.0, 2.0, .6, .8), std("#4DE1FF", .35)), at(box(5, .6, .1, m.dark), 0, 0, .6), at(mesh(new THREE.ConeGeometry(.7, 1.4, 12), std("#4DE1FF", .35)), 2.7, -2.0, 0));
    b2.children[2].rotation.z = -.6;
    at(b1, -1, 10.5, 0); at(b2, 1.5, 4.8, 1); g.add(b1, b2);
    let t0 = null;
    return { g, tick: t => { if (t0 === null) t0 = t; const k1 = REDUCE_MOTION ? 1 : Math.min(1, (t - t0) / .4), k2 = REDUCE_MOTION ? 1 : clamp((t - t0 - .5) / .4, 0, 1);
      b1.scale.setScalar(k1 * (1 + Math.sin(k1 * Math.PI) * .2)); b2.scale.setScalar(k2 * (1 + Math.sin(k2 * Math.PI) * .2));
      b1.position.y = 10.5 + Math.sin(t * 2) * .3; b2.position.y = 4.8 + Math.sin(t * 2 + 1) * .3;
      if (!REDUCE_MOTION) dots.forEach((d, i) => d.position.y = Math.max(0, Math.sin(t * 6 - i * .9)) * .45); } };
  },
  soldi(){
    const m = PMAT, g = new THREE.Group();
    for (let i = 0; i < 4; i++){ const b = box(7, .55, 3.6, i % 2 ? m.green : m.greenD); b.rotation.y = (i % 2 - .5) * .1; g.add(at(b, -2, .3 + i * .58, 0)); }
    for (let i = 0; i < 4; i++) g.add(at(mesh(new THREE.CylinderGeometry(1.4, 1.4, .5, 26), m.gold), 3.6, .25 + i * .55, .5));
    const fly = at(mesh(new THREE.CylinderGeometry(1.4, 1.4, .5, 26), m.gold), 3.6, 4, .5); fly.rotation.x = Math.PI / 2; g.add(fly);
    return { g, tick: t => { const k = (t % 1.4) / 1.4; fly.position.y = 3 + k * 5; fly.rotation.y = t * 6; fly.visible = !REDUCE_MOTION; } };
  },
  valigia(){
    const m = PMAT, g = new THREE.Group();
    g.add(at(mesh(roundedBox(4.5, 3.0, 1.6, .5), m.brown), 0, 3.0, 0), at(mesh(new THREE.TorusGeometry(1.3, .3, 10, 20, Math.PI), m.dark), 0, 6.0, 0));
    [-1.8, 1.8].forEach(x => g.add(at(box(.6, 6.1, 3.3, m.dark), x, 3.0, 0)));
    return { g, tick(){} };
  },
  scudo(){
    const m = PMAT, g = new THREE.Group();
    g.add(at(mesh(extrude(shapeFrom([[-4, 5], [4, 5], [4, 0], [0, -4.5], [-4, 0]]), .9, .3), std("#4DE1FF", .3, .3)), 0, 5.5, 0));
    g.add(at(box(1.1, 6, 1.4, m.white), 0, 6.2, 0), at(box(5, 1.1, 1.4, m.white), 0, 7.2, 0));
    return { g, tick: t => g.rotation.y = Math.sin(t) * .25 };
  },
  carte(){
    const m = PMAT, g = new THREE.Group();
    for (let i = 0; i < 5; i++) g.add(at(box(9, .6, 6, i % 2 ? std("#DDE3FF", .7) : m.paper), (i % 2) * .5, .3 + i * .65, 0));
    const top = at(box(9, .6, 6, m.paper), 0, 3.6, 0); g.add(top); let t0 = null;
    return { g, tick: t => { if (t0 === null) t0 = t; const k = REDUCE_MOTION ? 1 : Math.min(1, (t - t0) / .8); top.position.y = 3.6 + (1 - k) * 7; top.rotation.z = (1 - k) * .5; } };
  }
};

/* =====================================================================
   EFFETTI SOPRA NEXI (stessi nomi di FX in js/trivia.js)
   Coordinate dell'SVG della pixel art: x a destra, y in basso.
   ===================================================================== */
const FXM = () => ({
  yellow: std("#FFD23F", .35, 0, { emissive: new THREE.Color("#FFC400"), emissiveIntensity: 1.1 }), white: std("#FFFFFF", .35, 0, { emissive: new THREE.Color("#FFFFFF"), emissiveIntensity: .35 }),
  blue: phys("#5AB8FF", { roughness: .05, clearcoat: 1, transparent: true, opacity: .95 }), red: phys("#FF4D5E", { roughness: .25, clearcoat: .8, emissive: new THREE.Color("#C0102A"), emissiveIntensity: .25 }),
  grey: phys("#AEB6D6", { roughness: .9 }), glass: std("#FFF6C8", .1, 0, { emissive: new THREE.Color("#FFD23F"), emissiveIntensity: 1.4, transparent: true, opacity: .95 }), metal: std("#8A93B8", .35, .7)
});
let FMAT;
const P = (x, y) => new THREE.Vector3(x, -y, 0);
function cycleFade(objs, period, fn){ return t => objs.forEach((o, i) => { const k = ((t + (o.userData.d || 0)) % period) / period; fn(o, k, i); }); }
const FX3D = {
  lampadina(){
    const m = FMAT, g = new THREE.Group(), c = P(24.5, 2.6);
    const bulb = at(mesh(new THREE.SphereGeometry(1.7, 24, 18), m.glass, false, false), c.x, c.y, 0);
    const screw = at(mesh(new THREE.CylinderGeometry(.85, .7, 1.2, 16), m.metal, false, false), c.x, c.y - 2.0, 0);
    const halo = at(glow("#FFE27A", 9, .55), c.x, c.y, .5);
    const rays = [[-3.1, 1.2, .8], [3.1, 1.2, -.8], [-3.5, -.6, 1.3], [3.5, -.6, -1.3], [0, 3.0, 0]].map(([x, y, r]) => { const b = at(box(.35, 1.3, .35, m.yellow, false), c.x + x, c.y + y, 0); b.rotation.z = r; return b; });
    g.add(bulb, screw, halo, ...rays);
    return { g, tick: t => { const on = REDUCE_MOTION || Math.floor(t * 4) % 2 === 0; m.glass.emissiveIntensity = on ? 1.6 : .35; halo.visible = on; rays.forEach(r => r.visible = on); } };
  },
  sudore(){
    const m = FMAT, g = new THREE.Group();
    const drops = [[31.5, 10.7, 0], [31, 13.1, .5], [16.9, 11.7, .25]].map(([x, y, d]) => { const o = dropMesh(m.blue, 1); o.position.copy(P(x, y)); o.userData = { y0: o.position.y, d }; g.add(o); return o; });
    return { g, tick: cycleFade(drops, .9, (o, k) => { o.position.y = o.userData.y0 - k * 4; o.scale.setScalar(REDUCE_MOTION ? 1 : 1 - k * .5); }) };
  },
  cuori(){
    const m = FMAT, g = new THREE.Group(), geo = extrude(heartShape(1), .55, .2);
    const hs = [[19.5, 7, 0], [27.5, 6, .7], [31.5, 9, .35]].map(([x, y, d]) => { const o = mesh(geo, m.red, false, false); o.position.copy(P(x, y)); o.userData = { y0: o.position.y, d }; g.add(o); return o; });
    return { g, tick: cycleFade(hs, 1.4, (o, k) => { o.position.y = o.userData.y0 + (REDUCE_MOTION ? 0 : k * 6); o.scale.setScalar(REDUCE_MOTION ? 1 : (k < .15 ? k / .15 : 1 - (k - .15) * .9)); o.rotation.y = Math.sin(k * 6) * .4; }) };
  },
  nuvola(){
    const m = FMAT, g = new THREE.Group(), cloud = new THREE.Group();
    [[-3, 0, 1.6], [-1, .9, 2.0], [1.4, .6, 1.9], [3.2, -.1, 1.5], [0, -.6, 1.7]].forEach(([x, y, r]) => cloud.add(at(mesh(new THREE.SphereGeometry(r, 18, 14), m.grey, false, false), x, y, 0)));
    cloud.position.copy(P(24, 2.6)); g.add(cloud);
    const rain = [[21.2, 6, 0], [24.2, 6.6, .3], [27.2, 6, .6]].map(([x, y, d]) => { const o = dropMesh(m.blue, .7); o.position.copy(P(x, y)); o.userData = { y0: o.position.y, d }; g.add(o); return o; });
    const fall = cycleFade(rain, .9, (o, k) => { o.position.y = o.userData.y0 - k * 4; });
    return { g, tick: t => { cloud.position.x = 24 + (REDUCE_MOTION ? 0 : Math.sin(t * 30) * .25); fall(t); } };
  },
  stelle(){
    const m = FMAT, g = new THREE.Group(), geo = extrude(starShape(1.2, .5), .4, .12);
    const st = [[18.5, 5.5, 0], [31.5, 3.5, .25], [29.5, 9.5, .5]].map(([x, y, d]) => { const o = mesh(geo, m.yellow, false, false); o.position.copy(P(x, y)); o.userData = { d }; g.add(o); return o; });
    return { g, tick: t => st.forEach(o => { const k = (t + o.userData.d) * Math.PI * 2 / .7; o.scale.setScalar(REDUCE_MOTION ? 1 : .55 + Math.abs(Math.sin(k)) * .6); o.rotation.z = t * 1.5; o.rotation.y = Math.sin(t * 2) * .5; }) };
  },
  fulmine(){
    const m = FMAT, g = new THREE.Group();
    const vein = new THREE.Group(); vein.position.copy(P(29.5, 9.5));
    vein.add(box(3, .9, .6, m.red, false), box(.9, 3, .6, m.red, false)); vein.rotation.z = .785;
    const bolt = mesh(extrude(shapeFrom([[0, 2.6], [1.6, 2.6], [.6, .5], [1.8, .5], [-.8, -2.8], [0, -.3], [-1.2, -.3]]), .5, .12), m.yellow, false, false);
    bolt.position.copy(P(19.7, 3)); g.add(vein, bolt);
    return { g, tick: t => { vein.scale.setScalar(REDUCE_MOTION ? 1 : 1 + Math.max(0, Math.sin(t * 15.7)) * .35); bolt.visible = REDUCE_MOTION || Math.floor(t * 4) % 2 === 0; } };
  },
  domanda(){
    const m = FMAT, g = new THREE.Group(), q = new THREE.Group();
    const arc = mesh(new THREE.TorusGeometry(1.25, .45, 12, 26, Math.PI * 1.45), m.white, false, false); arc.rotation.z = -Math.PI * .45;
    q.add(at(arc, 0, 1.4, 0), at(mesh(new THREE.CylinderGeometry(.45, .45, 1.2, 12), m.white, false, false), 0, -.6, 0), at(mesh(new THREE.SphereGeometry(.55, 14, 10), m.white, false, false), 0, -2.3, 0));
    q.position.copy(P(24.5, 3.3)); g.add(q);
    return { g, tick: t => { q.visible = REDUCE_MOTION || Math.floor(t * 4) % 2 === 0; q.rotation.y = Math.sin(t * 2) * .4; } };
  },
  esclama(){
    const m = FMAT, g = new THREE.Group(), e = new THREE.Group();
    e.add(at(mesh(new THREE.CapsuleGeometry(.6, 2.8, 6, 12), m.red, false, false), 0, 1.0, 0), at(mesh(new THREE.SphereGeometry(.62, 14, 10), m.red, false, false), 0, -2.0, 0));
    e.position.copy(P(24.7, 3.4)); g.add(e);
    return { g, tick: t => e.position.x = 24.7 + (REDUCE_MOTION ? 0 : Math.sin(t * 31) * .3) };
  },
  zzz(){
    const m = FMAT, g = new THREE.Group();
    const zed = () => { const z = new THREE.Group(), d = box(.5, 3.4, .5, m.white, false); d.rotation.z = -.95; z.add(at(box(2.8, .55, .5, m.white, false), 0, 1.1, 0), at(box(2.8, .55, .5, m.white, false), 0, -1.1, 0), d); return z; };
    const zs = [[27.5, 6.4, 0], [30.5, 3.4, .7]].map(([x, y, d]) => { const z = zed(); z.position.copy(P(x, y)); z.userData = { y0: z.position.y, x0: z.position.x, d }; g.add(z); return z; });
    return { g, tick: cycleFade(zs, 1.4, (o, k) => { o.position.y = o.userData.y0 + (REDUCE_MOTION ? 0 : k * 5); o.position.x = o.userData.x0 + (REDUCE_MOTION ? 0 : k * 1.5); o.scale.setScalar(REDUCE_MOTION ? 1 : 1 - k * .6); }) };
  }
};

/* =====================================================================
   GESTI DI NEXI QUANDO È FERMO (non cambiano il fumetto né il trivia)
   s = secondi dall'inizio del gesto. Restituiscono spostamenti e pose.
   ===================================================================== */
const ACTS = {
  guarda: { dur: 2.8, f: s => { const yaw = track(s, [[0, 0], [.5, -.7], [1.1, -.7], [1.7, .7], [2.3, .7], [2.8, 0]]); return { yaw, look: [yaw * .45, .05] }; } },
  stiracchia: { dur: 2.4, f: s => { const up = s > .25 && s < 1.7, arm = { z: 2.95, x: .05 };
    return { sy: track(s, [[0, 1], [.8, 1.1], [1.5, 1.1], [1.9, .93], [2.4, 1]]), L: up ? arm : null, R: up ? arm : null, face: s > .4 && s < 1.6 ? "sleepy" : null }; } },
  balletto: { dur: 3.0, f: s => { const e = smooth(0, .3, s) * (1 - smooth(2.6, 3.0, s)), a = Math.sin(s * 8.4);
    return { dx: Math.sin(s * 4.2) * 1.3 * e, dy: Math.abs(a) * .7 * e, rz: Math.sin(s * 4.2) * .08 * e,
      L: e > .1 ? { z: 1.7 + a * .9, x: .15 } : null, R: e > .1 ? { z: 1.7 - a * .9, x: .15 } : null, face: "happy" }; } },
  saluta: { dur: 1.8, f: (s, t) => ({ R: { z: 2.75 + Math.sin(t * 10) * .35, x: .2 }, face: "wave", yaw: 0, look: [0, .05] }) },
  // si nasconde dietro un computer, sbircia di lato, poi fa "cucù" da sopra
  sbircia: { dur: 5.4, f: s => ({
    mon: track(s, [[0, 0], [.45, 1], [3.9, 1], [4.4, 0]]),
    dz: track(s, [[0, 0], [.4, -2.6], [4.2, -2.6], [4.7, 0]]),
    dy: track(s, [[0, 0], [.45, -1.7], [.9, -1.7], [1.3, -.9], [2.0, -.9], [2.4, -1.7], [2.8, -1.7], [3.25, 3.0], [3.85, 3.0], [4.3, 0]]),
    sy: track(s, [[0, 1], [.45, .86], [2.8, .86], [3.1, 1.06], [3.85, 1], [4.3, .9], [4.6, 1]]),
    dx: track(s, [[0, 0], [.6, 0], [1.2, 6.6], [2.0, 6.6], [2.4, 0]]),
    yaw: track(s, [[0, 0], [1.0, 0], [1.3, -.5], [2.0, -.5], [2.3, 0]]),
    look: s > 1.1 && s < 2.1 ? [-.25, .05] : [0, 0],
    face: s < 1.1 ? "think" : s < 2.1 ? "wow" : s < 2.8 ? "think" : s < 4.4 ? "cheer" : null,
    L: s > 2.9 && s < 4.0 ? { z: 2.75, x: .2 } : null, R: s > 2.9 && s < 4.0 ? { z: 2.75, x: .2 } : null
  }) }
};

/* =====================================================================
   STATO DI NEXI LETTO DALL'SVG DELLA PIXEL ART
   ===================================================================== */
const probe = document.createElementNS("http://www.w3.org/2000/svg", "g");
const norm = html => { probe.innerHTML = html; return probe.innerHTML; };
function readProp(html){
  if (!html.trim()) return { kind: "none", tilt: 0 };
  const tm = /--t:\s*(-?[\d.]+)deg/.exec(html), tilt = tm ? +tm[1] : 0;
  try {
    // eslint-disable-next-line no-undef
    for (const k of Object.keys(PROPS)) if (k !== "none" && norm(PROPS[k](tilt)) === html) return { kind: k, tilt };
  } catch (e) {}
  if (/class="beam"/.test(html)) return { kind: "bilancia", tilt };
  if (/fx-spin/.test(html)) return { kind: "orologio", tilt };
  if (/fx-pop/.test(html)) return { kind: "chat", tilt };
  return { kind: "pc", tilt };
}
function readFx(html){
  if (!html.trim()) return [];
  try {
    // eslint-disable-next-line no-undef
    return Object.keys(FX).filter(k => html.includes(norm(FX[k]())));
  } catch (e) { return []; }
}
function readState(){
  const tx = /translateX\((-?[\d.]+)px\)/.exec(els.walker.style.transform || "");
  return {
    expr: els.mood.dataset.expr || "idle", W: tx ? +tx[1] : -8,
    fez: !!els.mood.querySelector(".px-fz"),
    prop: readProp(els.prop.innerHTML), propShift: /translate\(\s*-26/.test(els.prop.getAttribute("transform") || "") ? -26 : 0,
    fx: readFx(els.fx.innerHTML)
  };
}

/* =====================================================================
   AVVIO
   ===================================================================== */
function makeRenderer(canvas, dprMax){
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, dprMax));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1.0;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); giveUp("contesto WebGL perso"); });
  return r;
}
function envFor(renderer, scene, intensity){
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = intensity; pm.dispose();
}

async function init(){
  const test = document.createElement("canvas");
  if (!(test.getContext("webgl2") || test.getContext("webgl"))) return giveUp("WebGL non disponibile");
  const small = Math.min(innerWidth, innerHeight) < 700;
  const clock = new THREE.Clock();
  let alive = true, dirty = true, oDirty = true;
  const visible = () => !document.hidden && root.dataset.vista !== "dashboard";

  /* ---------- Ufficio ---------- */
  const officeCanvas = document.createElement("canvas"); officeCanvas.className = "t3d-office"; officeCanvas.setAttribute("aria-hidden", "true");
  els.office.appendChild(officeCanvas);
  const oR = makeRenderer(officeCanvas, small ? 1.25 : 1.5);
  oR.shadowMap.autoUpdate = false;   // le ombre della stanza si ricalcolano due volte al secondo, non a ogni fotogramma
  const oScene = new THREE.Scene(); oScene.background = new THREE.Color("#3A4A7A");
  envFor(oR, oScene, .35);
  oScene.add(new THREE.HemisphereLight("#CFE0FF", "#7A5A40", .9));
  const key = new THREE.DirectionalLight("#FFF1DE", 2.1); key.position.set(3, 9, 10); key.target.position.set(8, 0, 1); oScene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -12, right: 12, top: 9, bottom: -6, near: 1, far: 30 });
  key.shadow.camera.updateProjectionMatrix(); key.shadow.bias = -.0004; key.shadow.normalBias = .02;
  const fill = new THREE.DirectionalLight("#BFE0FF", .5); fill.position.set(8, 5, -6); oScene.add(fill);
  const office = buildOffice(oScene);
  const oCam = new THREE.PerspectiveCamera(40, 1, .1, 80);
  const oBase = { x: 8, y: 2.4, z: 13, tx: 8, ty: 2.2 }, par = { x: 0, y: 0, tx: 0, ty: 0 };
  function placeOfficeCam(){ oCam.position.set(oBase.x + par.x * .5, oBase.y - par.y * .25, oBase.z); oCam.lookAt(oBase.tx + par.x * .12, oBase.ty, 0); }
  function frameOffice(){
    const w = innerWidth, h = innerHeight; oR.setSize(w, h, false);
    const a = w / h, tanV = Math.tan(THREE.MathUtils.degToRad(oCam.fov / 2));
    let D, cx, ly = 2.4;
    if (a >= 1){ D = Math.max(7.6, (15.6 / 2) / (tanV * a)); cx = 8; ly = 2.2; }
    else { D = (7.4 / 2) / tanV; cx = Math.max(D * tanV * a + .25, 2.2); }
    Object.assign(oBase, { x: cx, y: ly + .2, z: D, tx: cx, ty: ly });
    oCam.aspect = a; oCam.updateProjectionMatrix(); placeOfficeCam();
    oDirty = true; oR.shadowMap.needsUpdate = true;
  }
  // con il mouse la stanza si sposta appena, come guardarla da un altro punto
  addEventListener("pointermove", e => { if (e.pointerType !== "mouse" || REDUCE_MOTION) return; par.tx = e.clientX / innerWidth * 2 - 1; par.ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  /* ---------- Nexi ---------- */
  const nCanvas = document.createElement("canvas"); nCanvas.className = "t3d-nexi"; nCanvas.setAttribute("aria-hidden", "true");
  els.stage.appendChild(nCanvas);
  const nR = makeRenderer(nCanvas, 2);
  const nScene = new THREE.Scene();
  envFor(nR, nScene, .55);
  nScene.add(new THREE.HemisphereLight("#DCE8FF", "#8A6A50", .85));
  const nKey = new THREE.DirectionalLight("#FFF1DE", 2.4); nKey.position.set(14, 30, 40); nKey.target.position.set(30, -20, 0); nScene.add(nKey, nKey.target);
  nKey.castShadow = true; nKey.shadow.mapSize.set(1024, 1024); Object.assign(nKey.shadow.camera, { left: -45, right: 45, top: 25, bottom: -25, near: 1, far: 120 });
  nKey.shadow.camera.updateProjectionMatrix(); nKey.shadow.bias = -.0006; nKey.shadow.normalBias = .03;
  const rim = new THREE.DirectionalLight("#BFD8FF", .9); rim.position.set(40, 10, -30); nScene.add(rim);
  const GROUND = -22.15;
  // il ripiano su cui cammina (come la riga di scrivania della pixel art) o solo l'ombra
  const ledge = mesh(new THREE.BoxGeometry(400, 1.7, 12.7), [std("#6E4A2E", .6), std("#6E4A2E", .6), std("#FFFFFF", .5, 0, { map: woodTexture("#9A6A44", { seed: 31, w: 512, h: 128 }) }), std("#6E4A2E", .6), std("#FFFFFF", .55, 0, { map: woodTexture("#86593A", { seed: 32, w: 512, h: 128 }) }), std("#6E4A2E", .6)], false, true);
  ledge.material[2].map.repeat.set(12, 1); ledge.material[4].map.repeat.set(12, 1);
  at(ledge, 30, GROUND - .85, .65); nScene.add(ledge);
  const catcher = mesh(new THREE.PlaneGeometry(400, 40), new THREE.ShadowMaterial({ opacity: .3 }), false, true);
  catcher.rotation.x = -Math.PI / 2; at(catcher, 30, GROUND + .01, 0); nScene.add(catcher);

  PMAT = PM(); FMAT = FXM();
  const nexi = buildNexi(); nScene.add(nexi.root);
  const propRoot = new THREE.Group(), fxRoot = new THREE.Group(); nScene.add(propRoot, fxRoot);
  const gag = PROP3D.pc(); gag.g.visible = false; gag.g.traverse(o => { if (o.isMesh) o.castShadow = true; }); nScene.add(gag.g);   // il computer da cui sbuca
  // sbuffi di polvere quando atterra
  const puffs = Array.from({ length: 12 }, () => { const s = glow("#E9DCCB", 1, 0, false); s.visible = false; s.userData = { t0: 0 }; nScene.add(s); return s; });
  let puffI = 0;
  const puff = x => { for (let k = 0; k < 4; k++){ const s = puffs[puffI++ % puffs.length]; s.visible = true; s.userData = { t0: clock.elapsedTime, x: x + (k - 1.5) * 2.4, dir: k < 2 ? -1 : 1 }; } };
  const nCam = new THREE.PerspectiveCamera(24, 1, 1, 400);

  let canvasBox = null; const stageX = [8, 52];
  function frameNexi(){
    const svg = els.actor.getBoundingClientRect(), st = els.stage.getBoundingClientRect(), ctm = els.actor.getScreenCTM();
    if (!svg.width || !svg.height || !ctm) return false;
    const ledgeEl = els.actor.querySelector(".ledge"), ledgeOn = !!ledgeEl && getComputedStyle(ledgeEl).display !== "none";
    // con il ripiano la tela va da bordo a bordo dello schermo, come la riga di scrivania della pixel art
    const left = ledgeOn ? 0 : svg.left - svg.width * .04, right = ledgeOn ? innerWidth : svg.right + svg.width * .04;
    const top = svg.top - svg.height * .2, bottom = svg.bottom + (ledgeOn ? svg.height * .02 : svg.height * .04);
    const w = Math.round(right - left), h = Math.round(bottom - top);
    canvasBox = { left, top, w, h };
    Object.assign(nCanvas.style, { left: (left - st.left) + "px", top: (top - st.top) + "px", width: w + "px", height: h + "px" });
    nR.setSize(w, h, false);
    // stessa scala dell'SVG: 1 unità del viewBox = ctm.a pixel
    const x0 = (left - ctm.e) / ctm.a, x1 = (right - ctm.e) / ctm.a, y0 = (top - ctm.f) / ctm.d, y1 = (bottom - ctm.f) / ctm.d;
    const cx = (x0 + x1) / 2, cy = -(y0 + y1) / 2, H = y1 - y0, D = (H / 2) / Math.tan(THREE.MathUtils.degToRad(nCam.fov / 2));
    nCam.aspect = w / h; nCam.position.set(cx, cy + D * Math.tan(THREE.MathUtils.degToRad(6)), D); nCam.lookAt(cx, cy, 0); nCam.updateProjectionMatrix();
    stageX[0] = x0 + 7.5; stageX[1] = x1 - 7.5;
    ledge.visible = ledgeOn; catcher.visible = !ledgeOn;
    return true;
  }

  /* ---------- Stato del trivia, gesti, trascinamento ---------- */
  let cur = null, propObj = null, fxObjs = [], propKey = "";
  const walk = { from: 0, to: 0, t: 1, start: 0 };
  const jump = { type: null, start: 0 };
  const act = { name: null, t0: 0, dur: 0, last: "", face: undefined };
  const drag = { state: null, cand: null, ptr: new THREE.Vector3(), x: 0, y: 0, vx: 0, vy: 0, t0: 0 };
  let idleAt = nowS() + rand(7, 10), waveCool = 0, suppressClick = false, ptr = null;
  const nexiX = W => W + 24;
  const canIdle = () => !REDUCE_MOTION && cur && cur.expr !== "sleepy" && visible();

  function startAct(name, now, skip = 0){ act.name = name; act.t0 = now - skip; act.dur = ACTS[name].dur; act.last = name; act.face = undefined; idleAt = now + act.dur - skip + rand(6, 10); }
  function stopAct(){
    if (!act.name) return;
    act.name = null; act.face = undefined; nexi.face(null); nexi.arms.forEach(a => a.userData.ov = null); gag.g.visible = false;
  }
  function pickAct(now){
    const opts = ["guarda", "guarda", "stiracchia", "balletto", "saluta", "sbircia", "sbircia"].filter(n => n !== act.last);
    startAct(opts[Math.floor(Math.random() * opts.length)], now);
  }

  function apply(s, first){
    const changed = first || !cur || s.expr !== cur.expr || s.fez !== cur.fez || s.W !== cur.W || s.prop.kind !== cur.prop.kind || s.prop.tilt !== cur.prop.tilt || s.propShift !== cur.propShift || s.fx.join() !== cur.fx.join();
    if (!changed) return;
    const now = nowS();
    if (!first){ stopAct(); idleAt = now + rand(6, 9); }
    if (!cur || s.expr !== cur.expr || s.fez !== cur.fez) nexi.setExpr(s.expr, s.fez);
    if (first){ walk.from = walk.to = nexiX(s.W); walk.t = 1; }
    else if (s.W !== cur.W && !drag.state){ walk.from = nexi.root.position.x; walk.to = nexiX(s.W); walk.t = REDUCE_MOTION ? 1 : 0; walk.start = now; }
    const pk = s.prop.kind + ":" + s.prop.tilt;
    if (pk !== propKey){
      propKey = pk;
      if (propObj){ propRoot.remove(propObj.g); propObj = null; }
      const make = PROP3D[s.prop.kind];
      if (make && s.prop.kind !== "none"){ propObj = make(s.prop.tilt); propObj.born = clock.elapsedTime; propRoot.add(propObj.g); propObj.g.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
    }
    if (propObj){ propObj.g.position.set(39 + s.propShift, GROUND, 0); propObj.g.rotation.y = s.propShift !== 0 ? .35 : -.35; }
    if (!cur || s.fx.join() !== cur.fx.join()){
      fxObjs.forEach(o => fxRoot.remove(o.g));
      fxObjs = s.fx.map(k => FX3D[k] ? FX3D[k]() : null).filter(Boolean);
      fxObjs.forEach(o => fxRoot.add(o.g));
    }
    cur = s; dirty = true;
  }
  function onHop(){
    if (REDUCE_MOTION || act.name || drag.state) return;
    const c = els.hop.getAttribute("class") || "", start = nowS();
    if (/\bspin\b/.test(c)) Object.assign(jump, { type: "spin", start }); else if (/\bhop\b/.test(c)) Object.assign(jump, { type: "hop", start });
  }
  const mo = new MutationObserver(recs => { if (recs.some(r => r.target === els.hop)) onHop(); apply(readState(), false); });
  [els.mood, els.prop, els.fx].forEach(e => mo.observe(e, { childList: true, attributes: true, subtree: false }));
  mo.observe(els.walker, { attributes: true, attributeFilter: ["style"] });
  mo.observe(els.hop, { attributes: true, attributeFilter: ["class"] });

  // trascinamento: si prende Nexi con il dito o il mouse, si lascia, cade e torna al suo posto
  const ray = new THREE.Raycaster(), plane0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), ndc = new THREE.Vector2();
  const toWorld = (cx, cy, out) => { const r = nCanvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, nCam); return ray.ray.intersectPlane(plane0, out); };
  els.actor.addEventListener("pointerdown", e => { if (REDUCE_MOTION || !e.isPrimary) return; drag.cand = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
  addEventListener("pointermove", e => {
    ptr = { x: e.clientX, y: e.clientY, t: nowS() };
    if (drag.cand && e.pointerId === drag.cand.id && !drag.state && Math.hypot(e.clientX - drag.cand.x, e.clientY - drag.cand.y) > 10){
      stopAct(); jump.type = null; walk.t = 1;
      drag.state = "hold"; drag.x = nexi.root.position.x; drag.y = GROUND; drag.vx = 0;
      nexi.face("wow"); root.classList.add("t3d-drag", "t3d-lift");
    }
    if (drag.state === "hold") toWorld(e.clientX, e.clientY, drag.ptr);
  }, { passive: true });
  const release = e => {
    if (!drag.cand || e.pointerId !== drag.cand.id) return;
    drag.cand = null;
    if (drag.state === "hold"){ drag.state = "fall"; drag.vy = 0; suppressClick = true; setTimeout(() => suppressClick = false, 500); root.classList.remove("t3d-drag"); }
  };
  addEventListener("pointerup", release); addEventListener("pointercancel", release);
  // dopo un trascinamento non deve partire anche il "tocco" su Nexi
  addEventListener("click", e => { if (suppressClick && els.actor.contains(e.target)){ e.stopImmediatePropagation(); e.preventDefault(); suppressClick = false; } }, true);
  // passandoci sopra col mouse, saluta
  els.actor.addEventListener("pointerenter", e => {
    const now = nowS();
    if (e.pointerType === "mouse" && !act.name && !drag.state && walk.t >= 1 && now > waveCool && canIdle()){ startAct("saluta", now); waveCool = now + 12; }
  });

  /* ---------- Ciclo di disegno di Nexi ---------- */
  let raf = 0, frames = 0, slow = 0, yaw = 0, officeMs = 32;
  const tmpV = new THREE.Vector3();
  /* Fluidità: se i fotogrammi arrivano troppo piano (telefono lento) prima si abbassa la qualità, poi si torna alla pixel art.
     Si misura l'intervallo vero tra i fotogrammi, perché sui telefoni il tempo del processore non dice quanto lavora la scheda grafica. */
  const sp = { last: 0, from: 0, end: 0, sum: 0, n: 0, step: 0 };
  function lowQuality(){
    oR.setPixelRatio(1); nR.setPixelRatio(1);
    key.castShadow = false; nKey.castShadow = false;
    officeMs = 50;
    relayout();
  }
  function watchSpeed(ms){
    const raw = ms - sp.last; sp.last = ms;
    if (FORCE) return false;
    if (!sp.from){ sp.from = ms + 1000; sp.end = ms + 45000; }   // il primo secondo non conta: carica texture e shader
    if (ms < sp.from || ms > sp.end) return false;
    if (raw > 400){ sp.sum = 0; sp.n = 0; sp.from = ms; return false; }   // pausa o scatto isolato: si riparte
    sp.sum += raw; sp.n++;
    if (ms - sp.from < 2500) return false;
    const avg = sp.sum / sp.n; sp.sum = 0; sp.n = 0; sp.from = ms;
    if (avg <= 45) return false;                                // oltre 22 fotogrammi al secondo: va bene (anche i 30 del risparmio energetico)
    if (sp.step++ === 0){ lowQuality(); return false; }
    giveUp("fotogrammi troppo lenti (" + Math.round(1000 / avg) + " al secondo)");
    return true;
  }
  function frame(){
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (!visible()) return;
    if (watchSpeed(performance.now())) return;
    const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime, now = nowS();
    const puffsOn = puffs.some(p => p.visible);
    if (REDUCE_MOTION && !dirty && walk.t >= 1 && !puffsOn) return;
    const t0 = performance.now(), rig = nexi.rig;
    let walking = false;
    // dove sta: trascinato, in caduta, a terra dopo la caduta, in cammino, fermo
    if (drag.state === "hold"){
      const tx = clamp(drag.ptr.x, stageX[0], stageX[1]), ty = clamp(drag.ptr.y - 6, GROUND + 2.5, GROUND + 11), px = drag.x, k = 1 - Math.exp(-dt * 18);
      drag.x = lerp(drag.x, tx, k); drag.y = lerp(drag.y, ty, k); drag.vx = (drag.x - px) / Math.max(dt, 1e-3);
      nexi.root.position.set(drag.x, drag.y, 0);
    } else if (drag.state === "fall"){
      drag.vy -= 90 * dt; drag.y += drag.vy * dt;
      if (drag.y <= GROUND){ drag.y = GROUND; if (drag.vy < -14){ drag.vy *= -.32; puff(drag.x); } else { drag.state = "rest"; drag.t0 = now; nexi.face("happy"); root.classList.remove("t3d-lift"); } }
      nexi.root.position.set(drag.x, drag.y, 0);
    } else if (drag.state === "rest"){
      nexi.root.position.set(drag.x, GROUND, 0);
      if (now - drag.t0 > .7){ drag.state = null; nexi.face(null); nexi.arms.forEach(a => a.userData.ov = null); walk.from = drag.x; walk.to = nexiX(cur.W); walk.t = Math.abs(walk.to - walk.from) < .2 ? 1 : 0; walk.start = now; }
    } else if (walk.t < 1){
      walk.t = Math.min(1, (now - walk.start) / 1.0); walking = walk.t < 1;
      nexi.root.position.set(lerp(walk.from, walk.to, walkEase(walk.t)), GROUND, 0);
    } else nexi.root.position.set(walk.to, GROUND, 0);
    fxRoot.position.set(nexi.root.position.x - 24, nexi.root.position.y - GROUND, 3);
    // gesti da fermo
    if (!act.name && !drag.state && !walking && !jump.type && canIdle() && now > idleAt) pickAct(now);
    let E = null;
    if (act.name){ const s = now - act.t0; if (s >= act.dur) stopAct(); else E = ACTS[act.name].f(s, t); }
    if (E){
      if (E.face !== act.face){ act.face = E.face; nexi.face(E.face || null); }
      nexi.arms[0].userData.ov = E.L || null; nexi.arms[1].userData.ov = E.R || null;
    }
    // il computer da cui sbuca
    if (E && E.mon !== undefined && E.mon > .01){
      gag.g.visible = true; gag.g.position.set(nexi.root.position.x, GROUND, 4.6);
      gag.g.scale.setScalar(E.mon < 1 ? E.mon * (1 + Math.sin(E.mon * Math.PI) * .15) : 1); gag.tick(t);
    } else gag.g.visible = false;
    // movimento del corpo
    let x = 0, y = 0, z = 0, sy = 1, rz = 0, rx = 0;
    const mv = nexi.state.move;
    if (!REDUCE_MOTION){
      if (drag.state === "hold"){
        rz = clamp(-drag.vx * .004, -.35, .35);
        nexi.legs.forEach((l, i) => l.rotation.x = Math.sin(t * 11 + i * Math.PI) * .55);
        const o = { z: 2.55 + Math.sin(t * 30) * .07, x: .25 }; nexi.arms.forEach(a => a.userData.ov = o);
      } else if (drag.state === "fall"){
        nexi.legs.forEach(l => l.rotation.x *= .85); const o = { z: 2.8, x: .1 }; nexi.arms.forEach(a => a.userData.ov = o);
      } else if (drag.state === "rest"){
        const k = (now - drag.t0) / .3; sy = k < 1 ? .86 + .14 * k : 1; nexi.arms.forEach(a => a.userData.ov = null);
      } else if (walking){
        y = Math.abs(Math.sin(t * 16)) * .6; rz = Math.sin(t * 16) * .06; rx = .12;
        nexi.legs.forEach((l, i) => l.rotation.x = Math.sin(t * 16 + i * Math.PI) * .55);
      } else {
        nexi.legs.forEach(l => l.rotation.x *= .8);
        if (!E){
          if (mv === "bob"){ y = (Math.sin(t * Math.PI * 2) + 1) * .22; sy = 1 + Math.sin(t * Math.PI * 2 + 1) * .012; }
          if (mv === "bounce"){ const b = Math.abs(Math.sin(t * Math.PI * 2)); y = b * .9; sy = b < .15 ? .94 + b * .4 : 1 + (b - .5) * .03; }
          if (mv === "shake"){ x = Math.sin(t * 40) * .28; }
          if (mv === "stomp"){ y = Math.max(0, Math.sin(t * 19.6)) * .7; rz = Math.sin(t * 9.8) * .07; }
          if (mv === "droop"){ sy = .94; y = -.15; rx = .12; }
          if (mv === "tilt"){ rz = (Math.sin(t * Math.PI * 2) * .5 + .5) * .09; }
        }
      }
      if (E){ x += E.dx || 0; y += E.dy || 0; z += E.dz || 0; sy *= E.sy ?? 1; rz += E.rz || 0; }
      if (jump.type){
        const d = jump.type === "hop" ? .55 : .7, k = clamp((now - jump.start) / d, 0, 1);
        if (jump.type === "hop"){ y += k < .3 ? Math.sin(k / .3 * Math.PI / 2) * 3 : k < .6 ? Math.cos((k - .3) / .3 * Math.PI / 2) * 3 : Math.sin((k - .6) / .4 * Math.PI) * 1; sy *= k < .3 ? 1.06 : k < .65 ? 1 : .94 + (k - .65) * .17; }
        else { y += Math.sin(k * Math.PI) * 3.2; rig.rotation.y = ease(k) * Math.PI * 2; }
        if (k >= 1){ if (jump.type === "spin") rig.rotation.y = 0; jump.type = null; }
      }
    } else nexi.legs.forEach(l => l.rotation.x = 0);
    // dove guarda: verso dove cammina, verso il gesto, oppure verso il puntatore
    let yawT = 0; const look = nexi.state.lookT, recent = ptr && now - ptr.t < 3;
    if (walking) yawT = Math.sign(walk.to - walk.from) * .9;
    else if (E && E.yaw !== undefined) yawT = E.yaw;
    else if (!REDUCE_MOTION && recent && canvasBox && !drag.state){
      const v = tmpV.set(nexi.root.position.x, GROUND + 7.5, 4).project(nCam);
      const sx = canvasBox.left + (v.x + 1) / 2 * canvasBox.w, sy2 = canvasBox.top + (1 - v.y) / 2 * canvasBox.h;
      const dx = clamp((ptr.x - sx) / 260, -1, 1), dy = clamp((ptr.y - sy2) / 260, -1, 1);
      yawT = dx * .4; look.set(dx * .32, -dy * .22);
    }
    if (E && E.look) look.set(E.look[0], E.look[1]); else if (!recent || drag.state || walking) look.set(0, 0);
    yaw = lerp(yaw, yawT, 1 - Math.exp(-dt * (walking ? 10 : 4)));
    rig.position.set(x, y, z); rig.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    if (jump.type !== "spin") rig.rotation.set(rx, yaw, rz); else { rig.rotation.x = rx; rig.rotation.z = rz; }
    nexi.animate(t, dt, walking);
    // oggetti, effetti, sbuffi di polvere
    if (propObj){ const k = REDUCE_MOTION ? 1 : Math.min(1, (t - propObj.born) / .35); propObj.g.scale.setScalar(k < 1 ? .6 + Math.sin(k * Math.PI / 2) * .4 + Math.sin(k * Math.PI) * .12 : 1); propObj.tick(t); }
    fxObjs.forEach(o => o.tick(t));
    puffs.forEach(s => { if (!s.visible) return; const k = (t - s.userData.t0) / .6; if (k >= 1){ s.visible = false; return; }
      s.position.set(s.userData.x + s.userData.dir * k * 1.6, GROUND + .6 + k * .9, 3.5); s.scale.setScalar(1.4 + k * 2.8); s.material.opacity = (1 - k) * .55; });
    nR.render(nScene, nCam); dirty = false;
    // controllo: se il dispositivo arranca, si torna alla pixel art
    const ms = performance.now() - t0; frames++;
    if (!FORCE && frames > 20 && frames < 140 && ms > 45 && ++slow > 40) giveUp("dispositivo troppo lento");
  }

  /* ---------- Ciclo di disegno della stanza (30 fotogrammi al secondo) ---------- */
  let oRaf = 0, oLast = 0, sLast = 0;
  function officeFrame(){
    if (!alive) return;
    oRaf = requestAnimationFrame(officeFrame);
    if (!visible()) return;
    const ms = performance.now();
    if (REDUCE_MOTION){ if (!oDirty) return; }
    else if (ms - oLast < officeMs) return;
    const dt = Math.min(.1, (ms - oLast) / 1000); oLast = ms;
    par.x = lerp(par.x, par.tx, .06); par.y = lerp(par.y, par.ty, .06); placeOfficeCam();
    office.tick(ms / 1000, dt);
    if (ms - sLast > 500){ oR.shadowMap.needsUpdate = true; sLast = ms; }
    oR.render(oScene, oCam); oDirty = false;
  }

  let lastBox = "";
  function relayout(){ frameOffice(); if (frameNexi()) dirty = true; }
  const ro = new ResizeObserver(relayout); ro.observe(els.actor); ro.observe(els.stage);
  addEventListener("resize", relayout);
  // rete di sicurezza: se l'SVG di Nexi si sposta (fumetto, caratteri caricati), si riallinea la tela
  const watch = setInterval(() => {
    if (!visible()) return;
    const b = els.actor.getBoundingClientRect(), k = [b.left, b.top, b.width, b.height, innerWidth, innerHeight].map(Math.round).join();
    if (k !== lastBox){ lastBox = k; relayout(); }
  }, 700);
  const vo = new MutationObserver(() => { if (visible()) relayout(); }); vo.observe(root, { attributes: true, attributeFilter: ["data-vista"] });
  document.addEventListener("visibilitychange", () => { if (!document.hidden){ clock.getDelta(); oDirty = dirty = true; } });

  stopAll = () => { alive = false; cancelAnimationFrame(raf); cancelAnimationFrame(oRaf); clearInterval(watch); mo.disconnect(); ro.disconnect(); vo.disconnect(); oR.dispose(); nR.dispose(); };

  frameOffice(); frameNexi();
  apply(readState(), true);
  // precompila i materiali di tutti gli oggetti ed effetti: niente scatti alla prima risposta
  const warm = new THREE.Group();
  Object.values(PROP3D).forEach(make => warm.add(make(0).g));
  Object.values(FX3D).forEach(make => warm.add(make().g));
  warm.position.set(30, -12, -30); nScene.add(warm);
  await Promise.all([oR.compileAsync(oScene, oCam), nR.compileAsync(nScene, nCam)]);
  nScene.remove(warm);
  if (!alive) return;
  // primo disegno: se è troppo lento, meglio la pixel art
  office.tick(clock.elapsedTime, 0);
  const t0 = performance.now(); oR.render(oScene, oCam); nR.render(nScene, nCam);
  if (!FORCE && performance.now() - t0 > 2500) return giveUp("primo disegno troppo lento");
  // entrata: Nexi è nascosto dietro un computer e ne sbuca
  if (!REDUCE_MOTION) startAct("sbircia", nowS(), .9);
  root.classList.add("t3d"); root.classList.remove("t3d-wait");
  frame(); officeFrame();
  window.NexiTreD = { stato: () => cur, gesto: name => ACTS[name] && startAct(name, nowS()), ferma: giveUp, qualita: () => ({ passo: sp.step, pixelRatio: nR.getPixelRatio(), msStanza: officeMs }) };
}

if (OFF) giveUp();
else if (Object.values(els).some(e => !e)) giveUp("elementi del trivia non trovati");
else init().catch(giveUp);
