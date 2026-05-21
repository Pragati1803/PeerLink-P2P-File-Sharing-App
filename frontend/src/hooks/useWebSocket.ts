'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type MsgType =
  | 'SESSION_CREATED' | 'RECEIVER_JOINED' | 'TRANSFER_READY'
  | 'FILE_INFO' | 'FILE_INFO_ACK'
  | 'FILE_CHUNK' | 'CHUNK_ACK' | 'TRANSFER_COMPLETE'
  | 'CANCEL' | 'ERROR' | 'PING' | 'PONG' | 'PROGRESS_UPDATE';

export interface WSMessage {
  type: MsgType;
  inviteCode?: string;
  senderId?: string;
  receiverId?: string;
  payload?: unknown;
  error?: string;
  timestamp?: number;
}

interface UseWebSocketOptions {
  onMessage?: (msg: WSMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    const wsUrl =
       process.env.NEXT_PUBLIC_WS_URL ||
         `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

    const ws = new WebSocket(`${wsUrl}/ws/transfer`);

    ws.onopen = () => {
      setConnected(true);
      setError(null);
      optionsRef.current.onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        optionsRef.current.onMessage?.(msg);
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    ws.onerror = () => {
      setError('Connection error');
    };

    ws.onclose = () => {
      setConnected(false);
      optionsRef.current.onDisconnect?.();
    };

    wsRef.current = ws;
    return ws;
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      console.warn('WebSocket not open, cannot send', msg.type);
    }
  }, []);

  const sendBinary = useCallback((data: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { connect, disconnect, send, sendBinary, connected, error };
}
