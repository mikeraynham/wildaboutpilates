# Migrating Wild About Pilates from Jekyll to Hugo

## Purpose

This document specifies a faithful port of the Wild About Pilates website from
Jekyll to Hugo.  The site doubles as a testbed: if the port succeeds, the same
stack will build a new website for a different business of much the same shape,
a small brochure site with editable text and images and no shop, bookings, or
logins.  The value of the exercise is the rehearsal, so the port must stay
faithful enough that the old and new sites can be compared directly.

## Why move at all

The trigger was not the site itself but the toolchain around it.  Three
findings, established this session, make the case:

- **Package management is the stated pain.**  The `Gemfile` carries `logger`,
  `csv`, `ostruct`, and `base64`, gems that Ruby has moved or is moving out of
  its default set: `csv` and `base64` were dropped as default gems in Ruby 3.4,
  and `logger` and `ostruct`, still default gems in 3.4.10, are slated to
  follow.  The `Dockerfile` exists mainly to supply Ruby, Bundler, Jekyll,
  ImageMagick, `exiftran`, and `libjpeg-turbo-progs`, plus `build-essential` to
  compile native gems.  Hugo is a single binary, with Sass and image processing
  available without that container.

- **Chrissie needs to upload images, and Jekyll cannot let her.**
  `bin/dev/optimise` is a manual script run by hand on one laptop; the resized
  variants it produces are committed into `images/` alongside the originals and
  other assets; `image.html` hard-codes the `-200w`, `-300w`, `-400w`, and
  `-clean` variant names.  An image uploaded
  through the CMS to the Jekyll site would render as a broken `<img>` because
  nothing would generate those variants.  Hugo processes images at build time,
  so the same upload works.

- **Automated deploy is unavoidable, and it favours Hugo.**  `bin/deploy` runs
  only from the laptop, so Chrissie's edits never reach the site without it.
  Continuous integration must therefore build the site, and a Jekyll build in
  CI means rebuilding the whole Ruby and ImageMagick container, whilst a Hugo
  build means downloading two binaries.

The YAML time-corruption problem that first looked like a blocker is not a
reason to move.  It is already fixed on Jekyll (see "The Sveltia fix", below),
and the same fix carries to Hugo.

## Decisions settled

| Layer      | Decision                                                              |
| ---------- | --------------------------------------------------------------------- |
| Generator  | Hugo, standard edition (extended not required, see "Sass")            |
| Editor     | Sveltia CMS, with the `quote: double` output fix already applied      |
| Deploy     | Cloudflare Workers, git-connected, versions pinned in `build.sh`      |
| Images     | Hugo build-time processing, `images.AutoOrient` before resize         |
| Data       | `data/classes.yml` drives both the timetable and the JSON-LD          |

Hugo and Sveltia were chosen before this document; the deploy target and the
image approach were settled during the design conversation it records.

## Scope: a faithful port

The port reproduces the current site's generated HTML, URLs, and CSS.  Any
difference between the two builds should reduce to a short, explained list.
Improvements to the site's content or structure are separate work and are
listed under "Out of scope".

One part of the site cannot be a literal mirror.  The current site references
pre-built image variants as static files; the whole point of the move is to
let the CMS generate them.  The image pipeline therefore changes mechanism but
keeps its output: the same variant names and sizes, so the templates that
consume them stay unchanged.

## Directory layout

The mapping from Jekyll to Hugo is mechanical:

| Jekyll                       | Hugo                        |
| ---------------------------- | --------------------------- |
| `_layouts/default.html`      | `layouts/baseof.html`       |
| `_includes/*.html`           | `layouts/partials/*.html`   |
| `_data/classes.yml`          | `data/classes.yml`          |
| `_sass/`, `css/screen.scss`  | `assets/css/`               |
| `*.md` pages                 | `content/`                  |
| `_posts/`                    | `content/blog/`             |
| `images/`, `javascript/`     | `static/` and `assets/`     |

## Content and URLs

The pages use Jekyll's `permalink: pretty`, giving `/classes/`, `/about/`,
`/clothing/`, `/questions/`, and `/blog/`, with `index.md` at the root.  Hugo's
default pretty URLs reproduce these.

