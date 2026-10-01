// npr/looks.js - look presets for the painterly renderer.
// Lengths are in DESIGN px (1920x1080 reference) and are scaled by S at render time, so a 960x540 preview
// has the same composition as the 1080p master. Colours are sRGB "paint space" triples in 0..1.
//
// Every key is optional in a user look: createNPR merges it over DEFAULT_LOOK, and a look can
// `extends` another preset:  npr.setLook({ extends: 'engrave', hatchW: 2.2 }).

const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

export const DEFAULT_LOOK = {
  // ---- cel ramp (material pass). x = N.L + painted noise; thresholds t1 > t2 > t3 -----------------
  t1: 0.18, t2: -0.02, t3: -0.30,         // lit | half-tone | core shadow | reflected light
  termSoft: 0.05,                          // soft terminator half-width (in N.L units)
  termNoise: 0.22,                         // how far the painted terminator wanders
  noiseFreq: 1.6,                          // object-space frequency of the painted-shape noise (1/world unit)
  keyTint: hex(0xfff1dc),                  // warm key multiplies lit albedo
  shadeGlaze: hex(0x9690cf),               // cool glaze multiplied over albedo in shadow
  coreGlaze: hex(0x6e66ad),                // darkest band next to the terminator
  reflTint: hex(0xf3d7b0), reflect: 0.35,  // warm bounce inside the shadow (reflected light)
  skyFill: hex(0xe4e8ff), groundFill: hex(0xf2e2cc), // hemisphere tint in shadow (up / down facing)
  rim: 0.0, rimT: 0.55, rimTint: hex(0xfff3d6),
  hi: 0.55, hiAmt: 1.0, shine: 48,          // specular -> reserved paper white
  shadowSoft: 0.10, shadowNoise: 0.35, shadowRadius: 2.5, shadowBias: 0.0015,
  // ---- engraving / hatching (material pass) ------------------------------------------------------
  hatchPx: 7.5,       // line period (design px) kept constant on screen by level-of-detail
  hatchW: 1.55,       // max half-width of a line (design px) in full darkness
  hatchCut: 0.18,     // darkness below which there are no lines (highlights stay clean)
  hatchGamma: 1.15,
  crossT: 0.52, crossW: 1.15,              // second direction starts at this darkness
  hatchWobble: 0.10,  // wobble of the burin, as a fraction of the period
  hatchSwell: 0.45,   // engraving swell (line width varies along the line)
  // ---- comic halftone (material pass, screen-space dots) -----------------------------------------
  htAmt: 0.0, htPx: 11, htAngle: 0.26, htT: 0.35, htRange: 0.55, htCol: hex(0x3a3a78),
  // ---- watercolour (paint pass) ------------------------------------------------------------------
  bleed: 3.2, bleedFreq: 0.022,            // wet-edge displacement (design px) and its frequency
  edgeDark: 1.1, edgeR: 5, edgeK: 3.0,     // pigment pooling at wash edges
  gran: 0.55, flocc: 0.22, floccFreq: 0.006,
  dryEdge: 0.55,                           // dry-brush break-up of silhouettes on paper peaks
  sat: 1.0, value: 0.94,                   // saturation, pigment strength (<1 = thinner, lighter)
  // ---- ink (final pass) --------------------------------------------------------------------------
  ink: hex(0x2a2238), hatchInk: hex(0x3b2f4a),
  inkA: 0.95, hatchA: 0.85, selfInk: 0.0,  // selfInk: 1 = lines take the darkened local colour
  lineW: 1.35, lineWShadow: 2.1, lineNoise: 0.55, // Sobel radius (design px) lit / shadow side, pressure
  depthT: 0.035, normalT: 0.7, crease: 0.85,
  wobA: 1.4, wobF: 0.018,                  // hand wobble amplitude (design px) and frequency
  dryInk: 0.25,
  hullW: 2.0, hullShadowW: 1.6,            // inverted-hull width (design px), multiplier on the shadow side
  misreg: [0, 0],                          // colour plates offset from the ink plate (design px)
  // ---- depth / atmosphere / glow / film ----------------------------------------------------------
  dofFocus: 9.5, dofRange: 2.0, dofMax: 7, // painterly DoF: Kuwahara radius (design px) at full CoC
  dofLines: 0.8,                           // how quickly lines dissolve out of focus
  atmos: 0.25, atmosStart: 10, atmosEnd: 22, atmosCol: hex(0xe9e3f0),
  inkFar: 1.0, hatchFar: 0.0, htFar: 0.0,  // film-comic: ink radius mult. / hatch + halftone fade at atmosEnd
  glowStyle: 0, glowWash: 1.0,             // 0 watercolour glow, 1 comic burst
  rayW: 1.1, rayTint: 0.45,                // engraved radiance: ray half-width (design px), ink -> light colour
  burstW: 3.2, burstFill: hex(0xffe45c),   // comic burst star: outline width (design px), fill colour
  beamLines: 0.8, beamLineW: 0.8,          // engraved line bundle inside beams: strength, half-width (design px)
  // ---- engraved ruling on the background (final pass) -------------------------------------------
  rule: 0.0, rulePx: 6.5,                  // strength, line period (design px)
  ruleTop: 0.30, ruleBot: 0.05,            // tone at the top / bottom of the frame (0..1 = line width)
  ruleWash: 0.72, ruleNoise: 0.25,          // tone added by the underlay wash darkness; slow cloud variation
  ruleGap: 7, ruleInk: hex(0x2e2a4a),      // white keep-out gap around objects (design px); line colour
  bgDots: [0, 0, 0, 0],                    // comic Ben-Day dots on the background (rgb, amount)
  grain: 0.035, vignette: 0.22,
  glassTint: hex(0xcfe4ea), glassA: 0.06, glassEdge: 1.1, glassGlint: 0.8,
};

