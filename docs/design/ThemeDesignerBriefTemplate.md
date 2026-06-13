# Theme Designer Brief Template

<!-- source-of-truth-standard: contract overrides markdown -->

## Eden ERP Context

Eden ERP is an operational business application. Users scan dense tables, forms, documents, workflow steps, action queues and audit history throughout the day.

## What Can Change

- colors
- surfaces
- borders
- shadows
- radius
- typography weights and scale
- icon container style
- density tokens
- decorative motif metadata
- restrained corner border/frame language on large surfaces

## What Must Not Change

- layout
- navigation
- workflows
- business logic
- component hierarchy
- data fields
- permission or release behavior

## Security Limits

Do not add:

- CSS
- JavaScript
- HTML
- external URL
- external font
- image/SVG payload
- executable or binary content

## Required Delivery

- `eden-theme.json`
- optional `figma-tokens.json`
- short design notes
- reviewed screenshot list

## Screenshot Checklist

- login
- dashboard
- companies list
- company detail
- employee list
- accounting list
- document slot
- wizard
- action center
- audit timeline

## Acceptance Notes

Light and dark tokens must both be complete. Contrast must remain readable in tables, forms, buttons, inputs, badges, warnings and error states.

Decorative motifs may support hero, featured card, section header, empty state and wizard summary surfaces. They must not be placed inside dense table rows, narrow input interiors, accounting detail rows or audit row bodies.