The blog posts need care.  Jekyll's `pretty` permalink expands to a path that
includes categories and the date, whilst Hugo's default for a section page is
`/blog/:slug/`.  These probably differ, and a changed post URL is an SEO
regression.  The implementation must pin Hugo's permalink configuration to
match the current post paths, and the acceptance test (below) must diff every
URL, old against new, to catch any that slip.

Fifteen posts live under `_posts/`, dated 2018 to 2025, carrying `title`,
`date`, and `categories`.  Hugo treats a `content/blog/` directory as a section
without further configuration.

## The template port

Six of the eight includes are trivial.  `{{ include.x }}` becomes `{{ .x }}`,
and the `if`/`endif` guards become `with`/`if`.  Most Liquid filters in use map
directly onto Hugo functions:

| Liquid            | Hugo         |
| ----------------- | ------------ |
| `slugify:'ascii'` | `urlize`     |
| `relative_url`    | `relURL`     |
| `where`           | `where`      |
| `uniq`            | `uniq`       |
| `default`         | `default`    |
| `jsonify`         | `jsonify`    |

Several filters need more than a blind swap.  `uri_escape` is not `urlquery`: Jekyll renders the contact email as
`mailto:info@wildaboutpilates.co.uk` with the `@` intact, whilst `urlquery`
would percent-encode it to `%40`.  For the real data `uri_escape` is a no-op, so
the port must reproduce the unescaped output, and the acceptance test will catch
a mismatch.  `slugify` maps to `urlize`, not to `anchorize`: for `Questions &
answers`, `anchorize` yields `questions--answers` with a double hyphen, whilst
Jekyll and `urlize` both yield `questions-answers`, and a wrong choice here would
change heading ids on the questions page and one post.  This holds for both
forms in use, the `:'ascii'` form on titles and headings and the plain form on
the phone number.  `map: "day"` extracts a field, which Hugo's `apply` does not
do cleanly, so the day-grouping in `class_times.html` is built explicitly rather
than by a one-filter swap.  `sort`, which orders the navigation, is handled by
the menu rebuild below.  The `append` filter is not listed because its only use
is in `address_gawsworth.html`, which is rebuilt whole (below) rather than
filter-ported.

Three templates carry the real work.

**`class_times.html`.**  It groups classes by day, using `where`, `map`, and
`uniq` over `site.data.classes`.  `where` and `uniq` port directly over
`.Site.Data.classes`; the `map`-based field extraction and day-grouping are
rebuilt explicitly, as noted above.  Low risk.

**`address_gawsworth.html`, the JSON-LD.**  The current include hand-builds
JSON with `append` and handles commas with `unless forloop.last`.  It will be
rebuilt as a Go map that Hugo `jsonify`s in one pass.  The data is the same, but
the serialisation differs: Hugo `jsonify` sorts a map's keys alphabetically and
reindents, so the byte output will not match Jekyll's hand-authored key order.
This is semantically faithful, since JSON-LD is order-independent, and it is why
the rebuild appears on the acceptance test's known-differences list.  The rebuild
also removes the comma-juggling and the JSON-injection risk that the Jekyll
version already had to fix once.  It is more than a literal port, chosen
deliberately over one, for safer construction.

**Navigation, in `baseof.html`.**  The current layout builds the nav from
`site.pages | sort: 'nav_order'`, filtered to pages that set `nav_title`, with
the current page marked by comparing `item.url` to `page.url`.  It will be
rebuilt on Hugo's menu system, driven by the same `nav_title` and `nav_order`
front matter.  The mechanism differs but the markup is identical, and the menu
system is the idiomatic pattern to reuse on the new project.  This too was
chosen over a literal port.

The `testimonial.html` include reads `include.more` as a truthiness test, which
in Jekyll rendered an empty link when Sveltia wrote `more: ''`.  The
`omit_empty_optional_fields` output setting (below) makes Sveltia omit the key
entirely, so Hugo's `with .Params.more` guard behaves correctly.

## Sass

