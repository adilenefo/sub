/*
 * CF 优选IP自动更新脚本
 * 从 ip.v2too.top 抓取三网优选IP，更新到 EDT2 的 ADD.txt
 * 
 * Surge 配置：
 * [Script]
 * cf-bestip = type=cron,cronexp=0 */6 * * *,timeout=60,script-path=https://raw.githubusercontent.com/adilenefo/sub/main/cf-bestip-update.js,wake-system=1
 */

const EDT2_URL = "https://vless.xbrou.com";
const EDT2_PASS = "xbrou";
const V2TOO_URL = "https://ip.v2too.top";

const REGIONS = {
  "HK": "🇭🇰香港",
  "JP": "🇯🇵日本",
  "SG": "🇸🇬新加坡",
  "KR": "🇰🇷韩国",
  "TW": "🇹🇼台湾",
  "US": "🇺🇸美国",
  "UK": "🇬🇧英国",
  "DE": "🇩🇪德国",
};
const PORTS = [443, 2053, 2096, 2083];

// 备用API
const BACKUP_APIS = [
  "https://ipdb.api.030101.xyz/?type=bestcf",
  "https://addressesapi.090227.xyz/CloudFlareYes",
];

function httpGet(url) {
  return new Promise((resolve, reject) => {
    $httpClient.get({ url, headers: { "User-Agent": "Mozilla/5.0" } }, (err, resp, body) => {
      if (err) reject(err);
      else resolve(body);
    });
  });
}

function httpPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    $httpClient.post({ url, headers, body }, (err, resp, data) => {
      if (err) reject(err);
      else resolve({ status: resp.status, body: data });
    });
  });
}

// 从 v2too.top HTML 中提取优选IP
function parseV2tooIPs(html) {
  const ips = [];
  const regex = /copyIP\('(\d+\.\d+\.\d+\.\d+)'\)/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (!ips.includes(match[1])) ips.push(match[1]);
  }
  return ips;
}

// 从备用API提取IP
function parseBackupIPs(text) {
  const ips = [];
  const regex = /(\d+\.\d+\.\d+\.\d+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (!ips.includes(match[1])) ips.push(match[1]);
  }
  return ips;
}

// 生成 ADD.txt 内容
function generateADDTxt(ips) {
  const lines = [];
  let idx = 0;
  const regions = Object.entries(REGIONS);
  for (const [cc, label] of regions) {
    for (let i = 0; i < PORTS.length; i++) {
      const ip = ips[idx % ips.length];
      idx++;
      lines.push(`${ip}:${PORTS[i]}#${label}${String(i + 1).padStart(2, "0")}`);
    }
  }
  return lines.join("\n");
}

// 登录 EDT2 并更新 ADD.txt
async function updateEDT2(addTxt) {
  // 登录
  await httpPost(
    `${EDT2_URL}/login`,
    { "Content-Type": "application/x-www-form-urlencoded" },
    `password=${EDT2_PASS}`
  );

  // 更新 ADD.txt
  const resp = await httpPost(
    `${EDT2_URL}/admin/ADD.txt`,
    { "Content-Type": "text/plain;charset=UTF-8" },
    addTxt
  );
  return resp;
}

(async () => {
  try {
    let ips = [];

    // 1. 尝试从 v2too.top 获取
    try {
      const html = await httpGet(V2TOO_URL);
      ips = parseV2tooIPs(html);
      if (ips.length > 0) console.log(`v2too.top: ${ips.length} 个IP`);
    } catch (e) {
      console.log(`v2too.top 失败: ${e}`);
    }

    // 2. 备用API
    if (ips.length < 5) {
      for (const api of BACKUP_APIS) {
        try {
          const text = await httpGet(api);
          const backupIPs = parseBackupIPs(text);
          if (backupIPs.length > 0) {
            ips = backupIPs;
            console.log(`备用API ${api}: ${ips.length} 个IP`);
            break;
          }
        } catch (e) {
          console.log(`备用API失败: ${e}`);
        }
      }
    }

    if (ips.length === 0) {
      $notification.post("CF优选IP", "❌ 更新失败", "所有API均无法获取IP");
      return $done();
    }

    // 生成 ADD.txt 并更新
    const addTxt = generateADDTxt(ips);
    const resp = await updateEDT2(addTxt);

    const regionCount = Object.keys(REGIONS).length;
    const nodeCount = regionCount * PORTS.length;
    const msg = `${ips.length} 个优选IP → ${regionCount} 地区 × ${PORTS.length} 端口 = ${nodeCount} 节点`;

    $notification.post("CF优选IP", "✅ 更新成功", msg);
    console.log(msg);
    console.log("前3个IP: " + ips.slice(0, 3).join(", "));
  } catch (e) {
    $notification.post("CF优选IP", "❌ 更新失败", String(e));
    console.log("错误: " + e);
  }

  $done();
})();
