/**
 * Reencode audio & video without creating files first
 *
 * Requirements: ffmpeg, ether via a manual installation or via ffmpeg-static
 *
 * If you need more complex features like an output-stream you can check the older, more complex example:
 * https://github.com/fent/node-ytdl-core/blob/cc6720f9387088d6253acc71c8a49000544d4d2a/example/ffmpeg.js
 */

// Buildin with nodejs
const cp = require("child_process");
const readline = require("readline");
// External modules
const ytdl = require("ytdl-core");
const ffmpeg = require("ffmpeg-static");
const { format } = require("express/lib/response");
// Global constants
// const ref = "https://www.youtube.com/watch?v=nPH2V2zHTZY&list=PLUs4zudZmNG9q_uEAHmGfrI49frt27QJG&index=15";
const tracker = {
  start: Date.now(),
  audio: { downloaded: 0, total: Infinity },
  video: { downloaded: 0, total: Infinity },
  merged: { frame: 0, speed: "0x", fps: 0 },
};

let qualityLevels = {
  highres: "AUDIO_QUALITY_MEDIUM",
  hd2160: "AUDIO_QUALITY_MEDIUM",
  hd1440: "AUDIO_QUALITY_MEDIUM",
  hd1080: "AUDIO_QUALITY_MEDIUM",
  hd720: "AUDIO_QUALITY_MEDIUM",
  large: "AUDIO_QUALITY_MEDIUM",
  medium: "AUDIO_QUALITY_LOW",
  small: "AUDIO_QUALITY_LOW",
  tiny: "AUDIO_QUALITY_LOW",
};

// Get audio and video streams
const converterPromise =(url, quality)=>new Promise(async (res, reject) => {

  console.log({ url }, { quality });

  let info = await ytdl.getInfo(ytdl.getVideoID(url));
  let video_title = info.videoDetails.title;
  let output = `temp/${video_title.replace(/[^a-zA-Z0-9 ]/g,"")} ${quality}.mp4`;
  let audioFormats = ytdl.filterFormats(info.formats, "audioonly");
  let videoFormats = ytdl.filterFormats(info.formats, "videoonly");

  console.log(videoFormats.map((v) => v.quality));
  console.log(
    audioFormats.map((v) => {
      return v.mimeType, v.audioQuality;
    })
  );
  const audio = ytdl(url, {
    filter: (format) => format.audioQuality === qualityLevels[quality],
  }).on("progress", (_, downloaded, total) => {
    tracker.audio = { downloaded, total };
  });
  const video = ytdl(url, {
    filter: (format) => format.quality === quality,
  }).on("progress", (_, downloaded, total) => {
    tracker.video = { downloaded, total };
  });

  // Prepare the progress bar
  let progressbarHandle = null;
  const progressbarInterval = 1000;
  const showProgress = () => {
    readline.cursorTo(process.stdout, 0);
    const toMB = (i) => (i / 1024 / 1024).toFixed(2);

    process.stdout.write(
      `Audio | ${(
        (tracker.audio.downloaded / tracker.audio.total) *
        100
      ).toFixed(2)}% processed `
    );
    process.stdout.write(
      `(${toMB(tracker.audio.downloaded)}MB of ${toMB(
        tracker.audio.total
      )}MB).${" ".repeat(10)}\n`
    );

    process.stdout.write(
      `Video  | ${(
        (tracker.video.downloaded / tracker.video.total) *
        100
      ).toFixed(2)}% processed `
    );
    process.stdout.write(
      `(${toMB(tracker.video.downloaded)}MB of ${toMB(
        tracker.video.total
      )}MB).${" ".repeat(10)}\n`
    );

    process.stdout.write(`Merged | processing frame ${tracker.merged.frame} `);
    process.stdout.write(
      `(at ${tracker.merged.fps} fps => ${tracker.merged.speed}).${" ".repeat(
        10
      )}\n`
    );

    process.stdout.write(
      `running for: ${((Date.now() - tracker.start) / 1000 / 60).toFixed(
        2
      )} Minutes.`
    );
    readline.moveCursor(process.stdout, 0, -3);
  };

  // Start the ffmpeg child process
  const ffmpegProcess = cp.spawn(
    ffmpeg,
    [
      // Remove ffmpeg's console spamming
      "-loglevel",
      "8",
      "-hide_banner",
      // Redirect/Enable progress messages
      "-progress",
      "pipe:3",
      // Set inputs
      "-i",
      "pipe:4",
      "-i",
      "pipe:5",
      // Map audio & video from streams
      "-map",
      "0:a",
      "-map",
      "1:v",
      // Keep encoding
      "-c:v",
      "copy",
      // Define output file
      output,
    ],
    {
      windowsHide: true,
      stdio: [
        /* Standard: stdin, stdout, stderr */
        "inherit",
        "inherit",
        "inherit",
        /* Custom: pipe:3, pipe:4, pipe:5 */
        "pipe",
        "pipe",
        "pipe",
      ],
    }
  );
  ffmpegProcess.on("close", () => {
    console.log("done");
    res(output)
    // Cleanup
    process.stdout.write("\n\n\n\n");
    clearInterval(progressbarHandle);
  });

  // Link streams
  // FFmpeg creates the transformer streams and we just have to insert / read data
  ffmpegProcess.stdio[3].on("data", (chunk) => {
    // Start the progress bar
    if (!progressbarHandle)
      progressbarHandle = setInterval(showProgress, progressbarInterval);
    // Parse the param=value list returned by ffmpeg
    const lines = chunk.toString().trim().split("\n");
    const args = {};
    for (const l of lines) {
      const [key, value] = l.split("=");
      args[key.trim()] = value.trim();
    }
    tracker.merged = args;
  });
  audio.pipe(ffmpegProcess.stdio[4]);
  video.pipe(ffmpegProcess.stdio[5]);
  return output;

});

