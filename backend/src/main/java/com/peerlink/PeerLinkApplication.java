package com.peerlink;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PeerLinkApplication {
    public static void main(String[] args) {
        SpringApplication.run(PeerLinkApplication.class, args);
    }
}
