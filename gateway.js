const express = require("express");
const helmet = require("helmet");
const registry = require("./routes/registry.json");
const cors = require("cors");
const app = express();
const routes = require("./routes");
const PORT = 9090;
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(helmet());
app.use(cors());

const auth = (req, res, next) => {
  const url = req.protocol + "://" + req.hostname + ":" + PORT + req.path;
  if (req.path === "/ui") {
    next();
    return;
  } else {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).send({
        authenticated: false,
        path: url,
        message:
          "Authentication Required: Please provide an authorization header.",
      });
      return;
    }
    const authString = Buffer.from(
      req.headers.authorization,
      "base64"
    ).toString("utf8");
    const authParts = authString.split(":");
    const username = authParts[0];
    const password = authParts[1];
    const user = registry.auth.users[username];
    if (user) {
      if (user.username === username && user.password === password) {
        next();
      } else {
        res.send({
          authorizaticated: false,
          path: url,
          message: "Authentication Unsuccessful : Incurrect password.",
        });
      }
    } else {
      res.send({
        authorizaticated: false,
        path: url,
        message:
          "Authentication Unsuccessful : user " + username + " does not exist.",
      });
    }
  }
};

app.use(auth);
app.get("/ui", (req, res) => {
  res.render("index", { services: registry.services });
});
app.use("/", routes);

app.listen(PORT, () => console.log(`Gateway has started on port ${PORT}`));
