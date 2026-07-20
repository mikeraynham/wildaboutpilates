# Sveltia Typed-Blocks CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the non-technical editor compose the Wild About Pilates site as typed content blocks in Sveltia, while the current pages keep rendering byte-for-byte the same.

**Architecture:** Each page and post carries a `blocks` list in its front matter.  A dispatch template walks the list and renders each block through `layouts/partials/blocks/<type>.html`.  Eight block partials lift the HTML of the existing shortcodes; three are new (Text, Prices, Venue intro).  Conversion is incremental: the page templates render blocks when present and fall back to the Markdown body otherwise, so pages convert one at a time and the site keeps building.  A final acceptance diff against the frozen Jekyll baseline proves nothing visible changed.

**Tech Stack:** Hugo (Goldmark, `.RenderString`), Sveltia CMS (variable-type block lists), the existing build-time image pipeline.

## Global Constraints

- Block dispatch passes each partial `(dict "b" <block-map> "page" $)`.  Partials read block fields as `.b.<field>` and page context as `.page` (for `.page.RenderString` and `.page.Site.Data.classes`).  Verified working.
- The Text block renders Markdown with `{{ .page.RenderString (dict "display" "block") .b.body }}` (block display, not inline).
- Class times block reads the shared `hugo/data/classes.yml` only; it holds no per-block timetable (single source, also feeds the JSON-LD).
- Prices block must render the identical `<dl>`/`<dt>`/`<dd>` the page produces today (byte-faithful).  Venue intro block may place its link differently (the one accepted divergence).
- Faithfulness gate: rebuild Hugo to `hugo/public/`, re-diff against the frozen `scratch/jekyll-baseline/`, every difference within the eight categories in `hugo/ACCEPTANCE.md` plus the Venue-intro exception.
- Page block palette: Text, Prices, Testimonial, Image, Logo, Video, Class times, Venue intro, Venue, Map, Registration form.  Blog light palette: Text, Image, Logo, Video.
- Prose is copied verbatim into YAML block scalars (`body: |`); British English, entities like `&hellip;`/`&amp;` preserved.
- The `#venue` table-of-contents anchor is already broken today (heading id `venues`); reproduce it, do not fix it.
- Per-block `.RenderString` does not share Goldmark's heading-id dedup; duplicate heading strings across two Text blocks collide.  No current page repeats a heading; editor guidance must warn against it (Task 11).
- Work on branch `docs/hugo-migration-spec`, from `/Users/mikeraynham/git/wildaboutpilates`.  The Hugo dev server runs as container `wap-hugo` on `:1313`.
- Build for verification: `docker run --rm -v "$(cd .. && pwd):/repo" -w /repo/hugo hugomods/hugo:exts hugo --logLevel error -d /repo/hugo/public` (run from `hugo/`, repo root mounted so `scratch/` is visible).

---

## File structure

```
hugo/
  layouts/
    _default/
      single.html            Dispatch: render blocks if present, else .Content
      list.html              Same fallback for the blog list container (unchanged body)
    blog/
      list.html              Blog index (unchanged; lists posts)
    partials/blocks/
      text.html              NEW  RenderString the Markdown body
      prices.html            NEW  <dl> from item+description list
      venue_intro.html       NEW  description + optional link field
      image.html             from shortcodes/image.html
      logo.html              from shortcodes/logo.html
      testimonial.html       from shortcodes/testimonial.html
      video.html             from shortcodes/video.html
      class_times.html       from shortcodes/class_times.html
      venue.html             from shortcodes/address_gawsworth.html
      map.html               from shortcodes/map_gawsworth.html
      registration_form.html from shortcodes/registration_form.html
    shortcodes/              REMOVED in Task 11 once no content calls them
  content/                   pages + posts gain a `blocks:` front-matter list
  static/admin/config.yml    Sveltia collections rewritten (Task 9)
```

Each block partial has one responsibility: turn one block's data into its HTML.  The dispatch template has one: walk the list.

---

## Task 1: Block dispatch and the Text block

**Files:**
- Modify: `hugo/layouts/_default/single.html`
- Create: `hugo/layouts/partials/blocks/text.html`

**Interfaces:**
- Produces: the dispatch contract every later block partial relies on — each partial is called as `partial "blocks/<type>.html" (dict "b" <block> "page" $)`, reads block fields via `.b.<field>`, and page context via `.page`.

- [ ] **Step 1: Write the Text block partial**

Create `hugo/layouts/partials/blocks/text.html`:
```go-html-template
{{- .page.RenderString (dict "display" "block") .b.body -}}
```

