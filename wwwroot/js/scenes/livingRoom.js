// Scene 1: living room. Armchair, steaming mug, floor lamp, bookshelf, string lights, rainy city outside.
const C = { shadow: 0x1b0e02, wood: 0x754e1a, olive: 0x6b6a3a, blanket: 0x9fa5a7, oatmeal: 0xe8d9bf, rust: 0xb5603c, plaster: 0xb98f54, curtain: 0x2f3a28 };
const ROOM = { x0: -4, x1: 4, z0: -3, z1: 3.2, h: 3.4 };
const WIN = { x0: -1.7, x1: 1.7, y0: 0.9, y1: 2.5 };

export default {
    id: 'living-room',
    name: 'Living room',
    blurb: 'An armchair, a hot drink and lamplight.',
    build(ctx) {
        const { THREE, kit, world } = ctx;
        const { rnd, std, box, rbox, cyl, sph, mesh, limb, clamp01, smooth } = kit;

        const wallMat = std(C.plaster, 0.95);
        const woodDark = std(0x4a2d12, 0.7);
        const panelMat = std(C.wood, 0.75);

        // ----- shell -----
        world.add(mesh(new THREE.PlaneGeometry(8, 6.2), std(0xffffff, 0.55, 0, { map: kit.plankTexture({ base: [145, 85, 38] }) }), { z: 0.1, rx: -Math.PI / 2, cast: false }));
        world.add(mesh(new THREE.PlaneGeometry(8, 6.2), std(0x3a2410, 0.95), { y: ROOM.h, z: 0.1, rx: Math.PI / 2, cast: false }));
        const t = 0.25, zc = ROOM.z0 - t / 2;
        world.add(box(WIN.x0 - ROOM.x0, ROOM.h, t, wallMat, { x: (ROOM.x0 + WIN.x0) / 2, y: ROOM.h / 2, z: zc, cast: false }));
        world.add(box(ROOM.x1 - WIN.x1, ROOM.h, t, wallMat, { x: (WIN.x1 + ROOM.x1) / 2, y: ROOM.h / 2, z: zc, cast: false }));
        world.add(box(WIN.x1 - WIN.x0, WIN.y0, t, wallMat, { y: WIN.y0 / 2, z: zc, cast: false }));
        world.add(box(WIN.x1 - WIN.x0, ROOM.h - WIN.y1, t, wallMat, { y: (WIN.y1 + ROOM.h) / 2, z: zc, cast: false }));
        world.add(box(0.25, ROOM.h, 6.2, wallMat, { x: ROOM.x0 - 0.125, y: ROOM.h / 2, z: 0.1, cast: false }));
        world.add(box(0.25, ROOM.h, 6.2, wallMat, { x: ROOM.x1 + 0.125, y: ROOM.h / 2, z: 0.1, cast: false }));

        // wood panelling
        const wh = 0.95;
        world.add(box(WIN.x0 - ROOM.x0, wh, 0.05, panelMat, { x: (ROOM.x0 + WIN.x0) / 2, y: wh / 2, z: ROOM.z0 + 0.025, cast: false }));
        world.add(box(ROOM.x1 - WIN.x1, wh, 0.05, panelMat, { x: (WIN.x1 + ROOM.x1) / 2, y: wh / 2, z: ROOM.z0 + 0.025, cast: false }));
        world.add(box(0.05, wh, 6.2, panelMat, { x: ROOM.x0 + 0.025, y: wh / 2, z: 0.1, cast: false }));
        world.add(box(0.05, wh, 6.2, panelMat, { x: ROOM.x1 - 0.025, y: wh / 2, z: 0.1, cast: false }));
        for (const x of [ROOM.x0 + 0.06, ROOM.x1 - 0.06]) world.add(box(0.08, 0.05, 6.2, woodDark, { x, y: wh, z: 0.1, cast: false }));
        world.add(box(WIN.x0 - ROOM.x0, 0.05, 0.08, woodDark, { x: (ROOM.x0 + WIN.x0) / 2, y: wh, z: ROOM.z0 + 0.04, cast: false }));
        world.add(box(ROOM.x1 - WIN.x1, 0.05, 0.08, woodDark, { x: (WIN.x1 + ROOM.x1) / 2, y: wh, z: ROOM.z0 + 0.04, cast: false }));
        world.add(box(WIN.x1 - WIN.x0 + 0.3, 0.06, 0.42, woodDark, { y: WIN.y0 + 0.03, z: ROOM.z0 + 0.12, cast: false }));

        // window frame
        const fz = ROOM.z0 + 0.02, fd = 0.14, ft = 0.09, frame = std(0x2a1708, 0.6);
        world.add(box(WIN.x1 - WIN.x0 + 2 * ft, ft, fd, frame, { y: WIN.y1 + ft / 2, z: fz }));
        world.add(box(WIN.x1 - WIN.x0 + 2 * ft, ft, fd, frame, { y: WIN.y0 - ft / 2 + 0.06, z: fz }));
        world.add(box(ft, WIN.y1 - WIN.y0 + 2 * ft, fd, frame, { x: WIN.x0 - ft / 2, y: (WIN.y0 + WIN.y1) / 2, z: fz }));
        world.add(box(ft, WIN.y1 - WIN.y0 + 2 * ft, fd, frame, { x: WIN.x1 + ft / 2, y: (WIN.y0 + WIN.y1) / 2, z: fz }));
        const mx = (WIN.x1 - WIN.x0) / 3;
        for (const x of [WIN.x0 + mx, WIN.x0 + 2 * mx]) world.add(box(0.05, WIN.y1 - WIN.y0, 0.1, frame, { x, y: (WIN.y0 + WIN.y1) / 2, z: fz }));
        world.add(box(WIN.x1 - WIN.x0, 0.05, 0.1, frame, { y: (WIN.y0 + WIN.y1) / 2 + 0.1, z: fz }));

        // rain on the glass: drops bend and blur the view of the city behind them
        // a soft, glowing out-of-focus city (like a camera focused on the drops): bright overcast sky behind dark buildings
        const outside = ctx.backdrop({
            style: 'city', pos: [0, 4.3, -15], size: [52, 15],
            pal: { top: '#2a343d', mid: '#566772', hor: '#8fa3ad', b1: '#2c363d', b2: '#3a2318', b3: '#1f120b', winW: 13, winH: 15, blur: 2.2 },
        });
        const glass = kit.addRainGlass(ctx, { w: WIN.x1 - WIN.x0, h: WIN.y1 - WIN.y0, backdrop: outside, reflect: { pos: [0, 1.7, -2.4], strength: 3.5 } });
        glass.position.set(0, (WIN.y0 + WIN.y1) / 2, ROOM.z0 + 0.05);

        // The open front of the room, as a wall that only the window glass can see: it faces into the room, so the
        // camera (outside) looks at its back and it is culled, but the reflection in the glass finds a wall with
        // pictures and a wall light on it instead of empty darkness.
        const front = new THREE.Group();
        front.position.set(0, 0, ROOM.z1 + 0.05);
        front.rotation.y = Math.PI;
        front.add(mesh(new THREE.PlaneGeometry(8, ROOM.h), std(C.plaster, 0.95), { y: ROOM.h / 2, cast: false }));
        for (const [x, y, w, h, c1, c2] of [[-1.6, 1.8, 0.9, 0.65, '#e8b9a0', '#b5603c'], [0.4, 1.7, 0.6, 0.8, '#c9d9d4', '#5a8a88'], [2.6, 1.9, 0.8, 0.6, '#f0d9a8', '#c9963c']]) {
            front.add(mesh(new THREE.PlaneGeometry(w + 0.08, h + 0.08), std(0x2a1708, 0.6), { x, y, z: 0.005, cast: false }));
            front.add(mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: kit.paintingTexture(c1, c2), roughness: 0.9 }), { x, y, z: 0.01, cast: false }));
        }
        // a flat wall light: a warm glowing panel that shows up as a lamp in the glass
        front.add(mesh(new THREE.CircleGeometry(0.16, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 2.9, 1.2) }), { x: 1.4, y: 2.4, z: 0.02, cast: false }));
        world.add(front);

        // ----- rug, sofa, art -----
        world.add(mesh(new THREE.PlaneGeometry(4.6, 3.4), std(0xffffff, 1, 0, { map: kit.rugTexture() }), { x: 0.2, y: 0.012, z: 0.5, rx: -Math.PI / 2, cast: false }));

        const olive = std(C.olive, 0.95), dark = std(0x2a1708, 0.6), woodM = std(C.wood, 0.6), cream = std(C.oatmeal, 0.9);
        const sofa = new THREE.Group();
        sofa.position.set(-3.25, 0, 0.55);
        sofa.rotation.y = -Math.PI / 2;
        sofa.add(rbox(1.95, 0.22, 0.9, 0.05, dark, { y: 0.14 }));
        sofa.add(rbox(0.5, 0.5, 0.9, 0.12, olive, { x: -0.95, y: 0.4 }));
        sofa.add(rbox(0.5, 0.5, 0.9, 0.12, olive, { x: 0.95, y: 0.4 }));
        sofa.add(rbox(1.9, 0.62, 0.3, 0.12, olive, { y: 0.55, z: 0.33 }));
        sofa.add(rbox(0.74, 0.2, 0.66, 0.08, olive, { x: -0.36, y: 0.35, z: -0.08 }));
        sofa.add(rbox(0.74, 0.2, 0.66, 0.08, olive, { x: 0.36, y: 0.35, z: -0.08 }));
        sofa.add(rbox(0.38, 0.38, 0.14, 0.06, std(C.rust, 0.9), { x: -0.55, y: 0.66, z: 0.12, rx: -0.25, rz: 0.15 }));
        sofa.add(rbox(0.6, 0.08, 0.5, 0.04, cream, { x: 0.5, y: 0.5, z: -0.05, rz: 0.08 }));
        world.add(sofa);
        // a ginger cat asleep on the sofa
        const sofaCat = kit.makeCat({ fur: 0xd9873f });
        sofaCat.group.position.set(-3.1, 0.46, 0.0);
        sofaCat.group.rotation.y = 1.0;
        world.add(sofaCat.group);
        ctx.anim((tm) => sofaCat.update(tm));

        const art = new THREE.Group();
        art.position.set(ROOM.x0 + 0.04, 1.85, 0.55);
        art.rotation.y = Math.PI / 2;
        art.add(box(1.05, 0.75, 0.05, dark, { cast: false }));
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.62), new THREE.MeshStandardMaterial({ map: kit.paintingTexture(), roughness: 0.9 }));
        pic.position.z = 0.03; art.add(pic);
        world.add(art);

        // ----- coffee table + candle -----
        const tbl = new THREE.Group();
        tbl.position.set(-0.4, 0, 1.15);
        tbl.add(cyl(0.55, 0.55, 0.05, woodM, { y: 0.42 }, 40));
        for (const [lx, lz] of [[0.32, 0.32], [-0.32, 0.32], [0.32, -0.32], [-0.32, -0.32]]) tbl.add(cyl(0.025, 0.02, 0.4, dark, { x: lx, y: 0.2, z: lz }, 8));
        tbl.add(rbox(0.3, 0.04, 0.22, 0.01, std(0x6b6a3a, 0.8), { x: 0.2, y: 0.465, z: 0.1, ry: 0.3 }));
        tbl.add(rbox(0.26, 0.035, 0.2, 0.01, std(0xb5603c, 0.8), { x: 0.2, y: 0.5, z: 0.1, ry: 0.15 }));
        tbl.add(cyl(0.04, 0.035, 0.085, std(0xf2ece0, 0.4), { x: -0.25, y: 0.49, z: 0.15 }, 20));
        tbl.add(cyl(0.06, 0.06, 0.1, std(0xcfb98f, 0.3, 0, { transparent: true, opacity: 0.55 }), { x: 0.0, y: 0.5, z: -0.12 }, 24));
        tbl.add(cyl(0.035, 0.035, 0.07, std(0xf4e6c6, 0.7), { x: 0.0, y: 0.495, z: -0.12 }, 16));
        const flame = sph(0.014, new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.0) }), { x: 0.0, y: 0.555, z: -0.12, cast: false }, 12);
        flame.scale.y = 1.8;
        tbl.add(flame);
        world.add(tbl);
        ctx.addLamp({ x: -0.4, y: 0.62, z: 1.03, intensity: 0.9, color: 0xff9a40, shadow: false, distance: 5, flicker: 0.25, candle: true });
        ctx.glow(-0.4, 0.58, 1.03, 0.25, 0xffa850, 0.4);
        ctx.anim((tm) => { flame.scale.set(1 + 0.15 * Math.sin(tm * 17), 1.8 + 0.3 * Math.sin(tm * 11 + 1), 1); });

        // ----- floor lamp -----
        const fl = new THREE.Group();
        fl.position.set(-2.75, 0, -2.45);
        fl.add(cyl(0.2, 0.22, 0.04, dark, { y: 0.02 }, 24));
        fl.add(cyl(0.018, 0.018, 1.6, dark, { y: 0.84 }, 10));
        fl.add(cyl(0.012, 0.012, 0.6, dark, { x: 0.22, y: 1.65, z: 0.1, rz: -1.15 }, 8));
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.24, 28, 1, true),
            new THREE.MeshStandardMaterial({ color: 0x1d1308, roughness: 0.5, side: THREE.DoubleSide, emissive: 0xffa040, emissiveIntensity: 0.25 }));
        shade.position.set(0.5, 1.72, 0.18); shade.rotation.set(0.5, 0, -0.45);
        fl.add(shade);
        fl.add(sph(0.045, new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.2, 1.2) }), { x: 0.5, y: 1.64, z: 0.2, cast: false }, 12));
        fl.traverse((o) => { if (o.isMesh) o.castShadow = false; });
        world.add(fl);
        ctx.addLamp({ x: -2.25, y: 1.6, z: -2.25, intensity: 9 });
        ctx.glow(-2.25, 1.6, -2.25, 0.7, 0xffa850, 0.28);

        // ----- side table + table lamp -----
        const st = new THREE.Group();
        st.position.set(3.15, 0, -2.4);
        st.add(cyl(0.3, 0.3, 0.04, woodM, { y: 0.55 }, 28));
        st.add(cyl(0.03, 0.03, 0.53, dark, { y: 0.27 }, 8));
        st.add(cyl(0.18, 0.2, 0.03, dark, { y: 0.015 }, 20));
        st.add(cyl(0.05, 0.08, 0.22, std(0xcfa66a, 0.35, 0.3), { y: 0.68 }, 16));
        const tShade = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 0.22, 28, 1, true),
            new THREE.MeshStandardMaterial({ color: 0xe9c68a, roughness: 0.7, side: THREE.DoubleSide, emissive: 0xff9a3a, emissiveIntensity: 1.6 }));
        tShade.position.y = 0.9; st.add(tShade);
        world.add(st);
        ctx.addLamp({ x: 3.15, y: 0.95, z: -2.4, intensity: 4.5 });
        ctx.glow(3.15, 0.92, -2.4, 0.55, 0xffa850, 0.28);

        // ----- bookshelf -----
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
                shelf.add(box(bw, bh, rnd(0.18, 0.24), std(kit.pick(bookCols), 0.85), { x: x + bw / 2, y: y + 0.0175 + bh / 2, z: -0.02, rz: Math.random() < 0.06 ? 0.15 : 0 }));
                x += bw + 0.004;
            }
        }
        shelf.add(cyl(0.08, 0.06, 0.14, std(0xb5603c, 0.8), { x: 0.4, y: 2.16 }, 14));
        for (let i = 0; i < 8; i++) {
            const leaf = sph(0.07, std(0x4a5a2a, 0.8), { x: 0.4 + rnd(-0.07, 0.07), y: 2.3 + rnd(0, 0.18), z: rnd(-0.07, 0.07) }, 10);
            leaf.scale.set(1, 1.6, 0.5); leaf.rotation.set(rnd(-0.6, 0.6), rnd(0, 6), rnd(-0.8, 0.8));
            shelf.add(leaf);
        }
        world.add(shelf);

        // sill plant
        world.add(cyl(0.07, 0.055, 0.12, std(0xe8d9bf, 0.7), { x: -1.15, y: WIN.y0 + 0.12, z: ROOM.z0 + 0.15, cast: false }, 14));
        for (let i = 0; i < 9; i++) {
            const leaf = sph(0.06, std(0x56682f, 0.8), { x: -1.15 + rnd(-0.06, 0.06), y: WIN.y0 + 0.25 + rnd(0, 0.16), z: ROOM.z0 + 0.15 + rnd(-0.05, 0.05), cast: false }, 10);
            leaf.scale.set(0.8, 1.7, 0.45); leaf.rotation.set(rnd(-0.5, 0.5), rnd(0, 6), rnd(-0.9, 0.9));
            world.add(leaf);
        }

        // curtains
        const curtainMat = new THREE.MeshStandardMaterial({ color: C.curtain, roughness: 0.95, side: THREE.DoubleSide });
        const curtain = (cx, w) => {
            const g = new THREE.PlaneGeometry(w, 2.62, 36, 1);
            const p = g.attributes.position;
            for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.045 + Math.sin(p.getX(i) * 9 + 1) * 0.03);
            g.computeVertexNormals();
            const m = new THREE.Mesh(g, curtainMat);
            m.position.set(cx, 1.45, ROOM.z0 + 0.22);
            m.receiveShadow = true;
            world.add(m);
            return m;
        };
        const cL = curtain(WIN.x0 - 0.15, 0.7), cR = curtain(WIN.x1 + 0.15, 0.7);
        world.add(cyl(0.015, 0.015, 5.0, dark, { y: 2.78, z: ROOM.z0 + 0.2, rz: Math.PI / 2, cast: false }, 8));
        ctx.anim((tm) => { cL.rotation.y = Math.sin(tm * 0.4) * 0.012; cR.rotation.y = Math.sin(tm * 0.37 + 2) * 0.012; });

        // string lights
        const N = 22, bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.028, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
        const pts = [], m4 = new THREE.Matrix4(), col = new THREE.Color();
        for (let i = 0; i < N; i++) {
            const u = i / (N - 1), x = -3.85 + u * 7.7, y = 3.28 - 0.2 * Math.sin(u * Math.PI);
            m4.setPosition(x, y, ROOM.z0 + 0.08);
            bulbs.setMatrixAt(i, m4);
            col.setRGB(4.5, 2.9 + Math.random() * 0.5, 1.1);
            bulbs.setColorAt(i, col);
            pts.push(new THREE.Vector3(x, y + 0.02, ROOM.z0 + 0.08));
        }
        world.add(bulbs);
        world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x1b0e02 })));
        ctx.addLamp({ x: -2.6, y: 3.0, z: -2.5, intensity: 0.6, color: 0xffb060, shadow: false, distance: 6 });
        ctx.addLamp({ x: 2.6, y: 3.0, z: -2.5, intensity: 0.6, color: 0xffb060, shadow: false, distance: 6 });

        // ----- the person in the armchair -----
        const chair = new THREE.Group();
        chair.position.set(1.95, 0, -0.6);
        chair.rotation.y = 1.15;
        world.add(chair);
        const uph = std(0x8b4a2b, 0.9), woodC = std(0x4a2d12, 0.6);
        chair.add(rbox(0.9, 0.2, 0.88, 0.07, uph, { y: 0.34 }));
        chair.add(rbox(0.92, 0.68, 0.2, 0.1, uph, { y: 0.7, z: 0.37, rx: 0.12 }));
        chair.add(rbox(0.16, 0.34, 0.8, 0.06, uph, { x: -0.5, y: 0.55 }));
        chair.add(rbox(0.16, 0.34, 0.8, 0.06, uph, { x: 0.5, y: 0.55 }));
        for (const [x, z] of [[-0.38, -0.34], [0.38, -0.34], [-0.38, 0.34], [0.38, 0.34]]) chair.add(cyl(0.03, 0.022, 0.26, woodC, { x, y: 0.13, z }, 8));
        chair.add(rbox(0.4, 0.38, 0.12, 0.05, std(C.oatmeal, 0.95), { x: 0.2, y: 0.74, z: 0.24, rx: -0.2, rz: -0.2 }));

        const person = new THREE.Group();
        chair.add(person);
        const sweater = std(C.oatmeal, 0.97), skin = std(0xe0b090, 0.7), sock = std(0x7a4a3a, 0.95), pants = std(0x3b3a46, 0.9);
        for (const sx of [-1, 1]) {
            const th = cyl(0.075, 0.07, 1, pants, {}, 12);
            limb(th, new THREE.Vector3(sx * 0.13, 0.52, 0.12), new THREE.Vector3(sx * 0.13, 0.55, -0.34));
            person.add(th);
            const sh = cyl(0.062, 0.05, 1, pants, {}, 12);
            limb(sh, new THREE.Vector3(sx * 0.13, 0.55, -0.34), new THREE.Vector3(sx * 0.13, 0.1, -0.42));
            person.add(sh);
            person.add(sph(0.07, pants, { x: sx * 0.13, y: 0.55, z: -0.34 }, 12));
            person.add(box(0.09, 0.07, 0.2, sock, { x: sx * 0.13, y: 0.04, z: -0.5 }));
        }
        const torso = new THREE.Group();
        torso.position.set(0, 0.66, 0.1);
        torso.rotation.x = -0.1;
        person.add(torso);
        const body = mesh(new THREE.CapsuleGeometry(0.17, 0.34, 8, 20), sweater, { y: 0.25 });
        body.scale.set(1.15, 1, 0.9);
        torso.add(body);
        torso.add(mesh(new THREE.TorusGeometry(0.18, 0.03, 8, 24), sweater, { rx: Math.PI / 2 }));
        torso.add(cyl(0.045, 0.05, 0.1, skin, { y: 0.55 }, 12));
        torso.add(mesh(new THREE.TorusGeometry(0.085, 0.04, 10, 24), sweater, { y: 0.52, rx: Math.PI / 2 }));
        const head = new THREE.Group();
        head.position.set(0, 0.7, 0.01);
        torso.add(head);
        head.add(sph(0.108, skin, {}, 28));
        head.add(sph(0.016, skin, { y: -0.005, z: -0.112 }, 10));
        for (const sx of [-1, 1]) head.add(sph(0.0095, new THREE.MeshBasicMaterial({ color: 0x1b0e08 }), { x: sx * 0.04, y: 0.014, z: -0.098, cast: false }, 8));
        head.add(sph(0.118, std(0x3b2314, 0.6), { y: 0.018, z: 0.025 }, 28));
        head.add(sph(0.05, std(0x3b2314, 0.6), { y: 0.13, z: 0.07 }, 16));
        head.rotation.y = -0.45;

        person.add(rbox(0.6, 0.1, 0.55, 0.045, std(C.blanket, 0.98), { y: 0.66, z: -0.12, rx: 0.05 }));
        person.add(rbox(0.1, 0.5, 0.45, 0.04, std(C.blanket, 0.98), { x: 0.34, y: 0.48, z: -0.12, rz: -0.06 }));

        const mug = kit.makeMug();
        person.add(mug);
        const handR = sph(0.04, skin, {}, 12), handL = sph(0.04, skin, {}, 12);
        person.add(handR, handL);
        const upperR = cyl(0.052, 0.046, 1, sweater, {}, 12), foreR = cyl(0.046, 0.04, 1, sweater, {}, 12);
        const upperL = cyl(0.052, 0.046, 1, sweater, {}, 12), foreL = cyl(0.046, 0.04, 1, sweater, {}, 12);
        const elbowR = sph(0.05, sweater, {}, 12), elbowL = sph(0.05, sweater, {}, 12);
        person.add(upperR, foreR, upperL, foreL, elbowR, elbowL);
        kit.addSteam(ctx, mug, { y: 0.06 });
        chair.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

        const shoulderR = new THREE.Vector3(0.21, 1.11, 0.1), shoulderL = new THREE.Vector3(-0.21, 1.11, 0.1);
        const elbR = new THREE.Vector3(0.24, 0.9, 0.02), elbL = new THREE.Vector3(-0.24, 0.9, 0.04);
        const rest = new THREE.Vector3(0.02, 1.0, -0.2), mouth = new THREE.Vector3(0.0, 1.27, -0.12);
        const tmp = new THREE.Vector3(), hp = new THREE.Vector3(), hp2 = new THREE.Vector3();
        let nextSip = 9, sipStart = -1;
        ctx.anim((tm) => {
            const b = Math.sin(tm * 1.25);
            torso.scale.set(1 + b * 0.006, 1 + b * 0.012, 1 + b * 0.008);
            head.rotation.y = -0.45 + Math.sin(tm * 0.23) * 0.07;
            head.rotation.x = Math.sin(tm * 0.31 + 1) * 0.03;
            if (sipStart < 0 && tm > nextSip) sipStart = tm;
            let s = 0;
            if (sipStart >= 0) {
                const u = (tm - sipStart) / 4.2;
                if (u >= 1) { sipStart = -1; nextSip = tm + rnd(14, 24); } else s = Math.sin(Math.min(1, u) * Math.PI);
                s = smooth(clamp01(s * 1.4));
            }
            hp.lerpVectors(rest, mouth, s); hp.y += b * 0.004;
            hp2.copy(hp).add(tmp.set(-0.09, -0.02, 0));
            mug.position.copy(hp).add(tmp.set(0.03, 0, -0.04));
            mug.rotation.x = -0.35 * s;
            handR.position.copy(hp).add(tmp.set(0.05, 0, 0));
            handL.position.copy(hp2).add(tmp.set(0, -0.02, 0));
            elbR.y = 0.88 + s * 0.12; elbL.y = 0.88 + s * 0.12;
            limb(upperR, shoulderR, elbR); limb(foreR, elbR, handR.position);
            limb(upperL, shoulderL, elbL); limb(foreL, elbL, handL.position);
            elbowR.position.copy(elbR); elbowL.position.copy(elbL);
        });

        return {
            camera: { pos: [0, 1.55, 6.4], look: [0.15, 1.25, -1], fov: 42 },
            // "look out the window": glide to about 45 cm from the glass, where real drops (a few mm) are big enough to see
            lookOut: { pos: [0, 1.4, -2.45], look: [0, 1.4, -3.0], fov: 50, parallax: [0.03, 0.015], lookParallax: 0.015, narrow: { dfov: 8, dy: 0 } },
            dust: { x: [-3.5, 3.5], y: [0.3, 3], z: [-2.6, 3] },
            audio: {},
        };
    },
};
