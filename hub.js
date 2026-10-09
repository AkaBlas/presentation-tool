// Hub for the two-machine show (`/show`): owns the one authoritative show state and serves a shared
// clock. Every change is stamped with `at` (hub time, LEAD_MS in the future) so both output machines
// apply it on the same frame instead of whenever their copy of the message happens to arrive.
const LEAD_MS = 150;

module.exports = (io) => {
  const show = io.of("/show");

  // Deck structure reported by the output pages: [{ h, v, names: [...] }] in navigation order.
  let manifest = [];
  // { seq, at, h, v, cue, ref, since, paused, media: { origin, pausedAt } } — null until an output
  // page connects. `since` is when the current slide was entered (drives CSS animation phase);
  // `media` is the video timeline: position = (now - origin) / 1000, or pausedAt while paused.
  let state = null;

  const now = () => performance.now();

  const indexOf = ({ h, v }) => manifest.findIndex((slide) => slide.h === h && slide.v === v);

  const resolve = (command) => {
    const numeric = command.match(/^(\d+)([a-z])?$/);
    if (numeric) {
      const v = numeric[2] ? numeric[2].charCodeAt(0) - "a".charCodeAt(0) : 0;
      return manifest[indexOf({ h: Number(numeric[1]), v })];
    }

    const named = manifest.find((slide) => slide.names.includes(command));
    if (named) {
      return named;
    }

    const index = indexOf(state);
    switch (command) {
      case "next":
        return manifest[index + 1];
      case "prev":
        return manifest[index - 1];
      case "down":
        return manifest[index + 1]?.h === state.h ? manifest[index + 1] : undefined;
      case "logo":
        return manifest[0];
    }
  };

  const publish = (changes) => {
    const at = now() + LEAD_MS;
    state = { ...state, ...changes(at), seq: state.seq + 1, at };
    show.emit("state", state);
  };

  const run = (command, ref) => {
    if (!state || !manifest.length) {
      return "No show output connected";
    }

    switch (command) {
      case "black":
        publish(() => ({ paused: !state.paused }));
        return null;
      case "play":
        publish((at) => {
          const { origin, pausedAt } = state.media;
          return pausedAt === null
            ? { media: { origin, pausedAt: (at - origin) / 1000 } }
            : { media: { origin: at - pausedAt * 1000, pausedAt: null } };
        });
        return null;
      case "iframe":
        show.emit("action", { name: command, at: now() + LEAD_MS });
        return null;
    }

    const target = resolve(command);
    if (!target) {
      return `No slide for "${command}"`;
    }

    publish((at) => {
      const moved = target.h !== state.h || target.v !== state.v;
      return {
        h: target.h,
        v: target.v,
        cue: command,
        ref: ref ?? state.ref,
        ...(moved && { since: at, media: { origin: at, pausedAt: null } }),
      };
    });
    return null;
  };

  const publishClients = () => {
    const clients = Array.from(show.sockets.values())
      .filter((socket) => socket.data.role && socket.data.role !== "controller")
      .map((socket) => ({ id: socket.id, ...socket.data }));
    show.to("controllers").emit("clients", clients);
  };

  show.on("connection", (socket) => {
    socket.on("time", (ack) => typeof ack === "function" && ack(now()));

    socket.on("hello", (hello = {}, ack) => {
      socket.data = { role: hello.role, view: hello.view, deck: hello.deck };
      if (hello.role === "controller") {
        socket.join("controllers");
      }

      if (hello.manifest?.length) {
        manifest = hello.manifest;
        show.to("controllers").emit("manifest", manifest);
      }

      // Fresh hub (first start or restart mid-show): adopt the first output's position instead of
      // yanking both screens back to the first slide.
      if (!state && hello.position) {
        const at = now();
        const { h, v } = hello.position;
        state = {
          seq: 1,
          at,
          h,
          v,
          cue: null,
          ref: null,
          since: at,
          paused: false,
          media: { origin: at, pausedAt: null },
        };
        socket.broadcast.emit("state", state);
      }

      if (typeof ack === "function") {
        ack({ state, manifest });
      }
      publishClients();
    });

    socket.on("cue", ({ command, ref } = {}, ack) => {
      const error = run(String(command ?? "").trim(), ref);
      console.log("cue", command, error ?? "");
      if (typeof ack === "function") {
        ack({ error });
      }
    });

    // Sent by every output whose `data-advance` video finished; only the first one for the
    // current state counts.
    socket.on("ended", ({ seq } = {}) => {
      if (state && seq === state.seq) {
        run("down");
      }
    });

    socket.on("report", (report) => {
      socket.data.report = report;
      publishClients();
    });

    socket.on("disconnect", publishClients);
  });
};
