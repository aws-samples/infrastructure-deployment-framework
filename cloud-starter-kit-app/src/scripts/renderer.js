// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

let region = null;
let account = null;
let progressBars = {};
let templateParameters = {};
let loadBlockTimeout = null;
let regionSelected = false;
let kitMetadata = {};
let defaultCategory = null;

document.documentElement.setAttribute("data-theme", "light");
const decoder = new TextDecoder();

async function checkForKey() {
  let existingConfig = localStorage.getItem("kitConfig");
  if (existingConfig) {
    window.resellerConfig = JSON.parse(existingConfig);
    await fetchConfigForKey();
  } else {
    hideLoadingBlock();
  }
}

function keyFound() {
  applyBranding();
  document.getElementById("lock-block").hidden = true;
  addEventListener("TEXT_LOADED", () => {
    resetUi();
    tryLogin();
    toggleCredentialTypes();
    hideLoadingBlock();
  });
  setLanguage();
}
addEventListener("KEY_FOUND", keyFound);

function reloadConfig() {
  let existingConfig = localStorage.getItem("kitConfig");
  if (existingConfig) {
    window.resellerConfig = JSON.parse(existingConfig);
    fetchConfigForKey();
  }
}

function purgeConfig() {
  localStorage.removeItem("kitConfig");
  localStorage.removeItem("hosts");
  window.api.restartApp();
}

async function fetchConfigForKey() {
  let key_id = document.getElementById("key").value || window.resellerConfig.csk_id;
  if (!window.hasOwnProperty("hosts")) {
    window.hosts = JSON.parse(window.localStorage.getItem("hosts"));
  }
  if (key_id.match(/[a-zA-Z0-9]{22}/)) {
    console.log(`fetching config for ${key_id}`);
    const body = JSON.stringify({ csk_id: key_id });
    const response = await fetch(`https://${window.hosts.CONFIG_HOST}/app/config/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csk": key_id,
      },
      body: body,
    });
    const result = await response.arrayBuffer();
    const data = JSON.parse(decoder.decode(result));
    console.log("Success:", data);
    if (data.hasOwnProperty("csk_id") && data.csk_id === key_id) {
      window.resellerConfig = data;
      window.resellerConfig["AWSDistributorName"] = data.BusinessName;
      window.resellerConfig["KitHubCode"] = data.KitHubCode === "" ? "none" : data.KitHubCode;
      localStorage.setItem("kitConfig", JSON.stringify(window.resellerConfig));
      dispatchEvent(new Event("KEY_FOUND"));
      phoneHome({
        action: `loaded config from key starting with ${key_id.substring(0, 10)}...`,
      });
    } else {
      document.getElementById("key-error").hidden = false;
    }
  } else {
    console.log("no or invalid key");
    document.getElementById("key-error").hidden = false;
  }
}

function applyBranding() {
  window.hosts = JSON.parse(window.localStorage.getItem("hosts"));
  // here need to get the disti file host, then the csk file host and override the default location
  // window.api.getHosts((hosts) => {
  //   alert(hosts);
  //   window.hosts = hosts;
  if (window.resellerConfig.distributor.hasOwnProperty("FileHost") && window.resellerConfig.distributor.FileHost.match(/\w+\.\w+/)) {
    window.hosts.FILE_HOST = window.resellerConfig.distributor.FileHost;
    window.setFileHost(window.hosts.FILE_HOST);
  }
  if (window.resellerConfig.hasOwnProperty("FileHost") && window.resellerConfig.FileHost.match(/\w+\.\w+/)) {
    window.hosts.FILE_HOST = window.resellerConfig.FileHost;
    window.setFileHost(window.hosts.FILE_HOST);
  }
  window.localStorage.setItem("hosts", JSON.stringify(window.hosts));
  setTimeout(getAllKitsMetadata, 1000);
  // });
  document.getElementById("companyName").innerText = window.resellerConfig.BusinessName;
  document.title = `${window.resellerConfig.BusinessName} | Cloud Starter Kit`;
  document.getElementById("countryCode").innerText = window.resellerConfig.CountryCode;
  if (window.resellerConfig.hasOwnProperty("distributor") && window.resellerConfig.distributor.hasOwnProperty("LogoUrl")) {
    document.getElementById("menu-distie-logo").setAttribute("src", window.resellerConfig.distributor.LogoUrl);
    document.getElementById("menu-distie-logo").style = window.resellerConfig.distributor.LogoCss;
    document.title = `${window.resellerConfig.distributor.BusinessName} | ${window.resellerConfig.BusinessName} | Cloud Starter Kit`;
    document.getElementById("company-logo-creds").style = window.resellerConfig.distributor.LogoCss;
    document.getElementById("company-logo-creds").setAttribute("src", window.resellerConfig.distributor.LogoUrl);
  }
  if (window.resellerConfig.hasOwnProperty("LogoUrl")) {
    document.getElementById("company-logo-left-menu").setAttribute("src", window.resellerConfig.LogoUrl);
    if (!window.resellerConfig.LogoUrl.match(/no-csk-logo.png$/)) {
      document.getElementById("company-logo-creds").setAttribute("src", window.resellerConfig.LogoUrl);
    }
  }
  if (window.resellerConfig.hasOwnProperty("LogoCss")) {
    document.getElementById("company-logo-left-menu").style = window.resellerConfig.LogoCss;
    if (!window.resellerConfig.LogoUrl.match(/no-csk-logo.png$/)) {
      document.getElementById("company-logo-creds").style = window.resellerConfig.LogoCss;
    }
  } else {
    if (window.resellerConfig.hasOwnProperty("LogoCssLeft")) {
      document.getElementById("company-logo-left-menu").style = window.resellerConfig.LogoCssLeft;
    }
    if (window.resellerConfig.hasOwnProperty("LogoCssRight")) {
      document.getElementById("company-logo-creds").style = window.resellerConfig.LogoCssRight;
    }
  }
}

let lastData = null;
async function phoneHome(data) {
  if (!window.hosts) {
    console.log("not ready to phoneHome yet", data);
    return;
  }
  data["csk_id"] = window.resellerConfig.csk_id;
  data["partner_name"] = window.resellerConfig.AWSDistributorName;
  data["country_code"] = window.resellerConfig.CountryCode;
  let thisData = JSON.stringify(data);
  if (lastData === thisData) {
    // don't repeat yourself
    return;
  }
  lastData = thisData;
  try {
    const body = lastData;
    const response = await fetch(`https://${window.hosts.ADMIN_HOST}/app/reporting/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csk": window.resellerConfig.csk_id,
      },
      body: body,
    });
    console.log(body, response);
    const result = await response.arrayBuffer();
    console.log("Success:", decoder.decode(result));
  } catch (error) {
    console.error("Error:", error);
  }
}

function tryLogin() {
  window.checkIfCredsAvailable(credentialsCallback);
}

function addCredentials() {
  let credentials = document.getElementById("pasted-credentials").value;
  if (document.getElementById("access-key-id").value && document.getElementById("secret-access-key").value) {
    credentials =
      "AWS_ACCESS_KEY_ID=" +
      document.getElementById("access-key-id").value +
      "\nAWS_SECRET_ACCESS_KEY=" +
      document.getElementById("secret-access-key").value +
      "\n";
  }
  // console.log(credentials);
  window.setCredentials(credentials, credentialsCallback);
}

function credentialsCallback(err, data) {
  if (err) {
    displayCredentialErrors(true, err);
    document.getElementById("pasted-credentials").value = "";
  } else if (data) {
    window.loggedIn = true;
    phoneHome({ action: `logged in` });
    displayCredentialErrors(false);
    displaySessionErrors(null, data);
    if (account !== data.AWS_ACCOUNT_ID) {
      // cleanup stuff from last account being operated on
      phoneHome({ action: `switched account` });
      resetAllKitMonitors();
      resetStackMonitoring();
    }
    account = data.AWS_ACCOUNT_ID;
    let credDisplay = "";
    for (let key in data) {
      credDisplay += "<b>" + key + "</b>: " + data[key] + "<br/>\n";
    }
    // document.getElementById('session-error-block').style.display = "none";
    document.getElementById("credentials-block").hidden = true;
    document.getElementById("account-display").innerText = account;
    lockRegionControls(true);
    showPrepareRegionModal(true);
    showAliasForAccount(account);
    populateRegionsSelect();
    extendLoadDelay();
    try {
      resetAllKitMonitors();
      switchLeftMenuItem({
        target: { id: "install-a-kit-button", content: "starter-kits" },
      });
      // showCategory(defaultCategory);
    } catch (e) {
      // console.log(e);
    }
  }
}

function showAliasForAccount(account) {
  let accountAlias = getValueInNamespace(account, "alias");
  if (accountAlias) {
    document.getElementById("account-alias").innerText = accountAlias;
  } else {
    writeInputForAlias(account);
  }
}

function resetAlias() {
  writeInputForAlias(account);
}

function writeInputForAlias(account) {
  setValueInNamespace(account, "alias", "");
  document.getElementById("account-alias").innerText = "";
  let aliasInput = document.createElement("input");
  aliasInput.type = "text";
  aliasInput.id = "account-alias-input";
  aliasInput.placeholder = "Account owner...";
  aliasInput.onkeyup = (e) => {
    if (e.key === "Enter" || e.keyCode === 13) {
      setValueInNamespace(account, "alias", aliasInput.value);
      document.getElementById("account-alias").innerText = aliasInput.value;
    }
  };
  document.getElementById("account-alias").appendChild(aliasInput);
}

let kitConfigsShowing = {};
function configureKit(kitId) {
  let kit = kitMetadata[kitId];
  kitConfigsShowing[kitId] = true;
  console.log(`configuring ${kit}`);
  if (kit.hasOwnProperty("Templates")) {
    //cfn kit
    displayTemplateConfig(kitId);
  } else {
    //cdk kit
    displayCdkAppConfig(kitId);
  }
  let configDiv = document.getElementById(`${kitId}-config-pane`);
  let configButton = document.getElementById(`${kitId}-config-button`);
  let installButton = document.getElementById(`${kitId}-install-button`);
  let cancelButton = document.getElementById(`${kitId}-cancel-button`);
  if (configDiv) {
    configDiv.style.display = "block";
    configButton.style.display = "none";
    installButton.style.display = "block";
    cancelButton.style.display = "block";
  }
}

function hideConfigForKit(kitId) {
  let configDiv = document.getElementById(`${kitId}-config-pane`);
  let configButton = document.getElementById(`${kitId}-config-button`);
  let installButton = document.getElementById(`${kitId}-install-button`);
  let cancelButton = document.getElementById(`${kitId}-cancel-button`);
  if (configDiv) {
    configDiv.style.display = "none";
    configButton.style.display = "block";
    installButton.style.display = "none";
    cancelButton.style.display = "none";
    delete kitConfigsShowing[kitId];
  }
}