The stylesheets compile with the Dart Sass transpiler, `outputStyle:
compressed`.  Hugo's built-in LibSass cannot be used: the entry point
`screen.scss` uses `@use` module syntax, which LibSass never implemented, and
`_trig.scss` computes `sin` and `cos` by a Taylor series at compile time.
Feeding these to LibSass produces no error and no CSS, only the `@use` lines
passed through as literal text, so the transpiler choice is not optional.

Hugo's standard edition is sufficient.  The Dart Sass transpiler drives a
separate `dart-sass` binary rather than the compiled-in LibSass, so the
extended edition is not needed.  This was verified: non-extended Hugo 0.147.7,
given a `dart-sass` binary, compiled the real stylesheets to 7,507 bytes
against Jekyll's 7,548.  The CSS bodies are byte-identical; the 41-byte
difference is a 3-byte byte-order mark and a 38-byte `/*# sourceMappingURL=... */`
comment, both of which `jekyll-sass-converter` adds and neither of which affects
rendering.

Jekyll already uses Dart Sass through `jekyll-sass-converter` 3.x, so the Sass
situation is unchanged by the move.  The `/` division in `_trig.scss` will
break under Dart Sass 2.0 whenever it lands, but that is true on Jekyll today
and is not a migration risk.

## Images

Source originals live under `assets/`.  A partial generates the `-200w`,
`-300w`, `-400w`, and `-clean` variants at build time and emits the same
`srcset` markup, so `image.html` is unchanged.

`images.AutoOrient` must be applied before the resize.  Hugo does not
auto-orient by default, and `images.Process "resize"` does not either.  A phone
photo carrying an EXIF orientation tag will otherwise publish sideways, with no
build error.  This was verified: an EXIF-orientation-6 image resized without
`AutoOrient` came out at the wrong aspect ratio, and applying the filter first
corrected it.  `AutoOrient` replaces the `exiftran -a` step of the current
manual script; the resize replaces the `convert` loop; and Hugo's `[imaging]
quality` setting replaces the quality flag.

## Deploy

The site deploys to Cloudflare Workers through git-connected Workers Builds.  A
push triggers a build and deploy; the laptop is not involved.  Two files in the
repository configure this:

- `wrangler.jsonc` names the Worker, sets the compatibility date, points
  `assets.directory` at `./public`, and sets `not_found_handling` to
  `404-page`.
- `build.sh` downloads Hugo and Dart Sass at pinned versions and runs the
  build.  Hugo's own guide pins Hugo 0.164.0 and Dart Sass 1.101.0, a
  known-compatible pair.  The Go and Node steps in Hugo's example are not
  needed here, since the site uses neither Hugo modules nor PostCSS.

Pinning both versions in the repository is a requirement, not a convenience.
Cloudflare's own build image pairs Hugo 0.147.7 with Dart Sass 1.62.1, and
these two are incompatible: Hugo talks to Dart Sass over a versioned protocol
buffer, and 1.62.1, from April 2023, is too old for the protocol that Hugo
0.147.7, from May 2025, expects.  A build on that default pairing fails with
`proto: cannot parse invalid wire-format data`.  This was verified directly.
The failure is loud, a non-zero build, not a silently unstyled site, but
pinning the versions in `build.sh` avoids it entirely by never using the
image's preinstalled binaries.

Workers suits this site better than Pages on cost as well as longevity.
Requests to static assets are free and unlimited, and a pure Hugo site serves
only static assets, triggering no Worker invocations, so the free plan's daily
request limit never applies.  Cloudflare is folding Pages into Workers and
Hugo's own documentation now covers only the Workers path, so starting on
Workers avoids a later migration.

The move deletes the current deploy apparatus: `bin/deploy`, the `rsync` over
SSH, the SSH key, the `.env` holding the Cloudflare credentials, and the manual
cache purge, which Workers performs per deploy.

## The Sveltia fix

Sveltia's `output.yaml.quote: double` setting is already applied in
`jekyll/admin/config.yml`, together with `omit_empty_optional_fields: true`.

The first setting solves the time-corruption problem.  Sveltia is JavaScript
and its YAML library reads `10:00` as a string, whilst Jekyll's Ruby parser,
Psych, implements YAML 1.1, where `10:00` is a base-60 number and reads back as
the integer 36000.  Quoting every string closes the gap, because a quoted
scalar means the same thing under both standards.  This was verified against
Ruby 3.4.10 and Psych 5.2.2: `"09:45"` reads as a string, whilst unquoted
`09:45` reads as 35100.

The root cause is specific to Ruby and Psych, not to a general split between
JavaScript and other languages.  Hugo reads unquoted `09:45` as a string, so
the problem cannot occur on Hugo.  The Go YAML library Hugo uses does not decode
sexagesimal integers at all; the base-60 reading is specific to Ruby's Psych.
The fix is kept regardless, for correctness whilst the site still builds under
Jekyll.

The second setting stops Sveltia writing `more: ''` for untouched optional
fields, which closes the empty-link trap in `testimonial.html` described above.

One cost comes with Sveltia on either generator: it parses YAML to an object
and re-stringifies it, so it cannot preserve comments.  This was confirmed
against Sveltia's own source, where `parse.js` parses through the `yaml`
library and `format.js` re-stringifies the resulting plain object.  The
explanatory header in `data/classes.yml` will be lost the first time the file is
saved through the CMS, including the line that warns times must stay quoted.

## Acceptance test

The port is a faithful one, so it has a hard success criterion.  Build both
sites, then diff Jekyll's `_site/` against Hugo's `public/`, comparing rendered
HTML and the full list of URLs.  Differences should reduce to a known list:
whitespace, the byte-order mark and `sourceMappingURL` comment that Jekyll adds
to the compiled CSS, and the deliberate JSON-LD rebuild.  The `uri_escape` email
and the `slugify` heading ids are particular things to check here, since a wrong
filter choice would register as a difference.  Anything else is a defect.  That diff is also the most useful artefact for the new project, since
it measures exactly how far Hugo's output can be held to Jekyll's.

## Out of scope

The following pre-existing issues are recorded but not changed by this port,
so that a migration defect cannot be mistaken for an intended fix:

- The `#venue` table-of-contents link in `classes.md` points at a heading whose
  id is `venues`, so the link is broken.
