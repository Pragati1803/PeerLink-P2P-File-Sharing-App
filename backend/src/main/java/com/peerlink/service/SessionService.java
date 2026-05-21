package com.peerlink.service;

import com.peerlink.model.TransferSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class SessionService {

    private static final int SESSION_TTL_MINUTES = 30;
    private static final int INVITE_CODE_LENGTH = 6;

    // inviteCode -> TransferSession
    private final Map<String, TransferSession> sessions = new ConcurrentHashMap<>();

    // socketId -> inviteCode (for reverse lookup)
    private final Map<String, String> socketToSession = new ConcurrentHashMap<>();

    public TransferSession createSession(String senderSocketId) {
        String inviteCode = generateUniqueCode();

        TransferSession session = TransferSession.builder()
                .inviteCode(inviteCode)
                .senderSocketId(senderSocketId)
                .status(TransferSession.Status.WAITING)
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(SESSION_TTL_MINUTES * 60))
                .build();

        sessions.put(inviteCode, session);
        socketToSession.put(senderSocketId, inviteCode);

        log.info("Session created: {} for sender: {}", inviteCode, senderSocketId);
        return session;
    }

    public Optional<TransferSession> joinSession(String inviteCode, String receiverSocketId) {
        TransferSession session = sessions.get(inviteCode.toUpperCase());
        if (session == null) {
            log.warn("Session not found: {}", inviteCode);
            return Optional.empty();
        }
        if (session.isExpired()) {
            log.warn("Session expired: {}", inviteCode);
            sessions.remove(inviteCode);
            return Optional.empty();
        }
        if (session.getStatus() != TransferSession.Status.WAITING) {
            log.warn("Session already in use: {}", inviteCode);
            return Optional.empty();
        }

        session.setReceiverSocketId(receiverSocketId);
        session.setStatus(TransferSession.Status.CONNECTED);
        socketToSession.put(receiverSocketId, inviteCode);

        log.info("Receiver joined session: {} from socket: {}", inviteCode, receiverSocketId);
        return Optional.of(session);
    }

    public Optional<TransferSession> getSession(String inviteCode) {
        return Optional.ofNullable(sessions.get(inviteCode.toUpperCase()));
    }

    public Optional<TransferSession> getSessionBySocket(String socketId) {
        String inviteCode = socketToSession.get(socketId);
        if (inviteCode == null) return Optional.empty();
        return getSession(inviteCode);
    }

    public void updateStatus(String inviteCode, TransferSession.Status status) {
        getSession(inviteCode).ifPresent(s -> {
            s.setStatus(status);
            log.info("Session {} status -> {}", inviteCode, status);
        });
    }

    public void updateProgress(String inviteCode, int chunksReceived, long bytesTransferred) {
        getSession(inviteCode).ifPresent(s -> {
            s.setChunksReceived(chunksReceived);
            s.setBytesTransferred(bytesTransferred);
        });
    }

    public void removeSession(String inviteCode) {
        TransferSession session = sessions.remove(inviteCode.toUpperCase());
        if (session != null) {
            socketToSession.remove(session.getSenderSocketId());
            if (session.getReceiverSocketId() != null) {
                socketToSession.remove(session.getReceiverSocketId());
            }
            log.info("Session removed: {}", inviteCode);
        }
    }

    public void handleDisconnect(String socketId) {
        String inviteCode = socketToSession.remove(socketId);
        if (inviteCode != null) {
            TransferSession session = sessions.get(inviteCode);
            if (session != null && session.getStatus() != TransferSession.Status.COMPLETED) {
                session.setStatus(TransferSession.Status.FAILED);
                log.info("Session {} marked FAILED due to disconnect: {}", inviteCode, socketId);
            }
        }
    }

    public Map<String, Object> getStats() {
        long active = sessions.values().stream()
                .filter(s -> s.getStatus() == TransferSession.Status.CONNECTED
                        || s.getStatus() == TransferSession.Status.TRANSFERRING)
                .count();
        return Map.of(
                "totalSessions", sessions.size(),
                "activeSessions", active,
                "waitingSessions", sessions.values().stream()
                        .filter(s -> s.getStatus() == TransferSession.Status.WAITING).count()
        );
    }

    @Scheduled(fixedDelay = 300_000) // every 5 minutes
    public void cleanExpiredSessions() {
        int removed = 0;
        for (Map.Entry<String, TransferSession> entry : sessions.entrySet()) {
            if (entry.getValue().isExpired()) {
                removeSession(entry.getKey());
                removed++;
            }
        }
        if (removed > 0) log.info("Cleaned {} expired sessions", removed);
    }

    private String generateUniqueCode() {
        String code;
        do {
            code = generateCode();
        } while (sessions.containsKey(code));
        return code;
    }

    private String generateCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
        Random random = new Random();
        StringBuilder sb = new StringBuilder(INVITE_CODE_LENGTH);
        for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
