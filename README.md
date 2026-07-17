# VCR Records — an interactive record-store installation

A premium, immersive web experience for **VCR Records** (Video Cassette Recordings), a
fictional 1990s jungle / drum & bass label. It is deliberately **not** a traditional
website: there is no menu and no scrolling page. Instead you step through a loading
gate into a full **360°** hand-illustrated store and **discover** everything by
looking around.

> Reference vibe: `balmingtiger.com` — an explorable illustrated room rather than a
> page of sections.

## The experience

- **Loading gate** — a warm, flickering title card doubles as the asset-streaming UI.
  Clicking **Step Inside** parts the shutters and drops you into the room.
- **360° store** — the camera is pinned at the centre of the shop. Drag, trackpad,
  arrow keys or touch to look freely around a full equirectangular wrap of the
  listening booth, bins, counter, entrance and back room. Pitch is gently clamped
  so you never spin through the poles.
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

- Graphic-novel / comic-book illustration with bold ink and halftone detail.
- Warm tungsten lighting, baked into the art and reinforced with additive light
  shafts, a warm wash and a heavy vignette.
- Film grain + scanlines over the whole frame.
- Subtle **camera breathing**, animated neon / EXIT / CRT / phone-booth flicker and
  drifting dust motes inside the room.
- Honours `prefers-reduced-motion`.

## Tech

- **Next.js** (App Router) + **React**
- **React Three Fiber** + **Three.js** for the WebGL room (inward equirect sphere)
- **@react-three/drei** for texture loading, `Html` hotspot hints and load progress
- **GSAP** for the gate / shutter choreography

## Performance

- The whole 3D scene is `dynamic(..., { ssr: false })` so three.js never hits the
  server bundle and the page paints before the room streams in.
- The store is a compressed equirectangular WebP (+ tiny LQIP), streamed behind the
  gate with real load progress via the three.js loading manager.
- Device-pixel-ratio is capped (lower on touch), materials are unlit (`MeshBasic`)
  for cheap 60 FPS rendering, and dust density scales down under reduced motion.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start
```

Append `?debug=1` to the URL to tint the otherwise-invisible hotspots while tuning
their placement. Positions live in `app/data/sections.ts` as normalised `(u, v)`.

## Deploy on Vercel

This is a static Next.js App Router app — no env vars, database, or server
routes. Vercel auto-detects it.

1. Merge this branch into `main` (or point the Vercel project at this branch).
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Leave defaults: Framework **Next.js**, Install `npm install`, Build `next build`,
   Root `./`.
4. Deploy.

Node is pinned to `22.x` via `package.json` `engines`.

```bash
npx vercel        # preview
npx vercel --prod # production
```

## Project layout

```
app/
  layout.tsx            fonts + metadata
  page.tsx              lazy entry (ssr disabled)
  globals.css           film / panel / gate styling
  data/sections.ts      the 7 hotspots + their content
  components/
    Experience.tsx      orchestrator: canvas + overlays + state
    Scene.tsx           360° sphere rig + frame driver
    Hotspot.tsx         invisible, raycastable, proximity-revealed
    LightBeams.tsx      tungsten shafts + additive glow quads
    Flicker.tsx         neon / EXIT / CRT / phone-booth flicker
    DustField.tsx       drifting motes around the eye
    LoadingGate.tsx     gate + shutters (GSAP)
    SectionPanel.tsx    the hidden-room overlay
    FilmFX.tsx          grain / vignette / scanlines
    usePanControls.ts   pointer / touch / wheel / keyboard look
lib/
  pano.ts               sphere radius + uv→spherical mapping
  sprites.ts            canvas-generated dot / beam textures
public/textures/        store_pano.webp equirect (+ lqip)
```