function installKit(kitId) {
  let kit = kitMetadata[kitId];
  console.log(`installing ${kitId}`);
  if (document.getElementById(`${kitId}-install-button`)) {
    document.getElementById(`${kitId}-install-button`).disabled = true;
  }
  document.getElementById(`${kitId}-deployment-progress`).style.display = "block";
  //open by default
  toggleDeploymentDetails(kitId, true);
  if (kit.hasOwnProperty("Templates")) {
    //cfn kit
    deployCfnTemplate(kitId);
  } else {
    //cdk kit
    deployCdkApp(kitId);
  }
}

function reenableKitButton(kitId) {
  console.log(`reenabling ${kitId}`);
  if (document.getElementById(`${kitId}-install-button`)) {
    document.getElementById(`${kitId}-install-button`).disabled = false;
  }
}

function showDeleteKitButton(kitId) {
  if (document.getElementById(`${kitId}-delete-button`)) {
    document.getElementById(`${kitId}-delete-button`).style.display = "inline";
  }
}

function deleteKit(kitId) {
  let kit = kitMetadata[kitId];
  console.log(`deleting ${kitId}`);
  document.getElementById(`${kitId}-delete-button`).disabled = true;
  if (kit.hasOwnProperty("Templates")) {
    //cfn kit
    deleteCfnStack(kitId);
  } else {
    //cdk kit
    destroyCdkApp(kitId);
  }
}

function deleteCfnStack(kitId) {
  console.log("deleteCfnStack", kitId);
}

function destroyCdkApp(kitId) {
  console.log("destroyCdkApp", kitId);
}

function showCategory(catId) {
  let cat = document.getElementById(catId);
  cat.style.display = "block";
  for (let sibling of cat.parentNode.children) {
    if (sibling !== cat) {
      sibling.style.display = "none";
    }
  }
  let catMenuItem = document.getElementById(`${catId}-selector`);
  catMenuItem.classList.add("category-selector-selected");
  let catMenuBar = document.getElementById("kit-category-selector");
  for (let sibling of catMenuBar.children) {
    if (sibling !== catMenuItem) {
      sibling.classList.remove("category-selector-selected");
    }
  }
}

function toggleDeploymentDetails(kitId, alwaysOpen = false) {
  let detailsDiv = document.getElementById(`${kitId}-deployment-details`);
  if (alwaysOpen || detailsDiv.style.display === "none") {
    detailsDiv.style.display = "block";
  } else {
    detailsDiv.style.display = "none";
  }
}

function getAllKitsMetadata() {
  window.getFullCatalogue((data) => {
    console.log(data);
    // fullCatalogue = data;
    // let sortedTemplates = data.sort();
    let parentNode = document.getElementById("starter-kits");
    let categorySelector = document.createElement("div");
    categorySelector.classList.add("category-container");
    parentNode.appendChild(categorySelector);
    let categoryDisplay = document.createElement("div");
    categoryDisplay.classList.add("scrollable");
    parentNode.appendChild(categoryDisplay);
    let catSpans = [];
    for (const tlc in data) {
      let categoryId = tlc.toLowerCase().replaceAll(/\s/g, "-");
      if (!defaultCategory) {
        defaultCategory = categoryId;
      }
      let thisCatSpan = document.createElement("div");
      thisCatSpan.classList.add("category-selector");
      thisCatSpan.id = `${categoryId}-selector`;
      let thisCatLink = document.createElement("a");
      thisCatLink.innerText = tlc;
      thisCatSpan.appendChild(thisCatLink);
      thisCatSpan.setAttribute("onclick", `showCategory('${categoryId}')`);
      catSpans.push(thisCatSpan);

      let tlcDiv = document.createElement("div");
      tlcDiv.className = "top-level-category";
      tlcDiv.id = categoryId;
      tlcDiv.style.display = "none";
      let tlcHeading = document.createElement("h2");
      tlcHeading.classList.add("heading");
      tlcHeading.innerText = tlc;
      let tlcDesc = document.createElement("p");
      // tlcDesc.innerHTML = data[tlc]["Description"];
      appendHtmlToNode(tlcDesc, data[tlc]["Description"]);
      // append to the parentNode
      tlcDiv.appendChild(tlcHeading);
      tlcDiv.appendChild(tlcDesc);
      for (let category in data[tlc]["Categories"]) {
        let categoryHeading = document.createElement("h3");
        categoryHeading.classList.add("sub-heading");
        categoryHeading.innerText = category;
        let categoryDesc = document.createElement("p");
        categoryDesc.classList.add("category-description");
        // categoryDesc.innerHTML = data[tlc]["Categories"][category]["Description"];
        appendHtmlToNode(categoryDesc, data[tlc]["Categories"][category]["Description"]);
        tlcDiv.appendChild(categoryHeading);
        tlcDiv.appendChild(categoryDesc);
        for (let i = 0; i < data[tlc]["Categories"][category]["Kits"].length; i++) {
          let kit = data[tlc]["Categories"][category]["Kits"][i];
          let kitTech = "cfn";
          if (kit.hasOwnProperty("Manifest")) {
            kitTech = "cdk";
          }
          let kitId = `${kitTech}-${kit["Name"]
            .toLowerCase()
            .replace(/\s/g, "-")
            .replace(/[^a-zA-Z0-9\-]/g, "")}`;
          let kitDiv = document.createElement("div");
          kitDiv.className = "kit";
          kitDiv.id = kitId;
          let kitHeading = document.createElement("h4");
          kitHeading.classList.add("sub-sub-heading");
          let kitLabel = kit["Name"];
          kitMetadata[kitId] = kit;

          if (kit.hasOwnProperty("UploadRequired")) {
            kitLabel += ` 🪣`;
          }
          if (kit.hasOwnProperty("AllowUpdates") && kit.AllowUpdates) {
            kitLabel += ` 🔁`;
          }
          if (kit.hasOwnProperty("VpcRequired") && kit.VpcRequired) {
            kitLabel += ` ☁️`;
          }
          kitHeading.innerText = kitLabel;
          let kitDesc = document.createElement("p");
          appendHtmlToNode(kitDesc, kit["Description"].replaceAll("<br>", "</p><p>"));
          // calculator link
          let kitCalcP = null;
          if (kit.hasOwnProperty("CostCalculator") && kit.CostCalculator) {
            kitCalcP = document.createElement("p");
            kitCalcP.classList.add("cost-calculator");
            let kitCalc = document.createElement("a");
            kitCalc.setAttribute("href", kit["CostCalculator"]);
            kitCalc.setAttribute("target", "_blank");
            kitCalc.innerText = "Cost Calculator";
            kitCalcP.appendChild(kitCalc);
          }
          // Copyright message if it exists
          let kitCopyright = null;
          if (kit.hasOwnProperty("Copyright") && kit.Copyright) {
            kitCopyright = document.createElement("p");
            kitCopyright.classList.add("copyright");
            kitCopyright.innerText = kit.Copyright;
          }
          // more info link
          let kitMoreInfo = null;
          if (kit.hasOwnProperty("MoreInfo") && kit.MoreInfo) {
            kitMoreInfo = document.createElement("div");
            kitMoreInfo.classList.add("kit-more-info");
            appendHtmlToNode(kitMoreInfo, kit.MoreInfo);
          }
          // kitDesc.setAttribute('onclick', `configureKit('${kitId}')`);
          let kitConfig = document.createElement("button");
          kitConfig.id = `${kitId}-config-button`;
          kitConfig.innerText = `Configure ${kit["Name"]}`;
          kitConfig.setAttribute("onclick", `configureKit('${kitId}')`);
          //install button
          let kitInstall = document.createElement("button");
          kitInstall.id = `${kitId}-install-button`;
          kitInstall.innerText = `Install ${kit["Name"]}`;
          kitInstall.setAttribute("onclick", `installKit('${kitId}')`);
          kitInstall.style.display = "none";
          //update button
          let kitUpdate = document.createElement("button");
          kitUpdate.id = `${kitId}-update-button`;
          kitUpdate.innerText = `Update ${kit["Name"]}`;
          kitUpdate.setAttribute("onclick", `installKit('${kitId}')`);
          kitUpdate.style.display = "none";
          //delete button
          let kitDelete = document.createElement("button");
          kitDelete.id = `${kitId}-delete-button`;
          kitDelete.innerText = `Delete`;
          kitDelete.setAttribute("onclick", `deleteKit('${kitId}')`);
          kitDelete.style.display = "none";
          //cancel button
          let kitCancel = document.createElement("button");
          kitCancel.id = `${kitId}-cancel-button`;
          kitCancel.innerText = `Cancel`;
          kitCancel.setAttribute("onclick", `hideConfigForKit('${kitId}')`);
          kitCancel.style.display = "none";
          kitCancel.style.float = "right";

          let kitConfigDiv = document.createElement("div");
          kitConfigDiv.id = `${kitId}-config-pane`;
          let loadingMessage = document.createElement("p");
          loadingMessage.innerText = "Loading configuration options for this kit - please wait.";
          kitConfigDiv.appendChild(loadingMessage);
          kitConfigDiv.style.display = "none";

          let kitLogDiv = document.createElement("div");
          kitLogDiv.classList.add("logs");
          kitLogDiv.id = `${kitId}-deployment-progress`;

          let kitLogProgBar = document.createElement("div");
          kitLogProgBar.classList.add("progress-bar-striped");
          kitLogProgBar.setAttribute("onclick", `toggleDeploymentDetails('${kitId}')`);
          kitLogProgBar.id = `${kitId}-deployment-progress-bar`;
          let kitLogProg = document.createElement("div");
          kitLogProg.style.width = "100%";
          let b = document.createElement("b");
          let p = document.createElement("p");
          b.appendChild(p);
          kitLogProg.appendChild(b);
          kitLogProgBar.appendChild(kitLogProg);

          let progMessage = document.createElement("p");
          progMessage.classList.add("progress-bar-message");
          kitLogDiv.appendChild(kitLogProgBar);
          kitLogDiv.appendChild(progMessage);
          progressBars[kitId] = [p, kitLogProg, progMessage];

          let progressDetailsDiv = document.createElement("div");
          progressDetailsDiv.id = `${kitId}-deployment-details`;

          let kitLogHeading = document.createElement("h5");
          kitLogHeading.innerText = `Deployment Request Response`;
          progressDetailsDiv.appendChild(kitLogHeading);

          let kitLog = document.createElement("div");
          kitLog.id = `${kitId}-deploystack-output`;
          kitLog.classList.add("output", "pre");
          progressDetailsDiv.appendChild(kitLog);

          let kitStackStatesHeading = document.createElement("h5");
          kitStackStatesHeading.innerText = `CloudFormation Events`;
          progressDetailsDiv.appendChild(kitStackStatesHeading);
          let kitStackStates = document.createElement("div");
          kitStackStates.id = `${kitId}-cf-stack-states`;
          kitStackStates.classList.add("output");
          progressDetailsDiv.appendChild(kitStackStates);

          let kitStackOutputsHeading = document.createElement("h5");
          kitStackOutputsHeading.innerText = `Stack Outputs`;
          progressDetailsDiv.appendChild(kitStackOutputsHeading);
          let kitStackOutputs = document.createElement("div");
          kitStackOutputs.id = `${kitId}-cf-stack-outputs`;
          kitStackOutputs.classList.add("output");
          progressDetailsDiv.appendChild(kitStackOutputs);
          progressDetailsDiv.style.display = "none";

          kitLogDiv.appendChild(progressDetailsDiv);
          kitLogDiv.style.display = "none";

          kitDiv.appendChild(kitHeading);
          kitDescColumns = document.createElement("div");
          kitDescColumns.classList.add("kit-desc-columns");
          kitDescColumns.appendChild(kitDesc);
          if (kitCopyright) {
            kitDesc.appendChild(kitCopyright);
          }
          if (kitCalcP) {
            kitDesc.appendChild(kitCalcP);
          }
          if (kitMoreInfo) {
            kitDescColumns.appendChild(kitMoreInfo);
          }
          kitDiv.appendChild(kitDescColumns);
          kitDiv.appendChild(kitConfig);
          kitDiv.appendChild(kitConfigDiv);
          kitDiv.appendChild(kitCancel);
          kitDiv.appendChild(kitInstall);
          kitDiv.appendChild(kitDelete);
          kitDiv.appendChild(kitLogDiv);
          tlcDiv.appendChild(kitDiv);
        }
      }
      categoryDisplay.appendChild(tlcDiv);
    }
    categorySelector.style.columns = catSpans.length;
    categorySelector.id = "kit-category-selector";
    for (let i = 0; i < catSpans.length; i++) {
      categorySelector.appendChild(catSpans[i]);
    }
    showCategory(defaultCategory);
  });
}

