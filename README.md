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

- **drops:** three layers of slowly appearing and fading beads (from a fine mist of tiny drops to fat ones) plus three layers of drops that slide down in stick-slip jerks, each bending the view like a tiny water lens and carrying a soft highlight and a dark rim. No two drops are the same shape: they are tilted, squat or tall, with slightly uneven edges, the bigger ones sag into teardrops pointing up toward their trail, and some running drops carry a small satellite drop
- **mist and trails:** a light mist softens the view; drops and the long trails they leave wipe it clear, with small droplets stranded behind. The outside view is a crisp, high-contrast city so the drops have real edges to bend
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

```bash
dotnet publish -c Release -o out
```

`out/wwwroot` is a static site you can serve from any static host. If it is not at the site root, change `<base href="/">` in `wwwroot/index.html`.
