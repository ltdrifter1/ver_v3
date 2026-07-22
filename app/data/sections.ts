export type ListenLink = {
  label: string;
  href: string;
};

export type TrackItem = {
  title: string;
  duration?: string;
};

export type SectionItem = {
  label: string;
  meta?: string;
  detail?: string;
  /** Short CTA label (e.g. PLAY, BUY, EMAIL). */
  cta?: string;
  /** Outbound / mailto / hash link for the CTA. */
  href?: string;
  /** Accent letter / glyph shown in the glass thumb. */
  thumb?: string;
  /** Music nest — track list shown in level-2 detail. */
  tracks?: TrackItem[];
  /** Music nest — streaming pills. */
  listenOn?: ListenLink[];
};

export type Section = {
  /** stable id / route slug */
  id: string;
  /** the object in the scene that holds this hotspot */
  object: string;
  /** the destination the hotspot maps to */
  nav: string;
  /** short label shown on hover */
  hint: string;
  /** panel heading */
  title: string;
  /** panel sub heading */
  kicker: string;
  /** intro copy, written to feel like stepping into a hidden room */
  intro: string;
  /** accent colour used across the hotspot + panel */
  accent: string;
  /**
   * Normalised hotspot position on the equirectangular store
   * (public/textures/store_pano_v3.webp, 2048×1024).
   * u: around full 360° yaw after BackSide U-flip (1 − texture_u) · v: top→bottom
   */
  u: number;
  v: number;
  /** Optional lookto aim point (defaults to hotspot u/v). */
  lookU?: number;
  lookV?: number;
  /** hotspot footprint in world units on the sphere wall */
  w: number;
  h: number;
  /**
   * MFOV used by lookto when focusing this feature
   * (balmingtiger zooms in: music 60, video 20, tour 80, contact 60).
   */
  lookFov: number;
  /** Object SFX key played on focus (see lib/audio.ts). */
  sfx: string;
  /** list rendered inside the panel */
  items: SectionItem[];
};

const STREAM = [
  { label: 'Spotify', href: 'https://open.spotify.com' },
  { label: 'Apple', href: 'https://music.apple.com' },
  { label: 'Bandcamp', href: 'https://bandcamp.com' },
];

/**
 * Discoverable hotspots around the 360° store.
 * Click-and-drag to look, then click a feature to open its room.
 * Append ?debug=1 to tint hit areas while tuning (u,v).
 */
