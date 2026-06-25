# VCR Records — an interactive record-store installation

A premium, immersive web experience for **VCR Records** (Video Cassette Recordings), a
fictional 1990s jungle / drum & bass label. It is deliberately **not** a traditional
website: there is no menu and no scrolling page. Instead you step through a loading
gate into a single, hand-illustrated panorama of the shop and **discover** everything
by looking around.

> Reference vibe: `balmingtiger.com` — an explorable illustrated room rather than a
> page of sections.

## The experience

- **Loading gate** — a warm, flickering title card doubles as the asset-streaming UI.
  Clicking **Step Inside** parts the shutters and drops you into the room.
- **Fixed-camera panorama** — the camera never leaves its spot. You pan horizontally
  and vertically (drag, trackpad, arrow keys, or touch) across a wider-than-screen
  illustration, revealing the booth, the bins, the counter and the back room.
- **Invisible hotspots** — seven objects in the scene are interactive. They reveal a
  subtle ring + label as you bring them toward the centre (or hover on desktop):

  | Object | Leads to |
  | --- | --- |
  | Listening Booth | Music |
  | CRT Television | Videos |
  | Record Bins | Artists |
  | Cash Register | Shop |
  | Flyer Wall | Archive |
  | Phone Booth | Contact |
  | Back Room Door | Label Lore |

- **Hidden rooms** — selecting a hotspot dims the shop and slides in a bespoke panel
  for that section, so opening content feels like stepping into a back room rather
  than navigating a site.

## Visual & motion language

- Graphic-novel illustration with bold ink and halftone detail.
- Warm tungsten lighting, baked into the art and reinforced with additive light
  shafts, a warm wash and a heavy vignette.
- Film grain + scanlines over the whole frame.
- Parallax depth across three layers (wall · light · foreground dust), subtle camera
  breathing, animated neon / EXIT / CRT flicker and drifting dust motes.
- Honours `prefers-reduced-motion`.

## Tech

- **Next.js** (App Router) + **React**
- **React Three Fiber** + **Three.js** for the WebGL room
- **@react-three/drei** for texture loading, `Html` hotspot hints and load progress
- **GSAP** for the gate / shutter choreography

## Performance

- The whole 3D scene is `dynamic(..., { ssr: false })` so three.js never hits the
  server bundle and the page paints before the room streams in.
- The panorama is served as a ~440 KB WebP (down from a 3.3 MB source) and the gate
  shows real load progress via the three.js loading manager.
- Device-pixel-ratio is capped (lower on touch), materials are unlit (`MeshBasic`)
  for cheap 60 FPS rendering, and dust density scales down under reduced motion.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start
```

Append `?debug=1` to the URL to tint the otherwise-invisible hotspots while tuning
their placement.

## Project layout

```
app/
  layout.tsx            fonts + metadata
  page.tsx              lazy entry (ssr disabled)
  globals.css           film / panel / gate styling
  data/sections.ts      the 7 hotspots + their content
  components/
    Experience.tsx      orchestrator: canvas + overlays + state
    Scene.tsx           responsive rig, layers, frame driver
    ParallaxLayer.tsx   depth translation
    Hotspot.tsx         invisible, raycastable, proximity-revealed
    LightBeams.tsx      tungsten shafts + additive glow quad
    Flicker.tsx         neon / EXIT / CRT / phone-booth flicker
    DustField.tsx       drifting motes
    LoadingGate.tsx     gate + shutters (GSAP)
    SectionPanel.tsx    the hidden-room overlay
    FilmFX.tsx          grain / vignette / scanlines
    usePanControls.ts   pointer / touch / wheel / keyboard panning
lib/
  pano.ts               plane geometry + uv→world mapping
  sprites.ts            canvas-generated dot / beam textures
public/textures/        store_pano.webp (+ lqip)
```