// const converter = async (url, quality) => {
//   console.log({ url }, { quality });

//   let info = await ytdl.getInfo(ytdl.getVideoID(url));
//   let video_title = info.videoDetails.title;
//   let output = `temp/${video_title.replace(
//     /[^a-zA-Z0-9 ]/g,
//     ""
//   )} ${quality}.mp4`;
//   let audioFormats = ytdl.filterFormats(info.formats, "audioonly");
//   let videoFormats = ytdl.filterFormats(info.formats, "videoonly");

//   console.log(videoFormats.map((v) => v.quality));
//   console.log(
//     audioFormats.map((v) => {
//       return v.mimeType, v.audioQuality;
//     })
//   );
//   const audio = ytdl(url, {
//     filter: (format) => format.audioQuality === qualityLevels[quality],
//   }).on("progress", (_, downloaded, total) => {
//     tracker.audio = { downloaded, total };
//   });
//   const video = ytdl(url, {
//     filter: (format) => format.quality === quality,
//   }).on("progress", (_, downloaded, total) => {
//     tracker.video = { downloaded, total };
//   });

//   // Prepare the progress bar
//   let progressbarHandle = null;
//   const progressbarInterval = 1000;
//   const showProgress = () => {
//     readline.cursorTo(process.stdout, 0);
//     const toMB = (i) => (i / 1024 / 1024).toFixed(2);

//     process.stdout.write(
//       `Audio  | ${(
//         (tracker.audio.downloaded / tracker.audio.total) *
//         100
//       ).toFixed(2)}% processed `
//     );
//     process.stdout.write(
//       `(${toMB(tracker.audio.downloaded)}MB of ${toMB(
//         tracker.audio.total
//       )}MB).${" ".repeat(10)}\n`
//     );

//     process.stdout.write(
//       `Video  | ${(
//         (tracker.video.downloaded / tracker.video.total) *
//         100
//       ).toFixed(2)}% processed `
//     );
//     process.stdout.write(
//       `(${toMB(tracker.video.downloaded)}MB of ${toMB(
//         tracker.video.total
//       )}MB).${" ".repeat(10)}\n`
//     );

//     process.stdout.write(`Merged | processing frame ${tracker.merged.frame} `);
//     process.stdout.write(
//       `(at ${tracker.merged.fps} fps => ${tracker.merged.speed}).${" ".repeat(
//         10
//       )}\n`
//     );

//     process.stdout.write(
//       `running for: ${((Date.now() - tracker.start) / 1000 / 60).toFixed(
//         2
//       )} Minutes.`
//     );
//     readline.moveCursor(process.stdout, 0, -3);
//   };

//   // Start the ffmpeg child process
//   const ffmpegProcess = cp.spawn(
//     ffmpeg,
//     [
//       // Remove ffmpeg's console spamming
//       "-loglevel",
//       "8",
//       "-hide_banner",
//       // Redirect/Enable progress messages
//       "-progress",
//       "pipe:3",
//       // Set inputs
//       "-i",
//       "pipe:4",
//       "-i",
//       "pipe:5",
//       // Map audio & video from streams
//       "-map",
//       "0:a",
//       "-map",
//       "1:v",
//       // Keep encoding
//       "-c:v",
//       "copy",
//       // Define output file
//       output,
//     ],
//     {
//       windowsHide: true,
//       stdio: [
//         /* Standard: stdin, stdout, stderr */
//         "inherit",
//         "inherit",
//         "inherit",
//         /* Custom: pipe:3, pipe:4, pipe:5 */
//         "pipe",
//         "pipe",
//         "pipe",
//       ],
//     }
//   );
//   ffmpegProcess.on("close", () => {
//     console.log("done");
//     // Cleanup
//     process.stdout.write("\n\n\n\n");
//     clearInterval(progressbarHandle);
//   });

//   // Link streams
//   // FFmpeg creates the transformer streams and we just have to insert / read data
//   ffmpegProcess.stdio[3].on("data", (chunk) => {
//     // Start the progress bar
//     if (!progressbarHandle)
//       progressbarHandle = setInterval(showProgress, progressbarInterval);
//     // Parse the param=value list returned by ffmpeg
//     const lines = chunk.toString().trim().split("\n");
//     const args = {};
//     for (const l of lines) {
//       const [key, value] = l.split("=");
//       args[key.trim()] = value.trim();
//     }
//     tracker.merged = args;
//   });
//   audio.pipe(ffmpegProcess.stdio[4]);
//   video.pipe(ffmpegProcess.stdio[5]);
//   return output;
// };

module.exports = converterPromise;
