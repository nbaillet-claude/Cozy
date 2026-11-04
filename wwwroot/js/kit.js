// Shared building blocks for every scene: helpers, procedural textures, the view outside the window,
// a posable person, a sleeping cat, steam and rainy glass. Everything is generated in code.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export { THREE };

// ---------- small helpers ----------
export const rnd = (a, b) => a + Math.random() * (b - a);
export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const smooth = (t) => t * t * (3 - 2 * t);
export const lerp = (a, b, t) => a + (b - a) * t;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export function canvasTex(w, h, draw, { srgb = true, repeat } = {}) {
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

export const std = (color, rough = 0.85, metal = 0, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });

export function mesh(geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = true, receive = true } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = cast;
    m.receiveShadow = receive;
    return m;
}
export const box = (w, h, d, mat, o) => mesh(new THREE.BoxGeometry(w, h, d), mat, o);
export const rbox = (w, h, d, r, mat, o) => mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat, o);
export const cyl = (rt, rb, h, mat, o, seg = 24) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, o);
export const sph = (r, mat, o, seg = 24) => mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg >> 1)), mat, o);

const UP = new THREE.Vector3(0, 1, 0);
// Stretch a unit-height cylinder between two points.
export function limb(m, a, b) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(UP, len > 1e-6 ? dir.normalize() : UP);
    m.scale.set(1, Math.max(len, 1e-4), 1);
}

let _soft = null;
export function softSprite() {
    if (!_soft) {
        _soft = canvasTex(64, 64, (g, w, h) => {
            const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
            gr.addColorStop(0, 'rgba(255,255,255,1)');
            gr.addColorStop(0.4, 'rgba(255,255,255,0.35)');
            gr.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = gr; g.fillRect(0, 0, w, h);
        });
    }
    return _soft;
}

// A wall (local x: -w/2..w/2, y: 0..h) with a rectangular opening. Returns a Group.
export function wallWithHole({ w, h, t = 0.25, hole, mat, cast = false }) {
    const g = new THREE.Group();
    const add = (x0, x1, y0, y1) => {
        if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4) return;
        g.add(box(x1 - x0, y1 - y0, t, mat, { x: (x0 + x1) / 2, y: (y0 + y1) / 2, cast }));
    };
    add(-w / 2, hole.x0, 0, h);
    add(hole.x1, w / 2, 0, h);
    add(hole.x0, hole.x1, 0, hole.y0);
    add(hole.x0, hole.x1, hole.y1, h);
    return g;
}

// ---------- procedural textures ----------
export function plankTexture({ base = [135, 88, 42], rows = 8, repeat = [3, 4.2], vary = 35, seams = true } = {}) {
    return canvasTex(1024, 1024, (g, w, h) => {
        const rh = h / rows;
        for (let r = 0; r < rows; r++) {
            const k = Math.random() * vary - vary / 2;
            g.fillStyle = `rgb(${base[0] + k},${base[1] + k * 0.6},${base[2] + k * 0.3})`;
            g.fillRect(0, r * rh, w, rh);
            for (let i = 0; i < 70; i++) {
                g.strokeStyle = `rgba(40,20,5,${Math.random() * 0.18})`;
                g.lineWidth = Math.random() * 1.6;
                const y = r * rh + Math.random() * rh;
                g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + rnd(-3, 3), w * 0.7, y + rnd(-3, 3), w, y); g.stroke();
            }
            if (seams) {
                const off = Math.random() * w;
                g.fillStyle = 'rgba(20,8,0,0.7)';
                g.fillRect(off % w, r * rh, 2, rh);
                g.fillRect((off + w / 2) % w, r * rh, 2, rh);
            }
            g.fillStyle = 'rgba(20,8,0,0.55)';
            g.fillRect(0, r * rh, w, 2);
        }
    }, { repeat });
}

// Horizontal logs, for the cabin walls.
export function logTexture({ base = [112, 70, 36], rows = 6, repeat = [3, 1.4] } = {}) {
    return canvasTex(1024, 1024, (g, w, h) => {
        const rh = h / rows;
        for (let r = 0; r < rows; r++) {
            const k = Math.random() * 24 - 12;
            const gr = g.createLinearGradient(0, r * rh, 0, (r + 1) * rh);
            gr.addColorStop(0, `rgb(${base[0] - 55 + k},${base[1] - 35 + k},${base[2] - 20})`);
            gr.addColorStop(0.35, `rgb(${base[0] + 14 + k},${base[1] + 8 + k},${base[2] + 4})`);
            gr.addColorStop(0.7, `rgb(${base[0] + k},${base[1] + k * 0.6},${base[2]})`);
            gr.addColorStop(1, `rgb(${base[0] - 62 + k},${base[1] - 42 + k},${base[2] - 24})`);
            g.fillStyle = gr; g.fillRect(0, r * rh, w, rh);
            for (let i = 0; i < 60; i++) {
                g.strokeStyle = `rgba(30,14,4,${Math.random() * 0.22})`;
                g.lineWidth = Math.random() * 1.4;
                const y = r * rh + Math.random() * rh;
                g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + rnd(-4, 4), w * 0.6, y + rnd(-4, 4), w, y); g.stroke();
            }
            if (Math.random() < 0.8) {
                const kx = rnd(60, w - 60), ky = r * rh + rh * rnd(0.3, 0.7);
                g.fillStyle = 'rgba(30,14,4,0.45)'; g.beginPath(); g.ellipse(kx, ky, 14, 8, 0, 0, 7); g.fill();
                g.strokeStyle = 'rgba(30,14,4,0.3)'; g.lineWidth = 2; g.beginPath(); g.ellipse(kx, ky, 22, 13, 0, 0, 7); g.stroke();
            }
            g.fillStyle = 'rgba(10,4,0,0.6)'; g.fillRect(0, (r + 1) * rh - 3, w, 3);
        }
    }, { repeat });
}

