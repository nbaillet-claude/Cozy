// Cozy rainy-day room, built entirely from primitives, canvas textures and shaders (no external assets).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as audio from './cozyAudio.js';

// Palette sampled from cozy rainy-day reference photos.
const C = {
    shadow: 0x1b0e02, espresso: 0x2e1705, wood: 0x754e1a, honey: 0xa57b3f, glow: 0xdcb775,
    amber: 0xe0a04a, rust: 0xb5603c, olive: 0x6b6a3a, blanket: 0x9fa5a7, oatmeal: 0xe8d9bf,
    storm: 0x2c3238, brick: 0x9a5a3c, plaster: 0xb98f54, curtain: 0x2f3a28,
};

const ROOM = { x0: -4, x1: 4, z0: -3, z1: 3.2, h: 3.4 };
const WIN = { x0: -1.7, x1: 1.7, y0: 0.9, y1: 2.5 };

let renderer, composer, bloom, scene, camera, canvas, ro;
let running = false;
let animations = [];
let lamps = [];
let rain = null;
let backdrop = null;
let windowLight = null;
let hemi = null;
let state = { rain: 0.6, warmth: 0.65, thunder: true };
let pointer = { x: 0, y: 0, tx: 0, ty: 0 };
let flashLevel = 0, nextFlashAt = 0;
let frames = 0, fpsEMA = 0, lastT = 0;
let onPointer = null;

// ---------- helpers ----------
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);

function canvasTex(w, h, draw, { srgb = true, repeat } = {}) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
}

const std = (color, rough = 0.85, metal = 0, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });

function mesh(geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = true, receive = true } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = cast;
    m.receiveShadow = receive;
    return m;
}

const box = (w, h, d, mat, o) => mesh(new THREE.BoxGeometry(w, h, d), mat, o);
const rbox = (w, h, d, r, mat, o) => mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat, o);
const cyl = (rt, rb, h, mat, o, seg = 24) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, o);
const sph = (r, mat, o, seg = 24) => mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg >> 1)), mat, o);

const UP = new THREE.Vector3(0, 1, 0);
// Stretch a unit-height cylinder between two points.
function limb(m, a, b) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(UP, dir.normalize());
    m.scale.set(1, len, 1);
}

function softSprite() {
    return canvasTex(64, 64, (g, w, h) => {
        const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gr.addColorStop(0, 'rgba(255,255,255,1)');
        gr.addColorStop(0.4, 'rgba(255,255,255,0.35)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
}

// ---------- textures ----------
function floorTexture() {
    return canvasTex(1024, 1024, (g, w, h) => {
        const rows = 8, rh = h / rows;
        for (let r = 0; r < rows; r++) {
            const base = 95 + Math.random() * 35;
            g.fillStyle = `rgb(${base + 40},${base * 0.62 + 18},${base * 0.25 + 4})`;
            const off = Math.random() * w;
            g.fillRect(0, r * rh, w, rh);
            // grain
            for (let i = 0; i < 70; i++) {
                g.strokeStyle = `rgba(40,20,5,${Math.random() * 0.18})`;
                g.lineWidth = Math.random() * 1.6;
                const y = r * rh + Math.random() * rh;
                g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + rnd(-3, 3), w * 0.7, y + rnd(-3, 3), w, y); g.stroke();
            }
            // end seams
            g.fillStyle = 'rgba(20,8,0,0.7)';
            g.fillRect(off % w, r * rh, 2, rh);
            g.fillRect((off + w / 2) % w, r * rh, 2, rh);
            g.fillStyle = 'rgba(20,8,0,0.55)';
            g.fillRect(0, r * rh, w, 2);
        }
    }, { repeat: [3, 4.2] });
}

function rugTexture() {
    return canvasTex(512, 384, (g, w, h) => {
        g.fillStyle = '#8f4528'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#e8d9bf'; g.lineWidth = 8; g.strokeRect(18, 18, w - 36, h - 36);
        g.strokeStyle = '#6b6a3a'; g.lineWidth = 14; g.strokeRect(40, 40, w - 80, h - 80);
        const cols = ['#e8d9bf', '#6b6a3a', '#c98b4b', '#3b2314'];
        for (let i = 0; i < 6; i++) {
            const cx = 110 + i * 58, cy = h / 2;
            g.fillStyle = cols[i % cols.length];
            g.beginPath(); g.moveTo(cx, cy - 70); g.lineTo(cx + 26, cy); g.lineTo(cx, cy + 70); g.lineTo(cx - 26, cy); g.closePath(); g.fill();
            g.fillStyle = '#8f4528';
            g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill();
        }
        for (let i = 0; i < 2500; i++) {
            g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,230,190'},${Math.random() * 0.07})`;
            g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }
    });
}

function paintingTexture() {
    return canvasTex(256, 180, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, '#e8b9a0'); gr.addColorStop(1, '#b5603c');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.filter = 'blur(6px)';
        g.fillStyle = 'rgba(255,240,225,0.85)';
        for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(rnd(40, 220), rnd(50, 110), rnd(25, 50), rnd(12, 22), 0, 0, 7); g.fill(); }
        g.filter = 'none';
    });
}

