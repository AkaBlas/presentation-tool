# Presentation-Tool
This repository contains a quick and dirty solution to remotely control two [Reveal.js](https://revealjs.com) presentations at the same time.
It is written with [Express](https://expressjs.com), [Socket.IO](https://socket.io) and [jQuery](https://jquery.com).

The presentations and all assets must be located in the slides folder which is exported.

## Prerequisites
* yarn
* node.js

## Getting started
1. Run `yarn install`
2. Configure IP address and port in `server.js`
3. Customize basic auth in `auth.js` according to your needs
4. Start server via `yarn serve`

## Define Slides

This guide describes the basics for images, videos, text, and vertical slides in our presentation setup. For advanced options and features refer to the [official Reveal.js Documentation](https://revealjs.com/).

Each **slide** is represented by a `<section>` element. Inside a slide, you can include **images**, **videos**, **text blocks**, or even **nested sections** for vertical navigation.

### Images

You can add images directly inside a slide:

```html
<section>
  <img src="./assets/image.jpg" />
</section>
```

Images can have backgrounds or be transparent.

### Videos

Videos can be embedded using the [`<video>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video) element:

```html
<section>
  <video
    id="videoname"
    data-autoplay
    muted="muted"
    src="./assets/video.mp4"
  ></video>
</section>
```

Important options:
* `id`: Unique identifier for the video to control it via javascript
* `muted`: Ensures the video starts without sound
* `data-autoplay`: Automatically starts playback when the slide becomes visible
* `loop`: Restarts playback when the video ends.
* `data-preload`: Controls loading behavior (auto, metadata, none).

### Text Blocks

You can include text content using standard HTML elements:

```html
<section>
  <div class="text">
    <h2>Example</h2>
  </div>
</section>
```

Text content can be combined with images or videos on the same slide. Any valid HTML is supported: headings, paragraphs, lists, etc.
`.text` is defined by us and ensures large, centered content. There are also other helper classes such as [`r-fit-text`](https://revealjs.com/layout/#fit-text).

### Vertical Slides

Reveal.js supports nested sections. If you place multiple `<section>` elements inside another, they become [vertical slides](https://revealjs.com/vertical-slides/).
