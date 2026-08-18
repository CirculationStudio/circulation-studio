---
title: What a dollar of Yelp Ads actually bought
deck: A second disposable fixture, this one shaped like the document the whitepaper blocks were built for.
kind: whitepaper
header: cover
author: steve
updated: 2026-07-31
readingtime: 18
reviewed: 2026-07
# A fixture, not writing. See the note in pipeline-test.md and
# tools/eleventy/page-noindex.js. This one is what exercises the cover
# treatment, which is why it cannot be folded into the other fixture.
fixture: true
---

This fixture exists to exercise the cover treatment, which the essay fixture
cannot: a cover panel indents its own heading, and `pipeline-test.md` is where
the sweep asserts that everything in the prose column shares one left edge.
Keeping them apart lets both checks stay strict.

It will be deleted with the other fixture when real articles land.

## Why it is separate

The cover is the only header treatment that is a component rather than a scale.
Every other block in the vocabulary can be dropped into a prose column and
measured there, so they live in the essay fixture where the sweep already covers
them.

{% cta headline="Does the fixture prove the block?", label="Read the manifest", url="https://example.com/manifest" %}
One optional line of markdown copy, so the block is exercised with its copy
present rather than only in its shortest form.
{% endcta %}

A closing line after the cta, so the block is measured with a neighbour under it
rather than as the article's last child. A pane that ends an article
deliberately contributes no bottom margin, which is a different case and is
already covered by pane.css.
