// Output page for the two-machine show (`/show?view=left|right|full&hub=<host:port>`).
// The whole deck is one 3840x1080 canvas; each machine renders all of it and shows only its half.
// The hub (hub.js) owns the show state; this page follows it on a clock shared with the hub, so
// slide changes, videos and CSS animations line up across both machines.

const params = new URLSearchParams(location.search);
const view = params.get("view") || "full";
const role = params.get("role") || "output";
const hubUrl = (() => {
  const hub = params.get("hub");
  if (!hub) {
    return "";
  }
  return /^https?:\/\//.test(hub) ? hub : `http://${hub}`;
})();

// Set before Reveal lays out: show.css widens/shifts the deck per view.
document.documentElement.dataset.view = view;

// Shared clock: hub time = performance.now() + clockOffset.
let clockOffset = 0;
let clockRtt = null;
const sharedNow = () => performance.now() + clockOffset;

const ping = (socket) =>
  new Promise((resolve) => {
    const t0 = performance.now();
    socket.timeout(1000).emit("time", (err, hubTime) => {
      const t1 = performance.now();
      resolve(err ? null : { rtt: t1 - t0, offset: hubTime - (t0 + t1) / 2 });
    });
  });

// NTP-style: the sample with the shortest round trip has the least asymmetric delay in it.
const syncClock = async (socket) => {
  const samples = [];
  for (let i = 0; i < 8; i++) {
    const sample = await ping(socket);
    if (sample) {
      samples.push(sample);
    }
  }
  if (samples.length) {
    const best = samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
    clockOffset = best.offset;
    clockRtt = best.rtt;
  }
};

const nextFrame = (fn) => (document.hidden ? setTimeout(fn, 4) : requestAnimationFrame(fn));

// Run fn on the first frame at or after hub time `time`.
const schedule = (time, fn) => {
  const wait = time - sharedNow();
  if (wait > 30) {
    setTimeout(() => schedule(time, fn), wait - 20);
  } else if (wait > 0) {
    nextFrame(() => schedule(time, fn));
  } else {
    fn();
  }
};

const hashText = (text) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  }
  return (hash >>> 0).toString(16);
};

const slideNames = (slide) => (slide.dataset.slide || "").split(/\s+/).filter(Boolean);

// [{ h, v, names }] in navigation order; a stack's own names point at its first child.
const buildManifest = () =>
  Reveal.getHorizontalSlides().flatMap((stack, h) => {
    const children = Array.from(stack.querySelectorAll(":scope > section"));
    if (!children.length) {
      return [{ h, v: 0, names: slideNames(stack) }];
    }
    return children.map((slide, v) => ({
      h,
      v,
      names: v === 0 ? [...slideNames(stack), ...slideNames(slide)] : slideNames(slide),
    }));
  });

