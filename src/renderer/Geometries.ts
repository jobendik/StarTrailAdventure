import * as THREE from 'three';

export class Geometries {
  readonly tile:    THREE.BoxGeometry      = new THREE.BoxGeometry(1, 1, 1);
  readonly coin:    THREE.CylinderGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16);
  readonly fire:    THREE.SphereGeometry   = new THREE.SphereGeometry(0.16, 8, 6);
  readonly sphere:  THREE.SphereGeometry   = new THREE.SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  readonly capsule: THREE.CapsuleGeometry  = new THREE.CapsuleGeometry(0.28, 0.3, 4, 8);
}