export const SECTIONS: Section[] = [
  {
    id: 'listening-booth',
    object: 'Listening Booth',
    nav: 'Music',
    hint: 'Slip on the headphones',
    title: 'The Listening Booth',
    kicker: 'Music',
    intro:
      'The foam ear-cups still smell of cigarettes and rain. Drop the needle and the room disappears — just you, a stool, and 174 beats per minute.',
    accent: '#ffb347',
    u: 0.2,
    v: 0.4,
    w: 6,
    h: 9,
    lookFov: 60,
    sfx: 'music',
    items: [
      {
        label: 'Tape 001 — Midnight Amen',
        meta: 'Continuous mix',
        detail: '62 min',
        cta: 'Open',
        thumb: '01',
        tracks: [
          { title: 'TRACK 1 — Warm Up', duration: '12:04' },
          { title: 'TRACK 2 — Amen Drop', duration: '14:22' },
          { title: 'TRACK 3 — Fog Roll', duration: '18:10' },
          { title: 'TRACK 4 — Outro Dust', duration: '17:24' },
        ],
        listenOn: STREAM,
      },
      {
        label: 'Tape 002 — Hydro Steppers',
        meta: 'Continuous mix',
        detail: '58 min',
        cta: 'Open',
        thumb: '02',
        tracks: [
          { title: 'TRACK 1 — Wet Concrete', duration: '11:40' },
          { title: 'TRACK 2 — Steppa Line', duration: '15:02' },
          { title: 'TRACK 3 — Pressure', duration: '16:18' },
          { title: 'TRACK 4 — Drain', duration: '15:00' },
        ],
        listenOn: STREAM,
      },
      {
        label: 'Tape 003 — Rolling Out',
        meta: 'Continuous mix',
        detail: '71 min',
        cta: 'Open',
        thumb: '03',
        tracks: [
          { title: 'TRACK 1 — Ignition', duration: '13:11' },
          { title: 'TRACK 2 — Motorway', duration: '19:44' },
          { title: 'TRACK 3 — Hard Shoulder', duration: '18:20' },
          { title: 'TRACK 4 — Home', duration: '19:45' },
        ],
        listenOn: STREAM,
      },
      {
        label: 'Dubplate Special — Wax Only',
        meta: 'Vinyl rip',
        detail: '44 min',
        cta: 'Open',
        thumb: 'DP',
        tracks: [
          { title: 'TRACK 1 — Plate A', duration: '22:00' },
          { title: 'TRACK 2 — Plate B', duration: '22:00' },
        ],
        listenOn: STREAM,
      },
      {
        label: 'Late Licks — 4am Selection',
        meta: 'Continuous mix',
        detail: '90 min',
        cta: 'Open',
        thumb: '4A',
        tracks: [
          { title: 'TRACK 1 — After Hours', duration: '22:30' },
          { title: 'TRACK 2 — Last Bus', duration: '24:10' },
          { title: 'TRACK 3 — Sunrise Filter', duration: '21:40' },
          { title: 'TRACK 4 — Sleepwalker', duration: '21:40' },
        ],
        listenOn: STREAM,
      },
    ],
  },
  {
    id: 'crt-tv',
    object: 'CRT Television',
    nav: 'Videos',
    hint: 'Adjust the antenna',
    title: 'The CRT',
    kicker: 'Videos',
    intro:
      'Static rolls until it doesn’t. Hand-dubbed VHS sets, pirate TV idents and grainy warehouse footage nobody was supposed to keep.',
    accent: '#7ad7ff',
    u: 0.3,
    v: 0.42,
    w: 4.5,
    h: 4.2,
    lookFov: 20,
    sfx: 'video',
    items: [
      { label: 'Warehouse Tape — Sector 7', meta: 'VHS transfer', detail: '1994', cta: 'Play', thumb: 'VH', href: '#play' },
      { label: 'Pirate Ident Reel', meta: 'Off-air capture', detail: '1995', cta: 'Play', thumb: 'PI', href: '#play' },
      { label: 'Studio Session — Time Stretch', meta: 'MiniDV', detail: '1996', cta: 'Play', thumb: 'SS', href: '#play' },
      { label: 'Carnival Soundsystem', meta: 'Hi8 transfer', detail: '1997', cta: 'Play', thumb: 'CS', href: '#play' },
    ],
  },
  {
    id: 'record-bins',
    object: 'Record Bins',
    nav: 'Artists',
    hint: 'Flick through the crates',
    title: 'The Bins',
    kicker: 'Artists',
    intro:
      'Cardboard sleeves softened by a thousand thumbs. Every divider is a name; every name kept this place breathing after dark.',
    accent: '#ff7a9c',
    u: 0.34,
    v: 0.78,
    w: 16,
    h: 7,
    lookFov: 85,
    sfx: 'artists',
    items: [
      { label: 'Tenor Fly', meta: 'Roller / Steppa', detail: 'VCR-002', cta: 'Bio', thumb: 'TF' },
      { label: 'Sister Circuit', meta: 'Ragga Jungle', detail: 'VCR-004', cta: 'Bio', thumb: 'SC' },
      { label: 'Lowend Doctrine', meta: 'Tech / Minimal', detail: 'VCR-006', cta: 'Bio', thumb: 'LD' },
      { label: 'The Amen Collective', meta: 'Breakcore', detail: 'VCR-008', cta: 'Bio', thumb: 'AC' },
      { label: 'Nocturne', meta: 'Atmospheric D&B', detail: 'VCR-011', cta: 'Bio', thumb: 'NO' },
      { label: 'Dread at the Controls', meta: 'Dub / Jungle', detail: 'VCR-013', cta: 'Bio', thumb: 'DC' },
    ],
  },
  {
    id: 'cash-register',
    object: 'Cash Register',
    nav: 'Shop',
    hint: 'Ring it up',
    title: 'The Counter',
    kicker: 'Shop',
    intro:
      'The drawer sticks unless you hit it just right. Fresh pressings, dusty repress, and a tin of badges by the till.',
    accent: '#9dff8a',
    u: 0.58,
    v: 0.52,
    w: 5.5,
    h: 5,
    lookFov: 70,
    sfx: 'shop',
    items: [
      { label: 'VCR-013 — Dread at the Controls', meta: '12" Vinyl', detail: '£12', cta: 'Buy', thumb: '13', href: '#shop' },
      { label: 'VCR-011 — Nocturne LP', meta: 'Double 12"', detail: '£18', cta: 'Buy', thumb: '11', href: '#shop' },
      { label: 'Logo Tee — Tungsten Orange', meta: 'Heavyweight cotton', detail: '£24', cta: 'Buy', thumb: 'TE', href: '#shop' },
      { label: 'Enamel Pin Set', meta: '3 pieces', detail: '£9', cta: 'Buy', thumb: 'PN', href: '#shop' },
      { label: 'Slipmat — Spinning Reel', meta: 'Pair', detail: '£15', cta: 'Buy', thumb: 'SM', href: '#shop' },
    ],
  },
  {
    id: 'flyer-wall',
    object: 'Flyer Wall',
    nav: 'Archive',
    hint: 'Read between the staples',
    title: 'The Wall',
    kicker: 'Archive',
    intro:
      'Layer over layer over layer. Pull one flyer and three come with it. Every party that ever mattered is buried in here somewhere.',
    accent: '#ffe66d',
    u: 0.44,
    v: 0.36,
    w: 12,
    h: 6,
    lookFov: 80,
    sfx: 'archive',
    items: [
      { label: 'HELTER SKELTER', meta: 'New Year’s Eve', detail: '1994', cta: 'View', thumb: 'HS' },
      { label: 'DREAMSCAPE', meta: 'Aerodrome', detail: '1995', cta: 'View', thumb: 'DR' },
      { label: 'JUNGLE FEVER', meta: 'Sanctuary', detail: '1995', cta: 'View', thumb: 'JF' },
      { label: 'RAVE ON', meta: 'The Edge', detail: '1996', cta: 'View', thumb: 'RO' },
      { label: 'TIME STRETCH', meta: 'Basement sessions', detail: '1997', cta: 'View', thumb: 'TS' },
    ],
  },
  {
    id: 'phone-booth',
    object: 'Phone Booth',
    nav: 'Contact',
    hint: 'Pick up the receiver',
    title: 'The Payphone',
    kicker: 'Contact',
    intro:
      'Still takes 10p. The number on the card behind the glass hasn’t changed since ’93 — ring it and somebody actually answers.',
    accent: '#ff5e5e',
    u: 0.37,
    v: 0.48,
    w: 3.8,
    h: 8,
    lookFov: 60,
    sfx: 'phone',
    items: [
      { label: 'demos@vcrrecords.fm', meta: 'Send a dubplate', detail: 'WAV / 320', cta: 'Email', thumb: 'DM', href: 'mailto:demos@vcrrecords.fm' },
      { label: 'bookings@vcrrecords.fm', meta: 'Soundsystem hire', detail: 'UK + EU', cta: 'Email', thumb: 'BK', href: 'mailto:bookings@vcrrecords.fm' },
      { label: '@vcrrecords', meta: 'Find us', detail: 'Everywhere', cta: 'Follow', thumb: '@', href: 'https://instagram.com' },
      { label: 'Open 11–7', meta: 'In person', detail: 'Tue – Sun', cta: 'Map', thumb: '11' },
    ],
  },
  {
    id: 'back-room-door',
    object: 'Back Room Door',
    nav: 'Label Lore',
    hint: 'Staff only — push anyway',
    title: 'Back Room',
    kicker: 'Label Lore',
    intro:
      'Past the EXIT sign and the beaded curtain. This is where the label started: one borrowed sampler, two decks, and a fridge full of nothing.',
    accent: '#c9a6ff',
    u: 0.4,
    v: 0.48,
    w: 3.8,
    h: 8,
    lookFov: 70,
    sfx: 'door',
    items: [
      { label: 'Est. 1993', meta: 'Origin', detail: 'A back room in the rain', cta: 'Read', thumb: '93' },
      { label: 'VCR — Video Cassette Recordings', meta: 'The name', detail: 'Tape culture', cta: 'Read', thumb: 'VC' },
      { label: 'First press: 300 copies', meta: 'VCR-001', detail: 'Sold from a holdall', cta: 'Read', thumb: '01' },
      { label: 'Still independent', meta: 'No majors', detail: '30+ years', cta: 'Read', thumb: 'SI' },
    ],
  },
];

export const SECTION_BY_ID = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s]),
) as Record<string, Section>;

/** Outbound shop — balmingtiger shop opens a blank tab (no panel). */
export const SHOP_URL = 'https://vcrrecords.bandcamp.com';

/** Primary conveyor nav order (balmingtiger: music / video / …). */
export const NAV_ORDER = [
  'listening-booth',
  'crt-tv',
  'record-bins',
  'cash-register',
  'flyer-wall',
  'phone-booth',
] as const;
