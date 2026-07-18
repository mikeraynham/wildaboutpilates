# Hugo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Wild About Pilates website from Jekyll to Hugo, reproducing the current site's HTML, URLs, and CSS, then add a build-time image pipeline so a non-technical editor can upload images through Sveltia CMS.

**Architecture:** A faithful port first: build the Hugo site alongside the Jekyll one and diff the output until differences reduce to a known list (whitespace, the CSS byte-order mark and sourceMappingURL comment, and the deliberately-rebuilt JSON-LD).  Existing images stay as static files, since most have no original to regenerate from.  Once parity is proven, add a build-time pipeline for new uploads and wire up Cloudflare Workers deploy.

**Tech Stack:** Hugo (standard edition), Dart Sass transpiler, Sveltia CMS, Cloudflare Workers.

## Global Constraints

- Hugo pinned to **0.164.0**, Dart Sass pinned to **1.101.0** (a known-compatible pair; Hugo 0.147.7 with Dart Sass 1.62.1 fails with `proto: cannot parse invalid wire-format data`).
- Standard Hugo edition only; the Dart Sass transpiler drives the separate `dart-sass` binary, so extended is not needed.
- Site variables (from `jekyll/_config.yml`): `url = https://www.wildaboutpilates.co.uk`, `email = info@wildaboutpilates.co.uk`, `tel = 07378 166524`, `tel_int = +44-7378-166524`.
- Blog post URLs must stay `/blog/YYYY/MM/DD/slug/`.  Reproduced by `[permalinks] blog = "/blog/:year/:month/:day/:slug/"`, date-stripped content filenames with `date:` front matter, and `disableKinds = ["taxonomy", "term"]`.
- Filter mappings: `slugify:'ascii'` and plain `slugify` both map to `urlize` (not `anchorize`, which double-hyphens `&`-titles); `uri_escape` on the email is a no-op, so output it plain (not `urlquery`, which would give `%40`); `relative_url` maps to `relURL`.
- Success criterion: `diff -r` of Jekyll `_site/` against Hugo `public/`, over HTML and the URL list, reduces to the known-difference list only.
- Reference URL set (22 URLs), which the Hugo build must reproduce exactly:
  `/`, `/about/`, `/blog/`, `/classes/`, `/clothing/`, `/questions/`, `/404.html`, `/google16af2f711db15395.html`, `/admin/`, and the 15 posts `/blog/YYYY/MM/DD/slug/`.
- British English throughout; the site's existing copy is authoritative and must not be reworded.

---

## File structure

Hugo project root is `hugo/` inside the repo, built in parallel with `jekyll/` until the cut-over.

```
hugo/
  hugo.toml                        Site config, permalinks, menus, imaging
  content/
    _index.md                      Home (from jekyll/index.md)
    about.md  classes.md  clothing.md  questions.md
    blog/
      _index.md                    Blog list page (from jekyll/blog.md)
      <slug>.md                    15 posts, date-stripped names
  layouts/
    _default/
      baseof.html                  Skeleton: head, header, footer
      single.html                  Page/post body wrapper
      list.html                    Section list (blog)
    partials/
      head.html  nav.html  footer-jsonld.html  sass.html
    shortcodes/
      image.html  logo.html  testimonial.html  video.html
      map_gawsworth.html  registration_form.html
      class_times.html  address_gawsworth.html
  assets/
    css/                           screen.scss + _sass partials
    images/                        Originals for NEW uploads only (Milestone 2)
  static/
    images/                        All existing image files, verbatim
    javascript/  videos/  documents/  css/... favicons, robots.txt, etc.
  build.sh                         Pinned Hugo + Dart Sass, for CI
  wrangler.jsonc                   Cloudflare Workers config
```

Each layout partial and shortcode has one responsibility, mirroring the Jekyll include it replaces.

---

## Task 1: Baseline capture and Hugo skeleton

**Files:**
- Create: `hugo/hugo.toml`
- Create: `scratch/jekyll-baseline/` (the reference build; git-ignored)

**Interfaces:**
- Produces: a Jekyll baseline at `scratch/jekyll-baseline/` and a buildable empty Hugo site at `hugo/`, both used by every later task's diff.

- [ ] **Step 1: Capture the Jekyll baseline**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates
docker compose run --rm --build jekyll bundle exec jekyll build
mkdir -p scratch
rm -rf scratch/jekyll-baseline
cp -r jekyll/_site scratch/jekyll-baseline
find scratch/jekyll-baseline -name '*.html' | sed 's|scratch/jekyll-baseline||; s|/index.html|/|' | sort > scratch/jekyll-urls.txt
wc -l scratch/jekyll-urls.txt
```
Expected: `22 scratch/jekyll-urls.txt`.

- [ ] **Step 2: Ignore scratch and the Hugo build output**

Add to `.gitignore`:
```
scratch/
hugo/public/
hugo/resources/
```

- [ ] **Step 3: Write the Hugo config**

Create `hugo/hugo.toml`:
```toml
baseURL = "https://www.wildaboutpilates.co.uk/"
languageCode = "en-GB"
title = "Wild About Pilates"
disableKinds = ["taxonomy", "term", "rss", "sitemap"]
enableInlineShortcodes = true

[permalinks]
  blog = "/blog/:year/:month/:day/:slug/"

[imaging]
  quality = 85

[params]
  email = "info@wildaboutpilates.co.uk"
  tel = "07378 166524"
  tel_int = "+44-7378-166524"

[markup.goldmark.renderer]
  unsafe = true

[[menus.main]]
  name = "Home"
  pageRef = "/"
  weight = 1
[[menus.main]]
  name = "About"
  pageRef = "/about"
  weight = 2
[[menus.main]]
  name = "Questions"
  pageRef = "/questions"
  weight = 3