// What you see far outside the window: dark storm sky, rainy blurred city, warm lit windows.
function backdropTexture() {
    const W = 2048, H = 1024;
    const src = document.createElement('canvas'); src.width = W; src.height = H;
    const g = src.getContext('2d');

    const sky = g.createLinearGradient(0, 0, 0, H * 0.72);
    sky.addColorStop(0, '#171c20'); sky.addColorStop(0.55, '#2c3238'); sky.addColorStop(0.85, '#343d44'); sky.addColorStop(1, '#4d5a61');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);

    g.filter = 'blur(28px)';
    for (let i = 0; i < 42; i++) {
        g.fillStyle = `rgba(${Math.random() < 0.5 ? '10,14,18' : '110,125,132'},${rnd(0.07, 0.2)})`;
        g.beginPath(); g.ellipse(rnd(0, W), rnd(40, H * 0.6), rnd(120, 320), rnd(22, 60), 0, 0, 7); g.fill();
    }
    g.filter = 'none';

    const layers = [
        { top: 0.60, fill: '#3b464c', win: 0.0, wmin: 60, wmax: 130, hmin: 0.02, hmax: 0.1 },
        { top: 0.63, fill: '#4a2c1f', win: 0.35, wmin: 70, wmax: 150, hmin: 0.03, hmax: 0.13 },
        { top: 0.70, fill: '#2f1b12', win: 0.55, wmin: 90, wmax: 190, hmin: 0.03, hmax: 0.14 },
    ];
    const lit = [];
    for (const L of layers) {
        let x = -20;
        while (x < W) {
            const bw = rnd(L.wmin, L.wmax), bh = rnd(L.hmin, L.hmax) * H;
            const top = L.top * H - bh;
            g.fillStyle = L.fill; g.fillRect(x, top, bw, H - top);
            if (L.win > 0) {
                for (let wy = top + 14; wy < top + bh + 120; wy += 22) {
                    for (let wx = x + 8; wx < x + bw - 12; wx += 20) {
                        if (Math.random() < L.win * 0.45) lit.push([wx, wy, Math.random()]);
                    }
                }
            }
            x += bw + rnd(-6, 10);
        }
    }
    // warm lit windows
    for (const [wx, wy, a] of lit) {
        g.fillStyle = a > 0.8 ? 'rgba(255,200,120,0.95)' : `rgba(224,160,74,${0.35 + a * 0.4})`;
        g.fillRect(wx, wy, 9, 11);
    }
    // street-level bokeh glows
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
        const x = rnd(0, W), y = rnd(H * 0.64, H * 0.9), r = rnd(10, 38);
        const col = Math.random() < 0.7 ? '255,170,70' : (Math.random() < 0.5 ? '255,110,80' : '170,210,230');
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(${col},0.55)`); gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    g.globalCompositeOperation = 'source-over';

    // rain mist toward the street
    const mist = g.createLinearGradient(0, H * 0.45, 0, H);
    mist.addColorStop(0, 'rgba(120,138,146,0)'); mist.addColorStop(1, 'rgba(120,138,146,0.45)');
    g.fillStyle = mist; g.fillRect(0, H * 0.45, W, H * 0.55);

    // soften everything: the city is out of focus behind the rain
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const og = out.getContext('2d');
    og.filter = 'blur(3px)'; og.drawImage(src, 0, 0);
    const t = new THREE.CanvasTexture(out);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

// Static beads of water on the glass.
function glassTexture() {
    return canvasTex(1024, 512, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        for (let i = 0; i < 520; i++) {
            const r = Math.pow(Math.random(), 3) * 5.5 + 1.2;
            const x = Math.random() * w, y = Math.random() * h;
            const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
            gr.addColorStop(0, 'rgba(235,245,255,0.4)');
            gr.addColorStop(0.55, 'rgba(120,150,170,0.18)');
            gr.addColorStop(0.9, 'rgba(10,15,20,0.35)');
            gr.addColorStop(1, 'rgba(255,255,255,0.35)');
            g.fillStyle = gr;
            g.beginPath(); g.ellipse(x, y, r, r * (1 + Math.random() * 0.25), 0, 0, 7); g.fill();
        }
    });
}

// ---------- build the room ----------
function buildRoom() {
    const wallMat = std(C.plaster, 0.95);
    const woodDark = std(0x4a2d12, 0.7);
    const panelMat = std(C.wood, 0.75);

    // floor + ceiling
    const floorMat = std(0xffffff, 0.55, 0, { map: floorTexture() });
    const floor = mesh(new THREE.PlaneGeometry(8, 6.2), floorMat, { y: 0, z: 0.1, rx: -Math.PI / 2, cast: false });
    scene.add(floor);
    scene.add(mesh(new THREE.PlaneGeometry(8, 6.2), std(0x3a2410, 0.95), { y: ROOM.h, z: 0.1, rx: Math.PI / 2, cast: false }));

    // back wall around the window opening
    const t = 0.25, zc = ROOM.z0 - t / 2;
    const W = ROOM.x1 - ROOM.x0;
    scene.add(box(WIN.x0 - ROOM.x0, ROOM.h, t, wallMat, { x: (ROOM.x0 + WIN.x0) / 2, y: ROOM.h / 2, z: zc, cast: false }));
    scene.add(box(ROOM.x1 - WIN.x1, ROOM.h, t, wallMat, { x: (WIN.x1 + ROOM.x1) / 2, y: ROOM.h / 2, z: zc, cast: false }));
    scene.add(box(WIN.x1 - WIN.x0, WIN.y0, t, wallMat, { x: 0, y: WIN.y0 / 2, z: zc, cast: false }));
    scene.add(box(WIN.x1 - WIN.x0, ROOM.h - WIN.y1, t, wallMat, { x: 0, y: (WIN.y1 + ROOM.h) / 2, z: zc, cast: false }));

    // side walls
    scene.add(box(0.25, ROOM.h, 6.2, wallMat, { x: ROOM.x0 - 0.125, y: ROOM.h / 2, z: 0.1, cast: false }));
    scene.add(box(0.25, ROOM.h, 6.2, wallMat, { x: ROOM.x1 + 0.125, y: ROOM.h / 2, z: 0.1, cast: false }));

    // wood panelling (wainscot) on lower walls
    const wh = 0.95;
    scene.add(box(WIN.x0 - ROOM.x0, wh, 0.05, panelMat, { x: (ROOM.x0 + WIN.x0) / 2, y: wh / 2, z: ROOM.z0 + 0.025, cast: false }));
    scene.add(box(ROOM.x1 - WIN.x1, wh, 0.05, panelMat, { x: (WIN.x1 + ROOM.x1) / 2, y: wh / 2, z: ROOM.z0 + 0.025, cast: false }));
    scene.add(box(0.05, wh, 6.2, panelMat, { x: ROOM.x0 + 0.025, y: wh / 2, z: 0.1, cast: false }));
    scene.add(box(0.05, wh, 6.2, panelMat, { x: ROOM.x1 - 0.025, y: wh / 2, z: 0.1, cast: false }));
    for (const x of [ROOM.x0 + 0.06, ROOM.x1 - 0.06]) {
        scene.add(box(0.08, 0.05, 6.2, woodDark, { x, y: wh, z: 0.1, cast: false }));
    }
    scene.add(box(WIN.x0 - ROOM.x0, 0.05, 0.08, woodDark, { x: (ROOM.x0 + WIN.x0) / 2, y: wh, z: ROOM.z0 + 0.04, cast: false }));
    scene.add(box(ROOM.x1 - WIN.x1, 0.05, 0.08, woodDark, { x: (WIN.x1 + ROOM.x1) / 2, y: wh, z: ROOM.z0 + 0.04, cast: false }));
    // skirting under the window + sill
    scene.add(box(WIN.x1 - WIN.x0 + 0.3, 0.06, 0.42, woodDark, { x: 0, y: WIN.y0 + 0.03, z: ROOM.z0 + 0.12, cast: false }));

    // window frame + muntins
    const fz = ROOM.z0 + 0.02, fd = 0.14, ft = 0.09;
    const frame = std(0x2a1708, 0.6);
    scene.add(box(WIN.x1 - WIN.x0 + 2 * ft, ft, fd, frame, { y: WIN.y1 + ft / 2, z: fz }));
    scene.add(box(WIN.x1 - WIN.x0 + 2 * ft, ft, fd, frame, { y: WIN.y0 - ft / 2 + 0.06, z: fz }));
    scene.add(box(ft, WIN.y1 - WIN.y0 + 2 * ft, fd, frame, { x: WIN.x0 - ft / 2, y: (WIN.y0 + WIN.y1) / 2, z: fz }));
    scene.add(box(ft, WIN.y1 - WIN.y0 + 2 * ft, fd, frame, { x: WIN.x1 + ft / 2, y: (WIN.y0 + WIN.y1) / 2, z: fz }));
    const mx = (WIN.x1 - WIN.x0) / 3;
    for (const x of [WIN.x0 + mx, WIN.x0 + 2 * mx]) scene.add(box(0.05, WIN.y1 - WIN.y0, 0.1, frame, { x, y: (WIN.y0 + WIN.y1) / 2, z: fz }));
    scene.add(box(WIN.x1 - WIN.x0, 0.05, 0.1, frame, { y: (WIN.y0 + WIN.y1) / 2 + 0.1, z: fz }));

    // glass with droplets (a faint cool sheen + beads)
    const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0),
        new THREE.MeshBasicMaterial({ map: glassTexture(), transparent: true, depthWrite: false, toneMapped: true })
    );
    glass.position.set(0, (WIN.y0 + WIN.y1) / 2, ROOM.z0 + 0.05);
    scene.add(glass);

    // running drops
    const dropTex = canvasTex(32, 64, (g, w, h) => {
        const gr = g.createRadialGradient(w * 0.4, h * 0.65, 1, w / 2, h * 0.6, w * 0.55);
        gr.addColorStop(0, 'rgba(240,248,255,0.9)'); gr.addColorStop(0.6, 'rgba(140,170,190,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(w / 2, h * 0.62, w * 0.34, h * 0.3, 0, 0, 7); g.fill();
    });
    const trailTex = canvasTex(8, 64, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, 'rgba(200,225,240,0)'); gr.addColorStop(1, 'rgba(200,225,240,0.28)');
        g.fillStyle = gr; g.fillRect(w * 0.3, 0, w * 0.4, h);
    });
    const dropMat = new THREE.MeshBasicMaterial({ map: dropTex, transparent: true, depthWrite: false });
    const trailMat = new THREE.MeshBasicMaterial({ map: trailTex, transparent: true, depthWrite: false });
    const drops = [];
    for (let i = 0; i < 16; i++) {
        const grp = new THREE.Group();
        const head = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.1), dropMat);
        const trail = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 1), trailMat);
        trail.position.y = 0.5; // extends upward from the head
        grp.add(trail, head);
        grp.position.z = ROOM.z0 + 0.055;
        scene.add(grp);
        const d = { grp, trail, y: 0, x: 0, v: 0, wait: 0, len: 0 };
        resetDrop(d, true);
        drops.push(d);
    }
    function resetDrop(d, initial) {
        d.x = rnd(WIN.x0 + 0.1, WIN.x1 - 0.1);
        d.y = initial ? rnd(WIN.y0 + 0.1, WIN.y1) : WIN.y1 - rnd(0, 0.2);
        d.v = rnd(0.03, 0.14);
        d.len = 0.02;
        d.wait = rnd(0, 3);
    }
    animations.push((t, dt) => {
        for (const d of drops) {
            d.wait -= dt;
            if (d.wait <= 0) {
                // stick-slip: speed pulses as the drop gathers mass
                const k = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + d.x * 9));
                d.y -= d.v * k * dt * (0.5 + state.rain);
                d.len = Math.min(0.7, d.len + d.v * k * dt * 0.8);
                if (Math.random() < dt * 0.25) d.wait = rnd(0.3, 1.4);
            }
            if (d.y < WIN.y0 + 0.06) resetDrop(d, false);
            d.grp.position.set(d.x, d.y, ROOM.z0 + 0.055);
            d.trail.scale.y = d.len;
            d.trail.position.y = 0.05 + d.len / 2;
            d.grp.visible = state.rain > 0.02;
        }
    });

    // outside: backdrop + rain streaks
    const bdMat = new THREE.MeshBasicMaterial({ map: backdropTexture(), toneMapped: true });
    backdrop = new THREE.Mesh(new THREE.PlaneGeometry(52, 15), bdMat);
    backdrop.position.set(0, 4.3, -15);
    scene.add(backdrop);
}

function buildRain() {
    const MAX = 5000;
    const pos = new Float32Array(MAX * 4 * 3);
    const corner = new Float32Array(MAX * 4 * 2);
    const seed = new Float32Array(MAX * 4 * 3);
    const idx = new Uint32Array(MAX * 6);
    for (let i = 0; i < MAX; i++) {
        const x = rnd(-5, 5), z = -Math.pow(Math.random(), 1.3) * 9 - 3.15;
        const s = [Math.random(), Math.random(), rnd(0.25, 1)];
        for (let v = 0; v < 4; v++) {
            const o = i * 4 + v;
            pos.set([x, 0, z], o * 3);
            corner.set([v % 2 === 0 ? -1 : 1, v < 2 ? 0 : 1], o * 2);
            seed.set(s, o * 3);
        }
        const b = i * 4;
        idx.set([b, b + 1, b + 2, b + 1, b + 3, b + 2], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, -8), 60);

    const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xa9bcc8) }, uBoost: { value: 1 } },
        vertexShader: /* glsl */`
            attribute vec2 aCorner; attribute vec3 aSeed;
            uniform float uTime;
            varying float vA; varying float vT;
            void main() {
                float H = 7.0;
                float speed = 10.0 + aSeed.y * 6.0;
                float fall = mod(aSeed.x * H + uTime * speed, H);
                float len = 1.0 + aSeed.y * 1.4;
                vec3 p = position;
                p.y = 5.0 - fall - aCorner.y * len;
                p.x += (5.0 - p.y) * 0.08 + aCorner.x * 0.011;
                vT = aCorner.y;
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                vA = aSeed.z * (0.5 + 0.5 * smoothstep(-10.0, -3.0, mv.z));
                gl_Position = projectionMatrix * mv;
            }`,
        fragmentShader: /* glsl */`
            uniform vec3 uColor; uniform float uBoost;
            varying float vA; varying float vT;
            void main() {
                float a = vA * (1.0 - vT * 0.75) * 1.0 * uBoost;
                gl_FragColor = vec4(uColor, a);
            }`,
    });
    rain = new THREE.Mesh(geo, mat);
    rain.frustumCulled = false;
    rain.renderOrder = 2;
    scene.add(rain);
    rain.userData.max = MAX;
    setRain(state.rain);
    animations.push((t) => { mat.uniforms.uTime.value = t; mat.uniforms.uBoost.value = 1 + flashLevel * 2.5; });
}

// ---------- furniture & lights ----------
const glowTex = () => softSprite();

function addLamp({ x, y, z, intensity, color = 0xffb866, shadow = true, distance = 0 }) {
    const l = new THREE.PointLight(color, intensity, distance, 2);
    l.position.set(x, y, z);
    if (shadow) {
        l.castShadow = true;
        l.shadow.mapSize.set(1024, 1024);
        l.shadow.bias = -0.0008;
        l.shadow.normalBias = 0.02;
        l.shadow.radius = 5;
    }
    scene.add(l);
    const rec = { light: l, base: intensity, flicker: 0.04, seed: Math.random() * 100 };
    lamps.push(rec);
    return rec;
}

function glowSprite(x, y, z, size, color, opacity) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(size);
    s.position.set(x, y, z);
    scene.add(s);
    return s;
}

function buildFurniture() {
    const olive = std(C.olive, 0.95);
    const rustFab = std(0x8b4a2b, 0.9);
    const cream = std(C.oatmeal, 0.9);
    const grey = std(C.blanket, 0.95);
    const woodM = std(C.wood, 0.6);
    const dark = std(0x2a1708, 0.6);

    // rug
    const rug = mesh(new THREE.PlaneGeometry(4.6, 3.4), std(0xffffff, 1, 0, { map: rugTexture() }), { x: 0.2, y: 0.012, z: 0.5, rx: -Math.PI / 2, cast: false });
    scene.add(rug);

    // ----- sofa (left wall, faces +x) -----
    const sofa = new THREE.Group();
    sofa.position.set(-3.25, 0, 0.55);
    sofa.rotation.y = -Math.PI / 2;
    sofa.add(rbox(1.95, 0.22, 0.9, 0.05, dark, { y: 0.14 }));
    sofa.add(rbox(0.5, 0.5, 0.9, 0.12, olive, { x: -0.95, y: 0.4 }));
    sofa.add(rbox(0.5, 0.5, 0.9, 0.12, olive, { x: 0.95, y: 0.4 }));
    sofa.add(rbox(1.9, 0.62, 0.3, 0.12, olive, { y: 0.55, z: 0.33 }));
    sofa.add(rbox(0.74, 0.2, 0.66, 0.08, olive, { x: -0.36, y: 0.35, z: -0.08 }));
    sofa.add(rbox(0.74, 0.2, 0.66, 0.08, olive, { x: 0.36, y: 0.35, z: -0.08 }));
    const pillow = rbox(0.38, 0.38, 0.14, 0.06, std(C.rust, 0.9), { x: -0.55, y: 0.66, z: 0.12, rx: -0.25, rz: 0.15 });
    sofa.add(pillow);
    const throwB = rbox(0.6, 0.08, 0.5, 0.04, cream, { x: 0.5, y: 0.5, z: -0.05, rz: 0.08 });
    sofa.add(throwB);
    scene.add(sofa);

    // painting above the sofa
    const art = new THREE.Group();
    art.position.set(ROOM.x0 + 0.04, 1.85, 0.55);
    art.rotation.y = Math.PI / 2;
    art.add(box(1.05, 0.75, 0.05, dark, { cast: false }));
    const canvasArt = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.62), new THREE.MeshStandardMaterial({ map: paintingTexture(), roughness: 0.9 }));
    canvasArt.position.z = 0.03; art.add(canvasArt);
    scene.add(art);

    // ----- coffee table -----
    const tbl = new THREE.Group();
    tbl.position.set(-0.4, 0, 1.15);
    tbl.add(cyl(0.55, 0.55, 0.05, woodM, { y: 0.42 }, 40));
    for (const [lx, lz] of [[0.32, 0.32], [-0.32, 0.32], [0.32, -0.32], [-0.32, -0.32]]) tbl.add(cyl(0.025, 0.02, 0.4, dark, { x: lx, y: 0.2, z: lz }, 8));
    // books
    tbl.add(rbox(0.3, 0.04, 0.22, 0.01, std(0x6b6a3a, 0.8), { x: 0.2, y: 0.465, z: 0.1, ry: 0.3 }));
    tbl.add(rbox(0.26, 0.035, 0.2, 0.01, std(0xb5603c, 0.8), { x: 0.2, y: 0.5, z: 0.1, ry: 0.15 }));
    // mug
    tbl.add(cyl(0.04, 0.035, 0.085, std(0xf2ece0, 0.4), { x: -0.25, y: 0.49, z: 0.15 }, 20));
    // candle in a glass jar
    tbl.add(cyl(0.06, 0.06, 0.1, std(0xcfb98f, 0.3, 0, { transparent: true, opacity: 0.55 }), { x: 0.0, y: 0.5, z: -0.12 }, 24));
    tbl.add(cyl(0.035, 0.035, 0.07, std(0xf4e6c6, 0.7), { x: 0.0, y: 0.495, z: -0.12 }, 16));
    const flame = sph(0.014, new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.0) }), { x: 0.0, y: 0.555, z: -0.12, cast: false }, 12);
    flame.scale.y = 1.8;
    tbl.add(flame);
    scene.add(tbl);
    const candleWorld = new THREE.Vector3(-0.4, 0.58, 1.03);
    const candle = addLamp({ x: candleWorld.x, y: candleWorld.y + 0.04, z: candleWorld.z, intensity: 0.9, color: 0xff9a40, shadow: false, distance: 5 });
    candle.flicker = 0.25;
    candle.isCandle = true;
    glowSprite(candleWorld.x, candleWorld.y, candleWorld.z, 0.25, 0xffa850, 0.4);
    animations.push((t) => { flame.scale.set(1 + 0.15 * Math.sin(t * 17), 1.8 + 0.3 * Math.sin(t * 11 + 1), 1); });

    // ----- floor lamp with adjustable arm (left of window) -----
    const fl = new THREE.Group();
    fl.position.set(-2.75, 0, -2.45);
    fl.add(cyl(0.2, 0.22, 0.04, dark, { y: 0.02 }, 24));
    fl.add(cyl(0.018, 0.018, 1.6, dark, { y: 0.84 }, 10));
    const arm = cyl(0.012, 0.012, 0.6, dark, { x: 0.22, y: 1.65, z: 0.1, rz: -1.15 }, 8);
    arm.rotation.y = 0.0;
    fl.add(arm);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.24, 28, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x1d1308, roughness: 0.5, side: THREE.DoubleSide, emissive: 0xffa040, emissiveIntensity: 0.25 }));
    shade.position.set(0.5, 1.72, 0.18); shade.rotation.set(0.5, 0, -0.45); shade.castShadow = false;
    fl.add(shade);
    const bulb = sph(0.045, new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.2, 1.2) }), { x: 0.5, y: 1.64, z: 0.2, cast: false }, 12);
    fl.add(bulb);
    fl.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    scene.add(fl);
    const flWorld = new THREE.Vector3(-2.75 + 0.5, 1.6, -2.45 + 0.2);
    addLamp({ x: flWorld.x, y: flWorld.y, z: flWorld.z, intensity: 9 });
    glowSprite(flWorld.x, flWorld.y, flWorld.z, 0.7, 0xffa850, 0.28);

    // ----- side table + table lamp (right of window) -----
    const st = new THREE.Group();
    st.position.set(3.15, 0, -2.4);
    st.add(cyl(0.3, 0.3, 0.04, woodM, { y: 0.55 }, 28));
    st.add(cyl(0.03, 0.03, 0.53, dark, { y: 0.27 }, 8));
    st.add(cyl(0.18, 0.2, 0.03, dark, { y: 0.015 }, 20));
    st.add(cyl(0.05, 0.08, 0.22, std(0xcfa66a, 0.35, 0.3), { y: 0.68 }, 16));
    const tShade = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 0.22, 28, 1, true),
        new THREE.MeshStandardMaterial({ color: 0xe9c68a, roughness: 0.7, side: THREE.DoubleSide, emissive: 0xff9a3a, emissiveIntensity: 1.6 }));
    tShade.position.y = 0.9; st.add(tShade);
    scene.add(st);
    addLamp({ x: 3.15, y: 0.95, z: -2.4, intensity: 4.5 });
    glowSprite(3.15, 0.92, -2.4, 0.55, 0xffa850, 0.28);

    // ----- bookshelf (right wall) -----
    const shelf = new THREE.Group();
    shelf.position.set(ROOM.x1 - 0.2, 0, -1.0);
    shelf.rotation.y = Math.PI / 2;
    const sw = 1.5, sh = 2.1, sd = 0.34;
    shelf.add(box(0.04, sh, sd, woodM, { x: -sw / 2, y: sh / 2 }));
    shelf.add(box(0.04, sh, sd, woodM, { x: sw / 2, y: sh / 2 }));
    shelf.add(box(sw, sh, 0.02, dark, { y: sh / 2, z: sd / 2 - 0.01, cast: false }));
    const bookCols = [0x6b6a3a, 0xb5603c, 0xe8d9bf, 0x3b2f4a, 0x7a3b2b, 0x2f4a42, 0xc98b4b, 0x8a8f6a, 0x9fa5a7];
    for (let s = 0; s <= 5; s++) {
        const y = 0.06 + s * 0.4;
        shelf.add(box(sw, 0.035, sd, woodM, { y }));
        if (s === 5) break;
        let x = -sw / 2 + 0.08;
        while (x < sw / 2 - 0.12) {
            const bw = rnd(0.03, 0.07), bh = rnd(0.22, 0.34);
            if (Math.random() < 0.08) { x += rnd(0.1, 0.25); continue; }
            shelf.add(box(bw, bh, rnd(0.18, 0.24), std(bookCols[Math.floor(Math.random() * bookCols.length)], 0.85), { x: x + bw / 2, y: y + 0.0175 + bh / 2, z: -0.02, rz: Math.random() < 0.06 ? 0.15 : 0 }));
            x += bw + 0.004;
        }
    }
    // plant on top
    shelf.add(cyl(0.08, 0.06, 0.14, std(0xb5603c, 0.8), { x: 0.4, y: 2.16 }, 14));
    for (let i = 0; i < 8; i++) {
        const leaf = sph(0.07, std(0x4a5a2a, 0.8), { x: 0.4 + rnd(-0.07, 0.07), y: 2.3 + rnd(0, 0.18), z: rnd(-0.07, 0.07) }, 10);
        leaf.scale.set(1, 1.6, 0.5); leaf.rotation.set(rnd(-0.6, 0.6), rnd(0, 6), rnd(-0.8, 0.8));
        shelf.add(leaf);
    }
    scene.add(shelf);

    // potted plant on the window sill
    const pot = cyl(0.07, 0.055, 0.12, std(0xe8d9bf, 0.7), { x: -1.15, y: WIN.y0 + 0.12, z: ROOM.z0 + 0.15, cast: false }, 14);
    scene.add(pot);
    for (let i = 0; i < 9; i++) {
        const leaf = sph(0.06, std(0x56682f, 0.8), { x: -1.15 + rnd(-0.06, 0.06), y: WIN.y0 + 0.25 + rnd(0, 0.16), z: ROOM.z0 + 0.15 + rnd(-0.05, 0.05), cast: false }, 10);
        leaf.scale.set(0.8, 1.7, 0.45); leaf.rotation.set(rnd(-0.5, 0.5), rnd(0, 6), rnd(-0.9, 0.9));
        scene.add(leaf);
    }

    // ----- curtains -----
    const curtainMat = new THREE.MeshStandardMaterial({ color: C.curtain, roughness: 0.95, side: THREE.DoubleSide });
    function curtain(cx, w) {
        const g = new THREE.PlaneGeometry(w, 2.62, 36, 1);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.045 + Math.sin(p.getX(i) * 9 + 1) * 0.03);
        g.computeVertexNormals();
        const m = new THREE.Mesh(g, curtainMat);
        m.position.set(cx, 1.45, ROOM.z0 + 0.22);
        m.castShadow = false; m.receiveShadow = true;
        scene.add(m);
        return m;
    }
    const cL = curtain(WIN.x0 - 0.15, 0.7), cR = curtain(WIN.x1 + 0.15, 0.7);
    scene.add(cyl(0.015, 0.015, 5.0, dark, { y: 2.78, z: ROOM.z0 + 0.2, rz: Math.PI / 2, cast: false }, 8));
    animations.push((t) => { cL.rotation.y = Math.sin(t * 0.4) * 0.012; cR.rotation.y = Math.sin(t * 0.37 + 2) * 0.012; });

    // ----- string lights along the top of the back wall -----
    const N = 22, bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.028, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
    const pts = [], m4 = new THREE.Matrix4(), col = new THREE.Color();
    for (let i = 0; i < N; i++) {
        const u = i / (N - 1), x = -3.85 + u * 7.7;
        const y = 3.28 - 0.2 * Math.sin(u * Math.PI);
        m4.setPosition(x, y, ROOM.z0 + 0.08);
        bulbs.setMatrixAt(i, m4);
        col.setRGB(4.5, 2.9 + Math.random() * 0.5, 1.1);
        bulbs.setColorAt(i, col);
        pts.push(new THREE.Vector3(x, y + 0.02, ROOM.z0 + 0.08));
    }
    scene.add(bulbs);
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x1b0e02 })));
    // a few real lights to cast a soft warm wash from the lights
    addLamp({ x: -2.6, y: 3.0, z: -2.5, intensity: 0.6, color: 0xffb060, shadow: false, distance: 6 });
    addLamp({ x: 2.6, y: 3.0, z: -2.5, intensity: 0.6, color: 0xffb060, shadow: false, distance: 6 });
}

function buildPerson() {
    const chair = new THREE.Group();
    chair.position.set(1.95, 0, -0.6);
    chair.rotation.y = 1.15;
    scene.add(chair);

    const upholstery = std(0x8b4a2b, 0.9);
    const woodM = std(0x4a2d12, 0.6);
    // chair
    chair.add(rbox(0.9, 0.2, 0.88, 0.07, upholstery, { y: 0.34 }));
    chair.add(rbox(0.92, 0.68, 0.2, 0.1, upholstery, { y: 0.7, z: 0.37, rx: 0.12 }));
    chair.add(rbox(0.16, 0.34, 0.8, 0.06, upholstery, { x: -0.5, y: 0.55 }));
    chair.add(rbox(0.16, 0.34, 0.8, 0.06, upholstery, { x: 0.5, y: 0.55 }));
    for (const [x, z] of [[-0.38, -0.34], [0.38, -0.34], [-0.38, 0.34], [0.38, 0.34]]) chair.add(cyl(0.03, 0.022, 0.26, woodM, { x, y: 0.13, z }, 8));
    chair.add(rbox(0.4, 0.38, 0.12, 0.05, std(C.oatmeal, 0.95), { x: 0.2, y: 0.74, z: 0.24, rx: -0.2, rz: -0.2 }));

    // person
    const person = new THREE.Group();
    chair.add(person);
    const sweater = std(C.oatmeal, 0.97);
    const skin = std(0xe0b090, 0.7);
    const sock = std(0x7a4a3a, 0.95);
    const pants = std(0x3b3a46, 0.9);

    // legs: thighs along the seat, shins to the floor
    for (const sx of [-1, 1]) {
        const th = cyl(0.075, 0.07, 1, pants, { cast: true }, 12);
        limb(th, new THREE.Vector3(sx * 0.13, 0.52, 0.12), new THREE.Vector3(sx * 0.13, 0.55, -0.34));
        person.add(th);
        const sh = cyl(0.062, 0.05, 1, pants, {}, 12);
        limb(sh, new THREE.Vector3(sx * 0.13, 0.55, -0.34), new THREE.Vector3(sx * 0.13, 0.1, -0.42));
        person.add(sh);
        person.add(sph(0.07, pants, { x: sx * 0.13, y: 0.55, z: -0.34 }, 12));
        person.add(box(0.09, 0.07, 0.2, sock, { x: sx * 0.13, y: 0.04, z: -0.5 }));
    }
    // torso (breathes)
    const torso = new THREE.Group();
    torso.position.set(0, 0.66, 0.1);
    torso.rotation.x = -0.1;
    person.add(torso);
    const body = mesh(new THREE.CapsuleGeometry(0.17, 0.34, 8, 20), sweater, { y: 0.25 });
    body.scale.set(1.15, 1, 0.9);
    torso.add(body);
    // chunky knit rolls at cuffs/hem
    const hem = mesh(new THREE.TorusGeometry(0.18, 0.03, 8, 24), sweater, { y: 0.0, rx: Math.PI / 2 });
    torso.add(hem);
    // neck + head
    const neck = cyl(0.045, 0.05, 0.1, skin, { y: 0.55 }, 12);
    torso.add(neck);
    const cowl = mesh(new THREE.TorusGeometry(0.085, 0.04, 10, 24), sweater, { y: 0.52, rx: Math.PI / 2 });
    torso.add(cowl);
    const head = new THREE.Group();
    head.position.set(0, 0.7, 0.01);
    torso.add(head);
    head.add(sph(0.108, skin, { y: 0 }, 28));
    head.add(sph(0.016, skin, { y: -0.005, z: -0.112 }, 10)); // nose
    const hair = sph(0.118, std(0x3b2314, 0.6), { y: 0.018, z: 0.025 }, 28);
    hair.scale.set(1, 1.0, 1.02);
    head.add(hair);
    head.add(sph(0.05, std(0x3b2314, 0.6), { y: 0.13, z: 0.07 }, 16)); // bun
    head.rotation.y = -0.45; // looking toward the window

    // blanket over the lap and one side draped down the chair
    const blanket = rbox(0.6, 0.1, 0.55, 0.045, std(C.blanket, 0.98), { x: 0, y: 0.66, z: -0.12, rx: 0.05 });
    person.add(blanket);
    person.add(rbox(0.1, 0.5, 0.45, 0.04, std(C.blanket, 0.98), { x: 0.34, y: 0.48, z: -0.12, rz: -0.06 }));

    // arms + mug (sip animation)
    const mug = new THREE.Group();
    person.add(mug);
    mug.add(cyl(0.048, 0.042, 0.1, std(0xf4eee2, 0.35), {}, 24));
    mug.add(mesh(new THREE.TorusGeometry(0.03, 0.007, 8, 16, Math.PI), std(0xf4eee2, 0.35), { x: 0.05, ry: 0, rz: -Math.PI / 2 }));
    const coffee = cyl(0.04, 0.04, 0.005, std(0x2a1306, 0.3), { y: 0.045 }, 20);
    mug.add(coffee);
    const handR = sph(0.04, skin, {}, 12), handL = sph(0.04, skin, {}, 12);
    person.add(handR, handL);
    const upperR = cyl(0.052, 0.046, 1, sweater, {}, 12), foreR = cyl(0.046, 0.04, 1, sweater, {}, 12);
    const upperL = cyl(0.052, 0.046, 1, sweater, {}, 12), foreL = cyl(0.046, 0.04, 1, sweater, {}, 12);
    const elbowR = sph(0.05, sweater, {}, 12), elbowL = sph(0.05, sweater, {}, 12);
    person.add(upperR, foreR, upperL, foreL, elbowR, elbowL);

    // steam
    const steamTex = softSprite();
    const steam = [];
    for (let i = 0; i < 9; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, color: 0xdfe6ea, transparent: true, opacity: 0, depthWrite: false }));
        s.scale.setScalar(0.08);
        mug.add(s);
        steam.push({ s, ph: i / 9, x: rnd(-0.015, 0.015), z: rnd(-0.015, 0.015) });
    }

    // meshes in the chair/person cast and receive shadows by default via helper; ensure all do
    chair.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

    const shoulderR = new THREE.Vector3(0.21, 0.66 + 0.45, 0.1), shoulderL = new THREE.Vector3(-0.21, 0.66 + 0.45, 0.1);
    const elbR = new THREE.Vector3(0.24, 0.9, 0.02), elbL = new THREE.Vector3(-0.24, 0.9, 0.04);
    const rest = new THREE.Vector3(0.02, 1.0, -0.2);
    const mouth = new THREE.Vector3(0.0, 1.27, -0.12);
    const tmp = new THREE.Vector3(), handPos = new THREE.Vector3(), handPos2 = new THREE.Vector3();
    let nextSip = 9, sipStart = -1;

    animations.push((t, dt) => {
        // breathing
        const b = Math.sin(t * 1.25);
        torso.scale.set(1 + b * 0.006, 1 + b * 0.012, 1 + b * 0.008);
        head.rotation.y = -0.45 + Math.sin(t * 0.23) * 0.07;
        head.rotation.x = Math.sin(t * 0.31 + 1) * 0.03;

        // sip every so often
        if (sipStart < 0 && t > nextSip) sipStart = t;
        let s = 0;
        if (sipStart >= 0) {
            const u = (t - sipStart) / 4.2;
            if (u >= 1) { sipStart = -1; nextSip = t + rnd(14, 24); }
            else s = Math.sin(Math.min(1, u) * Math.PI);
            s = smooth(clamp01(s * 1.4));
        }
        handPos.lerpVectors(rest, mouth, s);
        handPos.y += b * 0.004;
        handPos2.copy(handPos).add(tmp.set(-0.09, -0.02, 0.0));
        mug.position.copy(handPos).add(tmp.set(0.03, 0.0, -0.04));
        mug.rotation.x = -0.35 * s;
        handR.position.copy(handPos).add(tmp.set(0.05, 0, 0.0));
        handL.position.copy(handPos2).add(tmp.set(0, -0.02, 0));
        elbR.y = 0.88 + s * 0.12; elbL.y = 0.88 + s * 0.12;
        limb(upperR, shoulderR, elbR); limb(foreR, elbR, handR.position);
        limb(upperL, shoulderL, elbL); limb(foreL, elbL, handL.position);
        elbowR.position.copy(elbR); elbowL.position.copy(elbL);

        // steam curls up and fades
        for (const p of steam) {
            const k = ((t * 0.18) + p.ph) % 1;
            p.s.position.set(p.x + Math.sin(t * 1.3 + p.ph * 9) * 0.02 * k, 0.06 + k * 0.28, p.z);
            p.s.scale.setScalar(0.05 + k * 0.13);
            p.s.material.opacity = Math.sin(k * Math.PI) * 0.22;
        }
    });
}

// Floating dust motes catching the lamplight.
function buildDust() {
    const N = 160, pos = new Float32Array(N * 3), seeds = [];
    for (let i = 0; i < N; i++) {
        const x = rnd(-3.5, 3.5), y = rnd(0.3, 3.0), z = rnd(-2.6, 3);
        pos.set([x, y, z], i * 3);
        seeds.push([x, y, z, rnd(0.1, 0.4), rnd(0, 6)]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({
        map: softSprite(), size: 0.022, color: 0xffd9a0, transparent: true, opacity: 0.35,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    scene.add(pts);
    animations.push((t) => {
        const p = g.attributes.position;
        for (let i = 0; i < N; i++) {
            const s = seeds[i];
            p.setXYZ(i, s[0] + Math.sin(t * s[3] + s[4]) * 0.25, s[1] + Math.sin(t * s[3] * 0.7 + s[4] * 2) * 0.18, s[2] + Math.cos(t * s[3] + s[4]) * 0.2);
        }
        p.needsUpdate = true;
    });
}

// ---------- lighting model ----------
function applyWarmth() {
    const w = state.warmth;
    const k = 0.35 + 1.25 * w;
    const soft = new THREE.Color(0xffd7a0), deep = new THREE.Color(0xff9238);
    const col = soft.clone().lerp(deep, w);
    for (const l of lamps) {
        l.light.color.copy(col);
        l.mul = k;
    }
    if (hemi) hemi.intensity = 0.4 - 0.2 * w;
}

function updateLamps(t) {
    for (const l of lamps) {
        const f = 1 + (Math.sin(t * 7 + l.seed) * 0.5 + Math.sin(t * 13.1 + l.seed * 2) * 0.5) * l.flicker * (l.isCandle ? 1 : 0.35);
        l.light.intensity = l.base * (l.mul ?? 1) * f;
    }
}

// ---------- lightning ----------
function updateLightning(t, dt) {
    if (state.thunder && t > nextFlashAt) {
        triggerLightning();
    }
    flashLevel = Math.max(0, flashLevel - dt * 1.6);
    const f = flashLevel;
    if (backdrop) {
        const v = 1.25 + f * 2.6;
        backdrop.material.color.setRGB(v, v * 1.02, v * 1.08);
    }
    if (windowLight) windowLight.intensity = 0.35 + f * 2.2;
}

export function triggerLightning() {
    const t = performance.now() / 1000;
    const strength = rnd(0.5, 1);
    flashLevel = strength;
    setTimeout(() => { flashLevel = strength * 0.9; }, 140);
    setTimeout(() => { flashLevel = strength * 0.6; }, 290);
    audio.thunder(0.9 + Math.random() * 2.8, strength);
    nextFlashAt = t + rnd(28, 70);
}

// ---------- public API ----------
export async function init(canvasEl, opts = {}) {
    if (renderer) dispose();
    canvas = canvasEl;
    state = { ...state, ...opts };

    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    } catch (e) {
        console.warn('WebGL unavailable', e);
        return false;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.setClearColor(C.shadow);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(C.shadow);
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);

    animations = []; lamps = [];

    // ambient layers: very dim cool fill + warm bounce
    hemi = new THREE.HemisphereLight(0x44525a, 0x3a2410, 0.3);
    scene.add(hemi);
    scene.add(new THREE.AmbientLight(0x4a3524, 0.22));
    windowLight = new THREE.DirectionalLight(0x6f8794, 0.35);
    windowLight.position.set(1.5, 3.5, -9);
    windowLight.target.position.set(0, 0.4, 0);
    scene.add(windowLight, windowLight.target);

    buildRoom();
    buildFurniture();
    buildPerson();
    buildDust();
    buildRain();
    applyWarmth();

    // post: bloom for lamp and window glow
    const size = new THREE.Vector2();
    renderer.getSize(size);
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.6, 1.0);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    resize();
    ro = new ResizeObserver(resize);
    ro.observe(canvas);
    onPointer = (e) => {
        pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    nextFlashAt = performance.now() / 1000 + rnd(14, 24);
    lastT = performance.now() / 1000;
    running = true;
    renderer.setAnimationLoop(frame);
    return true;
}

function resize() {
    if (!renderer || !canvas) return;
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    camera.aspect = w / h;
    // Narrow screens: pull back so the window and armchair both stay in frame.
    const narrow = clamp01(1.5 - camera.aspect);
    camera.userData.baseZ = 6.4 + narrow * 2.0;
    camera.fov = 42 + narrow * 14;
    camera.userData.lookX = 0.15 + narrow * 0.35;
    camera.updateProjectionMatrix();
}

function frame() {
    if (!running) return;
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, now - lastT);
    lastT = now;
    const t = now;

    // gentle parallax + slow drift
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    const bz = camera.userData.baseZ ?? 6.4;
    camera.position.set(pointer.x * 0.55 + Math.sin(t * 0.07) * 0.08, 1.55 - pointer.y * 0.18, bz);
    camera.lookAt(pointer.x * -0.25 + (camera.userData.lookX ?? 0.15), 1.25, -1);

    updateLamps(t);
    updateLightning(t, dt);
    for (const a of animations) a(t, dt);

    composer.render(dt);

    frames++;
    fpsEMA = fpsEMA ? fpsEMA * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05 : 1 / Math.max(dt, 0.001);
}

export function setRain(v) {
    state.rain = clamp01(v);
    if (rain) {
        const n = Math.round(rain.userData.max * Math.pow(state.rain, 1.2));
        rain.geometry.setDrawRange(0, n * 6);
        rain.visible = n > 0;
    }
}
export function setWarmth(v) { state.warmth = clamp01(v); applyWarmth(); }
export function isNarrow() { return window.innerWidth < 640; }
export function setThunder(on) { state.thunder = !!on; }
export function getStats() {
    return { frames, fps: Math.round(fpsEMA), rain: state.rain, warmth: state.warmth, calls: renderer?.info.render.calls, tris: renderer?.info.render.triangles };
}

export function dispose() {
    running = false;
    if (renderer) renderer.setAnimationLoop(null);
    if (ro) ro.disconnect();
    if (onPointer) window.removeEventListener('pointermove', onPointer);
    scene?.traverse((o) => {
        o.geometry?.dispose?.();
        const m = o.material;
        if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { x.map?.dispose?.(); x.dispose?.(); });
    });
    composer?.dispose?.();
    renderer?.dispose();
    renderer = composer = scene = camera = null;
    animations = []; lamps = []; rain = null; backdrop = null;
}