/*
 * Fetch Region info from the account - shows opt-in and default Regions
 */
function populateRegionsSelect() {
  window.getRegions((err, data) => {
    if (err) {
      console.error(err);
    } else {
      // console.log(data.Regions)
      let defaultRegion = getValueInNamespace(account, "SelectedRegion") || window.resellerConfig.DefaultRegion;
      let regionSelect = document.getElementById("region-select");
      while (regionSelect.firstChild) {
        regionSelect.removeChild(regionSelect.firstChild);
      }
      let regionIsAvailable = false;
      let sortedRegions = [];
      let nameRegionMap = {};
      for (let i = 0; i < data.Regions.length; i++) {
        let regionLabel = convertRegionCodeToName(data.Regions[i].RegionName);
        sortedRegions.push(regionLabel);
        nameRegionMap[regionLabel] = data.Regions[i].RegionName;
      }
      sortedRegions.sort();
      for (let i = 0; i < sortedRegions.length; i++) {
        if (nameRegionMap[sortedRegions[i]] === defaultRegion) {
          regionIsAvailable = true;
        }
        let option = document.createElement("option");
        option.text = sortedRegions[i];
        option.value = nameRegionMap[sortedRegions[i]];
        regionSelect.add(option);
      }
      if (regionIsAvailable) {
        regionSelect.value = defaultRegion;
      } else {
        regionSelect.value = "ap-southeast-2";
        displayErrors(
          `Region ${defaultRegion} is not available, probably because it is an opt-in Region. Click the link to open the AWS console and resolve this.`,
          "https://us-east-1.console.aws.amazon.com/billing/home?region=us-east-1#/account"
        );
      }
      updateRegion();
    }
  });
}

function afterRegionOptIn(err, data) {
  // console.log(err)
  console.log(data);
}

// function enableDefaultRegion() {
//   window.optIntoRegion(window.resellerConfig.DefaultRegion, account, afterRegionOptIn)
// }

function hideLoadingBlock() {
  document.getElementById("loading-block").style.display = "none";
}

/*
 * Discover the VPCs in the account
 */
let allowedVpcs = {};
let hasAllowedVpcs = false;

addEventListener("POST_STACK_UPDATE", updateVpcs);

function updateVpcs() {
  window.getVpcs((err, data) => {
    if (err) {
      console.error(err);
    } else {
      // console.log(data)
      window.vpcs = data.Vpcs;
      for (let i = 0; i < window.vpcs.length; i++) {
        if (window.vpcs[i]["IsDefault"] === false && window.vpcs[i]["State"] === "available") {
          allowedVpcs[window.vpcs[i].VpcId] = window.vpcs[i];
          hasAllowedVpcs = true;
        }
      }
      vpcStatus();
      if (hasAllowedVpcs) {
        window.getSubnets((err, data) => {
          if (err) {
            console.error(err);
          } else {
            // console.log(data)
            let sortedSubnets = {};
            let sortedSubnetArray = [];
            for (let i = 0; i < data.Subnets.length; i++) {
              if (!sortedSubnets.hasOwnProperty(data.Subnets[i].VpcId)) {
                sortedSubnets[data.Subnets[i].VpcId] = [];
              }
              sortedSubnets[data.Subnets[i].VpcId].push(data.Subnets[i]);
            }
            // console.log(sortedSubnets)
            for (let vpc in sortedSubnets) {
              for (let i = 0; i < sortedSubnets[vpc].length; i++) {
                for (let j = 0; j < sortedSubnets[vpc].length; j++) {
                  if (sortedSubnets[vpc][i].AvailabilityZone < sortedSubnets[vpc][j].AvailabilityZone) {
                    let temp = sortedSubnets[vpc][i];
                    sortedSubnets[vpc][i] = sortedSubnets[vpc][j];
                    sortedSubnets[vpc][j] = temp;
                  }
                }
              }
              for (var s = 0; s < sortedSubnets[vpc].length; s++) {
                sortedSubnetArray.push(sortedSubnets[vpc][s]);
              }
            }
            // console.log(sortedSubnetArray)
            window.subnets = sortedSubnetArray;

            dispatchEvent(new Event("UI_DATA_UPDATE"));
          }
        });
      }
    }
  });
}

function fetchKeyPairs() {
  window.getEc2KeyPairs((err, data) => {
    if (err) {
      console.error(err);
    } else {
      // console.log(data)
      window.keyPairs = data.KeyPairs;
      dispatchEvent(new Event("UI_DATA_UPDATE"));
    }
  });
}

function createKeyPair() {
  addToTaskQueue(new Task(TASK_TYPES.CREATE_KEY, "create-key-pair"));
  window.generateKeyPair(document.getElementById("region-select").value, (err, data) => {
    if (err) {
      console.error(err);
    } else {
      console.log(data);
      window.keyPairs.push(data);
      dispatchEvent(new Event("KEY_READY"));
      dispatchEvent(new Event("UI_DATA_UPDATE"));
      window.api.saveFile(data.KeyName, data.KeyMaterial);
    }
  });
}

function extendLoadDelay(delay = 3000) {
  if (loadBlockTimeout) {
    clearTimeout(loadBlockTimeout);
  }
  loadBlockTimeout = setTimeout(() => {
    dispatchEvent(new Event(TASK_EVENTS.LOADING_COMPLETE));
  }, delay);
}
addEventListener("UI_DATA_UPDATE", () => {
  extendLoadDelay(1000);
});
addEventListener("EXTEND_LOAD_DELAY", () => {
  extendLoadDelay(3000);
});

function checkDeliveryStackCompleteness() {
  let stackName = "csk-cdk-app-delivery-pipeline-stack";
  let stackInterval = setInterval(
    function (stackName) {
      window.getStackStatus(stackName, (err, data) => {
        if (err) {
          console.error(err);
        } else {
          console.log(data);
          if (data.hasOwnProperty("Stacks") && data.Stacks[0].hasOwnProperty("StackStatus") && data.Stacks[0].StackStatus === "CREATE_COMPLETE") {
            if (data.Stacks[0].Outputs.length > 0) {
              for (let i = 0; i < data.Stacks[0].Outputs.length; i++) {
                if (data.Stacks[0].Outputs[i].ExportName === "CskSourceBucketName") {
                  setValueInNamespace(`${account}-${region}`, "SourceBucket", data.Stacks[0].Outputs[i].OutputValue);
                } else if (data.Stacks[0].Outputs[i].ExportName === "CskPipelineName") {
                  setValueInNamespace(`${account}-${region}`, "PipelineName", data.Stacks[0].Outputs[i].OutputValue);
                }
              }
            }
            dispatchEvent(
              new CustomEvent(TASK_EVENTS.DEPLOYMENT_COMPLETE, {
                detail: stackName,
              })
            );
            clearInterval(stackInterval);
          }
        }
      });
    },
    5000,
    stackName
  );
}

function lockRegionControls(bool) {
  document.getElementById("region-select").disabled = bool;
  document.getElementById("switch-accounts-button").hidden = bool;
}

function closeConfirmationModal() {
  showConfirmationModal(false);
}
function showConfirmationModal(bool, message, details, onconfirm, onno, args) {
  if (bool) {
    document.getElementById("confirm-block").style.display = "block";
    document.getElementById("confirm-message").innerText = message;
    document.getElementById("confirm-details").innerText = details;
    appendHtmlToNode(document.getElementById("confirm-details"), details);
    document.getElementById("background-view").style.filter = "blur(4px)";
    document.getElementById("confirm-ok-button").addEventListener("click", () => {
      onconfirm(...args);
      closeConfirmationModal();
    });
    document.getElementById("confirm-cancel-button").addEventListener("click", () => {
      onno(...args);
    });
  } else {
    document.getElementById("background-view").style.filter = "none";
    document.getElementById("confirm-block").style.display = "none";
  }
}

function showPrepareRegionModal(bool) {
  if (bool) {
    document.getElementById("modal-block").style.display = "block";
    document.getElementById("modal-message").innerText = "Preparing Region...";
    document.getElementById("background-view").style.filter = "blur(4px)";
  } else {
    document.getElementById("background-view").style.filter = "none";
    document.getElementById("modal-block").style.display = "none";
  }
}

function updateRegion(event = null) {
  region = document.getElementById("region-select").value;
  document.getElementById("region-map").setAttribute("src", `images/world_map-${region}.svg`);
  window.setRegion(region);
  setValueInNamespace(account, "SelectedRegion", region);
  lockRegionControls(true);
  showPrepareRegionModal(true);
  addToTaskQueue(new Task(Task.TYPES.REGIONAL_DATA_LOADING, region));
  addToTaskQueue(new Task(Task.TYPES.REGIONAL_PIPELINE_BUILD, region));
  const checker = setInterval(() => {
    if (regionControlsCanBeUnlocked()) {
      lockRegionControls(false);
      showPrepareRegionModal(false);
      clearInterval(checker);
    }
  }, 3000);
  window.prepareRegion((err, data) => {
    console.log(err);
    console.log(data);
    if (data && data.hasOwnProperty("Stacks") && data.Stacks[0].Outputs.length > 0) {
      for (let i = 0; i < data.Stacks[0].Outputs.length; i++) {
        if (data.Stacks[0].Outputs[i].ExportName === "CskSourceBucketName") {
          setValueInNamespace(`${account}-${region}`, "SourceBucket", data.Stacks[0].Outputs[i].OutputValue);
        } else if (data.Stacks[0].Outputs[i].ExportName === "CskPipelineName") {
          setValueInNamespace(`${account}-${region}`, "PipelineName", data.Stacks[0].Outputs[i].OutputValue);
        }
      }
      dispatchEvent(
        new CustomEvent(TASK_EVENTS.DEPLOYMENT_COMPLETE, {
          detail: "csk-cdk-app-delivery-pipeline-stack",
        })
      );
    } else if (data && data.hasOwnProperty("StackId") && data.StackId.match("csk-cdk-app-delivery-pipeline-stack")) {
      checkDeliveryStackCompleteness();
    } else if (err) {
      displayErrors(`Error creating delivery pipeline: ${err.message}`);
      dispatchEvent(
        new CustomEvent(TASK_EVENTS.DEPLOYMENT_FAILED, {
          detail: "csk-cdk-app-delivery-pipeline-stack",
        })
      );
    }
  });
  regionSelected = true;
  listAllStacks();
  allowedVpcs = {};
  hasAllowedVpcs = false;
  updateVpcs();
  getManagedPrefixLists();
  getExistingVpcEndpoints();
  getExistingInstanceConnectEndpoints();
  fetchKeyPairs();
  resetAmiInstanceTypeLists();
  fetchAmis();
  getInstanceTypes();
  resetDbInfraLists();
  getAllDbEngines();
  getAccountHostedZones();
  resetAllKitMonitors();
}

