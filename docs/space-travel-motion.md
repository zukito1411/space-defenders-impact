# Space travel motion

Starfield travel integrates velocity rather than multiplying total elapsed time by the changing stage-clear speed. Exponential acceleration has an analytic distance integral, so equivalent speed changes produce the same motion at 30, 60, 120 and 144 Hz. Frame gaps are capped at 100ms to avoid a jump after resuming a backgrounded tab.

The local pilot's position drives a subtle smoothed scenery parallax: galaxies move least, then distant stars and planets, then near stars and asteroids. Gameplay coordinates stay in the foreground. Water and volcanic stages suppress this space-specific response. Distant galaxies drift much more slowly, most stars use pale neutral/cool colors with occasional warm stars, near-star trails are short and varied, and the existing four speed-line quads brighten and lengthen during a stage-clear rush.

The change adds no textures, particle emitters, post-processing, sprite instances or geometry rebuilds. Scenery uses its existing per-frame position updates and cached geometry. It adds scalar motion calculations and transforms on the existing layers. This is a cosmetic depth cue for the top-down shooter, not a change to ship physics.

Validation: `node scripts/test-raid-travel.mjs` checks rate agreement, speed-transition continuity, resume behavior and parallax bounds. `npm run build` checks production code and asset packaging. Device FPS and visual appearance in a running game remain unverified because browser launch is unavailable in this environment.
