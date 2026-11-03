# Rainy Day

Five cozy little rooms on a rainy day, built as a Blazor WebAssembly site. three.js draws each room and the Web Audio API makes the rain, thunder and fire sounds. There are no image or audio files: every texture, shape and sound is generated in code.

## Run it

Requires the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0).

```bash
dotnet run
# open http://localhost:5280
```

Pick a room, click **come in** (browsers only allow sound after a click), then change rooms any time:

- the tabs at the top, or the ‹ › arrows
- the **←** / **→** keys, or **1**–**5**
- a link: `?scene=cabin` (ids below)

## The rooms

| # | id | Room | What's going on |
| - | -- | ---- | --------------- |
| 1 | `living-room` | Living room | An armchair, a steaming mug, floor lamp, bookshelf, a cat asleep on the sofa. Rainy city outside, seen through refractive rain-on-glass (see below). |
| 2 | `window-seat` | Window seat | A teal reading nook at dusk. Someone curled up with a book and blanket, a grey cat on the cushions, a wet street outside. |
| 3 | `attic-bedroom` | Attic bedroom | Sloped roof, a skylight over the bed with rain drumming on it, a round window, someone reading in bed. The rain sounds louder here. |
| 4 | `kitchen` | Kitchen | Sage cabinets, a pendant lamp over the table, someone stirring a pot, a kettle, a cat on a chair, a rainy garden. |
| 5 | `cabin` | Cabin | Log walls, a crackling stone fireplace, someone in a plaid blanket on a sheepskin rug, a cat by the hearth, pine forest in the rain. |

Every room has its own light, view, people and sound. Each person breathes, glances out at the rain and sips or turns a page now and then.

## Rain on glass (living room)

The living-room window uses its own shader, `addRainGlass` in `wwwroot/js/kit.js`. For each pixel it finds where the view ray lands on the picture of the city outside (so parallax still works), then:

- **drops:** slowly appearing and fading beads, plus drops that slide down in stick-slip jerks, each bending the view like a tiny water lens and carrying a highlight and a dark rim
- **mist and trails:** the glass is misted and out of focus; drops and the trails they leave wipe it clear, with small droplets stranded behind
- **controls:** the rain slider changes how many drops there are and how fast they run, and a lightning flash lights the view through the glass

It is written from scratch from the general technique. The other four rooms still use the simpler glass.

## Controls ("notes")

Sound on/off, volume, rain amount, lamp glow and a thunder toggle. Thunder comes with a lightning flash and a rumble that arrives a moment later. On phones the notes start closed and the camera pulls back to fit the screen.

## Look and feel of the UI

Hand-drawn paper: wobbly ink borders, taped notes, marker-pen highlights, hard offset shadows, no glow or blur. Text is set in **Patrick Hand** (easy to read) with **Caveat Brush** for headings. Both fonts are bundled in `wwwroot/fonts` under the SIL Open Font License.

## Layout

| Path | Purpose |
| --- | --- |
| `Pages/Home.razor`, `Pages/RoomTabs.razor` | Page, intro, room tabs and notes (C#, calls into JS) |
| `wwwroot/js/cozyScene.js` | Engine: renderer, lighting, rain, lightning, switching rooms |
| `wwwroot/js/kit.js` | Shared pieces: textures, outside views, people, cats, steam, rainy glass |
| `wwwroot/js/scenes/*.js` | One file per room |
| `wwwroot/js/cozyAudio.js` | Web Audio synth: rain, thunder, fire, clock, per-room sound profiles |
| `wwwroot/lib/three/` | Vendored three.js r160 (MIT) and the few addons used |
| `wwwroot/css/app.css` | Styling |

To add a room, copy one of the files in `wwwroot/js/scenes/`, give it a new `id`, build it into `ctx.world`, return its camera and light settings, and add it to the list in `cozyScene.js`.

## Publish

```bash
dotnet publish -c Release -o out
```

`out/wwwroot` is a static site you can serve from any static host. If it is not at the site root, change `<base href="/">` in `wwwroot/index.html`.
