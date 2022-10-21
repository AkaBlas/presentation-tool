const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);

const ipAddress = "192.168.178.42";
const port = 8080;

http.listen(port, ipAddress, () => {
  console.log(`Started on ${ipAddress}:${port}`);
});

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
  console.log(`Client ${socket.conn.remoteAddress} joined`);
  io.emit("clientJoin", { for: "everyone" });
  socket.on("disconnect", () => {
    console.log(`Client ${socket.conn.remoteAddress} left`);
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
