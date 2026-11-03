# Cozy Rain

A small Blazor WebAssembly site: a person sits in an armchair with a hot drink in a warm, lamp-lit room while it rains outside. three.js draws the scene and the Web Audio API makes the rain sounds. There are no image or audio files, because everything is generated in code.

## Run it

Requires the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0).

```bash
dotnet run
# open http://localhost:5280
```

Click **Enter the cozy** (browsers only allow sound after a click), then use the ☰ button for the controls.

## What's in it

- **Room:** wood floor and panelling, olive sofa, rust armchair, bookshelf, rug, curtains, plants, string lights.
- **Light:** a floor lamp, table lamp, candle and string lights over a very dim ambient light. A **Lamp warmth** slider changes how deep the amber gets.
- **Person:** a low-poly figure in a knit jumper under a blanket. They breathe, look out of the window and sip from a steaming mug now and then.
- **Window:** a blurred, rainy city at dusk, rain streaks falling outside, and beads and running drops on the glass.
- **Sound:** synthesised rain (a soft wash, a bright hiss, individual drops and a low rumble that grows with the rain), a very faint clock, and occasional distant thunder with a matching lightning flash.
- **Controls:** sound on/off, volume, rain intensity, lamp warmth and a thunder toggle. The framing adapts to phone screens.

## Layout

| Path | Purpose |
| --- | --- |
| `Pages/Home.razor` | Page, intro screen and controls (C#, calls into JS) |
| `wwwroot/js/cozyScene.js` | three.js scene, lighting, rain, lightning |
| `wwwroot/js/cozyAudio.js` | Web Audio rain and thunder synth |
| `wwwroot/lib/three/` | Vendored three.js r160 (MIT) plus the few addons used |
| `wwwroot/css/app.css` | Styling and palette |

## Colour palette

Taken from cozy-rainy-day reference photos: shadow brown `#1B0E02`, espresso `#2E1705`, wood `#754E1A`, honey gold `#A57B3F`, lamp glow `#DCB775`, amber `#E0A04A`, rust `#B5603C`, olive `#6B6A3A`, storm teal-grey `#2C3238`.

## Publish

```bash
dotnet publish -c Release -o out
```

`out/wwwroot` is a static site. Serve it from any static host. If it is not at the site root, change `<base href="/">` in `wwwroot/index.html`.
