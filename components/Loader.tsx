import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface LoaderProps {
  language?: Language;
}

export const Loader: React.FC<LoaderProps> = ({ language = 'zh' }) => {
  const t = TRANSLATIONS[language];
  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-blue-400">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute top-0 left-0 w-full h-full border-2 border-blue-400/20 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-2 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
      </div>
      <p className="text-xs font-light tracking-widest uppercase opacity-80">{t.loading}</p>
    </div>
  );
};