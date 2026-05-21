'use client';

import { formatBytes, formatSpeed } from '@/lib/utils';

interface ProgressBarProps {
  progress: number;
  fileName?: string | null;
  fileSize?: number;
  bytesTransferred?: number;
  speed?: number;
  label?: string;
}

export function ProgressBar({
  progress,
  fileName,
  fileSize,
  bytesTransferred,
  speed,
  label,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <div className="space-y-3">
      {/* File info */}
      {fileName && (
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-[#c8d8e8] truncate max-w-[200px]">{fileName}</span>
          {fileSize !== undefined && (
            <span className="font-mono text-xs text-[#4a6080]">{formatBytes(fileSize)}</span>
          )}
        </div>
      )}

      {/* Bar */}
      <div className="relative h-2 bg-[#1e2d40] rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-300 progress-bar-fill"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #00d4ff, #00ff88)',
          }}
        />
        {/* Shine */}
        <div
          className="absolute left-0 top-0 h-full rounded-full opacity-40"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, transparent 60%, rgba(255,255,255,0.4))',
          }}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {bytesTransferred !== undefined && fileSize !== undefined && (
            <span className="font-mono text-xs text-[#4a6080]">
              {formatBytes(bytesTransferred)} / {formatBytes(fileSize)}
            </span>
          )}
          {speed !== undefined && speed > 0 && (
            <span className="font-mono text-xs text-[#00d4ff]">
              ↑ {formatSpeed(speed)}
            </span>
          )}
        </div>
        <span className="font-mono text-sm font-bold text-[#00d4ff]">
          {pct.toFixed(1)}%
        </span>
      </div>

      {label && (
        <p className="font-mono text-xs text-[#4a6080]">{label}</p>
      )}
    </div>
  );
}

export function StatusBadge({ state }: { state: string }) {
  const config: Record<string, { color: string; dot: string; label: string }> = {
    idle:         { color: 'text-[#4a6080]',  dot: 'bg-[#4a6080]',  label: 'IDLE' },
    connecting:   { color: 'text-[#ffcc00]',  dot: 'bg-[#ffcc00]',  label: 'CONNECTING' },
    waiting:      { color: 'text-[#ffcc00]',  dot: 'bg-[#ffcc00]',  label: 'WAITING FOR PEER' },
    ready:        { color: 'text-[#00ff88]',  dot: 'bg-[#00ff88]',  label: 'PEER CONNECTED' },
    receiving:    { color: 'text-[#00d4ff]',  dot: 'bg-[#00d4ff]',  label: 'RECEIVING' },
    transferring: { color: 'text-[#00d4ff]',  dot: 'bg-[#00d4ff]',  label: 'SENDING' },
    done:         { color: 'text-[#00ff88]',  dot: 'bg-[#00ff88]',  label: 'COMPLETE' },
    error:        { color: 'text-[#ff4466]',  dot: 'bg-[#ff4466]',  label: 'ERROR' },
    cancelled:    { color: 'text-[#ff4466]',  dot: 'bg-[#ff4466]',  label: 'CANCELLED' },
  };

  const c = config[state] ?? config.idle;

  return (
    <div className={`inline-flex items-center gap-2 font-mono text-xs ${c.color}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot} ${
        ['connecting', 'waiting', 'transferring', 'receiving'].includes(state)
          ? 'animate-pulse' : ''
      }`} />
      {c.label}
    </div>
  );
}
