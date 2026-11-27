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
  "years": { "from": 2021 },
  "parts": { "wheels": ["m8rim"], "brakes": ["caliper"] },
  "studio": {
    "lengthM": 4.79,
    "forward": "+z",
    "materials": { "body": { "roughness": 0.32, "clearcoat": 1, "clearcoatRoughness": 0.03 } },
    "paint": { "materials": ["body"], "presets": [{ "name": "Alpine White", "hex": "#f1f1ef" }] },
    "lights": { "head": ["led"], "tail": ["redlight"] }
  }
}
```

   - `match`: lowercase "make model" aliases; matched as whole words (`bmw m4` does not match `BMW M440i`); the longest alias wins.
   - `years`: model years of this generation (`from`, optional `to`). Required with `studio`; other years show photos.
   - `studio`: add it **only when the model meets the realism bar** (PBR materials, correct proportions, visible interior). Without it the vehicle shows photos, not a 3D stand-in.
   - `lengthM`: real body length in metres; the model is scaled to it.
   - `forward`: axis the nose points along in the file. Check it with the snapshot: the `front34` image must show the front.
   - Keys under `materials`, `paint.materials` and `lights` are case-insensitive substrings of glTF material names; `models:check` rejects keys that match nothing.
   - `parts`: `{ "wheels": ["m8rim"], "brakes": ["caliper"] }`, material substrings of the wheel/tyre and brake geometry. Required with `studio`; see **Parts contract**.
   - `textureFixes`: `[{ "material": "interior7", "rect": [0, 0, 1, 0.0625], "color": "#262628", "reason": "…" }]` paints a rectangle (`[left, top, right, bottom]`, 0..1) of a material's base colour texture before compression, for atlas regions the author left as a placeholder. Prefer fixing the source; use this when the source is a third-party download.
   - `budgetException`: `{ "maxTriangles": n, "reason": "…" }` when a model legitimately exceeds 250k triangles.
4. Run `pnpm models:build`, then `pnpm models:check`.
5. Start the web app and run `pnpm models:snapshot`; open `artifacts/model-snapshots/index.html` and go through the **Realism checklist** on all four views.
6. Commit `assets/`, `apps/web/public/models/`, `apps/web/public/environments/` and `apps/web/src/generated/` together.

## Parts contract

Every studio model's output has these nodes, so the studio and the drive scene can move
parts without knowing anything about the source file:

| Node | Contents | Moves |
|---|---|---|
| `wheel_FL`, `wheel_FR`, `wheel_RL`, `wheel_RR` | rim, tyre, hub | spin about the car's lateral axis; front pair also steers about the vertical axis |
| `brake_FL` … `brake_RR` (when `parts.brakes` is set) | caliper, and disc if it shares the material | steers with its wheel, never spins |

- F/R and L/R are from the driver's seat: facing `studio.forward` with y up, left is up × forward.
- Each node is a direct child of the scene, with a translation (the wheel centre) and no rotation or scale; vertices are relative to that centre. A brake uses its wheel's centre, so both steer about the same pivot.
- The build makes these nodes: it takes the primitives whose material matches `parts.wheels` / `parts.brakes`, sorts their triangles into the four corners around the model's centre, and moves them to new nodes. So a source with all four wheels in one mesh works as is; the material substrings must not match body panels.
- `models:check` fails if a node is missing, not at its corner (usually a wrong `studio.forward`), has rotation or scale, or if the wheel diameter is outside 0.15–0.4 × the wheelbase.

## Realism checklist

A model gets `studio` only when it passes all of this; otherwise the vehicle shows photos.

Checked by `models:check`:
- [ ] License verified (`UNVERIFIED` is rejected for studio models)
- [ ] At least 50k triangles and 8 materials: below that it reads as a toy
- [ ] See-through glass (a BLEND material or a studio override with `opacity` < 1)
- [ ] At least one factory paint preset, head and tail light materials
- [ ] Parts contract met, wheel size plausible for the wheelbase

Checked by eye in the four snapshots:
- [ ] `front34` shows the front (otherwise `forward` is wrong)
- [ ] Proportions match photos of the real car: wheelbase, overhangs, roof height, wheel size
- [ ] Panel gaps, badges and lights are modelled, not painted flat
- [ ] An interior is visible through the glass, in plausible colours (use `textureFixes` for placeholder regions)
- [ ] Tyres have sidewalls and the rims have depth; brakes visible behind the spokes
- [ ] Paint reads as clear-coated: sharp reflections, no blotchy or faceted highlights
- [ ] No holes, flipped faces, floating parts, or z-fighting

## Studio environments

`env.json` takes an optional `softenAbove` luminance. Light sources brighter than it are averaged over themselves during the build, so a softbox's honeycomb grid doesn't show up as stripes on glossy paint; dimmer areas are untouched. Pick a value above the brightest wall (about 1.7 in `studio-small-09`) and below the lamps. Changing the algorithm in `scripts/models/hdr.mjs` must bump `ENV_PIPELINE_VERSION` in `lib.mjs`.

## Changing the pipeline

Changes to the optimization steps in `scripts/models/build.mjs` must bump
`PIPELINE_VERSION` in `scripts/models/lib.mjs`; that changes every config hash,
so the next build regenerates all models and the diff shows exactly what moved.
Builds are deterministic: running `pnpm models:build --force` twice produces
byte-identical output.

## Budgets

- 250k triangles drawn per model (a mesh reused by several nodes counts each time).
- 3 MB per optimized file; textures are WebP, at most 2048 px.