let managedPrefixLists = {};

function getManagedPrefixLists() {
  managedPrefixLists = {};
  window.getPrefixLists({}, function (err, data) {
    if (err) {
      console.log("Error in getPrefixLists", err);
    } else {
      console.log("prefixLists", data.PrefixLists);
      for (let i = 0; i < data.PrefixLists.length; i++) {
        if (data.PrefixLists[i].OwnerId === "AWS" && data.PrefixLists[i].State === "create-complete") {
          let prefixName = data.PrefixLists[i].PrefixListName.split(".").pop();
          prefixName = prefixName === "origin-facing" ? "cloudfront" : prefixName;
          managedPrefixLists[prefixName] = data.PrefixLists[i].PrefixListId;
        }
      }
      console.log("getPrefixLists Success", managedPrefixLists);
    }
  });
}

let vpcEndpoints = {};

function getExistingVpcEndpoints() {
  vpcEndpoints = {};
  window.getVpcEndpoints({}, function (err, data) {
    if (err) {
      console.log("Error in getExistingVpcEndpoints", err);
    } else {
      console.log("vpcEndpoints", data.VpcEndpoints);
      for (let i = 0; i < data.VpcEndpoints.length; i++) {
        if (data.VpcEndpoints[i].State === "available") {
          if (!vpcEndpoints.hasOwnProperty(data.VpcEndpoints[i].VpcId)) {
            vpcEndpoints[data.VpcEndpoints[i].VpcId] = {};
          }
          vpcEndpoints[data.VpcEndpoints[i].VpcId][data.VpcEndpoints[i].ServiceName] = data.VpcEndpoints[i].VpcEndpointId;
        }
      }
      console.log("getExistingVpcEndpoints Success", vpcEndpoints);
    }
  });
}

let instanceConnectEndpoints = {};

function getExistingInstanceConnectEndpoints() {
  instanceConnectEndpoints = {};
  window.getEc2InstanceConnectEndpoints({}, function (err, data) {
    if (err) {
      console.log("Error in getExistingInstanceConnectEndpoints", err);
    } else {
      console.log("instanceConnectEndpoints", data.InstanceConnectEndpoints);
      for (let i = 0; i < data.InstanceConnectEndpoints.length; i++) {
        if (data.InstanceConnectEndpoints[i].State === "create-complete") {
          instanceConnectEndpoints[data.InstanceConnectEndpoints[i].VpcId] = data.InstanceConnectEndpoints[i];
        }
      }
      console.log("getExistingInstanceConnectEndpoints Success", instanceConnectEndpoints);
    }
  });
}

let hostedZones = {};

function getAccountHostedZones() {
  hostedZones = {};
  window.getHostedZones({}, function (err, data) {
    if (err) {
      console.log("Error in getHostedZones", err);
    } else {
      console.log("HostedZones", data.HostedZones);
      for (let i = 0; i < data.HostedZones.length; i++) {
        //strip start of id and trailing . from domain name
        hostedZones[data.HostedZones[i].Id.split("/").pop()] = data.HostedZones[i].Name.replace(/\.$/, "");
      }
      console.log("getHostedZones Success", hostedZones);
    }
  });
}

function getCurrentValues(kitId) {
  let currentValues = {};
  let params = templateParameters.hasOwnProperty(kitId) ? templateParameters[kitId] : [];
  for (let i = 0; i < params.length; i++) {
    currentValues[params[i]] = document.getElementById(`${kitId}|${params[i]}`).value;
  }
  return currentValues;
}

function kitIsUpdateable(kitId) {
  return kitMetadata[kitId].AllowUpdates;
}
let previousConfig = {};

async function getExistingConfigs(kitId) {
  const sourceBucket = getValueInNamespace(`${account}-${region}`, "SourceBucket");
  let existingConfigs = [];
  if (sourceBucket !== "") {
    existingConfigs = await window.fetchKitConfig(kitId, sourceBucket);
    console.log(existingConfigs);
  }
  var configDiv = document.createElement("div");
  configDiv.style.whiteSpace = "nowrap";
  var label = document.createElement("label");
  label.innerText = "Previous configs:";
  configDiv.appendChild(label);
  var select = document.createElement("select");
  select.style.width = "60%";
  select.id = `${kitId}-existing-configs`;
  let bucketName = getValueInNamespace(`${account}-${region}`, "SourceBucket");
  for (let i = 0; i < existingConfigs.length; i++) {
    var option = document.createElement("option");
    option.text = existingConfigs[i][0];
    option.value = await getTextFileFromBucket(bucketName, existingConfigs[i][1]);
    select.appendChild(option);
  }
  configDiv.appendChild(select);
  let button = document.createElement("button");
  button.id = `${kitId}-load-config`;
  button.innerText = "Load";
  let revertButton = document.createElement("button");
  revertButton.id = `${kitId}-revert-config`;
  revertButton.innerText = "Revert";
  revertButton.style.display = "none";
  configDiv.appendChild(button);
  configDiv.appendChild(revertButton);
  // can't attach the event listener until it's in the DOM
  setTimeout(() => {
    document.getElementById(`${kitId}-load-config`).addEventListener("click", () => {
      let selectedConfig = document.getElementById(`${kitId}-existing-configs`).value;
      if (kitIsUpdateable(kitId)) {
        document.getElementById(`${kitId}-install-button`).innerText = `Update ${kitMetadata[kitId].Name}`;
      }
      document.getElementById(`${kitId}-revert-config`).style.display = "inline-block";
      let config = JSON.parse(selectedConfig);
      for (let i = 0; i < config.length; i++) {
        if (document.getElementById(`${kitId}|${config[i]["ParameterKey"]}`)) {
          previousConfig[`${kitId}|${config[i]["ParameterKey"]}`] = document.getElementById(`${kitId}|${config[i]["ParameterKey"]}`).value;
          if (config[i]["ParameterKey"] === "userData") {
            document.getElementById(`${kitId}|${config[i]["ParameterKey"]}`).value = atob(config[i]["ParameterValue"]);
          } else {
            document.getElementById(`${kitId}|${config[i]["ParameterKey"]}`).value = config[i]["ParameterValue"];
          }
        }
      }
    });
    document.getElementById(`${kitId}-revert-config`).addEventListener("click", () => {
      document.getElementById(`${kitId}-install-button`).innerText = `Install ${kitMetadata[kitId].Name}`;
      document.getElementById(`${kitId}-revert-config`).style.display = "none";
      for (let inputId in previousConfig) {
        if (inputId.split("|")[0] === kitId) {
          document.getElementById(inputId).value = previousConfig[inputId];
        }
      }
    });
  }, 1000);
  return configDiv.outerHTML;
}

async function displayTemplateConfig(kitId) {
  let kit = kitMetadata[kitId];
  //fetch all current values so we can add them back if we reload the config form
  const currentValues = getCurrentValues(kitId);
  const existingConfigs = await getExistingConfigs(kitId);
  if (regionSelected) {
    const templates = kit.Templates;
    const amiFilter = kit.hasOwnProperty("AmiFilter") ? kit.AmiFilter : "";
    const dbEngineFilter = kit.hasOwnProperty("DbEngineFilter") ? kit.DbEngineFilter : "";
    let configElements = `<div>`;
    configElements += existingConfigs;
    configElements += `<input id="AWSDistributorName" type="hidden" value="${window.resellerConfig.AWSDistributorName}" name="AWSDistributorName" required>`;
    configElements += `<input id="CountryCode" type="hidden" value="${window.resellerConfig.CountryCode}" name="CountryCode" required>`;
    configElements += `<input id="ReportingEnabled" type="hidden" value="false" name="ReportingEnabled" required>`;
    templateParameters[kitId] = [];
    let hasConfig = false;
    let rowclass = "griditemlight";
    for (let i = 0; i < templates.length; i++) {
      let template = templates[i];
      const response = await fetch(`https://${window.hosts.FILE_HOST}/kits/cfn-templates/${template}`, {
        method: "GET",
        headers: {
          "x-access-control": JSON.parse(localStorage.getItem("kitConfig"))["KitHubCode"],
        },
      });
      const content = await response.json();
      if (
        content.hasOwnProperty("Metadata") &&
        content.Metadata.hasOwnProperty("AWS::CloudFormation::Interface") &&
        content.Metadata["AWS::CloudFormation::Interface"].hasOwnProperty("ParameterGroups")
      ) {
        hasConfig = true;
        let parameterGroups = content.Metadata["AWS::CloudFormation::Interface"].ParameterGroups;
        for (let i = 0; i < parameterGroups.length; i++) {
          if (parameterGroups[i].Label.default.match(/Starter-kit Specific Details/i)) {
            // we handle these directly
            continue;
          }
          configElements += makeGroupLabel(parameterGroups[i].Label.default);
          for (let j = 0; j < parameterGroups[i].Parameters.length; j++) {
            let thisParam = parameterGroups[i].Parameters[j];
            templateParameters[kitId].push(thisParam);
            if (thisParam.match(/AWSDistributorName|ReportingEnabled/)) {
              // we handle these directly
              continue;
            }
            configElements += makeConfigRow(kitId, rowclass, thisParam, content["Parameters"], amiFilter, dbEngineFilter, currentValues);
            rowclass = rowclass === "griditemdark" ? "griditemlight" : "griditemdark";
          }
          configElements += `</div></div>`;
        }
      } else if (content.hasOwnProperty("Parameters")) {
        hasConfig = true;
        configElements += `<div class="config">`;
        for (let thisParam in content["Parameters"]) {
          templateParameters[kitId].push(thisParam);
          if (thisParam.match(/AWSDistributorName|ReportingEnabled/)) {
            continue;
          }
          configElements += makeConfigRow(kitId, rowclass, thisParam, content["Parameters"], amiFilter, dbEngineFilter, currentValues);
          rowclass = rowclass === "griditemdark" ? "griditemlight" : "griditemdark";
        }
        configElements += "</div>";
      }
      configElements += "</div>";
    }
    if (!hasConfig) {
      configElements += `<p class="no-config">No configuration required for this kit.</p>`;
    }
    // document.getElementById(`${kitId}-config-pane`).innerHTML = configElements;
    appendHtmlToNode(document.getElementById(`${kitId}-config-pane`), configElements, true);
    if (document.getElementById("create-key-pair-button")) {
      document.getElementById("create-key-pair-button").addEventListener("click", createKeyPair);
    }
    setTimeout(filterAmis, 200);
    setTimeout(filterByVpc, 200);
    setTimeout(filterDbInstanceClasses, 200);
  }
}

