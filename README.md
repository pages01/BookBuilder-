# DoodlePress

A static coloring-book maker designed for GitHub Pages and mobile browsers.

## What it does

- Accepts a title, description, category, and 8–60 interior coloring pages.
- Offers Quick, Balanced, and Detailed art settings.
- Plans page ideas with a selectable local helper model.
- Creates a dedicated front cover and back cover, shown in preview and included in the PDF.
- Filters repeated page titles and repeated scene/decoration combinations.
- Exports US Letter PDFs in the browser.
- Saves the 18 most recent books in IndexedDB on the current device. The library does not sync across devices.

## Advanced AI menu

Open **Advanced AI** in the top-right corner to choose the drawing engine and page-planning helper.

### Image generation choices

1. **DoodlePress Vector Art — default.** Built-in SVG line-art engine. Instant, lightweight, sharp at print sizes, and works without WebGPU.
2. **Stable Diffusion Turbo — neural image generation.** Runs locally through ONNX Runtime Web and WebGPU at 512×512. The first download is approximately 2.6 GB. It creates a new illustration for each interior page. Important: the referenced SD-Turbo ONNX weights carry a Stability AI non-commercial license, so this option is for personal/non-commercial projects only. Check the model's license before using outputs in anything sold.
3. **Janus-Pro-1B — advanced neural image generation.** Runs locally through Transformers.js and WebGPU. The quantized ONNX export is approximately 2.3 GB. It is heavier than Vector Art and may not fit in lower-memory phones. The model is subject to the DeepSeek Model License, including its use-based restrictions; review that license before distributing an app or using outputs commercially.

The two neural options run in a dedicated module worker so model loading and inference do not block ordinary page interactions. Each generated raster image is converted to a high-contrast black-and-white outline image and embedded in the page SVG/PDF. Neural generation can take a long time for a 60-page book; keep the tab open until it finishes.

The browser image worker uses the MIT-licensed [web-txt2img](https://github.com/lacerbi/web-txt2img) package and loads its runtimes from public CDNs on first use. Model weights are downloaded directly from their model hosts. This is a client-side workflow; DoodlePress does not run its own image-generation server.

### Helper AI choices

- **LFM2.5-350M-ONNX — lightweight default.** Approximately 276 MB in the current quantized setup.
- **Qwen3-0.6B-ONNX — advanced helper.** Approximately 570 MB with WebGPU q4f16 or around 920 MB with CPU q4.

The selected helper is remembered in local storage. WebGPU is selected when available; otherwise the helper uses CPU/WASM q4. Transformers.js caches helper model files in the browser. The Advanced AI menu can remove the currently recorded helper cache.

## Model controls and storage

- **Prepare selected** downloads and loads the selected neural image model.
- **Unload image model** releases the currently loaded neural model from the worker; it does not delete downloaded files.
- **Clear SD-Turbo cache** removes the SD-Turbo files managed by the image-generation package. Janus model files are cached by Transformers.js separately and are not removed by this SD-Turbo control.
- Browser storage is best-effort. Safari and other browsers may clear cached model files to reclaim space.

## Performance notes

DoodlePress cannot force a browser or display to run at 120 FPS. The app is optimized to stay responsive on high-refresh-rate screens: neural inference runs in a worker, page cards are lazily decoded, off-screen cards use content visibility, preview nodes are inserted in one batch, and page generation yields between pages. Actual frame rate depends on the device, browser, GPU, and current workload.

## Run on GitHub Pages

1. Open the repository's Settings → Pages.
2. Under Build and deployment, choose Deploy from a branch.
3. Select branch `main` and folder `/(root)`, then save.
4. Open the Pages URL shown in that settings panel.

No build step or backend is required. Serve the app over HTTPS so WebGPU and module workers can be used.

## Browser notes

- Neural image generation requires WebGPU. If WebGPU is unavailable, choose Vector Art.
- The first neural model load needs internet access and several gigabytes of free storage.
- PDF generation loads jsPDF from jsDelivr the first time you export.
- The service worker caches the app shell and serves HTML network-first. Model caching is separate.
- Clearing Safari website data can remove saved books and cached models.
