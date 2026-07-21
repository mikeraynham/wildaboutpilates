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

## How images and their multiple sizes work

Each Image (and Logo) renders a responsive `srcset` with `-200w`, `-300w`,
`-400w` and `-clean` sizes. Those sized files come from one of two places,
and it helps to know which:

**1. Images carried over from the old Jekyll site.** The previous site's
helper script produced the sized variants by hand, and they were committed.
The migration copied all of them, as-is, into `hugo/static/images/`. Hugo
serves them directly. So an unchanged Image block just points at those
pre-made files — nothing regenerates them. This is why you see the sizes on
the site even though there is no obvious script producing them: they are the
committed Jekyll variants.

**2. Photos uploaded or replaced through the CMS.** Uploading (or using
"Replace") is enough on its own. Sveltia copies the full-size original into
`hugo/assets/images/` and records its path in the block. At **build time**,
Hugo auto-orients the original and generates the `-200w/-300w/-400w/-clean`
variants from it — the automatic equivalent of the old helper script. No
manual resizing or format conversion is needed.

### Things to know

- **Uploaded originals live in the repo.** The full-size file in
  `hugo/assets/images/` is the *source* the build regenerates from every
  time, so it must be committed for the site to build (e.g. on Cloudflare).
  The repo grows with each uploaded original — this differs from Jekyll,
  where only the small variants were kept.
- **A generated variant wins over an old static one of the same name.** If
  you Replace an image whose name already exists among the pre-made Jekyll
  variants, the newly generated versions are served and the old static ones
  are left unused (harmless, just redundant). A brand-new file name has no
  such overlap.
- **The two categories are a migration artefact.** Over time, as images are
  replaced or added through the CMS, everything moves to the generated model
  and the old `static/images/` variants can eventually be retired. Until
  then it is a deliberate mix: old images static, new images generated.

## A blog post's excerpt comes from its first Text block

The `/blog/` list page shows each post's excerpt by rendering the first
paragraph of that post's first Text block, wherever it falls among the
post's blocks. A post with no Text block at all shows no excerpt on that
list, so lead every blog post with a Text block.