- [ ] **Step 2: Make single.html dispatch blocks, falling back to the body**

Replace `hugo/layouts/_default/single.html` with:
```go-html-template
{{ define "main" }}
{{- if .Params.blocks -}}
{{- range .Params.blocks -}}
{{- partial (printf "blocks/%s.html" .type) (dict "b" . "page" $) -}}
{{- end -}}
{{- else -}}
{{- .Content -}}
{{- end -}}
{{ end }}
```
The fallback keeps every not-yet-converted page rendering exactly as now, so conversion is safe to do one page at a time.

- [ ] **Step 3: Verify with a probe page**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
mkdir -p content
printf -- '---\ntitle: probe\nblocks:\n  - type: text\n    body: |\n      ## Hi\n\n      A **paragraph**.\n---\n' > content/probe.md
docker run --rm -v "$(cd .. && pwd):/repo" -w /repo/hugo hugomods/hugo:exts hugo --logLevel error -d /repo/hugo/public 2>&1 | grep -i error
grep -o '<h2 id="hi">Hi</h2>' public/probe/index.html && grep -o '<p>A <strong>paragraph</strong>.</p>' public/probe/index.html && echo "TEXT BLOCK OK"
rm content/probe.md
```
Expected: `TEXT BLOCK OK`.

- [ ] **Step 4: Verify an existing (unconverted) page still renders via fallback**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
docker run --rm -v "$(cd .. && pwd):/repo" -w /repo/hugo hugomods/hugo:exts hugo --logLevel error -d /repo/hugo/public >/dev/null 2>&1
diff <(sed 's/^[[:space:]]*//' ../scratch/jekyll-baseline/about/index.html | grep -v '^$') \
     <(sed 's/^[[:space:]]*//' public/about/index.html | grep -v '^$') | head
```
Expected: only the pre-existing accepted differences (about page is not yet converted, so it must be unchanged from before this task).

