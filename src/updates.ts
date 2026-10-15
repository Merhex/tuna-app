/**
 * True while she is in the middle of a craving. A downloaded app update is applied (with a reload)
 * when she leaves the app, but never while this is true: some cards send her to another app
 * ("text someone…"), and a reload then would lose the craving she's in.
 */
export const cravingInProgress = { current: false };
