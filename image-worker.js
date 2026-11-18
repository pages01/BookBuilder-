// DoodlePress image-model worker.
// Inference runs off the UI thread. Models and runtimes are loaded only when selected.
let apiPromise = null;
let loadedModel = null;
let loadingModel = null;
let ortPromise = null;
let clipPromise = null;
let janusPromise = null;

const send = (id,type,data={}) => self.postMessage({id,type,...data});
async function getApi() {
  if (!apiPromise) apiPromise = import("https://cdn.jsdelivr.net/npm/web-txt2img@0.3.1/dist/index.js");
  return apiPromise;
}
async function getOrt() {
  if (!ortPromise) ortPromise = import("https://esm.sh/onnxruntime-web@1.22.0/webgpu?bundle").then(m => m.default || m);
  return ortPromise;
}
async function getClipTokenizer() {
  if (!clipPromise) clipPromise = import("https://esm.sh/@xenova/transformers@2.17.2?bundle").then(async m => {
    const tokenizer = await m.AutoTokenizer.from_pretrained("Xenova/clip-vit-base-patch16");
    tokenizer.pad_token_id = 0;
    return (text,options) => tokenizer(text,options);
  });
  return clipPromise;
}
async function getJanusRuntime() {
  if (!janusPromise) janusPromise = import("https://esm.sh/@huggingface/transformers@3.7.2?bundle").then(m => {
    globalThis.transformers = m;
    return m;
  });
  return janusPromise;
}
async function load(model,id) {
  if (loadedModel === model) return {ok:true,alreadyLoaded:true};
  if (loadingModel) await loadingModel;
  if (loadedModel) {
    const oldApi = await getApi();
    await oldApi.unloadModel(loadedModel).catch(() => {});
    loadedModel = null;
  }
  loadingModel = (async () => {
    const api = await getApi();
    const options = {
      backendPreference:["webgpu"],
      onProgress:p => send(id,"progress",{progress:p})
    };
    if (model === "sd-turbo") {
      const [ort,tokenizerProvider] = await Promise.all([getOrt(),getClipTokenizer()]);
      options.ort = ort;
      options.tokenizerProvider = async () => tokenizerProvider;
    } else if (model === "janus-pro-1b") {
      await getJanusRuntime();
    }
    const result = await api.loadModel(model,options);
    if (!result || !result.ok) throw new Error(result?.message || result?.reason || "The image model could not load.");
    loadedModel = model;
    return result;
  })();
  try { return await loadingModel; }
  finally { loadingModel = null; }
}
self.addEventListener("message",async event => {
  const {id,type,model,prompt,seed} = event.data || {};
  if (!id || !type) return;
  try {
    if (type === "load") {
      const result = await load(model,id);
      send(id,"result",{result});
      return;
    }
    if (type === "generate") {
      if (loadedModel !== model) throw new Error("Prepare the selected image model before generating.");
      const api = await getApi();
      const result = await api.generateImage({
        model,
        prompt,
        seed,
        width:512,
        height:512,
        onProgress:p => send(id,"progress",{progress:p})
      });
      if (!result || !result.ok) throw new Error(result?.message || result?.reason || "Image generation failed.");
      send(id,"result",{blob:result.blob,timeMs:result.timeMs});
      return;
    }
    if (type === "unload") {
      if (loadedModel) {
        const api = await getApi();
        await api.unloadModel(loadedModel);
        loadedModel = null;
      }
      send(id,"result",{result:{ok:true}});
      return;
    }
    if (type === "purge") {
      const api = await getApi();
      if (loadedModel === model) {
        await api.unloadModel(model);
        loadedModel = null;
      }
      await api.purgeModelCache(model);
      send(id,"result",{result:{ok:true}});
      return;
    }
    throw new Error("Unknown image-worker request.");
  } catch(error) {
    send(id,"error",{message:error?.message || String(error)});
  }
});