- [ ] **Step 5: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/layouts/_default/single.html hugo/layouts/partials/blocks/text.html
git commit -m "feat: add block dispatch and Text block partial"
```

---

## Task 2: The eight shortcode-backed block partials

**Files:**
- Create: `hugo/layouts/partials/blocks/{image,logo,testimonial,video,class_times,venue,map,registration_form}.html`

**Interfaces:**
- Consumes: the dispatch contract (Task 1).
- Produces: eight block partials whose HTML matches the existing shortcodes exactly, reading `.b.<field>` instead of `.Get "<field>"` and `.page.Site.Data.classes` instead of `.Site.Data.classes`.

Each partial is the corresponding `hugo/layouts/shortcodes/*.html` with `.Get "x"` rewritten to `.b.x` and the site-data/RenderString references rewritten to go through `.page`.  Static-markup shortcodes (map, registration_form) are copied verbatim.

- [ ] **Step 1: image and logo**

Create `hugo/layouts/partials/blocks/image.html`:
```go-html-template
{{- $ext := .b.ext | default "jpg" -}}
{{- $file := .b.file -}}
{{- partial "gen-image-variants.html" (dict "file" $file "ext" $ext) -}}
<figure class="photo">
    <a href="/images/{{ $file }}-clean.{{ $ext }}">
    <img srcset="
            /images/{{ $file }}-200w.{{ $ext }} 200w,
            /images/{{ $file }}-300w.{{ $ext }} 300w,
            /images/{{ $file }}-400w.{{ $ext }} 400w"
         sizes="
            (min-width: 56.25em) 400px,
            (min-width: 43.75em) 300px,
            200px"
         src="/images/{{ $file }}-400w.{{ $ext }}"
         alt="{{ .b.alt }}">
    </a>
    {{- with .b.caption }}
    <figcaption>{{ . }}</figcaption>
    {{- end }}
</figure>
```

Create `hugo/layouts/partials/blocks/logo.html`:
```go-html-template
{{- $ext := .b.ext | default "png" -}}
{{- $file := .b.file -}}
<figure class="logo">
    <a href="{{ .b.url }}">
    <img srcset="
            /images/{{ $file }}-200w.{{ $ext }} 200w,
            /images/{{ $file }}-300w.{{ $ext }} 300w,
            /images/{{ $file }}-400w.{{ $ext }} 400w"
         sizes="
            (min-width: 56.25em) 400px,
            (min-width: 43.75em) 300px,
            200px"
         src="/images/{{ $file }}-400w.{{ $ext }}"
         alt="{{ .b.alt }}">
    </a>
    {{- with .b.caption }}
    <figcaption>{{ . }}</figcaption>
    {{- end }}
</figure>
```

- [ ] **Step 2: testimonial and video**

Create `hugo/layouts/partials/blocks/testimonial.html`:
```go-html-template
<figure class="testimonial">
    <blockquote>{{ .b.content | safeHTML }}</blockquote>
    {{- with .b.more }}
    <cite>
        <a href="{{ . }}">{{ $.b.read_more | default "read more&hellip;" | safeHTML }}</a>
    </cite>
    {{- end }}
    <figcaption>{{ .b.author }}</figcaption>
</figure>
```

Create `hugo/layouts/partials/blocks/video.html`:
```go-html-template
{{- $file := .b.file -}}
<figure class="video">
    <video controls>
        <source src="/videos/{{ $file }}.mp4" type="video/mp4">
        <source src="/videos/{{ $file }}.mov" type="video/quicktime">
        Your browser does not support the video tag.
    </video>
    {{- with .b.caption }}
    <figcaption>{{ . }}</figcaption>
    {{- end }}
</figure>
```

- [ ] **Step 3: class_times and venue (data-driven)**

Create `hugo/layouts/partials/blocks/class_times.html`:
```go-html-template
{{- $classes := .page.Site.Data.classes -}}
{{- $days := slice -}}
{{- range $classes -}}
  {{- if not (in $days .day) }}{{ $days = $days | append .day }}{{ end -}}
{{- end -}}
{{- range $days }}
<h4 id="{{ . | urlize }}">{{ . }}</h4>
{{- $day := . -}}
{{- range where $classes "day" $day }}
<p><em><time>{{ .start }}</time>-<time>{{ .end }}</time></em> {{ .level }}</p>
{{- end -}}
{{- end }}
```

Create `hugo/layouts/partials/blocks/venue.html` by copying `hugo/layouts/shortcodes/address_gawsworth.html` verbatim and changing its one page reference: the `range .Site.Data.classes` at the top becomes `range .page.Site.Data.classes`.  Everything else (the `$doc` dict, the `<address>`, the `jsonify ... safeJS`) is unchanged.

- [ ] **Step 4: map and registration_form (static)**

Create `hugo/layouts/partials/blocks/map.html`:
```go-html-template
<div id="gawsworth-map" class="map"></div>
<p><a class="button" href="https://www.google.com/maps/search/?api=1&amp;query_place_id=ChIJY5ayhhdPekgRknoq2C0ibtw&amp;query=Gawsworth+Village+Hall,+Church+Lane,+Macclesfield,+SK11+9RJ">View on Google Maps</a></p>
```

Create `hugo/layouts/partials/blocks/registration_form.html`:
```go-html-template
<p><a class="button" href="/documents/wild_about_pilates_registration_form_20230820.pdf">Download Registration Form</a></p>
```

- [ ] **Step 5: Verify each block renders identically to its shortcode**

Build a probe page that uses each block once and compare its output to the same shortcode's output.

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
mkdir -p content
# block version
printf -- '---\ntitle: bprobe\nblocks:\n  - type: testimonial\n    content: "A great class."\n    author: D Mullineux\n  - type: class_times\n  - type: registration_form\n---\n' > content/bprobe.md
# shortcode version
printf -- '---\ntitle: sprobe\n---\n{{< testimonial content="A great class." author="D Mullineux" >}}\n{{< class_times >}}\n{{< registration_form >}}\n' > content/sprobe.md
docker run --rm -v "$(cd .. && pwd):/repo" -w /repo/hugo hugomods/hugo:exts hugo --logLevel error -d /repo/hugo/public 2>&1 | grep -i error
diff <(grep -oE '<(figure|h4|p|dl|address|div)[^>]*>' public/bprobe/index.html) \
     <(grep -oE '<(figure|h4|p|dl|address|div)[^>]*>' public/sprobe/index.html) && echo "BLOCKS MATCH SHORTCODES"
rm content/bprobe.md content/sprobe.md
```
Expected: `BLOCKS MATCH SHORTCODES`.

- [ ] **Step 6: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/layouts/partials/blocks/
git commit -m "feat: add eight shortcode-backed block partials"
```

---

## Task 3: The Prices block partial

**Files:**
- Create: `hugo/layouts/partials/blocks/prices.html`

**Interfaces:**
- Consumes: a block `{type: prices, items: [{item, description}, ...]}`.
- Produces: the `<dl>`/`<dt>`/`<dd>` the current page renders for the prices, byte-faithful.

- [ ] **Step 1: Write the partial**

Each `description` is Markdown (rendered to a `<p>` inside the `<dd>`, matching today's output).

Create `hugo/layouts/partials/blocks/prices.html`:
```go-html-template
<dl>
{{- range .b.items }}
<dt>{{ .item }}</dt>
<dd>{{ $.page.RenderString (dict "display" "block") .description }}</dd>
{{- end }}
</dl>
```

- [ ] **Step 2: Verify the <dl> structure matches the current page**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
mkdir -p content
printf -- '---\ntitle: pprobe\nblocks:\n  - type: prices\n    items:\n      - item: "Taster session"\n        description: "Your first Pilates class is available at our block booking rate of just £12.50, with no obligation."\n---\n' > content/pprobe.md
docker run --rm -v "$(cd .. && pwd):/repo" -w /repo/hugo hugomods/hugo:exts hugo --logLevel error -d /repo/hugo/public 2>&1 | grep -i error
grep -oE '<dl>|<dt>Taster session</dt>|<dd><p>' public/pprobe/index.html
rm content/pprobe.md
```
Expected: `<dl>`, `<dt>Taster session</dt>`, and `<dd><p>` present — the same structure the classes page uses today (`<dl><dt>...</dt><dd><p>...</p></dd>`).

- [ ] **Step 3: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/layouts/partials/blocks/prices.html
git commit -m "feat: add Prices block partial"
```

---

## Task 4: The Venue intro block partial

**Files:**
- Create: `hugo/layouts/partials/blocks/venue_intro.html`

**Interfaces:**
- Consumes: a block `{type: venue_intro, description: <markdown>, link: {url, text}}` (link optional).
- Produces: the hall description followed by the map link as a discrete element.  This is the one accepted divergence: the current page has the link inline at the end of the paragraph; the block renders it as its own element.

- [ ] **Step 1: Write the partial**

Create `hugo/layouts/partials/blocks/venue_intro.html`:
```go-html-template
{{ .page.RenderString (dict "display" "block") .b.description }}
{{- with .b.link }}
<p><a href="{{ .url }}">{{ .text }}</a></p>
{{- end }}
```

- [ ] **Step 2: Verify it builds and emits the description and link**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
mkdir -p content
printf -- '---\ntitle: vprobe\nblocks:\n  - type: venue_intro\n    description: "Gawsworth Village Hall opened in 1953."\n    link:\n      url: "https://example.com/map"\n      text: "View the refurbished hall on Google Maps"\n---\n' > content/vprobe.md
docker run --rm -v "$(cd .. && pwd):/repo" -w /repo/hugo hugomods/hugo:exts hugo --logLevel error -d /repo/hugo/public 2>&1 | grep -i error
grep -o '<p>Gawsworth Village Hall opened in 1953.</p>' public/vprobe/index.html
grep -o 'href="https://example.com/map">View the refurbished hall on Google Maps</a>' public/vprobe/index.html && echo "VENUE INTRO OK"
rm content/vprobe.md
```
Expected: both lines present, `VENUE INTRO OK`.

- [ ] **Step 3: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/layouts/partials/blocks/venue_intro.html
git commit -m "feat: add Venue intro block partial"
```

---

## Task 5: Convert about.md to blocks (worked example)

**Files:**
- Modify: `hugo/content/about.md`

**Interfaces:**
- Consumes: all block partials from Tasks 1-4.
- Produces: the conversion pattern every other content task follows.

**The conversion rule** (applies to every page and post): split the Markdown body at each shortcode call.  Each run of contiguous Markdown between shortcodes becomes one `text` block whose `body` is that Markdown verbatim, in a YAML `|` block scalar.  Each shortcode call becomes a block of its type, its parameters becoming block fields.  Keep the existing front-matter fields (title, description, and any `og_image*`/`include_map`).

- [ ] **Step 1: Rewrite about.md as blocks**

Replace `hugo/content/about.md` with (body prose copied verbatim from the current file):
```markdown
---
title: About Me
description: My name is Chrissie Raynham-Wild and I'm a state registered Chartered
  Physiotherapist specialising in musculoskeletal physiotherapy, and a certified APPI  Matwork
  Pilates instructor.
blocks:
  - type: text
    body: |
      Through a combination of physiotherapy, Pilates, and a focus on well-being, I take a holistic approach, emphasising on long-term health, and helping individuals live active, fulfilling lives well into the future.

      I am a passionate and experienced Pilates instructor, currently leading a number of classes and providing 1-2-1 sessions. Teaching Pilates is a personal joy and a hobby for me. My love for movement and fitness enhances my ability to help clients improve their strength, flexibility and overall wellbeing.
  - type: testimonial
    content: "The sessions so far have been great, Chrissie is really professional and connects really well with the group. She is warm and welcoming and seems like she really knows her stuff."
    author: D Mullineux
  - type: text
    body: |
      Beyond Pilates, I am an Advanced Clinical Specialist Physiotherapist with a strong background in musculoskeletal care and rehabilitation. With 15 years of NHS experience, I have developed expertise in complex patient assessment, treatment planning, and therapeutic techniques. I provide high-level clinical care, guiding both patients and junior staff in achieving optimal health outcomes.
  - type: image
    file: chrissie-raynham-wild
    alt: Photo of Chrissie Wild
    caption: Chrissie Raynham-Wild
  - type: text
    body: |
      In addition to my current role, I have also worked as a First Contact Practitioner (FCP), serving as the first point of contact for patients presenting with musculoskeletal issues. In this role, I independently assessed, diagnosed, and managed a wide range of conditions, streamlining patient pathways and reducing pressure on primary care services.

      I am currently studying an MSc in Advanced Physiotherapy at Manchester Metropolitan University and my specialist interests include post-natal exercise, persistent musculoskeletal pain management, sports rehabilitation, strength training, and breast cancer post-operative rehabilitation.
  - type: testimonial
    content: "Chrissie is an amazing teacher. She is knowledgeable and very helpful at adapting postures for your needs &hellip; I have loved her classes and would definitely recommend her classes to anyone."
    author: K Anderton
  - type: text
    body: |
      ## Qualifications

      ### Pilates Qualifications

      * APPI Pilates Matwork Level 1
      * APPI Pilates Matwork Level 2
      * APPI Pilates Matwork Level 3
      * APPI Certified Matwork Pilates Instructor exam
      * APPI Pilates For Runners
      * Ante & Post Natal Pilates
      * Pilates for Osteoporosis

      ### Yoga Qualifications

      * Unite Health Level 1 Therapeutic Yoga
      * Clinical Yoga Teacher Training

      ### Physiotherapy Qualification

      * BSc (Hons) Physiotherapy
---
```
(Continue the final Text block's `body` with the remaining qualifications sections verbatim from the current `about.md` — every heading and list item through the "Exercise Courses" section and the `[1]: https://www.bbta.org.uk/` link reference.  The whole tail of the page is one Text block.)

- [ ] **Step 2: Build and diff against the baseline**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
docker run --rm -v "$(cd .. && pwd):/repo" -w /repo/hugo hugomods/hugo:exts hugo --logLevel error -d /repo/hugo/public 2>&1 | grep -i error
diff <(sed 's/^[[:space:]]*//' ../scratch/jekyll-baseline/about/index.html | grep -v '^$') \
     <(sed 's/^[[:space:]]*//' public/about/index.html | grep -v '^$')
