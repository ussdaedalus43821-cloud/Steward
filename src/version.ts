// Bumped by hand with every shipped change -- there's no CI or build step that generates this
// automatically, in keeping with the project staying dependency-free with no build tooling
// beyond tsc. The full history of what each shipment actually did is `git log`; this is just a
// stable, human-readable label for "which build is this", written into every save file so a
// save (or a bug report) can be traced back to the commit that produced it.
//
// GAME_BUILD_COMMIT is the short hash of the commit this version was prepared on top of (i.e.
// its parent at the time of bumping), not the commit this change itself becomes -- a commit's
// hash is computed FROM its content, so a commit can never correctly embed its own hash. Bump
// both together: increment the Build number, and set the commit to `git rev-parse --short HEAD`
// as it reads right before you commit the bump.
export const GAME_VERSION = "Build 29";
export const GAME_BUILD_COMMIT = "66ef8ac";