function makeConfigRow(kitId, rowclass, thisParam, params, amiFilter, dbEngineFilter, currentValues) {
  let configRow = "";
  let infoLink = "";
  let hidden = "";
  if (params[thisParam].hasOwnProperty("InfoLink")) {
    infoLink = `(<a href="${params[thisParam]["InfoLink"]}" target="_blank">more info...</a>)`;
  }
  let label = params[thisParam].hasOwnProperty("Label") ? params[thisParam]["Label"] : thisParam;
  configRow += `<div class="${rowclass}"><label style="margin: 0px" for="${thisParam}">${label}</label><br><small><i>${params[thisParam]["Description"]} ${infoLink}</i></small><br>`;
  configRow += `</div><div class="${rowclass}">`;
  try {
    configRow += makeInputElement(kitId, params[thisParam], thisParam, amiFilter, dbEngineFilter, currentValues[thisParam]);
  } catch (e) {
    configRow += `Error rendering input for ${thisParam}`;
  }
  configRow += "</div>";
  return configRow;
}

function makeHiddenConfigRow(kitId, thisParam, params, amiFilter, dbEngineFilter, currentValues) {
  let configRow = "<div class='hidden'></div><div class='hidden'>";
  try {
    configRow += makeInputElement(kitId, params[thisParam], thisParam, amiFilter, dbEngineFilter, currentValues[thisParam]);
  } catch (e) {
    configRow += `Error rendering input for ${thisParam}`;
  }
  configRow += "</div>";
  return configRow;
}

function makeGroupLabel(label) {
  let configElements = "";
  configElements += `<div class="parameter-group">`;
  configElements += `<p class="parameter-heading">${label}</p>`;
  configElements += `<div class="config">`;
  return configElements;
}

async function displayCdkAppConfig(kitId) {
  let kit = kitMetadata[kitId];
  const currentValues = getCurrentValues(kitId);
  const existingConfigs = await getExistingConfigs(kitId);
  if (regionSelected) {
    const manifest = kit.Manifest;
    const amiFilter = kit.hasOwnProperty("AmiFilter") ? kit.AmiFilter : "";
    const dbEngineFilter = kit.hasOwnProperty("DbEngineFilter") ? kit.DbEngineFilter : "";
    if (!manifest) {
      document.getElementById(`${kitId}-config-pane`).innerText = "No manifest file found.";
      return;
    }
    const response = await fetch(`https://${window.hosts.FILE_HOST}/kits/cdk-apps/${manifest}`, {
      method: "GET",
      headers: {
        "x-access-control": JSON.parse(localStorage.getItem("kitConfig"))["KitHubCode"],
      },
    });
    const content = await response.json();
    // console.log(content)
    let configElements = `<div>`;
    configElements += existingConfigs;
    configElements += `<div class="config">`;
    configElements += `<input id="AWSDistributorName" type="hidden" value="${window.resellerConfig.AWSDistributorName}" name="AWSDistributorName" required>`;
    configElements += `<input id="CountryCode" type="hidden" value="${window.resellerConfig.CountryCode}" name="CountryCode" required>`;
    let hasConfig = false;
    templateParameters[kitId] = [];
    let rowclass = "griditemlight";

    if (content.hasOwnProperty("ParameterGroups") && Object.keys(content["ParameterGroups"]).length > 0) {
      hasConfig = true;
      let parameterGroups = content["ParameterGroups"];
      for (let i = 0; i < parameterGroups.length; i++) {
        configElements += makeGroupLabel(parameterGroups[i].Label.default);
        for (let j = 0; j < parameterGroups[i].Parameters.length; j++) {
          let thisParam = parameterGroups[i].Parameters[j];
          templateParameters[kitId].push(thisParam);
          if (content["Parameters"][thisParam].hasOwnProperty("Hidden")) {
            configElements += makeHiddenConfigRow(kitId, thisParam, content["Parameters"], amiFilter, dbEngineFilter, currentValues);
          } else {
            configElements += makeConfigRow(kitId, rowclass, thisParam, content["Parameters"], amiFilter, dbEngineFilter, currentValues);
            rowclass = rowclass === "griditemdark" ? "griditemlight" : "griditemdark";
          }
        }
        configElements += `</div></div>`;
      }
    } else if (content.hasOwnProperty("Parameters") && Object.keys(content["Parameters"]).length > 0) {
      hasConfig = true;
      for (let thisParam in content["Parameters"]) {
        templateParameters[kitId].push(thisParam);
        if (thisParam === "AWSDistributorName") {
          continue;
        }
        if (content["Parameters"][thisParam].hasOwnProperty("Hidden")) {
          configElements += makeHiddenConfigRow(kitId, thisParam, content["Parameters"], amiFilter, dbEngineFilter, currentValues);
        } else {
          configElements += makeConfigRow(kitId, rowclass, thisParam, content["Parameters"], amiFilter, dbEngineFilter, currentValues);
          rowclass = rowclass === "griditemdark" ? "griditemlight" : "griditemdark";
        }
      }
    }
    if (!hasConfig) {
      configElements += `<p class="no-config">No configuration required for this kit.</p>`;
    }
    configElements += "</div></div>";
    appendHtmlToNode(document.getElementById(`${kitId}-config-pane`), configElements, true);
    setTimeout(filterAmis, 200);
    setTimeout(filterByVpc, 200);
    setTimeout(filterDbInstanceClasses, 200);
  }
}

function vpcStatus() {
  if (hasAllowedVpcs) {
    document.getElementById("no-vpc-warning").hidden = true;
  } else {
    document.getElementById("no-vpc-warning").hidden = false;
  }
}

RegExp.quote = function (str) {
  str = str.replaceAll(/([<>])/g, "\\$1");
  str = str.replaceAll(/-]/g, "\\-]");
  return str;
};