```
Expected: differences confined to the accepted categories in `hugo/ACCEPTANCE.md` (whitespace, entity encoding, void-element serialisation).  Any structural difference (a missing block, reordered content, changed prose) is a defect to fix before committing.

- [ ] **Step 3: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/content/about.md
git commit -m "feat: convert about page to typed blocks"
```

---

## Task 6: Convert index, clothing, and questions to blocks

**Files:**
- Modify: `hugo/content/_index.md`, `hugo/content/clothing.md`, `hugo/content/questions.md`

**Interfaces:**
- Consumes: the block partials and the Task 5 conversion rule.

- [ ] **Step 1: Convert each page**

Apply the Task 5 conversion rule to each file, reading the current content and splitting at shortcodes:
- `_index.md`: an image, three testimonials, and prose (all Text/Image/Testimonial blocks).
- `clothing.md`: 14 image blocks with prose Text blocks between them; keep every `file`/`alt`/`caption` exactly.
- `questions.md`: a testimonial, a registration_form, and prose; keep `nav`-irrelevant front matter (title, description).

Preserve each page's existing front-matter fields.  Copy all prose verbatim into `text` block `body` scalars.

- [ ] **Step 2: Build and diff all three against the baseline**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
docker run --rm -v "$(cd .. && pwd):/repo" -w /repo/hugo hugomods/hugo:exts hugo --logLevel error -d /repo/hugo/public 2>&1 | grep -i error
for p in "" clothing questions; do
  j="../scratch/jekyll-baseline/$p/index.html"; h="public/$p/index.html"
  [ -z "$p" ] && { j="../scratch/jekyll-baseline/index.html"; h="public/index.html"; }
  echo "=== /$p ==="; diff <(sed 's/^[[:space:]]*//' "$j" | grep -v '^$') <(sed 's/^[[:space:]]*//' "$h" | grep -v '^$') | head -20
