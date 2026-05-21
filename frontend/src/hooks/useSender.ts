'use client';

import { useCallback, useRef, useState } from 'react';
import { useWebSocket, WSMessage } from './useWebSocket';

const CHUNK_SIZE = 65536; // 64KB

export type SenderState =
  | 'idle' | 'connecting' | 'waiting' | 'ready' | 'transferring' | 'done' | 'error' | 'cancelled';

export interface SenderStatus {
  state: SenderState;
  inviteCode: string | null;
  progress: number;
  bytesSent: number;
  speed: number; // bytes/sec
  error: string | null;
}

export function useSender() {
  const [status, setStatus] = useState<SenderStatus>({
    state: 'idle',
    inviteCode: null,
    progress: 0,
    bytesSent: 0,
    speed: 0,
    error: null,
  });

  const fileRef = useRef<File | null>(null);
  const inviteCodeRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(0);
  const sentBytesRef = useRef<number>(0);

  const { connect, disconnect, send, connected } = useWebSocket({
    onMessage: handleMessage,
    onDisconnect: () => {
      setStatus(prev => {
        if (prev.state !== 'done' && prev.state !== 'idle') {
          return { ...prev, state: 'error', error: 'Connection lost' };
        }
        return prev;
      });
    },
  });

  function handleMessage(msg: WSMessage) {
    switch (msg.type) {
      case 'SESSION_CREATED': {
        const payload = msg.payload as { inviteCode: string };
        inviteCodeRef.current = payload.inviteCode;
        setStatus(prev => ({ ...prev, state: 'waiting', inviteCode: payload.inviteCode }));
        break;
      }
      case 'TRANSFER_READY':
        setStatus(prev => ({ ...prev, state: 'ready' }));
        break;
      case 'FILE_INFO_ACK':
        // Receiver acknowledged — start streaming chunks
        startSendingChunks();
        break;
      case 'CHUNK_ACK': {
        // Flow control: receiver acked chunk
        const { chunkIndex, totalChunks } = msg.payload as { chunkIndex: number; totalChunks: number };
        const progress = ((chunkIndex + 1) / totalChunks) * 100;
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const speed = elapsed > 0 ? sentBytesRef.current / elapsed : 0;
        setStatus(prev => ({ ...prev, progress, bytesSent: sentBytesRef.current, speed }));
        break;
      }
      case 'TRANSFER_COMPLETE':
        setStatus(prev => ({ ...prev, state: 'done', progress: 100 }));
        break;
      case 'CANCEL':
        setStatus(prev => ({ ...prev, state: 'cancelled', error: 'Receiver cancelled' }));
        break;
      case 'ERROR':
        setStatus(prev => ({ ...prev, state: 'error', error: msg.error ?? 'Unknown error' }));
        break;
    }
  }

  const startSession = useCallback((file: File) => {
    fileRef.current = file;
    setStatus({ state: 'connecting', inviteCode: null, progress: 0, bytesSent: 0, speed: 0, error: null });
    const ws = connect();
    ws.addEventListener('open', () => {
      send({ type: 'SESSION_CREATED', inviteCode: '' });
    });
  }, [connect, send]);

  const sendFileInfo = useCallback(() => {
    const file = fileRef.current;
    const code = inviteCodeRef.current;
    if (!file || !code) return;

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      totalChunks,
      chunkSize: CHUNK_SIZE,
    };

    send({ type: 'FILE_INFO', inviteCode: code, payload: fileInfo });
    setStatus(prev => ({ ...prev, state: 'transferring' }));
  }, [send]);

  const startSendingChunks = useCallback(async () => {
    const file = fileRef.current;
    const code = inviteCodeRef.current;
    if (!file || !code) return;

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    startTimeRef.current = Date.now();
    sentBytesRef.current = 0;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const buffer = await chunk.arrayBuffer();

      // Send metadata
      send({
        type: 'FILE_CHUNK',
        inviteCode: code,
        payload: {
          chunkIndex: i,
          totalChunks,
          offset: start,
          size: end - start,
        },
      });

      // Send binary data
      sentBytesRef.current += buffer.byteLength;
    }

    // Signal complete
    send({ type: 'TRANSFER_COMPLETE', inviteCode: code, payload: { fileName: file.name } });
  }, [send]);

  const cancel = useCallback(() => {
    const code = inviteCodeRef.current;
    if (code) send({ type: 'CANCEL', inviteCode: code });
    setStatus(prev => ({ ...prev, state: 'cancelled' }));
    disconnect();
  }, [send, disconnect]);

  const reset = useCallback(() => {
    disconnect();
    fileRef.current = null;
    inviteCodeRef.current = null;
    setStatus({ state: 'idle', inviteCode: null, progress: 0, bytesSent: 0, speed: 0, error: null });
  }, [disconnect]);

  return { status, connected, startSession, sendFileInfo, cancel, reset };
}
