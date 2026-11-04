# Rainy Day

A cozy living room on a rainy night, built as a Blazor WebAssembly site. three.js draws the room and the Web Audio API makes the rain and thunder. There are no image or audio files: every texture, shape and sound is generated in code.

## Run it

Requires the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0).

```bash
dotnet run
# open http://localhost:5280
```

Click **come in** (browsers only allow sound after a click). Then:

- **look out the window** (button at the top, or press **L**) glides the camera up to the glass so the rain fills the screen; press it again, or **L**, to go back to the room
- move the mouse (or finger) to shift the view a little

## The room

An armchair with someone sipping a hot drink and watching the rain, a candle on the coffee table, a floor lamp, a table lamp, string lights, a bookshelf, a cat asleep on the sofa, and a rainy city outside. The person breathes, glances out at the rain and sips now and then.

## Rain on glass

The window uses its own shader, `addRainGlass` in `wwwroot/js/kit.js`. For each pixel it finds where the view ray lands on the picture of the city outside (so parallax still works), then:

- **drops:** four layers of slowly appearing and fading beads, from a dense texture of very tiny drops up to a few fat ones, plus three layers of running drops. No two drops are the same: each has its own strength, and its own shape (tilted, squat or tall, slightly uneven, with bigger ones sagging into teardrops pointing up toward their trail). Running drops sometimes carry a small satellite drop
- **real sizes:** the window is 3.4 m by 1.6 m and the drops are drawn at real scale: fine drops under a millimetre, most between 1 and 3 mm, the biggest standing drops about 5 mm across, running drops 2 to 8 mm. From across the room a drop is smaller than a pixel, so the glass shows what they add up to (faint wiped-clear runs and the odd glint); "look out the window" moves the camera to about 45 cm from the glass, where the drops are big enough to see
- **size changes the look:** big drops are small lenses that flip the view and carry a warm lamp highlight and a dark rim. Tiny drops are just dim smudges with a pale edge, and drops smaller than a screen pixel fade out so the glass never shimmers or crawls, at any resolution
- **runs and trails:** drops run for a short, random distance, stop for a while and fade; each leaves a faint, slightly uneven trail with small droplets stranded behind it, so there are no neat full-height lines
- **reflection:** the glass reflects the room. The engine takes a snapshot of the room (a cube map) from just inside the window, so lamps and pictures show faintly in the glass, more at glancing angles, and each big drop catches a warm reflection of the lamps. The snapshot is retaken when you change the lamp glow. (The room's open front is closed by a wall only the glass can see, with pictures and a wall light on it.)
- **mist:** the glass is misted and out of focus, patchy and heavier toward the bottom; drops clear it
- **the view outside:** a soft, glowing, out-of-focus city, as if a camera were focused on the drops
- **controls:** the rain slider changes how many drops there are and how fast they run, and a lightning flash lights the view through the glass

It is written from scratch from the general technique of drops that refract a blurred background.

## Controls ("notes")

Sound on/off, volume, rain amount, lamp glow and a thunder toggle. Thunder comes with a lightning flash and a rumble that arrives a moment later. On phones the notes start closed and the camera pulls back to fit the screen.

## Look and feel of the UI

Hand-drawn paper: wobbly ink borders, taped notes, marker-pen highlights, hard offset shadows, no glow or blur. Text is set in **Patrick Hand** (easy to read) with **Caveat Brush** for headings. Both fonts are bundled in `wwwroot/fonts` under the SIL Open Font License.

## Layout

| Path | Purpose |
| --- | --- |
| `Pages/Home.razor` | Page, intro, window button and notes (C#, calls into JS) |
| `Pages/RoomTabs.razor` | Room tabs, hidden while there is only one room |
| `wwwroot/js/cozyScene.js` | Engine: renderer, lighting, rain, lightning, camera and window view |
| `wwwroot/js/kit.js` | Shared pieces: textures, outside views, people, cats, steam, the rain glass |
| `wwwroot/js/scenes/livingRoom.js` | The room |
| `wwwroot/js/cozyAudio.js` | Web Audio synth: rain, thunder, clock, sound profiles |
| `wwwroot/lib/three/` | Vendored three.js r160 (MIT) and the few addons used |
| `wwwroot/css/app.css` | Styling |

## More rooms

The project once had five rooms (living room, window seat, attic bedroom, kitchen, cabin). Only the living room is kept for now, but the engine still supports several: a scene is one file in `wwwroot/js/scenes/` that builds into `ctx.world` and returns its camera and lighting, and the list in `cozyScene.js` shows the tabs again when it has more than one. The other four are in git history at commit `feeba61`.

## Publish

### GitHub Pages (automatic)

`.github/workflows/pages.yml` builds the site and deploys it to GitHub Pages on every push to `claude/cozy-rain-blazor-threejs-eb3tkc` (and on demand from the Actions tab). It sets the base path to the repository name and adds a `404.html` and `.nojekyll`.

One-time setup: in the repository, go to **Settings > Pages** and set **Source** to **GitHub Actions**. The site is then at `https://<user>.github.io/<repo>/`. If you change the deploying branch, edit the `branches` list in the workflow.

### Anywhere else

```bash
dotnet publish -c Release -o out
```

`out/wwwroot` is a static site you can serve from any static host. If it is not at the site root, change `<base href="/">` in `wwwroot/index.html` to the folder it is served from.