done
```
Expected: only accepted-category differences on each page.

- [ ] **Step 3: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/content/_index.md hugo/content/clothing.md hugo/content/questions.md
git commit -m "feat: convert home, clothing, and questions pages to typed blocks"
```

---

## Task 7: Convert classes.md to blocks

**Files:**
- Modify: `hugo/content/classes.md`

**Interfaces:**
- Consumes: the full page palette, including Prices and Venue intro.

`classes.md` is the richest page.  Convert it block by block, using the current file as the source:
- The table-of-contents list and the intro headings become Text blocks (keep the `[Venue](#venue)` link exactly — it stays broken).
- The image, registration_form (twice), class_times, testimonials, map become their blocks.
- The two price groups (the "In-Person Classes" and the "One-to-one sessions" definition lists) become two **Prices** blocks, each with its `items` list of `item`/`description`.  The prose headings and paragraphs around them stay as Text blocks.
- The hall-description paragraph with its inline Google Maps link becomes a **Venue intro** block: the paragraph text as `description`, the link as `link: {url, text}`.
- The `{% include address_gawsworth %}` becomes the **Venue** block.
- Keep `include_map: true` in front matter.

- [ ] **Step 1: Rewrite classes.md as blocks** following the mapping above, prose verbatim.

- [ ] **Step 2: Build and diff against the baseline**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
docker run --rm -v "$(cd .. && pwd):/repo" -w /repo/hugo hugomods/hugo:exts hugo --logLevel error -d /repo/hugo/public 2>&1 | grep -i error
diff <(sed 's/^[[:space:]]*//' ../scratch/jekyll-baseline/classes/index.html | grep -v '^$') \
     <(sed 's/^[[:space:]]*//' public/classes/index.html | grep -v '^$')
