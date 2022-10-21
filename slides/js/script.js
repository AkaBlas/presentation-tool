const controlSlide = (side) => {
  const socket = io();

  socket.on("slideCommand", (msg) => {
    if (/^([0-9]+[a-g]?)$/.test(msg)) {
      let xPage = msg;
      let vPage = 0;
      if (/([a-g]+)$/.test(msg)) {
        xPage = msg.slice(0, -1);
        if (msg.endsWith("b")) {
          vPage = 1;
        } else if (msg.endsWith("c")) {
          vPage = 2;
        } else if (msg.endsWith("d")) {
          vPage = 3;
        } else if (msg.endsWith("e")) {
          vPage = 4;
        } else if (msg.endsWith("f")) {
          vPage = 5;
        } else if (msg.endsWith("g")) {
          vPage = 6;
        }
      }
      console.log("page: ", xPage, vPage);
      Reveal.slide(xPage, vPage);
      socket.emit("slideStatus", { side, code: msg });
    } else {
      const allowed = [
        "prev",
        "next",
        "black",
        "logo",
        "start",
        "pause",
        "encore",
        "end",
      ];

      if (allowed.includes(msg)) {
        switch (msg) {
          case "prev":
            Reveal.prev();
            break;
          case "next":
            Reveal.next();
            break;
          case "black":
            Reveal.togglePause();
            break;
          case "start":
          case "logo":
            Reveal.slide(0);
            break;
          case "pause":
            Reveal.slide(4); // Customize here
            break;
          case "encore":
            Reveal.slide(7); // Customize here
            break;
          case "end":
            Reveal.slide(8); // Customize here
            break;
        }
        socket.emit("slideStatus", { side, code: msg });
      }
    }
  });
};
