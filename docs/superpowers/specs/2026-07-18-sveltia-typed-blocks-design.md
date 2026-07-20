# Editing Wild About Pilates through typed blocks in Sveltia

## Purpose

This document specifies how the non-technical editor, Chrissie, will compose
and edit the Wild About Pilates site through the Sveltia CMS.  The Hugo port is
complete and faithful, but the CMS still exposes only the class-times data file.
Chrissie needs to edit the five pages and the fifteen blog posts, add and reorder
content freely, and upload images, without touching Markdown or templates.

The chosen model is typed blocks: each page is a list of typed content blocks
that Chrissie composes, mirroring the StreamField pattern the project set out to
reach.  The proof of concept already showed Sveltia's variable-type block lists
work; this specifies the real build.

## Decisions settled

| Question                       | Decision                                                        |
| ------------------------------ | --------------------------------------------------------------- |
| Page editing model             | Typed blocks (compose freely: add, reorder, remove)             |
| Blog editing model             | Typed blocks, a lighter palette (text, image, logo, video)      |
| Class-times block data source  | The shared `data/classes.yml`, not per-block                    |
| Venue / Map / Registration     | Drop-in blocks with no fields                                   |
| Prices and the venue map link  | Structured blocks (Prices, Venue intro), not raw Text           |
| Image uploads                  | Land in `assets/images/`, processed by the build-time pipeline  |
| Faithfulness                   | Re-render the current content as blocks; re-run the acceptance diff |

Each was confirmed during the design conversation this document records.

## The block model

Every page and every blog post becomes a list of typed blocks in its front
matter, under a `blocks` key, replacing the current Markdown-with-shortcodes
body.  A single rendering template walks that list and renders each block
through a partial named for its type (`layouts/partials/blocks/<type>.html`).
Eight of the block types map to an existing shortcode
(`hugo/layouts/shortcodes/`: image, logo, testimonial, video, class_times,
address_gawsworth, map_gawsworth, registration_form), and their partials lift
that shortcode's HTML almost verbatim, so the markup is unchanged.  Three block
types are new and have no shortcode precedent: Text renders Markdown, and Prices
and Venue intro are built to match the current page's output (Prices to the same
`<dl>`, Venue intro to an accepted near-match).

Because the eight shortcode-backed partials emit the same HTML the shortcodes
do, a Text block renders the same Markdown the body renders today, and the
Prices block reproduces the current `<dl>`, the current content can be expressed
as blocks without changing the output, bar the Venue intro's accepted
divergence.  That is the migration gate:
convert the five pages and fifteen posts to blocks, re-render, and re-run the
Task 10 acceptance diff.  It must still reduce to the known render-equivalent
differences.  Once parity is proven, Chrissie composes freely from there.

After the conversion, no content uses a Markdown shortcode call, so the
`layouts/shortcodes/` templates are replaced by the block partials and removed.

## The block palette

**Pages** carry the full palette:

| Block             | Fields                                                    | Renders                              |
| ----------------- | --------------------------------------------------------- | ------------------------------------ |
| Text              | body (Markdown)                                           | Prose: headings, paragraphs, lists, links |
| Prices            | a repeatable list of item (term) + description            | The `<dl>`/`<dt>`/`<dd>` price list  |
| Testimonial       | content, author, optional link + link text               | The testimonial figure               |
| Image             | file, alt, optional caption                               | The responsive `<figure>` + `srcset` |
| Logo              | file, url, alt, optional caption                          | The logo figure with a link          |
| Video             | file, optional caption                                    | The `<video>` with mp4/mov sources   |
| Class times       | none                                                      | The timetable from `data/classes.yml` |
| Venue intro       | description (Markdown) + optional link (url + text)       | The hall description and its map link |
| Venue             | none                                                      | The Gawsworth address + venue JSON-LD |
| Map               | none                                                      | The Gawsworth map embed              |
| Registration form | none                                                      | The "Download Registration Form" button |

**Blog posts** carry a lighter palette: Text, Image, Logo, Video.  A post is
usually one Text block with the odd Image or Video, which matches how the
fifteen existing posts are shaped.  Logo is included because one post (the
awesome-mums brunch club event) uses it; no page currently uses Logo, though it
stays available in the full palette.

Ordinary prose lives in Text blocks: the section headings, the paragraphs, and
the table-of-contents links.  The table of contents links to headings that
render in other Text blocks.  Heading ids are deterministic per heading
(Goldmark slugs the text), so the anchors resolve as long as each heading string
is unique, which the current pages are.  One caveat, verified by a direct test:
rendering each Text block through a separate `.RenderString` call does **not**
share Goldmark's duplicate-heading dedup state, so two Text blocks with the same
heading string would produce colliding ids rather than `heading` and
`heading-1`.  That does not bite today (no page repeats a heading), but it is a
latent risk once an editor adds a duplicate heading, and belongs in editor
guidance.  Separately, the classes page's `[Venue](#venue)` link is already
broken today, since the heading is `## Venues` (id `venues`); the block model
must reproduce that pre-existing state, not silently fix it, to stay faithful.

