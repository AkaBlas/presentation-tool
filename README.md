# Presentation-Tool

This repository contains a quick and dirty solution to show one [Reveal.js](https://revealjs.com)
presentation across two projectors side by side, each driven by its own machine, and to control both
remotely. It is written with [Express](https://expressjs.com), [Socket.IO](https://socket.io) and
[jQuery](https://jquery.com).

The presentation (`slides/show.html`) and all assets must be located in the slides folder which is
exported. Images and videos go into `slides/img` and are referenced as `./assets/...`.

## Prerequisites

- yarn
- node.js

## Getting started

1. Run `yarn install`
2. Configure IP address and port in `server.js`
3. Customize basic auth in `auth.js` according to your needs
4. Start server via `yarn serve`

The committed `slides/show.html` and the cue table in `show-controller.html` are examples to start
each new show from.

## Define Slides

This guide describes the basics for images, videos, text, and vertical slides in our presentation
setup. For advanced options and features refer to the
[official Reveal.js Documentation](https://revealjs.com/).

The presentation is one 3840x1080 canvas: the left half is shown on the left projector, the right
half on the right one. Each **slide** is a `<section data-slide="...">` element; the controller
jumps to it by that name (several names separated by spaces are allowed). Inside a slide, place
content with:

- `.left`: left projector (1920x1080)
- `.right`: right projector (1920x1080)
- `.full`: across both projectors (3840x1080)

### Images

```html
<section data-slide="abc">
  <img class="left" src="./assets/abc_left.jpg" />
  <img class="right" src="./assets/abc_right.jpg" />
</section>
<section data-slide="panorama">
  <img class="full" src="./assets/panorama_3840x1080.jpg" />
</section>
```

Images can have backgrounds or be transparent.

### Videos

Videos can be embedded using the
[`<video>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video) element:

```html
<section data-slide="xyz">
  <video class="left" data-advance muted preload="auto" src="./assets/video.mp4"></video>
</section>
```

Videos need no `id`, script or `data-autoplay`: they start when the slide is shown and are kept in
sync on both machines. Important options:

- `muted`: Ensures the video starts without sound
- `preload="auto"`: Loads the video in advance, so it starts without delay
- `data-advance`: Moves on to the next vertical slide when the video is over
- `loop`: Restarts playback when the video ends

### Text Blocks

You can include text content using standard HTML elements. `.left`, `.right` and `.full` blocks
center their content:

```html
<section data-slide="text-1">
  <div class="left">
    <div class="text"><h2>Example</h2></div>
  </div>
</section>
```

Text content can be combined with images or videos on the same slide. Any valid HTML is supported:
headings, paragraphs, lists, etc. `.text` is defined by us and makes text large and centered. There
are other helper classes such as [`r-fit-text`](https://revealjs.com/layout/#fit-text).

### Vertical Slides

Reveal.js supports nested sections. If you place multiple `<section>` elements inside another, they
become [vertical slides](https://revealjs.com/vertical-slides/).

## Running the show

### Setup

1. Connect both output machines (and ideally the controller) via cable to one switch.
2. Copy the repo including `slides/img` to both machines and run `yarn install && yarn serve` on
   each.
3. Pick one machine as the hub, e.g. `10.0.0.1`. On each output machine open (kiosk/fullscreen):
   - left: `http://localhost:8080/show?view=left&hub=10.0.0.1:8080`
   - right: `http://localhost:8080/show?view=right&hub=10.0.0.1:8080`
4. Open `http://10.0.0.1:8080/show-controller` on the controlling device.

Both machines always switch together, videos and CSS animations stay in sync. The controller shows
both outputs with their current slide. A red line means an output is offline, on the wrong slide, or
running a different version of `show.html` than the other one.

### Controller

The cue table in `show-controller.html` is the running order: one row per step, cells in one row are
alternatives. The table has 4 columns, use `colspan` to fill a row:

```html
<tr>
  <td colspan="4" data-command="start">## START ##</td>
</tr>
<tr>
  <td colspan="2" data-command="abc">ABC</td>
  <td colspan="2" data-command="def">DEF</td>
</tr>
```

`data-command` is the `data-slide` name to jump to. Cues without a matching slide in `show.html` are
struck through, so typos show up before the show.

During the show:

- Space / GO fires the next row when it has one cell, 1-9 pick a cell in rows with several
- Clicking a cell jumps there directly
- PageDown / PageUp (presenter clickers) or Prev / Next go to the previous / next slide
- `b` or `.` and Black toggle a black screen on both projectors
- Start and Results jump to the slides named `start` and `results`
- Video pauses / resumes the current video
- Poll reloads the poll iframe, Preview shows a live preview of the whole canvas
- The input field takes any command: a slide name, a slide number like `5` or `5b` (horizontal index
  counting from 0, vertical slide `b`), `next`, `prev`, `down`, `logo` (first slide), `black`,
  `play`
