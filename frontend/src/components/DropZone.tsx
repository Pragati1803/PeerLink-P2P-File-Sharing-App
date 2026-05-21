'use client';

import { useCallback, useState } from 'react';
import { formatBytes, getFileIcon } from '@/lib/utils';

interface DropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function DropZone({ onFile, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile, disabled]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <label
      className={`relative block cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 p-10 text-center
        ${dragging ? 'drag-active' : 'border-[#1e2d40] hover:border-[#00d4ff66]'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        ${hovered ? 'bg-[#00d4ff08]' : 'bg-[#0f1520]'}
      `}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <input
        type="file"
        className="sr-only"
        onChange={handleChange}
        disabled={disabled}
      />

      {/* Icon */}
      <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
        ${dragging ? 'bg-[#00d4ff20] scale-110' : 'bg-[#1e2d40]'}`}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" className={dragging ? 'text-[#00d4ff]' : 'text-[#4a6080]'}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>

      <p className="font-mono text-sm text-[#4a6080] mb-1">
        {dragging ? (
          <span className="text-[#00d4ff]">DROP TO SEND</span>
        ) : (
          <>DRAG & DROP FILE <span className="text-[#00d4ff]">or click to browse</span></>
        )}
      </p>
      <p className="font-mono text-xs text-[#2a3d50]">Any file type • No size limit</p>

      {/* Corner decorations */}
      <span className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#1e2d40] rounded-tl" />
      <span className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#1e2d40] rounded-tr" />
      <span className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#1e2d40] rounded-bl" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#1e2d40] rounded-br" />
    </label>
  );
}

export function FileCard({ file }: { file: File }) {
  const icon = getFileIcon(file.type);
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-[#0f1520] border border-[#1e2d40]">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm text-[#c8d8e8] truncate">{file.name}</p>
        <p className="font-mono text-xs text-[#4a6080]">{formatBytes(file.size)}</p>
      </div>
    </div>
  );
}
