export type SectionItem = {
  label: string;
  meta?: string;
  detail?: string;
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
   * (public/textures/store_pano.webp, 2048×1024).
   * u: around full 360° yaw · v: top→bottom
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
    u: 0.78,
    v: 0.42,
    w: 6,
    h: 11,
    lookFov: 60,
    sfx: 'music',
    items: [
      { label: 'Tape 001 — Midnight Amen', meta: 'Continuous mix', detail: '62 min' },
      { label: 'Tape 002 — Hydro Steppers', meta: 'Continuous mix', detail: '58 min' },
      { label: 'Tape 003 — Rolling Out', meta: 'Continuous mix', detail: '71 min' },
      { label: 'Dubplate Special — Wax Only', meta: 'Vinyl rip', detail: '44 min' },
      { label: 'Late Licks — 4am Selection', meta: 'Continuous mix', detail: '90 min' },
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
    u: 0.7,
    v: 0.46,
    w: 4.5,
    h: 4.2,
    lookFov: 28,
    sfx: 'video',
    items: [
      { label: 'Warehouse Tape — Sector 7', meta: 'VHS transfer', detail: '1994' },
      { label: 'Pirate Ident Reel', meta: 'Off-air capture', detail: '1995' },
      { label: 'Studio Session — Time Stretch', meta: 'MiniDV', detail: '1996' },
      { label: 'Carnival Soundsystem', meta: 'Hi8 transfer', detail: '1997' },
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
    u: 0.72,
    v: 0.7,
    w: 14,
    h: 7.5,
    lookFov: 85,
    sfx: 'artists',
    items: [
      { label: 'Tenor Fly', meta: 'Roller / Steppa', detail: 'VCR-002' },
      { label: 'Sister Circuit', meta: 'Ragga Jungle', detail: 'VCR-004' },
      { label: 'Lowend Doctrine', meta: 'Tech / Minimal', detail: 'VCR-006' },
      { label: 'The Amen Collective', meta: 'Breakcore', detail: 'VCR-008' },
      { label: 'Nocturne', meta: 'Atmospheric D&B', detail: 'VCR-011' },
      { label: 'Dread at the Controls', meta: 'Dub / Jungle', detail: 'VCR-013' },
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
    u: 0.52,
    v: 0.5,
    w: 6.5,
    h: 5.5,
    lookFov: 70,
    sfx: 'shop',
    items: [
      { label: 'VCR-013 — Dread at the Controls', meta: '12" Vinyl', detail: '£12' },
      { label: 'VCR-011 — Nocturne LP', meta: 'Double 12"', detail: '£18' },
      { label: 'Logo Tee — Tungsten Orange', meta: 'Heavyweight cotton', detail: '£24' },
      { label: 'Enamel Pin Set', meta: '3 pieces', detail: '£9' },
      { label: 'Slipmat — Spinning Reel', meta: 'Pair', detail: '£15' },
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
    u: 0.58,
    v: 0.32,
    w: 10,
    h: 5.5,
    lookFov: 80,
    sfx: 'archive',
    items: [
      { label: 'HELTER SKELTER', meta: 'New Year’s Eve', detail: '1994' },
      { label: 'DREAMSCAPE', meta: 'Aerodrome', detail: '1995' },
      { label: 'JUNGLE FEVER', meta: 'Sanctuary', detail: '1995' },
      { label: 'RAVE ON', meta: 'The Edge', detail: '1996' },
      { label: 'TIME STRETCH', meta: 'Basement sessions', detail: '1997' },
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
    u: 0.62,
    v: 0.4,
    w: 4.2,
    h: 9,
    lookFov: 60,
    sfx: 'phone',
    items: [
      { label: 'demos@vcrrecords.fm', meta: 'Send a dubplate', detail: 'WAV / 320' },
      { label: 'bookings@vcrrecords.fm', meta: 'Soundsystem hire', detail: 'UK + EU' },
      { label: '@vcrrecords', meta: 'Find us', detail: 'Everywhere' },
      { label: 'Open 11–7', meta: 'In person', detail: 'Tue – Sun' },
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
    u: 0.55,
    v: 0.45,
    w: 4,
    h: 8.5,
    lookFov: 70,
    sfx: 'door',
    items: [
      { label: 'Est. 1993', meta: 'Origin', detail: 'A back room in the rain' },
      { label: 'VCR — Video Cassette Recordings', meta: 'The name', detail: 'Tape culture' },
      { label: 'First press: 300 copies', meta: 'VCR-001', detail: 'Sold from a holdall' },
      { label: 'Still independent', meta: 'No majors', detail: '30+ years' },
    ],
  },
];

export const SECTION_BY_ID = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s]),
) as Record<string, Section>;
