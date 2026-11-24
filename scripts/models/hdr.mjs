// Radiance .hdr codec and highlight softening for studio environments.
const LF = 10

function readHeader(buf) {
  let pos = 0
  const line = () => {
    const end = buf.indexOf(LF, pos)
    const text = buf.toString('latin1', pos, end)
    pos = end + 1
    return text
  }
  if (!line().startsWith('#?')) throw new Error('not a Radiance file')
  for (let text = line(); text !== ''; text = line()) {
    if (text.startsWith('FORMAT=') && text !== 'FORMAT=32-bit_rle_rgbe') throw new Error(`unsupported ${text}`)
  }
  const [sy, height, sx, width] = line().split(' ')
  if (sy !== '-Y' || sx !== '+X') throw new Error('unsupported orientation')
  return { width: Number(width), height: Number(height), pos }
}

export function decodeHdr(buf) {
  const { width, height, pos: start } = readHeader(buf)
  const rgb = new Float32Array(width * height * 3)
  const scan = new Uint8Array(width * 4)
  let pos = start
  for (let y = 0; y < height; y++) {
    if (buf[pos] !== 2 || buf[pos + 1] !== 2 || (buf[pos + 2] << 8 | buf[pos + 3]) !== width) throw new Error('unsupported scanline encoding')
    pos += 4
    for (let i = 0; i < width * 4;) {
      const n = buf[pos++]
      if (n > 128) {
        scan.fill(buf[pos++], i, i + n - 128)
        i += n - 128
      } else {
        scan.set(buf.subarray(pos, pos + n), i)
        pos += n
        i += n
      }
    }
    for (let x = 0; x < width; x++) {
      const e = scan[width * 3 + x]
      const f = e ? 2 ** (e - 136) : 0
      for (let c = 0; c < 3; c++) rgb[(y * width + x) * 3 + c] = scan[width * c + x] * f
    }
  }
  return { width, height, rgb }
}

function encodeChannel(bytes, out) {
  for (let i = 0; i < bytes.length;) {
    let run = 1
    while (run < 127 && i + run < bytes.length && bytes[i + run] === bytes[i]) run++
    if (run >= 4) {
      out.push(128 + run, bytes[i])
      i += run
      continue
    }
    const start = i
    while (i < bytes.length && i - start < 128) {
      const isRun = i + 3 < bytes.length && bytes[i] === bytes[i + 1] && bytes[i] === bytes[i + 2] && bytes[i] === bytes[i + 3]
      if (isRun) break
      i++
    }
    out.push(i - start, ...bytes.subarray(start, i))
  }
}

export function encodeHdr({ width, height, rgb }) {
  const out = []
  const scan = new Uint8Array(width * 4)
  for (let y = 0; y < height; y++) {
    out.push(2, 2, width >> 8, width & 255)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3
      const max = Math.max(rgb[i], rgb[i + 1], rgb[i + 2])
      let e = 0
      if (max > 1e-32) {
        while (2 ** e <= max) e++
        while (2 ** (e - 1) > max) e--
      }
      const f = max > 1e-32 ? 256 / 2 ** e : 0
      for (let c = 0; c < 3; c++) scan[width * c + x] = Math.min(255, Math.floor(rgb[i + c] * f))
      scan[width * 3 + x] = f ? e + 128 : 0
    }
    for (let c = 0; c < 4; c++) encodeChannel(scan.subarray(width * c, width * (c + 1)), out)
  }
  const header = ['#?RADIANCE', 'FORMAT=32-bit_rle_rgbe', '', `-Y ${height} +X ${width}`, ''].join(String.fromCharCode(LF))
  return Buffer.concat([Buffer.from(header, 'latin1'), Buffer.from(out)])
}

// Square neighbourhood sum; the panorama wraps horizontally
function boxSum(src, width, height, r) {
  const tmp = new Float64Array(src.length)
  const dst = new Float64Array(src.length)
  for (let y = 0; y < height; y++) {
    let sum = 0
    for (let k = -r; k <= r; k++) sum += src[y * width + ((k + width) % width)]
    for (let x = 0; x < width; x++) {
      tmp[y * width + x] = sum
      sum += src[y * width + ((x + r + 1) % width)] - src[y * width + ((x - r + width) % width)]
    }
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let sum = 0
      for (let k = Math.max(0, y - r); k <= Math.min(height - 1, y + r); k++) sum += tmp[k * width + x]
      dst[y * width + x] = sum
    }
  }
  return dst
}

const CLOSE_RADIUS = 4
const BLUR_RADIUS = 8
const FEATHER_RADIUS = 2

// Averages each light source over itself, so a softbox's honeycomb grid doesn't show up as
// stripes on glossy paint. Everything dimmer than `threshold` is left untouched.
export function softenHighlights({ width, height, rgb }, threshold) {
  const n = width * height
  const bright = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const l = 0.2126 * rgb[i * 3] + 0.7152 * rgb[i * 3 + 1] + 0.0722 * rgb[i * 3 + 2]
    bright[i] = l > threshold ? 1 : 0
  }
  // Close the gaps between bright grid cells: dilate, then erode
  const dilated = boxSum(bright, width, height, CLOSE_RADIUS).map((v) => (v > 0.5 ? 0 : 1))
  const region = boxSum(dilated, width, height, CLOSE_RADIUS).map((v) => (v > 0.5 ? 0 : 1))

  const weight = boxSum(region, width, height, BLUR_RADIUS)
  const feather = boxSum(region, width, height, FEATHER_RADIUS)
  const area = (FEATHER_RADIUS * 2 + 1) ** 2
  const out = new Float32Array(rgb)
  for (let c = 0; c < 3; c++) {
    const masked = Float64Array.from(region, (m, i) => m * rgb[i * 3 + c])
    const blurred = boxSum(masked, width, height, BLUR_RADIUS)
    for (let i = 0; i < n; i++) {
      if (!region[i]) continue
      const mix = Math.min(1, feather[i] / area)
      out[i * 3 + c] = rgb[i * 3 + c] * (1 - mix) + (blurred[i] / weight[i]) * mix
    }
  }
  return { width, height, rgb: out }
}