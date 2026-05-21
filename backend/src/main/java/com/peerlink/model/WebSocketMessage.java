package com.peerlink.model;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonInclude;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class WebSocketMessage {

    public enum Type {
        // Session lifecycle
        SESSION_CREATED,
        RECEIVER_JOINED,
        TRANSFER_READY,

        // File metadata
        FILE_INFO,
        FILE_INFO_ACK,

        // Data transfer
        FILE_CHUNK,
        CHUNK_ACK,
        TRANSFER_COMPLETE,

        // Control
        CANCEL,
        ERROR,
        PING,
        PONG,

        // Status
        PROGRESS_UPDATE
    }

    private Type type;
    private String inviteCode;
    private String senderId;
    private String receiverId;
    private Object payload;
    private String error;
    private long timestamp;

    public static WebSocketMessage of(Type type, String inviteCode, Object payload) {
        return WebSocketMessage.builder()
                .type(type)
                .inviteCode(inviteCode)
                .payload(payload)
                .timestamp(System.currentTimeMillis())
                .build();
    }

    public static WebSocketMessage error(String inviteCode, String errorMsg) {
        return WebSocketMessage.builder()
                .type(Type.ERROR)
                .inviteCode(inviteCode)
                .error(errorMsg)
                .timestamp(System.currentTimeMillis())
                .build();
    }
}
