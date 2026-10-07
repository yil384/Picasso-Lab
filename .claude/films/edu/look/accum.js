// Real depth of field for miniatures: render the frame N times from points on the lens aperture (camera jittered in
// its own right/up plane, always aimed at the same focus point) and average. No depth-buffer bokeh artifacts, real
// out-of-focus highlights, free anti-aliasing. Replaces RenderPass (+ GTAO) at the head of an EffectComposer.
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

export class AccumDOFPass extends Pass {
  constructor(THREE, renderer, scene, camera, W, H, o = {}) {
    super();
    this.THREE = THREE; this.scene = scene; this.camera = camera;
    this.samples = o.samples ?? 24; this.freezeShadows = o.freezeShadows ?? true; this.aperture = 0; this.focus = 3;       // aperture: lens radius in world units
    const rt = () => new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
    this.inner = new EffectComposer(renderer, rt()); this.inner.renderToScreen = false;
    this.inner.addPass(new RenderPass(scene, camera));
    this.accum = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });      // half float: blendable everywhere (float32 blending is not)
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uW: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D tSrc; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tSrc, vUv) * uW; }',
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, depthTest: false, depthWrite: false, transparent: true,
    }));
    this.copy = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tSrc, vUv); }',
      depthTest: false, depthWrite: false,
    }));
  }
  addInner(pass) { this.inner.addPass(pass); }        // e.g. GTAO, run per sample
  render(renderer, writeBuffer) {
    const { THREE, camera } = this;
    const P = camera.position.clone(), Qn = camera.quaternion.clone();
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(Qn), right = new THREE.Vector3(1, 0, 0).applyQuaternion(Qn), up = new THREE.Vector3(0, 1, 0).applyQuaternion(Qn);
    const F = P.clone().addScaledVector(fwd, this.focus);
    const n = this.aperture > 0 ? this.samples : 1;
    renderer.setRenderTarget(this.accum); renderer.setClearColor(0x000000, 0); renderer.clear();
    const auto = renderer.shadowMap.autoUpdate;
    for (let i = 0; i < n; i++) {
      // Vogel disk: even coverage of the aperture, deterministic
      const r = Math.sqrt((i + 0.5) / n) * this.aperture, a = i * 2.399963229728653;
      camera.position.copy(P).addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r);
      camera.up.copy(up); camera.lookAt(F); camera.updateMatrixWorld(true);
      if (i === 1 && this.freezeShadows) { renderer.shadowMap.autoUpdate = false; }
      this.inner.render();
      renderer.setRenderTarget(this.accum);
      this.quad.material.uniforms.tSrc.value = this.inner.readBuffer.texture; this.quad.material.uniforms.uW.value = 1 / n;
      const ac = renderer.autoClear; renderer.autoClear = false; this.quad.render(renderer); renderer.autoClear = ac;   // accumulate, never clear
    }
    renderer.shadowMap.autoUpdate = auto;
    camera.position.copy(P); camera.quaternion.copy(Qn); camera.up.set(0, 1, 0); camera.updateMatrixWorld(true);
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.copy.material.uniforms.tSrc.value = this.accum.texture; this.copy.render(renderer);
  }
}
