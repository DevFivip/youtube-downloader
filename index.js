const fs = require("fs");
const express = require("express");
const config = require("./config");
const app = express();
const path = require('path');
const ytdl = require("ytdl-core");
const { title } = require("./config");
const { param } = require("express/lib/request");
const converter = require("./convertidor");

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// // catch 404 and forward to error handler
// app.use(function (req, res, next) {
//     next(createError(404));
// });

// error handler
// app.use(function (err, req, res, next) {
//     // set locals, only providing error in development
//     res.locals.message = err.message;
//     res.locals.error = req.app.get('env') === 'development' ? err : {};

//     // render the error page
//     res.status(err.status || 500);
//     res.render('error', { title: config.errorTitle, config: config });
// });

app.get("/", function (req, res, next) {
  res.render("index", { title: config.title, config: config });
});

app.get("/download", async (req, res) => {
  let v_id = req.query.url.split("v=")[1];
  const info = await ytdl.getInfo(req.query.url);
  console.log("FORMAT 4", info.formats[4]);
  console.log("FORMAT 1", info.formats[1]);

  let params = new URLSearchParams(req.query.url);
  v = params.get("https://www.youtube.com/watch?v");

  if (!!!v) {
    console.log(req.query.url);
    v = req.query.url.split("/")[3];
    v_id = req.query.url.split("/")[3];
  }

  console.log({ params }, { v });

  return res.render("download", {
    title: config.title,
    config: config,
    video_title: info.videoDetails.title,
    imagen: `https://img.youtube.com/vi/${v}/sddefault.jpg`,
    url: "https://www.youtube.com/embed/" + v_id,
    info: info.formats.sort((a, b) => {
      return a.mimeType < b.mimeType;
    }),
  });
});

app.get("/watch", async (req, res) => {
  let v_id = req.query.v;

  console.log(v_id);
  const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${v_id}`);

  // console.log("FORMAT 4", info.formats[4]);
  // console.log("FORMAT 1", info.formats[1]);

  let params = new URLSearchParams(req.query.url);
  v = v_id;

  if (!!!v) {
    console.log(req.query.url);
    v = req.query.url.split("/")[3];
    v_id = req.query.url.split("/")[3];
  }

  console.log({ params }, { v });

  return res.render("download", {
    title: config.title,
    config: config,
    video_title: info.videoDetails.title,
    imagen: `https://img.youtube.com/vi/${v}/sddefault.jpg`,
    url: "https://www.youtube.com/embed/" + v_id,
    info: info.formats.sort((a, b) => {
      return a.mimeType < b.mimeType;
    }),
  });
});

app.get("/r", function (req, res, next) {
  const { url, title, format } = req.query;

  console.log({ url, title, format });
  res.header("Content-Disposition", `attachement; filename=${title}.mp4`);

  ytdl(url, {
    quality: "highest",
    format: "mp4",
  }).pipe(res);
});

app.get("/c", async (req, res, next) => {

  const { url, quality } = req.query;

  // url = "https://www.youtube.com/watch?v=Tpv5ibeHdcE";
  const file = await converter(url,quality);
  var fileLocation = path.join('./',file);
  res.download(fileLocation, file); 


});

app.listen(3003, () => {
  console.log("Server is running on http://localhost:3003");
});
