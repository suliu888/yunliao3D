export enum SupportedFormat {
  OBJ = 'obj',
  FBX = 'fbx',
  STL = 'stl',
  GLTF = 'gltf',
  GLB = 'glb',
  UNKNOWN = 'unknown'
}

export type Language = 'zh' | 'en';

export interface ModelFile {
  name: string;
  size: number;
  url: string;
  format: SupportedFormat;
}

export interface MaterialSlot {
  id: string;
  colorMapUrl: string | null;
}

export interface ViewerSettings {
  autoRotate: boolean;
  showSurface: boolean;
  showWireframe: boolean;
  environment: string;
  intensity: number;
  // Appearance Settings
  smoothShading: boolean;
  highQualityLighting: boolean;
  materialColor: string;
  wireframeColor: string;
  selectionColor: string;
  metalness: number;
  roughness: number;
  wireframeRemoveDiagonals: boolean;
}

export interface SelectedObject {
  id: string;
  name: string;
}

// Augment JSX namespace to include React Three Fiber intrinsic elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      primitive: any;
      mesh: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      axesHelper: any;
      group: any;
    }
  }
}