- The `openingHoursSpecification` on the `EventVenue` asserts the hall is open
  only during Pilates classes, which is false; the Bridge Club and WI also use
  it.  `Event` or `Course` would be the right schema shape.
- The hand-written `description` front matter can drift from the class data, as
  it already had.
- Wednesday's `validFrom: "2025-05-14"` looks wrong but is pre-existing and the
  owner's call; it is preserved untouched.

## Verified this session

The following claims in this document rest on tests run against the real
toolchain, not on reasoning alone:

- Sveltia `quote: double` output reads back as a string under Ruby 3.4.10 and
  Psych 5.2.2; the default `quote: none` reads back as an integer.
- Hugo reads unquoted `09:45` as a string.
- Hugo's LibSass fails to compile the `@use`-based stylesheets, silently,
  whilst the Dart Sass transpiler compiles them to a byte-identical CSS body,
  7,507 bytes against Jekyll's 7,548, the 41-byte gap being a byte-order mark
  and a `sourceMappingURL` comment that Jekyll adds.
- Non-extended Hugo drives the Dart Sass transpiler successfully.
- Hugo 0.147.7 with Dart Sass 1.62.1 fails to build with `proto: cannot parse
  invalid wire-format data`; with Dart Sass 1.101.0 it succeeds.
- Hugo resizing without `images.AutoOrient` mis-orients an EXIF-tagged photo;
  with the filter it corrects.
- Sveltia's YAML path drops comments on round-trip (`parse.js` then
  `format.js`, reproduced against the `yaml` library it uses).

## Open items

- The exact blog post URL format under Jekyll's `pretty` permalink must be
  captured before the port, so Hugo's permalink configuration can match it.
- Hugo's re-encode of images should be checked to confirm it strips metadata as
  `jpegtran -copy none` does today.
- The real cost of the template rewrite is estimated, not measured, until the
  first templates are ported.
