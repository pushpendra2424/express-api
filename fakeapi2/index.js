const express = require("express");
const app = express();
const axios = require("axios");
const PORT = 9092;
const HOST = `localhost`;

app.use(express.json());

app.get("/api", (req, res, next) => {
  res.send("Hello from fake  server.");
});

app.post("/bgapi", (req, res, next) => {
  res.send("Bogus api says hello!.");
});

app.listen(PORT, () => {
  const authString = "johndoe:password";
  const encodedAuthString = Buffer.from(authString, "utf-8").toString("base64");
  console.log("Encoded Auth String:", encodedAuthString); // Log the encoded string
  axios({
    method: "POST",
    url: "http://localhost:9090/register",
    headers: {
      Authorization: encodedAuthString,
      "Content-Type": "application/json",
    },
    data: {
      apiName: "registrytest",
      protocol: "http",
      host: HOST,
      port: PORT,
    },
  }).then((result) => {
    console.log(result.data);
  });

  console.log(`Fake api server has started on port ${PORT}`);
});
