#!/usr/bin/env python3
"""读取 cfst 测速结果，为每个地区生成带独立 proxyip 的 Surge 节点"""
import csv, os, sys

UUID = "4c56333c-6445-415b-9849-e8b239e78b45"
HOST = "vless.xbrou.com"

# 对中国网络友好的 CF 优选域名/IP
# 这些域名的 DNS 解析会返回对中国路由优化的 CF 边缘 IP
CF_ADDRS = [
    "icook.hk",
    "time.is",
    "shopify.com",
    "www.who.int",
    "japan.com",
    "malaysia.com",
    "russia.com",
    "wto.org",
]

REGIONS = {
    "HK": "🇭🇰 香港",
    "JP": "🇯🇵 日本",
    "SG": "🇸🇬 新加坡",
    "KR": "🇰🇷 韩国",
    "TW": "🇹🇼 台湾",
    "US": "🇺🇸 美国",
    "UK": "🇬🇧 英国",
    "DE": "🇩🇪 德国",
}

PORTS = [443, 2053, 2096, 2083]

lines = []
for cc, label in REGIONS.items():
    for i, port in enumerate(PORTS):
        addr = CF_ADDRS[i % len(CF_ADDRS)]
        name = f"{label}{i+1:02d}"
        line = (
            f"{name} = trojan, {addr}, {port}, "
            f"password={UUID}, "
            f"sni={HOST}, "
            f"ws=true, ws-path=/, ws-headers=Host:{HOST}, "
            f"tfo=true, udp-relay=true"
        )
        lines.append(line)

output = "\n".join(lines)
with open("/tmp/cf_surge_nodes.txt", "w") as f:
    f.write(output)
print(f"生成 {len(lines)} 个节点")
for l in lines[:3]:
    print(f"  {l[:100]}...")