function makeInputElement(kitId, obj, key, amiFilter, dbEngineFilter, curVal = null) {
  //override it if it exists
  if (curVal) {
    obj["Default"] = curVal;
  }
  let element = "";
  let uniqueId = `${kitId}|${key}`;
  if (obj["Type"] === "CSK::PrefixList") {
    if (managedPrefixLists.hasOwnProperty(obj["Service"])) {
      element += `<input id="${uniqueId}" name="${key}" value="${managedPrefixLists[obj["Service"]]}">`;
    }
  } else if (key.match(/^InstanceType$/i) || obj["Type"] === "CSK::InstanceType") {
    element = `<select id="${uniqueId}" name="${key}" class="instance-type-selector" onchange="filterAmis()">`;
    let currentInstanceClass = null;
    for (let instanceType in window.instanceTypes) {
      let thisInstanceClass = instanceType.split(".")[0];
      if (currentInstanceClass !== thisInstanceClass) {
        if (currentInstanceClass !== null) {
          element += "</optgroup>";
        }
        element += `<optgroup label="${thisInstanceClass}">`;
        currentInstanceClass = thisInstanceClass;
      }
      element += `<option arch="${
        window.instanceTypes[instanceType]["ProcessorInfo"]["SupportedArchitectures"][0]
      }" value="${instanceType}">${instanceType} - (${window.instanceTypes[instanceType]["ProcessorInfo"]["SupportedArchitectures"][0]}) ${
        window.instanceTypes[instanceType]["VCpuInfo"]["DefaultVCpus"]
      } vCPUs, ${Number(window.instanceTypes[instanceType]["MemoryInfo"]["SizeInMiB"]) / 1024} GB</option>`;
    }
    element += "</optgroup>";
    element += `</select><p style="margin: -5px 2px;"><span id="${uniqueId}|suggestX86">x86: `;
    element += `<a onclick="suggestInstance('${uniqueId}','XS')">XS</a> | `;
    element += `<a onclick="suggestInstance('${uniqueId}','S')">S</a> | `;
    element += `<a onclick="suggestInstance('${uniqueId}','M')">M</a> | `;
    element += `<a onclick="suggestInstance('${uniqueId}','L')">L</a> | `;
    element += `<a onclick="suggestInstance('${uniqueId}','XL')">XL</a></span><span id="${uniqueId}|suggestArm"> Arm: `;
    element += `<a onclick="suggestInstance('${uniqueId}','XSg')">XS</a> | `;
    element += `<a onclick="suggestInstance('${uniqueId}','Sg')">S</a> | `;
    element += `<a onclick="suggestInstance('${uniqueId}','Mg')">M</a> | `;
    element += `<a onclick="suggestInstance('${uniqueId}','Lg')">L</a> | `;
    element += `<a onclick="suggestInstance('${uniqueId}','XLg')">XL</a></span>`;
    element += `</p><p style="margin: -5px 2px; font-weight:bold" id="${uniqueId}-message"></p>`;
  } else if (obj.hasOwnProperty("AllowedValues")) {
    if (obj["AllowedValues"].length == 2 && obj["AllowedValues"][0] == true && obj["AllowedValues"][1] == false) {
      let label = "No label";
      let checked = "checked";
      if (obj.hasOwnProperty("CheckboxLabel")) {
        label = obj.CheckboxLabel;
      }
      if (obj.hasOwnProperty("Default")) {
        checked = obj.Default ? "checked" : "";
      }
      element = `<input class="checkbox" id="${uniqueId}" name="${key}" type="checkbox" value="${obj["AllowedValues"][0]}" ${checked}> <label class="checkbox-label" for="">${label}</label>`;
    } else {
      // select input
      element = `<select id="${uniqueId}" name="${key}">`;
      for (let i = 0; i < obj["AllowedValues"].length; i++) {
        element += `<option value="${obj["AllowedValues"][i]}"`;
        if (obj["AllowedValues"][i] === obj["Default"]) {
          element += ` selected`;
        }
        element += `>${obj["AllowedValues"][i]}</option>`;
      }
      element += "</select>";
    }
  } else if (obj.hasOwnProperty("Type")) {
    // find resources in account and offer dropdown
    if (obj["Type"] === "AWS::EC2::VPC::Id") {
      element = `<select id="${uniqueId}" name="${key}" class="vpc-selector" onchange="filterByVpc()">`;
      for (let vpcId in allowedVpcs) {
        let foundName = findNameFromTags(allowedVpcs[vpcId]["Tags"]) || allowedVpcs[vpcId]["VpcId"];
        element += `<option value="${allowedVpcs[vpcId]["VpcId"]}">${foundName} - ${allowedVpcs[vpcId]["CidrBlock"]}</option>`;
      }
      element += "</select>";
    } else if (obj["Type"] === "AWS::EC2::Subnet::Id") {
      element = `<select id="${uniqueId}" name="${key}" class="subnet-selector">`;
      let currentVpc = window.subnets[0]["VpcId"];
      element += `<optgroup label="${window.subnets[0]["VpcId"]}">`;
      for (let i = 0; i < window.subnets.length; i++) {
        if (allowedVpcs[window.subnets[i]["VpcId"]]) {
          if (window.subnets[i]["VpcId"] !== currentVpc) {
            element += `</optgroup><optgroup label="${window.subnets[i]["VpcId"]}">`;
            currentVpc = window.subnets[i]["VpcId"];
          }
          let foundName = findNameFromTags(window.subnets[i]["Tags"]) || window.subnets[i]["SubnetId"];
          let subnetType = findSubnetTypeFromTags(window.subnets[i]["Tags"]) || guessSubnetType(foundName);
          element += `<option az="${window.subnets[i]["AvailabilityZone"]}" type="${subnetType}" vpc="${window.subnets[i]["VpcId"]}" value="${window.subnets[i]["SubnetId"]}">${foundName} - ${window.subnets[i]["CidrBlock"]} - ${window.subnets[i]["AvailabilityZone"]}</option>`;
        }
      }
      element += "</optgroup></select>";
    }
    // VPC endpoints and Ec2 instance Connect endpoints are VPC-specific so they need to be filtered when a VPC is chosen
    else if (obj["Type"] === "CSK::VpcEndpoint") {
      element += `<input id="${uniqueId}" name="${key}" class="vpc-endpoints">`;
    } else if (obj["Type"] === "CSK::EicEndpoint") {
      element += `<input id="${uniqueId}" name="${key}" class="eic-endpoint">`;
    } else if (obj["Type"] === "AWS::EC2::KeyPair::KeyName") {
      element = `<select id="${uniqueId}" name="${key}" style="background-color: white">`;
      for (let i = 0; i < window.keyPairs.length; i++) {
        element += `<option value="${window.keyPairs[i]["KeyName"]}">${window.keyPairs[i]["KeyName"]}</option>`;
      }
      element += "</select>";
      if (window.keyPairs.length === 0) {
        element += ` <button id="create-key-pair-button">Create Key Pair</button>`;
      }
    } else if (obj["Type"] === "CSK::DbEngineVersion") {
      element = `<select id="${uniqueId}" name="${key}" class="dbengine-selector" onchange="filterDbInstanceClasses()">`;
      if (dbEngineFilter) {
        for (let engineVersion in window.dbEngines[dbEngineFilter]) {
          element += `<option engine="${dbEngineFilter}" value="${engineVersion}">${window.dbEngines[dbEngineFilter][engineVersion]["DBEngineVersionDescription"]}</option>`;
        }
        element += "</select>";
      }
    } else if (obj["Type"] === "CSK::DbInstanceClass") {
      element = `<select id="${uniqueId}" name="${key}" class="instance-class-selector" onchange="instanceClassSet(this)" onchange="storeInstanceClassState('${uniqueId}')"><option>Choose the DB engine first</option></select><br><p style="margin: -5px 2px; font-weight:bold" id="${uniqueId}-message"></p>`;
    } else if (obj["Type"] === "AWS::Route53::HostedZone::Id") {
      element = `<select id="${uniqueId}" name="${key}">`;
      element += `<option value="" zonename=""></option>`;
      for (let hostedZoneId in hostedZones) {
        element += `<option value="${hostedZoneId}" zonename="${hostedZones[hostedZoneId]}">${hostedZones[hostedZoneId]} (${hostedZoneId})</option>`;
      }
      element += "</select>";
    } else if (obj["Type"] === "AWS::EC2::Image::Id") {
      element = `<select id="${uniqueId}" name="${key}" class="ami-selector" onchange="storeAmiState('${uniqueId}')">`;
      if (!amiFilter || amiFilter === "Windows") {
        element += `<optgroup label="Windows">`;
        for (let i = 0; i < window.amis.windows.length; i++) {
          element += `<option os="Windows" arch="${window.amis.windows[i]["Architecture"]}" value="${window.amis.windows[i]["ImageId"]}">${window.amis.windows[
            i
          ]["ShortName"]
            .split("/")
            .pop()}</option>`;
        }
        element += `</optgroup>`;
      }
      if (!amiFilter || amiFilter === "AmazonLinux") {
        element += `<optgroup label="Amazon Linux 2023">`;
        for (let i = 0; i < window.amis.linux2023.length; i++) {
          element += `<option os="Linux" arch="${window.amis.linux2023[i]["Architecture"]}" value="${
            window.amis.linux2023[i]["ImageId"]
          }">${window.amis.linux2023[i]["ShortName"].split("/").pop()}</option>`;
        }
        element += `</optgroup><optgroup label="Amazon Linux 2023 (Arm)">`;
        for (let i = 0; i < window.amis.linux2023Arm.length; i++) {
          element += `<option os="Linux" arch="${window.amis.linux2023Arm[i]["Architecture"]}" value="${
            window.amis.linux2023Arm[i]["ImageId"]
          }">${window.amis.linux2023Arm[i]["ShortName"].split("/").pop()}</option>`;
        }
        element += `</optgroup><optgroup label="Amazon Linux 2">`;
        for (let i = 0; i < window.amis.linux2.length; i++) {
          element += `<option os="Linux" arch="${window.amis.linux2[i]["Architecture"]}" value="${window.amis.linux2[i]["ImageId"]}">${window.amis.linux2[i][
            "ShortName"
          ]
            .split("/")
            .pop()}</option>`;
        }
        element += `</optgroup><optgroup label="Amazon Linux 2 (Arm)">`;
        for (let i = 0; i < window.amis.linuxArm.length; i++) {
          element += `<option os="Linux" arch="${window.amis.linuxArm[i]["Architecture"]}" value="${window.amis.linuxArm[i]["ImageId"]}">${window.amis.linuxArm[
            i
          ]["ShortName"]
            .split("/")
            .pop()}</option>`;
        }
        element += `</optgroup>`;
      }
      if (!amiFilter || amiFilter === "Ubuntu") {
        element += `<optgroup label="Ubuntu">`;
        for (let i = 0; i < window.amis.ubuntu.length; i++) {
          element += `<option os="Linux" arch="${window.amis.ubuntu[i]["Architecture"]}" value="${window.amis.ubuntu[i]["ImageId"]}">${window.amis.ubuntu[i][
            "ShortName"
          ]
            .split("/")
            .pop()}</option>`;
        }
        element += `</optgroup><optgroup label="Ubuntu (Arm)">`;
        for (let i = 0; i < window.amis.ubuntuArm.length; i++) {
          element += `<option os="Linux" arch="${window.amis.ubuntuArm[i]["Architecture"]}" value="${
            window.amis.ubuntuArm[i]["ImageId"]
          }">${window.amis.ubuntuArm[i]["ShortName"].split("/").pop()}</option>`;
        }
        element += `</optgroup><optgroup label="RHEL">`;
        for (let i = 0; i < window.amis.rhel.length; i++) {
          element += `<option os="Linux" arch="${window.amis.rhel[i]["Architecture"]}" value="${window.amis.rhel[i]["ImageId"]}">${window.amis.rhel[i][
            "ShortName"
          ]
            .split("/")
            .pop()}</option>`;
        }
        element += `</optgroup><optgroup label="RHEL (Arm)">`;
        for (let i = 0; i < window.amis.rhelArm.length; i++) {
          element += `<option os="Linux" arch="${window.amis.rhelArm[i]["Architecture"]}" value="${window.amis.rhelArm[i]["ImageId"]}">${window.amis.rhelArm[i][
            "ShortName"
          ]
            .split("/")
            .pop()}</option>`;
        }
        element += "</optgroup>";
      }
      element += `</select><p style="margin: -5px 2px; font-weight:bold" id="${uniqueId}-message"></p>`;
    } else if (obj["Type"] === "CSK::Userdata") {
      inputElement = document.createElement("textarea");
      let def = getValueInNamespace(account, uniqueId);
      if (def === "") {
        def = obj.hasOwnProperty("Default") ? obj["Default"] : "";
      }
      inputElement.setAttribute("id", uniqueId);
      inputElement.setAttribute("name", key);
      inputElement.setAttribute("class", "userdata-textarea");
      inputElement.defaultValue = def;
      inputElement.required = true;
      element = inputElement.outerHTML;
      setTimeout(() => {
        document.getElementById(uniqueId).onchange = userdataEdited;
      }, 2000);
    } else if (obj["Type"] === "CSK::ValidAmi") {
      let inputElement = document.createElement("input");
      inputElement.setAttribute("id", uniqueId);
      inputElement.setAttribute("name", key);
      inputElement.setAttribute("pattern", "ami-[a-f0-9]{17}");
      setTimeout(() => {
        // document.getElementById(uniqueId).onfocus = checkAmi;
        // document.getElementById(uniqueId).onblur = checkAmi;
        document.getElementById(uniqueId).onkeyup = checkAmi;
      }, 2000);
      element = inputElement.outerHTML;
    } else {
      // input type with regex
      let convertedRegex = null;
      if (obj.hasOwnProperty("AllowedPattern")) {
        // fix json encoding and make it compatible with JS regex by quoting any forward slashes
        convertedRegex = obj["AllowedPattern"].replace(String.fromCharCode(92, 92), String.fromCharCode(92));
        convertedRegex = convertedRegex.replace(String.fromCharCode(47), String.fromCharCode(92, 47));
      }
      let inputElement = document.createElement("input");
      if (convertedRegex) {
        inputElement.pattern = convertedRegex;
      }
      if (Number(obj["MaxLength"]) >= 50) {
        inputElement = document.createElement("textarea");
      } else {
        if (obj["Type"] === "String") {
          inputElement.setAttribute("type", "text");
          if (obj.hasOwnProperty("MaxLength")) {
            inputElement.maxLength = obj["MaxLength"];
          }
          if (obj.hasOwnProperty("MinLength")) {
            inputElement.minLength = obj["MinLength"];
          }
        } else if (obj["Type"] === "Number") {
          inputElement.setAttribute("type", "number");
          if (obj.hasOwnProperty("MinValue")) {
            inputElement.min = obj["MinValue"];
          }
          if (obj.hasOwnProperty("MaxValue")) {
            inputElement.max = obj["MaxValue"];
          }
          inputElement.setAttribute("style", "width: 150px");
        }
      }
      let def = getValueInNamespace(account, uniqueId);
      if (def === "") {
        def = obj.hasOwnProperty("Default") ? obj["Default"] : "";
      }
      if (def === "0.0.0.0/0" || obj["Type"] === "CSK::UserIp") {
        getMyIp().then((ip) => {
          document.getElementById(uniqueId).value = `${ip}/32`;
        });
      }
      inputElement.setAttribute("id", uniqueId);
      inputElement.setAttribute("name", key);
      inputElement.defaultValue = def;
      inputElement.required = true;
      setTimeout(() => {
        document.getElementById(uniqueId).onfocus = focusOff;
        document.getElementById(uniqueId).onblur = focusOff;
        document.getElementById(uniqueId).onkeyup = focusOff;
      }, 2000);
      element = inputElement.outerHTML;
    }
  }
  return element;
}

