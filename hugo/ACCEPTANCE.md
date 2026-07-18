# Acceptance diff: Jekyll baseline vs Hugo build

Task 10 sign-off gate for the faithful Jekyll-to-Hugo port. Hugo was built to
`hugo/public/` (local `hugo v0.152.2+extended`) and diffed against the frozen
Jekyll baseline at `scratch/jekyll-baseline/` (URL list at
`scratch/jekyll-urls.txt`).

## 1. URL diff

```
diff scratch/jekyll-urls.txt /tmp/hugo-urls.txt
4d3
< /admin/
```

Jekyll baseline: 24 URLs. Hugo build: 23 URLs. The only difference is
`/admin/`, which is expected: the Sveltia CMS admin mount is out of scope for
this task and is added in Task 11. No other URL is missing, extra, or
mismatched.

**Result: as expected.**

## 2. Per-page HTML diff (23 shared pages, whitespace-normalised)

Every page was diffed with leading/trailing whitespace stripped and blank
lines removed (`sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | grep -v '^$'`).

| Page                                                    | Known-category differences found                      | New/unexplained differences found        |
|-----------------------------------------------------------|-----------------------------------------------------|-------------------------------------------|
| `/`                                                        | 1, 4                                                 | A, B                                      |
| `/404.html`                                                | 4, 7                                                 | none                                      |
| `/about/`                                                   | 1, 4                                                 | A, B                                      |
| `/blog/`                                                    | 1, 4, 6                                              | A, G                                      |
| `/blog/2018/05/12/pilates-for-runners/`                     | 1, 4                                                 | A                                         |
| `/blog/2018/06/01/therapeutic-yoga/`                        | 1, 4                                                 | A                                         |
| `/blog/2018/06/10/class-attendee-ten-minute-workout/`       | 1, 4                                                 | A, B, E                                   |
| `/blog/2018/06/18/pilates-for-netballers/`                  | 1, 4                                                 | A, B, F                                   |
| `/blog/2018/06/18/therapeutic-yoga-followup/`               | 1, 4                                                 | A                                         |
| `/blog/2019/01/16/awesome-mums-brunch-club-event/`          | 1, 4                                                 | A, B                                      |
| `/blog/2019/01/16/awesome-mums-brunch-club-thanks/`         | 1, 4                                                 | A, B                                      |
| `/blog/2019/03/22/yoga-spirits/`                            | 1, 4                                                 | A, B                                      |
| `/blog/2019/03/24/pelvic-floor/`                            | 1, 4                                                 | A                                         |
| `/blog/2019/07/08/new-wednesday-classes/`                   | 4                                                    | none                                      |
| `/blog/2019/11/01/becoming-a-personal-trainer/`             | 1, 4                                                 | B                                         |
| `/blog/2019/11/30/short-exercise-sessions-are-beneficial/`  | 1, 4                                                 | A                                         |
| `/blog/2020/02/08/movement-is-medicine/`                    | 1, 4                                                 | A, B                                      |
| `/blog/2024/11/02/balance-exercises/`                       | 1, 4                                                 | B                                         |
| `/blog/2025/04/13/bone-health-talk/`                        | 1, 4                                                 | B                                         |
| `/classes/`                                                 | 1, 3, 4                                              | A, B, D (x2)                              |
| `/clothing/`                                                | 1, 4                                                 | A, B                                      |
| `/google16af2f711db15395.html`                              | none (byte-identical)                                | none                                      |
| `/questions/`                                               | 1, 4                                                 | A, D (x1)                                 |

Legend for the "known-category" column matches the 8 categories accepted in
the brief; the "new/unexplained" column uses the letters defined in §4 below.

## 3. The 8 known, pre-accepted categories — verified

1. **Whitespace / indentation.** Present on every page with prose content;
   kramdown and Goldmark indent and line-wrap differently. No content
   difference on any page.
2. **CSS BOM + sourceMappingURL.** Confirmed. `scratch/jekyll-baseline/css/screen.css`
   is 7548 bytes (3-byte UTF-8 BOM + 7507 bytes of rules +
   `/*# sourceMappingURL=screen.css.map */`); `hugo/public/css/screen.css` is
   7507 bytes. Stripping the BOM and the sourcemap comment from the Jekyll
   file leaves byte-for-byte identical rule bodies (verified programmatically).
