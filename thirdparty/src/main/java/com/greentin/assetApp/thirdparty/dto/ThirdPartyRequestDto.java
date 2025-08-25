package com.greentin.assetApp.thirdparty.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThirdPartyRequestDto {
    private String assetType;
    private String employeeName;
    private String priority;
}
