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
`hugo/data/classes.yml`), and both the Class times block and the Venue
block's structured opening-hours data (JSON-LD) are generated from it. Edit
the timetable there; it updates everywhere those blocks appear, and the two
cannot fall out of step.

Each entry has a day, a start and end time (entered as 24-hour `HH:MM`, such
as `09:45`), and an ability level. An optional started date is published as
`validFrom` in the structured data; leave it blank when you do not know it,
and the class is still listed, just without that date.

Order matters for how the timetable reads. Days appear in the order they are
first used, and times within a day in the order given, so keep each day's
entries together and in ascending time order.

The timetable does not keep the Classes page description in step for you.
That `description` field names the days in prose and is written by hand, so
it can go stale. Check it whenever you add or drop a day.

## How images and their multiple sizes work

Each Image (and Logo) block renders a responsive `srcset` with `-200w`,
`-300w`, `-400w`, and `-clean` sizes. You never make those sizes by hand.
Hugo generates them at build time from a single full-size original.

The original lives in `hugo/assets/images/`. When you upload or Replace a
photo in the CMS, Sveltia copies the original there and records its path in
the block, for example `/images/chrissie-mobilising.jpg`. On the next build,
Hugo auto-orients that original and produces the four sized files from it. No
manual resizing or format conversion is needed.

### Things to know

- **Originals are committed to the repo.** The file in `hugo/assets/images/`
  is the source every build regenerates from, so it must be committed for the
  site to build (for example on Cloudflare). The repo therefore grows with
  each original, which differs from the old Jekyll site, where only the small
  variants were kept.
- **Site-chrome images are separate.** A few images are not block images: the
  site logo, the social-share (Open Graph) cards, the page background, and the
  navigation-icon sprite. These live in `hugo/static/images/` and are served
  as-is. They are not generated and are not edited through the CMS.

## A blog post's excerpt comes from its first Text block

The `/blog/` list page shows each post's excerpt by rendering the first
paragraph of that post's first Text block, wherever it falls among the
post's blocks. A post with no Text block at all shows no excerpt on that
list, so lead every blog post with a Text block.