```
Expected: accepted-category differences, the existing JSON-LD key-order difference, AND the one accepted Venue-intro divergence (the "View the refurbished hall" link rendered as its own element rather than inline).  Confirm the two `<dl>` price groups render identically (byte-faithful) and the JSON-LD still has 8 classes / 6 validFrom.  Any other difference is a defect.

- [ ] **Step 3: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/content/classes.md
git commit -m "feat: convert classes page to typed blocks"
```

---

## Task 8: Convert the fifteen blog posts to blocks

**Files:**
- Modify: `hugo/content/blog/<slug>.md` (15 files)

**Interfaces:**
- Consumes: the light palette (Text, Image, Logo, Video).

- [ ] **Step 1: Convert each post**

Apply the conversion rule to each of the 15 posts.  Most are a single Text block; six use an Image, one a Video, one a Logo (the awesome-mums event post).  Keep each post's front matter unchanged (`title`, `date`, `description`, any `og_image*`, and the explicit `slug` on the five posts that have one) so the `/blog/YYYY/MM/DD/slug/` URLs are preserved.

- [ ] **Step 2: Build, diff every post, and confirm all URLs preserved**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
docker run --rm -v "$(cd .. && pwd):/repo" -w /repo/hugo hugomods/hugo:exts hugo --logLevel error -d /repo/hugo/public >/dev/null 2>&1
# URLs unchanged
find public/blog -name index.html | sed 's|public||; s|/index.html|/|' | sort > /tmp/hugo-blog-urls.txt
grep '^/blog/20' ../scratch/jekyll-urls.txt | sort > /tmp/jekyll-blog-urls.txt
diff /tmp/jekyll-blog-urls.txt /tmp/hugo-blog-urls.txt && echo "ALL 15 POST URLS PRESERVED"
# each post body diff
for f in $(cd public/blog && find . -name index.html | sed 's|/index.html||; s|^\./||'); do
  echo "=== $f ==="; diff <(sed 's/^[[:space:]]*//' "../scratch/jekyll-baseline/blog/$f/index.html" | grep -v '^$') \
       <(sed 's/^[[:space:]]*//' "public/blog/$f/index.html" | grep -v '^$') | head -8
done
```
Expected: `ALL 15 POST URLS PRESERVED`, and each post diff within accepted categories.

- [ ] **Step 3: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/content/blog/
git commit -m "feat: convert blog posts to typed blocks"
```

---

## Task 9: Rewrite the Sveltia configuration

