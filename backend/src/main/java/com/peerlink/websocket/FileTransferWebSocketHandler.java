package com.peerlink.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.peerlink.model.FileInfo;
import com.peerlink.model.TransferSession;
import com.peerlink.model.WebSocketMessage;
import com.peerlink.service.SessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
@RequiredArgsConstructor
public class FileTransferWebSocketHandler extends AbstractWebSocketHandler {

    private final SessionService sessionService;
    private final ObjectMapper objectMapper;

    // socketId -> WebSocketSession (for sending messages)
    private final Map<String, WebSocketSession> activeSockets = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        activeSockets.put(session.getId(), session);
        log.info("WebSocket connected: {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        WebSocketMessage msg = objectMapper.readValue(message.getPayload(), WebSocketMessage.class);
        log.debug("Received {} from {}", msg.getType(), session.getId());

        switch (msg.getType()) {
            case SESSION_CREATED -> handleCreateSession(session, msg);
            case RECEIVER_JOINED -> handleJoinSession(session, msg);
            case FILE_INFO       -> handleFileInfo(session, msg);
            case FILE_INFO_ACK   -> handleFileInfoAck(session, msg);
            case FILE_CHUNK      -> handleFileChunk(session, msg);
            case CHUNK_ACK       -> handleChunkAck(session, msg);
            case TRANSFER_COMPLETE -> handleTransferComplete(session, msg);
            case CANCEL          -> handleCancel(session, msg);
            case PING            -> sendTo(session, WebSocketMessage.of(WebSocketMessage.Type.PONG, null, null));
            default -> log.warn("Unknown message type: {}", msg.getType());
        }
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        // Binary chunk relay: look up receiver and forward directly
        sessionService.getSessionBySocket(session.getId()).ifPresent(s -> {
            String targetId = session.getId().equals(s.getSenderSocketId())
                    ? s.getReceiverSocketId()
                    : s.getSenderSocketId();

            WebSocketSession target = activeSockets.get(targetId);
            if (target != null && target.isOpen()) {
                try {
                    target.sendMessage(message);
                    log.debug("Relayed binary chunk {} bytes", message.getPayloadLength());
                } catch (IOException e) {
                    log.error("Error relaying binary chunk", e);
                }
            }
        });
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        activeSockets.remove(session.getId());
        // Notify peer if transfer was ongoing
        sessionService.getSessionBySocket(session.getId()).ifPresent(s -> {
            String peerId = session.getId().equals(s.getSenderSocketId())
                    ? s.getReceiverSocketId()
                    : s.getSenderSocketId();
            WebSocketSession peer = activeSockets.get(peerId);
            if (peer != null && peer.isOpen()) {
                try {
                    sendTo(peer, WebSocketMessage.error(s.getInviteCode(), "Peer disconnected"));
                } catch (Exception e) {
                    log.error("Error notifying peer of disconnect", e);
                }
            }
        });
        sessionService.handleDisconnect(session.getId());
        log.info("WebSocket disconnected: {} ({})", session.getId(), status);
    }

    // ---- Handlers ----

    private void handleCreateSession(WebSocketSession session, WebSocketMessage msg) throws Exception {
        TransferSession ts = sessionService.createSession(session.getId());
        Map<String, Object> payload = Map.of(
                "inviteCode", ts.getInviteCode(),
                "expiresAt", ts.getExpiresAt().toEpochMilli()
        );
        sendTo(session, WebSocketMessage.of(WebSocketMessage.Type.SESSION_CREATED, ts.getInviteCode(), payload));
    }

    private void handleJoinSession(WebSocketSession session, WebSocketMessage msg) throws Exception {
        String code = msg.getInviteCode();
        var result = sessionService.joinSession(code, session.getId());
        if (result.isEmpty()) {
            sendTo(session, WebSocketMessage.error(code, "Invalid or expired invite code"));
            return;
        }
        TransferSession ts = result.get();

        // Notify receiver
        Map<String, Object> receiverPayload = Map.of("message", "Joined session. Waiting for sender...");
        sendTo(session, WebSocketMessage.of(WebSocketMessage.Type.RECEIVER_JOINED, code, receiverPayload));

        // Notify sender
        WebSocketSession sender = activeSockets.get(ts.getSenderSocketId());
        if (sender != null && sender.isOpen()) {
            Map<String, Object> senderPayload = Map.of("message", "Receiver connected. Ready to send files.");
            sendTo(sender, WebSocketMessage.of(WebSocketMessage.Type.TRANSFER_READY, code, senderPayload));
        }
    }

