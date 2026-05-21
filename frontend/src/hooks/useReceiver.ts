'use client';

import { useCallback, useRef, useState } from 'react';
import { useWebSocket, WSMessage } from './useWebSocket';

export type ReceiverState =
  | 'idle' | 'connecting' | 'waiting' | 'receiving' | 'done' | 'error' | 'cancelled';

export interface ReceiverStatus {
  state: ReceiverState;
  fileName: string | null;
  fileSize: number;
  fileType: string | null;
  progress: number;
  bytesReceived: number;
  speed: number;
  error: string | null;
  downloadUrl: string | null;
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
  totalChunks: number;
  chunkSize: number;
}

export function useReceiver() {
  const [status, setStatus] = useState<ReceiverStatus>({
    state: 'idle',
    fileName: null,
    fileSize: 0,
    fileType: null,
    progress: 0,
    bytesReceived: 0,
    speed: 0,
    error: null,
    downloadUrl: null,
  });

  const inviteCodeRef = useRef<string | null>(null);
  const fileInfoRef = useRef<FileInfo | null>(null);
  const chunksRef = useRef<ArrayBuffer[]>([]);
  const startTimeRef = useRef<number>(0);
  const receivedBytesRef = useRef<number>(0);
  const pendingBinaryRef = useRef<boolean>(false);

  const { connect, disconnect, send } = useWebSocket({
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
      case 'RECEIVER_JOINED':
        setStatus(prev => ({ ...prev, state: 'waiting' }));
        break;

      case 'FILE_INFO': {
        const fi = msg.payload as FileInfo;
        fileInfoRef.current = fi;
        chunksRef.current = new Array(fi.totalChunks);
        startTimeRef.current = Date.now();
        receivedBytesRef.current = 0;

        setStatus(prev => ({
          ...prev,
          state: 'receiving',
          fileName: fi.name,
          fileSize: fi.size,
          fileType: fi.type,
        }));

        // Acknowledge file info
        send({ type: 'FILE_INFO_ACK', inviteCode: msg.inviteCode!, payload: { ready: true } });
        break;
      }

      case 'FILE_CHUNK': {
        const { chunkIndex, totalChunks, offset, size } = msg.payload as {
          chunkIndex: number; totalChunks: number; offset: number; size: number;
        };
        pendingBinaryRef.current = true;

        // We'll receive the binary in the next onmessage event
        // For now, track progress based on metadata
        receivedBytesRef.current = offset + size;
        const progress = ((chunkIndex + 1) / totalChunks) * 100;
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const speed = elapsed > 0 ? receivedBytesRef.current / elapsed : 0;

        setStatus(prev => ({
          ...prev,
          progress,
          bytesReceived: receivedBytesRef.current,
          speed,
        }));

        // Send chunk ack
        send({
          type: 'CHUNK_ACK',
          inviteCode: inviteCodeRef.current!,
          payload: { chunkIndex, totalChunks },
        });
        break;
      }

      case 'TRANSFER_COMPLETE': {
        // Rebuild file from chunks
        assembleFile();
        break;
      }

      case 'CANCEL':
        setStatus(prev => ({ ...prev, state: 'cancelled', error: 'Sender cancelled the transfer' }));
        break;

      case 'ERROR':
        setStatus(prev => ({ ...prev, state: 'error', error: msg.error ?? 'Unknown error' }));
        break;
    }
  }

  function assembleFile() {
    const fi = fileInfoRef.current;
    if (!fi) return;

    try {
      // Build blob from received data
      const blob = new Blob(chunksRef.current.filter(Boolean), { type: fi.type });
      const url = URL.createObjectURL(blob);

      setStatus(prev => ({
        ...prev,
        state: 'done',
        progress: 100,
        downloadUrl: url,
      }));
    } catch (e) {
      setStatus(prev => ({ ...prev, state: 'error', error: 'Failed to assemble file' }));
    }
  }

  const joinSession = useCallback((inviteCode: string) => {
    inviteCodeRef.current = inviteCode.toUpperCase();
    setStatus(prev => ({ ...prev, state: 'connecting', error: null }));

    const ws = connect();
    ws.addEventListener('open', () => {
      send({ type: 'RECEIVER_JOINED', inviteCode: inviteCode.toUpperCase() });
    });

    // Handle binary chunks
    ws.addEventListener('message', (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer && pendingBinaryRef.current) {
        pendingBinaryRef.current = false;
        const fi = fileInfoRef.current;
        if (!fi) return;
        // Find next empty slot
        const idx = chunksRef.current.findIndex(c => c === undefined || c === null);
        if (idx !== -1) chunksRef.current[idx] = event.data;
      }
    });
  }, [connect, send]);

  const cancel = useCallback(() => {
    const code = inviteCodeRef.current;
    if (code) send({ type: 'CANCEL', inviteCode: code });
    setStatus(prev => ({ ...prev, state: 'cancelled' }));
    disconnect();
  }, [send, disconnect]);

  const reset = useCallback(() => {
    disconnect();
    inviteCodeRef.current = null;
    fileInfoRef.current = null;
    chunksRef.current = [];
    setStatus({
      state: 'idle', fileName: null, fileSize: 0, fileType: null,
      progress: 0, bytesReceived: 0, speed: 0, error: null, downloadUrl: null,
    });
  }, [disconnect]);

  return { status, joinSession, cancel, reset };
}
