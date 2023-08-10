const express = require("express");
const axios = require("axios");
const router = express.Router();
const fs = require("fs");

const registry = require("./registry.json");
const loadbalancer = require("../util/loadbalancer");

router.post("/enable/:apiName", (req, res) => {
  const apiName = req.params.apiName;
  const requestBody = req.body;
  const instances = registry.services[apiName].instances;
  const index = instances.findIndex((srv) => {
    return srv.url === requestBody.url;
  });
  if (index == -1) {
    res.send({
      status: "error",
      message:
        "Could not find " +
        requestBody.url +
        " " +
        " for service " +
        apiName +
        " ",
    });
  } else {
    instances[index].enabled = requestBody.enabled;
    fs.writeFile(
      "./routes/registry.json",
      JSON.stringify(registry),
      (error) => {
        if (error) {
          res.send(
            "Could not enable/disable " +
              requestBody.url +
              " for service " +
              apiName +
              ":\n" +
              error
          );
        } else {
          res.send(
            "Successfully enable/disable " +
              requestBody.url +
              " for service " +
              apiName +
              ":\n"
          );
        }
      }
    );
  }
});

router.all("/:apiName/:path", async (req, res) => {
  try {
    const service = registry.services[req.params.apiName];
    if (service) {
      if (!service.loadBalanceStrategy) {
        service.loadBalanceStrategy = "ROUND_ROBIN";
        fs.writeFile(
          "./routes/registry.json",
          JSON.stringify(registry),
          (error) => {
            if (error) {
              res.send("Could not write load balance Strategy " + error);
            }
          }
        );
      }
      const newIndex = loadbalancer[service.loadBalanceStrategy](service);
      const url = service.instances[newIndex].url;
      console.log("url", url);
      axios({
        method: req.method,
        url: url + req.params.path,
        headers: {
          ...req.headers,
          "Cache-Control": "no-cache", // Disable caching
        },
        data: req.body,
        // data: req.method === "POST" ? req.body : null,
      })
        .then((result) => {
          res.send(result.data);
        })
        .catch((err) => {
          res.status(500).send(err);
        });
    } else {
      res.status(404).send("API not found in the registry");
    }
  } catch (err) {
    return err.message;
  }
});

router.post("/register", (req, res) => {
  const registrationInfo = req.body;
  registrationInfo.url =
    registrationInfo.protocol +
    "://" +
    registrationInfo.host +
    ":" +
    registrationInfo.port +
    "/";
  console.log("registrationInfo", registrationInfo);
  if (apiAlredyExists(registrationInfo)) {
    res.send(
      "Configuration already exists... " +
        registrationInfo.apiName +
        " at " +
        registrationInfo.url +
        "."
    );
    // return already exists
  } else {
    registry.services[registrationInfo.apiName].instances.push({
      ...registrationInfo,
    });

    fs.writeFile(
      "./routes/registry.json",
      JSON.stringify(registry),
      (error) => {
        if (error) {
          res.send(
            "Could not register " + registrationInfo.apiName + "\n" + error
          );
        } else {
          res.send(
            "Successfully reistered " + registrationInfo.apiName + "....."
          );
        }
      }
    );
  }
});

router.post("/unregister", (req, res) => {
  const registrationInfo = req.body;
  if (apiAlredyExists(registrationInfo)) {
    const index = registry.services[
      registrationInfo.apiName
    ].instances.findIndex((instance) => {
      return registrationInfo.url === instance.url;
    });
    registry.services[registrationInfo.apiName].instances.splice(index, 1);
    fs.writeFile(
      "./routes/registry.json",
      JSON.stringify(registry),
      (error) => {
        if (error) {
          res.send(
            "Could not unregister " + registrationInfo.apiName + "\n" + error
          );
        } else {
          res.send(
            "Successfully unreistered " + registrationInfo.apiName + "....."
          );
        }
      }
    );
  } else {
    res.send(
      "Configuration does not exis for " +
        registrationInfo.apiName +
        " at " +
        registrationInfo.url +
        "."
    );
  }
});

const apiAlredyExists = (registrationInfo) => {
  let exist = false;
  registry.services[registrationInfo.apiName].instances.forEach((instance) => {
    if (instance.url === registrationInfo.url) {
      exist = true;
      return;
    }
  });
  return exist;
};

module.exports = router;
