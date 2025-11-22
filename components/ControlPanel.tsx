import React, { useState } from 'react';

import { 
  Settings, 
  Upload, 
  RotateCw, 
  Grid3X3, 
  Box,
  Sun, 
  Palette,
  FileBox,
  X,
  Languages,
  Trash2,
  Camera,
  RotateCcw,
  Sliders
} from 'lucide-react';
import { ModelFile, ViewerSettings, Language, MaterialSlot } from '../types';

import { ENVIRONMENT_PRESETS, TRANSLATIONS } from '../constants';

interface ControlPanelProps {
  settings: ViewerSettings;
  onSettingsChange: (newSettings: ViewerSettings) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  model: ModelFile | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  onClose: () => void;
  onRemoveModel: () => void;
  selectedObjects: Map<string, string>;
  onSmoothToggle: (value: boolean) => void;
  materialSlots: MaterialSlot[];
  activeMaterialSlotId: string | null;
  onActiveMaterialChange: (id: string) => void;
  onMaterialSlotsChange: (slots: MaterialSlot[]) => void;
  onApplyMaterialToSelection: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  settings, 
  onSettingsChange, 
  onUpload,
  model,
  language,
  setLanguage,
  onClose,
  onRemoveModel,
  selectedObjects,
  onSmoothToggle,
  materialSlots,
  activeMaterialSlotId,
  onActiveMaterialChange,
  onMaterialSlotsChange,
  onApplyMaterialToSelection,
}) => {
  const t = TRANSLATIONS[language];
  const [activeTab, setActiveTab] = useState<'settings' | 'appearance'>('settings');

  const toggleSetting = (key: keyof ViewerSettings) => {
    onSettingsChange({ ...settings, [key]: !settings[key] });
  };

  const updateSetting = (key: keyof ViewerSettings, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleScreenshot = () => {
    const event = new CustomEvent('trigger-screenshot');
    window.dispatchEvent(event);
  };

  const handleResetView = () => {
    const event = new CustomEvent('trigger-reset-view');
    window.dispatchEvent(event);
  };

  return (
    <div className="w-full h-full bg-gray-900 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="h-16 px-5 border-b border-gray-800 flex items-center justify-between bg-gray-900">
        <h2 className="font-medium text-sm text-slate-200 flex items-center gap-2">
          <Languages className="w-4 h-4 text-gray-500" />
          <div className="flex bg-gray-800 rounded-md p-0.5">
            <button 
              onClick={() => setLanguage('zh')} 
              className={`px-2 py-0.5 text-xs rounded-sm transition-all ${language === 'zh' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
              中文
            </button>
            <button 
              onClick={() => setLanguage('en')} 
              className={`px-2 py-0.5 text-xs rounded-sm transition-all ${language === 'en' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
              EN
            </button>
          </div>
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Action Bar */}
      <div className="p-4 pb-0">
         <label className="cursor-pointer flex items-center justify-center gap-2 bg-slate-100 text-gray-900 hover:bg-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-all w-full mb-4 shadow-sm active:scale-95">
          <Upload className="w-4 h-4" />
          {t.upload}
          <input 
            type="file" 
            className="hidden" 
            accept=".obj,.fbx,.stl,.gltf,.glb" 
            onChange={onUpload}
          />
        </label>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 px-4">
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === 'settings' ? 'text-white border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
        >
          <Settings className="w-3 h-3" /> {t.settings}
        </button>
        <button 
          onClick={() => setActiveTab('appearance')}
          className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === 'appearance' ? 'text-blue-400 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
        >
          <Palette className="w-3 h-3" /> {t.appearance}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
        {activeTab === 'settings' ? (
          <div className="space-y-8">
            {/* File Info */}
            {model && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-3">
                   <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <FileBox className="w-3 h-3" /> {t.modelInfo}
                  </h3>
                  <button 
                    onClick={onRemoveModel}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    title={t.removeModel}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <span className="text-gray-500">{t.name}:</span>
                  <span className="text-slate-200 truncate text-right" title={model.name}>{model.name}</span>
                  <span className="text-gray-500">{t.format}:</span>
                  <span className="text-slate-200 text-right uppercase">{model.format}</span>
                  <span className="text-gray-500">{t.size}:</span>
                  <span className="text-slate-200 text-right">{(model.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-700/50">
                   <button 
                      onClick={handleScreenshot}
                      className="flex items-center justify-center gap-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-[10px] transition-colors"
                   >
                      <Camera className="w-3 h-3" /> {t.screenshot}
                   </button>
                   <button 
                      onClick={handleResetView}
                      className="flex items-center justify-center gap-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-[10px] transition-colors"
                   >
                      <RotateCcw className="w-3 h-3" /> {t.resetView}
                   </button>
                </div>
              </div>
            )}

            {/* Toggles */}
            <div className="space-y-2">
              {[
                { key: 'autoRotate', label: t.autoRotate, icon: RotateCw },
                { key: 'showSurface', label: t.showSurface, icon: Box },
                { key: 'showWireframe', label: t.showWireframe, icon: Grid3X3 },
              ].map((item) => (
                <button 
                  key={item.key}
                  onClick={() => toggleSetting(item.key as keyof ViewerSettings)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-750 transition-all group border border-transparent hover:border-gray-700"
                >
                  <span className="flex items-center gap-3 text-gray-400 text-sm group-hover:text-slate-200">
                    <item.icon className={`w-4 h-4 ${settings[item.key as keyof ViewerSettings] && item.key === 'autoRotate' ? 'animate-spin-slow text-blue-400' : ''}`} /> 
                    {item.label}
                  </span>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${settings[item.key as keyof ViewerSettings] ? 'bg-blue-600' : 'bg-gray-600'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all transform ${settings[item.key as keyof ViewerSettings] ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </div>
                </button>
              ))}
            </div>

            {/* Lighting */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Sun className="w-3 h-3" /> {t.lighting}
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {ENVIRONMENT_PRESETS.slice(0, 6).map(env => (
                  <button
                    key={env}
                    onClick={() => updateSetting('environment', env)}
                    className={`text-[10px] py-2 px-1 rounded border transition-all capitalize ${settings.environment === env ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-gray-800 border-transparent text-gray-400 hover:bg-gray-750 hover:text-gray-200'}`}
                  >
                    {env}
                  </button>
                ))}
              </div>
              <div>
                 <label className="text-[10px] text-gray-500 mb-2 block flex justify-between">
                   <span>{t.intensity}</span>
                   <span className="text-gray-300">{settings.intensity}</span>
                 </label>
                 <input 
                    type="range" 
                    min="0" 
                    max="3" 
                    step="0.1" 
                    value={settings.intensity}
                    onChange={(e) => updateSetting('intensity', parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                 />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
             {/* Material Slots */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Palette className="w-3 h-3" /> {language === 'zh' ? '贴图' : 'Textures'}
              </h3>
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-gray-300">{language === 'zh' ? '贴图槽' : 'Texture Slots'}</span>
                  <span className="text-[10px] text-gray-500">
                    {language === 'zh' ? `已选 ${selectedObjects.size} 个物体` : `Selected ${selectedObjects.size} objects`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {materialSlots.map((slot) => {
                    const isActive = slot.id === activeMaterialSlotId;
                    const hasMap = !!slot.colorMapUrl;
                    return (
                      <div
                        key={slot.id}
                        onClick={() => onActiveMaterialChange(slot.id)}
                        className={`relative rounded-md overflow-hidden cursor-pointer border text-[10px] flex items-center justify-center bg-gray-900/60 hover:bg-gray-800 transition-colors ${
                          isActive ? 'border-blue-500 ring-1 ring-blue-500/60' : 'border-gray-700'
                        }`}
                      >
                        {hasMap ? (
                          <div
                            className="w-full h-12 bg-center bg-cover"
                            style={{ backgroundImage: `url(${slot.colorMapUrl})` }}
                          />
                        ) : (
                          <span className="text-gray-500">{language === 'zh' ? '空' : 'Empty'}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-[11px] text-gray-100 py-1.5 px-2 rounded-md transition-all">
                    <Upload className="w-3 h-3" />
                    {language === 'zh' ? '导入' : 'Import'}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files && e.target.files[0];
                        if (!file || !activeMaterialSlotId) {
                          e.target.value = '';
                          return;
                        }

                        const ext = file.name.split('.').pop()?.toLowerCase() || '';
                        const allowed = ['png', 'jpg', 'jpeg', 'webp'];
                        if (!allowed.includes(ext)) {
                          alert(
                            language === 'zh'
                              ? '当前仅支持 PNG / JPG / WebP 贴图，请先从 PSD 导出为图片再导入。'
                              : 'Only PNG / JPG / WebP textures are supported. Please export from PSD to an image file first.'
                          );
                          e.target.value = '';
                          return;
                        }

                        const url = URL.createObjectURL(file);
                        const nextSlots = materialSlots.map((s) =>
                          s.id === activeMaterialSlotId ? { ...s, colorMapUrl: url } : s
                        );
                        onMaterialSlotsChange(nextSlots);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    onClick={onApplyMaterialToSelection}
                    disabled={selectedObjects.size === 0 || !activeMaterialSlotId}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors border ${
                      selectedObjects.size === 0 || !activeMaterialSlotId
                        ? 'bg-gray-700 text-gray-500 border-gray-700 cursor-not-allowed'
                        : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500'
                    }`}
                  >
                    {language === 'zh' ? '应用' : 'Apply'}
                  </button>
                  <button
                    onClick={() => {
                      if (!activeMaterialSlotId) return;
                      const nextSlots = materialSlots.map((s) =>
                        s.id === activeMaterialSlotId ? { ...s, colorMapUrl: null } : s
                      );
                      onMaterialSlotsChange(nextSlots);
                    }}
                    disabled={!activeMaterialSlotId}
                    className={`px-2 py-1.5 rounded-md text-[11px] border transition-colors ${
                      !activeMaterialSlotId
                        ? 'bg-gray-700 text-gray-500 border-gray-700 cursor-not-allowed'
                        : 'bg-gray-800 text-gray-200 border-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {language === 'zh' ? '重置' : 'Reset'}
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-gray-500">
                  {language === 'zh'
                    ? '当前仅支持 PNG / JPG / WebP 贴图格式。'
                    : 'Currently only PNG / JPG / WebP texture formats are supported.'}
                </p>
              </div>
            </div>

            {/* Colors */}
            <div>
               <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Palette className="w-3 h-3" /> {t.materialColor}
               </h3>
               
               <div className="space-y-4">
                 {/* Surface Color */}
                 <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs text-gray-300">{t.materialColor}</span>
                     <span className="text-[10px] text-gray-500 font-mono uppercase">{settings.materialColor}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={settings.materialColor}
                        onChange={(e) => updateSetting('materialColor', e.target.value)}
                        className="w-8 h-8 rounded-full cursor-pointer border-0 p-0 bg-transparent overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full"
                      />
                      <div className="flex-1 text-[10px] text-gray-500">
                        调整模型实体的基础颜色
                      </div>
                   </div>
                 </div>

                 {/* Wireframe Color */}
                 <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs text-gray-300">{t.wireframeColor}</span>
                     <span className="text-[10px] text-gray-500 font-mono uppercase">{settings.wireframeColor}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={settings.wireframeColor}
                        onChange={(e) => updateSetting('wireframeColor', e.target.value)}
                        className="w-8 h-8 rounded-full cursor-pointer border-0 p-0 bg-transparent overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full"
                      />
                      <div className="flex-1 text-[10px] text-gray-500">
                        调整线框模式下的线条颜色
                      </div>
                   </div>
                 </div>

                 {/* Selection Highlight Color */}
                 <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs text-gray-300">{t.selectionColor}</span>
                     <span className="text-[10px] text-gray-500 font-mono uppercase">{settings.selectionColor}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={settings.selectionColor}
                        onChange={(e) => updateSetting('selectionColor', e.target.value)}
                        className="w-8 h-8 rounded-full cursor-pointer border-0 p-0 bg-transparent overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full"
                      />
                      <div className="flex-1 text-[10px] text-gray-500">
                        {language === 'zh' ? '控制选中物体的高亮颜色' : 'Highlight color for selected objects'}
                      </div>
                   </div>
                 </div>

               </div>
             </div>

             {/* PBR Parameters */}
             <div>
               <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Sliders className="w-3 h-3" /> {t.materialParams}
               </h3>
               
               <div className="space-y-5">
                 {/* Metalness */}
                 <div>
                   <label className="text-[10px] text-gray-500 mb-2 block flex justify-between">
                     <span>{t.metalness}</span>
                     <span className="text-gray-300">{settings.metalness.toFixed(2)}</span>
                   </label>
                   <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={settings.metalness}
                      onChange={(e) => updateSetting('metalness', parseFloat(e.target.value))}
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                   />
                   <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                     <span>非金属</span>
                     <span>金属</span>
                   </div>
                 </div>

                 {/* Roughness */}
                 <div>
                   <label className="text-[10px] text-gray-500 mb-2 block flex justify-between">
                     <span>{t.roughness}</span>
                     <span className="text-gray-300">{settings.roughness.toFixed(2)}</span>
                   </label>
                   <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={settings.roughness}
                      onChange={(e) => updateSetting('roughness', parseFloat(e.target.value))}
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                   />
                    <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                     <span>光滑</span>
                     <span>粗糙</span>
                   </div>
                 </div>

                 {/* Smooth shading toggle - per selected object(s) */}
                <div>
                  <label className="text-[10px] text-gray-500 mb-2 block flex justify-between">
                    <span>{t.smoothShading}</span>
                    <span className="text-gray-300">{settings.smoothShading ? t.smoothOn : t.smoothOff}</span>
                  </label>
                  <button 
                    onClick={() => onSmoothToggle(!settings.smoothShading)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-750 transition-all group border border-transparent hover:border-gray-700 mb-2"
                  >
                    <span className="text-xs text-gray-300 group-hover:text-slate-200">
                      {settings.smoothShading ? t.smoothOn : t.smoothOff}
                    </span>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${settings.smoothShading ? 'bg-blue-600' : 'bg-gray-600'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all transform ${settings.smoothShading ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                  </button>
                </div>

                 {/* Wireframe diagonal removal toggle */}
                 <div>
                   <label className="text-[10px] text-gray-500 mb-2 block flex justify-between">
                     <span>{t.wireframeRemoveDiagonals}</span>
                     <span className="text-gray-300">{settings.wireframeRemoveDiagonals ? t.wireframeRemoveDiagonalsOn : t.wireframeRemoveDiagonalsOff}</span>
                   </label>
                   <button
                     onClick={() => updateSetting('wireframeRemoveDiagonals', !settings.wireframeRemoveDiagonals)}
                     className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-750 transition-all group border border-transparent hover:border-gray-700 mb-2"
                   >
                     <span className="text-xs text-gray-300 group-hover:text-slate-200">
                       {settings.wireframeRemoveDiagonals ? t.wireframeRemoveDiagonalsOn : t.wireframeRemoveDiagonalsOff}
                     </span>
                     <div className={`w-8 h-4 rounded-full relative transition-colors ${settings.wireframeRemoveDiagonals ? 'bg-blue-600' : 'bg-gray-600'}`}>
                       <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all transform ${settings.wireframeRemoveDiagonals ? 'translate-x-4' : 'translate-x-0'}`}></div>
                     </div>
                   </button>
                 </div>

                 {/* High quality lighting toggle */}
                 <div>
                   <label className="text-[10px] text-gray-500 mb-2 block flex justify-between">
                     <span>{t.highQualityLighting}</span>
                     <span className="text-gray-300">{settings.highQualityLighting ? t.highQualityOn : t.highQualityOff}</span>
                   </label>
                   <button 
                     onClick={() => updateSetting('highQualityLighting', !settings.highQualityLighting)}
                     className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-750 transition-all group border border-transparent hover:border-gray-700"
                   >
                     <span className="text-xs text-gray-300 group-hover:text-slate-200">
                       {settings.highQualityLighting ? t.highQualityOn : t.highQualityOff}
                     </span>
                     <div className={`w-8 h-4 rounded-full relative transition-colors ${settings.highQualityLighting ? 'bg-blue-600' : 'bg-gray-600'}`}>
                       <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all transform ${settings.highQualityLighting ? 'translate-x-4' : 'translate-x-0'}`}></div>
                     </div>
                   </button>
                 </div>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};