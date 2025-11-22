import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, GizmoHelper, GizmoViewcube, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

import { ModelFile, ViewerSettings, Language, MaterialSlot } from '../types';

import { ModelRenderer } from './ModelRenderer';
import { Loader } from './Loader';
import { TRANSLATIONS } from '../constants';

// Fix for missing JSX intrinsic elements types
const AxesHelper = 'axesHelper' as any;

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ThreeStateBridge: React.FC<{ onReady: (state: { scene: any; camera: any; gl: any }) => void }> = ({ onReady }) => {
  const { scene, camera, gl } = useThree();

  useEffect(() => {
    onReady({ scene, camera, gl });
  }, [scene, camera, gl, onReady]);

  return null;
};

interface ViewerProps {
  model: ModelFile | null;
  settings: ViewerSettings;
  language: Language;
  selectedObjects: Map<string, string>;
  smoothedObjects: Set<string>;
  materialSlots: MaterialSlot[];
  objectMaterials: Map<string, string>;
  onObjectSelect: (id: string | null, label?: string, multiSelect?: boolean) => void;
}

// Component to handle screenshot logic inside Canvas context
const ScreenshotHandler = () => {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    const handleScreenshot = () => {
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.setAttribute('download', `model-screenshot-${Date.now()}.png`);
      link.setAttribute('href', dataUrl);
      link.click();
    };

    window.addEventListener('trigger-screenshot', handleScreenshot);
    return () => {
      window.removeEventListener('trigger-screenshot', handleScreenshot);
    };
  }, [gl, scene, camera]);

  return null;
};

// Component to handle reset view logic
const ViewResetHandler = () => {
  const { camera, controls } = useThree();

  useEffect(() => {
    const handleReset = () => {
      // Reset camera position
      camera.position.set(0, 0, 10);
      camera.zoom = 1;
      camera.updateProjectionMatrix();

      // Reset controls
      if (controls) {
        // @ts-ignore
        controls.reset();
      }
    };

    window.addEventListener('trigger-reset-view', handleReset);
    return () => {
      window.removeEventListener('trigger-reset-view', handleReset);
    };
  }, [camera, controls]);

  return null;
};