export function stoneTexture({ base = [120, 108, 98], repeat = [1, 1] } = {}) {
    return canvasTex(512, 512, (g, w, h) => {
        g.fillStyle = '#2a211b'; g.fillRect(0, 0, w, h);
        let y = 4;
        while (y < h) {
            const rh = rnd(46, 74);
            let x = rnd(-30, 0);
            while (x < w) {
                const sw = rnd(60, 120), k = rnd(-26, 26);
                g.fillStyle = `rgb(${base[0] + k},${base[1] + k},${base[2] + k * 0.8})`;
                g.beginPath(); g.roundRect(x + 3, y + 3, sw - 6, rh - 6, 12); g.fill();
                const gr = g.createLinearGradient(0, y, 0, y + rh);
                gr.addColorStop(0, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0.22)');
                g.fillStyle = gr; g.beginPath(); g.roundRect(x + 3, y + 3, sw - 6, rh - 6, 12); g.fill();
                x += sw;
            }
            y += rh;
        }
    }, { repeat });
}

export function tileTexture({ bg = '#f1e8d6', grout = '#c9bba0', cols = 8, rows = 14, repeat = [1, 1] } = {}) {
    return canvasTex(512, 512, (g, w, h) => {
        g.fillStyle = grout; g.fillRect(0, 0, w, h);
        const tw = w / cols, th = h / rows;
        for (let r = 0; r < rows; r++) {
            for (let c = -1; c < cols + 1; c++) {
                const x = c * tw + (r % 2 ? tw / 2 : 0);
                const k = rnd(-6, 6);
                g.fillStyle = bg;
                g.beginPath(); g.roundRect(x + 2, r * th + 2, tw - 4, th - 4, 3); g.fill();
                g.fillStyle = `rgba(${k > 0 ? '255,255,255' : '90,60,30'},${Math.abs(k) / 60})`;
                g.fillRect(x + 2, r * th + 2, tw - 4, th - 4);
            }
        }
    }, { repeat });
}

export function checkerTexture({ a = '#b4573a', b = '#e8d9bf', n = 8, repeat = [3, 3] } = {}) {
    return canvasTex(512, 512, (g, w, h) => {
        const s = w / n;
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
            g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * s, y * s, s, s);
            g.fillStyle = `rgba(0,0,0,${rnd(0, 0.07)})`; g.fillRect(x * s, y * s, s, s);
        }
        g.strokeStyle = 'rgba(60,30,10,0.5)'; g.lineWidth = 2;
        for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
    }, { repeat });
}

export function rugTexture({ field = '#8f4528', band = '#e8d9bf', band2 = '#6b6a3a', accents = ['#e8d9bf', '#6b6a3a', '#c98b4b', '#3b2314'] } = {}) {
    return canvasTex(512, 384, (g, w, h) => {
        g.fillStyle = field; g.fillRect(0, 0, w, h);
        g.strokeStyle = band; g.lineWidth = 8; g.strokeRect(18, 18, w - 36, h - 36);
        g.strokeStyle = band2; g.lineWidth = 14; g.strokeRect(40, 40, w - 80, h - 80);
        for (let i = 0; i < 6; i++) {
            const cx = 110 + i * 58, cy = h / 2;
            g.fillStyle = accents[i % accents.length];
            g.beginPath(); g.moveTo(cx, cy - 70); g.lineTo(cx + 26, cy); g.lineTo(cx, cy + 70); g.lineTo(cx - 26, cy); g.closePath(); g.fill();
            g.fillStyle = field; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill();
        }
        for (let i = 0; i < 2500; i++) {
            g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,230,190'},${Math.random() * 0.07})`;
            g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }
    });
}

export function quiltTexture(colors) {
    return canvasTex(512, 512, (g, w, h) => {
        const n = 8, s = w / n;
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
            g.fillStyle = pick(colors); g.fillRect(x * s, y * s, s, s);
            g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.setLineDash([6, 5]);
            g.strokeRect(x * s + 5, y * s + 5, s - 10, s - 10);
            if (Math.random() < 0.3) { g.setLineDash([]); g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(x * s, y * s); g.lineTo((x + 1) * s, y * s); g.lineTo(x * s, (y + 1) * s); g.fill(); }
        }
        g.setLineDash([]);
    });
}

export function stripeTexture(colors, { n = 10, vertical = true } = {}) {
    return canvasTex(256, 256, (g, w, h) => {
        for (let i = 0; i < n; i++) {
            g.fillStyle = colors[i % colors.length];
            if (vertical) g.fillRect((i * w) / n, 0, w / n + 1, h); else g.fillRect(0, (i * h) / n, w, h / n + 1);
        }
        for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    });
}

export function plaidTexture(a = '#a8322a', b = '#1c1512') {
    return canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = a; g.fillRect(0, 0, w, h);
        const s = w / 4;
        g.fillStyle = b; g.globalAlpha = 0.85;
        for (let i = 0; i < 4; i += 2) { g.fillRect(i * s, 0, s, h); g.fillRect(0, i * s, w, s); }
        g.globalAlpha = 1;
        for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    });
}

export function paintingTexture(top = '#e8b9a0', bottom = '#b5603c', blob = 'rgba(255,240,225,0.85)') {
    return canvasTex(256, 180, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, top); gr.addColorStop(1, bottom);
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.filter = 'blur(6px)';
        g.fillStyle = blob;
        for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(rnd(40, 220), rnd(50, 110), rnd(25, 50), rnd(12, 22), 0, 0, 7); g.fill(); }
        g.filter = 'none';
    });
}

