// Scene 2: window seat. A teal reading nook at dusk: someone curled up with a book and a blanket, a cat asleep on the cushions.
const R = { x0: -3, x1: 3, z0: -2.4, z1: 2.4, h: 3.0 };
const WIN = { x0: -1.9, x1: 1.9, y0: 0.55, y1: 2.5 };

export default {
    id: 'window-seat',
    name: 'Window seat',
    blurb: 'Curled up with a book at dusk.',
    build(ctx) {
        const { THREE, kit, world } = ctx;
        const { rnd, std, box, rbox, cyl, sph, mesh, clamp01, smooth } = kit;

        const teal = std(0x4a7068, 0.95), cream = std(0xd9cdb4, 0.85), darkWood = std(0x2b1d12, 0.65), paint = std(0x1f2e2c, 0.55);
        const seatTop = 0.58;

        // ----- shell -----
        world.add(mesh(new THREE.PlaneGeometry(6, 4.8), std(0xffffff, 0.5, 0, { map: kit.plankTexture({ base: [96, 66, 40], rows: 10, repeat: [2, 3] }) }), { rx: -Math.PI / 2, cast: false }));
        world.add(mesh(new THREE.PlaneGeometry(6, 4.8), std(0x5a4430, 0.95), { y: R.h, rx: Math.PI / 2, cast: false }));
        for (const z of [-1.8, 0.0, 1.8]) world.add(box(6, 0.18, 0.2, darkWood, { y: R.h - 0.09, z }));
        const back = kit.wallWithHole({ w: 6, h: R.h, t: 0.25, mat: teal, hole: WIN });
        back.position.set(0, 0, R.z0 - 0.125);
        world.add(back);
        world.add(box(0.25, R.h, 4.8, teal, { x: R.x0 - 0.125, y: R.h / 2, cast: false }));
        world.add(box(0.25, R.h, 4.8, teal, { x: R.x1 + 0.125, y: R.h / 2, cast: false }));
        // cream bead-board wainscot
        const wc = 1.1;
        world.add(box(6, wc, 0.05, cream, { y: wc / 2, z: R.z0 + 0.025, cast: false }));
        world.add(box(0.05, wc, 4.8, cream, { x: R.x0 + 0.025, y: wc / 2, cast: false }));
        world.add(box(0.05, wc, 4.8, cream, { x: R.x1 - 0.025, y: wc / 2, cast: false }));
        world.add(box(0.06, 0.05, 4.8, cream, { x: R.x0 + 0.05, y: wc, cast: false }));
        world.add(box(0.06, 0.05, 4.8, cream, { x: R.x1 - 0.05, y: wc, cast: false }));

        // window piers, frame and glass
        for (const sx of [-1, 1]) world.add(box(0.15, 2.7, 0.8, cream, { x: sx * 2.05, y: 1.35, z: R.z0 + 0.4 }));
        const fz = R.z0 + 0.02;
        world.add(box(WIN.x1 - WIN.x0, 0.09, 0.14, paint, { y: WIN.y1 + 0.045, z: fz }));
        world.add(box(WIN.x1 - WIN.x0, 0.06, 0.2, cream, { y: WIN.y0 - 0.03, z: R.z0 + 0.06 }));
        const mw = (WIN.x1 - WIN.x0) / 3;
        for (const x of [WIN.x0 + mw, WIN.x0 + 2 * mw]) world.add(box(0.05, WIN.y1 - WIN.y0, 0.1, paint, { x, y: (WIN.y0 + WIN.y1) / 2, z: fz }));
        world.add(box(WIN.x1 - WIN.x0, 0.05, 0.1, paint, { y: (WIN.y0 + WIN.y1) / 2 + 0.2, z: fz }));
        const glass = kit.addGlass(ctx, { w: WIN.x1 - WIN.x0, h: WIN.y1 - WIN.y0 });
        glass.position.set(0, (WIN.y0 + WIN.y1) / 2, R.z0 + 0.05);
        ctx.backdrop({ style: 'street', pal: { top: '#141b26', mid: '#27364a', hor: '#51647a', haze: '90,110,135', b1: '#2c3846', b2: '#3a2a26', lit: '255,190,110' }, pos: [0, 3.7, -16], size: [56, 14], bright: 1.2 });

        // ----- the window seat -----
        world.add(box(5.9, 0.5, 0.7, cream, { y: 0.25, z: R.z0 + 0.35 }));
        for (let i = 0; i < 4; i++) world.add(box(1.3, 0.34, 0.02, std(0xc9bda2, 0.85), { x: -2.2 + i * 1.47, y: 0.26, z: R.z0 + 0.71, cast: false }));
        const stripes = kit.stripeTexture(['#e8d9bf', '#d6c7a6', '#3d5f5a', '#d6c7a6'], { n: 12 });
        world.add(rbox(3.7, 0.1, 0.62, 0.04, std(0xffffff, 0.95, 0, { map: stripes }), { y: 0.53, z: R.z0 + 0.35 }));
        const pil = (x, z, col, ry, tex) => rbox(0.4, 0.38, 0.13, 0.055, std(tex ? 0xffffff : col, 0.95, 0, tex ? { map: tex } : {}), { x, y: seatTop + 0.17, z, rx: -0.3, ry });
        world.add(pil(-1.75, -2.1, 0xb5603c, 0.25));
        world.add(pil(-1.4, -2.18, 0, -0.1, kit.stripeTexture(['#c9963c', '#e8d9bf'], { n: 6 })));
        world.add(pil(0.7, -2.2, 0x2f4a55, 0.1));

        // ----- ceiling light: string lights around the window -----
        kit.stringLights(ctx, { a: [-1.95, 2.66, R.z0 + 0.1], b: [1.95, 2.66, R.z0 + 0.1], sag: 0.28, n: 18 });
        kit.stringLights(ctx, { a: [-2.9, 2.85, R.z0 + 0.1], b: [-1.95, 2.66, R.z0 + 0.1], sag: 0.1, n: 5 });
        kit.stringLights(ctx, { a: [1.95, 2.66, R.z0 + 0.1], b: [2.9, 2.85, R.z0 + 0.1], sag: 0.1, n: 5 });
        ctx.addLamp({ x: 0, y: 2.55, z: R.z0 + 0.5, intensity: 1.6, color: 0xffb060, shadow: false, distance: 7 });

        // curtains (mustard), tied back
        kit.curtain(ctx, { x: WIN.x0 + 0.2, y: 1.75, z: R.z0 + 0.2, w: 0.5, h: 2.1, color: 0xb98630 });
        kit.curtain(ctx, { x: WIN.x1 - 0.2, y: 1.75, z: R.z0 + 0.2, w: 0.5, h: 2.1, color: 0xb98630 });
        world.add(cyl(0.015, 0.015, 4.2, darkWood, { y: 2.75, z: R.z0 + 0.19, rz: Math.PI / 2, cast: false }, 8));

        // ----- left built-in bookshelf, right side table + lamp -----
        const shelf = kit.bookshelf({ w: 2.3, h: 2.5, d: 0.36, frame: 0x3a2616, back: 0x25302c, gap: 0.42 });
        shelf.position.set(R.x0 + 0.2, 0, -0.1);
        shelf.rotation.y = -Math.PI / 2;
        world.add(shelf);
        world.add(cyl(0.3, 0.3, 0.04, std(0x754e1a, 0.6), { x: 2.35, y: 0.55, z: 0.15 }, 28));
        world.add(cyl(0.03, 0.03, 0.53, darkWood, { x: 2.35, y: 0.27, z: 0.15 }, 8));
        world.add(cyl(0.18, 0.2, 0.03, darkWood, { x: 2.35, y: 0.015, z: 0.15 }, 20));
        kit.tableLamp(ctx, { x: 2.4, y: 0.57, z: 0.15, intensity: 2.2, shade: 0xf0d19a });
        const mug2 = kit.makeMug(0xc9963c); mug2.position.set(2.18, 0.625, 0.3); world.add(mug2);
        kit.addSteam(ctx, mug2, { y: 0.06, n: 6 });
        // frames on the right wall
        for (const [z, y, c1, c2] of [[-0.7, 1.9, '#e8c9a0', '#b5603c'], [0.0, 1.75, '#b8c9c0', '#3d5f5a'], [0.7, 1.95, '#f0d9a8', '#c9963c']]) {
            const f = new THREE.Group(); f.position.set(R.x1 - 0.04, y, z); f.rotation.y = -Math.PI / 2;
            f.add(box(0.55, 0.42, 0.04, darkWood, { cast: false }));
            const p = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.33), new THREE.MeshStandardMaterial({ map: kit.paintingTexture(c1, c2), roughness: 0.9 })); p.position.z = 0.025; f.add(p);
            world.add(f);
        }
        // rug
        world.add(mesh(new THREE.PlaneGeometry(3.4, 2.4), std(0xffffff, 1, 0, { map: kit.rugTexture({ field: '#2f4a55', band: '#e8d9bf', band2: '#c9963c', accents: ['#e8d9bf', '#c9963c', '#b5603c', '#8fb3b0'] }) }), { x: 0.1, y: 0.012, z: 0.6, rx: -Math.PI / 2, cast: false }));
        // plant on the shelf-side floor
        world.add(cyl(0.16, 0.12, 0.3, std(0xb5603c, 0.8), { x: -2.45, y: 0.15, z: 1.7 }, 16));
        for (let i = 0; i < 11; i++) {
            const l = sph(0.1, std(0x4a6a35, 0.8), { x: -2.45 + rnd(-0.15, 0.15), y: 0.5 + rnd(0, 0.45), z: 1.7 + rnd(-0.15, 0.15) }, 10);
            l.scale.set(0.8, 1.8, 0.5); l.rotation.set(rnd(-0.5, 0.5), rnd(0, 6), rnd(-0.9, 0.9)); world.add(l);
        }

        // ----- cat asleep on a cushion -----
        const cat = kit.makeCat({ fur: 0x8a8f96, belly: 0xe8e2d6 });
        cat.group.position.set(-0.55, seatTop + 0.02, R.z0 + 0.4);
        cat.group.rotation.y = 0.4;
        world.add(cat.group);
        ctx.anim((t) => cat.update(t));
        // candle on the seat
        const jar = cyl(0.05, 0.05, 0.09, std(0xcfb98f, 0.3, 0, { transparent: true, opacity: 0.55 }), { x: 0.55, y: seatTop + 0.05, z: R.z0 + 0.5 }, 20);
        world.add(jar);
        const flame = sph(0.013, new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1) }), { x: 0.55, y: seatTop + 0.105, z: R.z0 + 0.5, cast: false }, 10);
        flame.scale.y = 1.8; world.add(flame);
        ctx.addLamp({ x: 0.55, y: seatTop + 0.17, z: R.z0 + 0.5, intensity: 0.7, color: 0xff9a40, shadow: false, distance: 4, flicker: 0.25, candle: true });
        ctx.anim((t) => flame.scale.set(1 + 0.15 * Math.sin(t * 17), 1.8 + 0.3 * Math.sin(t * 11), 1));

        // ----- the reader -----
        const P = kit.makePerson({ sweater: 0xc9963c, pants: 0x39485c, hair: 0x2a1a12, hairStyle: 'long', sock: 0xb5603c });
        const root = new THREE.Group();
        root.position.set(1.72, seatTop, R.z0 + 0.4);
        root.rotation.y = Math.PI / 2; // faces -X
        root.add(P.root);
        world.add(root);
        const pose = {
            pelvis: [0, 0.12, 0.04], chest: [0, 0.62, 0.08], neck: [0, 0.74, 0.08],
            hipL: [-0.1, 0.12, 0], hipR: [0.1, 0.12, 0],
            kneeL: [-0.11, 0.38, -0.36], kneeR: [0.11, 0.38, -0.36],
            ankleL: [-0.11, 0.06, -0.14], ankleR: [0.11, 0.06, -0.14],
            shoulderL: [-0.2, 0.6, 0.06], shoulderR: [0.2, 0.6, 0.06],
            elbowL: [-0.25, 0.4, -0.1], elbowR: [0.25, 0.4, -0.1],
            handL: [-0.08, 0.46, -0.3], handR: [0.08, 0.46, -0.3],
        };
        P.pose(pose);
        const book = kit.makeBook(0x7a3b2b, 0.2, 0.27, 0.035);
        book.position.set(0, 0.5, -0.31); book.rotation.x = -0.95;
        P.root.add(book);
        const blanket = rbox(0.55, 0.17, 0.55, 0.07, std(0xc9b99a, 0.98), { y: 0.33, z: -0.2, rx: 0.1 });
        P.root.add(blanket);
        P.root.add(rbox(0.5, 0.06, 0.4, 0.03, std(0xc9b99a, 0.98), { y: 0.03, z: 0.15, rz: 0.1 }));
        P.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

        let nextLook = 12, lookStart = -1, nextPage = 6, pageStart = -1;
        const hR = new THREE.Vector3();
        ctx.anim((t) => {
            const b = Math.sin(t * 1.3);
            P.j.chest.set(0, 0.62 + b * 0.006, 0.08);
            P.j.neck.set(0, 0.74 + b * 0.006, 0.08);
            // glance out at the rain now and then
            if (lookStart < 0 && t > nextLook) lookStart = t;
            let look = 0;
            if (lookStart >= 0) {
                const u = (t - lookStart) / 5;
                if (u >= 1) { lookStart = -1; nextLook = t + rnd(16, 28); } else look = smooth(clamp01(Math.sin(u * Math.PI) * 1.6));
            }
            P.head.rotation.y = -0.15 - look * 0.95;
            P.head.rotation.x = -0.4 * (1 - look) + 0.02;
            // turn a page
            if (pageStart < 0 && t > nextPage) pageStart = t;
            let pg = 0;
            if (pageStart >= 0) {
                const u = (t - pageStart) / 1.6;
                if (u >= 1) { pageStart = -1; nextPage = t + rnd(9, 16); } else pg = Math.sin(u * Math.PI);
            }
            hR.set(0.08 + pg * 0.09, 0.46 + pg * 0.1, -0.3 - pg * 0.02);
            P.j.handR.copy(hR);
            P.update();
        });

        return {
            camera: { pos: [0.5, 1.35, 4.2], look: [0.45, 1.1, -2.0], fov: 42, parallax: [0.45, 0.14] },
            hemi: [0x4d7280, 0x2a1c10, 0.6], ambient: [0x3a4c58, 0.4], exposure: 1.1, bloom: [0.4, 0.6, 1.0],
            windowLight: { color: 0x6f8fb5, intensity: 0.55, pos: [0.5, 3, -9], target: [0, 0.6, 0] },
            rain: { x: [-6, 6], z: [-2.6, -14], top: 5.5, h: 8, color: 0xb4c6dc },
            dust: { x: [-2.8, 2.8], y: [0.4, 2.6], z: [-2.2, 2] },
            audio: { lp: 4800 },
        };
    },
};
