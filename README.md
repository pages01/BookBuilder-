# DoodlePress

A small, static coloring-book maker designed for GitHub Pages and mobile Safari.

## What it does

- Accepts a book title, description, category, and page count (8–60).
- Offers Quick, Balanced, and Detailed build settings. Higher settings add category-specific scenery, supporting objects, and decorative line art.
- Creates a varied page-by-page plan locally.
- Draws black-and-white SVG illustrations with thick printable outlines.
- Previews each page and exports a US Letter PDF in the browser.
- Saves the 18 most recent books in IndexedDB on the current device. The library is private to that browser profile and does not sync across devices.
- Includes a service worker for caching the app shell.

## Local planning model

The app automatically selects and prepares **onnx-community/LFM2.5-350M-ONNX** through **Transformers.js 4.3** when the page opens. It uses WebGPU with q4f16 when a compatible adapter is available, otherwise it uses the default CPU/WASM backend with q4 weights. The model download is approximately 276 MB. The first setup needs an internet connection; model files are cached by the browser for reuse. No model picker or manual download button is required.

The app does not send book descriptions to a DoodlePress server. Model inference happens in the browser after the files have been downloaded. iOS Safari may evict cached data to reclaim storage, so model persistence is best-effort rather than guaranteed.

## Artwork engine and image-model research

The active artwork renderer uses a local SVG scene builder. It now composes category-specific environments (for example: ocean waves and sea plants, space objects and stars, roads for vehicles, and outdoor scenery for animals), along with optional supporting subjects and decorative elements. Higher build settings create more layers and visual detail.

A promising neural image-generation candidate is **SD-Turbo ONNX**, approximately 2.4–2.6 GB. It is a genuine text-to-image diffusion model and can generate 512×512 images in browser WebGPU implementations. However, this is not currently installed or enabled in DoodlePress. A complete diffusion pipeline needs separate tokenizer, text encoder, UNet, scheduler, VAE, ONNX Runtime Web, and multi-gigabyte model storage. WebGPU availability alone does not prove that a specific iPhone Safari session has enough memory to run it. It remains an experimental future option pending real-device compatibility and memory testing.

The smaller planner model plans pages; it does not draw the images. DoodlePress does not claim neural image generation until that separate pipeline is actually integrated.

## Run on GitHub Pages

1. Open the repository's Settings → Pages.
2. Under Build and deployment, choose Deploy from a branch.
3. Select branch main and folder /(root), then save.
4. Open the Pages URL shown in that settings panel.

No build step or backend is required. Serve the app over HTTPS so Safari can use WebGPU and the service worker.

## Browser notes

- Safari 26+ has WebGPU support in current Transformers.js releases; DoodlePress targets Safari 27 on iOS.
- If WebGPU is unavailable or the planner model fails to load, the built-in local page planner still creates a book.
- PDF generation loads jsPDF from jsDelivr the first time you export, so the first PDF export needs an internet connection.
- The service worker caches the app shell only. Hugging Face model caching is handled by Transformers.js and browser storage.
- Saved books are stored in IndexedDB on the device. Clearing Safari website data can remove them.
