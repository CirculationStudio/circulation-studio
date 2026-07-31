---
title: Why a narrow column is easier to read
deck: A test fixture for the markdown pipeline, written about the thing it is testing.
kind: essay
author: steve
updated: 2026-07-30
---

This file exists to prove that markdown renders through the site frame. It will
be deleted. The subject is the reading measure, chosen so the fixture
demonstrates the thing it is testing rather than sitting there as filler.

## What measure means

Measure is the width of a column of text, counted in characters rather than
pixels. Pixels are the wrong unit for it, because a column that reads well at
one type size reads badly at another. Counting characters holds the
relationship steady no matter what the type does.

The number most typographers land on sits somewhere between sixty and
seventy-five characters per line. Below that the eye returns to the left margin
too often and the rhythm becomes choppy. Above it the return sweep gets long
enough that the eye occasionally lands on the wrong line, which is the mistake
readers notice least and are slowed by most.

### Why the return sweep matters

Reading is not a smooth glide across a line. The eye moves in short jumps and
rests briefly between them. At the end of a line it makes one long backward
jump to find the start of the next. That jump is the least accurate movement in
the whole process, and its accuracy falls off as the line gets longer.

A narrow column shortens the jump. It also gives the eye a stronger vertical
edge to aim at, because the left margin is closer to where the eye already was.

## What this looks like in practice

A few things follow from holding a column to measure:

- Long words and long links stop forcing awkward breaks, because there is less
  room for them to strand a line.
- Headings sit on the same column as the prose beneath them, so the page reads
  as one thing rather than two.
- Lists inherit the same width, which keeps a run of short items from spreading
  into the margin. That holds for nested lists too:
    - An inner list stays on the same column edge.
    - It closes up against the item that introduces it rather than opening a
      gap of its own.

The last one is worth stating plainly. A list that runs wider than the
paragraphs around it looks like a mistake even when every individual line is
short enough to read comfortably. **Consistency of column edge matters more
than the width of any single element.**

There is a counterargument, and it is a fair one. A strict measure wastes
horizontal space on a large screen, and *some* material genuinely wants the
room: wide tables, code, diagrams, anything where the content has its own
natural width. The usual answer is to let those specific things break out of
the column while the prose stays put.

For more on the underlying research, the classic starting point is Bringhurst's
[Elements of Typographic Style](https://en.wikipedia.org/wiki/The_Elements_of_Typographic_Style),
which is where most of the numbers quoted above eventually trace back to.

## What a list directly under a heading does

- It sits at the heading's own spacing rather than adding its top margin to it.
- Adjacent margins collapse, so the larger of the two wins.
- This case exists in the fixture only so the collapse can be measured.

### The same under a smaller heading

- An h3 closes at 16px, which matches the list's own top margin exactly.
- The collapse is therefore invisible here, which is the point of measuring it.

## Where this leaves the fixture

If you are reading this inside the site frame, with a masthead above and a
colophon below, the pipeline works. If the headings above run wider than these
paragraphs, the measure is not being applied to the whole column and only the
paragraph rule is doing any work.
