
//get the values the user has set in the UI
let excludedAttributes = ["id", "name", "value", "type", "value", "style", "class", "min", "max", "required", "pattern", "onchange"]
function getFormInputs(kitId) {
  let inputs = [];
  let params = templateParameters.hasOwnProperty(kitId) ? templateParameters[kitId] : [];
  let extraParams = {};
  for (let i = 0; i < params.length; i++) {
    let elemId = `${kitId}|${params[i]}`;
    let param = document.getElementById(elemId);
    let parameterValue = param.value;
    if (param.tagName.match(/^textarea$/i)) {
      console.log(parameterValue);
      console.log(parameterValue.split('\n'));
      parameterValue = bytesToBase64(new TextEncoder().encode(parameterValue));
    }
    if (param.tagName.match(/^input$/i) && param.getAttribute('type') === 'checkbox') {
      parameterValue = param.checked;
    }
    if (param.tagName.match(/^select$/i)) {
      if (param.selectedIndex > -1) { //only look if there is a selected option
        const selectedOption = param.options[param.selectedIndex];
        if (selectedOption.hasAttributes()) {
          for (const attr of selectedOption.attributes) {
            if (excludedAttributes.indexOf(attr.name) < 0) {
              extraParams[`${params[i]}-${attr.name}`] = attr.value;
            }
          }
        }
      }
    }
    if (param.hasAttributes()) {
      for (const attr of param.attributes) {
        if (excludedAttributes.indexOf(attr.name) < 0) {
          extraParams[`${params[i]}-${attr.name}`] = attr.value;
        }
      }
    }
    let parameterObject = {
      ParameterKey: params[i],
      ParameterValue: parameterValue,
      ResolvedValue: String(parameterValue).match("^/") ? parameterValue : null,
      UsePreviousValue: false
    }
    inputs.push(parameterObject);
  }
  for (let key in extraParams) {
    let parameterObject = {
      ParameterKey: key,
      ParameterValue: extraParams[key],
      ResolvedValue: extraParams[key],
      UsePreviousValue: false
    }
    inputs.push(parameterObject);
  }
  return inputs;
}

//deploy an CFN template-based kit
async function deployCfnTemplate(kitId, templateIndex = 0) {
  if (!window.loggedIn) {
    return;
  }
  const kitObject = kitMetadata[kitId];
  const templates = kitObject.Templates;
  let inputs = getFormInputs(kitId);
  console.log(inputs);
  for (let i = 0; i < templates.length; i++) {
    let thisStacksParams = [];
    // let templateJson = window.readCfnTemplate(templates[i]);
    let templateJson = await window.getFileFromBucket(`kits/cfn-templates/${templates[i]}`)
    // let templateJson = JSON.parse(templateData);
    if (templateJson.hasOwnProperty("Parameters")) {
      for (let param in templateJson.Parameters) {
        for (let k = 0; k < inputs.length; k++) {
          if (inputs[k].ParameterKey === param) {
            thisStacksParams.push(inputs[k]);
          }
        }
      }
    }
    let stackNamingParam = kitObject.hasOwnProperty("stackNamingParam") ? kitObject["stackNamingParam"] : null;
    let stackName = window.deriveStackName(templates[i], thisStacksParams, stackNamingParam);
    if (templateIndex === i) {
      let bucketName = getValueInNamespace(`${account}-${region}`, 'SourceBucket');
      if (JSON.stringify(templateJson).length > 51999) {
        if (bucketName !== "") {
          startMonitoring();
          phoneHome({ action: "deploy-cfn-kit", kit_id: kitId, starter_kit: templates[i], details: thisStacksParams });
          window.deployCloudFormationTemplate(kitId, templates[i], stackName, thisStacksParams, bucketName, deployResponseHandler);
        }
        else {
          console.log("no bucket available, so not deploying");
        }
      }
      else {
        startMonitoring();
        phoneHome({ action: "deploy-cfn-kit", kit_id: kitId, starter_kit: templates[i], details: thisStacksParams });
        window.deployCloudFormationTemplate(kitId, templates[i], stackName, thisStacksParams, null, deployResponseHandler);
      }
    }
    else if (i > 0 && i > templateIndex) {
      let previousStackName = window.deriveStackName(templates[i - 1], thisStacksParams);
      console.log(`adding a listener for completion of ${previousStackName} to deploy ${stackName}`)
      addEventListener(TASK_EVENTS.DEPLOYMENT_COMPLETE, (event) => {
        if (event.detail === previousStackName) {
          deployCfnTemplate(kitId, i);
        }
      })
    }
  }
}

//deploy a cdk-based kit using codepipeline
function deployCdkApp(kitId) {
  if (!window.loggedIn) {
    return;
  }
  let kitObject = kitMetadata[kitId];
  let inputs = getFormInputs(kitId);
  let manifests = [];
  manifests.push(kitObject.Manifest);
  // all CDK kits will be deployed the same way, via upload to s3 source bucket
  const sourceBucket = getValueInNamespace(`${account}-${region}`, 'SourceBucket');
  if (sourceBucket === "") {
    alert("No source bucket available");
  }

  startMonitoring();
  phoneHome({ csk_id: window.resellerConfig.csk_id, kit_id: kitId, action: "deploy-cdk-kit", partner_name: window.resellerConfig.AWSDistributorName, country_code: window.resellerConfig.CountryCode, starter_kit: kitObject.Manifest, details: inputs });
  // let stackNamingParam = kitObject.hasOwnProperty("stackNamingParam") ? kitObject["stackNamingParam"] : null;
  window.deployCdkViaSourceBucket(kitId, kitObject.Manifest, inputs, region, account, sourceBucket, deployResponseHandler);
}

function destroyStack(kitId) {
  if (!window.loggedIn) {
    return;
  }
  window.listStacks((err, stacks) => {
    if (err) {
      console.error(err)
    }
    else {
      console.log(stacks);
      allStacks = {};
      for (let i = 0; i < stacks.Stacks.length; i++) {
        allStacks[stacks.Stacks[i].StackId] = stacks.Stacks[i];
      }
      for (const stack in allStacks) {
        if (evaluateStatus(allStacks[stack].StackStatus) === TASK_STATES.FAILED_NEEDS_DELETION) {
          let stackTags = allStacks[stack].Tags;
          let tags = {};
          for (let i = 0; i < stackTags.length; i++) {
            tags[stackTags[i].Key] = stackTags[i].Value;
          }
          if (tags.hasOwnProperty("KitId")) {
            let kit = getFromKitMetadata(tags["KitId"]);
            if (kit && kit.name === kitId) {
              window.deleteStack(allStacks[stack].StackName, (err, data) => {
                console.log(err, data);
              });
            }
          }
        }
      }
    }
  })
}
