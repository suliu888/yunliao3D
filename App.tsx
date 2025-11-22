import React, { useState, useCallback, useEffect } from 'react';

import { Viewer } from './components/Viewer';
import { ControlPanel } from './components/ControlPanel';
import { ModelFile, ViewerSettings, Language, SelectedObject, MaterialSlot } from './types';

import { INITIAL_VIEWER_SETTINGS, SUPPORTED_EXTENSIONS, TRANSLATIONS } from './constants';
import { Cuboid, Menu, UploadCloud } from 'lucide-react';

function App() {
  const [currentModel, setCurrentModel] = useState<ModelFile | null>(null);
  const [viewerSettings, setViewerSettings] = useState<ViewerSettings>(INITIAL_VIEWER_SETTINGS);
  const [language, setLanguage] = useState<Language>('zh');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Use a Map to store selected objects: ID -> Name
  const [selectedObjects, setSelectedObjects] = useState<Map<string, string>>(new Map());
  // Track which objects have smoothing enabled (per-mesh smoothing state)
  const [smoothedObjects, setSmoothedObjects] = useState<Set<string>>(new Set());
  // User-defined material slots (simple library of color-map materials)
  const [materialSlots, setMaterialSlots] = useState<MaterialSlot[]>(() =>
    Array.from({ length: 4 }, (_, i) => ({ id: `mat-${i + 1}`, colorMapUrl: null }))
  );
  // Mapping from mesh UUID -> material slot ID
  const [objectMaterials, setObjectMaterials] = useState<Map<string, string>>(new Map());
  const [activeMaterialSlotId, setActiveMaterialSlotId] = useState<string | null>('mat-1');

  const t = TRANSLATIONS[language];

  const handleObjectSelect = useCallback((id: string | null, name?: string, multiSelect?: boolean) => {
    if (id === null) {
      // Clicked on background - clear selection
      setSelectedObjects(new Map());
      return;
    }

    setSelectedObjects(prev => {
      const next = multiSelect ? new Map(prev) : new Map();
      if (next.has(id)) {
        // If already selected, deselect it (toggle)
        next.delete(id);
      } else {
        // Add to selection
        next.set(id, name || 'Unnamed Object');
      }
      return next;
    });
  }, []);

  const processFile = useCallback((file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const format = SUPPORTED_EXTENSIONS[extension];

    if (!format) {
      alert(`Format .${extension} is not supported. Please use OBJ, FBX, STL, or GLTF.`);
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    if (currentModel) {
      URL.revokeObjectURL(currentModel.url);
    }

    setCurrentModel({
      name: file.name,
      size: file.size,
      url: objectUrl,
      format: format,
    });
    setIsSidebarOpen(true); // Open sidebar on successful upload
    setSelectedObjects(new Map());
    setSmoothedObjects(new Set());
    setObjectMaterials(new Map());
  }, [currentModel]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
    event.target.value = '';
  }, [processFile]);

  const handleRemoveModel = useCallback(() => {
    if (currentModel) {
      URL.revokeObjectURL(currentModel.url);
      setCurrentModel(null);
    }
    setSelectedObjects(new Map());
    setSmoothedObjects(new Set());
    setObjectMaterials(new Map());
  }, [currentModel]);

  // Per-selection smooth toggle: only affects currently selected objects
  const handleSmoothToggle = useCallback((value: boolean) => {
    if (selectedObjects.size > 0) {
      setSmoothedObjects(prev => {
        const next = new Set(prev);
        selectedObjects.forEach((_, id) => {
          if (value) {
            next.add(id);
          } else {
            next.delete(id);
          }
        });
        return next;
      });
    }

    setViewerSettings(prev => ({
      ...prev,
      smoothShading: value,
    }));
  }, [selectedObjects]);

  // Keep the smooth toggle in sync with the currently selected objects:
  // when切换选中物体时，根据这些物体是否已经平滑，更新面板里的平滑开关显示。
  useEffect(() => {
    setViewerSettings(prev => {
      if (selectedObjects.size === 0) {
        if (!prev.smoothShading) return prev;
        return { ...prev, smoothShading: false };
      }

      let allSmoothed = true;
      selectedObjects.forEach((_, id) => {
        if (!smoothedObjects.has(id)) {
          allSmoothed = false;
        }
      });

      const nextSmooth = allSmoothed && selectedObjects.size > 0;
      if (prev.smoothShading === nextSmooth) return prev;
      return { ...prev, smoothShading: nextSmooth };
    });
  }, [selectedObjects, smoothedObjects]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Check if we are actually leaving the window, not just entering a child element
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleViewerDoubleClick = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleApplyMaterialToSelection = useCallback(() => {
    if (!activeMaterialSlotId) return;
    if (selectedObjects.size === 0) return;

    setObjectMaterials(prev => {
      const next = new Map(prev);
      selectedObjects.forEach((_, id) => {
        next.set(id, activeMaterialSlotId);
      });
      return next;
    });
  }, [activeMaterialSlotId, selectedObjects]);

  return (
    <div 
      className="flex h-screen w-screen bg-gray-950 text-slate-100 overflow-hidden font-sans selection:bg-blue-500/30 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-600/20 backdrop-blur-sm border-4 border-blue-500 border-dashed m-4 rounded-3xl flex flex-col items-center justify-center pointer-events-none animate-pulse">
           <UploadCloud className="w-20 h-20 text-blue-400 mb-4" />
           <h2 className="text-3xl font-bold text-white">{t.dragActive}</h2>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full w-full relative transition-colors duration-300">
        {/* Minimalist Header */}
        <header className="absolute top-0 left-0 w-full z-20 p-6 pointer-events-none flex justify-between items-start">
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Cuboid className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-100 leading-tight">
                {t.appTitle}
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">{t.subtitle}</p>
            </div>
          </div>
          
          {/* Sidebar Toggle (Visible only when closed) */}
          <div className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-0 translate-x-10 pointer-events-none' : 'opacity-100 translate-x-0'}`}>
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="pointer-events-auto bg-gray-900/80 backdrop-blur-md border border-gray-700 p-2.5 rounded-full hover:bg-slate-100 hover:text-gray-900 hover:border-white transition-all group shadow-2xl active:scale-95"
               aria-label={language === 'zh' ? "打开菜单" : "Open Menu"}
             >
               <Menu className="w-5 h-5" />
             </button>
          </div>
        </header>
        
        {/* Viewer Container */}
        <div className="w-full h-full" onDoubleClick={handleViewerDoubleClick}>
           <Viewer 
             model={currentModel} 
             settings={viewerSettings} 
             language={language}
             selectedObjects={selectedObjects}
             smoothedObjects={smoothedObjects}
             materialSlots={materialSlots}
             objectMaterials={objectMaterials}
             onObjectSelect={handleObjectSelect}
           />
        </div>
      </div>

      {/* Sliding Sidebar - Fixed Position Overlay */}
      <div 
        className={`fixed top-0 right-0 h-full w-80 bg-gray-900 border-l border-gray-800 z-30 transition-transform duration-300 ease-in-out shadow-[-10px_0_40px_rgba(0,0,0,0.6)] ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
          <ControlPanel 
            settings={viewerSettings} 
            onSettingsChange={setViewerSettings}
            onUpload={handleFileUpload}
            model={currentModel}
            language={language}
            setLanguage={setLanguage}
            onClose={() => setIsSidebarOpen(false)}
            onRemoveModel={handleRemoveModel}
            selectedObjects={selectedObjects}
            onSmoothToggle={handleSmoothToggle}
            materialSlots={materialSlots}
            activeMaterialSlotId={activeMaterialSlotId}
            onActiveMaterialChange={setActiveMaterialSlotId}
            onMaterialSlotsChange={setMaterialSlots}
            onApplyMaterialToSelection={handleApplyMaterialToSelection}
          />
      </div>
    </div>
  );
}

export default App;