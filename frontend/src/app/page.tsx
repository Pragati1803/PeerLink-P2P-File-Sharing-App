'use client';

import { useState } from 'react';
import { SenderPanel } from '@/components/SenderPanel';
import { ReceiverPanel } from '@/components/ReceiverPanel';

type Tab = 'send' | 'receive';

export default function Home() {
  const [tab, setTab] = useState<Tab>('send');

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 z-10">

      {/* Ambient glow blobs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-[#00d4ff] opacity-[0.03] rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 bg-[#00ff88] opacity-[0.03] rounded-full blur-3xl pointer-events-none" />

      {/* Logo / Header */}
      <div className="text-center mb-10 animate-fade-up">
        <div className="inline-flex items-center gap-2 mb-3">
          {/* P2P icon */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[#00d4ff]">
            <circle cx="5" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="19" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2"/>
            <path d="M14 9l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 className="font-sans text-3xl font-extrabold text-white tracking-tight">
            Peer<span className="text-[#00d4ff] glow-accent">Link</span>
          </h1>
        </div>
        <p className="font-mono text-xs text-[#4a6080]">
          Secure P2P file transfer · No cloud · No storage · Just peers
        </p>
      </div>

      {/* Main card */}
      <div className="w-full max-w-md animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="rounded-2xl bg-[#0f1520] border border-[#1e2d40] card-glow overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-[#1e2d40]">
            {(['send', 'receive'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 font-mono text-xs py-4 uppercase tracking-widest transition-all duration-200
                  ${tab === t
                    ? 'text-[#00d4ff] bg-[#00d4ff08] border-b-2 border-[#00d4ff]'
                    : 'text-[#4a6080] hover:text-[#c8d8e8]'
                  }`}
              >
                {t === 'send' ? '↑ Send' : '↓ Receive'}
              </button>
            ))}
          </div>

          {/* Panel */}
          <div className="p-6">
            {tab === 'send' ? <SenderPanel /> : <ReceiverPanel />}
          </div>
        </div>

        {/* Footer hints */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { icon: '🔒', text: 'End-to-end encrypted' },
            { icon: '⚡', text: 'Direct peer transfer' },
            { icon: '🚫', text: 'No file storage' },
          ].map(({ icon, text }) => (
            <div key={text} className="text-center p-3 rounded-lg bg-[#0f1520] border border-[#1e2d40]">
              <div className="text-lg mb-1">{icon}</div>
              <p className="font-mono text-[10px] text-[#4a6080] leading-tight">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mt-10 text-center animate-fade-up" style={{ animationDelay: '0.2s' }}>
        <p className="font-mono text-xs text-[#2a3d50]">
          PeerLink · Java + Spring Boot · Next.js · WebSockets · Docker
        </p>
      </div>
    </main>
  );
}
