const parseSlideTarget = (command) => {
  const match = command.match(/^(\d+)([a-z])?$/);
  if (!match) {
    return null;
  }

  const [, horizontal, vertical = "a"] = match;
  return {
    horizontal: Number(horizontal),
    vertical: vertical.charCodeAt(0) - "a".charCodeAt(0),
  };
};

const goToNamedSlide = (name) => {
  const slide = Array.from(document.querySelectorAll("[data-slide]")).find(
    (slide) => slide.dataset.slide.split(/\s+/).includes(name),
  );

  if (!slide) {
    return false;
  }

  const { h, v = 0, f } = Reveal.getIndices(slide);
  Reveal.slide(h, v, f);
  return true;
};

const controlSlide = (side) => {
  const socket = io();

  socket.on("slideCommand", (msg) => {
    const command = String(msg).trim();
    const target = parseSlideTarget(command);

    if (target) {
      console.log("page: ", target.horizontal, target.vertical);
      Reveal.slide(target.horizontal, target.vertical);
      socket.emit("slideStatus", { side, code: command });
      return;
    }

    if (goToNamedSlide(command)) {
      socket.emit("slideStatus", { side, code: command });
      return;
    }

    const commands = {
      prev: () => Reveal.prev(),
      next: () => Reveal.next(),
      black: () => Reveal.togglePause(),
      logo: () => Reveal.slide(0),
      play: () => {
        const video = $("video");
        video.trigger(video.prop("paused") ? "play" : "pause");
      },
      iframe: () => {
        const iframe = document.querySelector("iframe");
        iframe.src = "http://0.0.0.0:8443/activepoll";
      },
    };

    if (commands[command]) {
      commands[command]();
      socket.emit("slideStatus", { side, code: command });
    }
  });
};
