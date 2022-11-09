const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const auth = require("./auth");

const hostname = "0.0.0.0";
const port = 8080;

http.listen(port, hostname, () => {
  console.log(`Server running at https://${hostname}:${port}/`);
});

app.use(auth);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/app.html");
});

app.get("/slides_left", (req, res) => {
  res.sendFile(__dirname + "/slides/slides_left.html");
});
app.get("/slides_right", (req, res) => {
  res.sendFile(__dirname + "/slides/slides_right.html");
});

app.get("/controller", (req, res) => {
  res.sendFile(__dirname + "/controller.html");
});

app.use(express.static("slides"));

io.on("connection", (socket) => {
  console.log(`Client ${socket.handshake.headers.host} joined`);
  console.log(socket.handshake.headers);
  io.emit("clientJoin", { for: "everyone" });
  socket.on("disconnect", () => {
    console.log(`Client ${socket.handshake.headers.host} left`);
    io.emit("clientLeave", { for: "everyone" });
  });

  socket.on("slideCommand", (msg) => {
    console.log("slideCommand", msg);
    io.emit("slideCommand", msg);
  });
  socket.on("slideStatus", (msg) => {
    console.log("slideStatus", msg);
    io.emit("slideStatus", msg);
  });
});
