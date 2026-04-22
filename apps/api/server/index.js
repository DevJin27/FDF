const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const createGroupsRouter = require("./routes/groups");
const createCartRouter = require("./routes/cart");
const createSplitRouter = require("./routes/split");
const { GROUPS_FILE } = require("./state");
const { registerSocketHandlers, runLifecycleSweep } = require("./socket");

dotenv.config({
  path: path.join(__dirname, "..", ".env"),
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const port = Number(process.env.PORT) || 4000;

if (!fs.existsSync(path.dirname(GROUPS_FILE))) {
  fs.mkdirSync(path.dirname(GROUPS_FILE), { recursive: true });
}

app.use(
  cors({
    origin: "*",
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/groups", createGroupsRouter());
app.use("/api/cart", createCartRouter({ io }));
app.use("/api/split", createSplitRouter());

app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    error: error.message || "Internal server error",
  });
});

registerSocketHandlers(io);
setInterval(() => {
  runLifecycleSweep(io);
}, 60000);

server.listen(port, () => {
  console.log(`Blinkit group backend listening on port ${port}`);
});
