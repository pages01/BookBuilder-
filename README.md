# DoodlePress

A static coloring-book maker designed for GitHub Pages and mobile Safari.

## What it does

- Accepts a title, description, category, and 8–60 **interior coloring pages**.
- Offers Quick, Balanced, and Detailed art settings.
- Plans a distinct scene for each interior page and filters duplicate page titles before drawing.
- Creates a dedicated front cover and back cover, shown in the preview and included in the exported PDF.
- Draws printable black-and-white SVG line art for interior pages.
- Exports US Letter PDFs in the browser.
- Saves the 18 most recent books in IndexedDB on the current device. The library does not sync across devices.

## Advanced AI menu

Open **Advanced AI** in the top-right corner to manage the models used by DoodlePress.

### Image generation choices

1. **DoodlePress Vector Art — Available now.** The active local SVG drawing engine. It makes crisp, printable line art without a large image-model download.
2. **SD-Turbo ONNX WebGPU — Coming soon.** A genuine text-to-image diffusion option, but it needs a separate browser diffusion pipeline, ONNX Runtime Web, and large model files. It is listed as a planned option and is not yet connected to generation.
3. **Sana 0.6B ONNX WebGPU — Experimental.** A much heavier neural image-generation candidate for devices with substantial GPU memory. It is not currently integrated and is not recommended for typical phones.

The neural image options are deliberately labeled as unavailable until their complete generation pipelines have been integrated and tested on real devices. The page planner is not an image model and does not draw the artwork.

### Helper AI choices

- **LFM2.5-350M-ONNX — Lightweight default.** Approximately 276 MB for the current quantized setup. A compact text model for planning page ideas.
- **Qwen3-0.6B-ONNX — Advanced.** Approximately 570 MB for the q4f16 WebGPU model or around 920 MB for the q4 CPU model. A larger text helper for more involved page planning.

The selected helper is remembered in local storage and automatically prepared when DoodlePress opens. The app detects WebGPU and selects q4f16 when possible; otherwise it uses the CPU/WASM q4 version. Model files are cached by Transformers.js using a stable cache key. When switching models, DoodlePress removes the previously recorded DoodlePress helper cache after the replacement loads successfully. It does not clear unrelated browser caches.

## Privacy and browser storage

Book descriptions and generated pages stay in the browser; DoodlePress has no generation server. The first model setup requires an internet connection. Later visits reuse the browser cache when available. Browser-managed storage is best-effort, and iOS Safari can evict cached files to reclaim space. The Advanced AI menu includes a control to remove the currently recorded helper model cache.

## Run on GitHub Pages

1. Open the repository's Settings → Pages.
2. Under Build and deployment, choose Deploy from a branch.
3. Select branch `main` and folder `/(root)`, then save.
4. Open the Pages URL shown in that settings panel.

No build step or backend is required. Serve the app over HTTPS so Safari can use WebGPU and the service worker.

## Browser notes

- If WebGPU is unavailable or the selected helper fails to load, the built-in local page planner still creates a book.
- PDF generation loads jsPDF from jsDelivr the first time you export, so the first PDF export needs an internet connection.
- The service worker caches the app shell, serves HTML network-first, and removes obsolete DoodlePress shell caches on update. Model caching is handled separately by Transformers.js and browser storage.
- Clearing Safari website data can remove saved books and cached model files.