[[menus.main]]
  name = "Classes"
  pageRef = "/classes"
  weight = 4
[[menus.main]]
  name = "Blog"
  pageRef = "/blog"
  weight = 5
[[menus.main]]
  name = "Clothing"
  pageRef = "/clothing"
  weight = 6
```

`unsafe = true` is required because the content embeds raw HTML (shortcodes emit `<figure>`, `<script type="application/ld+json">`, etc.), which goldmark strips by default.  `rss` and `sitemap` are disabled so Hugo does not emit `/index.xml` and `/sitemap.xml`, which Jekyll does not produce.

- [ ] **Step 4: Verify Hugo builds (empty)**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
docker run --rm -v "$PWD:/src" -w /src hugomods/hugo:exts hugo --logLevel error -d public 2>&1 | tail -3
```
Expected: a clean build with 0 errors (0 pages is fine at this stage).

- [ ] **Step 5: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add .gitignore hugo/hugo.toml
git commit -m "feat: add Hugo skeleton and config"
```

---

## Task 2: Static assets

**Files:**
- Create: `hugo/static/` (populated from `jekyll/`)

**Interfaces:**
- Produces: every non-generated asset at the same URL path it has today, so image, video, and document references resolve byte-identically.

- [ ] **Step 1: Copy the static asset trees verbatim**

All existing images stay static; 21 of the 27 displayed images have no original to regenerate from, so regeneration is impossible and the committed variants are authoritative.

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
mkdir -p static
cp -r ../jekyll/images static/images
cp -r ../jekyll/javascript static/javascript
cp -r ../jekyll/videos static/videos
cp -r ../jekyll/documents static/documents
rm -rf static/images/_site
```

- [ ] **Step 2: Copy root-level static files**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
for f in favicon.ico favicon-16x16.png favicon-32x32.png \
  apple-touch-icon.png apple-touch-icon-precomposed.png \
  android-chrome-192x192.png android-chrome-512x512.png \
  safari-pinned-tab.svg mstile-150x150.png manifest.json browserconfig.xml \
  robots.txt BingSiteAuth.xml google16af2f711db15395.html; do
  cp "../jekyll/$f" static/ 2>/dev/null || echo "missing: $f"
done
cp ../jekyll/apple-touch-icon-*.png static/ 2>/dev/null
ls static/ | wc -l
```
Expected: files copied, no "missing" lines for the core set.  (`google16af2f711db15395.html` in Jekyll is a page with an explicit permalink; as a static file it publishes to the same `/google16af2f711db15395.html`.)

- [ ] **Step 3: Verify assets resolve after a build**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
docker run --rm -v "$PWD:/src" -w /src hugomods/hugo:exts hugo --logLevel error -d public >/dev/null 2>&1
test -f public/images/chrissie-mobilising-200w.jpg && echo "image OK"
test -f public/documents/wild_about_pilates_registration_form_20230820.pdf && echo "doc OK"
test -f public/javascript/maps.js && echo "js OK"
```
Expected: `image OK`, `doc OK`, `js OK`.

- [ ] **Step 4: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/static
git commit -m "feat: add static assets to Hugo site"
```

---

## Task 3: Sass pipeline

**Files:**
- Create: `hugo/assets/css/screen.scss` (from `jekyll/css/screen.scss`, front matter stripped)
- Create: `hugo/assets/css/_*.scss` (copied from `jekyll/_sass/`)
- Create: `hugo/layouts/partials/sass.html`

**Interfaces:**
- Produces: `partials/sass.html`, which emits a `<link>` to the compiled `/css/screen.css`.  `head.html` (Task 4) consumes it.

- [ ] **Step 1: Copy the Sass sources**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
mkdir -p assets/css
cp ../jekyll/_sass/*.scss assets/css/
tail -n +3 ../jekyll/css/screen.scss > assets/css/screen.scss   # drop the "---\n---" front matter
head -1 assets/css/screen.scss
```
Expected: first line is `@use 'base';`.

- [ ] **Step 2: Write the Sass partial**

Create `hugo/layouts/partials/sass.html`:
```go-html-template
{{- $opts := dict "transpiler" "dartsass" "outputStyle" "compressed" -}}
{{- with resources.Get "css/screen.scss" | css.Sass $opts -}}
<link rel="stylesheet" href="{{ .RelPermalink }}?z">
{{- end -}}
```
The `?z` reproduces the cache-buster in the current `<link href="/css/screen.css?z">`.

- [ ] **Step 3: Temporary head to test Sass in isolation**

Create `hugo/layouts/_default/baseof.html` (temporary, replaced in Task 4):
```go-html-template
<!DOCTYPE html>
<html lang="en-GB"><head>{{ partial "sass.html" . }}</head><body>{{ block "main" . }}{{ end }}</body></html>
```

- [ ] **Step 4: Build with the pinned dart-sass and compare the CSS body**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
docker run --rm -v "$PWD:/src" -w /src hugomods/hugo:exts sh -c \
  'hugo --logLevel error -d public 2>&1 | grep -i error; ls public/css/'
