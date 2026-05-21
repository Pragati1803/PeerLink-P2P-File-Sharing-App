'use client';

import { useState } from 'react';

interface InviteCodeProps {
  code: string;
}

export function InviteCodeDisplay({ code }: InviteCodeProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="text-center space-y-4">
      <p className="font-mono text-xs text-[#4a6080] uppercase tracking-widest">Invite Code</p>

      {/* Code display */}
      <div
        onClick={copy}
        className="cursor-pointer inline-block group"
        title="Click to copy"
      >
        <div className="relative px-8 py-5 rounded-xl bg-[#0f1520] border border-[#1e2d40]
          group-hover:border-[#00d4ff66] transition-all duration-300 card-glow">
          <span className="font-mono text-4xl font-bold tracking-[0.3em] text-[#00d4ff] glow-accent">
            {code}
          </span>
          {/* Cursor blink */}
          <span className="ml-1 inline-block w-0.5 h-8 bg-[#00d4ff] cursor-blink align-middle" />
        </div>
      </div>

      <button
        onClick={copy}
        className={`font-mono text-xs px-4 py-2 rounded-lg border transition-all duration-200
          ${copied
            ? 'border-[#00ff88] text-[#00ff88] bg-[#00ff8810]'
            : 'border-[#1e2d40] text-[#4a6080] hover:border-[#00d4ff66] hover:text-[#00d4ff]'
          }`}
      >
        {copied ? '✓ COPIED' : 'COPY CODE'}
      </button>

      <p className="font-mono text-xs text-[#2a3d50]">
        Share this code with the receiver
      </p>
    </div>
  );
}

interface InviteCodeInputProps {
  onJoin: (code: string) => void;
  disabled?: boolean;
}

export function InviteCodeInput({ onJoin, disabled }: InviteCodeInputProps) {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length >= 4) onJoin(code.trim().toUpperCase());
  };

  return (
    <div className="space-y-3">
      <p className="font-mono text-xs text-[#4a6080] uppercase tracking-widest">Enter Invite Code</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
          placeholder="XXXXXX"
          disabled={disabled}
          className="flex-1 font-mono text-xl font-bold tracking-[0.2em] text-center
            bg-[#0f1520] border border-[#1e2d40] rounded-lg px-4 py-3
            text-[#00d4ff] placeholder-[#2a3d50]
            focus:outline-none focus:border-[#00d4ff66] focus:ring-1 focus:ring-[#00d4ff33]
            disabled:opacity-40 transition-all duration-200"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || code.length < 4}
          className="font-mono text-sm px-5 py-3 rounded-lg
            bg-[#00d4ff15] border border-[#00d4ff44] text-[#00d4ff]
            hover:bg-[#00d4ff25] hover:border-[#00d4ff88]
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-all duration-200"
        >
          JOIN →
        </button>
      </div>
    </div>
  );
}
