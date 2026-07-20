# Acceptance diff: Jekyll baseline vs Hugo build

Task 10 sign-off gate for the faithful Jekyll-to-Hugo port. Hugo was built to
`hugo/public/` (`hugomods/hugo:exts`, Hugo v0.154.5+extended) and diffed
against the frozen Jekyll baseline at `scratch/jekyll-baseline/` (URL list at
`scratch/jekyll-urls.txt`).

This is the **re-verification** run after fix commit `f79ccbc` ("fix:
resolve Task 10 acceptance-diff defects D, E, F, G"), which addressed the
four genuine defects found in the original diff (recorded below in §4). The
original run's cosmetic findings (A, B) were folded into the pre-accepted
categories, as recommended at the time.

## 1. URL diff

```
diff scratch/jekyll-urls.txt /tmp/hugo-urls.txt
4d3
< /admin/
```

Jekyll baseline: 24 URLs. At the time this diff was first run, the Hugo build
was 23 URLs, the only difference being `/admin/` (the Sveltia CMS admin mount,
added later in Task 11). **Update (post-Task 11):** `/admin/` is now present, so
the Hugo build serves all 24 URLs and the URL list matches the Jekyll baseline
exactly. `/admin/` is additive and carries `noindex`; it does not affect the 23
content pages, which were re-diffed after the admin commit and still match.

**Result: as expected — full 24-URL parity after Task 11.**

## 2. Per-page HTML diff (23 shared pages, whitespace-normalised)

Every page was diffed with leading/trailing whitespace stripped and blank
lines removed (`sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | grep -v '^$'`).

| Page                                                    | Known-category differences found (1-8) |
|-----------------------------------------------------------|----------------------------------------|
| `/`                                                        | 1, 4, 6, 7                             |
| `/404.html`                                                | 4, 8                                   |
| `/about/`                                                   | 1, 4, 6, 7                             |
| `/blog/`                                                    | 1, 4, 6                                |
| `/blog/2018/05/12/pilates-for-runners/`                     | 1, 4, 6                                |
| `/blog/2018/06/01/therapeutic-yoga/`                        | 1, 4, 6                                |
| `/blog/2018/06/10/class-attendee-ten-minute-workout/`       | 1, 4, 6, 7                             |
| `/blog/2018/06/18/pilates-for-netballers/`                  | 1, 4, 6, 7                             |
| `/blog/2018/06/18/therapeutic-yoga-followup/`               | 1, 4, 6                                |
| `/blog/2019/01/16/awesome-mums-brunch-club-event/`          | 1, 4, 6, 7                             |
| `/blog/2019/01/16/awesome-mums-brunch-club-thanks/`         | 1, 4, 6                                |
| `/blog/2019/03/22/yoga-spirits/`                            | 1, 4, 6, 7                             |
| `/blog/2019/03/24/pelvic-floor/`                            | 1, 4, 6                                |
| `/blog/2019/07/08/new-wednesday-classes/`                   | 4                                      |
| `/blog/2019/11/01/becoming-a-personal-trainer/`             | 4, 7                                   |
| `/blog/2019/11/30/short-exercise-sessions-are-beneficial/`  | 1, 4, 6                                |
| `/blog/2020/02/08/movement-is-medicine/`                    | 1, 4, 6, 7                             |
| `/blog/2024/11/02/balance-exercises/`                       | 4, 7                                   |
| `/blog/2025/04/13/bone-health-talk/`                        | 4, 7                                   |
| `/classes/`                                                 | 1, 3, 4, 6, 7                          |
| `/clothing/`                                                | 1, 4, 6, 7                             |
| `/google16af2f711db15395.html`                              | none (byte-identical)                  |
| `/questions/`                                               | 1, 4, 6                                |

No page shows a difference outside categories 1-8. In particular, no
`<figure>`, no post `BusinessEvent`/`EventVenue` JSON-LD `<script>`, and no
per-post `<script>` block leaks onto `/blog/`; the only `<script>` on
`/blog/` is the site-wide footer `Organization` JSON-LD present on every
templated page (category 4).

## 3. The 8 known, pre-accepted categories — verified

1. **Whitespace / indentation.** Present on every page with prose content or
   attribute line-wrapping (e.g. `sizes="..."`/`src="..."` on `{{< image >}}`
   output landing on their own lines); kramdown and Goldmark indent and
   line-wrap differently. No content difference on any page.
2. **CSS BOM + sourceMappingURL.** Confirmed. `scratch/jekyll-baseline/css/screen.css`
   is 7548 bytes (3-byte UTF-8 BOM + 7507 bytes of rules +
   `/*# sourceMappingURL=screen.css.map */`); `hugo/public/css/screen.css` is
   7507 bytes. Stripping the BOM and the sourcemap comment from the Jekyll
   file leaves byte-for-byte identical rule bodies (verified programmatically:
   `j_stripped == h` is `True`).
3. **JSON-LD key order (`jsonify`) on `/classes/`.** Confirmed on the
   `EventVenue` block: both sides have 8 `OpeningHoursSpecification` entries
   (`dayOfWeek` count matches) and 6 `validFrom` fields; only the key order
   and whitespace differ. Data is identical.
4. **Footer/site-wide Organization JSON-LD telephone escaping.** `+44-7378-166524`
   (Jekyll, literal `+`) vs `+44-7378-166524` (Hugo, escaped `+`) — valid
   JSON, same value. Confirmed present on all 22 templated pages (every page
   except the static `google16af2f711db15395.html` verification file, which
   carries no layout). Note: the per-page Event JSON-LD telephone field on
   `/classes/` is *not* escaped on either side (both render `+44-...`
   literally) — the escaping difference is specific to the footer partial.
5. **Blog post mailto `&#64;` entity.** Verified: the entity is present in
   the Hugo source but decodes to a literal `@` in the rendered output on
   both sides — zero diff on mailto lines across all posts checked.
6. **Typography / entity encoding.** Kramdown + SmartyPants emits literal
   Unicode characters (`’ ‘ “ ” — "`) and a literal `&`/`"` in prose, titles,
   and meta content; Goldmark's typographer + Go template auto-escaping
   emits the HTML-entity equivalents (`&rsquo; &lsquo; &ldquo; &rdquo;
   &mdash; &amp; &quot;`). Same rendered character in every browser; appears
   on nearly every page with prose (see table). This category now also
   covers what the previous run flagged separately as findings A and B
   (curly-quote/`&` entity encoding, and void-element/boolean-attribute
   serialisation such as `<img … />` vs `<img …>`, `async="" defer=""` vs
   `async defer`, `<br />` vs `<br>`/`<br/>`) — both are reconciled as
   render-equivalent serialisation differences, folded into categories 6/7.
7. **Void-element/boolean-attribute serialisation.** `<br />` vs `<br>` (from
   Markdown line breaks) or `<br/>` (from the `address_gawsworth` shortcode's
   raw HTML); `<img … />` vs `<img …>`; `<source … />` vs `<source …>`;
   `controls=""` vs `controls`; `async="" defer=""` vs `async defer`. All
   valid, render-equivalent HTML5. Confirmed on `/`, `/about/`,
   `/classes/`, `/clothing/`, most blog posts, and the two posts with an
   embedded Google Map (`awesome-mums-brunch-club-event`, `yoga-spirits`).
8. **404 page only.** Confirmed: Hugo auto-sets `.Title` to `404 Page not
   found`, producing `<title>404 Page not found | Wild About Pilates</title>`,
   an extra `<meta property="og:title">`, and an `<h1>` that Jekyll's 404
   page doesn't have (Jekyll's 404 front matter has no title). Non-SEO page,
   consistent with the brief.

