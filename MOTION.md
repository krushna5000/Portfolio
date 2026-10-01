# Motion system

One vocabulary for every animation on the site. Change a token once and the whole site follows.

## Tokens (`assets/css/style.css`, `:root`)

| Token | Value | Use |
| --- | --- | --- |
| `--dur-fast` | 0.3s | hover / feedback |
| `--dur-base` | 0.6s | UI transitions |
| `--dur-slow` | 0.9s | scroll reveals, text |
| `--dur-cine` | 1.3s | hero / image wipes |
| `--ease` | `cubic-bezier(.22,1,.36,1)` | default (decelerate) |
| `--ease-in-out` | `cubic-bezier(.65,0,.35,1)` | panels, menus, intro |
| `--ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | playful settle (badges, buttons) |
| `--dist-sm / md / lg` | 1.2 / 3.2 / 4.8rem | movement distance |
| `--stagger` | 0.08 | sibling delay (read by JS as `Motion.stagger`) |

## Declarative attributes

| Attribute | Effect |
| --- | --- |
| `data-reveal="up｜left｜right｜scale｜blur｜clip｜head"` | reveal when scrolled into view (IntersectionObserver) |
| `data-stagger="0.08"` `data-stagger-variant="scale"` | children reveal one after another |
| `data-words` | split into masked words that rise in (headings use it automatically) |
| `data-split` | per-character hero name animation (`home.js`) |
| `data-magnetic="0.22"` | element drifts toward the pointer (strength) |
| `data-tilt="5"` | 3D tilt toward the pointer (max degrees) |
| `data-spotlight` | pointer-following glow + gradient border |
| `data-parallax-y="0.1"` | scroll parallax relative to the parent |
| `data-parallax-scope` | children with `--depth` follow the mouse |
| `data-cursor="View"` | custom cursor grows and shows that label |
| `data-count` | number counts up once visible |
| `data-detail="page.html"` (project card) | modal reuses that page's overview / features / screenshots |
| `data-problem` / `data-solution` (project card) | optional sections in the project modal |

## Files

- `core.js` — theme, menu, scroll loop (progress, scroll-spy, scene tint), reveal / stagger / word split, `window.Motion`
- `effects.js` — cursor, glow, magnetic, tilt, spotlight, parallax, scramble labels, scroll-speed marquees, ripple
- `ambient.js` — optional particle canvas (desktop only, self-throttling)
- `home.js` — hero name, filters, tech stack + relationship highlighting, timeline, contact form feedback
- `project-modal.js` — project detail dialog (card → dialog clip-path expansion)
- `terminal.js` — interactive terminal (reads page content, never fakes status)
- CSS: `style.css` (tokens, base, header/footer, ambient, cursor), `sections.css`, `motion.css`

## Rules the code follows

- Animate `transform`, `opacity`, `translate`, `clip-path` only (no layout properties in loops).
- One passive `pointermove` listener; per frame: all layout reads first, then all writes.
- Loops stop themselves when idle (cursor) or when hidden (particles, tab visibility).
- Touch devices: no cursor, magnets, tilt, particles. Reveals, stagger, parallax and the terminal chips still work.
- `prefers-reduced-motion`: reveals appear instantly, no parallax / loops / intro / particles; the modal opens without animation.

## Tech-stack relationships

`skills.json` → `related` lists technologies that are genuinely used together (e.g. Node.js → Express.js, MongoDB, JWT Auth).
Hovering or focusing a tile highlights its relations and dims the rest.

`mern: true` on an entry in `skills.json` adds the MERN badge to its tile, a "MERN Stack" chip style (`.tech-tag--mern`) exists for tags, and MERN entries lead the marquee rows.