export const LOOKS = {
  // Hand-coloured engraving (engraved plate x watercolour lab notebook): burin lines that follow the form
  // carry the value, cross-hatch in the core shadow, ruled-line background whose weight follows the wash,
  // light watercolour glazes laid slightly off the line (hand colouring), radiance rays on lights.
  engrave: {
    hatchW: 1.75, hatchCut: 0.12, hatchA: 0.95, crossT: 0.5,
    value: 0.9, misreg: [1.6, -1.1],
    rule: 0.9,
  },

  // Comic: crisp two-step cel, bold wobbly ink, Ben-Day dots in the shade, off-register colour plates,
  // hard rim light, glows as inked bursts.
  comic: {
    t1: 0.08, t2: 0.08, t3: 0.08, termSoft: 0.012, termNoise: 0.08, reflect: 0.0,
    keyTint: hex(0xffffff), shadeGlaze: hex(0xb4b8e6), coreGlaze: hex(0xb4b8e6),
    rim: 1.0, rimT: 0.62, rimTint: hex(0xfffbe8),
    hi: 0.5, shine: 36,
    shadowSoft: 0.03, shadowNoise: 0.15,
    hatchW: 1.25, hatchCut: 0.6, crossT: 0.85, crossW: 1.1, hatchPx: 6.5, hatchWobble: 0.06, hatchSwell: 0.2,
    htAmt: 1.0, htPx: 12, htT: 0.40, htRange: 0.5, htCol: hex(0x38407e),
    bleed: 0.0, edgeDark: 0.12, gran: 0.08, flocc: 0.0, dryEdge: 0.0, sat: 1.25, value: 1.0,
    ink: hex(0x14122a), hatchInk: hex(0x14122a), lineW: 1.9, lineWShadow: 3.0, lineNoise: 0.35,
    wobA: 0.8, dryInk: 0.05, hullW: 2.8, hullShadowW: 1.5,
    misreg: [3.2, -2.4],
    dofMax: 0, atmos: 0.0,
    glowStyle: 1, glowWash: 1.0,
    bgDots: [0.93, 0.55, 0.42, 0.55],
    grain: 0.02, vignette: 0.10,
    glassTint: hex(0xbfe3ff), glassA: 0.18, glassEdge: 1.5, glassGlint: 1.0,
  },

  // Soft picture-book: very soft terminator, pastel glazes, coloured-pencil hatching in the local colour,
  // thin self-coloured lines, heavy wet bleeds and granulation, deeper focus falloff.
  book: {
    t1: 0.05, t2: 0.05, t3: -0.35, termSoft: 0.22, termNoise: 0.35, reflect: 0.5,
    keyTint: hex(0xfff0dc), shadeGlaze: hex(0xc9bfe0), coreGlaze: hex(0xb3a6d4), reflTint: hex(0xffd9c0),
    rim: 0.35, rimT: 0.6, rimTint: hex(0xfff0e0),
    hi: 0.6, hiAmt: 0.8,
    shadowSoft: 0.2, shadowNoise: 0.5,
    hatchPx: 5.5, hatchW: 0.9, hatchCut: 0.35, crossT: 0.8, crossW: 0.7, hatchWobble: 0.22, hatchSwell: 0.6,
    bleed: 6.0, bleedFreq: 0.016, edgeDark: 1.5, edgeR: 7, gran: 0.6, flocc: 0.2, dryEdge: 0.8,
    sat: 1.05, value: 0.9,
    ink: hex(0x5b3a36), hatchInk: hex(0x7a5a78), inkA: 0.8, hatchA: 0.45, selfInk: 0.75,
    lineW: 1.0, lineWShadow: 1.6, lineNoise: 0.7, wobA: 2.2, dryInk: 0.45, hullW: 1.5,
    dofFocus: 9.5, dofRange: 1.4, dofMax: 10, atmos: 0.35,
    grain: 0.03, vignette: 0.18,
    glassTint: hex(0xd6ecef), glassA: 0.16, glassEdge: 0.9,
  },
};

/** Resolve a look (name or object, with optional `extends`) into a complete parameter set. */
export function resolveLook(look) {
  if (typeof look === 'string') {
    if (!LOOKS[look]) throw new Error('unknown npr look ' + look);
    return { ...DEFAULT_LOOK, ...LOOKS[look], name: look };
  }
  const base = look.extends ? resolveLook(look.extends) : { ...DEFAULT_LOOK };
  return { ...base, ...look, name: look.name || base.name || 'custom' };
}

export { hex };
