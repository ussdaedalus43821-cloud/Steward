// Bumped by hand with every shipped change -- there's no CI or build step that generates this
// automatically, in keeping with the project staying dependency-free with no build tooling
// beyond tsc. Written into every save file so a save (or a bug report) can be traced back to
// the shipment that produced it.
//
// GAME_VERSION is the player-facing label (standard SemVer: MAJOR.MINOR.PATCH) -- bump MAJOR for
// a breaking/save-incompatible change, MINOR for a new feature, PATCH for a fix, same convention
// most players already know from everything else they use.
//
// GAME_BUILD and GAME_BUILD_COMMIT are the finer-grained debugging pair underneath it: GAME_BUILD
// is a simple shipment counter (see `git log` for the full history of what each one did), and
// GAME_BUILD_COMMIT is the short hash of the commit this version was prepared on top of -- its
// PARENT at the time of bumping, not the commit this change itself becomes, since a commit's hash
// is computed FROM its content and can never correctly embed its own hash. Bump all three
// together: increment GAME_BUILD, set GAME_BUILD_COMMIT to `git rev-parse --short HEAD` as it
// reads right before committing the bump, and bump GAME_VERSION only when the change actually
// warrants a new player-facing version per the rule above.
//
// GAME_BUILD jumps from 30 to 38 here on purpose: the v1.0.0 release is being counted as the
// project's 38th shipped iteration (the full history, not just what's in this git log), so this
// is the one deliberate realignment -- it increments by exactly 1 per shipment from here on.
export const GAME_VERSION = "v1.0.0";
export const GAME_BUILD = "Build 38";
export const GAME_BUILD_COMMIT = "051dada";
