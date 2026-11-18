// DoodlePress ImageTrace worker.
// Loads the small Informative Drawings ONNX model once, caches its weights,
// and converts source images off the main UI thread.
const MODEL_URL = "https://huggingface.co/rocca/informative-drawings-line-art-onnx/resolve/main/model.onnx";
const MODEL_CACHE = "doodlepress-lineart-model-v1";
let ortPromise = null;
let session = null;
let sessionPromise = null;

const send = (id,type,data={}) => self.postMessage({id,type,...data});

async function getOrt() {
  if (!ortPromise) {
    ortPromise = import("https://esm.sh/onnxruntime-web@1.22.0?bundle").then(module => module.default || module);
  }
  return ortPromise;
}

async function readModelResponse(response,id) {
  const total = Number(response.headers.get("content-length") || 0);
  if (!response.body || !response.body.getReader) {
    const buffer = await response.arrayBuffer();
    send(id,"progress",{progress:{pct:100,message:"Line-art model downloaded."}});
    return buffer;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const {done,value} = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    const pct = total ? Math.min(99,Math.round(received / total * 100)) : null;
    send(id,"progress",{progress:{
      pct,
      message:total
        ? "Downloading ImageTrace model · " + (received/1048576).toFixed(1) + " / " + (total/1048576).toFixed(1) + " MB"
        : "Downloading ImageTrace model · " + (received/1048576).toFixed(1) + " MB"
    }});
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk,offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}

async function fetchModelBuffer(id) {
  if ("caches" in self) {
    try {
      const cache = await caches.open(MODEL_CACHE);
      const cached = await cache.match(MODEL_URL);
      if (cached) {
        send(id,"progress",{progress:{pct:100,message:"Using the saved ImageTrace model."}});
        return await cached.arrayBuffer();
      }
    } catch (error) {
      send(id,"progress",{progress:{message:"Browser model cache unavailable; downloading normally."}});
    }
  }
  const response = await fetch(MODEL_URL,{mode:"cors",credentials:"omit"});
  if (!response.ok) throw new Error("Could not download the ImageTrace model (HTTP " + response.status + ").");
  const buffer = await readModelResponse(response,id);
  if ("caches" in self) {
    try {
      const cache = await caches.open(MODEL_CACHE);
      await cache.put(MODEL_URL,new Response(buffer.slice(0),{
        headers:{"Content-Type":"application/octet-stream","Content-Length":String(buffer.byteLength)}
      }));
    } catch (error) {
      send(id,"progress",{progress:{message:"Model loaded; this browser could not keep a separate model cache."}});
    }
  }
  return buffer;
}

async function loadModel(id) {
  if (session) return {ok:true,alreadyLoaded:true};
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    send(id,"progress",{progress:{pct:1,message:"Preparing ONNX Runtime for ImageTrace…"}});
    const ort = await getOrt();
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    const modelBuffer = await fetchModelBuffer(id);
    send(id,"progress",{progress:{pct:99,message:"Loading the ImageTrace line-art network…"}});
    session = await ort.InferenceSession.create(modelBuffer,{
      executionProviders:["wasm"],
      graphOptimizationLevel:"all"
    });
    send(id,"progress",{progress:{pct:100,message:"ImageTrace is ready."}});
    return {ok:true,model:"Informative Drawings ONNX"};
  })();
  try {
    return await sessionPromise;
  } finally {
    sessionPromise = null;
  }
}

function makeCanvas(width,height) {
  if (typeof OffscreenCanvas === "undefined") {
    throw new Error("This browser does not support worker canvas processing. Use SketchForge on this browser.");
  }
  return new OffscreenCanvas(width,height);
}

async function convertImage(blob,id) {
  if (!session) await loadModel(id);
  const ort = await getOrt();
  if (typeof createImageBitmap !== "function") throw new Error("This browser cannot decode source images in the image worker.");
  const bitmap = await createImageBitmap(blob);
  try {
    // Keep enough resolution for a printable page while limiting phone memory use.
    const longest = Math.max(bitmap.width,bitmap.height);
    const scale = Math.min(1,512 / longest);
    const width = Math.max(128,Math.round(bitmap.width * scale / 32) * 32);
    const height = Math.max(128,Math.round(bitmap.height * scale / 32) * 32);
    const canvas = makeCanvas(width,height);
    const context = canvas.getContext("2d",{willReadFrequently:true});
    if (!context) throw new Error("Could not prepare the source image.");
    context.fillStyle = "#ffffff";
    context.fillRect(0,0,width,height);
    context.drawImage(bitmap,0,0,width,height);
    const pixels = context.getImageData(0,0,width,height).data;
    const plane = width * height;
    const inputData = new Float32Array(plane * 3);
    for (let p=0, i=0; p<plane; p++,i+=4) {
      inputData[p] = pixels[i] / 255;
      inputData[plane+p] = pixels[i+1] / 255;
      inputData[plane*2+p] = pixels[i+2] / 255;
    }
    const input = new ort.Tensor("float32",inputData,[1,3,height,width]);
    send(id,"progress",{progress:{message:"Turning the source image into clean contours…"}});
    const result = await session.run({input});
    const output = result.output || result[Object.keys(result)[0]];
    if (!output || !output.data || !output.dims || output.dims.length !== 4) {
      throw new Error("The line-art model returned an unexpected image.");
    }
    const outWidth = output.dims[3];
    const outHeight = output.dims[2];
    const outCanvas = makeCanvas(outWidth,outHeight);
    const outContext = outCanvas.getContext("2d");
    if (!outContext) throw new Error("Could not create the finished outline.");
    const image = outContext.createImageData(outWidth,outHeight);
    const data = image.data;
    // Threshold the grayscale output to pure black and white for coloring-book printing.
    for (let p=0; p<output.data.length; p++) {
      const intensity = Math.max(0,Math.min(1,Number(output.data[p])));
      const value = intensity < 0.78 ? 0 : 255;
      const i = p * 4;
      data[i] = data[i+1] = data[i+2] = value;
      data[i+3] = 255;
    }
    outContext.putImageData(image,0,0);
    const outputBlob = await outCanvas.convertToBlob({type:"image/png"});
    send(id,"progress",{progress:{pct:100,message:"Outline conversion finished."}});
    return outputBlob;
  } finally {
    bitmap.close?.();
  }
}

self.addEventListener("message",async event => {
  const {id,type,blob} = event.data || {};
  if (!id || !type) return;
  try {
    if (type === "load") {
      const result = await loadModel(id);
      send(id,"result",{result});
      return;
    }
    if (type === "convert") {
      if (!session) await loadModel(id);
      const outputBlob = await convertImage(blob,id);
      send(id,"result",{blob:outputBlob});
      return;
    }
    if (type === "unload") {
      session = null;
      send(id,"result",{result:{ok:true}});
      return;
    }
    throw new Error("Unknown ImageTrace worker request: " + type);
  } catch (error) {
    send(id,"error",{message:error && error.message ? error.message : String(error)});
  }
});