# strip Jekyll's BOM and sourceMappingURL comment, then compare bodies
tail -c +4 ../scratch/jekyll-baseline/css/screen.css | sed 's|/\*# sourceMappingURL=screen.css.map \*/||' > /tmp/jekyll-body.css
cp public/css/screen.css /tmp/hugo-body.css
cmp /tmp/jekyll-body.css /tmp/hugo-body.css && echo "CSS BODIES IDENTICAL"
```
Expected: `CSS BODIES IDENTICAL`.  (If Hugo's compiled filename carries a hash, adjust the `cp` to the actual `public/css/*.css`.)

- [ ] **Step 5: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/assets/css hugo/layouts/partials/sass.html hugo/layouts/_default/baseof.html
git commit -m "feat: add Dart Sass pipeline reproducing Jekyll CSS"
```

---

## Task 4: Base layout (head, header, footer)

**Files:**
- Modify: `hugo/layouts/_default/baseof.html` (replace the temporary one)
- Create: `hugo/layouts/partials/head.html`
- Create: `hugo/layouts/partials/nav.html`
- Create: `hugo/layouts/partials/footer-jsonld.html`
- Create: `hugo/layouts/_default/single.html`
- Create: `hugo/layouts/_default/list.html`

**Interfaces:**
- Consumes: `partials/sass.html` (Task 3).
- Produces: `baseof.html` defining the `main` block, which `single.html` and `list.html` fill.

- [ ] **Step 1: Write `head.html`**

Create `hugo/layouts/partials/head.html` (ported from `jekyll/_layouts/default.html:3-51`; `{{ page.description }}` becomes `.Description`, `{{ site.url }}{{ page.url }}` becomes `.Permalink`):
```go-html-template
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="initial-scale=1" />
    <title>{{ .Title }} | Wild About Pilates</title>
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,500italic" rel="stylesheet">
    {{ partial "sass.html" . }}
    <link rel="canonical" href="{{ .Permalink }}" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/manifest.json">
    <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5">
    {{- with .Description }}
    <meta name="description" content="{{ . }}">
    {{- end }}
    <meta name="apple-mobile-web-app-title" content="Wild About Pilates">
    <meta name="application-name" content="Wild About Pilates">
    <meta name="theme-color" content="#ffffff">
    <meta property="og:locale" content="en_GB">
    <meta property="og:url" content="{{ .Permalink }}">
    <meta property="og:type" content="article">
    {{- with .Title }}
    <meta property="og:title" content="{{ . }}">
    {{- end }}
    {{- with .Description }}
    <meta property="og:description" content="{{ . }}">
    {{- end }}
    {{- with .Params.og_image }}
    <meta property="og:image" content="https://www.wildaboutpilates.co.uk/images/{{ . }}">
    {{- with $.Params.og_image_width }}
    <meta property="og:image:width" content="{{ . }}">
    {{- end }}
    {{- with $.Params.og_image_height }}
    <meta property="og:image:height" content="{{ . }}">
    {{- end }}
    {{- else }}
    <meta property="og:image" content="https://www.wildaboutpilates.co.uk/images/wild-about-pilates-logo-1200w630h.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    {{- end }}
    {{- if .Params.include_map }}
    <script src="{{ "/javascript/maps.js" | relURL }}?a"></script>
    <script
        src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDx857EBbEnyUnEJ8_qqwygj9QO1mZSa3o&callback=initMap&loading=async"
        async
        defer
    ></script>
    {{- end }}
</head>
```

- [ ] **Step 2: Write `nav.html`**

Create `hugo/layouts/partials/nav.html` (ported from `jekyll/_layouts/default.html:56-73`; the class attribute uses `urlize`, matching Jekyll `slugify:'ascii'`):
```go-html-template
<nav id="main-nav" class="no-delay" aria-label="Main Navigation">
    <ul id="menu">
    {{- range .Site.Menus.main }}
        {{- if $.IsMenuCurrent "main" . }}
        <li aria-current="page">
            <span class="{{ .Name | urlize }}">{{ .Name }}</span>
        </li>
        {{- else }}
        <li>
            <a class="{{ .Name | urlize }}" href="{{ .URL }}">{{ .Name }}</a>
        </li>
        {{- end }}
    {{- end }}
    </ul>
</nav>
```

- [ ] **Step 3: Write `footer-jsonld.html`**

Create `hugo/layouts/partials/footer-jsonld.html` (ported from `jekyll/_layouts/default.html:79-105`; this Organization block is static bar the params, so port it directly):
```go-html-template
<footer>
    <address>
        <a class="email" href="mailto:{{ .Site.Params.email }}" aria-label="email address {{ .Site.Params.email }}">{{ .Site.Params.email }}</a>
        <a class="tel" href="tel:{{ .Site.Params.tel | urlize }}" aria-label="telephone number {{ .Site.Params.tel }}">{{ .Site.Params.tel }}</a>
        <script type="application/ld+json">
        {
            "@context": "http://schema.org",
            "@type": "Organization",
            "url": "https://www.wildaboutpilates.co.uk/",
            "name": "Wild About Pilates",
            "logo": "https://www.wildaboutpilates.co.uk/images/wild-about-pilates-logo-1120w1120h.png",
            "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "{{ .Site.Params.tel_int }}",
                "email": "{{ .Site.Params.email }}",
                "contactType": "sales",
                "areaServed": "GB"
            },
            "sameAs": [
                "https://www.facebook.com/WildAboutPilates/",
                "https://www.linkedin.com/in/chrissie-raynham-wild-11a1b9157/",
                "https://www.instagram.com/wildaboutpilates/",
                "https://twitter.com/WAPilates1"
            ]
        }
        </script>
    </address>
</footer>
```

- [ ] **Step 4: Write `baseof.html`, `single.html`, `list.html`**

Replace `hugo/layouts/_default/baseof.html`:
```go-html-template
<!DOCTYPE html>
<html lang="en-GB">
    {{ partial "head.html" . }}
    <body>
        <header>
            <a id="skip-to-content" href="#main-content">Skip to main content</a>
            <a class="logo" href="/">Wild About Pilates</a>
            {{ partial "nav.html" . }}
        </header>
        <main id="main-content">
            <h1 id="{{ .Title | urlize }}">{{ .Title }}</h1>
            {{ block "main" . }}{{ end }}
        </main>
        {{ partial "footer-jsonld.html" . }}
    </body>
</html>
```

Create `hugo/layouts/_default/single.html`:
```go-html-template
{{ define "main" }}{{ .Content }}{{ end }}
```

Create `hugo/layouts/_default/list.html`:
```go-html-template
{{ define "main" }}{{ .Content }}{{ end }}
```

- [ ] **Step 5: Build and eyeball a page's structure**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
docker run --rm -v "$PWD:/src" -w /src hugomods/hugo:exts hugo --logLevel error -d public 2>&1 | grep -i error | head
```
Expected: no errors.  (Pages render once content lands in Task 6-9; the diff verification is Task 10.)

- [ ] **Step 6: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/layouts
git commit -m "feat: add Hugo base layout, head, nav, and footer"
```

---

## Task 5: The six trivial shortcodes

**Files:**
- Create: `hugo/layouts/shortcodes/image.html`
- Create: `hugo/layouts/shortcodes/logo.html`
- Create: `hugo/layouts/shortcodes/testimonial.html`
- Create: `hugo/layouts/shortcodes/video.html`
- Create: `hugo/layouts/shortcodes/map_gawsworth.html`
- Create: `hugo/layouts/shortcodes/registration_form.html`

**Interfaces:**
- Produces: shortcodes invoked from content as `{{</* image file="x" alt="y" */>}}`.  Jekyll `include.foo` becomes `.Get "foo"`.  The content rewrites happen in Task 8-9.

- [ ] **Step 1: Write `image.html`**

Create `hugo/layouts/shortcodes/image.html` (from `jekyll/_includes/image.html`; references the static variants unchanged):
```go-html-template
{{- $ext := .Get "ext" | default "jpg" -}}
{{- $file := .Get "file" -}}
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
         alt="{{ .Get "alt" }}">
    </a>
    {{- with .Get "caption" }}
    <figcaption>{{ . }}</figcaption>
    {{- end }}
