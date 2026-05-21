package com.peerlink.model;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FileInfo {
    private String name;
    private long size;
    private String type;
    private int totalChunks;
    private int chunkSize;
    private String checksum;
}
