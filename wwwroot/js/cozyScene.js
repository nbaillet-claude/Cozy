// Engine: renderer, post-processing, rain, lightning, lamps and scene switching.
// Each scene (see ./scenes) builds its own room into `ctx.world` and returns a small config.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import * as kit from './kit.js';
import * as audio from './cozyAudio.js';
import livingRoom from './scenes/livingRoom.js';
import windowSeat from './scenes/windowSeat.js';
import atticBedroom from './scenes/atticBedroom.js';
import kitchen from './scenes/kitchen.js';
import cabin from './scenes/cabin.js';

const { rnd, clamp01 } = kit;
const SCENES = [livingRoom, windowSeat, atticBedroom, kitchen, cabin];

let renderer, composer, bloom, scene, world, camera, canvas, ro;
let running = false;
let animations = [], lamps = [], flashables = [];
let rain = null, cfg = null, windowLight = null, hemi = null, ambient = null;
let current = null, loading = false;
let state = { rain: 0.6, warmth: 0.65, thunder: true };
let pointer = { x: 0, y: 0, tx: 0, ty: 0 };
let flashLevel = 0, nextFlashAt = 0;
let frames = 0, fpsEMA = 0, lastT = 0;
let onPointer = null, onKey = null, dotnet = null;

const DEFAULTS = {
    camera: { pos: [0, 1.55, 6.4], look: [0.15, 1.25, -1], fov: 42, parallax: [0.55, 0.18], narrow: { dz: 2.0, dfov: 14, dlook: 0.35, dy: -0.15 } },
    hemi: [0x44525a, 0x3a2410, 0.3], ambient: [0x4a3524, 0.22], exposure: 0.95, bloom: [0.42, 0.6, 1.0],
    windowLight: { color: 0x6f8794, intensity: 0.35, pos: [1.5, 3.5, -9], target: [0, 0.4, 0] },
    rain: { x: [-5, 5], z: [-3.15, -12], top: 5, h: 7, wind: 0.08, width: 0.011, len: 1, color: 0xa9bcc8, alpha: 1, clip: [0, 0, 0, 1] },
    audio: {}, flashGain: 2.6,
    background: 0x1b0e02,
};

// ---------- lights & glows exposed to scenes ----------
function addLamp({ x, y, z, intensity, color = 0xffb866, shadow = true, distance = 0, flicker = 0.04, candle = false, colorLock = false, decay = 2 }) {
    const l = new THREE.PointLight(color, intensity, distance, decay);
    l.position.set(x, y, z);
    if (shadow) {
        l.castShadow = true;
        l.shadow.mapSize.set(1024, 1024);
        l.shadow.bias = -0.0008;
        l.shadow.normalBias = 0.02;
        l.shadow.radius = 5;
    }
    world.add(l);
    const rec = { light: l, base: intensity, flicker, candle, colorLock, seed: Math.random() * 100, mul: 1 };
    lamps.push(rec);
    return rec;
}

function glow(x, y, z, size, color, opacity, parent) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: kit.softSprite(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(size);
    s.position.set(x, y, z);
    (parent || world).add(s);
    return s;
}

// A big picture of the weather outside. It brightens in a lightning flash.
function backdrop({ style, pal, pos, size, rot = [0, 0, 0], quat, bright = 1.25, gain }) {
    const mat = new THREE.MeshBasicMaterial({ map: kit.backdropTexture(style, pal), toneMapped: true });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    if (quat) m.quaternion.copy(quat);
    world.add(m);
    const rec = { mat, base: bright, gain };
    flashables.push(rec);
    m.userData.flash = rec;
    return m;
}

function makeCtx() {
    return {
        THREE, kit, world, state,
        anim: (fn) => animations.push(fn),
        addLamp, glow, backdrop,
    };
}

