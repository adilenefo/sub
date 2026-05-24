#!/usr/bin/env python3
"""从 ip.v2too.top 抓取优选IP，生成 Surge 节点"""
import urllib.request, re, os

UUID = "4c56333c-6445-415b-9849-e8b239e78b45"
HOST = "vless.xbrou.com"

# 从 ip.v2too.top 抓取三网优选IP（HTML解析）
def fetch_v2too_ips():
    try:
        req = urllib.request.Request('https://ip.v2too.top',
            headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req, timeout=15).read().decode()
        ips = re.findall(r"copyIP\('(\d+\.\d+\.\d+\.\d+)'\)", html)
        # 去重保序
        seen = set()
        unique = []
        for ip in ips:
            if ip not in seen:
                seen.add(ip)
                unique.append(ip)
        return unique
    except Exception as e:
        print(f"抓取失败: {e}")
        return []

# 硬编码备用（电信+移动 2026-05-24）
FALLBACK_IPS = [
    "108.162.198.71", "172.64.53.202", "162.159.49.226", "162.159.44.111",
    "162.159.45.1", "172.64.159.188", "172.64.52.16", "162.159.3.66",
    "104.17.208.175", "104.17.222.88", "104.18.95.5", "104.16.159.213",
    "104.17.147.138", "104.17.56.119", "104.17.154.111", "104.16.247.138",
]

ips = fetch_v2too_ips()
if len(ips) >= 5:
    CF_IPS = ips[:20]
    print(f"从 v2too.top 获取 {len(CF_IPS)} 个优选IP")
else:
    CF_IPS = FALLBACK_IPS
    print(f"使用备用 {len(CF_IPS)} 个优选IP")

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
ip_idx = 0
for cc, label in REGIONS.items():
    for i, port in enumerate(PORTS):
        addr = CF_IPS[ip_idx % len(CF_IPS)]
        ip_idx += 1
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