Two pieces of prose are pulled out into structured blocks instead.  A round-trip
test against the conversion library Sveltia uses (`@lexical/markdown` at Lexical
0.48, its exact pinned version) tells them apart.  The price definition lists
survive the bare library cleanly: idempotent, and here near-lossless (a dropped
trailing newline the only change).  The venue's raw Google Maps link does
**not**: the real URL contains an underscore (`...yFfo_q5...`), and the bare
library backslash-escapes it to `yFfo\_q5` on the first pass, corrupting the
link.  So the two blocks are pulled out for different reasons.  The **Prices**
block is for editing comfort, since in the visual editor the def-list shows as
`:`-prefixed lines Chrissie could break; it renders the identical
`<dl>`/`<dt>`/`<dd>` the page produces today, so it stays byte-faithful.  The
**Venue intro** block is for correctness as well as comfort: putting the URL in a
discrete link field keeps it out of the Markdown round-trip entirely, sidestepping
the escaping bug; its rendered output may sit the link slightly differently, an
accepted divergence.

That underscore escaping is a real `@lexical/markdown` bug, but a narrow one: it
fires on a literal underscore in raw-HTML passthrough (the URL), where the
exporter cannot tell the character is meant literally, and defensively
backslash-escapes it.  Ordinary Markdown does not hit it.  Tested against the
same bare library: the `_huge_` emphasis in a live post round-trips to `*huge*`,
the delimiter normalised but the emphasis intact and the rendered `<em>`
unchanged; headings, lists, and the price definition lists round-trip cleanly
too.  So the escaping is confined to the raw-HTML case, which the design already
pulls out into the Venue intro block's link field.  Text blocks, holding
ordinary Markdown prose, are safe against the bare library.  The running Sveltia
editor additionally post-processes to undo the same bug (`$convertToMarkdownString`
wrapped with regex fixes for backslash over-escaping, issues #430, #512, and a
`&#32;` entity-space artefact, issues #511, #534), so it is no worse.  What is
left to confirm is only that the full interactive editor matches this
static-conversion behaviour, checked by driving the real editor during
implementation.  None of this affects the Prices block (clean) or the Venue
intro block (URL field, no round-trip).

## Single source of truth

Four blocks render fixed or shared content rather than data typed into the
block: Class times, Venue, Map, and Registration form.

Class times is the important one.  It renders from the shared `data/classes.yml`,
the same file that generates the venue's `openingHoursSpecification` structured
data and the file Chrissie already edits in the existing "Class times" editor.
The block itself holds no timetable.  This keeps the page and the structured
data from drifting apart: if the block held its own copy of the timetable, the
visible schedule and the JSON-LD could show different classes.  It also means
Chrissie edits the times in one place.  There is only one timetable, so a
self-contained per-block copy would gain nothing and open that drift risk.

The Venue, Map, and Registration-form blocks are drop-in components with no
fields: Chrissie places and reorders them, but the venue address, the map, and
the registration PDF live in the templates.  Those rarely change; when one does,
it is a quick developer edit rather than a standing risk in the editor.

## Images

The Sveltia `media_folder` points at `hugo/assets/images`, so an uploaded photo
lands where Hugo's build-time pipeline can process it: `images.AutoOrient`
followed by generation of the `-200w`, `-300w`, `-400w`, and `-clean` variants
under the clean filenames the Image block's markup expects.  The Image block
stores only the base filename; the partial expands it into the responsive
`srcset`.  A photo Chrissie uploads gets the same treatment as the existing ones,
automatically.  The pipeline itself, including `AutoOrient` turning a sideways
phone photo upright, was verified during the Hugo migration (Task 13, on the
local Hugo image, v0.154.5).  The production build pins Hugo 0.164.0; what is new
here is wiring the CMS upload into the pipeline, which the block's filename
handling and a check against the pinned version (open items, below) still need to
prove.

The `public_folder` stays `/images`, the served path.  The existing committed
image variants under `static/images/` are untouched; the pipeline fires only for
files that have an original in `assets/images/`.

## The Sveltia configuration

- **Pages**: a `files` collection with five entries (`index`, `about`,
  `classes`, `clothing`, `questions`), each editing its own Markdown file.  Each
  file exposes the page's front-matter fields (title, description, and the
  optional Open Graph and map flags) plus the `blocks` variable-type list with
  the full palette.  The Text block's `body`, and the description fields of the
  Prices and Venue intro blocks, use Sveltia's `richtext` widget (the Lexical
  editor that outputs Markdown); the prices repeat as an `item` + `description`
  list, and the classes page instantiates the Prices block twice, once per price
  group, interleaved with other blocks.