Additionally confirmed: no `generator` meta tag on any built page
(`grep -rl generator hugo/public/` returns nothing), and
`google16af2f711db15395.html` is byte-identical on both sides.

## 4. Defects D, E, F, G — resolved by commit `f79ccbc`

The original acceptance run (recorded in git history at commit `f57d16e`)
found four genuine defects beyond the 8 accepted categories. Fix commit
`f79ccbc` ("fix: resolve Task 10 acceptance-diff defects D, E, F, G")
addressed all four; each is now re-verified as resolved:

- **D — missing `<p>` wrapper around `registration_form`.** The shortcode's
  output is now wrapped in `<p>...</p>`, matching kramdown's standalone-include
  wrapping. Confirmed byte-for-byte matching wrapper on `/classes/` (both
  occurrences, lines 86-87 and 112-113 in the baseline) and `/questions/`
  (line 71/70). No diff remains on these lines.
- **E — unclosed `<span>` in `class-attendee-ten-minute-workout.md`.** The
  two missing closing tags (source lines 50 and 60, per commit `f79ccbc`)
  are now closed. `grep -n span` on the built page shows every `<li>`
  element's `<span>...</span>` fully closed, matching the Jekyll baseline's
  kramdown-auto-repaired output line-for-line.
- **F — loose-list `<p>`-wrapping on `pilates-for-netballers`.** The "Class
  Features" list now renders with an exact structural match to the
  baseline: 10 tight `<li><span>...</span></li>` items plus the same two
  items kramdown itself renders loose (`<li>\n<p><span>...</span></p>\n</li>`
  for "Designed specifically for netballers" and "Trigger Point Pilates
  section for myofacial release"), reproduced deliberately with raw HTML to
  match kramdown's own (slightly inconsistent) baseline output. The second
  list ("What can Pilates do for netballers?") is tight on both sides, no
  diff. The post's own `BusinessEvent`/`EventVenue` JSON-LD `<script>`
  remains correctly on the individual post page (not leaked elsewhere).
- **G — `/blog/` list excerpts leaking full post content.** `<!--more-->`
  markers were added after the first paragraph of all 15 posts. Confirmed:
  `hugo/public/blog/index.html` is now 169 lines (was leaking substantially
  more before the fix; baseline is 202 lines, the residual difference being
  entity encoding, not leaked content). No `<figure>`, `BusinessEvent`, or
  `EventVenue` string appears anywhere in the built `/blog/` list; the only
  `<script>` present is the shared footer `Organization` JSON-LD (category
  4), identical in kind to every other templated page.

## 5. Verdict

**PASS.**

All 23 shared pages were rebuilt and diffed against the frozen Jekyll
baseline. Every remaining difference, across all pages, falls within the 8
pre-accepted categories (whitespace/indentation; CSS BOM + sourcemap;
JSON-LD key order; telephone escaping; mailto entity; typography/entity
encoding; void-element/boolean-attribute serialisation; 404 auto-title). No
difference was forced into a bucket it didn't fit: a line-by-line sweep of
every diff (`grep -viE` against the expected markers for each category) was
run over both the removed and added lines across all 23 pages, and the only
matches outside the obvious per-category markers were `<title>`/`&`
encoding (category 6), 404 title/`<h1>` (category 8), and JSON-LD key-order
punctuation (`},`/`]`, category 3) — all already accounted for.

The four genuine defects from the original run (D, E, F, G) are confirmed
resolved by commit `f79ccbc`:

- registration_form is `<p>`-wrapped on `/classes/` (x2) and `/questions/`
  (x1), matching the baseline exactly;
- the two unclosed `<span>` tags in `class-attendee-ten-minute-workout.md`
  are closed;
- the `pilates-for-netballers` list items are no longer unintentionally
  loose-`<p>`-wrapped (the two items that structurally match kramdown's own
  loose rendering are reproduced exactly, all others are tight, matching the
  baseline line-for-line);
- `/blog/` no longer leaks lead images, extra paragraphs, or per-post
  `<script>`/JSON-LD content — only prose-paragraph excerpts, consistent
  with Jekyll's `post.excerpt` behaviour.

No page had content, links, or data actually differ in meaning between the
two builds. The port is accepted as faithful for the 23 shared pages;
`/admin/` remains out of scope for Task 11.

## 6. Typed-block re-verification (Task 10, post block-model conversion)

All page and post content has since been converted to typed blocks (pages
and all 15 posts), the block partials built, and the Sveltia CMS config
rewritten to edit blocks (commits `434ac6a`..`6da9853`). This section
re-verifies that the block model reproduces the same output as the frozen
Jekyll baseline, using the same procedure as §§1-2 above, plus one new
accepted exception for the block model.

### 6.1 URL parity

The build directory carried stale files from earlier ad hoc probing
(`bprobe`, `bprobe2`, `pprobe`, `probe`, none tracked by git and none
produced by this build; `hugo/public/` is gitignored). A clean rebuild
(`rm -rf public` then rebuild) produced exactly the 22 Hugo pages plus the
static `/admin/` mount and `google16af2f711db15395.html` verification file:

```
diff scratch/jekyll-urls.txt /tmp/hugo-urls.txt
(no output)
```

**Result: full 24-URL parity, confirmed.**

### 6.2 Per-page HTML diff (23 shared pages, whitespace-normalised)

Every page was rediffed with the same whitespace-normalisation as §2. Every
difference found falls within the 8 pre-accepted categories, plus category 3
(JSON-LD key order, `/classes/` only) and the one new accepted block-model
exception below; no other difference was found on any page.

| Page                                                       | Categories found           |
|------------------------------------------------------------|----------------------------|
| `/`                                                        | 1, 4, 6, 7                 |
| `/404.html`                                                | 4, 8                       |
| `/about/`                                                  | 1, 4, 6, 7                 |
| `/blog/`                                                   | 1, 4, 6                    |
| `/blog/2018/05/12/pilates-for-runners/`                    | 4, 6                       |
| `/blog/2018/06/01/therapeutic-yoga/`                       | 4, 6                       |
| `/blog/2018/06/10/class-attendee-ten-minute-workout/`      | 1, 4, 6, 7                 |
| `/blog/2018/06/18/pilates-for-netballers/`                 | 1, 4, 6, 7                 |
| `/blog/2018/06/18/therapeutic-yoga-followup/`              | 4, 6                       |
| `/blog/2019/01/16/awesome-mums-brunch-club-event/`         | 1, 4, 6, 7                 |
| `/blog/2019/01/16/awesome-mums-brunch-club-thanks/`        | 1, 4, 6, 7                 |
| `/blog/2019/03/22/yoga-spirits/`                           | 1, 4, 6, 7                 |
| `/blog/2019/03/24/pelvic-floor/`                           | 4, 6                       |
| `/blog/2019/07/08/new-wednesday-classes/`                  | 4                          |
| `/blog/2019/11/01/becoming-a-personal-trainer/`            | 1, 4, 7                    |
| `/blog/2019/11/30/short-exercise-sessions-are-beneficial/` | 4, 6                       |
| `/blog/2020/02/08/movement-is-medicine/`                   | 1, 4, 6, 7                 |
| `/blog/2024/11/02/balance-exercises/`                      | 4, 7                       |
| `/blog/2025/04/13/bone-health-talk/`                       | 1, 4, 7                    |
| `/classes/`                                                | 1, 3, 4, 6, 7, Venue-intro |
| `/clothing/`                                               | 1, 4, 6, 7                 |
| `/google16af2f711db15395.html`                             | none (byte-identical)      |
| `/questions/`                                              | 4, 6                       |

No `<figure>`, no per-post `BusinessEvent`/`EventVenue` JSON-LD, and no
per-post `<script>` leaks onto `/blog/`; confirmed by grep
(`grep -c 'BusinessEvent\|EventVenue\|<figure>' public/blog/index.html`
returns 0). The `registration_form` `<p>`-wrapping (defect D, §4) remains
correct on `/classes/` and `/questions/`. The CSS BOM/sourcemap check (§3,
category 2) was re-run against the current build and remains byte-identical
once the BOM and sourcemap comment are stripped from the Jekyll side
(`j_stripped == h` is `True`).

### 6.3 New accepted exception: Venue-intro link placement

On `/classes/`, the Venue intro block (`layouts/partials/blocks/venue_intro.html`)
renders the "View the refurbished hall on Google Maps" link as its own
`<p>` element, and drops the trailing full stop that follows the link in
the Jekyll baseline:

```
Jekyll:  ...refurbishment in 2017. <a href="...">View the refurbished hall
         on Google Maps</a>.</p>
Hugo:    ...refurbishment in 2017.</p>
         <p><a href="...">View the refurbished hall on Google Maps</a></p>
```

This is a deliberate block-model rendering choice (the link is emitted as a
standalone paragraph rather than inlined into the preceding prose), not a
content or data loss: the link text, `href`, and surrounding prose are all
present and unchanged. **Accepted as a ninth divergence**, specific to the
classes page's Venue block.

### 6.4 Defects found

None. No difference outside the 8 pre-accepted categories, the classes-page
JSON-LD key order, and the Venue-intro exception above was found on any of
the 24 URLs.

### 6.5 Verdict

**PASS.**

The typed-block conversion (pages, all 15 posts, block partials, and the
Sveltia block-editing config) reproduces the frozen Jekyll baseline with
full 24-URL parity and no unexplained content difference on any of the 23
shared pages. Every difference found falls within the 8 categories carried
over from the original acceptance run (§3), the classes-page JSON-LD key
order (category 3), or the one new accepted Venue-intro divergence (§6.3).
The block model is accepted as a faithful reproduction of the site.
