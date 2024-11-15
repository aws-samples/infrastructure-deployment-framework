// the little bouncing box
const bouncyBox = `<span class="la-square-jelly-box la-dark la-sm" style="margin-left: 3px; margin-right: 10px; margin-bottom: -1px; display: inline-block; color: black; height: 12px; width: 12px;"><div></div><div></div></span>`;
// delay before we start monitoring, to give app time to upload the template etc
const preMonitoringDelay = 1;
// monitoring timeout - stop monitoring for events after this many seconds elapses with no events
const monitoringTimeout = 1800;
// cfMonitor is the setTimeout instance that triggers the monitoring actions
let cfMonitor = null;
// stackStates tracks the state of each stack, keyed on stack name
let stackStates = {};
// lastReportedStates tracks the last reported state of each stack, keyed on stack name
let lastReportedStates = {};
// stackEvents tracks the state of resource events, keyed on stack name
let stackEvents = {};
// stackInfoRequestors tracks the setInterval instance that requests stack outputs, keyed on stack name
let stackInfoRequestors = {};
// stackOutputs hold the outputs the stack generates, if any
let stackOutputs = {}
// any messages from the deploy stack command that need to be shown to the user
let debugMessages = {};
// the time of the last received event
let mostRecentEventTime = null;


let allStacks = {};

function listAllStacks() {
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
      let parentNode = document.getElementById("deployed-stacks");
      parentNode.innerText = "";
      let stackDiv = document.createElement('div');
      stackDiv.classList.add("scrollable");
      let pageHeading = document.createElement('h1');
      pageHeading.classList = ["installed-kits-heading"];
      pageHeading.innerText = "Installed Kits";
      let pageInfo = document.createElement('p');
      pageInfo.innerText = "This is a listing of the kits that have been deployed as CloudFormation stacks into this account.";
      stackDiv.appendChild(pageHeading);
      stackDiv.appendChild(pageInfo);
      for (const stack in allStacks) {
        if (allStacks[stack].StackName.match(/sendStatisticsStack/)) {
          continue;
        }
        if (allStacks[stack].hasOwnProperty("RootId") && allStacks[stack].RootId.match(/\w/)) {
          console.log("not showing nexted stack")
          continue;
        }
        let stackTags = allStacks[stack].Tags;
        let tags = {};
        for (let i = 0; i < stackTags.length; i++) {
          tags[stackTags[i].Key] = stackTags[i].Value;
        }
        if (tags.hasOwnProperty("KitId") || allStacks[stack].StackName === 'CDKToolkit') {
          // it's a kit stack
          let name = allStacks[stack].StackName;
          let kit = getFromKitMetadata(tags["KitId"]);
          if (kit) {
            //we found the kit
            name = kit.Name;
          }
          let stackName = document.createElement('h5');
          stackName.classList.add("sub-heading");
          stackName.innerText = name;
          let stackStatus = document.createElement('p');
          appendHtmlToNode(stackStatus, `<b>Status:</b> ${labelStatus(allStacks[stack].StackStatus)}`)
          let stackDesc = document.createElement('p');
          stackDesc.innerText = allStacks[stack].Description ? allStacks[stack].Description : "No description available";
          let stackLinks = document.createElement('p');
          let stackInputsLink = document.createElement('a');
          stackInputsLink.innerText = "⬆️ Inputs";
          stackInputsLink.classList = ["stack-info"]
          stackInputsLink.setAttribute('onclick', `showInputs("${allStacks[stack].StackId}")`);
          let stackOutputsLink = document.createElement('a');
          stackOutputsLink.innerText = "⬇️ Outputs";
          stackOutputsLink.classList = ["stack-info"]
          stackOutputsLink.setAttribute('onclick', `showOutputs("${allStacks[stack].StackId}")`);
          let stackConsoleLink = document.createElement('a');
          stackConsoleLink.innerText = "👀 View in Console";
          stackConsoleLink.classList = ["stack-info"]
          stackConsoleLink.setAttribute('onclick', `goToConsole("${allStacks[stack].StackId}")`);
          let stackMetadata = document.createElement('div');
          stackMetadata.id = `${allStacks[stack].StackId}-metadata`;
          stackMetadata.classList.add("deployed-kit-metadata");
          stackLinks.appendChild(stackInputsLink);
          stackLinks.appendChild(stackOutputsLink);
          if (evaluateStatus(allStacks[stack].StackStatus) === TASK_STATES.FAILED_NEEDS_DELETION) {
            let stackDeleteLink = document.createElement('a');
            stackDeleteLink.innerText = "🗑️ Delete";
            stackDeleteLink.classList = ["stack-info"]
            stackDeleteLink.setAttribute('onclick', `confirmDeleteStack("${allStacks[stack].StackId}")`);
            stackLinks.appendChild(stackDeleteLink);
          }
          stackLinks.appendChild(stackConsoleLink);
          stackDiv.appendChild(stackName);
          stackDiv.appendChild(stackStatus);
          stackDiv.appendChild(stackDesc);
          stackDiv.appendChild(stackLinks);
          stackDiv.appendChild(stackMetadata);
        } else {
          continue;
        }
      }
      parentNode.appendChild(stackDiv);
    }
  })
}