export const Viewer: React.FC<ViewerProps> = ({ model, settings, language, selectedObjects, smoothedObjects, materialSlots, objectMaterials, onObjectSelect }) => {
  const t = TRANSLATIONS[language];
  const { highQualityLighting } = settings;

  const [threeState, setThreeState] = useState<{ scene: any; camera: any; gl: any } | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragCurrentRef = useRef<{ x: number; y: number } | null>(null);
  const isBoxSelectingRef = useRef(false);

  // Increase font size for Chinese/English to improve legibility
  const gizmoFont = language === 'zh' ? "34px Inter var, sans-serif" : "20px Inter var, sans-serif";

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!model) return;
    if (e.button !== 0 || !e.ctrlKey) return;

    e.preventDefault();
    e.stopPropagation();
    const nativeEvent: any = e.nativeEvent;
    if (nativeEvent && typeof nativeEvent.stopImmediatePropagation === 'function') {
      nativeEvent.stopImmediatePropagation();
    }

    isBoxSelectingRef.current = true;
    setIsBoxSelecting(true);

    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragCurrentRef.current = { x: e.clientX, y: e.clientY };

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setSelectionRect({ x: startX, y: startY, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isBoxSelectingRef.current || !dragStartRef.current) return;

    e.preventDefault();
    e.stopPropagation();
    const nativeEvent: any = e.nativeEvent;
    if (nativeEvent && typeof nativeEvent.stopImmediatePropagation === 'function') {
      nativeEvent.stopImmediatePropagation();
    }

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    dragCurrentRef.current = { x: e.clientX, y: e.clientY };

    const start = dragStartRef.current;
    const startX = start.x - rect.left;
    const startY = start.y - rect.top;
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(startX - currentX);
    const height = Math.abs(startY - currentY);

    setSelectionRect({ x: left, y: top, width, height });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isBoxSelectingRef.current) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    const nativeEvent: any = e.nativeEvent;
    if (nativeEvent && typeof nativeEvent.stopImmediatePropagation === 'function') {
      nativeEvent.stopImmediatePropagation();
    }

    isBoxSelectingRef.current = false;
    setIsBoxSelecting(false);

    if (!dragStartRef.current || !dragCurrentRef.current) {
      return;
    }

    const start = dragStartRef.current;
    const end = dragCurrentRef.current;

    dragStartRef.current = null;
    dragCurrentRef.current = null;
    setSelectionRect(null);

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
      return;
    }

    if (!threeState || !threeState.camera || !threeState.gl || !threeState.scene) {
      return;
    }

    const canvasRect = threeState.gl.domElement.getBoundingClientRect();

    const toNdc = (p: { x: number; y: number }) => {
      const x = ((p.x - canvasRect.left) / canvasRect.width) * 2 - 1;
      const y = -((p.y - canvasRect.top) / canvasRect.height) * 2 + 1;
      return { x, y };
    };

    const startNdc = toNdc(start);
    const endNdc = toNdc(end);

    const minX = Math.min(startNdc.x, endNdc.x);
    const maxX = Math.max(startNdc.x, endNdc.x);
    const minY = Math.min(startNdc.y, endNdc.y);
    const maxY = Math.max(startNdc.y, endNdc.y);

    const camera = threeState.camera as THREE.Camera;
    const scene = threeState.scene as THREE.Scene;

    // Ensure world matrices are up to date before projecting
    scene.updateMatrixWorld(true);

    const corner = new THREE.Vector3();
    const tempBox = new THREE.Box3();
    const boxMin = new THREE.Vector2();
    const boxMax = new THREE.Vector2();

    const toSelect: { id: string; name: string }[] = [];

    scene.traverse((obj: any) => {
      if (!obj.isMesh || !obj.geometry) return;

      tempBox.setFromObject(obj);

      boxMin.set(Infinity, Infinity);
      boxMax.set(-Infinity, -Infinity);

      let inFront = false;

      // Project all 8 corners of the mesh's world-space bounding box
      for (let ix = 0; ix <= 1; ix++) {
        for (let iy = 0; iy <= 1; iy++) {
          for (let iz = 0; iz <= 1; iz++) {
            corner.set(
              ix ? tempBox.max.x : tempBox.min.x,
              iy ? tempBox.max.y : tempBox.min.y,
              iz ? tempBox.max.z : tempBox.min.z
            );
            corner.project(camera);

            if (corner.z >= -1 && corner.z <= 1) {
              inFront = true;
            }

            boxMin.x = Math.min(boxMin.x, corner.x);
            boxMin.y = Math.min(boxMin.y, corner.y);
            boxMax.x = Math.max(boxMax.x, corner.x);
            boxMax.y = Math.max(boxMax.y, corner.y);
          }
        }
      }

      // Screen-space AABB overlap: as long as boxes intersect, we treat it as selected
      const overlaps =
        boxMax.x >= minX &&
        boxMin.x <= maxX &&
        boxMax.y >= minY &&
        boxMin.y <= maxY &&
        inFront;

      if (overlaps) {
        const id: string = obj.uuid;
        if (!selectedObjects.has(id)) {
          const name: string =
            typeof obj.name === 'string' && obj.name.trim().length > 0
              ? obj.name
              : 'Unnamed Object';
          toSelect.push({ id, name });
        }
      }
    });

    toSelect.forEach(({ id, name }) => {
      onObjectSelect(id, name, true);
    });
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-gray-950"
      onMouseDownCapture={handleMouseDown}
      onMouseMoveCapture={handleMouseMove}
      onMouseUpCapture={handleMouseUp}
    >
      {/* Empty State */}
      {!model && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 z-10 pointer-events-none select-none">
          <div className="p-8 border border-dashed border-gray-800 rounded-3xl flex flex-col items-center bg-gray-900/50 backdrop-blur-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-40 text-gray-400">
              <path d="M12.5 22H6a2 2 0 0 1-2-2V7.5l6.46-3.63a2 2 0 0 1 1.8 0l6.85 3.86" />
              <path d="M12.5 22a2 2 0 0 0 2-2v-8l6.62-3.73" />
              <path d="M3.9 7.5l1.6 1" />
              <path d="M12.5 22v-9.3" />
              <path d="M8.5 14.8l4 2.3" />
            </svg>
            <p className="text-base font-medium text-gray-300">{t.dragDrop}</p>
            <p className="text-xs mt-2 text-gray-500 font-mono tracking-tight">{t.dragDropSub}</p>
          </div>
        </div>
      )}

      <React.Suspense fallback={<div className="absolute inset-0 bg-gray-950 z-50"><Loader language={language} /></div>}>
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ preserveDrawingBuffer: true }}
          onPointerMissed={() => onObjectSelect(null)}
        >
          <ScreenshotHandler />
          <ViewResetHandler />
          <ThreeStateBridge onReady={setThreeState} />

          {/* Camera & Controls */}
          <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={45} />
          <OrbitControls
            autoRotate={settings.autoRotate}
            makeDefault
            enableDamping
            dampingFactor={0.05}
            enabled={!isBoxSelecting}
          />

          {/* Lighting rigs */}
          {highQualityLighting ? (
            <>
              <hemisphereLight
                intensity={0.4}
                color="#e5e7eb"
                groundColor="#020617"
              />
              <directionalLight
                position={[8, 10, 8]}
                intensity={settings.intensity * 1.2}
                castShadow
              />
              <directionalLight
                position={[-8, 6, -6]}
                intensity={0.6}
                color="#93c5fd"
              />
              <ContactShadows
                position={[0, -1.2, 0]}
                opacity={0.4}
                scale={20}
                blur={2.5}
                far={20}
              />
            </>
          ) : (
            <>
              <ambientLight intensity={0.4} />
              <directionalLight position={[5, 5, 5]} intensity={settings.intensity} />
            </>
          )}

          {/* Scene Content */}
          {model && (
            <ModelRenderer
              url={model.url}
              format={model.format}
              settings={settings}
              selectedObjects={selectedObjects}
              smoothedObjects={smoothedObjects}
              materialSlots={materialSlots}
              objectMaterials={objectMaterials}
              onObjectSelect={onObjectSelect}
            />
          )}

          {/* ViewCube / Orientation Gizmo */}
          <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
            <GizmoViewcube
              font={gizmoFont}
              opacity={0.9}
              color="#1e293b" // gray-800
              strokeColor="#475569" // slate-600
              textColor="#f1f5f9" // slate-100
              hoverColor="#3b82f6" // blue-500
              faces={t.viewCube}
            />
          </GizmoHelper>
        </Canvas>
      </React.Suspense>

      {selectionRect && (
        <div
          className="absolute z-20 border border-blue-400/80 bg-blue-500/10 pointer-events-none rounded-sm"
          style={{
            left: selectionRect.x,
            top: selectionRect.y,
            width: selectionRect.width,
            height: selectionRect.height,
          }}
        />
      )}

      {model && (
        <>
          {/* Filename Capsule - centered bottom */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-none">
            <div className="bg-gray-900/80 backdrop-blur-sm text-slate-200 text-xs px-4 py-2 rounded-full border border-white/10 font-mono tracking-wide shadow-lg pointer-events-auto">
              {model.name}
            </div>
          </div>

          {/* Selected Object List - bottom right */}
          {selectedObjects.size > 0 && (
            <div className="absolute bottom-6 right-6 pointer-events-none">
              <div className="inline-flex flex-col bg-gray-900/90 backdrop-blur-md rounded-xl border border-gray-700/50 shadow-2xl overflow-hidden w-auto max-w-[300px] pointer-events-auto">
                <div className="bg-gray-800/50 px-3 py-2 border-b border-gray-700/50 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {language === 'zh' ? `已选 (${selectedObjects.size})` : `Selected (${selectedObjects.size})`}
                  </span>
                  <button 
                    onClick={() => onObjectSelect(null)}
                    className="text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-gray-700/50"
                    title={language === 'zh' ? "清除所有" : "Clear All"}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                  </button>
                </div>
                <div className="max-h-[140px] overflow-y-auto custom-scrollbar p-1">
                  {Array.from(selectedObjects.entries()).map(([id, name]) => (
                    <div key={id} className="flex justify-between items-center px-2 py-1.5 hover:bg-gray-800/50 rounded group transition-colors">
                       <span className="text-xs text-slate-200 truncate flex-1 pr-2 font-mono" title={name}>
                         {name}
                       </span>
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           onObjectSelect(id, name, true); // Toggle selection
                         }}
                         className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
                       >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                          </svg>
                       </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};