</figure>
```

- [ ] **Step 2: Write `logo.html`**

Create `hugo/layouts/shortcodes/logo.html` (from `jekyll/_includes/logo.html`; default ext is `png`):
```go-html-template
{{- $ext := .Get "ext" | default "png" -}}
{{- $file := .Get "file" -}}
<figure class="logo">
    <a href="{{ .Get "url" }}">
    <img srcset="
            /images/{{ $file }}-200w.{{ $ext }} 200w,
            /images/{{ $file }}-300w.{{ $ext }} 300w,
            /images/{{ $file }}-400w.{{ $ext }} 400w"
         sizes="
            (min-width: 56.25em) 400px,
            (min-width: 43.75em) 300px,
            200px"
         src="/images/{{ $file }}-400w.{{ $ext }}"
         alt="{{ .Get "alt" }}">
    </a>
    {{- with .Get "caption" }}
    <figcaption>{{ . }}</figcaption>
    {{- end }}
</figure>
```

- [ ] **Step 3: Write `testimonial.html`**

Create `hugo/layouts/shortcodes/testimonial.html` (from `jekyll/_includes/testimonial.html`; `with` correctly skips an absent `more`, closing the empty-link trap):
```go-html-template
<figure class="testimonial">
    <blockquote>{{ .Get "content" | safeHTML }}</blockquote>
    {{- with .Get "more" }}
    <cite>
        <a href="{{ . }}">{{ $.Get "read_more" | default "read more&hellip;" | safeHTML }}</a>
    </cite>
    {{- end }}
    <figcaption>{{ .Get "author" }}</figcaption>
</figure>
```

- [ ] **Step 4: Write `video.html`, `map_gawsworth.html`, `registration_form.html`**

Create `hugo/layouts/shortcodes/video.html`:
```go-html-template
{{- $file := .Get "file" -}}
<figure class="video">
    <video controls>
        <source src="/videos/{{ $file }}.mp4" type="video/mp4">
        <source src="/videos/{{ $file }}.mov" type="video/quicktime">
        Your browser does not support the video tag.
    </video>
    {{- with .Get "caption" }}
    <figcaption>{{ . }}</figcaption>
    {{- end }}
</figure>
```

Create `hugo/layouts/shortcodes/map_gawsworth.html` (from `jekyll/_includes/map_gawsworth.html`):
```go-html-template
<div id="gawsworth-map" class="map"></div>
<p><a class="button" href="https://www.google.com/maps/search/?api=1&amp;query_place_id=ChIJY5ayhhdPekgRknoq2C0ibtw&amp;query=Gawsworth+Village+Hall,+Church+Lane,+Macclesfield,+SK11+9RJ">View on Google Maps</a></p>
```

Create `hugo/layouts/shortcodes/registration_form.html`:
```go-html-template
<a class="button" href="/documents/wild_about_pilates_registration_form_20230820.pdf">Download Registration Form</a>
```

- [ ] **Step 5: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/layouts/shortcodes/image.html hugo/layouts/shortcodes/logo.html hugo/layouts/shortcodes/testimonial.html hugo/layouts/shortcodes/video.html hugo/layouts/shortcodes/map_gawsworth.html hugo/layouts/shortcodes/registration_form.html
git commit -m "feat: add six trivial content shortcodes"
```

---

## Task 6: class_times shortcode

**Files:**
- Create: `hugo/layouts/shortcodes/class_times.html`
- Create: `hugo/data/classes.yml` (copied from `jekyll/_data/classes.yml`)

**Interfaces:**
- Consumes: `.Site.Data.classes` (a list of maps with `day`, `start`, `end`, `level`, optional `since`).
- Produces: the timetable markup grouped by day, matching `jekyll/_includes/class_times.html`.