**Files:**
- Modify: `hugo/static/admin/config.yml`

**Interfaces:**
- Consumes: nothing in the build; defines how the editor sees the blocks.
- Produces: a `files` collection for the five pages and a `folder` collection for the blog, each exposing the `blocks` variable-type list; the class-times `data` collection unchanged.

- [ ] **Step 1: Point media at the pipeline and remove the PoC collection**

In `hugo/static/admin/config.yml`: set `media_folder: hugo/assets/images` and `public_folder: /images` (so uploads land where the build-time pipeline reads them).  Delete the `poc` "Block composition test" collection entirely.  Keep the `output` block (`yaml.quote: double`, `omit_empty_optional_fields: true`) and the `data`/"Class times" collection exactly as they are.

- [ ] **Step 2: Define the shared block types once, via a YAML anchor**

Add, before `collections`, a reusable list of the page block-type definitions (each a Sveltia variable-type entry with `name` = the block `type` and the fields the block partial reads).  Use the field sets:
- `text`: `{name: text, fields: [{label: Text, name: body, widget: richtext}]}`
- `prices`: `{name: prices, fields: [{label: Items, name: items, widget: list, fields: [{label: Item, name: item, widget: string}, {label: Description, name: description, widget: richtext}]}]}`
- `testimonial`: `{name: testimonial, fields: [{Quote/content: text}, {Author/author: string}, {Link/more: string, required: false}, {Link text/read_more: string, required: false}]}`
- `image`: `{name: image, fields: [{File/file: image}, {Alt/alt: string}, {Caption/caption: string, required: false}, {Ext/ext: string, required: false}]}`
- `logo`: like image plus `{Link/url: string}`
- `video`: `{name: video, fields: [{File/file: string}, {Caption/caption: string, required: false}]}`
- `class_times`, `venue`, `map`, `registration_form`: `{name: <type>, fields: []}` (no fields; drop-in)
- `venue_intro`: `{name: venue_intro, fields: [{Description/description: richtext}, {Link/link: object, required: false, fields: [{URL/url: string}, {Text/text: string}]}]}`

The blog light palette reuses the `text`, `image`, `logo`, `video` entries only.

- [ ] **Step 3: The pages `files` collection**

Add a `files` collection with five entries (`_index`, `about`, `classes`, `clothing`, `questions`), each with `file:` pointing at the content file and fields: the page's front-matter fields (title, description, and where present `include_map`/`og_image*`) plus `{label: Blocks, name: blocks, widget: list, typeKey: type, types: [<full palette>]}`.

- [ ] **Step 4: The blog `folder` collection**

Add a `folder` collection at `hugo/content/blog`, `create: true`, `delete: true`, with `title`/`date`/`description`/optional `slug` fields plus `{label: Blocks, name: blocks, widget: list, typeKey: type, types: [text, image, logo, video]}`.

- [ ] **Step 5: Verify the config parses and the admin still builds**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
python3 -c "import yaml,sys; yaml.safe_load(open('static/admin/config.yml')); print('config.yml parses')"
docker run --rm -v "$(cd .. && pwd):/repo" -w /repo/hugo hugomods/hugo:exts hugo --logLevel error -d /repo/hugo/public >/dev/null 2>&1
test -f public/admin/config.yml && echo "admin present"
```
Expected: `config.yml parses`, `admin present`.  (A live editor check with Chrissie's content is the Task 11 follow-up / the editing trial, not automatable here.)

- [ ] **Step 6: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/static/admin/config.yml
git commit -m "feat: wire Sveltia collections to the typed-block pages and blog"
```

---

## Task 10: Full acceptance diff

**Files:**
- Modify: `hugo/ACCEPTANCE.md`

**Interfaces:**
- Consumes: the fully converted site.
- Produces: a signed-off parity result for the block model.

- [ ] **Step 1: Rebuild and diff every page against the frozen baseline**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
docker run --rm -v "$(cd .. && pwd):/repo" -w /repo/hugo hugomods/hugo:exts hugo --logLevel error -d /repo/hugo/public >/dev/null 2>&1
# URL parity
find public -name '*.html' | sed 's|public||; s|/index.html|/|' | sort > /tmp/hugo-urls.txt
diff ../scratch/jekyll-urls.txt /tmp/hugo-urls.txt && echo "URL PARITY (24)"
# per-page HTML diff, whitespace-normalised
norm() { sed 's/^[[:space:]]*//; s/[[:space:]]*$//' "$1" | grep -v '^$'; }
for u in about classes clothing questions "" ; do
  j="../scratch/jekyll-baseline/${u}/index.html"; h="public/${u}/index.html"
  [ -z "$u" ] && { j="../scratch/jekyll-baseline/index.html"; h="public/index.html"; }
  echo "=== /$u ==="; diff <(norm "$j") <(norm "$h") | head -30
