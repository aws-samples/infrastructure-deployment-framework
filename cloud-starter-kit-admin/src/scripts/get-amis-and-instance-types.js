/* 
* Get different classes of AMI
*/

window.amis = {};
window.amis['windows'] = [];
window.amis['linux2'] = [];
window.amis['linuxArm'] = [];
window.amis['ubuntu'] = [];
window.amis['ubuntuArm'] = [];
window.amis['linux2023'] = [];
window.amis['linux2023Arm'] = [];

function fetchAmis() {
  let now = Math.round(new Date().getTime() / 1000);
  let lastFetch = Number(getValueInNamespace(region, `amiDataLastFetch`));
  if (lastFetch && (now - lastFetch) > 60 && lastFetch > (now - 86400)) {
    let cachedData = getValueInNamespace(region, `amiData`);
    if (cachedData !== "") {
      window.amis = JSON.parse(cachedData);
      console.log("using cached AMI data")
      dispatchEvent(new Event('UI_DATA_UPDATE'))
      return;
    }
  }
  dispatchEvent(new Event('EXTEND_LOAD_DELAY'))
  setValueInNamespace(region, `amiDataLastFetch`, now)
  window.describeAmis({
    Filters: [{ Name: "owner-alias", Values: ["amazon"] },
    { Name: "name", Values: ["*arm64-server*"] },
    { Name: "description", Values: ["Canonical, Ubuntu*LTS*"] },
    { Name: "architecture", Values: ["arm64"] },
    { Name: "virtualization-type", Values: ["hvm"] },
    { Name: "state", Values: ["available"] },
    { Name: "image-type", Values: ["machine"] },
    { Name: "root-device-type", Values: ["ebs"] },
    { Name: "hypervisor", Values: ["xen", "nitro"] },
    { Name: "owner-id", Values: ["099720109477"] }]
  }, (err, data) => {
    if (err) {
      console.error(err)
    }
    else {
      //console.log(data)
      let sortedAmis = [];
      let keyedAmis = {};
      for (let i = 0; i < data.Images.length; i++) {
        if (!data.Images[i].Name.match("daily") && !data.Images[i].Name.match("eks")) {
          let shortName = data.Images[i].Name.split("/").pop();
          shortName = shortName.split("-").pop() + `-${shortName}`
          sortedAmis.push(shortName);
          keyedAmis[shortName] = data.Images[i];
        }
      }
      sortedAmis.sort().reverse()
      let latestImages = {};
      for (let i = 0; i < sortedAmis.length; i++) {
        let image = keyedAmis[sortedAmis[i]];
        let datelessName = image.Name.replace(/-\d{8}(\.\d)*/, "");
        if (!latestImages.hasOwnProperty(datelessName)) {
          image["ShortName"] = datelessName;
          latestImages[datelessName] = image;
        }
      }
      let sortedAmiObjects = [];
      for (let key in latestImages) {
        sortedAmiObjects.push(latestImages[key])
      }
      window.amis.ubuntuArm = sortedAmiObjects;
      dispatchEvent(new Event('UI_DATA_UPDATE'))
      dispatchEvent(new Event('AMI_DATA_UPDATE'))
    }
  })

  window.describeAmis({
    Filters: [{ Name: "owner-alias", Values: ["amazon"] },
    { Name: "name", Values: ["*server*"] },
    { Name: "description", Values: ["Canonical, Ubuntu*LTS*"] },
    { Name: "architecture", Values: ["x86_64"] },
    { Name: "virtualization-type", Values: ["hvm"] },
    { Name: "state", Values: ["available"] },
    { Name: "image-type", Values: ["machine"] },
    { Name: "root-device-type", Values: ["ebs"] },
    { Name: "hypervisor", Values: ["xen", "nitro"] },
    { Name: "owner-id", Values: ["099720109477"] }]
  }, (err, data) => {
    if (err) {
      console.error(err)
    }
    else {
      //console.log(data)
      let sortedAmis = [];
      let keyedAmis = {};
      for (let i = 0; i < data.Images.length; i++) {
        if (!data.Images[i].Name.match("daily") && !data.Images[i].Name.match("eks")) {
          let shortName = data.Images[i].Name.split("/").pop();
          shortName = shortName.split("-").pop() + `-${shortName}`
          sortedAmis.push(shortName);
          keyedAmis[shortName] = data.Images[i];
        }
      }
      sortedAmis.sort().reverse()
      let latestImages = {};
      for (let i = 0; i < sortedAmis.length; i++) {
        let image = keyedAmis[sortedAmis[i]];
        let datelessName = image.Name.replace(/-\d{8}(\.\d)*/, "");
        if (!latestImages.hasOwnProperty(datelessName)) {
          image["ShortName"] = datelessName;
          latestImages[datelessName] = image;
        }
      }
      let sortedAmiObjects = [];
      for (let key in latestImages) {
        sortedAmiObjects.push(latestImages[key])
      }
      window.amis.ubuntu = sortedAmiObjects;
      dispatchEvent(new Event('UI_DATA_UPDATE'))
      dispatchEvent(new Event('AMI_DATA_UPDATE'))
    }
  })

  window.describeAmis({
    Filters: [{ Name: "owner-alias", Values: ["amazon"] },
    { Name: "platform", Values: ["windows"] },
    { Name: "architecture", Values: ["x86_64"] },
    { Name: "virtualization-type", Values: ["hvm"] },
    { Name: "state", Values: ["available"] },
    // { Name: "owners", Values: ["self", "amazon"] },
    { Name: "image-type", Values: ["machine"] },
    { Name: "root-device-type", Values: ["ebs"] },
    { Name: "hypervisor", Values: ["xen", "nitro"] }]
  }, (err, data) => {
    if (err) {
      console.error(err)
    }
    else {
      //console.log(data)
      let sortedAmis = [];
      let keyedAmis = {};
      for (let i = 0; i < data.Images.length; i++) {
        if (data.Images[i].Name.match("English") && !data.Images[i].Name.match("EKS") && !data.Images[i].Name.match("ECS")) {
          let shortName = data.Images[i].Name.split("/").pop();
          shortName = shortName.split("-").pop() + `-${shortName}`
          sortedAmis.push(shortName);
          keyedAmis[shortName] = data.Images[i];
        }
      }
      sortedAmis.sort().reverse()
      let latestImages = {};
      for (let i = 0; i < sortedAmis.length; i++) {
        let image = keyedAmis[sortedAmis[i]];
        let datelessName = image.Name.replace(/-\d{4}\.\d{2}\.\d{2}/, "");
        if (!latestImages.hasOwnProperty(datelessName)) {
          image["ShortName"] = datelessName;
          latestImages[datelessName] = image;
        }
      }
      let sortedAmiObjects = [];
      for (let key in latestImages) {
        sortedAmiObjects.push(latestImages[key])
      }
      window.amis.windows = sortedAmiObjects;
      dispatchEvent(new Event('UI_DATA_UPDATE'))
      dispatchEvent(new Event('AMI_DATA_UPDATE'))
    }
  })

  window.describeAmis({
    Filters: [{ Name: "owner-alias", Values: ["amazon"] },
    { Name: "name", Values: ["*al2023*"] },
    { Name: "description", Values: ["Amazon Linux*"] },
    { Name: "architecture", Values: ["x86_64"] },
    { Name: "virtualization-type", Values: ["hvm"] },
    { Name: "state", Values: ["available"] },
    { Name: "image-type", Values: ["machine"] },
    { Name: "root-device-type", Values: ["ebs"] },
    { Name: "hypervisor", Values: ["xen", "nitro"] }]
  }, (err, data) => {
    if (err) {
      console.error(err)
    }
    else {
      //console.log(data)
      let sortedAmis = [];
      let keyedAmis = {};
      for (let i = 0; i < data.Images.length; i++) {
        if (!data.Images[i].Name.match("ecs")) {
          let shortName = data.Images[i].Name;
          shortName = data.Images[i].CreationDate + `-${shortName}`
          sortedAmis.push(shortName);
          keyedAmis[shortName] = data.Images[i];
        }
      }
      sortedAmis.sort().reverse()
      let latestImages = {};
      for (let i = 0; i < sortedAmis.length; i++) {
        let image = keyedAmis[sortedAmis[i]];
        let datelessName = image.Name.replace(/-\d{4}\.\d\.\d{8}(\.\d)*/, "");
        if (!latestImages.hasOwnProperty(datelessName)) {
          image["ShortName"] = datelessName;
          latestImages[datelessName] = image;
        }
      }
      let sortedAmiObjects = [];
      for (let key in latestImages) {
        sortedAmiObjects.push(latestImages[key])
      }
      window.amis.linux2023 = sortedAmiObjects;
      dispatchEvent(new Event('UI_DATA_UPDATE'))
      dispatchEvent(new Event('AMI_DATA_UPDATE'))
    }
  })

  window.describeAmis({
    Filters: [{ Name: "owner-alias", Values: ["amazon"] },
    { Name: "name", Values: ["*al2023*"] },
    { Name: "description", Values: ["Amazon Linux*"] },
    { Name: "architecture", Values: ["arm64"] },
    { Name: "virtualization-type", Values: ["hvm"] },
    { Name: "state", Values: ["available"] },
    { Name: "image-type", Values: ["machine"] },
    { Name: "root-device-type", Values: ["ebs"] },
    { Name: "hypervisor", Values: ["xen", "nitro"] }]
  }, (err, data) => {
    if (err) {
      console.error(err)
    }
    else {
      //console.log(data)
      let sortedAmis = [];
      let keyedAmis = {};
      for (let i = 0; i < data.Images.length; i++) {
        if (!data.Images[i].Name.match("ecs")) {
          let shortName = data.Images[i].Name;
          shortName = data.Images[i].CreationDate + `-${shortName}`
          sortedAmis.push(shortName);
          keyedAmis[shortName] = data.Images[i];
        }
      }
      sortedAmis.sort().reverse()
      let latestImages = {};
      for (let i = 0; i < sortedAmis.length; i++) {
        let image = keyedAmis[sortedAmis[i]];
        let datelessName = image.Name.replace(/-\d{4}\.\d\.\d{8}(\.\d)*/, "");
        if (!latestImages.hasOwnProperty(datelessName)) {
          image["ShortName"] = datelessName;
          latestImages[datelessName] = image;
        }
      }
      let sortedAmiObjects = [];
      for (let key in latestImages) {
        sortedAmiObjects.push(latestImages[key])
      }
      window.amis.linux2023Arm = sortedAmiObjects;
      dispatchEvent(new Event('UI_DATA_UPDATE'))
      dispatchEvent(new Event('AMI_DATA_UPDATE'))
    }
  })

  window.describeAmis({
    Filters: [{ Name: "owner-alias", Values: ["amazon"] },
    { Name: "name", Values: ["*amzn2*"] },
    { Name: "description", Values: ["Amazon Linux 2*"] },
    { Name: "architecture", Values: ["x86_64"] },
    { Name: "virtualization-type", Values: ["hvm"] },
    { Name: "state", Values: ["available"] },
    { Name: "image-type", Values: ["machine"] },
    { Name: "root-device-type", Values: ["ebs"] },
    { Name: "hypervisor", Values: ["xen", "nitro"] }]
  }, (err, data) => {
    if (err) {
      console.error(err)
    }
    else {
      //console.log(data)
      let sortedAmis = [];
      let keyedAmis = {};
      for (let i = 0; i < data.Images.length; i++) {
        if (!data.Images[i].Name.match("ecs")) {
          let shortName = data.Images[i].Name;
          shortName = data.Images[i].CreationDate + `-${shortName}`
          sortedAmis.push(shortName);
          keyedAmis[shortName] = data.Images[i];
        }
      }
      sortedAmis.sort().reverse()
      let latestImages = {};
      for (let i = 0; i < sortedAmis.length; i++) {
        let image = keyedAmis[sortedAmis[i]];
        let datelessName = image.Name.replace(/-\d\.\d\.\d{8}(\.\d)*/, "");
        if (!latestImages.hasOwnProperty(datelessName)) {
          image["ShortName"] = datelessName;
          latestImages[datelessName] = image;
        }
      }
      let sortedAmiObjects = [];
      for (let key in latestImages) {
        sortedAmiObjects.push(latestImages[key])
      }
      window.amis.linux2 = sortedAmiObjects;
      dispatchEvent(new Event('UI_DATA_UPDATE'))
      dispatchEvent(new Event('AMI_DATA_UPDATE'))
    }
  })


  window.describeAmis({
    Filters: [{ Name: "owner-alias", Values: ["amazon"] },
    { Name: "name", Values: ["*amzn2*"] },
    { Name: "description", Values: ["Amazon Linux 2*"] },
    { Name: "architecture", Values: ["arm64"] },
    { Name: "virtualization-type", Values: ["hvm"] },
    { Name: "state", Values: ["available"] },
    { Name: "image-type", Values: ["machine"] },
    { Name: "root-device-type", Values: ["ebs"] },
    { Name: "hypervisor", Values: ["xen", "nitro"] }]
  }, (err, data) => {
    if (err) {
      console.error(err)
    }
    else {
      //console.log(data)
      let sortedAmis = [];
      let keyedAmis = {};
      for (let i = 0; i < data.Images.length; i++) {
        if (!data.Images[i].Name.match("ecs")) {
          let shortName = data.Images[i].Name;
          shortName = data.Images[i].CreationDate + `-${shortName}`
          sortedAmis.push(shortName);
          keyedAmis[shortName] = data.Images[i];
        }
      }
      sortedAmis.sort().reverse()
      let latestImages = {};
      for (let i = 0; i < sortedAmis.length; i++) {
        let image = keyedAmis[sortedAmis[i]];
        let datelessName = image.Name.replace(/-\d\.\d\.\d{8}(\.\d)*/, "");
        if (!latestImages.hasOwnProperty(datelessName)) {
          image["ShortName"] = datelessName;
          latestImages[datelessName] = image;
        }
      }
      let sortedAmiObjects = [];
      for (let key in latestImages) {
        sortedAmiObjects.push(latestImages[key])
      }
      window.amis.linuxArm = sortedAmiObjects;
      dispatchEvent(new Event('UI_DATA_UPDATE'))
      dispatchEvent(new Event('AMI_DATA_UPDATE'))
    }
  })
}

