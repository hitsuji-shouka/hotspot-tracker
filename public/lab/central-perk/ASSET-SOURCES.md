# Central Perk asset sources

- `porsche/cayman.glb`: reduced geometry from the Porsche 718 Cayman example supplied by the user, https://dyadstudios.com/renderapp/porsche/ (page author: Marquizzo / Dyad Studios). Source model: `assetsPorsche/gltf/porsche_full.gltf` and its buffer. Geometry is not authored by this project. Original manifest and download are retained locally under `state/central-perk-reference`; `scripts/prepare-perk-porsche.mjs` builds the reduced local asset. The site's custom shaders are not included; the scene uses new Three.js physical/standard materials.
- `friends-cafe.jpg`: user-provided photo `E:/摄影/壁纸/咖啡馆.jpg`, showing the six friends on the couch; current wall-screen image.
- `friends-still.jpg`: user-provided Central Perk photo (`codex-clipboard-676a1441-d7cf-4f63-ae03-07648e2312fd.jpg`), previous wall-screen image and window-logo reference.
- Window logo: canvas drawing based on the same user-provided photo (arched red CENTRAL, green PERK plaque, gold cups and steam).
