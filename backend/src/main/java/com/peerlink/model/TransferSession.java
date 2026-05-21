package com.peerlink.model;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.ArrayList;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TransferSession {

    public enum Status {
        WAITING,       // Sender created, waiting for receiver
        CONNECTED,     // Receiver joined, both peers connected
        TRANSFERRING,  // File transfer in progress
        COMPLETED,     // Transfer done
        FAILED,        // Transfer failed
        EXPIRED        // Session expired
    }

    private String inviteCode;
    private String senderSocketId;
    private String receiverSocketId;
    private Status status;
    private Instant createdAt;
    private Instant expiresAt;

    // File metadata
    private String fileName;
    private long fileSize;
    private String fileType;

    // Transfer progress
    private long bytesTransferred;
    private int totalChunks;
    private int chunksReceived;

    @Builder.Default
    private List<String> errors = new ArrayList<>();

    public double getProgress() {
        if (totalChunks == 0) return 0.0;
        return (double) chunksReceived / totalChunks * 100.0;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}
