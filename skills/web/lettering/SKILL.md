---
name: lettering
description: >-
  Use when a web wordmark (a name or logo in a hero, header, or loading screen)
  needs designed hand-drawn lettering instead of a font, delivered as one SVG
  path that can be animated, or when free fonts look generic and procedural
  lettering (distance-field fused strokes, SVG goo filters on text) looks like
  tube letters. Not for body or UI typography, icon sets, or editing an
  existing vector logo.
---

# Hand-drawn lettering for a web wordmark

Give one word or short name designed letterforms: generate bitmap explorations,
let the user choose one, trace it into a single SVG path, and integrate it as an
accessible, animatable heading. A lettering artist remains the better option for
a final identity; this procedure produces designed letterforms in minutes, or a
precise brief for that artist.

- **Generate, then trace.** Image models design letterforms; generators that
  blend shapes (distance fields, goo filters) only fuse strokes. Tracing turns the
  chosen bitmap into crisp, scalable geometry.
- **Animate the path's points, never its pixels.** Pixel displacement
  (`feDisplacementMap`) drops anti-aliasing and makes the edges look pixelated.
- **The user chooses the artwork.** Spelling, mood, readability, and resemblance
  to existing work are their call; present every exploration, never a single pick.
- **Generated lettering is weak as protected property.** In the US, prompts and
  choosing one output among several are not authorship, and lettering or a
  typeface is not registrable for copyright even when drawn by hand; OpenAI
  assigns output rights only "if any" and warns that output may not be unique.
  For a brand, protection comes from trademark use and registration. Tell the
  user before the lettering becomes an identity, not after.

## 1. Generate explorations

Generation runs through the Codex CLI's built-in image tool (model `gpt-image-2`,
feature `image_generation`, ChatGPT sign-in on a paid plan), under the user's Codex
usage limits. Follow [imagegen](../../engineering/imagegen/SKILL.md) for setup and
output checks; if `codex` is missing, unauthenticated, or lacks the tool, stop and
say so. Generating images is a side effect: run it only when the user asked for
the lettering or agreed to the cost.