- [ ] **Step 1: Copy the data file**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
mkdir -p data
cp ../jekyll/_data/classes.yml data/classes.yml
```

- [ ] **Step 2: Write the shortcode**

The Jekyll version uses `map: "day" | uniq` to get the ordered distinct days, then `where` per day.  Hugo's `apply` does not pluck a field cleanly, so build the day list explicitly, preserving first-seen order.

Create `hugo/layouts/shortcodes/class_times.html`:
```go-html-template
{{- $days := slice -}}
{{- range .Site.Data.classes -}}
  {{- if not (in $days .day) }}{{ $days = $days | append .day }}{{ end -}}
{{- end -}}
{{- range $days }}
<h4 id="{{ . | urlize }}">{{ . }}</h4>
{{- $day := . -}}
{{- range where $.Site.Data.classes "day" $day }}
<p><em><time>{{ .start }}</time>-<time>{{ .end }}</time></em> {{ .level }}</p>
{{- end -}}
{{- end }}
```

- [ ] **Step 3: Verify day order and heading ids against Jekyll**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
# temporary probe page
mkdir -p content
printf -- '---\ntitle: probe\n---\n{{</* class_times */>}}\n' > content/probe.md
docker run --rm -v "$PWD:/src" -w /src hugomods/hugo:exts hugo --logLevel error -d public >/dev/null 2>&1
grep -oE '<h4 id="[a-z]+">' public/probe/index.html
rm content/probe.md
```
Expected: `monday`, `tuesday`, `wednesday`, `thursday`, `friday` in that order (matching `jekyll/_site/classes/index.html`).

- [ ] **Step 4: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/data/classes.yml hugo/layouts/shortcodes/class_times.html
git commit -m "feat: add class_times shortcode grouping by day"
```

---

## Task 7: address_gawsworth shortcode (JSON-LD rebuild)

**Files:**
- Create: `hugo/layouts/shortcodes/address_gawsworth.html`

**Interfaces:**
- Consumes: `.Site.Data.classes`.
- Produces: the venue address block and an `openingHoursSpecification` JSON-LD array.  Data is faithful; key order and whitespace differ (a documented known difference), since Hugo `jsonify` sorts map keys.

- [ ] **Step 1: Write the shortcode**

Build the specification as a Go slice of maps and `jsonify` the whole document.  This removes the comma-juggling and the injection risk of the Jekyll string-building version.

Create `hugo/layouts/shortcodes/address_gawsworth.html`:
```go-html-template
{{- $specs := slice -}}
{{- range .Site.Data.classes -}}
  {{- $spec := dict
      "@type" "OpeningHoursSpecification"
      "opens" (printf "%s:00" .start)
      "closes" (printf "%s:00" .end)
      "dayOfWeek" (printf "http://schema.org/%s" .day) -}}
  {{- with .since }}{{ $spec = merge $spec (dict "validFrom" .) }}{{ end -}}
  {{- $specs = $specs | append $spec -}}
{{- end -}}
{{- $doc := dict
    "@context" "http://schema.org"
    "@type" "EventVenue"
    "@id" "https://www.wildaboutpilates.co.uk/#gawsworth"
    "url" "https://www.wildaboutpilates.co.uk/"
    "name" "Wild About Pilates"
    "telephone" "+44-7378-166524"
    "image" "https://www.wildaboutpilates.co.uk/images/wild-about-pilates-logo-1120w1120h.png"
    "logo" "https://www.wildaboutpilates.co.uk/images/wild-about-pilates-logo-1120w1120h.png"
    "maximumAttendeeCapacity" "12"
    "geo" (dict "@type" "GeoCoordinates" "latitude" "53.2305637" "longitude" "-2.168794")
    "address" (dict "@type" "PostalAddress" "addressCountry" "GB" "streetAddress" "Gawsworth Village Hall, Church Lane" "addressLocality" "Macclesfield" "addressRegion" "Cheshire" "postalCode" "SK11 9RJ")
    "openingHoursSpecification" $specs -}}
<address>
    Gawsworth Village Hall<br/>
    Church Lane<br/>
    Macclesfield<br/>
    SK11 9RJ<br/>
    <script type="application/ld+json">
    {{ $doc | jsonify (dict "indent" "    ") | safeHTML }}
    </script>
</address>
```

- [ ] **Step 2: Verify the JSON-LD parses and carries all 8 classes with their validFrom dates**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
mkdir -p content
printf -- '---\ntitle: probe\n---\n{{</* address_gawsworth */>}}\n' > content/probe.md
docker run --rm -v "$PWD:/src" -w /src hugomods/hugo:exts hugo --logLevel error -d public >/dev/null 2>&1
python3 -c "
import re, json, pathlib
html = pathlib.Path('public/probe/index.html').read_text()
blob = re.search(r'application/ld\+json\">(.*?)</script>', html, re.S).group(1)
d = json.loads(blob)
specs = d['openingHoursSpecification']
print('classes:', len(specs))
print('with validFrom:', sum('validFrom' in s for s in specs))
"
rm content/probe.md
```
Expected: `classes: 8` and `with validFrom: 6` (the six `since` dates in `data/classes.yml`).

- [ ] **Step 3: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/layouts/shortcodes/address_gawsworth.html
git commit -m "feat: add address_gawsworth shortcode with rebuilt JSON-LD"
```

---

## Task 8: Migrate the pages

**Files:**
- Create: `hugo/content/_index.md`, `about.md`, `classes.md`, `clothing.md`, `questions.md`

**Interfaces:**
- Consumes: all shortcodes from Tasks 5-7.
- Produces: the five non-blog pages at `/`, `/about/`, `/classes/`, `/clothing/`, `/questions/`.

- [ ] **Step 1: Convert front matter and rewrite include calls**

For each page, copy `jekyll/<page>.md` to the Hugo path, then:
- Remove `layout: default` (Hugo uses `single.html` by default).
- Remove `nav_title`/`nav_order` (the menu is defined in `hugo.toml`).
- Keep `title`, `description`, and any `og_image*`/`include_map` as-is (they are read as `.Params`).
- Rewrite every `{% include foo.html a="b" c="d" %}` as `{{</* foo a="b" c="d" */>}}`.  Multi-line include calls collapse to one shortcode call.

`jekyll/index.md` becomes `hugo/content/_index.md` (the home page).  The others keep their filenames.

Example, `hugo/content/about.md` (from `jekyll/about.md`; note the two testimonial calls and one image call rewritten):
```markdown
---
title: About Me
description: My name is Chrissie Raynham-Wild and I'm a state registered Chartered
  Physiotherapist specialising in musculoskeletal physiotherapy, and a certified APPI  Matwork
  Pilates instructor.