// ---------- the view outside ----------
// Styles: city, street, forest, garden, sky, roofs. `pal` can override colours.
export function backdropTexture(style = 'city', pal = {}) {
    const W = 2048, H = 1024;
    const src = document.createElement('canvas'); src.width = W; src.height = H;
    const g = src.getContext('2d');
    const P = {
        top: '#171c20', mid: '#2c3238', hor: '#4d5a61', haze: '120,138,146',
        b1: '#3b464c', b2: '#4a2c1f', b3: '#2f1b12', lit: '224,160,74', horizon: 0.72, ...pal,
    };

    const sky = g.createLinearGradient(0, 0, 0, H * P.horizon);
    sky.addColorStop(0, P.top); sky.addColorStop(0.55, P.mid); sky.addColorStop(1, P.hor);
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.filter = 'blur(28px)';
    for (let i = 0; i < 42; i++) {
        g.fillStyle = `rgba(${Math.random() < 0.5 ? '10,14,18' : '110,125,132'},${rnd(0.07, 0.22)})`;
        g.beginPath(); g.ellipse(rnd(0, W), rnd(20, H * 0.62), rnd(120, 340), rnd(22, 64), 0, 0, 7); g.fill();
    }
    g.filter = 'none';

    const buildings = (layers) => {
        const lit = [];
        for (const L of layers) {
            let x = -20;
            while (x < W) {
                const bw = rnd(L.wmin, L.wmax), bh = rnd(L.hmin, L.hmax) * H;
                const top = L.top * H - bh;
                g.fillStyle = L.fill; g.fillRect(x, top, bw, H - top);
                if (L.roof) { g.beginPath(); g.moveTo(x - 4, top); g.lineTo(x + bw / 2, top - rnd(20, 60)); g.lineTo(x + bw + 4, top); g.fill(); }
                if (L.win > 0) {
                    for (let wy = top + 14; wy < top + bh + 120; wy += 22)
                        for (let wx = x + 8; wx < x + bw - 12; wx += 20)
                            if (Math.random() < L.win * 0.45) lit.push([wx, wy, Math.random()]);
                }
                x += bw + rnd(-6, 10);
            }
        }
        for (const [wx, wy, a] of lit) {
            g.fillStyle = a > 0.8 ? 'rgba(255,205,125,0.95)' : `rgba(${P.lit},${0.35 + a * 0.4})`;
            g.fillRect(wx, wy, P.winW ?? 9, P.winH ?? 11);
        }
    };
    const bokeh = (n, y0, y1, rmin, rmax, cols, alpha = 0.55) => {
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < n; i++) {
            const x = rnd(0, W), y = rnd(y0, y1), r = rnd(rmin, rmax), col = pick(cols);
            const gr = g.createRadialGradient(x, y, 0, x, y, r);
            gr.addColorStop(0, `rgba(${col},${alpha})`); gr.addColorStop(1, `rgba(${col},0)`);
            g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
    };
    const mist = (y0, a) => {
        const m = g.createLinearGradient(0, y0, 0, H);
        m.addColorStop(0, `rgba(${P.haze},0)`); m.addColorStop(1, `rgba(${P.haze},${a})`);
        g.fillStyle = m; g.fillRect(0, y0, W, H - y0);
    };
    const pine = (x, base, h, w, fill) => {
        g.fillStyle = fill;
        const tiers = 7;
        for (let i = 0; i < tiers; i++) {
            const ty = base - h + (i / tiers) * h, tw = (w * (i + 1.4)) / tiers;
            g.beginPath(); g.moveTo(x, ty - h / tiers * 0.4); g.lineTo(x + tw / 2, ty + h / tiers * 1.1); g.lineTo(x - tw / 2, ty + h / tiers * 1.1); g.closePath(); g.fill();
        }
        g.fillRect(x - 4, base - 8, 8, 30);
    };

    if (style === 'city') {
        buildings([
            { top: 0.60, fill: P.b1, win: 0, wmin: 60, wmax: 130, hmin: 0.02, hmax: 0.1 },
            { top: 0.63, fill: P.b2, win: 0.35, wmin: 70, wmax: 150, hmin: 0.03, hmax: 0.13 },
            { top: 0.70, fill: P.b3, win: 0.55, wmin: 90, wmax: 190, hmin: 0.03, hmax: 0.14 },
        ]);
        bokeh(46, H * 0.64, H * 0.9, 10, 38, ['255,170,70', '255,170,70', '255,110,80', '170,210,230']);
        mist(H * 0.45, 0.45);
    } else if (style === 'street') {
        buildings([
            { top: 0.50, fill: P.b1, win: 0.25, wmin: 80, wmax: 170, hmin: 0.05, hmax: 0.18, roof: true },
            { top: 0.60, fill: P.b2, win: 0.5, wmin: 110, wmax: 220, hmin: 0.06, hmax: 0.2 },
        ]);
        // wet road with light smears
        const road = g.createLinearGradient(0, H * 0.68, 0, H);
        road.addColorStop(0, '#1a1d22'); road.addColorStop(1, '#0c0e12');
        g.fillStyle = road; g.fillRect(0, H * 0.68, W, H * 0.32);
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 40; i++) {
            const x = rnd(0, W), len = rnd(60, 260), col = pick(['255,170,70', '255,150,60', '255,90,70', '200,225,255']);
            const gr = g.createLinearGradient(0, H * 0.68, 0, H * 0.68 + len);
            gr.addColorStop(0, `rgba(${col},0.35)`); gr.addColorStop(1, `rgba(${col},0)`);
            g.fillStyle = gr; g.fillRect(x, H * 0.68, rnd(4, 14), len);
        }
        g.globalCompositeOperation = 'source-over';
        // street lamps
        for (let i = 0; i < 4; i++) {
            const x = 220 + i * 520 + rnd(-60, 60), y = H * 0.5;
            g.fillStyle = '#0e1013'; g.fillRect(x - 4, y, 8, H * 0.2);
            bokeh(1, y - 4, y - 4, 60, 70, ['255,190,100'], 0.9);
            g.globalCompositeOperation = 'lighter';
            const gr = g.createRadialGradient(x, y, 0, x, y, 120);
            gr.addColorStop(0, 'rgba(255,200,120,0.5)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(x, y, 120, 0, 7); g.fill();
            g.globalCompositeOperation = 'source-over';
        }
        bokeh(34, H * 0.66, H * 0.86, 12, 46, ['255,170,70', '255,110,80', '190,220,255']);
        mist(H * 0.4, 0.35);
    } else if (style === 'forest') {
        // moon glow behind the clouds
        g.globalCompositeOperation = 'lighter';
        const mg = g.createRadialGradient(W * 0.68, H * 0.18, 0, W * 0.68, H * 0.18, 260);
        mg.addColorStop(0, 'rgba(140,165,190,0.45)'); mg.addColorStop(1, 'rgba(140,165,190,0)');
        g.fillStyle = mg; g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'source-over';
        const layer = (base, hmin, hmax, w, fill, n, haze) => {
            for (let i = 0; i < n; i++) pine(rnd(-20, W + 20), base, rnd(hmin, hmax), w * rnd(0.8, 1.3), fill);
            g.fillStyle = fill; g.fillRect(0, base, W, H - base);
            mist(base - 140, haze);
        };
        layer(H * 0.72, 180, 320, 110, '#1b2a30', 26, 0.28);
        layer(H * 0.78, 220, 400, 140, '#111c21', 20, 0.2);
        layer(H * 0.86, 280, 520, 180, '#0a1215', 14, 0.12);
        bokeh(2, H * 0.74, H * 0.8, 22, 34, ['255,180,90'], 0.9); // a far-off window
        bokeh(20, H * 0.5, H * 0.9, 6, 20, ['140,170,190'], 0.12);
    } else if (style === 'garden') {
        buildings([{ top: 0.62, fill: P.b1, win: 0.5, wmin: 130, wmax: 240, hmin: 0.07, hmax: 0.16, roof: true }]);
        // soft trees
        g.filter = 'blur(10px)';
        for (let i = 0; i < 16; i++) {
            g.fillStyle = pick(['#1a2a1c', '#223322', '#2b3a25']);
            g.beginPath(); g.ellipse(rnd(0, W), H * rnd(0.55, 0.72), rnd(80, 190), rnd(80, 190), 0, 0, 7); g.fill();
        }
        g.filter = 'none';
        // fence
        g.fillStyle = '#3a2a1c'; g.fillRect(0, H * 0.74, W, H * 0.04);
        for (let x = 0; x < W; x += 34) g.fillRect(x, H * 0.66, 22, H * 0.34);
        // grass + bushes
        const gr = g.createLinearGradient(0, H * 0.8, 0, H);
        gr.addColorStop(0, '#17241a'); gr.addColorStop(1, '#0c140e');
        g.fillStyle = gr; g.fillRect(0, H * 0.8, W, H * 0.2);
        g.filter = 'blur(8px)';
        for (let i = 0; i < 20; i++) { g.fillStyle = pick(['#1d3322', '#26402a', '#142a1b']); g.beginPath(); g.ellipse(rnd(0, W), H * rnd(0.78, 0.9), rnd(60, 140), rnd(40, 80), 0, 0, 7); g.fill(); }
        g.filter = 'none';
        bokeh(44, H * 0.7, H * 0.92, 8, 26, ['255,200,120', '255,190,100', '255,220,160'], 0.7); // fairy lights
        mist(H * 0.5, 0.3);
    } else if (style === 'roofs') {
        // rooftops stepping down the hill
        for (let layer = 0; layer < 3; layer++) {
            const base = H * (0.62 + layer * 0.08);
            g.fillStyle = [P.b1, P.b2, P.b3][layer];
            let x = -30;
            while (x < W) {
                const bw = rnd(130, 280), bh = rnd(40, 120);
                g.beginPath(); g.moveTo(x, base); g.lineTo(x, base - bh * 0.4); g.lineTo(x + bw / 2, base - bh); g.lineTo(x + bw, base - bh * 0.4); g.lineTo(x + bw, base); g.fill();
                if (Math.random() < 0.4) g.fillRect(x + bw * rnd(0.2, 0.7), base - bh - 28, 16, 40);
                if (layer > 0 && Math.random() < 0.55) { g.fillStyle = `rgba(${P.lit},0.8)`; g.fillRect(x + bw * 0.4, base - bh * 0.35, 12, 14); g.fillStyle = [P.b1, P.b2, P.b3][layer]; }
                x += bw + rnd(-10, 16);
            }
            g.fillRect(0, base, W, H - base);
        }
        bokeh(28, H * 0.66, H * 0.92, 10, 36, ['255,170,70', '255,200,120', '170,210,230']);
        mist(H * 0.5, 0.4);
    }
    // 'sky' draws only the clouds above.

    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const og = out.getContext('2d');
    og.filter = `blur(${P.blur ?? 3}px)`; og.drawImage(src, 0, 0);
    const t = new THREE.CanvasTexture(out);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

// ---------- rainy glass ----------
function beadsTexture(w, h) {
    const ppm = 300; // pixels per metre keeps bead size consistent across panes
    const cw = Math.min(2048, Math.max(128, Math.round(w * ppm))), ch = Math.min(2048, Math.max(128, Math.round(h * ppm)));
    const n = Math.round(w * h * 95);
    return canvasTex(cw, ch, (g) => {
        g.clearRect(0, 0, cw, ch);
        for (let i = 0; i < n; i++) {
            const r = Math.pow(Math.random(), 3) * 5.5 + 1.2;
            const x = Math.random() * cw, y = Math.random() * ch;
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

let _dropTex = null, _trailTex = null;
function dropTextures() {
    if (!_dropTex) {
        _dropTex = canvasTex(32, 64, (g, w, h) => {
            const gr = g.createRadialGradient(w * 0.4, h * 0.65, 1, w / 2, h * 0.6, w * 0.55);
            gr.addColorStop(0, 'rgba(240,248,255,0.9)'); gr.addColorStop(0.6, 'rgba(140,170,190,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = gr; g.beginPath(); g.ellipse(w / 2, h * 0.62, w * 0.34, h * 0.3, 0, 0, 7); g.fill();
        });
        _trailTex = canvasTex(8, 64, (g, w, h) => {
            const gr = g.createLinearGradient(0, 0, 0, h);
            gr.addColorStop(0, 'rgba(200,225,240,0)'); gr.addColorStop(1, 'rgba(200,225,240,0.28)');
            g.fillStyle = gr; g.fillRect(w * 0.3, 0, w * 0.4, h);
        });
    }
    return [_dropTex, _trailTex];
}

// A pane of glass (local XY plane, centred) dotted with water beads and running drops.
// Rotate/position the returned group to fit any window, skylight or porthole.
export function addGlass(ctx, { w, h, parent = ctx.world, circle = false }) {
    const grp = new THREE.Group();
    const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: beadsTexture(w, h), transparent: true, depthWrite: false })
    );
    grp.add(glass);
    const [dropTex, trailTex] = dropTextures();
    const dropMat = new THREE.MeshBasicMaterial({ map: dropTex, transparent: true, depthWrite: false });
    const trailMat = new THREE.MeshBasicMaterial({ map: trailTex, transparent: true, depthWrite: false });
    const drops = [];
    const count = Math.round(Math.min(18, Math.max(5, w * h * 3)));
    const reset = (d, initial) => {
        const lim = circle ? 0.6 : 0.92;
        d.x = rnd(-w / 2 * lim, w / 2 * lim);
        d.y = initial ? rnd(-h / 2, h / 2) : h / 2 - rnd(0, 0.15);
        d.v = rnd(0.03, 0.14);
        d.len = 0.02;
        d.wait = rnd(0, 3);
    };
    for (let i = 0; i < count; i++) {
        const g = new THREE.Group();
        const head = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.1), dropMat);
        const trail = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 1), trailMat);
        g.add(trail, head);
        g.position.z = 0.004;
        grp.add(g);
        const d = { g, trail, x: 0, y: 0, v: 0, wait: 0, len: 0 };
        reset(d, true);
        drops.push(d);
    }
    ctx.anim((t, dt) => {
        for (const d of drops) {
            d.wait -= dt;
            if (d.wait <= 0) {
                const k = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + d.x * 9));
                d.y -= d.v * k * dt * (0.5 + ctx.state.rain);
                d.len = Math.min(0.7, d.len + d.v * k * dt * 0.8);
                if (Math.random() < dt * 0.25) d.wait = rnd(0.3, 1.4);
            }
            if (d.y < -h / 2 + 0.04) reset(d, false);
            d.g.position.x = d.x; d.g.position.y = d.y;
            d.trail.scale.y = d.len;
            d.trail.position.y = 0.05 + d.len / 2;
            d.g.visible = ctx.state.rain > 0.02;
        }
    });
    parent.add(grp);
    return grp;
}

