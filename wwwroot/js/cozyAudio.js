// Procedural ambience (no audio files): rain on glass, soft rumbles of thunder and a faint clock.
// Everything is synthesised with the Web Audio API from filtered noise.

let ctx = null;
let master = null;     // user volume / mute
let room = null;       // "heard from inside" filter chain input
let analyser = null;
let rainBus = null;
let rumbleGain = null;
let washGain = null;
let hissGain = null;
let dropTimer = null;
let tickTimer = null;
let started = false;

const state = { volume: 0.6, rain: 0.6, muted: false, thunder: true };

function makeNoise(seconds, kind) {
    const rate = ctx.sampleRate;
    const buffer = ctx.createBuffer(2, Math.floor(rate * seconds), rate);
    for (let c = 0; c < 2; c++) {
        const d = buffer.getChannelData(c);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
        for (let i = 0; i < d.length; i++) {
            const w = Math.random() * 2 - 1;
            if (kind === 'brown') {
                last = (last + 0.02 * w) / 1.02;
                d[i] = last * 3.5;
            } else if (kind === 'pink') {
                b0 = 0.99886 * b0 + w * 0.0555179;
                b1 = 0.99332 * b1 + w * 0.0750759;
                b2 = 0.96900 * b2 + w * 0.1538520;
                b3 = 0.86650 * b3 + w * 0.3104856;
                b4 = 0.55000 * b4 + w * 0.5329522;
                b5 = -0.7616 * b5 - w * 0.0168980;
                d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
                b6 = w * 0.115926;
            } else {
                d[i] = w;
            }
        }
        // Cross-fade the ends so the loop is seamless.
        const f = Math.floor(rate * 0.25);
        for (let i = 0; i < f; i++) {
            const t = i / f;
            d[i] = d[i] * t + d[d.length - f + i] * (1 - t);
        }
    }
    return buffer;
}

function loopSource(buffer) {
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    s.loop = true;
    s.loopStart = 0.25;
    s.loopEnd = buffer.duration - 0.25;
    s.start(0, Math.random() * (buffer.duration - 1));
    return s;
}

function applyRain() {
    if (!ctx) return;
    const r = state.rain;
    const t = ctx.currentTime;
    // Intensity shapes the mix: light rain is mostly gentle hiss + drops, heavy rain adds wash and low rumble.
    washGain.gain.setTargetAtTime(0.05 + r * 0.55, t, 0.15);
    hissGain.gain.setTargetAtTime(0.03 + r * 0.22, t, 0.15);
    rumbleGain.gain.setTargetAtTime(Math.max(0, r - 0.25) * 0.5, t, 0.2);
}

function applyMaster() {
    if (!ctx) return;
    master.gain.setTargetAtTime(state.muted ? 0 : Math.pow(state.volume, 1.6), ctx.currentTime, 0.1);
}

// A single raindrop on the window: a very short band-passed noise tick, randomly panned.
function drop(when) {
    const src = ctx.createBufferSource();
    src.buffer = dropNoise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800 + Math.random() * 3500;
    bp.Q.value = 3 + Math.random() * 6;
    const g = ctx.createGain();
    const peak = (0.05 + Math.random() * 0.18) * (0.4 + state.rain);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(peak, when + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.03 + Math.random() * 0.05);
    let node = g;
    if (ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = Math.random() * 1.6 - 0.8;
        g.connect(p);
        node = p;
    }
    src.connect(bp).connect(g);
    node.connect(rainBus);
    src.start(when, Math.random() * 0.5, 0.12);
}

let dropNoise = null;
function scheduleDrops() {
    // Look-ahead scheduler so drops stay smooth even if the main thread stutters.
    const now = ctx.currentTime;
    const rate = 6 + state.rain * 60; // drops per second
    const horizon = 0.25;
    const n = Math.round(rate * horizon);
    for (let i = 0; i < n; i++) drop(now + Math.random() * horizon);
}

