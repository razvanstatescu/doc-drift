# Logo

The mark is a D in three bands with the middle band slipped right. It is drawn, not typeset: always use the files in [logos/](logos/), never rebuild it from a font or redraw it.

## Files

| File | Use |
| --- | --- |
| [doc-drift-icon.svg](logos/doc-drift-icon.svg) | Primary app icon on the Night shift tile. Marketplace logo (export 144 x 144 px PNG), Rovo agent icon, Forge app icon, favicons at 32 px and up, social avatars. Default everywhere there is room. |
| [doc-drift-icon-light.svg](logos/doc-drift-icon-light.svg) | Day tile, for light-only contexts such as a docs header on white or print. |
| [doc-drift-mark.svg](logos/doc-drift-mark.svg) | Flat mark in ink (#0A2F38) on transparent. Light grounds, one-colour use, 16 to 24 px. |
| [doc-drift-mark-reversed.svg](logos/doc-drift-mark-reversed.svg) | Flat mark in paper (#F2F6F7) on transparent. Dark grounds. |

All four sit on a 512 x 512 canvas. The files in this folder come from `logos.zip` and carry C2PA content-credential metadata (about 12 KB each). The design system's copies are the same artwork without it (about 4 KB). Either is fine to ship. Strip the metadata if file size matters, such as for favicons.

## Construction

On the 512 px grid: the D spans 248 x 272 px with 30 px outer corners. Two 12 px cuts split it into three bands. The middle band is 60 px tall; that height is the slip unit, **S** (11.7% of the tile). The band slips 56 px right and keeps the D's own curve at its end. The trace stays at the original position at 10% white (9% ink by day). Every cut corner has an 8 px fillet. The tile is a smooth-corner square: 112 px radius at 60% corner smoothing, with a soft amber glow centred on the slip. The slip uses an amber gradient from `beacon-high` #FFD166 to `beacon-low` #FF9F1C in the tile icons, and flat #FFAA1F in the flat marks.

## Clear space and minimum size

- Keep at least 1 S on every side of the icon or mark, and 2 S next to other logos.
- Tile icon: 16 px minimum. Below 24 px prefer the flat mark.
- Lockup: 120 px wide minimum.

## Lockups

- **Horizontal:** icon, then "Doc Drift Sentinel" in Spline Sans 600 at 42% of the icon height, gap of 28% of the icon height, vertically centred.
- **Stacked:** icon above "Doc Drift" over "Sentinel", centred, gap of 1 S.
- The name never appears as a wordmark on its own in brand placements. It travels with the mark.

## Don't

- Straighten or re-align the slip. The offset is the meaning.
- Recolour the slip or the tile. The slip is always `beacon`.
- Put the mark on Atlassian blue, inside or next to an Atlassian product logo, or in a lockup with any Atlassian mark.
- Rotate, skew, stretch, squash or outline it, or add shadows and glows beyond the file's own.
- Place the tile on busy imagery. Use the flat mark on a calm ground instead.
- Animate any part of the mark other than the slip.

## Directions explored (from the mood board)

| Direction | Outcome | Why |
| --- | --- | --- |
| Folded page | Dropped | Read as a generic file icon at 32 px. The fold carried more weight than the drift. |
| Offset bars | Dropped | Clear idea, but small it read as a toggle or a menu. |
| Slipped D | **Chosen** | A monogram with the drift built in. Still reads at 16 px. |

GitBook's mark is stacked layers, so stacks were avoided.