- **Blog**: a `folder` collection with create and delete enabled, the light
  palette, the `title`/`date`/`description` front matter, and the
  `/blog/YYYY/MM/DD/slug/` permalink preserved (Hugo derives each `slug` from the
  filename, with an explicit `slug` set only where the title would produce a
  different one, as on five of the current posts).
- **Class times**: the existing `data` collection editing `data/classes.yml`,
  unchanged.
- The `output` block keeping `yaml.quote: double` and
  `omit_empty_optional_fields: true` is retained.
- The proof-of-concept "Block composition test" collection and its
  `content/poc` reference are removed.

The `blocks` list uses Sveltia's variable-type mechanism (`typeKey: type`,
`types: [...]`), the same pattern the proof of concept validated: each item
carries a `type` discriminator, and Sveltia shows a block picker when Chrissie
adds one.

## Faithfulness verification

The port's success criterion carries over.  After converting the current five
pages and fifteen posts to blocks and switching the templates to block
rendering, rebuild the Hugo site and re-diff it against the frozen Jekyll
baseline (`scratch/jekyll-baseline/`), as `hugo/ACCEPTANCE.md` does.  Every
difference must still fall within the eight accepted
render-equivalent categories recorded in `hugo/ACCEPTANCE.md`, with one added,
documented exception: the Venue intro block on the classes page may place its
map link differently from the current inline HTML, an accepted divergence.
Everything else, the Prices block included, must match, since Prices renders the
same `<dl>` the page produces today.  Any other new difference is a defect in
the block rendering and is fixed before the block model is accepted.  This proves
the block model reproduces today's site before Chrissie changes anything.

## Out of scope

- **Automated deploy.**  Chrissie's saves reach the live site only once the
  Cloudflare Workers build runs without the developer.  The `build.sh` and
  `wrangler.jsonc` are ready; wiring the repository to Workers is separate work,
  tracked on its own.  This does not block building the CMS.
- **The editing trial.**  Watching Chrissie make a real edit unaided is the one
  requirement no build can satisfy.  It follows this work, not precedes it.

## Verified during design

- A round-trip test through `@lexical/markdown` at Lexical 0.48 (Sveltia's exact
  pinned version) separated the safe content from the unsafe.  Ordinary Markdown
  round-trips cleanly: the price definition lists (idempotent, only a dropped
  trailing newline), and `_huge_` emphasis from a live post (re-emitted as
  `*huge*`, same rendered `<em>`).  The venue's real Google Maps URL does not:
  the literal underscore in its raw-HTML `<a>` is backslash-escaped and the link
  corrupted on the first pass.  That is why the Venue intro block takes the URL
  as a field rather than raw text, and why Prices is structured for editing
  comfort.  The test used the bare library, not Sveltia's full export pipeline,
  which post-processes to undo even the raw-HTML bug.
- Rendering two Text blocks through separate `.RenderString` calls does not share
  Goldmark's duplicate-heading dedup: two identical heading strings collide on
  the same id.  Confirmed by direct test; harmless for today's all-distinct
  headings, a latent risk otherwise.
- Both Jekyll and the current Hugo build render the classes prices as
  `<dl>`/`<dt>`/`<dd>`, so the Prices block can be byte-faithful.

## Open items

- The Text block renders Markdown through Hugo's `RenderString`.  The acceptance
  re-diff must confirm it produces the same HTML as the current full-body render.
  Heading ids are the known risk: they are correct for the current distinct-titled
  pages, but a duplicate heading across two Text blocks would collide (above), so
  editor guidance must warn against that.
- The bare-library round-trip is clean for ordinary Markdown prose; what remains
  is to confirm the full interactive Sveltia editor matches that static-conversion
  behaviour, by driving the real editor during implementation.
- The classes page's table of contents links across Text blocks.  The re-diff
  must confirm each anchor resolves exactly as it does today, which means
  reproducing the pre-existing broken `[Venue](#venue)` link (heading id
  `venues`) rather than fixing it.
- The per-page block conversion is mechanical but must preserve prose verbatim;
  the acceptance diff is the check.
- Sveltia's image widget stores the uploaded file's path; the Image and Logo
  blocks need the base filename (no extension, no variant suffix) that the
  responsive-`srcset` partial expands.  The wiring that derives one from the
  other must be settled during implementation, and the `ext` the partial uses
  (`jpg` for images, `png` for logos) preserved.  The upload-to-variants pipeline
  should also be run once against the pinned production Hugo 0.164.0, since the
  Task 13 check ran on the local v0.154.5 image.