3. **JSON-LD key order (`jsonify`) on `/classes/`.** Confirmed on the
   `EventVenue` block: both sides have 8 `OpeningHoursSpecification` entries
   and 6 `validFrom` fields; only the key order and whitespace differ. Data
   is identical.
4. **Footer/site-wide Organization JSON-LD telephone escaping.** `+44-7378-166524`
   (Jekyll) vs `+44-7378-166524` (Hugo) — valid JSON, same value.
   Confirmed present on all 22 templated pages (every page except the static
   `google16af2f711db15395.html` verification file, which carries no layout).
5. **Blog post mailto `&#64;` entity.** Verified in
   `hugo/content/blog/pilates-for-netballers.md`: the entity is present in
   the Hugo source but decodes to a literal `@` in the rendered output on
   both sides — the rendered `pilates-for-netballers` page shows **zero**
   diff on the mailto lines. Non-issue in practice.
6. **Blog list excerpts differ from Jekyll's `excerpt`.** Confirmed, but see
   finding **G** below — the actual scale of the difference on `/blog/` is
   materially larger than "wording/trim" and is reported separately as an
   unexplained defect rather than folded silently into this category.
7. **404 page title/H1.** Confirmed: Hugo auto-sets `.Title` to
   `404 Page not found`, producing `<title>404 Page not found | Wild About
   Pilates</title>`, an extra `<meta property="og:title">`, and an `<h1>` that
   Jekyll's 404 page doesn't have (Jekyll's 404 front matter has no title).
   Non-SEO page, consistent with the brief.
8. **Hugo generator meta tag.** Confirmed absent from every built page
   (`grep -rl generator hugo/public/` returns nothing).

## 4. New differences found (not in the 8 known categories)

Per instructions, every difference outside the 8 categories above is
reported here rather than silently reconciled. They split into two groups:
cosmetic serialisation differences with no rendering impact, and differences
with a real (if sometimes narrow) effect on the served markup or layout.

### Cosmetic, no rendering impact

**A. Character/entity encoding of typographic characters and `&`.**
Kramdown + SmartyPants emits literal Unicode characters (`’ ‘ “ ” — '`) and a
literal `&` in `<title>`/meta content; Goldmark's typographer + Go template
auto-escaping emits the HTML-entity equivalents (`&rsquo; &lsquo; &ldquo;
&rdquo; &mdash; &#39; &quot; &amp;`). Same rendered character in every
browser; appears on nearly every page with prose (see table). Recommend
accepting as reconciled.

**B. Void-element / boolean-attribute serialisation.** Jekyll/kramdown emits
XHTML-style self-closing tags (`<img … />`, `<br />`) and empty-string
boolean attributes (`async="" defer=""`); Hugo/Goldmark emits HTML5 style
(`<img …>`, `<br>` from Markdown line breaks, `<br/>` from the
`address_gawsworth` shortcode's raw HTML, `async defer`). All are valid,
render-equivalent HTML5. Recommend accepting as reconciled.

(Attribute line-wrapping inside `{{< image >}}`/Google-Maps-script markup —
e.g. `sizes="` landing on its own line — was folded into known category 1;
it's a pure line-break placement difference with no content change.)

### Real effect on served markup or layout — defects

**D. Missing `<p>` wrapper around a standalone shortcode's output.** On
`/classes/` (twice) and `/questions/` (once), Jekyll wraps the standalone
`{% include registration_form.html %}` call in `<p><a class="button" …>
Download Registration Form</a></p>`; Hugo's `{{< registration_form >}}`
produces the bare `<a class="button" …>` with **no** `<p>` wrapper. The
shortcode/include source is identical on both sides
(`hugo/layouts/shortcodes/registration_form.html` ==
`jekyll/_includes/registration_form.html`); the wrapping is added or omitted
by the respective Markdown engine. This is not purely cosmetic:
`hugo/public/css/screen.css` has `p{margin-top:1rem}`, so the button loses
its 1rem top margin in the Hugo build — a visible spacing regression around
the "Download Registration Form" button on both pages. (The team has already
hit this Goldmark-paragraph-wrapping quirk once, in the other direction —
see commit `3f4e785`, "fix: separate adjacent shortcodes to avoid Goldmark
p-wrapping" — so this is a known family of issue, just not yet fixed for
`registration_form`.)

**F. Loose-list paragraph wrapping on `/blog/2018/06/18/pilates-for-netballers/`.**
The "Class Features" and "What can Pilates do for netballers?" lists in
`hugo/content/blog/pilates-for-netballers.md` have blank lines between some
`<span>…</span>` list items. Per the CommonMark spec a blank line between
items makes the list "loose", so Goldmark wraps each `<li>` body in `<p>`;
kramdown does not apply this rule and renders the list tight. Result: Hugo
emits `<li><p><span>…</span></p></li>` where Jekyll emits
`<li><span>…</span></li>` — 12 list items across the two lists. Given
`p{margin-top:1rem}` in `screen.css`, this adds unwanted vertical spacing
between bullets in the Hugo rendering that Jekyll's output does not have.
Fixable either by removing the blank lines in the source (matching the
author's evident intent — the list reads as one tight list of features) or
by a CSS rule scoping `li > p { margin: 0 }` list items.

**E. Unclosed `<span>` passed through literally.** In
`hugo/content/blog/class-attendee-ten-minute-workout.md` lines 50 and 60, the
source markdown itself is missing a closing `</span>` (a pre-existing typo,
present identically in `jekyll/_posts/2018-06-10-class-attendee-ten-minute-workout.md`
— not introduced by the port). Kramdown silently balances/repairs this and
emits a closing `</span>`; Goldmark passes the raw HTML through literally, so
the built page has an actually-unclosed `<span>` in two `<li>` elements.
Browsers auto-recover via the standard HTML5 tree-construction algorithm
(an open inline element is implicitly closed when its containing `<li>`
closes), so no visible rendering difference is expected in practice, but the
served markup differs and is non-conformant. Low priority — could be fixed
by adding the missing `</span>` to the two source lines (which would also
fix the equivalent Jekyll typo, though Jekyll isn't in scope here).

**G. `/blog/` list excerpts substantially over-include content — much more
than "wording/trim" (expands known category 6).** `hugo/layouts/blog/list.html`
line 6 uses `{{ .Summary }}` with no `<!--more-->` divider anywhere in
`hugo/content/blog/*.md` and no `summaryLength` set in `hugo.toml`. Hugo's
automatic summary algorithm cannot cleanly truncate mid-shortcode/mid-raw-HTML,
so for most posts it pulls in the full lead image (`<figure>`/`<img
srcset>`), for some it includes additional whole paragraphs or headings, and
for one post (`yoga-spirits`) it includes the **entire** rest of the post —
a `<dl>` timetable, an `<address>` block, an inline `<script>` Google Maps
initialiser, and a full `BusinessEvent` JSON-LD `<script type="application/
ld+json">` block — verbatim on the public `/blog/` listing page. Jekyll's
`{{ post.excerpt }}` (Liquid default: first paragraph, no `excerpt_separator`
configured) stays to one or two short prose paragraphs per post, with no
images and no scripts. This is materially more than the "excerpt wording
differs" scope of known category 6: it bloats the blog index page's size and
leaks structured-data/script markup that has no business being duplicated on
a list page. Root cause and likely fix: add `<!--more-->` after the first
paragraph of each post (or set `summaryLength`), matching Jekyll's
one-paragraph excerpt behaviour.

## 5. Verdict

**FAIL** — 6 unexplained difference patterns found beyond the 8 pre-accepted
categories (A, B, D, E, F, G above). Of these:

- **A** and **B** are pure serialisation-style differences with no rendering
  impact anywhere they occur; recommend accepting them as reconciled
  (effectively extending category 1).
- **D**, **E**, **F**, and **G** are genuine defects for the controller to
  dispatch fixes for, in priority order:
  1. **G** — `/blog/` list excerpts leaking full post content, images, and
     script/JSON-LD blocks (highest impact: public-facing, every post
     affected to some degree).
  2. **D** — missing `<p>` wrapper drops 1rem of top margin around the
     "Download Registration Form" button on `/classes/` (x2) and
     `/questions/` (x1).
  3. **F** — unwanted `<p>`-wrapping inside 12 list items on
     `/blog/2018/06/18/pilates-for-netballers/`, adding visible spacing that
     Jekyll doesn't have.
  4. **E** — two unclosed `<span>` tags in
     `class-attendee-ten-minute-workout.md`, inherited typo, browsers
     auto-recover so lowest priority.

No page had content, links, or data actually change meaning; every finding
above is a markup-structure or serialisation difference, not a content
regression. Do not sign off the port as complete until D, F, and G are
resolved (or explicitly re-triaged as accepted) and G in particular is
re-verified, since it is the only finding with a clearly visible, public
effect on the live site.
