// Scene 4: kitchen. Sage cabinets, a pendant lamp over the table, someone stirring a pot on the stove, a cat on a chair, a rainy garden outside.
const R = { x0: -3.4, x1: 3.4, z0: -2.6, z1: 3.0, h: 3.1 };
const WIN = { x0: -0.7, x1: 1.0, y0: 1.15, y1: 2.45 };

export default {
    id: 'kitchen',
    name: 'Kitchen',
    blurb: 'Stirring something warm while it pours.',
    build(ctx) {
        const { THREE, kit, world } = ctx;
        const { rnd, std, box, rbox, cyl, sph, mesh, limb, clamp01, smooth } = kit;
        const V = (x, y, z) => new THREE.Vector3(x, y, z);

        const wallM = std(0xe2cf9c, 0.95), sage = std(0x8fa583, 0.7), sageLt = std(0xa9bd9c, 0.7), cream = std(0xe6dcc3, 0.8), wood = std(0x8a5f34, 0.6), brass = std(0xc9963c, 0.45, 0.2), copper = std(0xb87333, 0.5, 0.15), dark = std(0x2a1d14, 0.6);

        // ----- shell -----
        world.add(mesh(new THREE.PlaneGeometry(6.8, 5.6), std(0xffffff, 0.5, 0, { map: kit.checkerTexture({ a: '#b8714f', b: '#d2bd98', n: 8, repeat: [4, 3.4] }) }), { z: 0.2, rx: -Math.PI / 2, cast: false }));
        world.add(mesh(new THREE.PlaneGeometry(6.8, 5.6), std(0xe8dfc8, 0.95), { y: R.h, z: 0.2, rx: Math.PI / 2, cast: false }));
        const bw = (x0, x1, y0, y1) => world.add(box(x1 - x0, y1 - y0, 0.25, wallM, { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: R.z0 - 0.125, cast: false }));
        bw(R.x0, WIN.x0, 0, R.h); bw(WIN.x1, R.x1, 0, R.h); bw(WIN.x0, WIN.x1, 0, WIN.y0); bw(WIN.x0, WIN.x1, WIN.y1, R.h);
        world.add(box(0.25, R.h, 5.6, wallM, { x: R.x0 - 0.125, y: R.h / 2, z: 0.2, cast: false }));
        world.add(box(0.25, R.h, 5.6, wallM, { x: R.x1 + 0.125, y: R.h / 2, z: 0.2, cast: false }));

        // subway-tile backsplash
        const tiles = std(0xffffff, 0.35, 0, { map: kit.tileTexture({ bg: '#f3ead6', grout: '#cdbf9f', cols: 8, rows: 14, repeat: [2, 1] }) });
        const ts = (x0, x1) => world.add(mesh(new THREE.PlaneGeometry(x1 - x0, 0.8), tiles, { x: (x0 + x1) / 2, y: 1.3, z: R.z0 + 0.01, cast: false }));
        ts(R.x0, WIN.x0); ts(WIN.x1, R.x1);
        world.add(mesh(new THREE.PlaneGeometry(WIN.x1 - WIN.x0, WIN.y0 - 0.9), tiles, { x: (WIN.x0 + WIN.x1) / 2, y: (0.9 + WIN.y0) / 2, z: R.z0 + 0.01, cast: false }));

        // window with a deep sill, herbs, café curtain
        const fz = R.z0 + 0.02, fcol = std(0xf1ead8, 0.6);
        world.add(box(WIN.x1 - WIN.x0 + 0.16, 0.08, 0.16, fcol, { x: (WIN.x0 + WIN.x1) / 2, y: WIN.y1 + 0.04, z: fz }));
        world.add(box(0.08, WIN.y1 - WIN.y0, 0.16, fcol, { x: WIN.x0 - 0.04, y: (WIN.y0 + WIN.y1) / 2, z: fz }));
        world.add(box(0.08, WIN.y1 - WIN.y0, 0.16, fcol, { x: WIN.x1 + 0.04, y: (WIN.y0 + WIN.y1) / 2, z: fz }));
        world.add(box(0.04, WIN.y1 - WIN.y0, 0.1, fcol, { x: (WIN.x0 + WIN.x1) / 2, y: (WIN.y0 + WIN.y1) / 2, z: fz }));
        world.add(box(WIN.x1 - WIN.x0, 0.04, 0.1, fcol, { x: (WIN.x0 + WIN.x1) / 2, y: (WIN.y0 + WIN.y1) / 2, z: fz }));
        world.add(box(WIN.x1 - WIN.x0 + 0.3, 0.05, 0.3, wood, { x: (WIN.x0 + WIN.x1) / 2, y: WIN.y0 - 0.025, z: R.z0 + 0.12 }));
        const glass = kit.addGlass(ctx, { w: WIN.x1 - WIN.x0, h: WIN.y1 - WIN.y0 });
        glass.position.set((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, R.z0 + 0.05);
        ctx.backdrop({ style: 'garden', pal: { top: '#18202a', mid: '#2c3a46', hor: '#4a5c68', haze: '110,130,140', b1: '#27323b', lit: '255,200,120', horizon: 0.62 }, pos: [0.15, 4.0, -15], size: [48, 14], bright: 1.2 });
        for (let i = 0; i < 3; i++) {
            const px = -0.45 + i * 0.5;
            world.add(cyl(0.06, 0.045, 0.1, std(0xb5603c, 0.8), { x: px, y: WIN.y0 + 0.05, z: R.z0 + 0.14, cast: false }, 12));
            for (let k = 0; k < 6; k++) { const l = sph(0.045, std(0x56803a, 0.8), { x: px + rnd(-0.04, 0.04), y: WIN.y0 + 0.14 + rnd(0, 0.12), z: R.z0 + 0.14 + rnd(-0.03, 0.03), cast: false }, 8); l.scale.set(0.8, 1.6, 0.5); l.rotation.set(rnd(-0.5, 0.5), rnd(0, 6), rnd(-0.9, 0.9)); world.add(l); }
        }
        kit.curtain(ctx, { x: (WIN.x0 + WIN.x1) / 2 - 0.42, y: 2.1, z: R.z0 + 0.2, w: 0.7, h: 0.7, color: 0xf3ead6, opacity: 0.85, folds: 16 });
        kit.curtain(ctx, { x: (WIN.x0 + WIN.x1) / 2 + 0.42, y: 2.1, z: R.z0 + 0.2, w: 0.7, h: 0.7, color: 0xf3ead6, opacity: 0.85, folds: 16 });

        // ----- cabinets along the back wall -----
        const cabinetRun = (x0, x1, z0, z1, axis) => {
            // base cabinets with doors and a wooden top
            const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
            world.add(box(w, 0.86, d, sage, { x: cx, y: 0.43 + 0.04, z: cz }));
            world.add(box(w, 0.1, d - 0.02, dark, { x: cx, y: 0.05, z: cz, cast: false }));
            world.add(box(w + 0.02, 0.05, d + 0.06, wood, { x: cx, y: 0.925, z: cz }));
            const n = Math.max(1, Math.round((axis === 'x' ? w : d) / 0.6));
            for (let i = 0; i < n; i++) {
                const u = ((i + 0.5) / n - 0.5) * (axis === 'x' ? w : d);
                const dx = axis === 'x' ? u : 0, dz = axis === 'z' ? u : 0;
                const doorW = (axis === 'x' ? w : d) / n - 0.04;
                if (axis === 'x') {
                    world.add(box(doorW, 0.7, 0.02, sageLt, { x: cx + dx, y: 0.5, z: z1 + 0.011, cast: false }));
                    world.add(cyl(0.012, 0.012, 0.08, brass, { x: cx + dx + doorW * 0.35, y: 0.78, z: z1 + 0.04, rz: Math.PI / 2, rx: Math.PI / 2 }, 8));
                } else {
                    world.add(box(0.02, 0.7, doorW, sageLt, { x: x0 - 0.011, y: 0.5, z: cz + dz, cast: false }));
                    world.add(cyl(0.012, 0.012, 0.08, brass, { x: x0 - 0.04, y: 0.78, z: cz + dz + doorW * 0.35, rx: Math.PI / 2 }, 8));
                }
            }
        };
        cabinetRun(R.x0, R.x1 - 0.65, R.z0, R.z0 + 0.62, 'x'); // back run
        // right wall: stove sits between two short runs
        cabinetRun(R.x1 - 0.62, R.x1, R.z0 + 0.62, -0.55, 'z');
        cabinetRun(R.x1 - 0.62, R.x1, 0.15, 1.1, 'z');

        // sink in the back run
        const sx = (WIN.x0 + WIN.x1) / 2;
        world.add(box(0.7, 0.14, 0.42, std(0xb8bcc0, 0.3, 0.8), { x: sx, y: 0.91, z: R.z0 + 0.32, cast: false }));
        world.add(box(0.62, 0.02, 0.34, dark, { x: sx, y: 0.985, z: R.z0 + 0.32, cast: false }));
        world.add(cyl(0.015, 0.015, 0.26, std(0xb8bcc0, 0.25, 0.9), { x: sx, y: 1.07, z: R.z0 + 0.1 }, 10));
        world.add(mesh(new THREE.TorusGeometry(0.07, 0.014, 8, 16, Math.PI), std(0xb8bcc0, 0.25, 0.9), { x: sx, y: 1.2, z: R.z0 + 0.17, ry: Math.PI / 2 }));

        // upper cabinets (left) and an open shelf (right of the window)
        world.add(box(2.5, 0.95, 0.36, cream, { x: -2.15, y: 2.2, z: R.z0 + 0.18 }));
        for (let i = 0; i < 4; i++) world.add(box(0.58, 0.8, 0.02, std(0xf1ead8, 0.7), { x: -3.1 + i * 0.63, y: 2.2, z: R.z0 + 0.37, cast: false }));
        for (const y of [1.65, 2.2]) world.add(box(1.25, 0.04, 0.26, wood, { x: 1.95, y, z: R.z0 + 0.13 }));
        const jarCols = [0xe8d9bf, 0xb5603c, 0x7f9172, 0xc9963c];
        for (let i = 0; i < 4; i++) world.add(cyl(0.055, 0.055, 0.17, std(jarCols[i], 0.6), { x: 1.45 + i * 0.28, y: 1.755, z: R.z0 + 0.13 }, 14));
        for (let i = 0; i < 3; i++) { const m = kit.makeMug([0xf4eee2, 0xc9963c, 0x7f9172][i]); m.position.set(1.5 + i * 0.35, 2.29, R.z0 + 0.13); world.add(m); }
        // hanging rail with copper pots
        world.add(cyl(0.012, 0.012, 1.2, brass, { x: 1.95, y: 2.62, z: R.z0 + 0.1, rz: Math.PI / 2, cast: false }, 8));
        for (let i = 0; i < 3; i++) {
            const pg = new THREE.Group(); pg.position.set(1.5 + i * 0.4, 2.45 - i * 0.02, R.z0 + 0.12);
            pg.add(cyl(0.09, 0.08, 0.1, copper, { y: -0.1 }, 18));
            pg.add(cyl(0.006, 0.006, 0.12, brass, { y: 0.0 }, 6));
            world.add(pg);
        }

        // ----- stove, hood, pot and kettle -----
        const stove = new THREE.Group();
        stove.position.set(R.x1 - 0.33, 0, -0.2);
        stove.add(box(0.66, 0.9, 0.7, std(0xefe6d2, 0.4), {}).translateY(0.45));
        stove.add(box(0.02, 0.5, 0.56, std(0x1b1b1f, 0.15), { x: -0.335, y: 0.45, cast: false }));
        stove.add(box(0.03, 0.03, 0.4, brass, { x: -0.355, y: 0.74, cast: false }));
        for (let i = 0; i < 4; i++) stove.add(cyl(0.02, 0.02, 0.03, brass, { x: -0.34, y: 0.84, z: -0.24 + i * 0.16, rz: Math.PI / 2 }, 10));
        stove.add(box(0.66, 0.03, 0.7, dark, { y: 0.915 }));
        for (const [bx, bz] of [[-0.15, -0.17], [0.12, -0.17], [-0.15, 0.17], [0.12, 0.17]]) stove.add(cyl(0.09, 0.09, 0.01, std(0x111114, 0.5), { x: bx, y: 0.935, z: bz }, 20));
        world.add(stove);
        // hood
        world.add(box(0.7, 0.3, 0.8, copper, { x: R.x1 - 0.35, y: 1.95, z: -0.2 }));
        world.add(box(0.3, 1.0, 0.3, copper, { x: R.x1 - 0.25, y: 2.6, z: -0.2 }));
        // pot (burner front-left) and kettle (back-right)
        const potPos = V(R.x1 - 0.33 - 0.15, 0.94, -0.2 - 0.17);
        const pot = new THREE.Group(); pot.position.copy(potPos);
        pot.add(cyl(0.12, 0.12, 0.2, std(0x6c3a2a, 0.35, 0.3), { y: 0.1 }, 24));
        pot.add(cyl(0.115, 0.115, 0.01, std(0x6b2f1a, 0.4), { y: 0.185 }, 24));
        world.add(pot);
        const kettlePos = V(R.x1 - 0.33 + 0.12, 0.94, -0.2 + 0.17);
        const kettle = new THREE.Group(); kettle.position.copy(kettlePos);
        const kb = sph(0.11, copper, { y: 0.11 }, 20); kb.scale.set(1, 0.85, 1); kettle.add(kb);
        kettle.add(cyl(0.05, 0.08, 0.06, copper, { y: 0.2 }, 16));
        kettle.add(sph(0.02, brass, { y: 0.24 }, 10));
        kettle.add(mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 16, Math.PI), dark, { y: 0.2, ry: 0 }));
        const spout = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.14, 10), copper); spout.position.set(-0.13, 0.2, 0); spout.rotation.z = Math.PI / 2 + 0.5; kettle.add(spout);
        world.add(kettle);
        kit.addSteam(ctx, world, { x: potPos.x, y: potPos.y + 0.22, z: potPos.z, n: 10, rise: 0.4, size: 0.06, spread: 0.04, opacity: 0.26 });
        kit.addSteam(ctx, world, { x: kettlePos.x - 0.14, y: kettlePos.y + 0.2, z: kettlePos.z, n: 8, rise: 0.35, size: 0.05, spread: 0.02, opacity: 0.3, speed: 0.25 });
        ctx.addLamp({ x: potPos.x, y: 1.3, z: potPos.z, intensity: 1.0, color: 0xff9a50, shadow: false, distance: 4 });
        ctx.addLamp({ x: 2.2, y: 2.4, z: 0.8, intensity: 1.6, color: 0xffc080, shadow: false, distance: 6 });

        // ----- table, chairs, pendant lamp -----
        const tableX = -1.2, tableZ = 0.9;
        const table = new THREE.Group(); table.position.set(tableX, 0, tableZ);
        table.add(box(1.4, 0.05, 0.85, wood, { y: 0.76 }));
        for (const [x, z] of [[-0.62, -0.35], [0.62, -0.35], [-0.62, 0.35], [0.62, 0.35]]) table.add(cyl(0.03, 0.025, 0.74, std(0x5a3d24, 0.6), { x, y: 0.37, z }, 8));
        table.add(box(1.2, 0.012, 0.5, std(0xf3ead6, 0.9), { y: 0.79, cast: false })); // runner cloth
        // teapot, cups, plate of biscuits
        const tp = new THREE.Group(); tp.position.set(0.15, 0.78, -0.05);
        tp.add(sph(0.09, std(0xe8e0d0, 0.3), { y: 0.09 }, 20)); tp.add(cyl(0.04, 0.05, 0.03, std(0xe8e0d0, 0.3), { y: 0.19 }, 14));
        tp.add(mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 14, Math.PI), std(0xe8e0d0, 0.3), { x: 0.1, y: 0.1, rz: -Math.PI / 2 }));
        const spt = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 8), std(0xe8e0d0, 0.3)); spt.position.set(-0.12, 0.12, 0); spt.rotation.z = Math.PI / 2 + 0.7; tp.add(spt);
        table.add(tp);
        const c1 = kit.makeMug(0xc9963c); c1.position.set(-0.3, 0.84, 0.12); table.add(c1);
        const c2 = kit.makeMug(0x7f9172); c2.position.set(0.5, 0.84, 0.15); table.add(c2);
        table.add(cyl(0.14, 0.12, 0.015, std(0xe8e0d0, 0.4), { x: -0.05, y: 0.797, z: 0.22 }, 24));
        for (let i = 0; i < 5; i++) table.add(cyl(0.035, 0.035, 0.012, std(0xc98b4b, 0.9), { x: -0.05 + rnd(-0.07, 0.07), y: 0.81 + (i > 2 ? 0.012 : 0), z: 0.22 + rnd(-0.06, 0.06) }, 12));
        world.add(table);
        kit.addSteam(ctx, c1, { y: 0.06, n: 6 }); kit.addSteam(ctx, c2, { y: 0.06, n: 6 });
        const chair = (x, z, ry) => {
            const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
            g.add(rbox(0.46, 0.05, 0.44, 0.02, std(0x93a687, 0.8), { y: 0.46 }));
            g.add(box(0.44, 0.4, 0.03, std(0x5a3d24, 0.6), { y: 0.72, z: 0.21 }));
            for (const [lx, lz] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]]) g.add(cyl(0.02, 0.016, 0.45, std(0x5a3d24, 0.6), { x: lx, y: 0.225, z: lz }, 8));
            g.add(box(0.03, 0.4, 0.03, std(0x5a3d24, 0.6), { x: -0.2, y: 0.7, z: 0.21 })); g.add(box(0.03, 0.4, 0.03, std(0x5a3d24, 0.6), { x: 0.2, y: 0.7, z: 0.21 }));
            world.add(g); return g;
        };
        chair(tableX - 0.95, tableZ, -Math.PI / 2 + 0.1);
        chair(tableX + 0.95, tableZ, Math.PI / 2 - 0.1);
        const cat = kit.makeCat({ fur: 0xd9873f }); cat.group.position.set(tableX - 0.97, 0.49, tableZ); cat.group.rotation.y = 0.9; world.add(cat.group);
        ctx.anim((t) => cat.update(t));
        // pendant
        const pend = new THREE.Group(); pend.position.set(tableX, 0, tableZ);
        pend.add(cyl(0.006, 0.006, 1.4, dark, { y: 2.4 }, 6));
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xb5603c, roughness: 0.5, side: THREE.DoubleSide, emissive: 0xff9a3a, emissiveIntensity: 0.3 }));
        dome.position.y = 1.72; pend.add(dome);
        pend.add(sph(0.06, new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.4, 1.4) }), { y: 1.7, cast: false }, 12));
        world.add(pend);
        ctx.addLamp({ x: tableX, y: 1.55, z: tableZ, intensity: 8 });
        ctx.glow(tableX, 1.62, tableZ, 0.8, 0xffa850, 0.3);
        // under-cabinet lights
        ctx.addLamp({ x: -2.5, y: 1.65, z: R.z0 + 0.5, intensity: 1.1, color: 0xffc070, shadow: false, distance: 3.5 });
        ctx.addLamp({ x: -1.4, y: 1.65, z: R.z0 + 0.5, intensity: 1.1, color: 0xffc070, shadow: false, distance: 3.5 });
        // rug runner, hanging plant
        world.add(mesh(new THREE.PlaneGeometry(2.8, 0.8), std(0xffffff, 1, 0, { map: kit.stripeTexture(['#7f9172', '#e6dcc3', '#c9963c', '#e6dcc3'], { n: 10, vertical: false }) }), { x: -0.6, y: 0.012, z: -1.55, rx: -Math.PI / 2, cast: false }));
        for (let i = 0; i < 9; i++) { const l = sph(0.06, std(0x56803a, 0.8), { x: 1.1 + rnd(-0.08, 0.08), y: 2.75 - rnd(0, 0.5), z: -2.2 + rnd(-0.05, 0.05), cast: false }, 8); l.scale.set(0.7, 1.7, 0.5); world.add(l); }
        world.add(cyl(0.1, 0.07, 0.13, std(0xe8d9bf, 0.8), { x: 1.1, y: 2.9, z: -2.2, cast: false }, 14));

        // ----- the cook -----
        const P = kit.makePerson({ sweater: 0xc4623f, pants: 0x39485c, hair: 0x2f1d12, hairStyle: 'bun', sock: 0xe8d9bf });
        const root = new THREE.Group();
        root.position.set(R.x1 - 1.35, 0, -0.5);
        root.rotation.y = -Math.PI / 2; // faces +X, toward the stove
        root.add(P.root);
        world.add(root);
        P.pose({
            pelvis: [0, 0.95, 0], chest: [0, 1.4, -0.02], neck: [0, 1.54, -0.02],
            hipL: [-0.1, 0.95, 0], hipR: [0.1, 0.95, 0],
            kneeL: [-0.1, 0.5, -0.02], kneeR: [0.1, 0.5, -0.02],
            ankleL: [-0.1, 0.08, 0], ankleR: [0.1, 0.08, 0],
            shoulderL: [-0.2, 1.4, -0.02], shoulderR: [0.2, 1.4, -0.02],
            elbowL: [-0.27, 1.12, -0.04], elbowR: [0.26, 1.14, -0.2],
            handL: [-0.14, 0.97, -0.18], handR: [0.1, 1.04, -0.52],
        });
        // apron
        P.root.add(box(0.34, 0.5, 0.02, std(0xe8e0d0, 0.9), { y: 1.1, z: -0.17, rx: 0.04 }));
        P.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        const spoon = cyl(0.012, 0.012, 1, std(0xa6783c, 0.7), {}, 8);
        world.add(spoon);
        const spoonBall = sph(0.03, std(0xa6783c, 0.7), {}, 10); world.add(spoonBall);
        const tipW = V(potPos.x, potPos.y + 0.08, potPos.z);
        const hw = V(0, 0, 0);
        let nextGlance = 9, glStart = -1;
        ctx.anim((t) => {
            const b = Math.sin(t * 1.4);
            P.j.chest.set(0, 1.4 + b * 0.004, -0.02);
            // stir in slow circles
            const w = t * 1.6;
            P.j.handR.set(0.1 + Math.cos(w) * 0.03, 1.04 + Math.sin(w * 0.5) * 0.01, -0.52 + Math.sin(w) * 0.03);
            P.j.elbowR.set(0.26, 1.14, -0.2 + Math.sin(w) * 0.02);
            if (glStart < 0 && t > nextGlance) glStart = t;
            let gl = 0;
            if (glStart >= 0) { const u = (t - glStart) / 4; if (u >= 1) { glStart = -1; nextGlance = t + rnd(12, 22); } else gl = smooth(clamp01(Math.sin(u * Math.PI) * 1.6)); }
            P.head.rotation.x = -0.32 * (1 - gl) + 0.02;
            P.head.rotation.y = -0.45 - gl * 0.75;
            P.update();
            hw.copy(P.j.handR); root.localToWorld(hw);
            tipW.set(potPos.x + Math.cos(w) * 0.04, potPos.y + 0.07, potPos.z + Math.sin(w) * 0.04);
            limb(spoon, hw, tipW);
            spoonBall.position.copy(tipW);
        });

        return {
            camera: { pos: [0.4, 1.5, 5.2], look: [0.2, 1.2, -1.0], fov: 42, parallax: [0.5, 0.15], narrow: { dz: 2.2, dfov: 12, dlook: 1.1, dy: -0.5 } },
            hemi: [0x9aaa92, 0x3a2a1c, 0.62], ambient: [0x6a5a44, 0.4], exposure: 1.0, bloom: [0.38, 0.6, 1.0],
            windowLight: { color: 0x8aa2b0, intensity: 0.45, pos: [0.5, 3, -9], target: [0, 0.6, 0] },
            rain: { x: [-5, 5], z: [-2.7, -14], top: 5, h: 7, color: 0xb4c6dc },
            dust: { x: [-3, 3], y: [0.4, 2.8], z: [-2.2, 2.6] },
            audio: { lp: 4400 },
        };
    },
};