    private void handleFileInfo(WebSocketSession session, WebSocketMessage msg) throws Exception {
        String code = msg.getInviteCode();
        sessionService.getSession(code).ifPresent(ts -> {
            if (!session.getId().equals(ts.getSenderSocketId())) return;

            // Store file metadata in session
            try {
                FileInfo fi = objectMapper.convertValue(msg.getPayload(), FileInfo.class);
                ts.setFileName(fi.getName());
                ts.setFileSize(fi.getSize());
                ts.setFileType(fi.getType());
                ts.setTotalChunks(fi.getTotalChunks());
                ts.setStatus(TransferSession.Status.TRANSFERRING);

                // Forward to receiver
                WebSocketSession receiver = activeSockets.get(ts.getReceiverSocketId());
                if (receiver != null && receiver.isOpen()) {
                    sendTo(receiver, WebSocketMessage.of(WebSocketMessage.Type.FILE_INFO, code, fi));
                }
            } catch (Exception e) {
                log.error("Error processing FILE_INFO", e);
            }
        });
    }

    private void handleFileInfoAck(WebSocketSession session, WebSocketMessage msg) throws Exception {
        String code = msg.getInviteCode();
        sessionService.getSession(code).ifPresent(ts -> {
            WebSocketSession sender = activeSockets.get(ts.getSenderSocketId());
            if (sender != null && sender.isOpen()) {
                try {
                    sendTo(sender, WebSocketMessage.of(WebSocketMessage.Type.FILE_INFO_ACK, code, msg.getPayload()));
                } catch (Exception e) {
                    log.error("Error forwarding FILE_INFO_ACK", e);
                }
            }
        });
    }

    private void handleFileChunk(WebSocketSession session, WebSocketMessage msg) throws Exception {
        String code = msg.getInviteCode();
        sessionService.getSession(code).ifPresent(ts -> {
            // Relay chunk info to receiver (actual binary is handled in handleBinaryMessage)
            WebSocketSession receiver = activeSockets.get(ts.getReceiverSocketId());
            if (receiver != null && receiver.isOpen()) {
                try {
                    sendTo(receiver, msg);

                    // Update progress
                    Map<?, ?> payload = objectMapper.convertValue(msg.getPayload(), Map.class);
                    int chunkIndex = (int) payload.get("chunkIndex");
                    long bytesTransferred = (long)(int) payload.get("offset");
                    sessionService.updateProgress(code, chunkIndex + 1, bytesTransferred);
                } catch (Exception e) {
                    log.error("Error relaying chunk", e);
                }
            }
        });
    }

    private void handleChunkAck(WebSocketSession session, WebSocketMessage msg) throws Exception {
        String code = msg.getInviteCode();
        sessionService.getSession(code).ifPresent(ts -> {
            WebSocketSession sender = activeSockets.get(ts.getSenderSocketId());
            if (sender != null && sender.isOpen()) {
                try {
                    sendTo(sender, msg);
                } catch (Exception e) {
                    log.error("Error forwarding CHUNK_ACK", e);
                }
            }
        });
    }

    private void handleTransferComplete(WebSocketSession session, WebSocketMessage msg) throws Exception {
        String code = msg.getInviteCode();
        sessionService.updateStatus(code, TransferSession.Status.COMPLETED);
        sessionService.getSession(code).ifPresent(ts -> {
            // Notify both parties
            String targetId = session.getId().equals(ts.getSenderSocketId())
                    ? ts.getReceiverSocketId()
                    : ts.getSenderSocketId();
            WebSocketSession target = activeSockets.get(targetId);
            if (target != null && target.isOpen()) {
                try {
                    sendTo(target, WebSocketMessage.of(WebSocketMessage.Type.TRANSFER_COMPLETE, code, msg.getPayload()));
                } catch (Exception e) {
                    log.error("Error sending TRANSFER_COMPLETE to peer", e);
                }
            }
        });
    }

    private void handleCancel(WebSocketSession session, WebSocketMessage msg) throws Exception {
        String code = msg.getInviteCode();
        sessionService.updateStatus(code, TransferSession.Status.FAILED);
        sessionService.getSession(code).ifPresent(ts -> {
            String targetId = session.getId().equals(ts.getSenderSocketId())
                    ? ts.getReceiverSocketId()
                    : ts.getSenderSocketId();
            WebSocketSession target = activeSockets.get(targetId);
            if (target != null && target.isOpen()) {
                try {
                    sendTo(target, WebSocketMessage.of(WebSocketMessage.Type.CANCEL, code, "Transfer cancelled by peer"));
                } catch (Exception e) {
                    log.error("Error sending CANCEL to peer", e);
                }
            }
        });
    }

    // ---- Helpers ----

    private void sendTo(WebSocketSession session, WebSocketMessage msg) throws Exception {
        if (session.isOpen()) {
            String json = objectMapper.writeValueAsString(msg);
            session.sendMessage(new TextMessage(json));
        }
    }
}
