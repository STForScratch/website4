const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const express = require("express");
const path = require("path");
var bodyParser = require("body-parser");
var jsonParser = bodyParser.json();
app = express();

const fs = require("fs");

let redirects = {};

async function getRedirects() {
  redirects = await (
    await fetch(
      "https://raw.githubusercontent.com/STForScratch/website3/main/data/redirects.json#nocache=" +
        Date.now().toString() +
        "?nocache=" +
        Date.now().toString()
    )
  ).json();
  return redirects;
}

getRedirects();

app.get("/index.js", async function (req, res) {
  res.sendStatus(404);
});

app.get("/style.css", async function (req, res) {
  res.sendFile(path.join(__dirname, "/style.css"));
});

const PORT = 3000;
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");
app.set("views", __dirname);

async function getUsercount() {
  return (
    await (
      await fetch(
        "https://raw.githubusercontent.com/STForScratch/website3/main/data/usercount.json"
      )
    ).json()
  ).count;
}

let acceptedLanguages = {
  en: true,
  ja: true,
  tr: true,
  fr: true,
};

function getLanguage(req) {
  if (!req.handshake) {
    const value = `; ${req.headers.cookie}`;
    const parts = value.split(`; ${"lang"}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
  } else {
    const value = `; ${req.handshake.headers.cookie}`;
    const parts = value.split(`; ${"lang"}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
  }
}

async function getLocalization(req) {
  let language = acceptedLanguages[getLanguage(req)?.split("-")[0]]
    ? getLanguage(req)?.split("-")[0]
    : acceptedLanguages[req.headers["accept-language"]?.split("-")[0]]
    ? req.headers["accept-language"]?.split("-")[0]
    : "en";
  let data = JSON.parse(fs.readFileSync(path.join(__dirname, `/i18n/${language}.json`), "utf8"));
  const inputString = JSON.stringify({
    data,
    language,
  });

  const textEncoder = new TextEncoder();
  const encodedBytes = textEncoder.encode(inputString);
  const base64String = btoa(String.fromCharCode.apply(null, encodedBytes));

  return base64String;
}

app.get("/", async function (req, res) {
  res.render(path.join(__dirname, "/pages/index.html"), {
    count: await getUsercount(),
    language: await getLocalization(req),
  });
});

app.get("/flag/:country/", function(req, res) {
  res.sendFile(path.join(__dirname, `/i18n/flags/${req.params.country}.svg`))
})

app.get("/scratchformat/", async function (req, res) {
  res.render(path.join(__dirname, "/pages/scratchformat.html"), {
    language: await getLocalization(req),
  });
});

app.get("/goodbye/", async function (req, res) {
  let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (req.query.code && req.query.installed && req.query.version) {
    try {
      let data = await (
        await fetch("https://data.scratchtools.app/uninstall/", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            server: process.env.server,
            timeInstalled: !!new Date(
              Number(req.query.installed.toString())
            ).getTime()
              ? new Date(Number(req.query.installed.toString()))
                  .getTime()
                  .toString()
              : null,
            timeUninstalled: Date.now(),
            features: req.query.code || null,
            username: req.query.username || null,
            version: req.query.version || null,
            ip,
          }),
        })
      ).json();
    } catch (err) {}
  }
  res.render(path.join(__dirname, "/pages/goodbye.html"), {
    language: await getLocalization(req),
  });
});

app.get("/contributors/", async function (req, res) {
  res.render(path.join(__dirname, "/pages/contributors.html"), {
      language: await getLocalization(req),
    credits: btoa(
      JSON.stringify(
        await (
          await fetch(
            "https://raw.githubusercontent.com/STForScratch/website3/main/data/contributors.json"
          )
        ).json()
      )
    ),
  });
});

app.get("/credits/", async function (req, res) {
  res.render(path.join(__dirname, "/pages/contributors.html"), {
      language: await getLocalization(req),
    credits: btoa(
      JSON.stringify(
        await (
          await fetch(
            "https://raw.githubusercontent.com/STForScratch/website3/main/data/contributors.json"
          )
        ).json()
      )
    ),
  });
});

app.get("/feedback/", async function (req, res) {
  res.render(path.join(__dirname, "/pages/feedback.html"), {
    language: await getLocalization(req),
  });
});

app.get("/features/", async function (req, res) {
  let data = JSON.parse(
    fs.readFileSync(path.join(__dirname, "/features.json"), {
      encoding: "utf8",
      flag: "r",
    })
  );
  res.render(path.join(__dirname, "/pages/features.html"), {
    features: btoa(JSON.stringify(data)),
    language: await getLocalization(req),
  });
});

app.get("/discord/", function (req, res) {
  res.redirect("https://discord.gg/rwAs5jDrTQ");
});

app.get("/docs/", function (req, res) {
  res.redirect("https://docs.scratchtools.app/docs/intro");
});

app.get("/blog/", function (req, res) {
  res.redirect("https://docs.scratchtools.app/blog");
});

app.get("/images/:file", function (req, res) {
  res.sendFile(path.join(__dirname, "/images/" + req.params.file));
});

app.get("/cache/", async function (req, res) {
  await getRedirects();
  res.send({
    success: true,
  });
});

app.get("/:code", function (req, res, next) {
  if (redirects[req.params.code]) {
    res.redirect(redirects[req.params.code]);
  } else {
    next();
  }
});

app.get("/wrapped/", function(req, res) {
  res.redirect("https://wrapped.scratchtools.app")
})

app.get("/awards/", function(req, res) {
  res.redirect("https://data.scratchtools.app/submission/")
})

app.get("/projects/:user/:offset/", async function(req, res) {
  let data = await (await fetch(`https://api.scratch.mit.edu/users/${req.params.user}/projects?limit=40&offset=${req.params.offset}`)).json()
  res.send(data)
})

app.use(async function (req, res) {
  res.render(path.join(__dirname, "/pages/404.html"), {
    language: await getLocalization(req),
  });
});

app.listen(PORT);