// ---------- steam ----------
export function addSteam(ctx, parent, { x = 0, y = 0, z = 0, n = 9, rise = 0.28, size = 0.05, spread = 0.015, opacity = 0.22, speed = 0.18 } = {}) {
    const tex = softSprite();
    const puffs = [];
    for (let i = 0; i < n; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xdfe6ea, transparent: true, opacity: 0, depthWrite: false }));
        parent.add(s);
        puffs.push({ s, ph: i / n, x: rnd(-spread, spread), z: rnd(-spread, spread) });
    }
    ctx.anim((t) => {
        for (const p of puffs) {
            const k = (t * speed + p.ph) % 1;
            p.s.position.set(x + p.x + Math.sin(t * 1.3 + p.ph * 9) * spread * k * 1.5, y + k * rise, z + p.z);
            p.s.scale.setScalar(size + k * size * 2.6);
            p.s.material.opacity = Math.sin(k * Math.PI) * opacity;
        }
    });
}

export function makeMug(color = 0xf4eee2) {
    const g = new THREE.Group();
    g.add(cyl(0.048, 0.042, 0.1, std(color, 0.35), {}, 24));
    g.add(mesh(new THREE.TorusGeometry(0.03, 0.007, 8, 16, Math.PI), std(color, 0.35), { x: 0.05, rz: -Math.PI / 2 }));
    g.add(cyl(0.04, 0.04, 0.005, std(0x2a1306, 0.3), { y: 0.045 }, 20));
    return g;
}