---

Through a combination of physiotherapy, Pilates, and a focus on well-being, I take a holistic approach, emphasising on long-term health, and helping individuals live active, fulfilling lives well into the future.

I am a passionate and experienced Pilates instructor, currently leading a number of classes and providing 1-2-1 sessions. Teaching Pilates is a personal joy and a hobby for me. My love for movement and fitness enhances my ability to help clients improve their strength, flexibility and overall wellbeing.

{{</* testimonial
    content="The sessions so far have been great, Chrissie is really professional and connects really well with the group. She is warm and welcoming and seems like she really knows her stuff."
    author="D Mullineux" */>}}

Beyond Pilates, I am an Advanced Clinical Specialist Physiotherapist with a strong background in musculoskeletal care and rehabilitation. With 15 years of NHS experience, I have developed expertise in complex patient assessment, treatment planning, and therapeutic techniques. I provide high-level clinical care, guiding both patients and junior staff in achieving optimal health outcomes.

{{</* image
    file="chrissie-raynham-wild"
    alt="Photo of Chrissie Wild"
    caption="Chrissie Raynham-Wild" */>}}

In addition to my current role, I have also worked as a First Contact Practitioner (FCP), serving as the first point of contact for patients presenting with musculoskeletal issues. In this role, I independently assessed, diagnosed, and managed a wide range of conditions, streamlining patient pathways and reducing pressure on primary care services.

I am currently studying an MSc in Advanced Physiotherapy at Manchester Metropolitan University and my specialist interests include post-natal exercise, persistent musculoskeletal pain management, sports rehabilitation, strength training, and breast cancer post-operative rehabilitation.

{{</* testimonial
    content="Chrissie is an amazing teacher. She is knowledgeable and very helpful at adapting postures for your needs &hellip; I have loved her classes and would definitely recommend her classes to anyone."
    author="K Anderton" */>}}

## Qualifications
```
(continue with the remaining qualifications body verbatim from `jekyll/about.md:36-89`.)

Repeat for `_index.md`, `classes.md`, `clothing.md`, `questions.md`.  `classes.md` keeps `include_map: true` in front matter and uses `{{</* class_times */>}}`, `{{</* address_gawsworth */>}}`, `{{</* map_gawsworth */>}}`, and `{{</* registration_form */>}}`.

- [ ] **Step 2: Build and diff each page against the Jekyll baseline**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
docker run --rm -v "$PWD:/src" -w /src hugomods/hugo:exts hugo --logLevel error -d public 2>&1 | grep -i error
for p in about classes clothing questions; do
  echo "=== $p ==="
  diff <(sed 's/^[[:space:]]*//' ../scratch/jekyll-baseline/$p/index.html | grep -v '^$') \
       <(sed 's/^[[:space:]]*//' public/$p/index.html | grep -v '^$') \
    | head -30
done
```
Expected: differences confined to the JSON-LD block (key order) on `classes`, and whitespace already normalised away.  Investigate anything else.

- [ ] **Step 3: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/content
git commit -m "feat: migrate the five content pages"
```

---

## Task 9: Migrate the blog

**Files:**
- Create: `hugo/content/blog/_index.md` (from `jekyll/blog.md`)
- Create: `hugo/content/blog/<slug>.md` (15 posts)

**Interfaces:**
- Consumes: the permalink config and shortcodes.
- Produces: `/blog/` and the 15 post URLs `/blog/YYYY/MM/DD/slug/`.

- [ ] **Step 1: Convert the posts**

For each `jekyll/_posts/YYYY-MM-DD-<slug>.md`:
- New path `hugo/content/blog/<slug>.md` (drop the date prefix from the filename).
- Front matter: keep `title`, `date`, `description`; drop `layout` and `categories` (the section is `blog`).  Keep the `date` value; Hugo parses `2024-11-02 06:00:00 Z`.
- Rewrite any `{% include %}` as the shortcode form.

Run this conversion helper, then hand-fix front matter and shortcode calls per file:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
mkdir -p content/blog
for f in ../jekyll/_posts/*.md; do
  base=$(basename "$f")
  slug=$(echo "$base" | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-//')
  cp "$f" "content/blog/$slug"
done
ls content/blog/ | wc -l
```
Expected: `15` (plus `_index.md` after the next step).

- [ ] **Step 2: Write the blog list page**

The Jekyll `blog.md` lists posts with `post.excerpt`.  Hugo's `.Summary` is the nearest equivalent; the excerpt text may differ slightly, which the acceptance test will surface as a known content difference to review.

Create `hugo/content/blog/_index.md`:
```markdown
---
title: Blog
description: The Wild About Pilates blog.
---
```

Create `hugo/layouts/blog/list.html`:
```go-html-template
{{ define "main" }}
<ul class="blog_list">
  {{- range .Pages.ByDate.Reverse }}
    <li>
      <a href="{{ .RelPermalink }}" class="title">{{ .Title }}</a>
      {{ .Summary }}
      <a href="{{ .RelPermalink }}" class="read_more">read more&hellip;</a>
    </li>
  {{- end }}
</ul>
{{ end }}
```