done
```
Expected: `URL PARITY (24)`, and every page difference within the eight accepted categories plus, on `classes`, the JSON-LD key-order difference and the one Venue-intro link-placement divergence.  Investigate anything else as a defect.

- [ ] **Step 2: Update ACCEPTANCE.md**

Record the block-model re-verification result in `hugo/ACCEPTANCE.md`: PASS, the eight categories carried over, and the added Venue-intro exception (the classes-page hall link now renders as its own element).

- [ ] **Step 3: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/ACCEPTANCE.md
git commit -m "test: record typed-block acceptance diff"
```

---

## Task 11: Remove the old shortcodes and add editor guidance

**Files:**
- Modify: `hugo/layouts/_default/single.html` (drop the `.Content` fallback)
- Delete: `hugo/layouts/shortcodes/` (eight files)
- Create: `hugo/EDITING.md`

**Interfaces:**
- Consumes: a fully converted site (every page and post now has `blocks`).

- [ ] **Step 1: Confirm no content still calls a shortcode**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
grep -rl '{{<' content/ && echo "STILL HAS SHORTCODE CALLS — do not proceed" || echo "no shortcode calls remain"
```
Expected: `no shortcode calls remain`.

- [ ] **Step 2: Drop the fallback and remove the shortcodes**

Replace `hugo/layouts/_default/single.html` with the block-only version:
```go-html-template
{{ define "main" }}
{{- range .Params.blocks -}}
{{- partial (printf "blocks/%s.html" .type) (dict "b" . "page" $) -}}
{{- end -}}
{{ end }}
```
Then `git rm hugo/layouts/shortcodes/*.html`.

- [ ] **Step 3: Write the editor guidance**

Create `hugo/EDITING.md` noting, for whoever supports the editor: block types and what each is for; that two Text blocks with the same `##` heading text on one page will produce a broken duplicate anchor (keep headings distinct); that class times are edited in the "Class times" data editor, not per page; and that new photos upload through an Image block and are auto-processed.

- [ ] **Step 4: Rebuild and re-run the acceptance diff to confirm nothing changed**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
docker run --rm -v "$(cd .. && pwd):/repo" -w /repo/hugo hugomods/hugo:exts hugo --logLevel error -d /repo/hugo/public >/dev/null 2>&1
find public -name '*.html' | sed 's|public||; s|/index.html|/|' | sort > /tmp/hugo-urls.txt
diff ../scratch/jekyll-urls.txt /tmp/hugo-urls.txt && echo "URL PARITY HELD"
```
Expected: `URL PARITY HELD` (removing the unused shortcodes and the dead fallback changes no output).

- [ ] **Step 5: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/layouts/_default/single.html hugo/EDITING.md
git rm hugo/layouts/shortcodes/*.html
git commit -m "chore: remove shortcodes and body fallback; add editor guidance"
```

---

## Self-review

- **Spec coverage.** The block model and dispatch (Task 1), the eight shortcode-backed partials (Task 2), the Text/Prices/Venue-intro new blocks (Tasks 1, 3, 4), the single-source class times (Task 2, reading `data/classes.yml`), the content conversion of all five pages and fifteen posts (Tasks 5-8), the Sveltia `files`/`folder` collections with the full and light palettes and `media_folder` change (Task 9), the faithfulness gate against the frozen baseline (Task 10), the shortcode removal and duplicate-heading editor guidance (Task 11) each map to a task.  The pre-existing broken `#venue` anchor is reproduced (Task 7), not fixed.
- **Verified foundations.** The dispatch mechanism, the Text block via `.page.RenderString (dict "display" "block")`, the ported testimonial reading `.b.*`, and the Prices `<dl>` output were all built and confirmed against real Hugo before this plan was written.
- **Known risk carried into guidance.** Per-block `.RenderString` does not dedup heading ids across blocks; today's pages have no duplicate headings, and Task 11's `EDITING.md` warns against introducing one.
- **Open item deferred.** Confirming the full interactive Sveltia editor round-trips ordinary prose as the static test predicts, and running the image-upload pipeline once against the pinned Hugo 0.164.0, are follow-ups noted in the spec; they are the editing trial and deploy work, out of this plan's scope.