export function makeBook(color = 0x6b6a3a, w = 0.2, h = 0.27, t = 0.035) {
    const g = new THREE.Group();
    g.add(rbox(w, h, t, 0.006, std(color, 0.8), {}));
    g.add(box(w - 0.02, h - 0.02, t * 0.7, std(0xf0e6cf, 0.9), { z: 0.002, cast: false }));
    return g;
}

// ---------- a posable person ----------
// Local frame: facing -Z, up +Y. Set joints, call update(). Put it in a group and rotate that to face where you like.
export function makePerson({ sweater = 0xe8d9bf, pants = 0x3b3a46, skin = 0xe0b090, hair = 0x3b2314, hairStyle = 'bun', hat = null, sock = 0x7a4a3a, sleeve = null, scale = 1 } = {}) {
    const root = new THREE.Group();
    const M = { sw: std(sweater, 0.97), pa: std(pants, 0.9), skin: std(skin, 0.7), hair: std(hair, 0.6), sock: std(sock, 0.95) };
    const names = ['pelvis', 'chest', 'neck', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR'];
    const j = {};
    for (const k of names) j[k] = new THREE.Vector3();
    const cy = (r1, r2, mat, seg = 12) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, 1, seg), mat); m.castShadow = m.receiveShadow = true; root.add(m); return m; };
    const sp = (r, mat, seg = 14) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, 10), mat); m.castShadow = m.receiveShadow = true; root.add(m); return m; };

    const torso = cy(0.15, 0.17, M.sw, 20);
    const pelvisS = sp(0.165, M.pa, 18), chestS = sp(0.17, M.sw, 18);
    const neckM = cy(0.045, 0.05, M.skin);
    const thigh = [cy(0.075, 0.07, M.pa), cy(0.075, 0.07, M.pa)];
    const shin = [cy(0.062, 0.05, M.pa), cy(0.062, 0.05, M.pa)];
    const knee = [sp(0.068, M.pa), sp(0.068, M.pa)];
    const hip = [sp(0.078, M.pa), sp(0.078, M.pa)];
    const foot = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.2), M.sock); m.castShadow = true; root.add(m); return m; });
    const armMat = sleeve ? std(sleeve, 0.97) : M.sw;
    const upper = [cy(0.052, 0.046, armMat), cy(0.052, 0.046, armMat)];
    const fore = [cy(0.046, 0.04, armMat), cy(0.046, 0.04, armMat)];
    const elbow = [sp(0.05, armMat), sp(0.05, armMat)];
    const shoulder = [sp(0.062, armMat), sp(0.062, armMat)];
    const hand = [sp(0.04, M.skin, 12), sp(0.04, M.skin, 12)];

    // head
    const head = new THREE.Group();
    root.add(head);
    const add = (m, o = {}) => { m.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0); m.castShadow = true; head.add(m); return m; };
    add(new THREE.Mesh(new THREE.SphereGeometry(0.108, 28, 14), M.skin));
    add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), M.skin), { y: -0.005, z: -0.112 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1b0e08 });
    for (const sx of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.0095, 8, 6), eyeMat), { x: sx * 0.04, y: 0.014, z: -0.098 });
    const hairM = add(new THREE.Mesh(new THREE.SphereGeometry(0.118, 28, 14), M.hair), { y: 0.018, z: 0.025 });
    if (hairStyle === 'bun') add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), M.hair), { y: 0.13, z: 0.07 });
    if (hairStyle === 'long') {
        const lh = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.26, 6, 14), M.hair), { y: -0.12, z: 0.075 });
        lh.scale.set(1.15, 1, 0.8);
    }
    if (hairStyle === 'short') hairM.scale.set(1, 0.97, 1.0);
    if (hat) {
        const hm = std(hat, 0.95);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.126, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hm), { y: 0.03, z: 0.012 });
        const brim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 8, 24), hm); brim.rotation.x = Math.PI / 2; add(brim, { y: 0.03, z: 0.01 });
        add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), std(0xe8d9bf, 1)), { y: 0.15, z: 0.01 });
    }

    function update() {
        limb(torso, j.pelvis, j.chest); torso.scale.x = 1.12; torso.scale.z = 0.85;
        pelvisS.position.copy(j.pelvis); pelvisS.scale.set(1.05, 0.8, 0.85);
        chestS.position.copy(j.chest); chestS.scale.set(1.0, 0.8, 0.85);
        limb(neckM, j.chest, j.neck);
        head.position.copy(j.neck).add(new THREE.Vector3(0, 0.105, 0));
        for (let s = 0; s < 2; s++) {
            const L = s === 0 ? 'L' : 'R';
            limb(thigh[s], j['hip' + L], j['knee' + L]);
            limb(shin[s], j['knee' + L], j['ankle' + L]);
            knee[s].position.copy(j['knee' + L]); hip[s].position.copy(j['hip' + L]);
            foot[s].position.copy(j['ankle' + L]).add(new THREE.Vector3(0, -0.01, -0.07));
            limb(upper[s], j['shoulder' + L], j['elbow' + L]);
            limb(fore[s], j['elbow' + L], j['hand' + L]);
            elbow[s].position.copy(j['elbow' + L]); shoulder[s].position.copy(j['shoulder' + L]);
            hand[s].position.copy(j['hand' + L]);
        }
    }
    root.scale.setScalar(scale);
    return {
        root, j, head, update, mats: M,
        pose(p) { for (const k of Object.keys(p)) j[k].set(...p[k]); update(); },
    };
}

