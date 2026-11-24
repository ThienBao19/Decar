import * as THREE from 'three'

// Reflector's stock shader blends with "overlay", which blows out HDR highlights and nearly
// ignores the mirror colour. This one scales the reflection, blurs it slightly like polished
// concrete, and weights bright samples down so sharp highlights don't turn into dots.
export const FLOOR_REFLECTION_SHADER = {
  name: 'FloorReflection',
  uniforms: {
    color: { value: new THREE.Color() },
    tDiffuse: { value: null },
    textureMatrix: { value: new THREE.Matrix4() },
    strength: { value: 0.4 },
    blurPixels: { value: 3.5 },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform float strength;
    uniform float blurPixels;
    varying vec4 vUv;
    const int SAMPLES = 16;
    const float GOLDEN_ANGLE = 2.39996323;
    void main() {
      vec2 uv = vUv.xy / vUv.w;
      vec2 texel = blurPixels / vec2(textureSize(tDiffuse, 0));
      vec3 sum = vec3(0.0);
      float total = 0.0;
      for (int i = 0; i < SAMPLES; i++) {
        float r = sqrt((float(i) + 0.5) / float(SAMPLES));
        float a = float(i) * GOLDEN_ANGLE;
        vec3 s = texture2D(tDiffuse, uv + vec2(cos(a), sin(a)) * r * texel).rgb;
        float w = 1.0 / (1.0 + max(s.r, max(s.g, s.b)));
        sum += s * w;
        total += w;
      }
      gl_FragColor = vec4(color * strength * sum / total, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}