// src/workers/poseWorker.js
// Simple Web Worker to run MediaPipe Pose inference off the main thread.
// It receives an ImageBitmap via postMessage and returns landmark data.

self.importScripts('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');

let pose = null;
let initialized = false;

function init() {
  const Pose = self.Pose;
  if (!Pose) {
    console.error('MediaPipe Pose not available in worker');
    return;
  }
  pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });
  pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  pose.onResults((results) => {
    // Transfer only the landmarks (array of objects) back to main thread.
    self.postMessage({ landmarks: results.poseLandmarks || [] });
  });
  initialized = true;
}

self.onmessage = async (e) => {
  if (!initialized) init();
  const { imageBitmap } = e.data;
  if (pose && imageBitmap) {
    await pose.send({ image: imageBitmap });
    // The onResults handler will post back.
    // Release the bitmap to free memory.
    imageBitmap.close();
  }
};
