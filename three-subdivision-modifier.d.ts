declare module 'three-subdivision-modifier' {
  import * as THREE from 'three';

  export default class SubdivisionModifier {
    constructor(subdivisions?: number);
    modify(geometry: THREE.BufferGeometry | any): THREE.BufferGeometry;
  }
}
