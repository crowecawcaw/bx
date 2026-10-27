/** Far beyond either end: nothing has closed. */
export const OPEN = 1e6;

/**
 * The state of the sea, shared by the walls, the open water, the crowd and the walkable area.
 * When the waters return they close from the far shore back toward Egypt (westward): everything
 * east of `wallsGoneX` has lost its standing walls, and everything east of `filledX` is level sea.
 */
export const tide = {
  wallsGoneX: { value: OPEN },
  filledX: { value: OPEN },
  /** True from when the waters begin to return until you cross again. */
  returned: false,
  /** Bumped each time the waters return and each time you cross again. */
  version: 0,
};
