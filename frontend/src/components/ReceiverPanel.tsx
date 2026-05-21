'use client';

import { useState } from 'react';
import { useReceiver } from '@/hooks/useReceiver';
import { InviteCodeInput } from './InviteCode';
import { ProgressBar, StatusBadge } from './ProgressBar';
import { formatBytes, getFileIcon, triggerDownload } from '@/lib/utils';

export function ReceiverPanel() {
  const { status, joinSession, cancel, reset } = useReceiver();

  const handleDownload = () => {
    if (status.downloadUrl && status.fileName) {
      triggerDownload(status.downloadUrl, status.fileName);
    }
  };

  const fileIcon = status.fileType ? getFileIcon(status.fileType) : '📁';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-sans text-lg font-bold text-white">Receive File</h2>
          <p className="font-mono text-xs text-[#4a6080]">Enter code from sender → download</p>
        </div>
        <StatusBadge state={status.state} />
      </div>

      {/* Idle: enter code */}
      {status.state === 'idle' && (
        <div className="animate-fade-up">
          <InviteCodeInput onJoin={joinSession} />
        </div>
      )}

      {/* Connecting */}
      {status.state === 'connecting' && (
        <div className="text-center py-8 animate-fade-up">
          <div className="w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-mono text-sm text-[#4a6080]">Connecting...</p>
        </div>
      )}

      {/* Waiting: joined but sender hasn't sent file info yet */}
      {status.state === 'waiting' && (
        <div className="space-y-4 animate-fade-up">
          <div className="p-6 rounded-xl bg-[#0a0e14] border border-[#1e2d40] text-center">
            <div className="w-10 h-10 border-2 border-[#ffcc00] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-mono text-sm text-[#ffcc00]">Waiting for sender...</p>
            <p className="font-mono text-xs text-[#4a6080] mt-1">
              Ask them to start the transfer
            </p>
          </div>
          <button
            onClick={cancel}
            className="w-full font-mono text-xs py-2 text-[#4a6080] hover:text-[#ff4466] transition-colors border border-[#1e2d40] rounded-lg hover:border-[#ff446640]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Receiving */}
      {status.state === 'receiving' && (
        <div className="space-y-4 animate-fade-up">
          {/* File info card */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-[#0f1520] border border-[#1e2d40]">
            <span className="text-2xl">{fileIcon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm text-[#c8d8e8] truncate">{status.fileName}</p>
              <p className="font-mono text-xs text-[#4a6080]">{formatBytes(status.fileSize)}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0a0e14] border border-[#1e2d40]">
            <ProgressBar
              progress={status.progress}
              fileName={status.fileName}
              fileSize={status.fileSize}
              bytesTransferred={status.bytesReceived}
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
        <div className="space-y-4 animate-fade-up">
          <div className="p-6 rounded-xl bg-[#0a0e14] border border-[#00ff8833] text-center space-y-3">
            <div className="text-4xl">{fileIcon}</div>
            <div>
              <p className="font-mono text-sm text-[#00ff88] glow-green font-bold">TRANSFER COMPLETE</p>
              <p className="font-mono text-xs text-[#4a6080] mt-1">
                {status.fileName} • {formatBytes(status.fileSize)}
              </p>
            </div>
            <button
              onClick={handleDownload}
              className="w-full font-mono text-sm py-3 rounded-lg
                bg-[#00ff8815] border border-[#00ff8844] text-[#00ff88]
                hover:bg-[#00ff8825] hover:border-[#00ff8888]
                transition-all duration-200"
            >
              ↓ DOWNLOAD FILE
            </button>
          </div>
          <button
            onClick={reset}
            className="w-full font-mono text-xs py-2 text-[#4a6080] hover:text-[#c8d8e8] transition-colors border border-[#1e2d40] rounded-lg"
          >
            Receive Another File
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
            onClick={reset}
            className="font-mono text-xs px-6 py-2 rounded-lg border border-[#1e2d40] text-[#4a6080] hover:text-[#c8d8e8] transition-all"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
