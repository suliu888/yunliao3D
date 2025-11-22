import React, { Suspense, useLayoutEffect, useMemo } from 'react';

import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

import { SupportedFormat, ViewerSettings, MaterialSlot } from '../types';

// Fix for missing JSX intrinsic elements types
const Primitive = 'primitive' as any;
const Mesh = 'mesh' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const Group = 'group' as any;

interface ModelRendererProps {
  url: string;
  format: SupportedFormat;
  settings: ViewerSettings;
  selectedObjects: Map<string, string>;
  smoothedObjects: Set<string>;
  materialSlots: MaterialSlot[];
  objectMaterials: Map<string, string>;
  onObjectSelect: (id: string | null, label?: string, multiSelect?: boolean) => void;
}

interface AssetProps {
  url: string;
  settings: ViewerSettings;
  selectedObjects: Map<string, string>;
  smoothedObjects: Set<string>;
  materialSlots: MaterialSlot[];
  objectMaterials: Map<string, string>;
  onObjectSelect: (id: string | null, label?: string, multiSelect?: boolean) => void;
}

// Component to render the wireframe overlay
const WireframeClone = ({ object, color, removeDiagonals }: { object: any; color: string; removeDiagonals: boolean }) => {
  // Build either a cloned mesh wireframe (with triangle diagonals) or an EdgesGeometry-only wireframe
  const clone = useMemo(() => {
    if (!object) return null;

    // Original behavior: full triangle wireframe on a cloned object
    if (!removeDiagonals) {
      return object.clone(true);
    }

    // New behavior: use EdgesGeometry + LineSegments to remove internal diagonals
    const group = new THREE.Group();

    object.updateWorldMatrix(true, true);

    object.traverse((child: any) => {
      if (child.isMesh && child.geometry) {
        const edgesGeometry = new THREE.EdgesGeometry(child.geometry, 40);
        const lineMaterial = new THREE.LineBasicMaterial({
          color: new THREE.Color(color),
          transparent: true,
          opacity: 0.6,
        });

        const line = new THREE.LineSegments(edgesGeometry, lineMaterial);
        line.matrixAutoUpdate = false;
        line.applyMatrix4(child.matrixWorld);
        group.add(line);
      }
    });

    return group;
  }, [object, color, removeDiagonals]);

  useLayoutEffect(() => {
    if (!clone || removeDiagonals) return;

    // Standard wireframe material - shows the true topology (triangles)
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      wireframe: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
      // Important: offsets wireframe to prevent z-fighting with the solid surface
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    (clone as any).traverse?.((child: any) => {
      if (child.isMesh) {
        child.material = wireframeMaterial;
      }
    });
  }, [clone, color, removeDiagonals]);

  if (!clone) return null;

  return <Primitive object={clone} />;
};