// ---------- rain ----------
function buildRain(R) {
    const MAX = 5000;
    const pos = new Float32Array(MAX * 4 * 3);
    const corner = new Float32Array(MAX * 4 * 2);
    const seed = new Float32Array(MAX * 4 * 3);
    const idx = new Uint32Array(MAX * 6);
    for (let i = 0; i < MAX; i++) {
        const x = rnd(R.x[0], R.x[1]), z = R.z[0] + (R.z[1] - R.z[0]) * Math.pow(Math.random(), 1.3);
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
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, -8), 80);

    const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: { value: 0 }, uColor: { value: new THREE.Color(R.color) }, uBoost: { value: 1 },
            uTop: { value: R.top }, uH: { value: R.h }, uWind: { value: R.wind }, uWidth: { value: R.width }, uLen: { value: R.len },
            uAlpha: { value: R.alpha }, uClip: { value: new THREE.Vector4(...R.clip) },
        },
        vertexShader: /* glsl */`
            attribute vec2 aCorner; attribute vec3 aSeed;
            uniform float uTime, uTop, uH, uWind, uWidth, uLen;
            uniform vec4 uClip;
            varying float vA; varying float vT; varying float vClip;
            void main() {
                float speed = 10.0 + aSeed.y * 6.0;
                float fall = mod(aSeed.x * uH + uTime * speed, uH);
                float len = (1.0 + aSeed.y * 1.4) * uLen;
                vec3 p = position;
                p.y = uTop - fall - aCorner.y * len;
                p.x += (uTop - p.y) * uWind + aCorner.x * uWidth;
                vT = aCorner.y;
                vClip = dot(uClip, vec4(p, 1.0));
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                vA = aSeed.z * (0.5 + 0.5 * smoothstep(-10.0, -3.0, mv.z));
                gl_Position = projectionMatrix * mv;
            }`,
        fragmentShader: /* glsl */`
            uniform vec3 uColor; uniform float uBoost; uniform float uAlpha;
            varying float vA; varying float vT; varying float vClip;
            void main() {
                if (vClip < 0.0) discard;
                float a = vA * (1.0 - vT * 0.75) * uAlpha * uBoost;
                gl_FragColor = vec4(uColor, a);
            }`,
    });
    rain = new THREE.Mesh(geo, mat);
    rain.frustumCulled = false;
    rain.renderOrder = 2;
    rain.userData.max = MAX;
    world.add(rain);
    setRain(state.rain);
    animations.push((t) => { mat.uniforms.uTime.value = t; mat.uniforms.uBoost.value = 1 + flashLevel * 2.5; });
}

// Floating dust motes catching the lamplight.
function buildDust(area) {
    const N = 140, pos = new Float32Array(N * 3), seeds = [];
    for (let i = 0; i < N; i++) {
        const x = rnd(area.x[0], area.x[1]), y = rnd(area.y[0], area.y[1]), z = rnd(area.z[0], area.z[1]);
        pos.set([x, y, z], i * 3);
        seeds.push([x, y, z, rnd(0.1, 0.4), rnd(0, 6)]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({
        map: kit.softSprite(), size: 0.022, color: 0xffd9a0, transparent: true, opacity: 0.35,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    world.add(pts);
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
    const col = new THREE.Color(0xffd7a0).lerp(new THREE.Color(0xff9238), w);
    for (const l of lamps) {
        if (!l.colorLock) l.light.color.copy(col);
        l.mul = k;
    }
    if (hemi && cfg) hemi.intensity = cfg.hemi[2] * (1.33 - 0.66 * w);
}

function updateLamps(t) {
    for (const l of lamps) {
        const f = 1 + (Math.sin(t * 7 + l.seed) * 0.5 + Math.sin(t * 13.1 + l.seed * 2) * 0.5) * l.flicker * (l.candle ? 1 : 0.35);
        l.light.intensity = l.base * l.mul * f;
    }
}

// ---------- lightning ----------
function updateLightning(t, dt) {
    if (state.thunder && t > nextFlashAt) triggerLightning();
    flashLevel = Math.max(0, flashLevel - dt * 1.6);
    const f = flashLevel;
    for (const b of flashables) {
        const v = b.base + f * (b.gain ?? cfg.flashGain);
        b.mat.color.setRGB(v, v * 1.02, v * 1.08);
        if (b.apply) b.apply(v);
    }
    if (windowLight) windowLight.intensity = cfg.windowLight.intensity + f * 2.2;
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

// ---------- scene management ----------
function disposeWorld() {
    if (!world) return;
    world.traverse((o) => {
        o.geometry?.dispose?.();
        const m = o.material;
        if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { x.map?.dispose?.(); x.dispose?.(); });
    });
    scene.remove(world);
}

function merge(def, over) {
    const out = { ...def };
    for (const k of Object.keys(over || {})) {
        out[k] = (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k]) && !Array.isArray(over[k])) ? { ...def[k], ...over[k] } : over[k];
    }
    return out;
}

function buildScene(def) {
    disposeWorld();
    world = new THREE.Group();
    scene.add(world);
    animations = []; lamps = []; flashables = []; rain = null;

    const ctx = makeCtx();
    const out = def.build(ctx) || {};
    cfg = merge(DEFAULTS, out);

    scene.background = new THREE.Color(cfg.background);
    renderer.setClearColor(cfg.background);
    hemi = new THREE.HemisphereLight(cfg.hemi[0], cfg.hemi[1], cfg.hemi[2]);
    ambient = new THREE.AmbientLight(cfg.ambient[0], cfg.ambient[1]);
    windowLight = new THREE.DirectionalLight(cfg.windowLight.color, cfg.windowLight.intensity);
    windowLight.position.set(...cfg.windowLight.pos);
    windowLight.target.position.set(...cfg.windowLight.target);
    world.add(hemi, ambient, windowLight, windowLight.target);

    buildRain(cfg.rain);
    if (cfg.dust) buildDust(cfg.dust);
    applyWarmth();
    renderer.toneMappingExposure = cfg.exposure;
    bloom.strength = cfg.bloom[0]; bloom.radius = cfg.bloom[1]; bloom.threshold = cfg.bloom[2];
    audio.setProfile(cfg.audio);

    pointer.x = pointer.y = pointer.tx = pointer.ty = 0;
    resize();
    positionCamera(performance.now() / 1000);
    nextFlashAt = performance.now() / 1000 + rnd(14, 24);
    current = def;
}

export function getScenes() {
    return SCENES.map((s) => ({ id: s.id, name: s.name, blurb: s.blurb }));
}

export async function setScene(id, { fade = true } = {}) {
    const def = SCENES.find((s) => s.id === id) || SCENES[0];
    if (loading || !renderer) return { id: def.id, name: def.name, blurb: def.blurb };
    if (current === def) return { id: def.id, name: def.name, blurb: def.blurb };
    loading = true;
    if (fade && canvas) {
        canvas.style.transition = 'opacity .28s ease';
        canvas.style.opacity = '0';
        await new Promise((r) => setTimeout(r, 300));
    }
    try { buildScene(def); } finally { loading = false; }
    try {
        const u = new URL(window.location.href);
        u.searchParams.set('scene', def.id);
        window.history.replaceState(null, '', u);
    } catch { /* ignore */ }
    if (canvas) { canvas.style.opacity = '1'; }
    return { id: def.id, name: def.name, blurb: def.blurb };
}

async function step(delta) {
    const i = SCENES.indexOf(current);
    const next = SCENES[(i + delta + SCENES.length) % SCENES.length];
    const info = await setScene(next.id);
    dotnet?.invokeMethodAsync('OnSceneChanged', info.id).catch(() => { });
}

// ---------- public API ----------
export async function init(canvasEl, opts = {}) {
    if (renderer) dispose();
    canvas = canvasEl;
    state = { ...state, rain: opts.rain ?? state.rain, warmth: opts.warmth ?? state.warmth, thunder: opts.thunder ?? state.thunder };
    dotnet = opts.dotnet || null;

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

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 90);

    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.6, 1.0);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    ro = new ResizeObserver(resize);
    ro.observe(canvas);
    onPointer = (e) => {
        pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    onKey = (e) => {
        if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.key.startsWith('Arrow')) return;
        if (e.key === 'ArrowRight') step(1);
        else if (e.key === 'ArrowLeft') step(-1);
        else if (/^[1-9]$/.test(e.key) && SCENES[+e.key - 1]) setScene(SCENES[+e.key - 1].id).then((i) => dotnet?.invokeMethodAsync('OnSceneChanged', i.id).catch(() => { }));
    };
    window.addEventListener('keydown', onKey);

    let want = opts.scene;
    try { want = want || new URL(window.location.href).searchParams.get('scene'); } catch { /* ignore */ }
    current = null;
    await setScene(want || SCENES[0].id, { fade: false });

    lastT = performance.now() / 1000;
    running = true;
    renderer.setAnimationLoop(frame);
    return true;
}

