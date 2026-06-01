import React from 'react';
import { HardDrive } from 'lucide-react';

export const StorageEmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20">
      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
        <HardDrive size={40} className="text-slate-300 dark:text-slate-600" />
      </div>
      <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-2">Select an item</h3>
      <p className="text-sm text-slate-400 font-medium max-w-xs">
        Choose a node, disk, or volume from the tree to view its details
      </p>
    </div>
  );
};