function cacheAmiData() {
  setValueInNamespace(region, `amiData`, JSON.stringify(window.amis))
}

addEventListener("AMI_DATA_UPDATE", cacheAmiData);

/* 
* Get instance types for the region
*/

window.instanceTypes = {};

let instanceTypeNames = [];
function resetAmiInstanceTypeLists() {
  instanceTypeNames = [];
  window.instanceTypes = {};
  window.amis = {};
  window.amis['windows'] = [];
  window.amis['linux2'] = [];
  window.amis['linuxArm'] = [];
  window.amis['ubuntu'] = [];
  window.amis['ubuntuArm'] = [];
  window.amis['linux2023'] = [];
  window.amis['linux2023Arm'] = [];
}

function getInstanceTypes(nextToken) {
  let now = Math.round(new Date().getTime() / 1000);
  let lastFetch = Number(getValueInNamespace(region, `instanceDataLastFetch`));
  if (!nextToken && lastFetch && (now - lastFetch) > 60 && lastFetch > (now - 86400)) {
    let cachedData = getValueInNamespace(region, `instanceData`);
    if (cachedData !== "") {
      window.instanceTypes = JSON.parse(cachedData);
      console.log("using cached instance data")
      dispatchEvent(new Event('UI_DATA_UPDATE'))
      return;
    }
  }
  dispatchEvent(new Event('EXTEND_LOAD_DELAY'))
  setValueInNamespace(region, `instanceDataLastFetch`, now);
  let params = {
    Filters: [
      { Name: "instance-type", Values: ["*"] },
      { Name: "bare-metal", Values: ["false"] },
      { Name: "current-generation", Values: ["true"] },
      { Name: "supported-virtualization-type", Values: ["hvm"] }
    ]
  };
  if (nextToken) {
    params.NextToken = nextToken;
  }

  window.describeInstanceTypes(params, (err, data) => {
    if (err) {
      console.error(err)
    }
    else {
      //console.log(data)
      for (let i = 0; i < data.InstanceTypes.length; i++) {
        if (data.InstanceTypes[i].InstanceType.match(/(flex|u-|hpc)/) || !data.InstanceTypes[i].InstanceType.match(/^[a-z][\d\w]{1,5}\./)) {
          continue;
        }
        let instanceLabel = data.InstanceTypes[i].InstanceType.split(".")[0];
        instanceLabel += String(data.InstanceTypes[i].VCpuInfo.DefaultVCpus).padStart(3, "0");
        instanceLabel += String(data.InstanceTypes[i].MemoryInfo.SizeInMiB).padStart(4, "0");
        instanceTypeNames.push(instanceLabel + "-" + data.InstanceTypes[i].InstanceType)
        window.instanceTypes[data.InstanceTypes[i].InstanceType] = data.InstanceTypes[i]
      }
      instanceTypeNames.sort();
      // console.log(instanceTypeNames)
      let sortedInstanceTypes = {};
      for (let i = 0; i < instanceTypeNames.length; i++) {
        let instanceName = instanceTypeNames[i].split("-")[1]
        sortedInstanceTypes[instanceName] = window.instanceTypes[instanceName]
      }
      // console.log(sortedInstanceTypes)
      if (data.NextToken) {
        dispatchEvent(new Event('EXTEND_LOAD_DELAY'))
        getInstanceTypes(data.NextToken)
      }
      else {
        window.instanceTypes = sortedInstanceTypes;
        dispatchEvent(new Event('UI_DATA_UPDATE'))
        dispatchEvent(new Event('INSTANCE_DATA_UPDATE'))
      }

    }
  })
}

// function instanceSort(instanceTypes) {
//   return instanceTypes
// }


function cacheInstanceData() {
  setValueInNamespace(region, `instanceData`, JSON.stringify(window.instanceTypes))
}

addEventListener("INSTANCE_DATA_UPDATE", cacheInstanceData);
