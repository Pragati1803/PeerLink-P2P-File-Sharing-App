package com.peerlink.controller;

import com.peerlink.model.TransferSession;
import com.peerlink.service.SessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.HashMap;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
@Slf4j
public class SessionController {

    private final SessionService sessionService;

    /**
     * Validate an invite code before joining (lightweight check without WebSocket)
     */
    @GetMapping("/validate/{code}")
    public ResponseEntity<Map<String, Object>> validateCode(@PathVariable String code) {
        Optional<TransferSession> session = sessionService.getSession(code);

        if (session.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "valid", false,
                    "reason", "Code not found"
            ));
        }

        TransferSession ts = session.get();

        if (ts.isExpired()) {
            return ResponseEntity.ok(Map.of(
                    "valid", false,
                    "reason", "Session expired"
            ));
        }

        if (ts.getStatus() != TransferSession.Status.WAITING) {
            return ResponseEntity.ok(Map.of(
                    "valid", false,
                    "reason", "Session already in use"
            ));
        }

        return ResponseEntity.ok(Map.of(
                "valid", true,
                "inviteCode", ts.getInviteCode(),
                "expiresAt", ts.getExpiresAt().toEpochMilli()
        ));
    }

    /**
     * Get session status (for polling/debugging)
     */
    @GetMapping("/{code}/status")
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable String code) {

        Optional<TransferSession> session = sessionService.getSession(code);

        if (session.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        TransferSession ts = session.get();

        Map<String, Object> response = new HashMap<>();
        response.put("status", ts.getStatus().name());
        response.put("progress", ts.getProgress());
        response.put("fileName", ts.getFileName() != null ? ts.getFileName() : "");
        response.put("fileSize", ts.getFileSize());
        response.put("bytesTransferred", ts.getBytesTransferred());

        return ResponseEntity.ok(response);
    }

    /**
     * Health check / stats endpoint
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(sessionService.getStats());
    }
}