// ---------- a sleeping cat ----------
export function makeCat({ fur = 0xd9873f, belly = 0xf1d6a8, stripes = true } = {}) {
    const g = new THREE.Group();
    const furM = std(fur, 0.95), bellyM = std(belly, 0.95);
    const body = sph(0.15, furM, {}, 24); body.scale.set(1.2, 0.72, 1.0); body.position.y = 0.1; g.add(body);
    const head = new THREE.Group(); head.position.set(0.17, 0.09, -0.04); head.rotation.y = -0.5; g.add(head);
    const skull = sph(0.075, furM, {}, 20); skull.scale.set(1, 0.9, 1); head.add(skull);
    const muzzle = sph(0.035, bellyM, { x: 0.05, y: -0.015 }, 12); head.add(muzzle);
    for (const sz of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.055, 4), furM);
        ear.position.set(0.0, 0.07, sz * 0.045); ear.rotation.x = sz * 0.25; ear.castShadow = true; head.add(ear);
        const eye = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 4, 8, Math.PI), new THREE.MeshBasicMaterial({ color: 0x2a1708 }));
        eye.position.set(0.062, 0.012, sz * 0.03); eye.rotation.set(0, Math.PI / 2, Math.PI); head.add(eye);
    }
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.028, 8, 20, Math.PI * 1.15), furM);
    tail.rotation.set(Math.PI / 2, 0, 0.5); tail.position.set(-0.02, 0.05, 0.0); tail.castShadow = true; g.add(tail);
    const paw = sph(0.035, bellyM, { x: 0.09, y: 0.04, z: 0.1 }, 10); g.add(paw);
    if (stripes) {
        const sm = std(0x6b3a18, 0.95);
        for (let i = 0; i < 4; i++) { const s = box(0.012, 0.015, 0.2, sm, { x: -0.1 + i * 0.07, y: 0.17 - Math.abs(i - 1.5) * 0.012, z: 0 }); s.rotation.z = (i - 1.5) * 0.12; g.add(s); }
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return {
        group: g,
        update(t) {
            const b = Math.sin(t * 1.9);
            body.scale.set(1.2 + b * 0.012, 0.72 + b * 0.03, 1.0 + b * 0.012);
            tail.rotation.z = 0.5 + Math.sin(t * 0.5) * 0.04;
        },
    };
}

// ---------- reusable furniture & decor ----------
// A drooping strand of glowing bulbs between two points.
export function stringLights(ctx, { a, b, sag = 0.2, n = 18, size = 0.028, color = [4.5, 3.0, 1.1] }) {
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), n);
    const pts = [], m4 = new THREE.Matrix4(), col = new THREE.Color();
    for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u - sag * Math.sin(u * Math.PI), z = a[2] + (b[2] - a[2]) * u;
        m4.setPosition(x, y, z);
        bulbs.setMatrixAt(i, m4);
        col.setRGB(color[0], color[1] + Math.random() * 0.5, color[2]);
        bulbs.setColorAt(i, col);
        pts.push(new THREE.Vector3(x, y + 0.02, z));
    }
    ctx.world.add(bulbs);
    ctx.world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x1b0e02 })));
}

// A bookshelf with randomly coloured books. Back panel on local +Z, front faces -Z.
export function bookshelf({ w = 1.5, h = 2.1, d = 0.34, frame = 0x754e1a, back = 0x2a1708, cols = [0x6b6a3a, 0xb5603c, 0xe8d9bf, 0x3b2f4a, 0x7a3b2b, 0x2f4a42, 0xc98b4b, 0x8a8f6a, 0x9fa5a7], gap = 0.4 } = {}) {
    const g = new THREE.Group();
    const wood = std(frame, 0.6);
    g.add(box(0.04, h, d, wood, { x: -w / 2, y: h / 2 }));
    g.add(box(0.04, h, d, wood, { x: w / 2, y: h / 2 }));
    g.add(box(w, h, 0.02, std(back, 0.7), { y: h / 2, z: d / 2 - 0.01, cast: false }));
    const rows = Math.floor(h / gap);
    for (let s = 0; s <= rows; s++) {
        const y = 0.06 + s * gap;
        g.add(box(w, 0.035, d, wood, { y }));
        if (s === rows) break;
        let x = -w / 2 + 0.08;
        while (x < w / 2 - 0.12) {
            const bw = rnd(0.03, 0.07), bh = rnd(gap * 0.55, gap * 0.85);
            if (Math.random() < 0.1) { x += rnd(0.1, 0.25); continue; }
            g.add(box(bw, bh, rnd(0.18, d * 0.7), std(pick(cols), 0.85), { x: x + bw / 2, y: y + 0.0175 + bh / 2, z: -0.02, rz: Math.random() < 0.06 ? 0.15 : 0 }));
            x += bw + 0.004;
        }
    }
    return g;
}

