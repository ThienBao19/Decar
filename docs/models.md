# 3D model pipeline

Every vehicle model on Decar is produced by one pipeline, so each update is
reproducible, reviewed the same way, and never edited by hand.

## Layout

```
assets/
  models/<id>/
    source.glb        original file, untouched (Git LFS)
    model.json        manifest: credit, which vehicles it matches, studio setup
  environments/<id>/
    source.hdr        studio lighting (Git LFS)
    env.json
  models.lock.json    hashes of source, build config and output per asset

apps/web/public/models/<id>.glb          build output, never edit
apps/web/public/environments/<id>.hdr    build output, never edit
apps/web/src/generated/model-registry.json  build output, read via lib/model-registry.ts
```

## Commands

| Command | What it does |
|---|---|
| `pnpm models:build` | Rebuilds every model whose source or build config changed (always from `source.glb`), writes the lock and the registry. `--force` rebuilds all. |
| `pnpm models:check` | Runs in CI. Fails on an invalid manifest, a disallowed license, output that doesn't match the lock (hand edits, forgotten rebuild), a stale registry, stray files, size/triangle budgets, or studio keys that match no material. |
| `pnpm models:snapshot` | Renders each studio model from four camera presets into `artifacts/model-snapshots/index.html`. Needs the web app running (`SNAPSHOT_BASE_URL`, default `http://localhost:3000`). |

The **3D models** workflow runs `models:check` and `models:snapshot` on every
pull request that touches models or the studio viewer, and attaches the
screenshots as the `model-snapshots` artifact for review.

## Adding or updating a model

1. Check the license. Allowed: `CC0-1.0`, `CC-BY-4.0` (credit is shown on `/credits`), `Proprietary` (ours), `Purchased`. Never non-commercial (NC) or "Editorial" models. Use `UNVERIFIED` only for legacy files while their origin is checked.
2. Put the original file at `assets/models/<id>/source.glb`. `<id>` is kebab-case, ideally make-model-generation (`bmw-m4-g82`). Replacing `source.glb` is how a model is updated.
3. Write `assets/models/<id>/model.json`:

```json
{
  "id": "bmw-m4-g82",
  "title": "BMW M4 Competition (G82)",
  "credit": { "author": "…", "license": "CC-BY-4.0", "source": "https://…" },
  "match": ["bmw m4 competition", "bmw m4"],
  "studio": {
    "lengthM": 4.79,
    "forward": "+z",
    "materials": { "body": { "roughness": 0.32, "clearcoat": 1, "clearcoatRoughness": 0.03 } },
    "paint": { "materials": ["body"], "presets": [{ "name": "Alpine White", "hex": "#f1f1ef" }] },
    "lights": { "head": ["led"], "tail": ["redlight"] }
  }
}
```

   - `match`: lowercase "make model" aliases; the longest alias that appears in a vehicle's make + model wins.
   - `studio`: add it **only when the model meets the realism bar** (PBR materials, correct proportions, visible interior). Without it the vehicle shows photos, not a 3D stand-in.
   - `lengthM`: real body length in metres; the model is scaled to it.
   - `forward`: axis the nose points along in the file. Check it with the snapshot: the `front34` image must show the front.
   - Keys under `materials`, `paint.materials` and `lights` are case-insensitive substrings of glTF material names; `models:check` rejects keys that match nothing.
   - `budgetException`: `{ "maxTriangles": n, "reason": "…" }` when a model legitimately exceeds 250k triangles.
4. Run `pnpm models:build`, then `pnpm models:check`.
5. Start the web app and run `pnpm models:snapshot`; open `artifacts/model-snapshots/index.html` and check all four views.
6. Commit `assets/`, `apps/web/public/models/`, `apps/web/public/environments/` and `apps/web/src/generated/` together.

## Changing the pipeline

Changes to the optimization steps in `scripts/models/build.mjs` must bump
`PIPELINE_VERSION` in `scripts/models/lib.mjs`; that changes every config hash,
so the next build regenerates all models and the diff shows exactly what moved.
Builds are deterministic: running `pnpm models:build --force` twice produces
byte-identical output.

## Budgets

- 250k triangles drawn per model (a mesh reused by several nodes counts each time).
- 3 MB per optimized file; textures are WebP, at most 2048 px.