/*
 * Stuff that happens to the form when the user interacts with it
 */

function focusOff(elem) {
  if (!elem.target.value) {
    elem.target.className = "empty";
  } else if (elem.target.checkValidity()) {
    elem.target.className = "valid";
    setValueInNamespace(account, elem.target.id, elem.target.value);
  } else {
    elem.target.className = "invalid";
  }
}

function checkAmi(elem) {
  let kitId = elem.target.id.split("|")[0];
  let paramName = elem.target.id.split("|")[1];
  let otherName = paramName.replace(/custom/, "");
  let otherParamName = otherName.charAt(0).toLowerCase() + otherName.slice(1);
  let otherInput = document.getElementById(kitId + "|" + otherParamName);
  if (otherInput) {
    otherInput.disabled = false;
  }
  if (!elem.target.value) {
    elem.target.className = "empty";
  } else {
    if (elem.target.checkValidity()) {
      window.describeAmis(
        {
          ImageIds: [elem.target.value],
        },
        (err, data) => {
          if (err) {
            elem.target.className = "invalid";
          } else {
            console.log(data);
            let ami = data.Images[0];
            let osType = ami.PlatformDetails.match(/Linux/i) ? "Linux" : "Windows";
            filterInstanceTypes(kitId, ami.Architecture);
            setUserDataDefault(kitId, osType, ami.Architecture);
            elem.target.className = "valid";
            setValueInNamespace(account, elem.target.id, elem.target.value);
            if (otherInput) {
              otherInput.disabled = true;
            }
          }
        }
      );
    } else {
      elem.target.className = "invalid";
    }
  }
}

function filterInstanceTypes(kitId, selectedArch) {
  let instanceTypeSelects = document.getElementsByClassName("instance-type-selector");
  for (let k = 0; k < instanceTypeSelects.length; k++) {
    let selectId = instanceTypeSelects[k].id;
    let thisKitId = selectId.split("|")[0];
    if (thisKitId !== kitId) {
      continue;
    }
    let currentArch = instanceTypeSelects[k].options[instanceTypeSelects[k].selectedIndex].getAttribute("arch");
    if (selectedArch === "x86_64") {
      document.getElementById(`${selectId}|suggestArm`).hidden = true;
      document.getElementById(`${selectId}|suggestX86`).hidden = false;
    } else {
      document.getElementById(`${selectId}|suggestArm`).hidden = false;
      document.getElementById(`${selectId}|suggestX86`).hidden = true;
    }
    for (let j = 0; j < instanceTypeSelects[k].options.length; j++) {
      instanceTypeSelects[k].options[j].hidden = false;
    }
    for (let j = 0; j < instanceTypeSelects[k].options.length; j++) {
      instanceTypeSelects[k].options[j].hidden = instanceTypeSelects[k].options[j].getAttribute("arch") !== selectedArch;
    }
    if (selectedArch !== currentArch) {
      if (selectedArch === "x86_64") {
        suggestInstance(selectId, "M");
      } else {
        suggestInstance(selectId, "Mg");
      }
    }
  }
}

function filterByVpc() {
  // console.log(`filtering subnets that match ${elem.value}`);
  let vpcSelects = document.getElementsByClassName("vpc-selector");
  for (let k = 0; k < vpcSelects.length; k++) {
    let kitId = vpcSelects[k].id.split("|")[0];
    let subnetSelects = document.getElementsByClassName("subnet-selector");
    let selectedIndex = null;
    for (let i = 0; i < subnetSelects.length; i++) {
      let thisKitId = subnetSelects[i].id.split("|")[0];
      if (thisKitId !== kitId) {
        continue;
      }
      for (let j = 0; j < subnetSelects[i].options.length; j++) {
        subnetSelects[i].options[j].hidden = false;
      }
      for (let j = 0; j < subnetSelects[i].options.length; j++) {
        if (subnetSelects[i].options[j].getAttribute("vpc") !== vpcSelects[k].value) {
          subnetSelects[i].options[j].hidden = true;
        } else {
          if (selectedIndex === null) {
            selectedIndex = j;
          }
          subnetSelects[i].options[j].hidden = false;
        }
      }
      subnetSelects[i].selectedIndex = selectedIndex;
    }

    let eiceInputs = document.getElementsByClassName("eic-endpoint");
    for (let i = 0; i < eiceInputs.length; i++) {
      let thisKitId = eiceInputs[i].id.split("|")[0];
      if (thisKitId !== kitId) {
        continue;
      }
      if (instanceConnectEndpoints.hasOwnProperty(vpcSelects[k].value)) {
        eiceInputs[i].value = instanceConnectEndpoints[vpcSelects[k].value]["InstanceConnectEndpointId"];
      }
    }

    let vpceInputs = document.getElementsByClassName("vpc-endpoints");
    for (let i = 0; i < vpceInputs.length; i++) {
      let thisKitId = vpceInputs[i].id.split("|")[0];
      if (thisKitId !== kitId) {
        continue;
      }
      if (vpcEndpoints.hasOwnProperty(vpcSelects[k].value)) {
        vpceInputs[i].value = JSON.stringify(vpcEndpoints[vpcSelects[k].value]);
      }
    }
  }
}

const sizeTypes = {
  XS: ["t3.nano", "t2.nano"],
  S: ["t3.small", "t2.small"],
  M: ["t3.medium", "t2.medium"],
  L: ["m7i.large", "m6i.large", "m5.large"],
  XL: ["m7i.xlarge", "m6i.xlarge", "m5.xlarge"],
  XSg: ["t4g.nano"],
  Sg: ["t4g.small"],
  Mg: ["m8g.medium", "m7g.medium", "m6g.medium", "t4g.medium"],
  Lg: ["m8g.large", "m7g.large", "m6g.large", "t4g.large"],
  XLg: ["m8g.xlarge", "m7g.xlarge", "m6g.xlarge", "t4g.xlarge"],
};

function suggestInstance(selectId, sizeType) {
  //pick first option that is available
  for (let i = 0; i < sizeTypes[sizeType].length; i++) {
    for (let instanceType in window.instanceTypes) {
      if (sizeTypes[sizeType][i] === instanceType) {
        document.getElementById(selectId).value = instanceType;
        filterAmis();
        return;
      }
    }
  }
  document.getElementById(`${selectId}-message`).innerText = "Unable to suggest an instance type";
}

let lastDbInstanceClassSelected = null;

function storeInstanceClassState() {
  let instanceClassSelects = document.getElementsByClassName("instance-class-selector");
  for (let i = 0; i < instanceClassSelects.length; i++) {
    if (instanceClassSelects[i].selectedIndex > -1) {
      lastDbInstanceClassSelected = instanceClassSelects[i].value;
    } else {
      console.log("no instanceClass selected yet");
    }
  }
}

function filterDbInstanceClasses() {
  let dbEngineSelects = document.getElementsByClassName("dbengine-selector");
  for (let k = 0; k < dbEngineSelects.length; k++) {
    let kitId = dbEngineSelects[k].id.split("|")[0];

    let instanceClassSelects = document.getElementsByClassName("instance-class-selector");
    for (let i = 0; i < instanceClassSelects.length; i++) {
      let thisKitId = instanceClassSelects[i].id.split("|")[0];
      if (thisKitId !== kitId) {
        continue;
      }
      let currentValue = instanceClassSelects[i].value;
      instanceClassSelects[i].innerHTML = "";
      let dbInstanceClasses = window.dbInstances[dbEngineSelects[k].options[dbEngineSelects[k].selectedIndex].getAttribute("engine")][dbEngineSelects[k].value];
      let seenInstanceFamilies = {};
      let optgroups = {};
      for (let instanceClass in dbInstanceClasses) {
        let thisInstanceFamily = instanceClass.split(".")[1];
        if (!seenInstanceFamilies.hasOwnProperty(thisInstanceFamily)) {
          optgroups[thisInstanceFamily] = document.createElement("optgroup");
          optgroups[thisInstanceFamily].label = thisInstanceFamily;
          seenInstanceFamilies[thisInstanceFamily] = firstInstanceFamilySeen = true;
        }
        optgroups[thisInstanceFamily].appendChild(new Option(instanceClass, instanceClass));
      }
      for (let family in optgroups) {
        instanceClassSelects[i].appendChild(optgroups[family]);
      }
      instanceClassSelects[i].value = currentValue;
      instanceClassSet(instanceClassSelects[i]);
    }
  }
}

function instanceClassSet(select) {
  if (select.selectedIndex === -1) {
    document.getElementById(`${select.id}-message`).innerText = "Please select an instance class";
  } else {
    document.getElementById(`${select.id}-message`).innerText = "";
  }
}

let osType = null;
let currentArch = {};
let lastArmAmi = {};
let lastX86Ami = {};

function storeAmiState(selectorId) {
  let amiSelects = document.getElementsByClassName("ami-selector");
  for (let i = 0; i < amiSelects.length; i++) {
    let selectId = amiSelects[i].id;
    let kitId = selectId.split("|")[0];
    //stow the last chosen ami for each architecture
    if (amiSelects[i].selectedIndex > -1) {
      let osType = amiSelects[i].options[amiSelects[i].selectedIndex].getAttribute("os");
      let arch = amiSelects[i].options[amiSelects[i].selectedIndex].getAttribute("arch");
      if (arch === "arm64") {
        lastArmAmi[selectorId] = amiSelects[i].value;
      } else {
        lastX86Ami[selectorId] = amiSelects[i].value;
      }
      console.log(`stored ami state for ${selectorId} - x86: ${lastX86Ami[selectorId]} arm: ${lastArmAmi[selectorId]}`);
      setUserDataDefault(kitId, osType, arch);
    } else {
      console.log("no AMI selected yet");
    }
  }
}

let lastUserdata = null;

let userdataChanged = {};
function userdataEdited(event) {
  //unless user has deleted the userdata
  if (document.getElementById(event.target.id).value !== "") {
    userdataChanged[event.target.id] = true;
  } else if (userdataChanged.hasOwnProperty(event.target.id)) {
    delete userdataChanged[event.target.id];
  }
}

function setUserDataDefault(kitId, osType, arch) {
  let userdataTemplate = window.getUserdataTemplate(osType, arch);
  let thisUserdata = `${osType}-${arch}`;
  let userdataTextareas = document.getElementsByClassName("userdata-textarea");
  for (let j = 0; j < userdataTextareas.length; j++) {
    let userdataTextarea = userdataTextareas[j].id;
    if (lastUserdata === null || lastUserdata !== thisUserdata) {
      let userKitId = userdataTextarea.split("|")[0];
      if (userKitId === kitId) {
        userdataTextareas[j].value = userdataTemplate;
      }
    }
  }
  lastUserdata = thisUserdata;
}

