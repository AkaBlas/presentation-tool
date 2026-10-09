const express = require("express");
const path = require("path");
const app = express();
const http = require("http").Server(app);
// cors: output machines load show.html from their own local copy and connect to the hub cross-origin
const io = require("socket.io")(http, { cors: { origin: true } });
const auth = require("./auth");
const hub = require("./hub");

const hostname = "0.0.0.0";
const port = 8080;

http.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

app.use(auth);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/app.html");
});

app.get("/show", (req, res) => {
  res.sendFile(__dirname + "/slides/show.html");
});
app.get("/show-controller", (req, res) => {
  res.sendFile(__dirname + "/show-controller.html");
});

app.use("/vendor/jquery", express.static(path.join(__dirname, "node_modules/jquery/dist")));
app.use("/vendor/reveal", express.static(path.join(__dirname, "node_modules/reveal.js/dist")));
app.use(
  "/vendor/socket.io",
  express.static(path.join(__dirname, "node_modules/socket.io/client-dist")),
);
app.use(
  "/vendor/ionicons",
  express.static(path.join(__dirname, "node_modules/ionicons/dist/ionicons")),
);
app.use("/assets", express.static("slides/img"));
app.use(express.static("slides"));

app.use((req, res) => {
  res.sendStatus(404);
});

hub(io);