// A table lamp whose base sits at y (the tabletop). Adds a warm light and halo.
export function tableLamp(ctx, { x, y, z, intensity = 5, shade = 0xe9c68a, base = 0xcfa66a, shadow = true, scale = 1 }) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.add(cyl(0.05, 0.08, 0.22 * scale, std(base, 0.35, 0.3), { y: 0.11 * scale }, 16));
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * scale, 0.2 * scale, 0.22 * scale, 28, 1, true),
        new THREE.MeshStandardMaterial({ color: shade, roughness: 0.7, side: THREE.DoubleSide, emissive: 0xff9a3a, emissiveIntensity: 1.6 }));
    sh.position.y = 0.33 * scale; g.add(sh);
    ctx.world.add(g);
    ctx.addLamp({ x, y: y + 0.28 * scale, z, intensity, shadow });
    ctx.glow(x, y + 0.28 * scale, z, 0.55 * scale, 0xffa850, 0.28);
    return g;
}

// A hanging curtain with soft folds. Returns the mesh; sways gently.
export function curtain(ctx, { x, y, z, w = 0.7, h = 2.6, color = 0x2f3a28, opacity = 1, folds = 22 }) {
    const g = new THREE.PlaneGeometry(w, h, 36, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * folds) * 0.045 + Math.sin(p.getX(i) * 9 + 1) * 0.03);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide, transparent: opacity < 1, opacity }));
    m.position.set(x, y, z);
    m.receiveShadow = true;
    ctx.world.add(m);
    const ph = Math.random() * 6;
    ctx.anim((t) => { m.rotation.y = Math.sin(t * 0.4 + ph) * 0.012; });
    return m;
}

// ---------- refractive rain on glass ----------
// A pane of glass drawn by a fragment shader. For each pixel it works out where the view ray would hit the
// picture of the outside (so parallax still works), then bends that look-up through water drops and blurs it
// through a misty film that running drops wipe clear. Drops, trails and glints are all procedural.
//   - beads:   one drop per hashed grid cell, fading in and out slowly
//   - runners: columns with a drop that slides down in stick-slip jerks, leaving a clear trail and tiny droplets
//   - lens:    each drop shifts the look-up by an inverted offset (like looking through a water lens)
//   - glints:  a bright highlight from the room's lamps and a dark rim on every drop
const RAIN_GLASS_VERT = /* glsl */`
    varying vec2 vUv;
    varying vec3 vWorld;
    void main() {
        vUv = uv;
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
    }`;

