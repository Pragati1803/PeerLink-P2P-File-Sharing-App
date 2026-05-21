'use client';

import { useState } from 'react';
import { useSender } from '@/hooks/useSender';
import { DropZone, FileCard } from './DropZone';
import { InviteCodeDisplay } from './InviteCode';
import { ProgressBar, StatusBadge } from './ProgressBar';
import { formatBytes } from '@/lib/utils';

export function SenderPanel() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { status, startSession, sendFileInfo, cancel, reset } = useSender();

  const handleFile = (file: File) => {
    setSelectedFile(file);
  };

  const handleStart = () => {
    if (selectedFile) startSession(selectedFile);
  };

  const handleReset = () => {
    setSelectedFile(null);
    reset();
  };

  // When peer is ready, auto-send file info
  if (status.state === 'ready' && selectedFile) {
    sendFileInfo();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sans text-lg font-bold text-white">Send File</h2>
          <p className="font-mono text-xs text-[#4a6080]">Generate invite code → share → transfer</p>
        </div>
        <StatusBadge state={status.state} />
      </div>

      {/* Idle: show drop zone */}
      {status.state === 'idle' && (
        <div className="space-y-4 animate-fade-up">
          {!selectedFile ? (
            <DropZone onFile={handleFile} />
          ) : (
            <>
              <FileCard file={selectedFile} />
              <button
                onClick={handleStart}
                className="w-full font-mono text-sm py-3 rounded-lg
                  bg-[#00d4ff15] border border-[#00d4ff44] text-[#00d4ff]
                  hover:bg-[#00d4ff25] hover:border-[#00d4ff88]
                  transition-all duration-200"
              >
                GENERATE INVITE CODE →
              </button>
              <button
                onClick={() => setSelectedFile(null)}
                className="w-full font-mono text-xs py-2 text-[#4a6080] hover:text-[#c8d8e8] transition-colors"
              >
                Change file
              </button>
            </>
          )}
        </div>
      )}

      {/* Connecting */}
      {status.state === 'connecting' && (
        <div className="text-center py-8 animate-fade-up">
          <div className="w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-mono text-sm text-[#4a6080]">Connecting to server...</p>
        </div>
      )}

      {/* Waiting: show invite code */}
      {(status.state === 'waiting' || status.state === 'ready') && status.inviteCode && (
        <div className="space-y-4 animate-fade-up">
          {selectedFile && <FileCard file={selectedFile} />}
          <div className="p-6 rounded-xl bg-[#0a0e14] border border-[#1e2d40] card-glow">
            <InviteCodeDisplay code={status.inviteCode} />
          </div>
          {status.state === 'waiting' && (
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2 h-2 bg-[#ffcc00] rounded-full animate-pulse" />
              <p className="font-mono text-xs text-[#ffcc00]">Waiting for receiver to connect...</p>
            </div>
          )}
          {status.state === 'ready' && (
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2 h-2 bg-[#00ff88] rounded-full animate-pulse" />
              <p className="font-mono text-xs text-[#00ff88]">Receiver connected! Starting transfer...</p>
            </div>
          )}
          <button
            onClick={cancel}
            className="w-full font-mono text-xs py-2 text-[#4a6080] hover:text-[#ff4466] transition-colors border border-[#1e2d40] rounded-lg hover:border-[#ff446640]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Transferring */}
      {status.state === 'transferring' && selectedFile && (
        <div className="space-y-4 animate-fade-up">
          <FileCard file={selectedFile} />
          <div className="p-4 rounded-xl bg-[#0a0e14] border border-[#1e2d40]">
            <ProgressBar
              progress={status.progress}
              fileName={selectedFile.name}
              fileSize={selectedFile.size}
              bytesTransferred={status.bytesSent}
              speed={status.speed}
            />
          </div>
          <button
            onClick={cancel}
            className="w-full font-mono text-xs py-2 text-[#4a6080] hover:text-[#ff4466] transition-colors"
          >
            Cancel Transfer
          </button>
        </div>
      )}

      {/* Done */}
      {status.state === 'done' && (
        <div className="space-y-4 text-center animate-fade-up">
          <div className="text-5xl">✓</div>
          <div>
            <p className="font-mono text-sm text-[#00ff88] glow-green font-bold">TRANSFER COMPLETE</p>
            <p className="font-mono text-xs text-[#4a6080] mt-1">
              {selectedFile?.name} • {formatBytes(selectedFile?.size ?? 0)}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="font-mono text-xs px-6 py-2 rounded-lg border border-[#1e2d40] text-[#4a6080] hover:text-[#c8d8e8] hover:border-[#2a3d50] transition-all"
          >
            Send Another File
          </button>
        </div>
      )}

      {/* Error / Cancelled */}
      {(status.state === 'error' || status.state === 'cancelled') && (
        <div className="space-y-4 text-center animate-fade-up">
          <p className="font-mono text-sm text-[#ff4466]">
            {status.state === 'error' ? '✗ ' + (status.error ?? 'Transfer failed') : '✗ Cancelled'}
          </p>
          <button
            onClick={handleReset}
            className="font-mono text-xs px-6 py-2 rounded-lg border border-[#1e2d40] text-[#4a6080] hover:text-[#c8d8e8] transition-all"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
