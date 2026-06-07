# Theme Decorative Motif Guidelines

Date: 2026-06-07

## Scope

Selectable visual themes should not be differentiated only by color, card, table and button treatment. Large surfaces may also carry restrained corner borders, frame details and small illustrative motifs.

Motifs are decorative support. They must not reduce readability, turn the ERP into a poster, or pull attention away from dense operational data.

## Preferred Surfaces

- Dashboard hero or welcome surface
- Module header area
- Large summary cards
- Empty state surfaces
- Wizard welcome or summary screen
- Section container corners
- Wide info or insight panels

## Restricted Surfaces

- Dense table row interiors
- Small form inputs
- Critical accounting detail lines
- Repeated narrow cards
- Tight modal content
- Full audit row bodies

## Theme Motif Language

| Theme | Motif Language | Rule |
| --- | --- | --- |
| Classic | Thin geometric corner ticks, subtle grid/frame | Keep nearly invisible; no illustration |
| Art Deco Premium | Stepped geometric Art Deco corner linework | Premium, architectural, thin; no thick gold frame |
| Anadolu Modern | Retro sun, half-sun rays, warm rings | Abstract and mid-century; no cartoon sun |
| Yeşil Atölye | Leaf, branch, botanical contour | Flat, crafted, calm; no realistic plant art |
| Pop Studio | Dots, blocks, half circles, compact burst marks | Energetic but controlled; no sticker/comic overload |

## Density And Contrast

- Use no more than 1-3 strong decorative focal points per screen.
- Most motifs should behave like soft watermark, thin border art or lightly tinted surface illustration.
- Motif colors must derive from the theme palette.
- Light mode may show motifs more clearly.
- Dark mode should reduce contrast and use thinner linework or very soft glow only.

## Theme Config

Motifs are controlled through theme config:

- `motif.style`
- `motif.cornerType`
- `motif.illustrationType`
- `motif.opacity`
- `motif.lineWeight`
- `motif.useOnHero`
- `motif.useOnFeaturedCards`
- `motif.useOnEmptyStates`
- `motif.useOnSectionHeaders`

## Design Lab Requirement

Design Lab must show:

- hero corner art preview
- featured card border preview
- empty state motif preview
- section header decorative preview
- a note explaining the theme's decorative language
- a light/dark behavior note

## Evaluation Checklist

- Do corner borders add character to the theme?
- Do motifs help distinguish the theme?
- Do motifs stay out of the data-reading path?
- Does the decorative language survive light and dark modes?
- Does the motif feel professional rather than over-decorated?
- Does the theme carry decorative identity, not only color identity?
- Do dashboard and main surfaces feel more intentionally designed?

## Success Criteria

- Every theme carries a distinct border/motif language.
- Anadolu Modern clearly suggests a retro-modern sun motif.
- Yeşil Atölye clearly suggests a botanical/plant motif.
- Art Deco Premium clearly suggests refined geometric premium border language.
- Pop Studio clearly suggests graphic corner accents.
- Classic remains minimal and safe.
- Motifs work in light and dark modes.
- Decorative elements do not harm ERP readability.
