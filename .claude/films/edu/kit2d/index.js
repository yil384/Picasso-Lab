// kit2d - the channel's 2D engine (paper theatre + risograph press + felt puppets) for the pv runtime. See README.md.
export * from './material.js';   // incl. imageSprite (painted parts)
export { makeStage } from './stage.js';
export { makePress, INKS, ORDER, PAPER, tone, ramp, radial, inkLine, brushLine } from './riso.js';
export { L, loadImg, openingP, bakeSet, theatre, bakeCard, flyCard, lyingProp } from './set.js';
export { bakeCat, feltCat, CAT_PIVOT } from './cat.js';
