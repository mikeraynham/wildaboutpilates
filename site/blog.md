---
title: Blog
layout: default
nav_title: Blog
nav_order: 5
description: The Wild About Pilates blog.
---

<ul class="blog_list">
  {% for post in site.posts %}
    <li>
      <a href="{{ post.url }}" class="title">{{ post.title }}</a>
      {{ post.excerpt }}
      <a href="{{ post.url }}" class="read_more">read more&hellip;</a>
    </li>
  {% endfor %}
</ul>