const RAIN_GLASS_FRAG = /* glsl */`
    uniform sampler2D uMap;
    uniform float uTime, uRain, uBright, uRefr, uHaze, uSeed, uDrop;
    uniform vec2 uSize, uBdSize, uTexel;
    uniform mat4 uBdInv;
    uniform vec3 uGlint;
    varying vec2 vUv;
    varying vec3 vWorld;

    // what every drop adds up to
    vec2 gN; float gMask, gClear, gSpec, gRim;

    float rnd(float n) { return fract(sin(n * 91.3458) * 47453.5453); }
    float rnd2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    // One water drop seen as a small lens. nd = offset from the drop centre in drop radii.
    void lens(vec2 nd, float dist, float inside) {
        float z = sqrt(max(0.0, 1.0 - dist * dist));
        vec3 n3 = normalize(vec3(nd, z + 0.25));
        vec3 h1 = normalize(vec3(-0.45, 0.55, 0.7) + vec3(0.0, 0.0, 1.0)); // lamp, upper left
        vec3 h2 = normalize(vec3(0.5, -0.4, 0.75) + vec3(0.0, 0.0, 1.0));  // soft bounce, lower right
        gSpec += (pow(max(dot(n3, h1), 0.0), 55.0) + 0.35 * pow(max(dot(n3, h2), 0.0), 28.0)) * inside;
        gRim = max(gRim, smoothstep(0.5, 0.95, dist) * inside);
        gN += -nd * inside;           // inverted, magnified look-up
        gMask = max(gMask, inside);
        gClear = max(gClear, inside); // a drop is clear water, even on misty glass
    }

    void addBeads(vec2 p, float cell, float dens, float seed, float rmin, float rmax) {
        vec2 g = p / cell, id = floor(g), f = fract(g) - 0.5;
        float h = rnd2(id + seed);
        if (h > dens) return;
        vec2 o = (vec2(rnd2(id + seed + 4.1), rnd2(id + seed + 9.7)) - 0.5) * 0.3;
        float r = mix(rmin, rmax, rnd2(id + seed + 2.3));
        float life = fract(uTime * (0.012 + 0.02 * h) + rnd2(id + seed + 6.1));
        r *= smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.75, 1.0, life));
        if (r < 0.02) return;
        vec2 d = (f - o) / r;
        float dist = length(d);
        float inside = 1.0 - smoothstep(0.8, 0.98, dist);
        if (inside > 0.0) lens(d, dist, inside);
    }

    void addRunners(vec2 p, float colW, float dens, float speed, float seed, float rx0) {
        float id = floor(p.x / colW);
        float H = uSize.y / uDrop;
        for (int k = 0; k < 2; k++) {
            float sd = id * 1.731 + float(k) * 37.17 + seed;
            if (rnd(sd) > dens) continue;
            float period = H + 0.5;
            float v = speed * (0.45 + rnd(sd + 2.0)) * 0.045;
            float tt = uTime * v / period + rnd(sd + 3.0);
            float s = tt + 0.022 * sin(tt * 37.7 + sd * 3.0);       // stick-slip: always moves on, sometimes barely
            float cyc = fract(s);
            float life = smoothstep(0.0, 0.03, cyc) * (1.0 - smoothstep(0.93, 1.0, cyc));
            float yh = H * 0.5 + 0.15 - cyc * period;               // head height, from above the top to below the bottom
            float ph = sd * 5.0;
            float xBase = (id + 0.5 + (rnd(sd + 5.0) - 0.5) * 0.35) * colW;
            float rx = rx0 * (0.8 + 0.5 * rnd(sd + 7.0));
            float ry = rx * 1.55;

            // the drop itself, wandering a little as it falls
            float headX = xBase + sin(yh * 31.0 + ph) * 0.0035;
            vec2 d = vec2((p.x - headX) / rx, (p.y - yh) / ry);
            float dist = length(d);
            float head = (1.0 - smoothstep(0.82, 1.0, dist)) * life;
            if (head > 0.0) lens(d, dist, head);

            // the clear trail it leaves behind
            float up = p.y - yh;
            float tl = min(cyc * period, 1.2);
            if (up > 0.0 && up < tl) {
                float along = up / tl;
                float dx = p.x - (xBase + sin(p.y * 31.0 + ph) * 0.0035);
                float w = rx * 0.65 * (1.0 - 0.55 * along);
                float tm = (1.0 - smoothstep(w * 0.5, w, abs(dx))) * (1.0 - smoothstep(0.6, 1.0, along)) * life;
                float e = abs(dx) / w;
                float ring = smoothstep(0.5, 0.9, e) * (1.0 - smoothstep(0.9, 1.25, e)) * (1.0 - smoothstep(0.6, 1.0, along)) * life;
                gRim = max(gRim, ring * 0.4);   // a faint dark edge so the trail reads
                gMask = max(gMask, tm * 0.5);
                gClear = max(gClear, tm * 0.95);
                gN += vec2(clamp(dx / w, -1.0, 1.0), 0.0) * -0.25 * tm;

                // tiny droplets stranded along the way
                float yi = floor(p.y / 0.055);
                vec2 rid = vec2(sd * 3.1, yi);
                if (rnd2(rid) < 0.5) {
                    float cy = (yi + 0.15 + 0.7 * rnd2(rid + 1.7)) * 0.055;
                    float cx = xBase + sin(cy * 31.0 + ph) * 0.0035 + (rnd2(rid + 2.9) - 0.5) * 0.01;
                    float rr = max((0.004 + 0.004 * rnd2(rid + 4.3)) * (1.0 - smoothstep(0.5, 1.0, along)) * life, 1e-4);
                    vec2 dd = vec2(p.x - cx, p.y - cy) / rr;
                    float dd2 = length(dd);
                    float ins = 1.0 - smoothstep(0.8, 1.0, dd2);
                    if (ins > 0.0) lens(dd, dd2, ins);
                }
            }
        }
    }

    void main() {
        vec2 p = (vUv - 0.5) * uSize / uDrop;   // pane position in drop-size units
        gN = vec2(0.0); gMask = 0.0; gClear = 0.0; gSpec = 0.0; gRim = 0.0;
        float R = uRain;
        if (R > 0.01) {
            addBeads(p, 0.022, 0.10 + 0.28 * R, uSeed, 0.16, 0.34);                  // fine mist of tiny drops
            addBeads(p + 0.13, 0.04, 0.08 + 0.25 * R, uSeed + 7.0, 0.14, 0.30);      // small drops
            addBeads(p + 0.31, 0.09, 0.04 + 0.20 * R, uSeed + 11.0, 0.10, 0.26);     // fat drops
            addRunners(p, 0.05, 0.25 + 0.5 * R, 0.6 + 0.9 * R, uSeed + 21.0, 0.0055);
            addRunners(p + 0.2, 0.09, 0.3 + 0.55 * R, 0.55 + 0.8 * R, uSeed + 33.0, 0.0085);
            addRunners(p + 0.45, 0.16, 0.14 + 0.4 * R, 0.5 + 0.7 * R, uSeed + 47.0, 0.012);
        }

        // where this view ray lands on the picture of the outside, then bend it through the drops
        vec3 dir = normalize(vWorld - cameraPosition);
        vec3 pl = (uBdInv * vec4(vWorld, 1.0)).xyz;
        vec3 dl = (uBdInv * vec4(dir, 0.0)).xyz;
        vec2 hit = pl.xy + dl.xy * (-pl.z / dl.z);
        vec2 uv = hit / uBdSize + 0.5 + gN * uRefr / uBdSize;

        // misty film everywhere, wiped clear by drops and trails
        float lod = (1.0 - clamp(gClear, 0.0, 1.0)) * uHaze * smoothstep(0.0, 0.5, R);
        vec2 o = uTexel * exp2(lod) * 0.75;
        vec3 col = 0.4 * textureLod(uMap, uv, lod).rgb
                 + 0.15 * (textureLod(uMap, uv + vec2(o.x, o.y), lod).rgb + textureLod(uMap, uv - vec2(o.x, o.y), lod).rgb
                         + textureLod(uMap, uv + vec2(o.x, -o.y), lod).rgb + textureLod(uMap, uv - vec2(o.x, -o.y), lod).rgb);
        col *= vec3(uBright, uBright * 1.02, uBright * 1.08);   // follows the lightning flash

        col *= 1.0 + 0.25 * gMask;      // a drop gathers a little light
        col *= 1.0 - 0.7 * gRim;        // dark edge ring
        col += uGlint * gSpec * 0.5;    // highlights
        gl_FragColor = vec4(col, 1.0);
    }`;

// `backdrop` is the picture of the outside from ctx.backdrop(). It gets hidden: this glass draws it itself.
export function addRainGlass(ctx, { w, h, backdrop, refr = 4.5, haze = 1.4, drop = 2.0, glint = [1.0, 0.82, 0.55] }) {
    backdrop.updateMatrixWorld(true);
    const map = backdrop.material.map;
    const u = {
        uMap: { value: map }, uTime: { value: 0 }, uRain: { value: ctx.state.rain }, uBright: { value: backdrop.userData.flash?.base ?? 1.25 },
        uSize: { value: new THREE.Vector2(w, h) },
        uBdSize: { value: new THREE.Vector2(backdrop.geometry.parameters.width, backdrop.geometry.parameters.height) },
        uBdInv: { value: backdrop.matrixWorld.clone().invert() },
        uTexel: { value: new THREE.Vector2(1 / map.image.width, 1 / map.image.height) },
        uRefr: { value: refr }, uHaze: { value: haze }, uDrop: { value: drop },
        uGlint: { value: new THREE.Color(glint[0], glint[1], glint[2]) }, uSeed: { value: Math.random() * 40 },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: RAIN_GLASS_VERT, fragmentShader: RAIN_GLASS_FRAG, transparent: true, depthWrite: false });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    glass.renderOrder = -1; // first among the see-through things, so glows, steam and rain streaks draw over it
    ctx.world.add(glass);
    backdrop.visible = false;
    if (backdrop.userData.flash) backdrop.userData.flash.apply = (v) => { u.uBright.value = v; };
    ctx.anim((t) => { u.uTime.value = t; u.uRain.value = ctx.state.rain; });
    return glass;
}
