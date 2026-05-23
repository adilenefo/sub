#!/usr/bin/env python3
"""读取 cfst 测速结果，为每个地区生成带独立 proxyip 的 Surge 节点"""
import csv, os, sys

UUID = "4c56333c-6445-415b-9849-e8b239e78b45"
HOST = "vless.xbrou.com"

PROXYIP = "nrt.proxyip.cmliussss.net"

PORTS = [443, 2053, 2096, 8443]

# 读测速结果，取延迟最低的 top N
result_file = "/tmp/result.csv"
best_ips = []
if os.path.exists(result_file):
    with open(result_file) as f:
        reader = csv.DictReader(f)
        for row in reader:
            ip = row.get("IP 地址", row.get("IP", "")).strip()
            delay = row.get("平均延迟", row.get("Avg Delay", "9999"))
            try:
                delay = float(str(delay).replace("ms", "").strip())
            except:
                delay = 9999
            if ip and delay < 9000:
                best_ips.append((ip, delay))
    best_ips.sort(key=lambda x: x[1])
    best_ips = best_ips[:8]
    print(f"测速结果: {len(best_ips)} 个最优 IP")
else:
    print("无测速结果，使用默认 CF IP")
    best_ips = [
        ("104.19.45.0", 1), ("172.67.170.0", 2), ("104.17.10.0", 3), ("162.159.136.0", 4),
        ("141.101.115.0", 5), ("188.114.99.0", 6), ("198.41.200.0", 7), ("108.162.194.0", 8),
    ]

lines = []
idx = 0
for ip_entry in best_ips:
    ip = ip_entry[0]
    for port in PORTS:
        idx += 1
        name = f"🇯🇵 日本{idx:02d}"
        path = f"/proxyip={PROXYIP}"
        line = (
            f"{name} = trojan, {ip}, {port}, "
            f"password={UUID}, "
            f"sni={HOST}, "
            f"ws=true, ws-path={path}, ws-headers=Host:{HOST}, "
            f"tfo=true, udp-relay=true"
        )
        lines.append(line)

output = "\n".join(lines)
with open("/tmp/cf_surge_nodes.txt", "w") as f:
    f.write(output)
print(f"生成 {len(lines)} 个节点")
for l in lines[:3]:
    print(f"  {l[:100]}...")
