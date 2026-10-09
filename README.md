# Presentation-Tool

This repository contains a quick and dirty solution to remotely control two
[Reveal.js](https://revealjs.com) presentations at the same time. It is written with
[Express](https://expressjs.com), [Socket.IO](https://socket.io) and [jQuery](https://jquery.com).

The presentations and all assets must be located in the slides folder which is exported.

## Prerequisites

- yarn
- node.js

## Getting started

1. Run `yarn install`
2. Configure IP address and port in `server.js`
3. Customize basic auth in `auth.js` according to your needs
4. Start server via `yarn serve`

## Define Slides

This guide describes the basics for images, videos, text, and vertical slides in our presentation
setup. For advanced options and features refer to the
[official Reveal.js Documentation](https://revealjs.com/).

Each **slide** is represented by a `<section>` element. Inside a slide, you can include **images**,
**videos**, **text blocks**, or even **nested sections** for vertical navigation.

### Images

You can add images directly inside a slide:

```html
<section>
  <img src="./assets/image.jpg" />
</section>
```

Images can have backgrounds or be transparent.

### Videos

Videos can be embedded using the
[`<video>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video) element:

```html
<section>
  <video id="videoname" data-autoplay muted="muted" src="./assets/video.mp4"></video>
</section>
```

Important options:

- `id`: Unique identifier for the video to control it via javascript
- `muted`: Ensures the video starts without sound
- `data-autoplay`: Automatically starts playback when the slide becomes visible
- `loop`: Restarts playback when the video ends.
- `data-preload`: Controls loading behavior (auto, metadata, none).

### Text Blocks

You can include text content using standard HTML elements:

```html
<section>
  <div class="text">
    <h2>Example</h2>
  </div>
</section>
```

Text content can be combined with images or videos on the same slide. Any valid HTML is supported:
headings, paragraphs, lists, etc. `.text` is defined by us and ensures large, centered content.
There are also other helper classes such as [`r-fit-text`](https://revealjs.com/layout/#fit-text).

### Vertical Slides

Reveal.js supports nested sections. If you place multiple `<section>` elements inside another, they
become [vertical slides](https://revealjs.com/vertical-slides/).

## Two-machine show

`/show` is one deck for both projectors: a single 3840x1080 canvas, left half on the left projector,
right half on the right one. Both machines always switch together, videos and CSS animations stay in
sync.

### Setup

1. Connect both output machines (and ideally the controller) via cable to one switch.
2. Copy the repo to both machines and run `yarn install && yarn serve` on each.
3. Pick one machine as the hub, e.g. `10.0.0.1`. On each output machine open (kiosk/fullscreen):
   - left: `http://localhost:8080/show?view=left&hub=10.0.0.1:8080`
   - right: `http://localhost:8080/show?view=right&hub=10.0.0.1:8080`
4. Open `http://10.0.0.1:8080/show-controller` on the controlling device.

The controller shows both outputs with their current slide. A red line means an output is offline,
on the wrong slide, or running a different version of `show.html` than the other one.

### Placing content

Every slide is a `<section data-slide="...">` like before; inside it, place content with:

```html
<section data-slide="abc">
  <img class="left" src="./assets/abc_left.jpg" />
  <img class="right" src="./assets/abc_right.jpg" />
</section>
<section data-slide="panorama">
  <img class="full" src="./assets/panorama_3840x1080.jpg" />
</section>
<section data-slide="question-1">
  <div class="left">
    <div class="question"><h2>...</h2></div>
  </div>
</section>
```

Videos need no `id`, script or `data-autoplay`; they start when the slide is shown. `data-advance`
moves on to the next vertical slide when the video is over:

```html
<video class="left" data-advance muted preload="auto" src="./assets/video.mp4"></video>
```