const startShow = async () => {
  // Fingerprint of this machine's show.html, so the controller can flag outputs running different
  // copies of the deck.
  const deck = hashText(await (await fetch(location.pathname)).text());
  const manifest = buildManifest();
  const socket = io(`${hubUrl}/show`, { transports: ["websocket"] });

  let current = null; // last applied hub state
  let advanceRequested = null;

  const report = () => {
    if (!socket.connected) {
      return;
    }
    const { h, v = 0 } = Reveal.getIndices();
    socket.emit("report", { seq: current?.seq ?? 0, h, v, rtt: clockRtt });
  };

  const isVisible = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.right > 0 && rect.left < window.innerWidth;
  };

  const requestAdvance = () => {
    if (current && advanceRequested === current.seq) {
      return;
    }
    advanceRequested = current?.seq;
    if (current && socket.connected) {
      socket.emit("ended", { seq: current.seq });
    } else {
      Reveal.down();
    }
  };

  const lastSeek = new WeakMap();
  const seek = (video, time) => {
    if (performance.now() - (lastSeek.get(video) ?? -Infinity) < 2000) {
      return;
    }
    lastSeek.set(video, performance.now());
    video.currentTime = time;
  };

  // Keep every visible video on the current slide at the hub's media position: small errors are
  // closed by nudging playbackRate (videos are muted, so it's inaudible), large ones (rejoin) by
  // seeking. Only the hub timeline decides that a video is over: some files report `ended` right
  // after a seek (seen with slide_freeworld_b_*.mp4 in Chromium), which must not cut the show.
  const syncMedia = () => {
    if (!current) {
      return;
    }
    const slide = Reveal.getCurrentSlide();
    const { origin, pausedAt } = current.media;
    const position = pausedAt ?? (sharedNow() - origin) / 1000;

    document.querySelectorAll(".reveal video").forEach((video) => {
      if (!slide.contains(video) || !isVisible(video)) {
        if (!video.paused) {
          video.pause();
        }
        return;
      }

      const { duration } = video;
      if (!duration) {
        return; // metadata not loaded yet
      }
      const target = video.loop ? position % duration : Math.min(position, duration);
      const finished = !video.loop && target >= duration;

      if (pausedAt !== null || target < 0 || finished) {
        if (!video.paused) {
          video.pause();
        }
        const hold = Math.max(target, 0);
        if (!video.ended && Math.abs(video.currentTime - hold) > 0.05) {
          seek(video, hold);
        }
        if (finished && pausedAt === null && "advance" in video.dataset) {
          requestAdvance();
        }
        return;
      }

      if (video.ended) {
        // Ran off the end early: retry a bad seek, or hold the last frame until the timeline
        // ends. play() on an ended video would restart it from 0.
        if (duration - target > 0.5) {
          seek(video, target);
        }
        return;
      }

      const error = video.currentTime - target;
      if (Math.abs(error) > 1) {
        seek(video, target);
        video.playbackRate = 1;
      } else if (Math.abs(error) > 0.02 || (video.playbackRate !== 1 && Math.abs(error) > 0.005)) {
        video.playbackRate = 1 - Math.max(-0.08, Math.min(0.08, error * 2));
      } else {
        video.playbackRate = 1;
      }
      if (video.paused) {
        video.play().catch(() => {});
      }
    });
  };

  // Start every CSS animation on the current slide exactly when the slide was entered (hub time
  // `since`, in this page's timeline): same phase on both machines, and after a reload.
  const alignAnimations = () => {
    if (!current) {
      return;
    }
    const startTime = current.since - clockOffset;
    Reveal.getCurrentSlide()
      .getAnimations({ subtree: true })
      .forEach((animation) => {
        if (animation instanceof CSSAnimation) {
          animation.startTime = startTime;
        }
      });
  };

  // Before `at`: park the incoming slide's videos on their first frame so they start promptly.
  const prepare = (state) => {
    const { h, v = 0 } = Reveal.getIndices();
    if (state.h === h && state.v === v) {
      return;
    }
    Reveal.getSlide(state.h, state.v)
      ?.querySelectorAll("video")
      .forEach((video) => {
        video.pause();
        video.currentTime = 0;
      });
  };

  const apply = (state) => {
    if (current && state.seq <= current.seq) {
      return;
    }
    current = state;

    const { h, v = 0 } = Reveal.getIndices();
    if (state.h !== h || state.v !== v) {
      Reveal.slide(state.h, state.v);
    }
    if (Reveal.isPaused() !== state.paused) {
      Reveal.togglePause(state.paused);
    }
    alignAnimations();
    syncMedia();
    report();
  };

  const actions = {
    iframe: () => {
      const iframe = document.querySelector("iframe");
      if (iframe) {
        iframe.src = "http://0.0.0.0:8443/activepoll";
      }
    },
  };

  socket.on("connect", async () => {
    await syncClock(socket);
    const { h, v = 0 } = Reveal.getIndices();
    socket.emit("hello", { role, view, deck, manifest, position: { h, v } }, ({ state }) => {
      // The hub's snapshot always wins on (re)connect, even after a hub restart reset seq.
      current = null;
      if (state) {
        apply(state);
      }
    });
  });

  socket.on("state", (state) => {
    if (current && state.seq <= current.seq) {
      return;
    }
    prepare(state);
    schedule(state.at, () => apply(state));
  });

  socket.on("action", ({ name, at }) => schedule(at, () => actions[name]?.()));

  document.querySelectorAll(".reveal video").forEach((video) => {
    video.addEventListener("ended", syncMedia);
  });

  setInterval(syncMedia, 250);
  setInterval(async () => {
    if (socket.connected) {
      await syncClock(socket);
      alignAnimations();
      report();
    }
  }, 30000);
};