function confirmDeleteStack(stackName) {
  if (confirm(`Are you sure you want to delete stack ${stackName}?`)) {
    window.deleteStack(stackName, (err, data) => {
      console.log(err, data);
    });
  }
}

function getFromKitMetadata(string) {
  if (kitMetadata.hasOwnProperty(string)) {
    return kitMetadata[string];
  }
  return null;
}

function showInputs(stackId) {
  const stack = allStacks[stackId];
  const inputs = stack.Parameters;
  let filteredInputs = [];
  for (let i = 0; i < inputs.length; i++) {
    if (inputs[i]["ParameterKey"] !== "BootstrapVersion") {
      filteredInputs.push(inputs[i]);
    }
  }
  let localInputStore = localStorage.getItem(`${account}-${region}-${stack.StackName}`);
  let localInputs = (localInputStore && localInputStore.match(/^\[/)) ? JSON.parse(localInputStore) : [];
  let inputDiv = document.createElement('div');
  if (filteredInputs.length === 0 && localInputs.length === 0) {
    let paramDiv = document.createElement('div');
    paramDiv.innerText = `Stack had no inputs.`;
    inputDiv.appendChild(paramDiv);
  }
  else {
    for (let i = 0; i < filteredInputs.length; i++) {
      let paramDiv = document.createElement('div');
      appendHtmlToNode(paramDiv, `<b>${filteredInputs[i]["ParameterKey"]}</b>: ${filteredInputs[i]["ParameterValue"]}`);
      inputDiv.appendChild(paramDiv);
    }
    for (let i = 0; i < localInputs.length; i++) {
      let paramDiv = document.createElement('div');
      appendHtmlToNode(paramDiv, `<b>${localInputs[i]["ParameterKey"]}</b>: ${localInputs[i]["ParameterValue"]}`);
      inputDiv.appendChild(paramDiv);
    }
  }
  let parentNode = document.getElementById(`${stackId}-metadata`);
  parentNode.innerText = '';
  parentNode.appendChild(inputDiv);
}

function showOutputs(stackId) {
  const stack = allStacks[stackId];
  const outputs = stack.Outputs;
  let outputDiv = document.createElement('div');
  if (outputs.length === 0) {
    let paramDiv = document.createElement('div');
    paramDiv.innerText = `Stack had no outputs.`;
    outputDiv.appendChild(paramDiv);
  }
  else {
    for (let i = 0; i < outputs.length; i++) {
      let paramDiv = document.createElement('div');
      appendHtmlToNode(paramDiv, `<b>${outputs[i]["OutputKey"]}</b>: ${outputs[i]["OutputValue"]}`);
      outputDiv.appendChild(paramDiv);
    }
  }
  let parentNode = document.getElementById(`${stackId}-metadata`);
  parentNode.innerText = '';
  parentNode.appendChild(outputDiv);
}

// function deleteStack(stackId) {
//   openConsole(`https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${stackId}`);
//   // window.destroyStack(stackId, showStacksProgressFunc)
// }

function goToConsole(stackId) {
  openConsole(`https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${stackId}`);
}

//set all the variables back to empty state
function resetStackMonitoring() {
  cfMonitor = null;
  stackStates = {};
  lastReportedStates = {};
  stackEvents = {};
  stackInfoRequestors = {};
  stackOutputs = {}
  debugMessages = {};
  mostRecentEventTime = null;
}

function showStacksProgressFunc() {
  if (!window.loggedIn) {
    return;
  }
  let stacks = window.getStacksInProgress();
  // populateStackMonitorSelect();
  if (Object.keys(stacks).length > 0) {
    for (let stack in stacks) {
      if (stacks[stack].tracking) {
        console.log("checking stack progress for: " + stack);
        window.getStackEvents(stack, stackEventsResponseHandler);
      }
      else {
        console.log("not tracking: " + stack)
      }
    }
  }
  // else {
  // clearInterval(cfMonitor);
  // in case we created something that the UI should learn about
  // dispatchEvent(new Event('POST_STACK_UPDATE'));
  // }
}

// the callback for processing the stack events
const stackEventsResponseHandler = function (stack, stackStatus, states) {
  console.log("stackEventsResponseHandler", stack, stackStatus, states)
  let stacksInProgress = window.getStacksInProgress();
  if (!stackStatus || !stackStatus.hasOwnProperty("Timestamp")) {
    const kitId = stacksInProgress[stack].kitId;
    window.getStackInfo(stack, (stack, outputs) => {
      console.log(outputs);
      if (outputs && outputs.toString().match("does not exist")) {
        console.log("Stack does not exist, yet");
      }
      else if (outputs && outputs.hasOwnProperty("Stacks") && evaluateStatus(outputs.Stacks[0].StackStatus) === TASK_STATES.COMPLETE) {
        window.handleCompletedStack(stack)
        unlockInstallButton(kitId);
        registerProgress(kitId, 100, `${kitId} has already been installed.`);
        dispatchEvent(new CustomEvent(TASK_EVENTS.DEPLOYMENT_COMPLETE, { detail: outputs.Stacks[0].StackName }));
        stopMonitoring();
      }
    })
  }
  else {
    //check most recent event is not older than the monitoring timeout period
    let latestEventTime = new Date(stackStatus.Timestamp).getTime();
    if (!mostRecentEventTime) {
      mostRecentEventTime = latestEventTime;
    }
    if (latestEventTime > mostRecentEventTime) {
      mostRecentEventTime = latestEventTime;
    }
    for (let i = 0; i < states.length; i++) {
      latestEventTime = new Date(states[i].Timestamp).getTime()
      if (latestEventTime > mostRecentEventTime) {
        mostRecentEventTime = latestEventTime;
      }
    }
    if (!stackStates.hasOwnProperty(stack)) {
      stackStates[stack] = {};
    }
    stackStates[stack] = stackStatus;
    // check to see if the stack is complete
    if (stackStatus && stackStatus.hasOwnProperty("ResourceStatus")) {
      stacksInProgress[stack].status = stackStatus.ResourceStatus;
      // if stack is complete, request stack info to retrieve outputs, if applicable
      if (evaluateStatus(stackStatus.ResourceStatus) === TASK_STATES.COMPLETE && stacksInProgress[stack].hasOutputs && !stackInfoRequestors.hasOwnProperty(stack)) {
        stackInfoRequestors[stack] = setInterval(requestStackInfo, 3000, stack);
      }
      // else if (stackStatus.ResourceStatus.match(/(DELETE_COMPLETE|ROLLBACK_COMPLETE)/)) {
      //   // we handle failed stacks in updateStackEventDisplay
      // }
    }
    else {
      console.log(`stackStatus didn't have ResourceStatus`, stackStatus)
    }
    if (Object.keys(states).length > 0) {
      stackEvents[stack] = states;
    }
    else {
      stackEvents[stack] = {};
    }
    updateStackEventDisplay(stacksInProgress)
  }
}

// displays the stack events to the user
let eventOutput = {};
let previousEventOutput = {};
const updateStackEventDisplay = function (stacks) {
  let inProgressStacks = Object.keys(stacks).length;
  for (const thisStack in stackStates) {
    const kitId = stacks[thisStack].kitId;
    // output is per kit not per stack
    if (!eventOutput.hasOwnProperty(kitId)) {
      eventOutput[kitId] = {};
    }
    eventOutput[kitId][thisStack] = "";
    previousEventOutput[kitId] = document.getElementById(`${kitId}-cf-stack-states`).innerHTML;
  }
  for (const thisStack in stackStates) {
    const kitId = stacks[thisStack].kitId;

    let region = document.getElementById('region-select').value;
    const console_link = ` <a onclick="openConsole('https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${stackStates[thisStack].StackId}')">View in Console</a><br>`;

    if (Object.keys(stackStates).length === 0) {
      eventOutput[kitId][thisStack] += bouncyBox;
    }
    let pcComplete = 50;
    let resourceTotal = Number(stacks[thisStack].resourceCount);
    let resourceComplete = Object.keys(stackEvents[thisStack]).length;
    if (resourceComplete > resourceTotal) {
      resourceTotal = resourceComplete;
    }
    if (resourceTotal > 0 && resourceComplete > -1) {
      pcComplete = (resourceComplete / resourceTotal) * 100;
    }

    eventOutput[kitId][thisStack] += `<b>` + thisStack + "</b>: ";
    /*
    * NB stackStates only contains the status of the stack itself.
    * 
    * here we are checking if there has been a status _change_
    * eg, if it's moved from in progress to completed states
    * and we need to do something as a consequence
    */

    if (lastReportedStates[thisStack] !== stackStates[thisStack].ResourceStatus) {
      phoneHome({ csk_id: window.resellerConfig.csk_id, kit_id: kitId, stack_status: stackStates[thisStack].ResourceStatus, stack_name: thisStack, details: stackStates[thisStack] });
      // handles CREATE and UPDATE
      eventOutput[kitId][thisStack] += labelStatus(stackStates[thisStack].ResourceStatus);
      eventOutput[kitId][thisStack] += console_link;
      if (evaluateStatus(stackStates[thisStack].ResourceStatus) === TASK_STATES.COMPLETE) {
        console.log(` **** marking ${thisStack} complete from updateStackEventDisplay *** `)
        registerProgress(kitId, 100);
        dispatchEvent(new CustomEvent(TASK_EVENTS.DEPLOYMENT_COMPLETE, { detail: thisStack }));
        dispatchEvent(new Event('POST_STACK_UPDATE'));
        window.handleCompletedStack(thisStack)
        unlockInstallButton(kitId);
        inProgressStacks = --inProgressStacks;
      }
      else if (evaluateStatus(stackStates[thisStack].ResourceStatus) === TASK_STATES.FAILED) {
        console.log(` **** marking ${thisStack} FAILED from updateStackEventDisplay *** `)
        registerProgress(kitId, 1);
        dispatchEvent(new CustomEvent(TASK_EVENTS.DEPLOYMENT_FAILED, { detail: thisStack }));
        window.handleFailedStack(thisStack);
        unlockInstallButton(kitId);
        inProgressStacks = --inProgressStacks;
      }
      else if (evaluateStatus(stackStates[thisStack].ResourceStatus) === TASK_STATES.FAILED_NEEDS_DELETION) {
        console.log(` **** marking ${thisStack} FAILED/ROLLED BACK from updateStackEventDisplay *** `)
        registerProgress(kitId, 100);
        dispatchEvent(new CustomEvent(TASK_EVENTS.DEPLOYMENT_FAILED, { detail: thisStack }));
        window.handleFailedStack(thisStack)
        unlockInstallButton(kitId);
        inProgressStacks = --inProgressStacks;
      }
      else if (evaluateStatus(stackStates[thisStack].ResourceStatus) === TASK_STATES.DELETED) {
        registerProgress(kitId, 1);
        dispatchEvent(new CustomEvent(TASK_EVENTS.DEPLOYMENT_FAILED, { detail: thisStack }));
        window.handleFailedStack(thisStack)
        unlockInstallButton(kitId);
        inProgressStacks = --inProgressStacks;
      }
      else {
        console.log(`${thisStack} state is ${stackStates[thisStack].ResourceStatus}`);
        registerProgress(kitId, pcComplete);
        window.keepWatchingStack(thisStack);
      }
      lastReportedStates[thisStack] = stackStates[thisStack].ResourceStatus;
    }
    else {
      /*
      * if the status hasn't changed we still need to register this stack's status
      */
      if (evaluateStatus(stackStates[thisStack].ResourceStatus) === TASK_STATES.COMPLETE) {
        inProgressStacks = --inProgressStacks;
        registerProgress(kitId, 100);
      }
      else if (evaluateStatus(stackStates[thisStack].ResourceStatus) === TASK_STATES.DELETED) {
        inProgressStacks = --inProgressStacks;
        registerProgress(kitId, 100);
      }
      else if (evaluateStatus(stackStates[thisStack].ResourceStatus) === TASK_STATES.FAILED) {
        inProgressStacks = --inProgressStacks;
        registerProgress(kitId, 1);
      }
      else if (evaluateStatus(stackStates[thisStack].ResourceStatus) === TASK_STATES.FAILED_NEEDS_DELETION) {
        inProgressStacks = --inProgressStacks;
        registerProgress(kitId, 1);
      }
      else {
        // it's still in progress
        registerProgress(kitId, pcComplete);
      }
      eventOutput[kitId][thisStack] += labelStatus(stackStates[thisStack].ResourceStatus);
      eventOutput[kitId][thisStack] += console_link;
    }

    /*
    * stackEvents contains the status of the stack's resources.
    * here, we print them out to the UI
    */
    let resourceOutput = "";
    let vpcCreated = false;
    let resourceLink = `<a onclick="openConsole('https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/resources?stackId=${stackStates[thisStack].StackId}')">`
    if (Object.keys(stackEvents[thisStack]).length > 0) {
      for (const resourceId in stackEvents[thisStack]) {
        let shortenedResourceId = resourceId.replace(thisStack.replace(/-stack/, '').replace(/-/g, ''), '')
        resourceOutput += `├─ <b>${stackEvents[thisStack][resourceId].ResourceType}</b> ${resourceLink}<div class="inline-truncated">${shortenedResourceId}</div></a> ${labelStatus(stackEvents[thisStack][resourceId].ResourceStatus)}<br>`;
        if (stackEvents[thisStack][resourceId].ResourceType === 'AWS::EC2::VPC') {
          vpcCreated = true;
        }
      }
    }
    else {
      resourceOutput += `├─ No resources found`
    }
    eventOutput[kitId][thisStack] += resourceOutput;

  }
  //concatenate the stack info
  let kitOutputs = {};
  for (const thisStack in stackStates) {
    const kitId = stacks[thisStack].kitId;
    if (!kitOutputs.hasOwnProperty(kitId)) {
      kitOutputs[kitId] = "";
    }
    kitOutputs[kitId] += eventOutput[kitId][thisStack];
  }

  // set the content to the new content if it's changed
  for (const kitId in kitOutputs) {
    if (previousEventOutput[kitId] !== kitOutputs[kitId]) {
      // document.getElementById(`${kitId}-cf-stack-states`).innerHTML = kitOutputs[kitId];
      appendHtmlToNode(document.getElementById(`${kitId}-cf-stack-states`), kitOutputs[kitId]);
    }
  }

  if (inProgressStacks <= 0) {
    console.info("ALL STACKS DONE");
    inProgressStacks = 0;
  }
  else {
    console.info(`${inProgressStacks} stacks left to complete`);
  }
}

function unlockInstallButton(kitId) {
  console.trace('unlocking install button');
  document.getElementById(`${kitId}-install-button`).disabled = false;
}

// requests the cfn outputs
const requestStackInfo = function (stack) {
  console.log("Getting outputs for " + stack);
  window.getStackInfo(stack, outputsResponseHandler)
}

// callback for the outputs retrieval function
const outputsResponseHandler = function (stack, outputs) {
  // console.log("outputsResponseHandler for " + stack + ": " + JSON.stringify(outputs))
  if (outputs.hasOwnProperty("Stacks") && outputs.Stacks[0].Outputs.length > 0) {
    //we have the outputs so kill off the requestor
    clearInterval(stackInfoRequestors[outputs.Stacks[0].StackName]);
    stackOutputs[outputs.Stacks[0].StackName] = outputs.Stacks[0].Outputs;
    showCfnOutputs(outputs.Stacks[0].StackName);
  }
}

// display all the CFN outputs
let htmlCfnOutputs = {};
const showCfnOutputs = function (stack) {
  let stacks = window.getStacksInProgress();
  const kitId = stacks[stack].kitId;
  let cfOutDiv = document.getElementById(`${kitId}-cf-stack-outputs`);
  for (let stk in stackOutputs) {
    if (!htmlCfnOutputs.hasOwnProperty(kitId)) {
      htmlCfnOutputs[kitId] = "";
    }
    htmlCfnOutputs[kitId] += "<b>" + stk + ":</b><br/>";
    for (let i = 0; i < stackOutputs[stk].length; i++) {
      htmlCfnOutputs[kitId] += "<b>" + stackOutputs[stk][i].OutputKey + "</b>: " + stackOutputs[stk][i].OutputValue + "<br>";
    }
  }
  // cfOutDiv.innerHTML = htmlCfnOutputs[kitId];
  appendHtmlToNode(cfOutDiv, htmlCfnOutputs[kitId]);
}

// handles the response from the request to deploy the stack
const deployResponseHandler = function (failure, success, stackName) {
  console.log("callback from deploy request", stackName, success, failure)
  let stacks = window.getStacksInProgress();
  if (failure) {
    if (failure.toString().match(/Stack \[([A-Za-z0-9-]+)\] already exists/)) {
      stackName = failure.toString().match(/Stack \[([A-Za-z0-9-]+)\] already exists/)[1];
      stopMonitoring();
      registerProgress(stacks[stackName].kitId, 1, failure.toString());
      unlockInstallButton(stacks[stackName].kitId);
    }
    else {
      stopMonitoring();
      registerProgress(stacks[stackName].kitId, 1, failure.toString());
    }
  }

  const checker = setInterval(() => {
    if (regionControlsCanBeUnlocked()) {
      lockRegionControls(false);
      clearInterval(checker);
    }
  }, 3000);
  if (!stackName) {
    if (success && success.hasOwnProperty("StackId")) {
      stackName = success.StackId.split('/')[1];
    }
    else if (failure && failure.hasOwnProperty("StackId")) {
      stackName = failure.StackId.split('/')[1];
    }
    else if (failure && failure.toString().match(/Stack \[([A-Za-z0-9-]+)\] already exists/)) {
      stackName = failure.toString().match(/Stack \[([A-Za-z0-9-]+)\] already exists/)[1];
    }
    else {
      stackName = "Unknown";
    }
  }

  if (failure && stackName !== "Unknown") {
    if (typeof failure === 'object') {
      failure = failure.toString();
    }
    if (failure.match(/credentials/i)) {
      //got logged out
      displayCredentialErrors(true, failure);
      resetUi();
      registerProgress(stacks[stackName].kitId, 1, failure);
      window.handleFailedStack(stackName)
    }
    else {
      debugMessages[stackName] = failure;
      phoneHome({ csk_id: window.resellerConfig.csk_id, kit_id: stacks[stackName].kitId, stack_status: "failed", stack_name: stackName, details: failure });
      registerProgress(stacks[stackName].kitId, 1, failure);
      window.handleFailedStack(stackName)
    }
  }
  else if (failure && stackName === "Unknown") {
    console.error("Failure with no stack name");
  }
  else if (success) {
    debugMessages[stackName] = success;
    addToTaskQueue(new Task(Task.TYPES.KIT_DEPLOYMENT, stackName));
    lockRegionControls(true);
    if (success.hasOwnProperty("Location")) {
      registerProgress(stacks[stackName].kitId, 1, "Kit uploaded successfully, starting deployment pipeline...");
      debugMessages[stackName] = `Deploying via pipeline: <a onclick="openConsole('https://${region}.console.aws.amazon.com/codesuite/codepipeline/pipelines')">View in Console</a>`;
    }
    else if (success.hasOwnProperty("pipelineExecutionId")) {
      registerProgress(stacks[stackName].kitId, 1, "Kit uploaded successfully, starting pipeline...please wait");
      let pipelineName = getValueInNamespace(`${account}-${region}`, 'PipelineName');
      let url = `https://${region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipelineName}/executions/${success["pipelineExecutionId"]}/visualization?region=${region}`
      debugMessages[stackName] = `Deploying via pipeline: <a onclick="openConsole('${url}')">View in Console</a>`;
      monitorPipeline(stacks[stackName].kitId, stackName, success["pipelineExecutionId"], pipelineName);
    }
    else if (success.hasOwnProperty("noOp") && success.noOp === true) {
      console.log(` **** marking ${stackName} complete from deployResponseHandler *** `, success);
      phoneHome({ csk_id: window.resellerConfig.csk_id, kit_id: stacks[stackName].kitId, stack_status: "success", stack_name: stackName, details: success });
      registerProgress(stacks[stackName].kitId, 100, `${stackName} already deployed`);
      window.handleCompletedStack(stackName)
    }
  }
  let kitResponses = {};
  for (let stack in debugMessages) {
    const kitId = stacks[stack].kitId;
    if (!kitResponses.hasOwnProperty(kitId)) {
      kitResponses[kitId] = {}
    }
  }
  for (let stack in debugMessages) {
    const kitId = stacks[stack].kitId;
    kitResponses[kitId][stack] = "";
    if (typeof debugMessages[stack] === 'object') {
      kitResponses[kitId][stack] += `<b>${stack}</b>: ` + JSON.stringify(debugMessages[stack], null, 4) + "<br>";
    }
    else if (success) {
      kitResponses[kitId][stack] += `<b>${stack}</b>:  <span class="success">` + debugMessages[stack] + "</span><br>";
    }
    else {
      kitResponses[kitId][stack] += `<b>${stack}</b>:  <span class="error">` + debugMessages[stack] + "</span><br>";
    }
  }
  //concatenate the stack info
  let cfnResponseOutputs = {};
  for (const kitId in kitResponses) {
    cfnResponseOutputs[kitId] = "";
    for (const stack in kitResponses[kitId]) {
      cfnResponseOutputs[kitId] += kitResponses[kitId][stack];
    }
    // document.getElementById(`${kitId}-deploystack-output`).innerHTML = cfnResponseOutputs[kitId];
    appendHtmlToNode(document.getElementById(`${kitId}-deploystack-output`), cfnResponseOutputs[kitId]);
  }
}

function monitorPipeline(kitId, stackName, execId, pipelineName) {
  const checker = setInterval(() => {
    window.getPipelineStatus(execId, (err, data) => {
      console.log(err);
      console.log(data);
      if (data.hasOwnProperty("pipelineExecution") && data.pipelineExecution.hasOwnProperty("status")) {
        let url = `https://${region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipelineName}/executions/${execId}/visualization?region=${region}`;
        let output = `<span class="success"><b>Pipeline Status:</b> ${labelStatus(data.pipelineExecution.status).replace(/([a-z0-9])([A-Z])/g, '$1 $2')}&nbsp;&nbsp;&nbsp;<a onclick="openConsole('${url}')">View in Console</a></span><br>`;
        appendHtmlToNode(document.getElementById(`${kitId}-deploystack-output`), output);
        if (data.pipelineExecution.status === "Succeeded") {
          clearInterval(checker);
          registerProgress(kitId, 100, `${stackName} deployed successfully`);
          window.handleCompletedStack(stackName)
        }
        else if (data.pipelineExecution.status === "Failed") {
          clearInterval(checker);
          registerProgress(kitId, 1, `Failed to deploy ${stackName} - check the console for more information`);
          window.handleFailedStack(stackName)
        }
        else {
          updateProgressBarMessage(kitId, `${stackName} deployment: ${data.pipelineExecution.status.replace(/([a-z0-9])([A-Z])/g, '$1 $2')}`)
        }
      }
    });
  }, 5000);
}

function resetAllKitMonitors() {
  console.trace('resetting all kit monitors')
  for (const kitId in kitMetadata) {
    try {
      registerProgress(kitId, 1);
      appendHtmlToNode(document.getElementById(`${kitId}-deploystack-output`), "");
      appendHtmlToNode(document.getElementById(`${kitId}-cf-stack-states`), "");
      appendHtmlToNode(document.getElementById(`${kitId}-cf-stack-outputs`), "");
      document.getElementById(`${kitId}-install-button`).disabled = false;
      document.getElementById(`${kitId}-deployment-progress`).style.display = "none";
      document.getElementById(`${kitId}-deployment-details`).style.display = "none";
      hideConfigForKit(kitId);
    }
    catch (e) {
      console.error(e);
    }
  }
}

function registerProgress(kitId, value, message = "") {
  progressBars[kitId][1].style.width = `${Math.floor(value)}%`;
  progressBars[kitId][0].textContent = `${Math.floor(value)}%`;
  if (value === 1 || value === 100) {
    if (message) {
      updateProgressBarMessage(kitId, message);
    }
    progressBars[kitId][1].style['animation-play-state'] = "paused";
    progressBars[kitId][0].textContent = "";
  }
  else {
    progressBars[kitId][1].style['animation-play-state'] = "running";
  }
}

function updateProgressBarMessage(kitId, message) {
  if (message) {
    progressBars[kitId][2].textContent = message;
  }
}

function startMonitoring() {
  console.log(`monitoring starting in ${preMonitoringDelay}s`);
  setTimeout(() => { cfMonitor = setInterval(showStacksProgressFunc, 3000); }, preMonitoringDelay * 1000)
  setTimeout(monitoringChecker, monitoringTimeout * 1000)
}

function stopMonitoring() {
  console.trace("monitoring STOPPED");
  clearInterval(cfMonitor);
}

function monitoringChecker() {
  const timeNow = new Date().getTime();
  if ((timeNow - mostRecentEventTime) > monitoringTimeout * 1000) {
    displayErrors(`Monitoring timeout reached - ${monitoringTimeout}s has passed with no new events. Check the status of your stacks in the CloudFormation console.`);
    stopMonitoring();
  }
  else {
    setTimeout(monitoringChecker, 3000)
  }
}

function clearStackMonitor(stackName) {
  window.clearTrackedStacks(stackName);
}

function clearStackMonitors() {
  window.clearTrackedStacks();
}

function labelStatus(status) {
  let labelledStatus = "";
  if (evaluateStatus(status) === TASK_STATES.COMPLETE) {
    labelledStatus = `${status}  ✅`;
  }
  else if (evaluateStatus(status) === TASK_STATES.FAILED) {
    labelledStatus = `${status}  ❌`;
  }
  else if (evaluateStatus(status) === TASK_STATES.FAILED_NEEDS_DELETION) {
    labelledStatus = `${status}  ❌`;
  }
  else if (evaluateStatus(status) === TASK_STATES.DELETED) {
    labelledStatus = `${status}  ❌`;
  }
  else if (evaluateStatus(status) === TASK_STATES.DELETE_FAILED) {
    labelledStatus = `${status}  ❌`;
  }
  else {
    labelledStatus = `${status}  ${bouncyBox}`;
  }
  return labelledStatus;
}