let tickToggle = false;
function tick() {
    if (!ctx || state.muted) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = dropNoise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = tickToggle ? 1500 : 1900;
    bp.Q.value = 9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.02, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(bp).connect(g).connect(room);
    src.start(t, Math.random() * 0.4, 0.08);
    tickToggle = !tickToggle;
}

export async function start(volume = 0.6, rain = 0.6, thunder = true) {
    state.volume = volume;
    state.rain = rain;
    state.thunder = thunder;
    if (started) {
        if (ctx.state === 'suspended') await ctx.resume();
        applyMaster();
        applyRain();
        return true;
    }

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    if (ctx.state === 'suspended') await ctx.resume();

    // Chain: sources -> rainBus -> room (muffled, as if heard indoors) -> master -> analyser -> out
    master = ctx.createGain();
    master.gain.value = 0;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    master.connect(analyser);
    analyser.connect(ctx.destination);

    room = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5200;
    lp.Q.value = 0.5;
    const body = ctx.createBiquadFilter(); // a touch of low warmth from the room
    body.type = 'lowshelf';
    body.frequency.value = 250;
    body.gain.value = 3;
    room.connect(lp).connect(body).connect(master);

    rainBus = ctx.createGain();
    rainBus.connect(room);

    const pink = makeNoise(8, 'pink');
    const brown = makeNoise(8, 'brown');
    dropNoise = makeNoise(1, 'white');

    // Wash: the broad "shhhh" of many drops.
    washGain = ctx.createGain();
    const washBP = ctx.createBiquadFilter();
    washBP.type = 'bandpass';
    washBP.frequency.value = 1400;
    washBP.Q.value = 0.35;
    loopSource(pink).connect(washBP).connect(washGain).connect(rainBus);

    // Hiss: brighter top end.
    hissGain = ctx.createGain();
    const hissHP = ctx.createBiquadFilter();
    hissHP.type = 'highpass';
    hissHP.frequency.value = 3500;
    loopSource(pink).connect(hissHP).connect(hissGain).connect(rainBus);

    // Rumble: low drumming of heavier rain on the roof.
    rumbleGain = ctx.createGain();
    const rumbleLP = ctx.createBiquadFilter();
    rumbleLP.type = 'lowpass';
    rumbleLP.frequency.value = 380;
    loopSource(brown).connect(rumbleLP).connect(rumbleGain).connect(rainBus);

    applyRain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    applyMaster();

    dropTimer = setInterval(scheduleDrops, 250);
    tickTimer = setInterval(tick, 1000);
    started = true;
    return true;
}

export function setVolume(v) { state.volume = v; applyMaster(); }
export function setMuted(m) { state.muted = !!m; applyMaster(); }
export function setRain(r) { state.rain = r; applyRain(); }
export function setThunder(on) { state.thunder = !!on; }

// Distant thunder: a slow swell of low noise with a long tail. `delay` seconds after the flash.
export function thunder(delay = 1.2, strength = 0.7) {
    if (!ctx || !state.thunder) return;
    const t0 = ctx.currentTime + delay;
    const dur = 5 + strength * 4;
    const src = ctx.createBufferSource();
    src.buffer = makeNoise(Math.ceil(dur) + 1, 'brown');
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(420, t0);
    lp.frequency.exponentialRampToValueAtTime(70, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(1.4 * strength, t0 + 0.35);
    g.gain.setTargetAtTime(0.0001, t0 + 0.9, dur / 4);
    src.connect(lp).connect(g).connect(room);
    src.start(t0);
    src.stop(t0 + dur + 1);
}

// Test/diagnostic helpers.
export function getLevel() {
    if (!analyser) return 0;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
}
export function getState() { return ctx ? ctx.state : 'none'; }

export function stop() {
    clearInterval(dropTimer);
    clearInterval(tickTimer);
    if (ctx) { ctx.close(); }
    ctx = master = room = analyser = rainBus = null;
    started = false;
}