1. Collect the exact text, the site's light and dark colours (hex), and up to 2
   style references. Attach only references the user made or holds rights to
   (OpenAI's terms make the user warrant rights in inputs), never another brand's
   logo. Use them for mood and letter construction only; never commit third-party
   references to the repository, describe them in prose instead. Reference paths
   must not contain commas: `-i` splits its values on them.
2. Run one `codex exec` call per image, serially, each writing its own file
   (`lettering-v1.png` … `lettering-v6.png`). Keep `--` before the prompt, since
   `-i` takes several values, and close standard input: when standard input is
   not a terminal, `codex exec` reads it to the end and appends it to the prompt,
   so a pipe that never closes blocks the run before it starts.

   ```sh
   codex exec --sandbox workspace-write -i ref-1.png -i ref-2.png -- "<prompt>" < /dev/null > v1.log 2>&1
   ```

3. Start every prompt by forbidding skills and sub-processes: a user-installed
   image skill that itself runs `codex exec` can make Codex recurse instead of
   generating. Fill this template; drop the reference sentence when no image is
   attached:

   ```text
   Call your built-in image_gen tool directly, exactly once. Do not open or follow any skill
   (including any imagegen skill), and never run codex or any other program to generate the
   image; the only shell command you may run is the copy at the end. Generate one image. Image 1
   and Image 2 are style references only (mood and letter construction); do not copy their words,
   colours or backgrounds.

   Wide 3:1 landscape lettering artwork of <subject, e.g. a studio name wordmark for a
   landing-page hero>. <BRIEF> Exact text "<Text As Written>", spelled letter by letter:
   <N-O-R-A, space, V-A-L-E>. No other words, letters, marks, shadows, gradients, textures or
   grain. Flat solid <light hex> letters on a flat solid <dark hex> background, crisp clean edges
   suitable for tracing into a vector SVG. Centered, generous empty margin around the word.
   Original custom hand-lettering, not an existing font.

   Then copy the final image to <output path> in this directory and reply with that path.
   ```

   The tool takes no size argument, so 3:1 is a request: check each output's real
   dimensions. If the copy step fails, the image remains in
   `$CODEX_HOME/generated_images/<session-id>/`.

4. Explore distinct directions, one brief per call, unless the user named a style:
   1. 1970s groovy psychedelic capitals on one line: fat, tall, slightly condensed
      letters whose stems bulge and pinch in a wavy rhythm, flared rounded
      terminals, tiny counters, letters nearly touching.
   2. Liquid poured lettering: fat soft blobby letters melting and fusing into each
      other, uneven stroke widths, rounded drips merging at the baseline, mixed
      case, still readable.
   3. Tall condensed capitals warped by one smooth liquid wave running through the
      whole word.
   4. Groovy lettering on two stacked lines of equal width, curves interlocking
      between lines.
   5. Elegant liquid high-contrast serif, strokes swelling like poured syrup,
      teardrop terminals.
   6. Heavy rounded letters melting at the bottom into small puddles joining
      neighbours.

**Done:** every exploration exists on disk, opens as an image, and its dimensions
are known.

## 2. Let the user choose

1. Show all explorations side by side on the site's background.
2. Check each one letter by letter before presenting it: models misspell, for
   example by drawing a final U like a Y. Mark misspelled ones rather than hiding
   them.
3. Check readability at the smallest display size, about 270 px wide on a 390 px
   phone.
4. Compare each exploration with the references and flag one whose distinctive
   letter shapes are recognisable. For a brand, recommend a trademark search
   before adoption.
5. Ask the user to pick one, or to request another round with a revised brief.

**Done:** the user named the exploration to trace.
**Waiting:** the tracing script (step 3) can be written meanwhile.

## 3. Trace into one SVG path

Use the npm package `potrace` as a dev dependency. Before adding it, tell the
user what they accept: it is GPL-2.0 (fine as a build tool; the traced path
inherits the rights status of the bitmap, not potrace's licence), unmaintained
since its 2.1.8 release in 2020, and pulls an old Jimp with moderate `npm audit`
findings. Where that is unacceptable, `@visioncortex/vtracer` (MIT, binary mode)
is the alternative; its npm release is an alpha, so compare its output first.

Write `scripts/trace-lettering.mjs <input.png> <output.ts> [threshold]` (adapt the
location to the project's conventions) and add a package script that reruns it:

- Input: PNG, JPEG, or BMP, opaque. potrace composites transparent pixels onto
  white, so with light letters a transparent background is traced as ink; flatten
  it onto the dark colour first.
- The API is callback-based (`trace(file, options, cb)`); wrap it in a Promise.
- Options: `threshold: 175`, `blackOnWhite: false` (light letters on a dark
  background: pixels at or above the threshold become ink), `turdSize: 2`,
  `optTolerance: 0.4`, `alphaMax: 1`. A threshold at mid-grey (128) counts the
  anti-aliased slivers between touching letters as ink and welds letters
  together; a higher threshold separates them but thins strokes, so lower it if
  hairlines break. For dark letters on a light background, use
  `blackOnWhite: true`, which reverses the direction.
- potrace writes only absolute `M`, `L`, and `C` commands, without `Z`, so every
  number pair is a point (an `L` may carry two). Compute the bounding box from all
  pairs (control points included, a slight overestimate that suits a viewBox),
  shift every pair so the path starts at the origin, and round to one decimal.
  Keep the commands absolute: the animation in step 4 moves each pair, so do not
  run the path through SVGO's `convertPathData`, which makes them relative.
- Output a module `export const nameMark = { width, height, d }` headed by a
  comment marking it as generated and not to be edited by hand.

**Done:** the traced SVG, rendered at 2× next to the bitmap, keeps the gaps
between letters and the thin strokes, and the path data has a plausible size
(about 8 to 11 KB for a two-word name).

## 4. Integrate

1. Render `<svg viewBox="0 0 {width} {height}" width={width} height={height}><path
   fill-rule="evenodd" d={d} /></svg>` with `fill: currentColor`, `display: block`,
   and a size in `em` (for example `width: 7.5em; max-width: 100%; height: auto`)
   so it follows the heading's type scale. Put no hard-coded colour on the path or
   the `<svg>`, so Windows contrast themes (forced colours) still show the word.
2. Keep the exact drawn words as visually hidden text inside the heading, using a
   `clip-path` visually-hidden class (never `display: none`), and set
   `aria-hidden="true"` on the SVG. For a proper name, add `translate="no"` to the
   hidden text. Prefer this to `role="img"` with `aria-label`: screen readers would
   announce an image inside the heading, and machine translation handles
   `aria-label` unreliably.
3. Hover animation: start on `pointerenter` only when `pointerType` is `mouse` or
   `pen`; a media query such as `(hover: hover)` describes only the primary
   pointer and misleads on touch laptops. Split `d` once into commands and x/y
   pairs; on each `requestAnimationFrame`, rebuild `d` with every point displaced
   by a smooth function, for example a Gaussian swell around the pointer's x
   (spread about 20 % of the width) multiplied by a travelling sine (vertical lift
   about 3.5 % of the height, smaller horizontal sway). Ease the amount in on
   enter and out on leave, follow a smoothed pointer x, and drive both from
   elapsed time with a clamped frame delta, so the motion keeps its speed at
   120 Hz and after a hidden tab resumes. Stop the loop when the amount reaches 0
   and restore the original `d`. CSS `d` transitions and SMIL cannot follow the
   pointer, and Safari ignores the CSS `d` property.
4. Touch screens: play the swell once across the word when an Intersection
   Observer first sees it, then disconnect. Reduced motion: check
   `prefers-reduced-motion` with `matchMedia` and listen for its `change`; when it
   becomes `reduce`, cancel the frame and restore `d`.
5. Reuse the path where the full word stays readable, such as a loading-screen
   clip path, fitted with a translate and scale transform.
   - Open Graph image: render the path into a 1200×630 PNG with explicit colours
     (Satori or `next/og` accept an inline `<svg><path>`), and set
     `og:image:width`, `og:image:height`, and `og:image:alt`.
   - Favicon: the full word is illegible at 16 to 32 px, so draw or trace an
     initial or monogram. Ship it as an SVG with an explicit `fill` and a
     `prefers-color-scheme: dark` override (`currentColor` has no page colour
     there), plus a 32×32 `favicon.ico` and a 180×180 `apple-touch-icon.png`
     for browsers without SVG favicons, such as Safari before 26.

**Done:** the wordmark renders crisp at desktop and 390 px widths, a screen reader
announces the word once, the word stays visible in forced-colours mode, the hover
swell moves smoothly (profile one hover with CPU throttling) and settles back to
the original shape, and reduced motion shows the static path. Report the chosen
exploration, the generated module, and any check that could not be run.