export function currentScene() { return current ? current.id : null; }

function resize() {
    if (!renderer || !canvas) return;
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    camera.aspect = w / h;
    const c = cfg?.camera || DEFAULTS.camera;
    // Narrow screens: pull back and widen so the whole scene stays in frame.
    const narrow = clamp01(1.5 - camera.aspect);
    camera.userData.narrow = narrow;
    camera.fov = c.fov + narrow * c.narrow.dfov;
    camera.updateProjectionMatrix();
}

function positionCamera(t) {
    const c = cfg.camera;
    const n = camera.userData.narrow || 0;
    camera.position.set(
        c.pos[0] + pointer.x * c.parallax[0] + Math.sin(t * 0.07) * 0.08,
        c.pos[1] - pointer.y * c.parallax[1],
        c.pos[2] + n * c.narrow.dz
    );
    camera.lookAt(c.look[0] + n * c.narrow.dlook - pointer.x * 0.25, c.look[1] + n * (c.narrow.dy ?? -0.15), c.look[2]);
}

function frame() {
    if (!running || !cfg) return;
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, now - lastT);
    lastT = now;

    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    positionCamera(now);

    updateLamps(now);
    updateLightning(now, dt);
    for (const a of animations) a(now, dt);

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
export function setThunder(on) { state.thunder = !!on; }
export function isNarrow() { return window.innerWidth < 640; }
export function getStats() {
    return { frames, fps: Math.round(fpsEMA), rain: state.rain, warmth: state.warmth, scene: current?.id, calls: renderer?.info.render.calls, tris: renderer?.info.render.triangles };
}

export function dispose() {
    running = false;
    if (renderer) renderer.setAnimationLoop(null);
    if (ro) ro.disconnect();
    if (onPointer) window.removeEventListener('pointermove', onPointer);
    if (onKey) window.removeEventListener('keydown', onKey);
    disposeWorld();
    composer?.dispose?.();
    renderer?.dispose();
    renderer = composer = scene = camera = world = null;
    animations = []; lamps = []; flashables = []; rain = null; current = null; cfg = null;
}
