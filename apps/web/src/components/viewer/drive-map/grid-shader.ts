import * as THREE from 'three'
const VS = `varying vec3 vWP;void main(){vWP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`
const FS = `varying vec3 vWP;
uniform vec3 uLine;uniform vec3 uDim;uniform vec3 uBase;
void main(){
  vec2 c1=vWP.xz/10.,c2=vWP.xz/100.;
  vec2 g1=abs(fract(c1-.5)-.5)/fwidth(c1),g2=abs(fract(c2-.5)-.5)/fwidth(c2);
  float a1=(1.-min(min(g1.x,g1.y),1.))*.38,a2=1.-min(min(g2.x,g2.y),1.);
  float fade=1.-smoothstep(70.,200.,length(vWP.xz));
  vec3 col=mix(uBase,mix(uDim,uLine,a2),max(a1,a2))*fade+uBase*(1.-fade);
  gl_FragColor=vec4(col,1.);
}`
export function makeGridMesh(): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    extensions: { derivatives: true } as never,
    uniforms: {
      uLine: { value: new THREE.Color(0x0088ff) },
      uDim:  { value: new THREE.Color(0x001840) },
      uBase: { value: new THREE.Color(0x060b18) },
    },
    vertexShader: VS,
    fragmentShader: FS,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), mat)
  mesh.rotation.set(-Math.PI / 2, 0, 0)
  mesh.position.set(0, -0.46, 0)
  return mesh
}
