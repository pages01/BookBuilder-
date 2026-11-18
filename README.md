# DoodlePress

A small, static coloring-book maker designed for GitHub Pages and mobile Safari.

## What it does

- Accepts a book title, description, category, and page count (8–60).
- Creates a page-by-page plan locally.
- Draws simple black-and-white SVG illustrations that are crisp at print size.
- Previews each page and exports a US Letter PDF in the browser.
- Includes a service worker for caching the app shell.

## Local planner model

The optional language planner is **onnx-community/LFM2.5-350M-ONNX** through **Transformers.js 4.3**. It requests the 4-bit q4f16 variant and uses WebGPU. The selected quantized model is approximately 276 MB. The first model setup needs an internet connection; model files are fetched from Hugging Face and cached by the browser for reuse.

The app does not send book descriptions to a DoodlePress server. Model inference happens in the browser after the files have been downloaded. iOS Safari may evict cached data to reclaim storage, so model persistence is best-effort rather than guaranteed.

## Artwork approach

The first release intentionally uses a local SVG scene builder, not a neural text-to-image diffusion model. It draws uncomplicated, high-contrast outlines from a set of safe, editable vector motifs. This keeps the app usable on iPhone and avoids asking a phone browser to download and hold a multi-gigabyte diffusion model. The language model plans page ideas; the vector engine renders the printable line art.

## Run on GitHub Pages

1. Open the repository's Settings → Pages.
2. Under Build and deployment, choose Deploy from a branch.
3. Select branch main and folder /(root), then save.
4. Open the Pages URL shown in that settings panel.

No build step or backend is required. Serve the app over HTTPS so Safari can use WebGPU and the service worker.

## Browser notes

- Safari 26+ has WebGPU support in current Transformers.js releases; DoodlePress targets Safari 27 on iOS.
- If WebGPU is unavailable or the model fails to load, the built-in local page planner still creates a book.
- PDF generation loads jsPDF from jsDelivr the first time you export, so the first PDF export needs an internet connection.
- The service worker caches the app shell only. Hugging Face model caching is handled by Transformers.js and browser storage.