- [ ] **Step 3: Verify every post URL matches the reference set**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
docker run --rm -v "$PWD:/src" -w /src hugomods/hugo:exts hugo --logLevel error -d public >/dev/null 2>&1
find public/blog -name index.html | sed 's|public||; s|/index.html|/|' | sort > /tmp/hugo-blog-urls.txt
grep '^/blog/20' ../scratch/jekyll-urls.txt | sort > /tmp/jekyll-blog-urls.txt
diff /tmp/jekyll-blog-urls.txt /tmp/hugo-blog-urls.txt && echo "ALL 15 POST URLS MATCH"
```
Expected: `ALL 15 POST URLS MATCH`.

- [ ] **Step 4: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/content/blog hugo/layouts/blog
git commit -m "feat: migrate blog posts and list page"
```

---

## Task 10: Full acceptance diff

**Files:**
- Create: `hugo/ACCEPTANCE.md` (records the reconciled known-difference list)

**Interfaces:**
- Consumes: the complete Hugo build.
- Produces: a signed-off parity result; this is the spec's hard success criterion.

- [ ] **Step 1: Diff the full URL list**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
docker run --rm -v "$PWD:/src" -w /src hugomods/hugo:exts hugo --logLevel error -d public >/dev/null 2>&1
find public -name '*.html' | sed 's|public||; s|/index.html|/|' | sort > /tmp/hugo-urls.txt
diff ../scratch/jekyll-urls.txt /tmp/hugo-urls.txt
```
Expected: empty diff, or only `/admin/` if the Sveltia mount is not yet copied (Task 11 handles it).

- [ ] **Step 2: Diff every page's HTML, whitespace-normalised**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
norm() { sed 's/^[[:space:]]*//; s/[[:space:]]*$//' "$1" | grep -v '^$'; }
for u in about classes clothing questions ""; do
  j="../scratch/jekyll-baseline/$u/index.html"; h="public/$u/index.html"
  [ -z "$u" ] && { j="../scratch/jekyll-baseline/index.html"; h="public/index.html"; }
  echo "=== /$u ==="; diff <(norm "$j") <(norm "$h") | head -40
done
```
Expected: only the JSON-LD key-order block on `classes` and, on the blog list, any `.Summary` vs `excerpt` wording.  Record each surviving difference.

- [ ] **Step 3: Write the acceptance record**

Create `hugo/ACCEPTANCE.md` documenting the diff result and every reconciled difference (whitespace, CSS BOM + sourceMappingURL, JSON-LD key order, blog excerpt).  Anything not on that list is a defect to fix before proceeding.

- [ ] **Step 4: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/ACCEPTANCE.md
git commit -m "test: record Jekyll-vs-Hugo acceptance diff"
```

---

## Task 11: Sveltia CMS on Hugo layout

**Files:**
- Create: `hugo/static/admin/index.html`
- Create: `hugo/static/admin/config.yml`

**Interfaces:**
- Consumes: the Hugo content and data layout.
- Produces: `/admin/` serving the Sveltia editor pointed at Hugo's `content/` and `data/`.

- [ ] **Step 1: Copy and repoint the admin config**

Copy `jekyll/admin/index.html` to `hugo/static/admin/index.html` unchanged.  Copy `jekyll/admin/config.yml` to `hugo/static/admin/config.yml`, then update the paths from the Jekyll layout to the Hugo one:
- `media_folder: hugo/static/images`, `public_folder: /images`
- the class-times file: `file: hugo/data/classes.yml`
- keep the `output.yaml.quote: double` and `omit_empty_optional_fields: true` block (carried over from the Sveltia fix).

- [ ] **Step 2: Verify the admin page builds and loads its config**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
docker run --rm -v "$PWD:/src" -w /src hugomods/hugo:exts hugo --logLevel error -d public >/dev/null 2>&1
test -f public/admin/index.html && test -f public/admin/config.yml && echo "admin present"
```
Expected: `admin present`.

- [ ] **Step 3: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/static/admin
git commit -m "feat: mount Sveltia CMS on the Hugo layout"
```

---

## Task 12: Cloudflare Workers deploy

**Files:**
- Create: `hugo/build.sh`
- Create: `hugo/wrangler.jsonc`

**Interfaces:**
- Produces: a git-connected Workers build that installs pinned Hugo and Dart Sass, builds, and deploys `public/`.

- [ ] **Step 1: Write `build.sh`**

Create `hugo/build.sh` (adapted from Hugo's official Cloudflare guide; Go and Node steps omitted, since the site uses neither):
```bash
#!/usr/bin/env bash
set -euo pipefail

HUGO_VERSION=0.164.0
DART_SASS_VERSION=1.101.0

main_dir=$(pwd)
build_dir=$(mktemp -d)

curl -sfL -o "${build_dir}/hugo.tar.gz" \
  "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_${HUGO_VERSION}_linux-amd64.tar.gz"
tar -xf "${build_dir}/hugo.tar.gz" -C "${build_dir}"

curl -sfL -o "${build_dir}/dart-sass.tar.gz" \
  "https://github.com/sass/dart-sass/releases/download/${DART_SASS_VERSION}/dart-sass-${DART_SASS_VERSION}-linux-x64.tar.gz"
tar -xf "${build_dir}/dart-sass.tar.gz" -C "${build_dir}"

export PATH="${build_dir}:${build_dir}/dart-sass:${PATH}"

cd "${main_dir}"
hugo --gc --minify
```

Note: `hugo --minify` changes HTML output; run the acceptance diff (Task 10) without `--minify` and only add it here once parity is signed off, or drop `--minify` to stay byte-faithful.

- [ ] **Step 2: Write `wrangler.jsonc`**

Create `hugo/wrangler.jsonc`:
```jsonc
{
  "name": "wildaboutpilates",
  "compatibility_date": "2026-06-19",
  "build": { "command": "chmod a+x build.sh && ./build.sh" },
  "assets": { "directory": "./public", "not_found_handling": "404-page" }
}
```

- [ ] **Step 3: Verify build.sh runs in a clean container**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
docker run --rm -v "$PWD:/src" -w /src ubuntu:22.04 bash -c \
  'apt-get update -qq >/dev/null && apt-get install -y -qq curl tar >/dev/null && chmod +x build.sh && ./build.sh 2>&1 | tail -5 && ls public/index.html'
```
Expected: a successful Hugo build and `public/index.html` present.

