# Editing guidance

Every page (`hugo/content/*.md`, `hugo/content/blog/*.md`) is built from a
`blocks` list.  There is no free-text page body: each block is a typed
entry, rendered by the matching partial in `hugo/layouts/partials/blocks/`,
and the CMS (Sveltia, `hugo/static/admin/config.yml`) offers only the block
types wired up for that page.

## Block types

| Block               | Purpose                                                                 |
| ------------------- | ------------------------------------------------------------------------ |
| Text                | A markdown-formatted paragraph or section, with heading support.       |
| Prices              | A definition list of items, each with a name and a markdown description. |
| Testimonial         | A pull-quote with an author, and an optional "read more" link.         |
| Image               | An uploaded photo, shown as a `<figure>` with optional caption.        |
| Logo                | A linked logo image, shown as a `<figure>` with optional caption.      |
| Video               | An embedded video, referencing a file under `/videos/` (both `.mp4` and `.mov` must exist). |
| Class times         | The full class timetable, read from the class-times data (see below). No fields to fill in. |
| Venue               | The Gawsworth venue address plus its structured (JSON-LD) opening-hours data. No fields to fill in. |
| Map                 | The embedded Gawsworth map and a "View on Google Maps" link. No fields to fill in. |
| Registration form   | A "Download Registration Form" link to the PDF. No fields to fill in.  |
| Venue introduction  | A markdown description of the venue plus an optional link.             |

The blog only offers Text, Image, Logo and Video blocks; the five main
pages offer the full set above.

Every block's `type` must have a matching partial in
`hugo/layouts/partials/blocks/`; an unknown type fails the build.

## Duplicate headings break anchors

Each Text block's markdown is rendered on its own, so Hugo does not dedupe
heading ids across blocks on the same page. If two Text blocks on the same
page use the same `##` heading text, both headings render with the same
`id`, and any link to that anchor (in-page or from elsewhere) will only
ever reach the first one. Keep `##` heading text distinct within a page.

## Class times are edited once, centrally

Class times are not a per-page field. They live in one place, the
"Class times" entry under "Site data" in the CMS (backed by
`hugo/data/classes.yml`), and the Class times block on every page reads
from that single source. Edit the timetable there; it updates everywhere
the Class times block appears.

## Photo uploads are auto-processed

Uploading a new photo through an Image (or Logo) block is enough on its
own: Hugo generates the 200w/300w/400w responsive variants and the
full-size "clean" copy from the uploaded original at build time. No manual
resizing or format conversion is needed.

## A blog post's excerpt comes from its first Text block

The `/blog/` list page shows each post's excerpt by rendering the first
paragraph of that post's first Text block, wherever it falls among the
post's blocks. A post with no Text block at all shows no excerpt on that
list, so lead every blog post with a Text block.
