package com.peerlink.config;

import com.peerlink.websocket.FileTransferWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final FileTransferWebSocketHandler fileTransferHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(fileTransferHandler, "/ws/transfer")
                .setAllowedOriginPatterns("*");
    }
}