function filterAmis() {
  let instanceTypeSelects = document.getElementsByClassName("instance-type-selector");
  for (let k = 0; k < instanceTypeSelects.length; k++) {
    let selectedArch =
      instanceTypeSelects[k].selectedIndex > -1 ? instanceTypeSelects[k].options[instanceTypeSelects[k].selectedIndex].getAttribute("arch") : null;
    let selectId = instanceTypeSelects[k].id;
    let kitId = selectId.split("|")[0];
    let amiSelects = document.getElementsByClassName("ami-selector");
    let targetArch = selectedArch ? selectedArch : "x86_64";
    // select a new AMI
    let selectedIndex = null;
    for (let i = 0; i < amiSelects.length; i++) {
      let amiSelector = amiSelects[i];
      let amiSelectorId = amiSelector.id;
      let thisKitId = amiSelectorId.split("|")[0];
      if (thisKitId !== kitId) {
        continue;
      }
      if (!lastArmAmi.hasOwnProperty(amiSelectorId)) {
        lastArmAmi[amiSelectorId] = null;
      }
      if (!lastX86Ami.hasOwnProperty(amiSelectorId)) {
        lastX86Ami[amiSelectorId] = null;
      }
      if (!currentArch.hasOwnProperty(amiSelectorId)) {
        currentArch[amiSelectorId] = null;
      }
      if (currentArch[amiSelectorId] && targetArch === currentArch[amiSelectorId]) {
        console.log("ami already matches this architecture");
        continue;
      } else {
        // going to make a new selection, so make them all visible for now
        for (let j = 0; j < amiSelector.options.length; j++) {
          amiSelector.options[j].hidden = false;
        }
        if (targetArch === "arm64" && lastArmAmi[amiSelectorId]) {
          amiSelector.value = lastArmAmi[amiSelectorId];
          // console.log("selecting last used arm64 " + lastArmAmi[selectId])
          for (let j = 0; j < amiSelector.options.length; j++) {
            if (amiSelector.options[j].value === lastArmAmi[amiSelectorId]) {
              selectedIndex = j;
              break;
            }
          }
          // console.log("selectedIndex arm " + selectedIndex);
          amiSelector.selectedIndex = selectedIndex;
        } else if (targetArch === "x86_64" && lastX86Ami[amiSelectorId]) {
          amiSelector.value = lastX86Ami[amiSelectorId];
          // console.log("selecting last used x86_64 AMI " + lastX86Ami[selectId])

          for (let j = 0; j < amiSelector.options.length; j++) {
            if (amiSelector.options[j].value === lastX86Ami[amiSelectorId]) {
              selectedIndex = j;
              break;
            }
          }
          // console.log("selectedIndex x86 " + selectedIndex);
          amiSelector.selectedIndex = selectedIndex;
        } else {
          if (amiSelector.selectedIndex > -1) {
            if (amiSelector.options[amiSelector.selectedIndex].getAttribute("arch") !== targetArch) {
              for (let j = 0; j < amiSelector.options.length; j++) {
                if (amiSelector.options[j].getAttribute("arch") === targetArch) {
                  selectedIndex = j;
                  break;
                }
              }
              console.log(`selected first for ${targetArch} - ${selectedIndex}`);
              amiSelector.selectedIndex = selectedIndex;
            } else {
              console.log("selected AMI is the right architecture");
              // console.log(amiSelector.value);
            }
          } else {
            console.log("no AMI selected");
            for (let j = 0; j < amiSelector.options.length; j++) {
              if (amiSelector.options[j].getAttribute("arch") === targetArch) {
                selectedIndex = j;
                break;
              }
            }
            console.log(`selected first for ${targetArch} - ${selectedIndex}`);
            amiSelector.selectedIndex = selectedIndex;
          }
        }
        //hide AMIs with the wrong architecture
        for (let j = 0; j < amiSelector.options.length; j++) {
          if (amiSelector.options[j].getAttribute("arch") !== targetArch) {
            amiSelector.options[j].selected = false;
            amiSelector.options[j].hidden = true;
          } else {
            amiSelector.options[j].hidden = false;
          }
        }
        currentArch[amiSelectorId] = targetArch;
        storeAmiState(amiSelectorId);
      }
    }
  }
}

let debounceWaiter = null;
function debounceDisplayTemplateConfig() {
  if (debounceWaiter) {
    clearTimeout(debounceWaiter);
    // console.log("debounce")
  }
  debounceWaiter = setTimeout(refreshFormElements, 300);
}

function refreshFormElements() {
  for (let kitId in kitConfigsShowing) {
    configureKit(kitId);
  }
}

function displayCredentialErrors(bool, errorString) {
  if (bool) {
    document.getElementById("credential-errors").innerText = errorString;
    document.getElementById("credential-error-block").hidden = false;
  } else {
    document.getElementById("credential-errors").innerText = "";
    document.getElementById("credential-error-block").hidden = true;
  }
}

function displayErrors(error, link = null) {
  if (typeof error === "object") {
    error = error.toString();
  }
  document.getElementById("general-errors").innerText = error;
  if (link) {
    let linkElem = document.createElement("a");
    linkElem.href = link;
    linkElem.target = "_blank";
    linkElem.innerText = "Click here to open console";
    linkElem.style.cursor = "pointer";
    linkElem.style.marginLeft = "6px";
    linkElem.style.display = "inline-block";
    linkElem.addEventListener("click", (e) => {
      window.openInBrowser(link);
      e.stopPropagation();
    });
    document.getElementById("general-errors").appendChild(linkElem);
  }
  document.getElementById("general-error-block").hidden = false;
}

function hideErrors() {
  document.getElementById("general-error-block").hidden = true;
  document.getElementById("general-errors").innerText = "";
}

function displaySessionErrors(error, ok) {
  let errorToDisplay = "";
  if (error && error.toString().match(/Missing credentials in config, if using AWS_CONFIG_FILE, set AWS_SDK_LOAD_CONFIG=1/)) {
    errorToDisplay = "Waiting for credentials...";
  } else if (error) {
    errorToDisplay = error.toString();
  }
  if (errorToDisplay) {
    console.log(errorToDisplay);
    // phoneHome({ action: `session error ${errorToDisplay}` });
    window.loggedIn = false;
    document.getElementById("session-errors").innerText = errorToDisplay;
    document.getElementById("session-error-block").style.display = "block";
    document.getElementById("pasted-credentials").innerText = "";
    switchLeftMenuItem({
      target: { id: "switch-accounts-button", content: "credentials-block" },
    });
  } else {
    console.log(ok);
    window.loggedIn = true;
    document.getElementById("session-error-block").style.display = "none";
    document.getElementById("session-errors").innerText = "";
  }
}

let previousLanguage = null;
function setLanguage() {
  let newLanguage = document.getElementById("lang-select").value;
  if (previousLanguage !== null) {
    phoneHome({ action: `switched language to ${newLanguage}` });
  }
  previousLanguage = newLanguage;
  window.dispatchEvent(new Event("LanguageChange"));
}

function checkSessionWrapper() {
  window.checkSession(displaySessionErrors);
}
setInterval(checkSessionWrapper, 60000);

function resetUi() {
  document.getElementById("no-vpc-warning").hidden = true;
  document.getElementById("session-error-block").style.display = "none";
  document.getElementById("general-error-block").hidden = true;
  document.getElementById("sdk-output").hidden = false;
  document.getElementById("loading-block").style.display = "block";
  document.getElementById("credentials-block").hidden = false;
  document.getElementById("credential-error-block").hidden = true;
  // document.getElementById('current-credentials-block').hidden = true;
  document.getElementById("pasted-credentials").innerText = "";
  // document.getElementById('opt-in').hidden = true;
}

function openRightMenu() {
  document.getElementById("right-hand-menu").style.display = "block";
  document.getElementById("right-hand-menu-closed").style.display = "none";
  document.getElementById("main-content-area").addEventListener("click", closeRightMenu);
  document.getElementById("main-content-area").classList.add("scrunched");
}

function closeRightMenu() {
  document.getElementById("right-hand-menu").style.display = "none";
  document.getElementById("right-hand-menu-closed").style.display = "block";
  document.getElementById("main-content-area").removeEventListener("click", closeRightMenu);
  document.getElementById("main-content-area").classList.remove("scrunched");
}

let lastContentRequested = null;

function switchLeftMenuItem(event) {
  let targetedContent = event.target.hasOwnProperty("content") ? event.target.content : event.target.getAttribute("content");
  if (targetedContent !== lastContentRequested) {
    let menuItems = document.getElementsByClassName("left-hand-menu-item");
    for (let i = 0; i < menuItems.length; i++) {
      menuItems[i].classList.remove("left-hand-menu-item-selected");
      let menuContent = menuItems[i].getAttribute("content");
      if (menuContent) {
        document.getElementById(menuContent).hidden = true;
      }
    }
    document.getElementById(targetedContent).hidden = false;
    phoneHome({ action: `switched to ${targetedContent}` });
    document.getElementById(event.target.id).classList.add("left-hand-menu-item-selected");
    lastContentRequested = targetedContent;
  }
  if (targetedContent === "deployed-stacks") {
    listAllStacks();
  }
}

function toggleCredentialTypes(event = null) {
  if (event === null || event.target.id === "strings-credentials-h3") {
    document.getElementById("strings-credentials-h3").classList.add("fake-focus");
    document.getElementById("strings-credentials-h4").classList.remove("fake-focus");
    document.getElementById("temporary-credentials-div").hidden = false;
    document.getElementById("long-lived-credentials-div").hidden = true;
  } else {
    document.getElementById("strings-credentials-h3").classList.remove("fake-focus");
    document.getElementById("strings-credentials-h4").classList.add("fake-focus");
    document.getElementById("temporary-credentials-div").hidden = true;
    document.getElementById("long-lived-credentials-div").hidden = false;
  }
}

// check that we have a key
checkForKey();

// when we switch regions, refresh the template config
addEventListener("UI_DATA_UPDATE", debounceDisplayTemplateConfig);

document.getElementById("region-select").addEventListener("change", updateRegion);
document.getElementById("lang-select").addEventListener("change", setLanguage);
document.getElementById("submit-credentials-button").addEventListener("click", addCredentials);
document.getElementById("hide-errors").addEventListener("click", hideErrors);
document.getElementById("hide-errors-button").addEventListener("click", hideErrors);
document.getElementById("unlock-button").addEventListener("click", fetchConfigForKey);
document.getElementById("enter-different-key").addEventListener("click", purgeConfig);
document.getElementById("right-hand-menu-closed").addEventListener("click", openRightMenu);
document.getElementById("install-a-kit-button").addEventListener("click", switchLeftMenuItem);
document.getElementById("review-installed-button").addEventListener("click", switchLeftMenuItem);
document.getElementById("switch-accounts-button").addEventListener("click", switchLeftMenuItem);
document.getElementById("strings-credentials-h3").addEventListener("click", toggleCredentialTypes);
document.getElementById("strings-credentials-h4").addEventListener("click", toggleCredentialTypes);

// setTimeout(hideLoadingBlock, 5000);
