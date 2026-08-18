'use client';

import React from 'react';

/** Production: admin overlay is disabled. */
export const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="p-6 text-white">
      <p className="text-sm font-semibold text-white/70">Admin tools are not available.</p>
      <button onClick={onClose} className="mt-4 text-[10px] font-black uppercase text-primary">
        Close
      </button>
    </div>
  );
};

export default AdminPanel;
