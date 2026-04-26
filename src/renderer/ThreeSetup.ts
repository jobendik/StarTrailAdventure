import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass }     from 'three/examples/jsm/postprocessing/OutputPass.js';

export class ThreeSetup {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene:    THREE.Scene;
  readonly camera:   THREE.PerspectiveCamera;
  readonly clock:    THREE.Clock;

  readonly stageGroup: THREE.Group;
  readonly bgGroup:    THREE.Group;

  readonly ambient: THREE.AmbientLight;
  readonly hemi:    THREE.HemisphereLight;
  readonly sun:     THREE.DirectionalLight;
  readonly fill:    THREE.DirectionalLight;
  readonly rim:     THREE.DirectionalLight;

  readonly composer: EffectComposer;
  readonly bloomPass: UnrealBloomPass;

  private readonly mapCanvas: HTMLCanvasElement;
  readonly mapCtx: CanvasRenderingContext2D;

  constructor() {
    const canvas = document.getElementById('gc') as HTMLCanvasElement;
    this.mapCanvas = document.getElementById('mapc') as HTMLCanvasElement;
    this.mapCtx    = this.mapCanvas.getContext('2d')!;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping      = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

    this.scene  = new THREE.Scene();
    this.clock  = new THREE.Clock();
    this.camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 240);

    // Lights
    this.ambient = new THREE.AmbientLight(0x90a5d4, 0.38);
    this.scene.add(this.ambient);

    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x354064, 0.9);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff2dc, 1.35);
    this.sun.position.set(20, 26, 20);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left   = -40; this.sun.shadow.camera.right  = 40;
    this.sun.shadow.camera.top    =  30; this.sun.shadow.camera.bottom = -14;
    this.sun.shadow.camera.near   = 1;   this.sun.shadow.camera.far    = 120;
    this.sun.shadow.bias = -0.001;
    this.scene.add(this.sun, this.sun.target);

    this.fill = new THREE.DirectionalLight(0x5577dd, 0.36);
    this.fill.position.set(-14, 10, -8);
    this.scene.add(this.fill);

    this.rim = new THREE.DirectionalLight(0xaec2ff, 0.54);
    this.rim.position.set(-10, 8, 16);
    this.scene.add(this.rim);

    // Groups
    this.bgGroup    = new THREE.Group();
    this.stageGroup = new THREE.Group();
    this.scene.add(this.bgGroup, this.stageGroup);

    // Post-processing: a light bloom pass for emissive objects.
    this.composer  = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass   = new UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight),
      0.25,   // strength
      0.35,   // radius
      1.15,   // threshold (higher: only very bright objects bloom)
    );
    const outputPass = new OutputPass();
    this.composer.addPass(renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(outputPass);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize(): void {
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.mapCanvas.width  = Math.round(innerWidth  * devicePixelRatio);
    this.mapCanvas.height = Math.round(innerHeight * devicePixelRatio);
    this.mapCanvas.style.width  = innerWidth  + 'px';
    this.mapCanvas.style.height = innerHeight + 'px';
    this.mapCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  render(): void {
    this.composer.render();
  }

  disposeObject(obj: THREE.Object3D): void {
    obj.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          (child.material as THREE.Material)?.dispose();
        }
      }
    });
  }

  clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[group.children.length - 1]!;
      group.remove(child);
      this.disposeObject(child);
    }
  }
}