// Helper to manage the dual rendering logic and material updates
const SceneRenderer = ({ object, settings, selectedObjects, smoothedObjects, materialSlots, objectMaterials, onObjectSelect }: { object: any; settings: ViewerSettings; selectedObjects: Map<string, string>; smoothedObjects: Set<string>; materialSlots: MaterialSlot[]; objectMaterials: Map<string, string>; onObjectSelect: (id: string | null, label?: string, multiSelect?: boolean) => void; }) => {
  const { showSurface, showWireframe, materialColor, wireframeColor, selectionColor, metalness, roughness, wireframeRemoveDiagonals } = settings;

  // Build a small cache of textures for each material slot
  const slotTextures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const map = new Map<string, THREE.Texture>();
    materialSlots.forEach((slot) => {
      if (slot.colorMapUrl) {
        const tex = loader.load(slot.colorMapUrl);
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
        map.set(slot.id, tex);
      }
    });
    return map;
  }, [materialSlots]);

  // Apply material properties to the model
  useLayoutEffect(() => {
    if (!object) return;

    object.traverse((child: any) => {
      if (child.isMesh && !child.userData.__isSelectionOutline) {

        if (!child.userData.__omniViewClonedMaterial && child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map((mat: any) =>
              mat && typeof mat.clone === 'function' ? mat.clone() : mat
            );
          } else if (typeof child.material.clone === 'function') {
            child.material = child.material.clone();
          }
          child.userData.__omniViewClonedMaterial = true;
        }

        // Fix garbled text (乱码) in object names
        // If name consists only of '?' or contains replacement character '�', fallback to a generic name
        if (typeof child.name === 'string') {
          const trimmed = child.name.trim();
          const allQuestion = trimmed.length > 0 && /^\?+$/.test(trimmed);
          const hasReplacementChar = trimmed.includes('\uFFFD');
          if (allQuestion || hasReplacementChar) {
             child.name = `Object_${child.uuid.slice(0, 4)}`;
          }
        }

        const isSelected = selectedObjects.has(child.uuid);

        const isSmoothTarget = smoothedObjects.has(child.uuid);
        const shouldSmooth = isSmoothTarget;

        const assignedSlotId = objectMaterials.get(child.uuid) || null;
        const assignedTexture = assignedSlotId ? slotTextures.get(assignedSlotId) || null : null;

        // Handle generic standard materials; selection affects only emissive glow
        if (child.material) {
          // If it's an array of materials, handle each
          const materials = Array.isArray(child.material) ? child.material : [child.material];

          materials.forEach((mat: any) => {
            // Base material color always comes from global materialColor (tint)
            mat.color.set(materialColor);

            // Apply user-assigned color map from material slots, if any
            if (assignedTexture) {
              mat.map = assignedTexture;
              mat.map.needsUpdate = true;
            } else {
              mat.map = null;
            }

            // We only modify Standard or Physical materials to support PBR
            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
              mat.metalness = metalness;
              mat.roughness = roughness;
            }

            // Subtle selection glow using emissive; does not affect base color/texture
            const anyMat = mat as any;
            if (anyMat.emissive) {
              if (isSelected) {
                anyMat.emissive.set(selectionColor);
                anyMat.emissiveIntensity = 0.18;
              } else {
                anyMat.emissive.set(0x000000);
                anyMat.emissiveIntensity = 0;
              }
            }

            mat.flatShading = !shouldSmooth;
            mat.needsUpdate = true;
          });
        }

        if (shouldSmooth && child.geometry && child.geometry.isBufferGeometry) {
          const geometry = child.geometry as THREE.BufferGeometry;
          const normalAttr = geometry.attributes.normal;
          if (!normalAttr || normalAttr.count === 0) {
            geometry.computeVertexNormals();
          }
        }

        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [object, materialColor, selectionColor, metalness, roughness, smoothedObjects, selectedObjects, materialSlots, objectMaterials, slotTextures]);

  return (
    <Group
      onClick={(e: any) => {
        e.stopPropagation();
        if (!onObjectSelect) return;
        const target = e.object;
        if (target && target.isMesh) {
           // Detect shift key or ctrl/meta key for multi-selection
           const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
           onObjectSelect(target.uuid, target.name, isMulti);
        }
      }}
    >
      {showSurface && <Primitive object={object} />}
      {showWireframe && (
        <WireframeClone 
          object={object} 
          color={wireframeColor} 
          removeDiagonals={wireframeRemoveDiagonals} 
        />
      )}
    </Group>
  );
};

const ObjAsset = ({ url, settings, selectedObjects, smoothedObjects, materialSlots, objectMaterials, onObjectSelect }: AssetProps) => {
  const obj = useLoader(OBJLoader, url);
  return <SceneRenderer object={obj} settings={settings} selectedObjects={selectedObjects} smoothedObjects={smoothedObjects} materialSlots={materialSlots} objectMaterials={objectMaterials} onObjectSelect={onObjectSelect} />;
};

const FbxAsset = ({ url, settings, selectedObjects, smoothedObjects, materialSlots, objectMaterials, onObjectSelect }: AssetProps) => {
  const fbx = useLoader(FBXLoader, url);
  return <SceneRenderer object={fbx} settings={settings} selectedObjects={selectedObjects} smoothedObjects={smoothedObjects} materialSlots={materialSlots} objectMaterials={objectMaterials} onObjectSelect={onObjectSelect} />;
};

const GltfAsset = ({ url, settings, selectedObjects, smoothedObjects, materialSlots, objectMaterials, onObjectSelect }: AssetProps) => {
  const gltf = useLoader(GLTFLoader, url);
  return <SceneRenderer object={gltf.scene} settings={settings} selectedObjects={selectedObjects} smoothedObjects={smoothedObjects} materialSlots={materialSlots} objectMaterials={objectMaterials} onObjectSelect={onObjectSelect} />;
};

const StlAsset = ({ url, settings }: AssetProps) => {
  const geom = useLoader(STLLoader, url);
  const { showSurface, showWireframe, materialColor, wireframeColor, metalness, roughness, smoothShading } = settings;

  // STL loader returns geometry, needs a mesh
  useLayoutEffect(() => {
    if (geom) {
      geom.computeVertexNormals();
      geom.center();
    }
  }, [geom]);

  return (
    <Group>
      {showSurface && (
        <Mesh geometry={geom} castShadow receiveShadow>
          <MeshStandardMaterial 
            color={materialColor} 
            roughness={roughness} 
            metalness={metalness}
            flatShading={!smoothShading}
          />
        </Mesh>
      )}
      {showWireframe && (
        <Mesh geometry={geom}>
           <MeshBasicMaterial 
              color={wireframeColor} 
              wireframe 
              transparent 
              opacity={0.6} 
              polygonOffset 
              polygonOffsetFactor={-1} 
              polygonOffsetUnits={-1} 
           />
        </Mesh>
      )}
    </Group>
  );
};

const Asset: React.FC<{ url: string; format: SupportedFormat; settings: ViewerSettings; selectedObjects: Map<string, string>; smoothedObjects: Set<string>; materialSlots: MaterialSlot[]; objectMaterials: Map<string, string>; onObjectSelect: (id: string | null, label?: string, multiSelect?: boolean) => void; }> = (props) => {

  switch (props.format) {
    case SupportedFormat.OBJ:
      return <ObjAsset {...props} />;
    case SupportedFormat.FBX:
      return <FbxAsset {...props} />;

    case SupportedFormat.STL:
      return <StlAsset {...props} />;
    case SupportedFormat.GLTF:
    case SupportedFormat.GLB:
      return <GltfAsset {...props} />;
    default:
      return null;
  }
};

export const ModelRenderer: React.FC<ModelRendererProps> = ({ url, format, settings, selectedObjects, smoothedObjects, materialSlots, objectMaterials, onObjectSelect }) => {
  // Key ensures component remounts completely when file changes, clearing cache issues
  return (
    <Suspense fallback={null}>
      <Asset key={url} url={url} format={format} settings={settings} selectedObjects={selectedObjects} smoothedObjects={smoothedObjects} materialSlots={materialSlots} objectMaterials={objectMaterials} onObjectSelect={onObjectSelect} />
    </Suspense>
  );
};