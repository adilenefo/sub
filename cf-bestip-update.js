var EDT2_URL = "https://vless.xbrou.com";
var EDT2_PASS = "xbrou";
var V2TOO_URL = "https://ip.v2too.top";

var REGIONS = [
  ["HK", "\ud83c\udded\ud83c\uddf0\u9999\u6e2f"],
  ["JP", "\ud83c\uddef\ud83c\uddf5\u65e5\u672c"],
  ["SG", "\ud83c\uddf8\ud83c\uddec\u65b0\u52a0\u5761"],
  ["KR", "\ud83c\uddf0\ud83c\uddf7\u97e9\u56fd"],
  ["TW", "\ud83c\uddf9\ud83c\uddfc\u53f0\u6e7e"],
  ["US", "\ud83c\uddfa\ud83c\uddf8\u7f8e\u56fd"],
  ["UK", "\ud83c\uddec\ud83c\udde7\u82f1\u56fd"],
  ["DE", "\ud83c\udde9\ud83c\uddea\u5fb7\u56fd"]
];
var PORTS = [443, 2053, 2096, 2083];

var BACKUP_APIS = [
  "https://ipdb.api.030101.xyz/?type=bestcf",
  "https://addressesapi.090227.xyz/CloudFlareYes"
];

function httpGet(url, cb) {
  $httpClient.get({url: url, headers: {"User-Agent": "Mozilla/5.0"}}, function(err, resp, body) {
    cb(err, body);
  });
}

function httpPost(url, headers, body, cb) {
  $httpClient.post({url: url, headers: headers, body: body}, function(err, resp, data) {
    cb(err, resp, data);
  });
}

function parseIPs(html) {
  var ips = [];
  var re = /copyIP\('(\d+\.\d+\.\d+\.\d+)'\)/g;
  var m;
  while ((m = re.exec(html)) !== null) {
    if (ips.indexOf(m[1]) === -1) ips.push(m[1]);
  }
  return ips;
}

function parseBackup(text) {
  var ips = [];
  var re = /(\d+\.\d+\.\d+\.\d+)/g;
  var m;
  while ((m = re.exec(text)) !== null) {
    if (ips.indexOf(m[1]) === -1) ips.push(m[1]);
  }
  return ips;
}

function generateADD(ips) {
  var lines = [];
  var idx = 0;
  for (var r = 0; r < REGIONS.length; r++) {
    var label = REGIONS[r][1];
    for (var i = 0; i < PORTS.length; i++) {
      var ip = ips[idx % ips.length];
      idx++;
      var num = (i + 1) < 10 ? "0" + (i + 1) : "" + (i + 1);
      lines.push(ip + ":" + PORTS[i] + "#" + label + num);
    }
  }
  return lines.join("\n");
}

function updateEDT2(addTxt) {
  httpPost(EDT2_URL + "/login", {"Content-Type": "application/x-www-form-urlencoded"}, "password=" + EDT2_PASS, function(err) {
    if (err) {
      $notification.post("CF BestIP", "Login Failed", String(err));
      $done();
      return;
    }
    httpPost(EDT2_URL + "/admin/ADD.txt", {"Content-Type": "text/plain;charset=UTF-8"}, addTxt, function(err2, resp2, data2) {
      if (err2) {
        $notification.post("CF BestIP", "Update Failed", String(err2));
      } else {
        $notification.post("CF BestIP", "Updated", addTxt.split("\n").length + " nodes");
      }
      $done();
    });
  });
}

function tryBackup(apiIdx) {
  if (apiIdx >= BACKUP_APIS.length) {
    $notification.post("CF BestIP", "Failed", "All APIs failed");
    $done();
    return;
  }
  httpGet(BACKUP_APIS[apiIdx], function(err, body) {
    if (err || !body) {
      tryBackup(apiIdx + 1);
      return;
    }
    var ips = parseBackup(body);
    if (ips.length < 3) {
      tryBackup(apiIdx + 1);
      return;
    }
    updateEDT2(generateADD(ips));
  });
}

httpGet(V2TOO_URL, function(err, body) {
  if (err || !body) {
    tryBackup(0);
    return;
  }
  var ips = parseIPs(body);
  if (ips.length < 3) {
    tryBackup(0);
    return;
  }
  updateEDT2(generateADD(ips));
});
