// Scene 3: attic bedroom. Sloped roof, a skylight over the bed with rain drumming on it, a round window, someone reading in bed.
const X0 = -3.6, X1 = 3.6, Z0 = -3, Z1 = 3;
const EAVE_L = 0.9, EAVE_R = 1.2, RIDGE = { x: 0.6, y: 3.4 };

export default {
    id: 'attic-bedroom',
    name: 'Attic bedroom',
    blurb: 'Reading in bed under a rainy skylight.',
    build(ctx) {
        const { THREE, kit, world } = ctx;
        const { rnd, std, box, rbox, cyl, sph, mesh, clamp01, smooth } = kit;
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        const white = std(0xd8cfbb, 0.9), wood = std(0x5a3d24, 0.7), darkWood = std(0x3a2616, 0.65);

        // roof geometry
        const a1 = Math.atan2(RIDGE.y - EAVE_L, RIDGE.x - X0), L1 = Math.hypot(RIDGE.x - X0, RIDGE.y - EAVE_L);
        const a2 = Math.atan2(EAVE_R - RIDGE.y, X1 - RIDGE.x), L2 = Math.hypot(X1 - RIDGE.x, EAVE_R - RIDGE.y);
        const s1 = V(Math.cos(a1), Math.sin(a1), 0), n1 = V(Math.sin(a1), -Math.cos(a1), 0);
        const s2 = V(Math.cos(a2), Math.sin(a2), 0), n2 = V(Math.sin(a2), -Math.cos(a2), 0);
        const ZH = V(0, 0, 1);
        const basisGroup = (xa, ya, za, pos) => {
            const g = new THREE.Group();
            g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xa, ya, za));
            g.position.copy(pos);
            return g;
        };

        // ----- floor, knee walls, gable end -----
        world.add(mesh(new THREE.PlaneGeometry(7.2, 6), std(0xffffff, 0.6, 0, { map: kit.plankTexture({ base: [176, 146, 108], rows: 9, repeat: [2, 2.6], vary: 26 }) }), { rx: -Math.PI / 2, cast: false }));
        world.add(box(0.2, EAVE_L, 6, white, { x: X0 - 0.1, y: EAVE_L / 2, cast: false }));
        world.add(box(0.2, EAVE_R, 6, white, { x: X1 + 0.1, y: EAVE_R / 2, cast: false }));

        // gable end wall (pentagon) with a round window cut out
        const WR = { x: 1.9, y: 1.75, r: 0.55 };
        const shape = new THREE.Shape();
        shape.moveTo(X0, 0); shape.lineTo(X1, 0); shape.lineTo(X1, EAVE_R); shape.lineTo(RIDGE.x, RIDGE.y); shape.lineTo(X0, EAVE_L); shape.lineTo(X0, 0);
        const hole = new THREE.Path(); hole.absarc(WR.x, WR.y, WR.r, 0, Math.PI * 2, true); shape.holes.push(hole);
        const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false, curveSegments: 40 }),
            std(0xffffff, 0.9, 0, { map: kit.plankTexture({ base: [214, 202, 180], rows: 8, repeat: [1, 1], vary: 18 }) }));
        gable.position.z = Z0 - 0.2;
        gable.receiveShadow = true;
        world.add(gable);
        // round window: ring, cross bars, glass, view
        const ring = new THREE.Mesh(new THREE.TorusGeometry(WR.r, 0.045, 10, 48), darkWood);
        ring.position.set(WR.x, WR.y, Z0 + 0.0); ring.castShadow = true; world.add(ring);
        world.add(box(0.04, WR.r * 2, 0.05, darkWood, { x: WR.x, y: WR.y, z: Z0 - 0.04, cast: false }));
        world.add(box(WR.r * 2, 0.04, 0.05, darkWood, { x: WR.x, y: WR.y, z: Z0 - 0.04, cast: false }));
        const rg = kit.addGlass(ctx, { w: 1.3, h: 1.3, circle: true });
        rg.position.set(WR.x, WR.y, Z0 - 0.1);
        ctx.backdrop({ style: 'roofs', pal: { top: '#12171d', mid: '#222b36', hor: '#3d4a58', haze: '90,105,125', b1: '#262e38', b2: '#2f2724', b3: '#1f1a18', lit: '255,190,110', horizon: 0.6 }, pos: [1, 3.5, -14], size: [44, 14], bright: 1.15 });

        // ----- roof panels -----
        const holeL = { x0: -0.944, x1: 0.856, y0: 0.5, y1: 3.0 };
        const roofL = kit.wallWithHole({ w: L1, h: 6, t: 0.12, hole: holeL, mat: white });
        const gL = basisGroup(s1, ZH, n1, V((X0 + RIDGE.x) / 2, (EAVE_L + RIDGE.y) / 2, Z0));
        gL.add(roofL);
        // skylight frame (in roof-local space)
        const fr = (w, h, x, y) => gL.add(box(w, h, 0.16, wood, { x, y, cast: false }));
        const ft = 0.07;
        fr(holeL.x1 - holeL.x0 + 2 * ft, ft, (holeL.x0 + holeL.x1) / 2, holeL.y0 - ft / 2);
        fr(holeL.x1 - holeL.x0 + 2 * ft, ft, (holeL.x0 + holeL.x1) / 2, holeL.y1 + ft / 2);
        fr(ft, holeL.y1 - holeL.y0, holeL.x0 - ft / 2, (holeL.y0 + holeL.y1) / 2);
        fr(ft, holeL.y1 - holeL.y0, holeL.x1 + ft / 2, (holeL.y0 + holeL.y1) / 2);
        fr(0.04, holeL.y1 - holeL.y0, (holeL.x0 + holeL.x1) / 2, (holeL.y0 + holeL.y1) / 2);
        fr(holeL.x1 - holeL.x0, 0.04, (holeL.x0 + holeL.x1) / 2, (holeL.y0 + holeL.y1) / 2);
        world.add(gL);
        const gR = basisGroup(s2, ZH, n2, V((RIDGE.x + X1) / 2, (RIDGE.y + EAVE_R) / 2, Z0));
        gR.add(kit.wallWithHole({ w: L2, h: 6, t: 0.12, mat: white, hole: { x0: 0, x1: 0, y0: 0, y1: 0 } }));
        world.add(gR);

        // skylight glass + the stormy sky above it
        const dMid = 2.4;
        const skyPos = V(X0 + dMid * s1.x, EAVE_L + dMid * s1.y, -1.25);
        const gl = basisGroup(V(0, 0, -1), s1, n1, skyPos.clone().addScaledVector(n1, -0.03));
        gl.add(kit.addGlass(ctx, { w: 2.5, h: 1.8, parent: gl }));
        world.add(gl);
        const outward = n1.clone().multiplyScalar(-1);
        ctx.backdrop({
            style: 'sky', pal: { top: '#10151b', mid: '#222b33', hor: '#44525c' },
            pos: skyPos.clone().addScaledVector(outward, 7).toArray(), size: [34, 22], bright: 1.2,
            quat: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 0, -1), s1, n1)),
        });

        // rafters, ridge and collar beams
        const rafter = (cx, cy, z, a, len, nrm) => world.add(box(len, 0.09, 0.15, wood, { x: cx + nrm.x * 0.08, y: cy + nrm.y * 0.08, z, rz: a }));
        for (const z of [-2.9, 0.5, 1.8, 2.9]) {
            rafter((X0 + RIDGE.x) / 2, (EAVE_L + RIDGE.y) / 2, z, a1, L1, n1);
            rafter((RIDGE.x + X1) / 2, (RIDGE.y + EAVE_R) / 2, z, a2, L2, n2);
        }
        world.add(box(0.16, 0.16, 6, wood, { x: RIDGE.x, y: RIDGE.y - 0.1 }));
        for (const z of [-1.4, 1.2]) world.add(box(2.15, 0.12, 0.14, wood, { x: 0.5, y: 2.7, z }));
        kit.stringLights(ctx, { a: [RIDGE.x, 3.22, -2.9], b: [RIDGE.x, 3.22, 2.9], sag: 0.12, n: 22 });
        kit.stringLights(ctx, { a: [-0.5, 2.6, -1.4], b: [1.55, 2.6, -1.4], sag: 0.18, n: 9 });
        kit.stringLights(ctx, { a: [-0.5, 2.6, 1.2], b: [1.55, 2.6, 1.2], sag: 0.18, n: 9 });
        ctx.addLamp({ x: 0.6, y: 3.0, z: -1.0, intensity: 1.2, color: 0xffb060, shadow: false, distance: 7 });
        ctx.addLamp({ x: 0.6, y: 3.0, z: 1.8, intensity: 0.9, color: 0xffb060, shadow: false, distance: 7 });

        // ----- bed -----
        const bed = new THREE.Group();
        bed.position.set(-1.5, 0, -1.85);
        bed.add(box(1.7, 0.28, 2.1, darkWood, { y: 0.2 }));
        bed.add(box(1.8, 1.05, 0.1, darkWood, { y: 0.55, z: -1.0 }));
        bed.add(rbox(1.55, 0.22, 2.0, 0.07, std(0xe8e0d0, 0.95), { y: 0.43 }));
        bed.add(rbox(1.6, 0.14, 1.2, 0.06, std(0xffffff, 0.95, 0, { map: kit.quiltTexture(['#7a8fa0', '#efe4cf', '#c9704a', '#8fb3a0', '#d9a441']) }), { y: 0.59, z: 0.4 }));
        bed.add(rbox(0.6, 0.2, 0.38, 0.09, std(0xefe4cf, 0.95), { x: -0.38, y: 0.66, z: -0.8, rx: -0.25 }));
        bed.add(rbox(0.6, 0.2, 0.38, 0.09, std(0xc9704a, 0.95), { x: 0.4, y: 0.66, z: -0.8, rx: -0.25 }));
        bed.add(rbox(0.75, 0.55, 0.2, 0.09, std(0xe8e0d0, 0.95), { x: 0, y: 0.82, z: -0.88, rx: 0.25 }));
        world.add(bed);

        // a cat curled on the quilt
        const cat = kit.makeCat({ fur: 0x2a2623, belly: 0xf1ece0, stripes: false });
        cat.group.position.set(-1.15, 0.67, -0.95);
        cat.group.rotation.y = 2.2;
        world.add(cat.group);
        ctx.anim((t) => cat.update(t));

        // bedside table + lamp
        world.add(box(0.5, 0.58, 0.42, darkWood, { x: -0.3, y: 0.29, z: -2.75 }));
        world.add(box(0.44, 0.02, 0.01, std(0x2a1708, 0.5), { x: -0.3, y: 0.38, z: -2.54, cast: false }));
        kit.tableLamp(ctx, { x: -0.3, y: 0.58, z: -2.75, intensity: 3.2, shade: 0xf0d19a });
        const mug = kit.makeMug(0xe8e0d0); mug.position.set(-0.12, 0.635, -2.65); world.add(mug);
        kit.addSteam(ctx, mug, { y: 0.06, n: 6 });

        // desk under the round window
        const desk = new THREE.Group();
        desk.position.set(1.9, 0, -2.55);
        desk.add(box(1.3, 0.05, 0.6, std(0x8a6a44, 0.6), { y: 0.74 }));
        for (const [x, z] of [[-0.6, -0.25], [0.6, -0.25], [-0.6, 0.25], [0.6, 0.25]]) desk.add(cyl(0.025, 0.02, 0.72, darkWood, { x, y: 0.36, z }, 8));
        const bk = kit.makeBook(0x2f4a42, 0.18, 0.24, 0.04); bk.position.set(-0.4, 0.795, 0.0); bk.rotation.x = -Math.PI / 2; desk.add(bk);
        const bk2 = kit.makeBook(0xb5603c, 0.17, 0.22, 0.035); bk2.position.set(-0.4, 0.835, 0.0); bk2.rotation.set(-Math.PI / 2, 0, 0.3); desk.add(bk2);
        desk.add(cyl(0.05, 0.04, 0.09, std(0xe8d9bf, 0.7), { x: 0.45, y: 0.82 }, 14));
        for (let i = 0; i < 6; i++) { const l = sph(0.045, std(0x4a6a35, 0.8), { x: 0.45 + rnd(-0.04, 0.04), y: 0.92 + rnd(0, 0.1), z: rnd(-0.04, 0.04) }, 8); l.scale.set(0.8, 1.7, 0.5); l.rotation.set(rnd(-0.5, 0.5), rnd(0, 6), rnd(-0.9, 0.9)); desk.add(l); }
        world.add(desk);
        kit.tableLamp(ctx, { x: 2.35, y: 0.765, z: -2.6, intensity: 1.2, shade: 0xe8c07a, shadow: false, scale: 0.8 });
        world.add(rbox(0.4, 0.06, 0.4, 0.02, std(0x8a6a44, 0.7), { x: 1.9, y: 0.45, z: -1.8 }));
        world.add(cyl(0.2, 0.2, 0.42, std(0xc9704a, 0.9), { x: 1.9, y: 0.21, z: -1.8 }, 20));

        // rug, plant, hanging frames
        world.add(mesh(new THREE.PlaneGeometry(2.7, 1.9), std(0xffffff, 1, 0, { map: kit.rugTexture({ field: '#7a8fa0', band: '#efe4cf', band2: '#c9704a', accents: ['#efe4cf', '#c9704a', '#d9a441', '#8fb3a0'] }) }), { x: 0.1, y: 0.012, z: 0.4, rx: -Math.PI / 2, cast: false }));
        world.add(cyl(0.17, 0.13, 0.32, std(0xe8d9bf, 0.8), { x: 3.0, y: 0.16, z: -2.0 }, 18));
        for (let i = 0; i < 12; i++) { const l = sph(0.1, std(0x4f7a3c, 0.8), { x: 3.0 + rnd(-0.15, 0.15), y: 0.55 + rnd(0, 0.5), z: -2.0 + rnd(-0.15, 0.15) }, 10); l.scale.set(0.8, 1.8, 0.5); l.rotation.set(rnd(-0.5, 0.5), rnd(0, 6), rnd(-0.9, 0.9)); world.add(l); }
        for (const [x, y, c1, c2] of [[-0.7, 2.05, '#e8c9a0', '#c9704a'], [0.0, 1.8, '#c9d9d4', '#5a8a88']]) {
            const f = new THREE.Group(); f.position.set(x, y, Z0 - 0.0); f.add(box(0.5, 0.38, 0.04, darkWood, { cast: false }));
            const p = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshStandardMaterial({ map: kit.paintingTexture(c1, c2), roughness: 0.9 })); p.position.z = 0.025; f.add(p); world.add(f);
        }

        // ----- the reader, propped up in bed facing the room -----
        const P = kit.makePerson({ sweater: 0x6b8aa0, pants: 0xe8e0d0, hair: 0x6b4226, hairStyle: 'bun', sock: 0xc9704a });
        const root = new THREE.Group();
        root.position.set(-1.5, 0.54, -2.4);
        root.rotation.y = Math.PI + 0.3;
        root.add(P.root);
        world.add(root);
        P.pose({
            pelvis: [0, 0.14, 0], chest: [0, 0.64, 0.1], neck: [0, 0.78, 0.1],
            hipL: [-0.1, 0.14, 0], hipR: [0.1, 0.14, 0],
            kneeL: [-0.11, 0.3, -0.42], kneeR: [0.11, 0.3, -0.42],
            ankleL: [-0.11, 0.16, -0.84], ankleR: [0.11, 0.16, -0.84],
            shoulderL: [-0.2, 0.62, 0.1], shoulderR: [0.2, 0.62, 0.1],
            elbowL: [-0.24, 0.42, -0.06], elbowR: [0.24, 0.42, -0.06],
            handL: [-0.08, 0.5, -0.3], handR: [0.08, 0.5, -0.3],
        });
        const book = kit.makeBook(0x8a5a3a, 0.2, 0.27, 0.035);
        book.position.set(0, 0.52, -0.31); book.rotation.x = -1.0;
        P.root.add(book);
        P.root.add(rbox(0.62, 0.18, 0.8, 0.08, std(0xffffff, 0.95, 0, { map: kit.quiltTexture(['#7a8fa0', '#efe4cf', '#c9704a', '#8fb3a0', '#d9a441']) }), { y: 0.3, z: -0.5, rx: 0.06 }));
        P.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        let nextLook = 8, lookStart = -1, nextPage = 5, pageStart = -1;
        ctx.anim((t) => {
            const b = Math.sin(t * 1.3);
            P.j.chest.set(0, 0.64 + b * 0.006, 0.1);
            P.j.neck.set(0, 0.78 + b * 0.006, 0.1);
            if (lookStart < 0 && t > nextLook) lookStart = t;
            let look = 0;
            if (lookStart >= 0) {
                const u = (t - lookStart) / 5;
                if (u >= 1) { lookStart = -1; nextLook = t + rnd(14, 26); } else look = smooth(clamp01(Math.sin(u * Math.PI) * 1.6));
            }
            // look up at the rain on the skylight now and then
            P.head.rotation.x = -0.35 * (1 - look) + look * 0.55;
            P.head.rotation.y = 0.25 * look;
            if (pageStart < 0 && t > nextPage) pageStart = t;
            let pg = 0;
            if (pageStart >= 0) {
                const u = (t - pageStart) / 1.6;
                if (u >= 1) { pageStart = -1; nextPage = t + rnd(8, 15); } else pg = Math.sin(u * Math.PI);
            }
            P.j.handR.set(0.08 + pg * 0.09, 0.5 + pg * 0.1, -0.3);
            P.update();
        });

        const clip = n1.clone();
        const d = -(clip.x * X0 + clip.y * EAVE_L);
        return {
            camera: { pos: [1.5, 1.25, 3.8], look: [-0.8, 1.4, -1.6], fov: 46, parallax: [0.5, 0.15], narrow: { dz: 1.6, dfov: 12, dlook: 0.3 } },
            hemi: [0x5a6f85, 0x3a2a1c, 0.5], ambient: [0x3d4a5a, 0.32], exposure: 1.05, bloom: [0.4, 0.6, 1.0],
            windowLight: { color: 0x7f9ab8, intensity: 0.4, pos: [-4, 6, 1], target: [-1, 0.5, -1] },
            // rain falls over the left roof; only draw it on the outside of the roof surface
            rain: { x: [-7.5, 0.5], z: [-3.6, 1.2], top: 9, h: 9, color: 0xb4c6dc, clip: [-n1.x, -n1.y, 0, -d] },
            background: 0x0b1016,
            dust: { x: [-3, 3], y: [0.3, 2.4], z: [-2.8, 2.5] },
            audio: { lp: 8000, drops: 1.8, rumble: 1.5, hiss: 1.5, wash: 2000 },
        };
    },
};