- [ ] **Step 4: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/build.sh hugo/wrangler.jsonc
git commit -m "feat: add Cloudflare Workers build and deploy config"
```

---

## Task 13: Build-time image pipeline for new uploads (Milestone 2)

**Files:**
- Create: `hugo/layouts/partials/gen-image-variants.html`
- Modify: `hugo/layouts/shortcodes/image.html`

**Interfaces:**
- Consumes: an original at `assets/images/<file>.<ext>` when present.
- Produces: `/images/<file>-{200,300,400}w.<ext>` and `/images/<file>-clean.<ext>`, generated at build time with `images.AutoOrient` applied before resize, via `resources.Copy` to keep the exact names.  Existing static variants are untouched; this path fires only when an original exists.

- [ ] **Step 1: Write the variant generator**

`images.AutoOrient` must precede the resize, or an EXIF-rotated phone photo publishes sideways with no error.  `resources.Copy` fixes the output name so the `srcset` stays unchanged.

Create `hugo/layouts/partials/gen-image-variants.html`:
```go-html-template
{{- $file := .file -}}
{{- $ext := .ext -}}
{{- with resources.Get (printf "images/%s.%s" $file $ext) -}}
  {{- $o := .Filter images.AutoOrient -}}
  {{- range slice 200 300 400 -}}
    {{- $r := $o.Resize (printf "%dx q85" .) -}}
    {{- $named := resources.Copy (printf "/images/%s-%dw.%s" $file . $ext) $r -}}
    {{- $named.Publish -}}
  {{- end -}}
  {{- $clean := resources.Copy (printf "/images/%s-clean.%s" $file $ext) $o -}}
  {{- $clean.Publish -}}
{{- end -}}
```

- [ ] **Step 2: Call the generator from the image shortcode**

Prepend to `hugo/layouts/shortcodes/image.html`, before the `<figure>`:
```go-html-template
{{- partial "gen-image-variants.html" (dict "file" $file "ext" $ext) -}}
```

- [ ] **Step 3: Test with a fresh EXIF-rotated original**

Run:
```bash
cd /Users/mikeraynham/git/wildaboutpilates/hugo
# create an orientation-6 original and reference it from a probe page
docker run --rm -v "$PWD:/src" -w /src python:3-slim sh -c \
  'pip install -q pillow piexif && python - <<EOF
from PIL import Image; import piexif
im = Image.new("RGB",(600,200),(0,120,200))
im.save("/src/assets/images/uploadtest.jpg", exif=piexif.dump({"0th":{piexif.ImageIFD.Orientation:6}}))
EOF'
printf -- '---\ntitle: probe\n---\n{{</* image file="uploadtest" alt="t" */>}}\n' > content/probe.md
rm -rf public resources   # clear any stale generated-resource cache before checking output
docker run --rm -v "$PWD:/src" -w /src hugomods/hugo:exts hugo --logLevel error -d public 2>&1 | grep -i error
docker run --rm -v "$PWD:/src" -w /src python:3-slim sh -c \
  'pip install -q pillow && python -c "from PIL import Image; i=Image.open(\"/src/public/images/uploadtest-200w.jpg\"); print(i.size, \"PORTRAIT-OK\" if i.size[1]>i.size[0] else \"SIDEWAYS-FAIL\")"'
rm content/probe.md assets/images/uploadtest.jpg
```
Expected: `(200, 600) PORTRAIT-OK`, proving AutoOrient ran before the resize.  A `SIDEWAYS-FAIL` (200x66) means the filter was not applied first.  Clearing `resources/` first matters: a stale generated-resource cache can mask whether `.Publish` actually emits the files.

- [ ] **Step 4: Commit**

```bash
cd /Users/mikeraynham/git/wildaboutpilates
git add hugo/layouts/partials/gen-image-variants.html hugo/layouts/shortcodes/image.html
git commit -m "feat: generate image variants for new uploads with AutoOrient"
```

---

## Self-review

- **Spec coverage.** Directory layout (Task 1-3), content and URLs including the verified permalink config (Task 8-9), the template port with the corrected `urlize`/`uri_escape` mappings (Task 4-7), the JSON-LD rebuild as a Go map (Task 7), Sass with the Dart Sass transpiler and the byte-identical body check (Task 3), the image pipeline with `AutoOrient` before resize (Task 13), the Workers deploy with pinned versions (Task 12), the Sveltia fix carried into the admin config (Task 11), and the HTML+URL acceptance diff (Task 10) each map to a task.
- **Deviation from the spec, flagged.** The spec's Images section implies all images move to `assets/` for build-time processing.  In fact 21 of 27 displayed images have no original to regenerate from, so the faithful port keeps existing variants as static files (Task 2) and the build-time pipeline applies only to new uploads (Task 13).  The `resources.Copy` mechanism, which the spec did not name, is what lets generated variants keep the exact `-200w` filenames.
- **Known differences carried by the acceptance test:** whitespace, the CSS byte-order mark and `sourceMappingURL` comment, the JSON-LD key reordering, and any blog-excerpt wording from `.Summary` vs Jekyll `excerpt`.  The last is the one open risk worth watching in Task 9-10.
- **Open item still live:** Hugo's image re-encode stripping metadata like `jpegtran -copy none` is untested; it matters only for new uploads (Task 13) and should be checked there.
