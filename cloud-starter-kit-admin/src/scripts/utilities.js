/*
* Utility methods
*/

const parser = new DOMParser();

function appendHtmlToNode(node, html, replace = true) {
  const doc = parser.parseFromString(html, "text/html");
  if (replace) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }
  node.appendChild(doc.documentElement);
}

function bytesToBase64(bytes) {
  const binString = Array.from(bytes, (byte) =>
    String.fromCodePoint(byte),
  ).join("");
  return btoa(binString);
}

function findNameFromTags(tags) {
  for (let i = 0; i < tags.length; i++) {
    if (tags[i]["Key"] === "Name") {
      return tags[i]["Value"]
    }
  }
  return ""
}

function findSubnetTypeFromTags(tags) {
  for (let i = 0; i < tags.length; i++) {
    if (tags[i]["Key"] === "aws-cdk:subnet-type") {
      return tags[i]["Value"].toLowerCase()
    }
  }
  return ""
}

function guessSubnetType(name) {
  if (name.toLowerCase().includes("isolated")) {
    return "isolated"
  }
  else if (name.toLowerCase().includes("private")) {
    return "private"
  }
  else if (name.toLowerCase().includes("public")) {
    return "public"
  }
  return ""
}

const getMyIp = async () => {
  const response = await fetch('https://api.ipify.org/?format=json');
  const json = await response.json();
  console.log(json);
  if (json.hasOwnProperty("ip") && json.ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
    return json.ip;
  }
  else {
    return "";
  }
}

function openConsole(url) {
  window.openInBrowser(url);
}

function setValueInNamespace(namespace, key, value) {
  localStorage.setItem(namespace + "-" + key, value);
}

function getValueInNamespace(namespace, key) {
  return localStorage.getItem(namespace + "-" + key) || "";
}

function convertRegionCodeToName(code) {
  let codes = {
    "us-east-1": "US: N. Virginia",
    "us-east-2": "US: Ohio",
    "us-west-1": "US: N. California",
    "us-west-2": "US: Oregon",
    "ap-southeast-4": "AU: Melbourne",
    "ap-south-1": "IN: Mumbai",
    "ap-northeast-3": "JP: Osaka",
    "ap-northeast-2": "KR: Seoul",
    "ap-southeast-1": "SG: Singapore",
    "ap-southeast-2": "AU: Sydney",
    "ap-northeast-1": "JP: Tokyo",
    "ca-central-1": "CA: Central Canada",
    "eu-central-1": "DE: Frankfurt",
    "eu-west-1": "IE: Ireland",
    "eu-west-2": "GB: London",
    "eu-west-3": "FR: Paris",
    "eu-north-1": "SE: Stockholm",
    "sa-east-1": "BR: São Paulo",
    "af-south-1": "SA: Cape Town",
    "ap-east-1": "CN: Hong Kong",
    "ap-south-2": "IN: Hyderabad",
    "ap-southeast-3": "ID: Jakarta",
    "ca-west-1": "CA: Calgary",
    "eu-central-2": "CH: Zurich",
    "eu-south-1": "IT: Milan",
    "eu-south-2": "ES: Spain",
    "il-central-1": "IL: Tel Aviv",
    "me-central-1": "AE: UAE",
    "me-south-1": "BH: Bahrain"
  }
  return codes.hasOwnProperty(code) ? codes[code] : code;
}
