// Scene 5: cabin. Log walls, a crackling stone fireplace, someone in a plaid blanket on a sheepskin rug, a cat by the hearth, pine forest in the rain.
const R = { x0: -3.6, x1: 3.6, z0: -3, z1: 3.2, h: 3.3 };
const WIN = { x0: -2.9, x1: -0.9, y0: 0.9, y1: 2.4 };
const FP = { x: 1.55, w: 2.2, d: 0.75 }; // chimney breast

export default {
    id: 'cabin',
    name: 'Cabin',
    blurb: 'Wrapped in plaid by a crackling fire.',
    build(ctx) {
        const { THREE, kit, world } = ctx;
        const { rnd, std, box, rbox, cyl, sph, mesh, clamp01, smooth } = kit;
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        const darkWood = std(0x3a2414, 0.65), wood = std(0x6a4426, 0.65), plaid = kit.plaidTexture('#a8322a', '#1c1512');

        // texture clone with its own repeat, for log walls of different sizes
        const logBase = kit.logTexture({ base: [128, 96, 64], rows: 6, repeat: [1, 1] });
        const logMat = (rx, ry) => { const t = logBase.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return std(0xffffff, 0.85, 0, { map: t }); };

        // ----- shell -----
        world.add(mesh(new THREE.PlaneGeometry(7.2, 6.2), std(0xffffff, 0.55, 0, { map: kit.plankTexture({ base: [92, 60, 34], rows: 10, repeat: [2, 2.6], vary: 30 }) }), { z: 0.1, rx: -Math.PI / 2, cast: false }));
        world.add(mesh(new THREE.PlaneGeometry(7.2, 6.2), std(0x3a2616, 0.95), { y: R.h, z: 0.1, rx: Math.PI / 2, cast: false }));
        for (const z of [-2.0, -0.2, 1.6]) world.add(box(7.2, 0.22, 0.24, darkWood, { y: R.h - 0.11, z }));
        const t = 0.25, zc = R.z0 - t / 2;
        const bw = (x0, x1, y0, y1) => world.add(box(x1 - x0, y1 - y0, t, logMat((x1 - x0) / 2.4, (y1 - y0) / 2.2), { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: zc, cast: false }));
        bw(R.x0, WIN.x0, 0, R.h); bw(WIN.x1, R.x1, 0, R.h); bw(WIN.x0, WIN.x1, 0, WIN.y0); bw(WIN.x0, WIN.x1, WIN.y1, R.h);
        world.add(box(0.25, R.h, 6.2, logMat(2.6, 1.5), { x: R.x0 - 0.125, y: R.h / 2, z: 0.1, cast: false }));
        world.add(box(0.25, R.h, 6.2, logMat(2.6, 1.5), { x: R.x1 + 0.125, y: R.h / 2, z: 0.1, cast: false }));

        // window with a deep frame
        const fz = R.z0 + 0.02, frame = std(0x2a1708, 0.6);
        world.add(box(WIN.x1 - WIN.x0 + 0.2, 0.1, 0.18, frame, { x: (WIN.x0 + WIN.x1) / 2, y: WIN.y1 + 0.05, z: fz }));
        world.add(box(WIN.x1 - WIN.x0 + 0.3, 0.06, 0.4, wood, { x: (WIN.x0 + WIN.x1) / 2, y: WIN.y0 - 0.03, z: R.z0 + 0.15 }));
        for (const x of [WIN.x0 - 0.05, WIN.x1 + 0.05]) world.add(box(0.1, WIN.y1 - WIN.y0, 0.18, frame, { x, y: (WIN.y0 + WIN.y1) / 2, z: fz }));
        world.add(box(0.05, WIN.y1 - WIN.y0, 0.1, frame, { x: (WIN.x0 + WIN.x1) / 2, y: (WIN.y0 + WIN.y1) / 2, z: fz }));
        world.add(box(WIN.x1 - WIN.x0, 0.05, 0.1, frame, { x: (WIN.x0 + WIN.x1) / 2, y: (WIN.y0 + WIN.y1) / 2, z: fz }));
        const glass = kit.addGlass(ctx, { w: WIN.x1 - WIN.x0, h: WIN.y1 - WIN.y0 });
        glass.position.set((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, R.z0 + 0.05);
        ctx.backdrop({ style: 'forest', pal: { top: '#0a1118', mid: '#16222c', hor: '#2c3e4c', haze: '70,90,105', horizon: 0.7 }, pos: [-1, 3.4, -14], size: [50, 14], bright: 1.3 });
        // plaid curtains tied back
        const pc = (x) => { const m = kit.curtain(ctx, { x, y: 1.9, z: R.z0 + 0.2, w: 0.5, h: 1.7, color: 0xffffff }); m.material.map = plaid; m.material.color.set(0xffffff); m.material.needsUpdate = true; };
        pc(WIN.x0 + 0.15); pc(WIN.x1 - 0.15);
        world.add(cyl(0.015, 0.015, 2.5, darkWood, { x: (WIN.x0 + WIN.x1) / 2, y: 2.78, z: R.z0 + 0.19, rz: Math.PI / 2, cast: false }, 8));

        // ----- stone fireplace -----
        const stoneBase = kit.stoneTexture({ base: [124, 110, 98] });
        const stoneMat = () => { const t = stoneBase.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3); return std(0xffffff, 0.9, 0, { map: t }); };
        const FB = { x0: -0.55, x1: 0.55, y0: 0.15, y1: 1.1 };
        const chimney = kit.wallWithHole({ w: FP.w, h: R.h, t: FP.d, hole: FB, mat: stoneMat(), cast: true });
        chimney.position.set(FP.x, 0, R.z0 + FP.d / 2);
        chimney.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = true; } });
        world.add(chimney);
        // firebox lining + hearth + mantel
        world.add(box(FB.x1 - FB.x0, FB.y1 - FB.y0, 0.05, std(0x0a0706, 0.95), { x: FP.x, y: (FB.y0 + FB.y1) / 2, z: R.z0 + 0.04, cast: false }));
        world.add(box(FB.x1 - FB.x0, 0.05, FP.d - 0.1, std(0x1a1210, 0.95), { x: FP.x, y: FB.y0 - 0.02, z: R.z0 + FP.d / 2 - 0.05, cast: false }));
        world.add(box(FP.w + 0.3, 0.1, 0.62, std(0x5a5048, 0.9), { x: FP.x, y: 0.05, z: R.z0 + FP.d + 0.26 }));
        world.add(box(FP.w + 0.5, 0.12, 0.34, wood, { x: FP.x, y: 1.5, z: R.z0 + FP.d + 0.1 }));
        // mantel decor: candles, jars, a frame
        for (const [cx, h] of [[0.75, 0.2], [0.98, 0.14], [2.35, 0.17]]) {
            world.add(cyl(0.03, 0.03, h, std(0xf4e6c6, 0.7), { x: cx + 0.2, y: 1.56 + h / 2, z: R.z0 + FP.d + 0.1 }, 12));
            world.add(sph(0.011, new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1) }), { x: cx + 0.2, y: 1.58 + h + 0.015, z: R.z0 + FP.d + 0.1, cast: false }, 8));
        }
        const fr = new THREE.Group(); fr.position.set(FP.x, 2.15, R.z0 + FP.d + 0.02);
        fr.add(box(0.8, 0.6, 0.05, darkWood, { cast: false }));
        const fp = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), new THREE.MeshStandardMaterial({ map: kit.paintingTexture('#2a3d4a', '#c98b4b', 'rgba(220,200,170,0.5)'), roughness: 0.9 })); fp.position.z = 0.03; fr.add(fp); world.add(fr);

        // logs + flames + embers
        const logM = std(0x2a1308, 0.9, 0, { emissive: 0xff4a10, emissiveIntensity: 0.55 });
        const fy = FB.y0 + 0.07, fz0 = R.z0 + 0.4;
        world.add(cyl(0.075, 0.075, 0.8, logM, { x: FP.x - 0.05, y: fy, z: fz0, rz: Math.PI / 2 + 0.05 }, 10));
        world.add(cyl(0.07, 0.07, 0.7, logM, { x: FP.x + 0.05, y: fy + 0.14, z: fz0 - 0.06, rz: Math.PI / 2 - 0.12 }, 10));
        world.add(cyl(0.065, 0.065, 0.6, logM, { x: FP.x, y: fy + 0.06, z: fz0 + 0.12, rx: Math.PI / 2, ry: 0.4 }, 10));
        const fireY = fy + 0.18;
        const flameTex = kit.canvasTex(64, 128, (g, w, h) => {
            const gr = g.createRadialGradient(32, 96, 2, 32, 74, 58);
            gr.addColorStop(0, 'rgba(255,245,190,1)'); gr.addColorStop(0.3, 'rgba(255,170,50,0.95)'); gr.addColorStop(0.65, 'rgba(225,70,12,0.55)'); gr.addColorStop(1, 'rgba(120,20,0,0)');
            g.fillStyle = gr; g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(60, 50, 62, 100, 32, 124); g.bezierCurveTo(2, 100, 4, 50, 32, 4); g.fill();
        });
        const flames = [];
        for (let i = 0; i < 7; i++) {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
            world.add(s);
            flames.push({ s, x: FP.x + rnd(-0.24, 0.24), ph: rnd(0, 6), sp: rnd(2.5, 5), h: rnd(0.38, 0.62) });
        }
        ctx.anim((tm) => {
            for (const f of flames) {
                const k = 0.8 + 0.25 * Math.sin(tm * f.sp + f.ph) + 0.1 * Math.sin(tm * f.sp * 2.3);
                f.s.scale.set(0.26 * (0.9 + 0.1 * k), f.h * k, 1);
                f.s.position.set(f.x + Math.sin(tm * 3 + f.ph) * 0.025, fireY + f.h * k * 0.46, fz0 + 0.02);
                f.s.material.opacity = 0.75 + 0.2 * Math.sin(tm * f.sp * 1.7 + f.ph);
            }
        });
        ctx.glow(FP.x, fireY + 0.1, fz0 + 0.05, 1.3, 0xff7a2a, 0.5);
        const N = 36, ep = new Float32Array(N * 3), es = [];
        for (let i = 0; i < N; i++) es.push({ x: rnd(-0.3, 0.3), life: Math.random(), sp: rnd(0.25, 0.55), ph: rnd(0, 6) });
        const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
        world.add(new THREE.Points(eg, new THREE.PointsMaterial({ map: kit.softSprite(), size: 0.03, color: 0xff9a40, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));
        ctx.anim((tm, dt) => {
            for (let i = 0; i < N; i++) {
                const e = es[i]; e.life += dt * e.sp; if (e.life > 1) { e.life = 0; e.x = rnd(-0.3, 0.3); }
                ep[i * 3] = FP.x + e.x + Math.sin(tm * 2 + e.ph) * 0.1 * e.life;
                ep[i * 3 + 1] = fireY + 0.2 + e.life * 1.3;
                ep[i * 3 + 2] = fz0 + 0.1 + Math.cos(tm + e.ph) * 0.05;
            }
            eg.attributes.position.needsUpdate = true;
        });
        // the fire is the main light
        ctx.addLamp({ x: FP.x, y: fireY + 0.3, z: fz0 + 0.45, intensity: 15, color: 0xff7a2a, colorLock: true, flicker: 0.24, candle: true });
        ctx.addLamp({ x: FP.x - 0.4, y: 1.1, z: -0.8, intensity: 2.4, color: 0xff8a3a, colorLock: true, shadow: false, flicker: 0.2, candle: true, distance: 9 });

        // firewood stack (left of the chimney)
        for (let row = 0; row < 4; row++) for (let i = 0; i < 6 - Math.floor(row / 2); i++) {
            const lx = 0.1 + i * 0.2 + (row % 2) * 0.1 - 0.25, ly = 0.1 + row * 0.18;
            world.add(cyl(0.085, 0.085, 0.5, std(0x6a4426, 0.9), { x: lx - 0.0, y: ly, z: R.z0 + 0.3, rx: Math.PI / 2 }, 10));
        }

        // ----- rug, sofa, side table, lantern -----
        const rugTop = std(0xf1e8d8, 1);
        const rug = mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.03, 40), rugTop, { x: 1.0, y: 0.015, z: -1.05, cast: false }); rug.scale.set(1.15, 1, 0.9); world.add(rug);
        const sofa = new THREE.Group(); sofa.position.set(-3.05, 0, 0.6); sofa.rotation.y = -Math.PI / 2;
        const leather = std(0x6b3d24, 0.75);
        sofa.add(rbox(2.0, 0.22, 0.95, 0.05, darkWood, { y: 0.14 }));
        sofa.add(rbox(0.5, 0.55, 0.95, 0.14, leather, { x: -0.98, y: 0.42 })); sofa.add(rbox(0.5, 0.55, 0.95, 0.14, leather, { x: 0.98, y: 0.42 }));
        sofa.add(rbox(1.95, 0.7, 0.32, 0.14, leather, { y: 0.6, z: 0.35 }));
        sofa.add(rbox(0.76, 0.2, 0.68, 0.08, leather, { x: -0.38, y: 0.36, z: -0.08 })); sofa.add(rbox(0.76, 0.2, 0.68, 0.08, leather, { x: 0.38, y: 0.36, z: -0.08 }));
        sofa.add(rbox(0.4, 0.4, 0.15, 0.06, std(0xffffff, 0.95, 0, { map: plaid }), { x: -0.6, y: 0.68, z: 0.1, rx: -0.25, rz: 0.15 }));
        sofa.add(rbox(0.7, 0.07, 0.55, 0.035, std(0xc9b99a, 0.98), { x: 0.5, y: 0.5, z: -0.05, rz: 0.08 }));
        world.add(sofa);
        world.add(cyl(0.3, 0.3, 0.05, wood, { x: -2.4, y: 0.5, z: -1.2 }, 24));
        world.add(cyl(0.04, 0.04, 0.48, darkWood, { x: -2.4, y: 0.25, z: -1.2 }, 8));
        world.add(cyl(0.17, 0.2, 0.03, darkWood, { x: -2.4, y: 0.015, z: -1.2 }, 18));
        const lantern = new THREE.Group(); lantern.position.set(-2.4, 0.525, -1.2);
        lantern.add(box(0.14, 0.2, 0.14, std(0xd8c8a0, 0.2, 0, { transparent: true, opacity: 0.35 }), { y: 0.1 }));
        lantern.add(cyl(0.025, 0.025, 0.1, std(0xf4e6c6, 0.7), { y: 0.06 }, 10));
        lantern.add(sph(0.014, new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1) }), { y: 0.135, cast: false }, 8));
        lantern.add(box(0.16, 0.02, 0.16, darkWood, { y: 0.21 })); lantern.add(box(0.16, 0.02, 0.16, darkWood, { y: 0.0 }));
        world.add(lantern);
        ctx.addLamp({ x: -2.4, y: 0.7, z: -1.2, intensity: 1.6, color: 0xffa850, shadow: false, flicker: 0.2, candle: true, distance: 5 });
        ctx.glow(-2.4, 0.66, -1.2, 0.4, 0xffa850, 0.4);
        const mug2 = kit.makeMug(0xf4eee2); mug2.position.set(-2.25, 0.58, -1.3); world.add(mug2); kit.addSteam(ctx, mug2, { y: 0.06, n: 6 });
        kit.stringLights(ctx, { a: [-3.5, 3.1, -1.0], b: [3.5, 3.1, -1.0], sag: 0.3, n: 22 });
        ctx.addLamp({ x: 0, y: 2.9, z: -0.8, intensity: 0.9, color: 0xffb060, shadow: false, distance: 7 });

        // a cat asleep by the hearth
        const cat = kit.makeCat({ fur: 0x8a7a6a, belly: 0xe8e0d0 });
        cat.group.position.set(2.45, 0.03, -1.35); cat.group.rotation.y = -2.4;
        world.add(cat.group);
        ctx.anim((tm) => cat.update(tm));

        // ----- the person, cross-legged on the rug -----
        const P = kit.makePerson({ sweater: 0xe8d9bf, pants: 0x3b3a46, hair: 0x3b2314, hairStyle: 'short', hat: 0x8a3b2b, sock: 0x8a3b2b });
        const root = new THREE.Group();
        root.position.set(0.6, 0.03, -1.1);
        root.rotation.y = -0.4; // toward the fire
        root.add(P.root);
        world.add(root);
        P.pose({
            pelvis: [0, 0.1, 0.05], chest: [0, 0.6, 0.04], neck: [0, 0.72, 0.04],
            hipL: [-0.11, 0.1, 0.05], hipR: [0.11, 0.1, 0.05],
            kneeL: [-0.36, 0.1, -0.2], kneeR: [0.36, 0.1, -0.2],
            ankleL: [0.1, 0.07, -0.3], ankleR: [-0.1, 0.07, -0.3],
            shoulderL: [-0.2, 0.58, 0.04], shoulderR: [0.2, 0.58, 0.04],
            elbowL: [-0.23, 0.38, -0.08], elbowR: [0.23, 0.38, -0.08],
            handL: [-0.05, 0.42, -0.27], handR: [0.05, 0.42, -0.27],
        });
        // plaid blanket around the shoulders, and over the lap
        const cape = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.58, 28, 1, true, -0.62 * Math.PI, 1.24 * Math.PI),
            new THREE.MeshStandardMaterial({ map: plaid, roughness: 0.97, side: THREE.DoubleSide }));
        cape.position.set(0, 0.48, 0.05); cape.castShadow = true; P.root.add(cape);
        P.root.add(rbox(0.62, 0.12, 0.42, 0.05, std(0xffffff, 0.97, 0, { map: plaid }), { y: 0.14, z: -0.2 }));
        const mug = kit.makeMug(0xf4eee2); P.root.add(mug);
        kit.addSteam(ctx, mug, { y: 0.06, n: 7 });
        P.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        const rest = V(0, 0.42, -0.28), mouth = V(0, 0.7, -0.14);
        const hp = V(0, 0, 0);
        let nextSip = 7, sipStart = -1;
        ctx.anim((tm) => {
            const b = Math.sin(tm * 1.2);
            P.j.chest.set(0, 0.6 + b * 0.006, 0.04); P.j.neck.set(0, 0.72 + b * 0.006, 0.04);
            if (sipStart < 0 && tm > nextSip) sipStart = tm;
            let s = 0;
            if (sipStart >= 0) { const u = (tm - sipStart) / 4.5; if (u >= 1) { sipStart = -1; nextSip = tm + rnd(14, 24); } else s = smooth(clamp01(Math.sin(u * Math.PI) * 1.4)); }
            hp.lerpVectors(rest, mouth, s);
            P.j.handL.set(hp.x - 0.05, hp.y - 0.0, hp.z); P.j.handR.set(hp.x + 0.05, hp.y, hp.z);
            P.j.elbowL.set(-0.23, 0.38 + s * 0.14, -0.08 - s * 0.04); P.j.elbowR.set(0.23, 0.38 + s * 0.14, -0.08 - s * 0.04);
            mug.position.set(hp.x, hp.y + 0.0, hp.z - 0.02); mug.rotation.x = -0.4 * s;
            P.head.rotation.y = 0.55 + Math.sin(tm * 0.2) * 0.05;
            P.head.rotation.x = 0.05 - 0.08 * s;
            P.update();
        });

        return {
            camera: { pos: [0.2, 1.4, 5.0], look: [0.3, 1.05, -1.2], fov: 44, parallax: [0.5, 0.15] },
            hemi: [0x2a3850, 0x2a1a0e, 0.4], ambient: [0x3a2a20, 0.22], exposure: 1.05, bloom: [0.5, 0.7, 0.9],
            windowLight: { color: 0x6f8fb0, intensity: 0.45, pos: [-1.5, 3, -9], target: [0, 0.4, 0] },
            rain: { x: [-6, 6], z: [-3.1, -13], top: 5, h: 7, color: 0x9fb4c8 },
            dust: { x: [-3, 3], y: [0.3, 2.8], z: [-2.6, 2.6] },
            audio: { fire: true, lp: 3900, tick: false },
        };
    },
};
