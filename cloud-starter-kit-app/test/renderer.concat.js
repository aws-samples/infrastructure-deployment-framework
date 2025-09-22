

/*
* ###########################################
* ## src/scripts/utilities.js
* ###########################################
*/

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
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
  return btoa(binString);
}

function findNameFromTags(tags) {
  for (let i = 0; i < tags.length; i++) {
    if (tags[i]["Key"] === "Name") {
      return tags[i]["Value"];
    }
  }
  return "";
}

function findSubnetTypeFromTags(tags) {
  for (let i = 0; i < tags.length; i++) {
    if (tags[i]["Key"] === "aws-cdk:subnet-type") {
      return tags[i]["Value"].toLowerCase();
    }
  }
  return "";
}

function guessSubnetType(name) {
  if (name.toLowerCase().includes("isolated")) {
    return "isolated";
  } else if (name.toLowerCase().includes("private")) {
    return "private";
  } else if (name.toLowerCase().includes("public")) {
    return "public";
  }
  return "";
}

const getMyIp = async () => {
  const response = await fetch("https://api.ipify.org/?format=json");
  const json = await response.json();
  console.log(json);
  if (json.hasOwnProperty("ip") && json.ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
    return json.ip;
  } else {
    return "";
  }
};

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
    "me-south-1": "BH: Bahrain",
    "mx-central-1": "MX: Mexico",
    "ap-southeast-7": "TH: Thailand",
    "ap-southeast-6": "NZ: Auckland",
  };
  return codes.hasOwnProperty(code) ? codes[code] : code;
}


/*
* ###########################################
* ## src/scripts/task-queue.js
* ###########################################
*/

// job queue, tracks until complete state but not longer than that
let taskQueue = [];
const TASK_TYPES = {
  KIT_DEPLOYMENT: "kit-deployment",
  REGIONAL_PIPELINE_BUILD: "regional-pipeline-build",
  REGIONAL_DATA_LOADING: "regional-data-load",
  CREATE_KEY: "create-key-pair",
  OTHER: "other",
};
const TASK_STATES = {
  WAITING: "waiting",
  STARTED: "started",
  IN_PROGRESS: "in-progress",
  COMPLETE: "complete",
  FAILED: "failed",
  FAILED_NEEDS_DELETION: "failed-needs-deletion",
  DELETED: "deleted",
  DELETE_FAILED: "delete-failed",
};
const TASK_EVENTS = {
  LOADING_COMPLETE: "LOADING_COMPLETE",
  KEY_READY: "KEY_READY",
  DEPLOYMENT_COMPLETE: "DEPLOYMENT_COMPLETE",
  DEPLOYMENT_FAILED: "DEPLOYMENT_FAILED",
};
class Task {
  constructor(type, name) {
    this.type = type;
    this.name = name;
    this.state = TASK_STATES.WAITING;
    this.lastCheck = null;
  }
}
Object.defineProperty(Task, "TYPES", {
  value: TASK_TYPES,
  writable: false, // makes the property read-only
});
Object.defineProperty(Task, "STATES", {
  value: TASK_STATES,
  writable: false,
});
Object.defineProperty(Task, "EVENTS", {
  value: TASK_EVENTS,
  writable: false,
});

function evaluateStatus(stackStatus) {
  if (stackStatus.match(/(ATE_COMPLETE|UPDATE_ROLLBACK_COMPLETE|Succeeded)$/)) {
    return TASK_STATES.COMPLETE;
  } else if (stackStatus.match(/^(CREATE_FAILED|ROLLBACK_COMPLETE|ROLLBACK_FAILED|UPDATE_ROLLBACK_FAILED|Failed)/)) {
    return TASK_STATES.FAILED_NEEDS_DELETION;
  } else if (stackStatus.match(/DELETE_FAILED/)) {
    return TASK_STATES.FAILED;
  } else if (stackStatus.match(/DELETE_COMPLETE/)) {
    return TASK_STATES.DELETED;
  } else if (stackStatus.match(/(_IN_PROGRESS|InProgress)/)) {
    return TASK_STATES.IN_PROGRESS;
  } else {
    return TASK_STATES.FAILED;
  }
}

addEventListener("LOADING_COMPLETE", checkTasks);
addEventListener("KEY_READY", checkTasks);
addEventListener("DEPLOYMENT_COMPLETE", checkTasks);
addEventListener("DEPLOYMENT_FAILED", checkTasks);

function addToTaskQueue(task) {
  if (task instanceof Task) {
    let isDuplicate = false;
    for (let i = 0; i < taskQueue.length; i++) {
      if (taskQueue[i].type === task.type && taskQueue[i].name === task.name) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      taskQueue.push(task);
      console.log(`${task.name} added to the task queue`);
    }
  }
}

function checkTasks(event) {
  console.log(event);
  if (taskQueue.length > 0) {
    console.log(`Checking ${taskQueue.length} tasks`, event);
    for (let i = 0; i < taskQueue.length; i++) {
      switch (taskQueue[i].type) {
        case TASK_TYPES.KIT_DEPLOYMENT:
          //test to see if done
          if (event.type === TASK_EVENTS.DEPLOYMENT_COMPLETE) {
            checkStackComplete(event.detail, taskQueue, i);
          }
          break;
        case TASK_TYPES.REGIONAL_PIPELINE_BUILD:
          //test to see if done
          if (event.type === TASK_EVENTS.DEPLOYMENT_COMPLETE) {
            checkStackComplete("csk-cdk-app-delivery-pipeline-stack", taskQueue, i);
          } else if (event.type === TASK_EVENTS.DEPLOYMENT_FAILED) {
            taskQueue[i].state = TASK_STATES.FAILED;
          }
          break;
        case TASK_TYPES.REGIONAL_DATA_LOADING:
          //test to see if done
          if (event.type === TASK_EVENTS.LOADING_COMPLETE) {
            taskQueue[i].state = TASK_STATES.COMPLETE;
          } else {
            taskQueue[i].state = TASK_STATES.IN_PROGRESS;
            taskQueue[i].lastCheck = new Date();
          }
          break;
        case TASK_TYPES.CREATE_KEY:
          //test to see if done
          if (event.type === TASK_EVENTS.KEY_READY) {
            taskQueue[i].state = TASK_STATES.COMPLETE;
          } else {
            taskQueue[i].state = TASK_STATES.IN_PROGRESS;
            taskQueue[i].lastCheck = new Date();
          }
          break;
        default:
          break;
      }
    }
    removeCompletedTasks();
  } else {
    console.log("No tasks in queue");
  }
}

function checkTasksFromStackList() {
  for (let i = 0; i < taskQueue.length; i++) {
    if (taskQueue[i].type === TASK_TYPES.KIT_DEPLOYMENT) {
      checkStackComplete(taskQueue[i].name, taskQueue, i + 0);
    } else if (taskQueue[i].type === TASK_TYPES.REGIONAL_PIPELINE_BUILD) {
      checkStackComplete("csk-cdk-app-delivery-pipeline-stack", taskQueue, i + 0);
    }
  }
}

function checkStackComplete(stackName, taskQ, taskIndex) {
  console.log("checkStackComplete", stackName, taskQ, taskIndex);
  // if (!taskIndex) {
  //   console.log("taskIndex is not set OUTSIDE checkStackComplete", stackName)
  // }
  let ti = taskIndex;
  let callback = function (err, data) {
    console.log(`inside callback ${taskIndex} = ${ti}`);
    if (ti === "undefined") {
      console.log(`${ti} is not set inside checkStackComplete`, data);
    }
    if (err) {
      if (!err.message.match("does not exist")) {
        console.error(JSON.stringify(err));
        taskQ[ti].state = TASK_STATES.FAILED;
      } else {
        taskQ[ti].state = TASK_STATES.WAITING;
        taskQ[ti].lastCheck = new Date();
      }
    } else {
      console.log(data);
      taskQ[ti].state = evaluateStatus(data.Stacks[0].StackStatus);
      taskQ[ti].lastCheck = new Date();
      if (taskQ[ti].state === TASK_STATES.COMPLETE) {
        if (data.Stacks[0].Outputs.length > 0 && data.Stacks[0].Outputs[0].ExportName === "CskSourceBucketName") {
          setValueInNamespace(`${account}-${region}`, "SourceBucket", data.Stacks[0].Outputs[0].OutputValue);
        }
      }
    }
  };
  window.getStackStatus(stackName, callback);
}

function removeCompletedTasks() {
  let temp = [];
  for (let i = 0; i < taskQueue.length; i++) {
    if (taskQueue[i].state === TASK_STATES.COMPLETE || taskQueue[i].state === TASK_STATES.DELETED) {
      if (TASK_TYPES.KIT_DEPLOYMENT === taskQueue[i].type) {
        reenableKitButton(taskQueue[i].name);
      }
      console.log(`${taskQueue[i].type} taken out of the task queue with nothing further to do`);
    } else if (taskQueue[i].state === TASK_STATES.FAILED) {
      if (TASK_TYPES.KIT_DEPLOYMENT === taskQueue[i].type) {
        reenableKitButton(taskQueue[i].name);
      }
      console.log(`${taskQueue[i].type} taken out of the task queue because it failed`);
    } else if (taskQueue[i].state === TASK_STATES.FAILED_NEEDS_DELETION) {
      if (TASK_TYPES.KIT_DEPLOYMENT === taskQueue[i].type) {
        reenableKitButton(taskQueue[i].name);
        showDeleteKitButton(taskQueue[i].name);
      }
      console.log(`${taskQueue[i].type} taken out of the task queue - failed and needs deletion`);
    } else {
      temp.push(taskQueue[i]);
    }
  }
  taskQueue = temp;
}

function regionControlsCanBeUnlocked() {
  if (taskQueue.length === 0) {
    return true;
  } else {
    for (let i = 0; i < taskQueue.length; i++) {
      if (taskQueue[i].type === TASK_TYPES.REGIONAL_DATA_LOADING && taskQueue[i].state !== TASK_STATES.COMPLETE) {
        return false;
      } else if (taskQueue[i].type === TASK_TYPES.REGIONAL_PIPELINE_BUILD && taskQueue[i].state !== TASK_STATES.COMPLETE) {
        return false;
      } else if (taskQueue[i].type === TASK_TYPES.KIT_DEPLOYMENT && taskQueue[i].state !== TASK_STATES.COMPLETE) {
        return false;
      }
    }
    return true;
  }
}

function showTaskQueueLength() {
  if (taskQueue.length > 0) {
    console.log(`Tasks in queue: ${taskQueue.length}`, taskQueue);
    lockRegionControls(true);
  } else {
    lockRegionControls(false);
  }
  document.getElementById("tasks-display").innerText = `${taskQueue.length > 0 ? taskQueue.length : "No"} task${taskQueue.length > 1 ? "s" : ""} running`;
}

setInterval(checkTasksFromStackList, 5000);
setInterval(removeCompletedTasks, 5000);
setInterval(showTaskQueueLength, 1000);


/*
* ###########################################
* ## src/scripts/stack-monitoring.js
* ###########################################
*/

// the little bouncing box
const bouncyBox = `<span class="la-square-jelly-box la-dark la-sm" style="margin-left: 3px; margin-right: 10px; margin-bottom: -1px; display: inline-block; color: black; height: 12px; width: 12px;"><div></div><div></div></span>`;
// delay before we start monitoring, to give app time to upload the template etc
const preMonitoringDelay = 1;
// monitoring timeout - stop monitoring for events after this many seconds elapses with no events
const monitoringTimeout = 1800;
// cfMonitor is the setTimeout instance that triggers the monitoring actions
let cfMonitor = null;
let longCfMonitor = null;
// stackStates tracks the state of each stack, keyed on stack name
let stackStates = {};
// lastReportedStates tracks the last reported state of each stack, keyed on stack name
let lastReportedStates = {};
// stackEvents tracks the state of resource events, keyed on stack name
let stackEvents = {};
// stackInfoRequestors tracks the setInterval instance that requests stack outputs, keyed on stack name
let stackInfoRequestors = {};
// stackOutputs hold the outputs the stack generates, if any
let stackOutputs = {};
// any messages from the deploy stack command that need to be shown to the user
let debugMessages = {};
// the time of the last received event
let mostRecentEventTime = null;

let allStacks = {};

function listAllStacks() {
  window.listStacks((err, stacks) => {
    if (err) {
      console.error(err);
    } else {
      console.log(stacks);
      allStacks = {};
      for (let i = 0; i < stacks.Stacks.length; i++) {
        allStacks[stacks.Stacks[i].StackId] = stacks.Stacks[i];
      }
      let parentNode = document.getElementById("deployed-stacks");
      parentNode.innerText = "";
      let stackDiv = document.createElement("div");
      stackDiv.classList.add("scrollable");
      let pageHeading = document.createElement("h1");
      pageHeading.classList = ["installed-kits-heading"];
      pageHeading.innerText = "Installed Kits";
      let pageInfo = document.createElement("p");
      pageInfo.innerText = "This is a listing of the kits that have been deployed as CloudFormation stacks into this account.";
      stackDiv.appendChild(pageHeading);
      stackDiv.appendChild(pageInfo);
      for (const stack in allStacks) {
        if (allStacks[stack].StackName.match(/sendStatisticsStack/)) {
          continue;
        }
        if (allStacks[stack].hasOwnProperty("RootId") && allStacks[stack].RootId.match(/\w/)) {
          console.log("not showing nexted stack");
          continue;
        }
        let stackTags = allStacks[stack].Tags;
        let tags = {};
        for (let i = 0; i < stackTags.length; i++) {
          tags[stackTags[i].Key] = stackTags[i].Value;
        }
        if (tags.hasOwnProperty("KitId") || allStacks[stack].StackName === "CDKToolkit") {
          // it's a kit stack
          let name = allStacks[stack].StackName;
          let kit = getFromKitMetadata(tags["KitId"]);
          if (kit) {
            //we found the kit
            name = kit.Name;
          }
          let stackName = document.createElement("h5");
          stackName.classList.add("sub-heading");
          stackName.innerText = name;
          let stackStatus = document.createElement("p");
          appendHtmlToNode(stackStatus, `<b>Status:</b> ${labelStatus(allStacks[stack].StackStatus)}`);
          let stackDesc = document.createElement("p");
          stackDesc.innerText = allStacks[stack].Description ? allStacks[stack].Description : "No description available";
          let stackLinks = document.createElement("p");
          let stackInputsLink = document.createElement("a");
          stackInputsLink.innerText = "⬆️ Inputs";
          stackInputsLink.classList = ["stack-info"];
          stackInputsLink.setAttribute("onclick", `showInputs("${allStacks[stack].StackId}")`);
          let stackOutputsLink = document.createElement("a");
          stackOutputsLink.innerText = "⬇️ Outputs";
          stackOutputsLink.classList = ["stack-info"];
          stackOutputsLink.setAttribute("onclick", `showOutputs("${allStacks[stack].StackId}")`);
          let stackConsoleLink = document.createElement("a");
          stackConsoleLink.innerText = "👀 View in Console";
          stackConsoleLink.classList = ["stack-info"];
          stackConsoleLink.setAttribute("onclick", `goToConsole("${allStacks[stack].StackId}")`);
          let stackMetadata = document.createElement("div");
          stackMetadata.id = `${allStacks[stack].StackId}-metadata`;
          stackMetadata.classList.add("deployed-kit-metadata");
          stackLinks.appendChild(stackInputsLink);
          stackLinks.appendChild(stackOutputsLink);
          if (evaluateStatus(allStacks[stack].StackStatus) === TASK_STATES.FAILED_NEEDS_DELETION) {
            let stackDeleteLink = document.createElement("a");
            stackDeleteLink.innerText = "🗑️ Delete";
            stackDeleteLink.classList = ["stack-info"];
            stackDeleteLink.setAttribute("onclick", `confirmDeleteStack("${allStacks[stack].StackId}")`);
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
  });
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
  let localInputs = localInputStore && localInputStore.match(/^\[/) ? JSON.parse(localInputStore) : [];
  let inputDiv = document.createElement("div");
  if (filteredInputs.length === 0 && localInputs.length === 0) {
    let paramDiv = document.createElement("div");
    paramDiv.innerText = `Stack had no inputs.`;
    inputDiv.appendChild(paramDiv);
  } else {
    for (let i = 0; i < filteredInputs.length; i++) {
      let paramDiv = document.createElement("div");
      appendHtmlToNode(paramDiv, `<b>${filteredInputs[i]["ParameterKey"]}</b>: ${filteredInputs[i]["ParameterValue"]}`);
      inputDiv.appendChild(paramDiv);
    }
    for (let i = 0; i < localInputs.length; i++) {
      let paramDiv = document.createElement("div");
      appendHtmlToNode(paramDiv, `<b>${localInputs[i]["ParameterKey"]}</b>: ${localInputs[i]["ParameterValue"]}`);
      inputDiv.appendChild(paramDiv);
    }
  }
  let parentNode = document.getElementById(`${stackId}-metadata`);
  parentNode.innerText = "";
  parentNode.appendChild(inputDiv);
}

function showOutputs(stackId) {
  const stack = allStacks[stackId];
  const outputs = stack.Outputs;
  let outputDiv = document.createElement("div");
  if (outputs.length === 0) {
    let paramDiv = document.createElement("div");
    paramDiv.innerText = `Stack had no outputs.`;
    outputDiv.appendChild(paramDiv);
  } else {
    for (let i = 0; i < outputs.length; i++) {
      let paramDiv = document.createElement("div");
      appendHtmlToNode(paramDiv, `<b>${outputs[i]["OutputKey"]}</b>: ${outputs[i]["OutputValue"]}`);
      outputDiv.appendChild(paramDiv);
    }
  }
  let parentNode = document.getElementById(`${stackId}-metadata`);
  parentNode.innerText = "";
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
  // cfMonitor = null;
  clearInterval(cfMonitor);
  clearInterval(longCfMonitor);
  stackStates = {};
  lastReportedStates = {};
  stackEvents = {};
  stackInfoRequestors = {};
  stackOutputs = {};
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
      } else {
        console.log("not tracking: " + stack);
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
  console.log("stackEventsResponseHandler", stack, stackStatus, states);
  let stacksInProgress = window.getStacksInProgress();
  if (!stackStatus || !stackStatus.hasOwnProperty("Timestamp")) {
    window.getStackInfo(stack, (stackName, outputs) => {
      console.log(outputs);
      if (outputs && outputs.toString().match("does not exist")) {
        console.log("Stack does not exist, yet");
      } else if (stacksInProgress[stack].hasOwnProperty("updateRequested") && stacksInProgress[stack]["updateRequested"]) {
        //this happens in updates
        console.log(`requesting an update to ${stack}`);
      } else if (outputs && outputs.hasOwnProperty("Stacks") && evaluateStatus(outputs.Stacks[0].StackStatus) === TASK_STATES.COMPLETE) {
        window.handleCompletedStack(stackName);
        unlockInstallButton(stacksInProgress[stack].kitId);
        registerProgress(stacksInProgress[stack].kitId, 100, `Kit has already been installed as <b>${stack}</b>.`);
        dispatchEvent(new CustomEvent(TASK_EVENTS.DEPLOYMENT_COMPLETE, { detail: outputs.Stacks[0].StackName }));
        stopMonitoring();
      }
    });
  } else {
    //check most recent event is not older than the monitoring timeout period
    let latestEventTime = new Date(stackStatus.Timestamp).getTime();
    if (!mostRecentEventTime) {
      mostRecentEventTime = latestEventTime;
    }
    if (latestEventTime > mostRecentEventTime) {
      mostRecentEventTime = latestEventTime;
    }
    for (let i = 0; i < states.length; i++) {
      latestEventTime = new Date(states[i].Timestamp).getTime();
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
      if (
        evaluateStatus(stackStatus.ResourceStatus) === TASK_STATES.COMPLETE &&
        stacksInProgress[stack].hasOutputs &&
        !stackInfoRequestors.hasOwnProperty(stack)
      ) {
        stackInfoRequestors[stack] = setInterval(requestStackInfo, 3000, stack);
      }
      // else if (stackStatus.ResourceStatus.match(/(DELETE_COMPLETE|ROLLBACK_COMPLETE)/)) {
      //   // we handle failed stacks in updateStackEventDisplay
      // }
    } else {
      console.log(`stackStatus didn't have ResourceStatus`, stackStatus);
    }
    if (Object.keys(states).length > 0) {
      stackEvents[stack] = states;
    } else {
      stackEvents[stack] = {};
    }
    updateStackEventDisplay(stacksInProgress);
  }
};

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

    let region = document.getElementById("region-select").value;
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
      phoneHome({
        csk_id: window.resellerConfig.csk_id,
        kit_id: kitId,
        stack_status: stackStates[thisStack].ResourceStatus,
        stack_name: thisStack,
        details: stackStates[thisStack],
      });
      // handles CREATE and UPDATE
      eventOutput[kitId][thisStack] += labelStatus(stackStates[thisStack].ResourceStatus);
      eventOutput[kitId][thisStack] += console_link;
      if (evaluateStatus(stackStates[thisStack].ResourceStatus) === TASK_STATES.COMPLETE) {
        console.log(` **** marking ${thisStack} complete from updateStackEventDisplay *** `);
        registerProgress(kitId, 100, "Deployment complete");
        dispatchEvent(new CustomEvent(TASK_EVENTS.DEPLOYMENT_COMPLETE, { detail: thisStack }));
        dispatchEvent(new Event("POST_STACK_UPDATE"));
        window.handleCompletedStack(thisStack);
        unlockInstallButton(kitId);
        inProgressStacks = --inProgressStacks;
      } else if (evaluateStatus(stackStates[thisStack].ResourceStatus) === TASK_STATES.FAILED) {
        console.log(` **** marking ${thisStack} FAILED from updateStackEventDisplay *** `);
        registerProgress(kitId, 1, "Stack is in failed state and may need to be deleted via the console");
        dispatchEvent(new CustomEvent(TASK_EVENTS.DEPLOYMENT_FAILED, { detail: thisStack }));
        window.handleFailedStack(thisStack);
        unlockInstallButton(kitId);
        inProgressStacks = --inProgressStacks;
      } else if (evaluateStatus(stackStates[thisStack].ResourceStatus) === TASK_STATES.FAILED_NEEDS_DELETION) {
        console.log(` **** marking ${thisStack} FAILED/ROLLED BACK from updateStackEventDisplay *** `);
        registerProgress(kitId, 100, "Stack is in failed state and should be deleted via the console");
        dispatchEvent(new CustomEvent(TASK_EVENTS.DEPLOYMENT_FAILED, { detail: thisStack }));
        window.handleFailedStack(thisStack);
        unlockInstallButton(kitId);
        inProgressStacks = --inProgressStacks;
      } else if (evaluateStatus(stackStates[thisStack].ResourceStatus) === TASK_STATES.DELETED) {
        registerProgress(kitId, 1, "Stack has been deleted");
        dispatchEvent(new CustomEvent(TASK_EVENTS.DEPLOYMENT_FAILED, { detail: thisStack }));
        window.handleFailedStack(thisStack);
        unlockInstallButton(kitId);
        inProgressStacks = --inProgressStacks;
      } else {
        console.log(`${thisStack} state is ${stackStates[thisStack].ResourceStatus}`);
        registerProgress(kitId, pcComplete);
        window.keepWatchingStack(thisStack);
      }
      lastReportedStates[thisStack] = stackStates[thisStack].ResourceStatus;
    } else {
      /*
       * if the status hasn't changed we still need to register this stack's status
       */
      if (evaluateStatus(stackStates[thisStack].ResourceStatus) === TASK_STATES.COMPLETE) {
        inProgressStacks = --inProgressStacks;
        registerProgress(kitId, 100);
      } else if (evaluateStatus(stackStates[thisStack].ResourceStatus) === TASK_STATES.DELETED) {
        inProgressStacks = --inProgressStacks;
        registerProgress(kitId, 100);
      } else if (evaluateStatus(stackStates[thisStack].ResourceStatus) === TASK_STATES.FAILED) {
        inProgressStacks = --inProgressStacks;
        registerProgress(kitId, 1);
      } else if (evaluateStatus(stackStates[thisStack].ResourceStatus) === TASK_STATES.FAILED_NEEDS_DELETION) {
        inProgressStacks = --inProgressStacks;
        registerProgress(kitId, 1);
      } else {
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
    let resourceLink = `<a onclick="openConsole('https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/resources?stackId=${stackStates[thisStack].StackId}')">`;
    if (Object.keys(stackEvents[thisStack]).length > 0) {
      for (const resourceId in stackEvents[thisStack]) {
        let shortenedResourceId = resourceId.replace(thisStack.replace(/-stack/, "").replace(/-/g, ""), "");
        resourceOutput += `├─ <b>${
          stackEvents[thisStack][resourceId].ResourceType
        }</b> ${resourceLink}<div class="inline-truncated">${shortenedResourceId}</div></a> ${labelStatus(
          stackEvents[thisStack][resourceId].ResourceStatus
        )}<br>`;
        if (stackEvents[thisStack][resourceId].ResourceType === "AWS::EC2::VPC") {
          vpcCreated = true;
        }
      }
    } else {
      resourceOutput += `├─ No resources found`;
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
  } else {
    console.info(`${inProgressStacks} stacks left to complete`);
  }
};

function unlockInstallButton(kitId) {
  console.log("unlocking install button");
  document.getElementById(`${kitId}-install-button`).disabled = false;
}

// requests the cfn outputs
const requestStackInfo = function (stack) {
  console.log("Getting outputs for " + stack);
  window.getStackInfo(stack, outputsResponseHandler);
};

// callback for the outputs retrieval function
const outputsResponseHandler = function (stack, outputs) {
  // console.log("outputsResponseHandler for " + stack + ": " + JSON.stringify(outputs))
  if (outputs.hasOwnProperty("Stacks") && outputs.Stacks[0].Outputs.length > 0) {
    //we have the outputs so kill off the requestor
    clearInterval(stackInfoRequestors[outputs.Stacks[0].StackName]);
    stackOutputs[outputs.Stacks[0].StackName] = outputs.Stacks[0].Outputs;
    showCfnOutputs(outputs.Stacks[0].StackName);
  }
};

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
};

// handles the response from the request to deploy the stack
const deployResponseHandler = function (failure, success, stackName) {
  console.log("callback from deploy request", stackName, success, failure);
  let stacks = window.getStacksInProgress();
  if (failure) {
    if (failure.toString().match(/Stack \[([A-Za-z0-9-]+)\] already exists/)) {
      stackName = failure.toString().match(/Stack \[([A-Za-z0-9-]+)\] already exists/)[1];
      stopMonitoring();
      registerProgress(stacks[stackName].kitId, 1, failure.toString());
      unlockInstallButton(stacks[stackName].kitId);
    } else {
      stopMonitoring();
      registerProgress(stacks[stackName].kitId, 1, failure.toString());
      unlockInstallButton(stacks[stackName].kitId);
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
      stackName = success.StackId.split("/")[1];
    } else if (failure && failure.hasOwnProperty("StackId")) {
      stackName = failure.StackId.split("/")[1];
    } else if (failure && failure.toString().match(/Stack \[([A-Za-z0-9-]+)\] already exists/)) {
      stackName = failure.toString().match(/Stack \[([A-Za-z0-9-]+)\] already exists/)[1];
    } else {
      stackName = "Unknown";
    }
  }

  if (failure && stackName !== "Unknown") {
    if (typeof failure === "object") {
      failure = failure.toString();
    }
    if (failure.match(/credentials/i)) {
      //got logged out
      displayCredentialErrors(true, failure);
      resetUi();
      registerProgress(stacks[stackName].kitId, 1, failure);
      window.handleFailedStack(stackName);
    } else {
      debugMessages[stackName] = failure;
      phoneHome({ csk_id: window.resellerConfig.csk_id, kit_id: stacks[stackName].kitId, stack_status: "failed", stack_name: stackName, details: failure });
      registerProgress(stacks[stackName].kitId, 1, failure);
      window.handleFailedStack(stackName);
    }
  } else if (failure && stackName === "Unknown") {
    console.error("Failure with no stack name");
  } else if (success) {
    debugMessages[stackName] = success;
    addToTaskQueue(new Task(Task.TYPES.KIT_DEPLOYMENT, stackName));
    lockRegionControls(true);
    registerProgress(stacks[stackName].kitId, 1, "Kit uploaded successfully, starting deployment...please wait");
    if (success.hasOwnProperty("Location")) {
      registerProgress(stacks[stackName].kitId, 1, "Kit uploaded successfully, starting deployment pipeline...");
      debugMessages[
        stackName
      ] = `Deploying via pipeline: <a onclick="openConsole('https://${region}.console.aws.amazon.com/codesuite/codepipeline/pipelines')">View in Console</a>`;
    } else if (success.hasOwnProperty("pipelineExecutionId")) {
      registerProgress(stacks[stackName].kitId, 1, "Kit uploaded successfully, starting pipeline...please wait");
      let pipelineName = getValueInNamespace(`${account}-${region}`, "PipelineName");
      let url = `https://${region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipelineName}/executions/${success["pipelineExecutionId"]}/visualization?region=${region}`;
      debugMessages[stackName] = `Deploying via pipeline: <a onclick="openConsole('${url}')">View in Console</a>`;
      monitorPipeline(stacks[stackName].kitId, stackName, success["pipelineExecutionId"], pipelineName);
    } else if (success.hasOwnProperty("noOp") && success.noOp === true) {
      console.log(` **** marking ${stackName} complete from deployResponseHandler *** `, success);
      phoneHome({ csk_id: window.resellerConfig.csk_id, kit_id: stacks[stackName].kitId, stack_status: "success", stack_name: stackName, details: success });
      registerProgress(stacks[stackName].kitId, 100, `${stackName} already deployed`);
      window.handleCompletedStack(stackName);
    }
  }
  let kitResponses = {};
  for (let stack in debugMessages) {
    const kitId = stacks[stack].kitId;
    if (!kitResponses.hasOwnProperty(kitId)) {
      kitResponses[kitId] = {};
    }
  }
  for (let stack in debugMessages) {
    const kitId = stacks[stack].kitId;
    kitResponses[kitId][stack] = "";
    if (typeof debugMessages[stack] === "object") {
      kitResponses[kitId][stack] += `<b>${stack}</b>: ` + JSON.stringify(debugMessages[stack], null, 4) + "<br>";
    } else if (success) {
      kitResponses[kitId][stack] += `<b>${stack}</b>:  <span class="success">` + debugMessages[stack] + "</span><br>";
    } else {
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
};

function monitorPipeline(kitId, stackName, execId, pipelineName) {
  const checker = setInterval(() => {
    window.getPipelineStatus(execId, (err, data) => {
      console.log(data);
      if (data.hasOwnProperty("pipelineExecution") && data.pipelineExecution.hasOwnProperty("status")) {
        let url = `https://${region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipelineName}/executions/${execId}/visualization?region=${region}`;
        let output = `<span class="success"><b>Pipeline Status:</b> ${labelStatus(data.pipelineExecution.status).replace(
          /([a-z0-9])([A-Z])/g,
          "$1 $2"
        )}&nbsp;&nbsp;&nbsp;<a onclick="openConsole('${url}')">View in Console</a></span><br>`;
        appendHtmlToNode(document.getElementById(`${kitId}-deploystack-output`), output);
        if (data.pipelineExecution.status === "Succeeded") {
          clearInterval(checker);
          unlockInstallButton(kitId);
          registerProgress(kitId, 100, `${stackName} deployed successfully`);
          window.handleCompletedStack(stackName);
        } else if (data.pipelineExecution.status === "Failed" || err) {
          clearInterval(checker);
          unlockInstallButton(kitId);
          registerProgress(kitId, 1, `Failed to deploy ${stackName} - check the console for more information`);
          window.handleFailedStack(stackName);
        } else {
          updateProgressBarMessage(kitId, `${stackName} deployment: ${data.pipelineExecution.status.replace(/([a-z0-9])([A-Z])/g, "$1 $2")}`);
        }
      } else if (err) {
        console.log(err);
        clearInterval(checker);
        unlockInstallButton(kitId);
        registerProgress(kitId, 1, `Pipeline failed - check the console for more information`);
        window.handleFailedStack(stackName);
      }
    });
  }, 5000);
}

function resetAllKitMonitors() {
  console.log("resetting all kit monitors");
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
    } catch (e) {
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
    progressBars[kitId][1].style["animation-play-state"] = "paused";
    progressBars[kitId][0].textContent = "";
  } else {
    progressBars[kitId][1].style["animation-play-state"] = "running";
  }
}

function updateProgressBarMessage(kitId, message) {
  if (message) {
    progressBars[kitId][2].textContent = message;
  }
}

function startMonitoring() {
  console.log(`monitoring starting in ${preMonitoringDelay}s`);
  setTimeout(() => {
    cfMonitor = setInterval(showStacksProgressFunc, 3000);
  }, preMonitoringDelay * 1000);
  longCfMonitor = setTimeout(monitoringChecker, monitoringTimeout * 1000);
}

function stopMonitoring() {
  console.log("monitoring STOPPED");
  clearInterval(cfMonitor);
  clearInterval(longCfMonitor);
}

function monitoringChecker() {
  const timeNow = new Date().getTime();
  if (timeNow - mostRecentEventTime > monitoringTimeout * 1000) {
    displayErrors(
      `Monitoring timeout reached - ${monitoringTimeout}s has passed with no new events. Check the status of your stacks in the CloudFormation console.`
    );
    stopMonitoring();
  } else {
    setTimeout(monitoringChecker, 3000);
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
  } else if (evaluateStatus(status) === TASK_STATES.FAILED) {
    labelledStatus = `${status}  ❌`;
  } else if (evaluateStatus(status) === TASK_STATES.FAILED_NEEDS_DELETION) {
    labelledStatus = `${status}  ❌`;
  } else if (evaluateStatus(status) === TASK_STATES.DELETED) {
    labelledStatus = `${status}  ❌`;
  } else if (evaluateStatus(status) === TASK_STATES.DELETE_FAILED) {
    labelledStatus = `${status}  ❌`;
  } else {
    labelledStatus = `${status}  ${bouncyBox}`;
  }
  return labelledStatus;
}


/*
* ###########################################
* ## src/scripts/deployments.js
* ###########################################
*/

//get the values the user has set in the UI
let excludedAttributes = ["id", "name", "value", "type", "value", "multiple", "style", "class", "min", "max", "required", "pattern", "onchange"];
function getFormInputs(kitId) {
  let inputs = [];
  let paramObjects = templateParameterObjects[kitId];
  let params = templateParameters.hasOwnProperty(kitId) ? templateParameters[kitId] : [];
  let extraParams = {};

  for (let i = 0; i < params.length; i++) {
    if (paramObjects.hasOwnProperty(params[i]) && paramObjects[params[i]].hasOwnProperty("Alias")) {
      continue;
    }
    let askingForList = false;
    if (paramObjects[params[i]].hasOwnProperty("Type") && paramObjects[params[i]]["Type"].match("^List<")) {
      askingForList = true;
    }
    let elemId = `${kitId}|${params[i]}`;
    let param = document.getElementById(elemId);
    // amazonq-ignore-next-line
    console.log(param);
    let parameterValue = askingForList ? [param.value] : param.value;
    if (param.tagName.match(/^textarea$/i)) {
      // amazonq-ignore-next-line
      console.log(parameterValue);
      // amazonq-ignore-next-line
      console.log(parameterValue.split("\n"));
      parameterValue = bytesToBase64(new TextEncoder().encode(parameterValue));
    }
    if (param.tagName.match(/^input$/i) && param.getAttribute("type") === "checkbox") {
      parameterValue = askingForList ? [param.checked] : param.checked;
    }
    if (param.tagName.match(/^select$/i)) {
      // if (param.selectedIndex > -1) {
      //only look if there is a selected option or options
      const selectedOptions = Array.from(param.options).filter((option) => option.selected);

      parameterValue = [];

      selectedOptions.forEach((selectedOption) => {
        // amazonq-ignore-next-line
        console.log(selectedOption.value); // Log the value of each selected option
        parameterValue.push(selectedOption.value);
        if (selectedOption.hasAttributes()) {
          for (const attr of selectedOption.attributes) {
            if (excludedAttributes.indexOf(attr.name) < 0) {
              extraParams[`${params[i]}-${attr.name}`] = attr.value;
            }
          }
        }
      });
      if (param.hasAttributes() && param.attributes.hasOwnProperty("multiple")) {
        parameterValue = parameterValue ? parameterValue : [];
      } else {
        parameterValue = askingForList ? parameterValue : parameterValue[0];
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
      UsePreviousValue: false,
    };
    inputs.push(parameterObject);
  }
  // convert any aliases into parameters and delete the synthetic parameter
  for (let i = 0; i < params.length; i++) {
    if (paramObjects.hasOwnProperty(params[i]) && paramObjects[params[i]].hasOwnProperty("Alias")) {
      for (let key in extraParams) {
        if (key === paramObjects[params[i]].Alias) {
          let parameterObject = {
            ParameterKey: params[i],
            ParameterValue: extraParams[paramObjects[params[i]].Alias],
            ResolvedValue: extraParams[paramObjects[params[i]].Alias],
            UsePreviousValue: false,
          };
          inputs.push(parameterObject);
          delete extraParams[paramObjects[params[i]].Alias];
        }
      }
    }
  }
  // pass any remaining synthetic parameters
  for (let key in extraParams) {
    let parameterObject = {
      ParameterKey: key,
      ParameterValue: extraParams[key],
      ResolvedValue: extraParams[key],
      UsePreviousValue: false,
    };
    inputs.push(parameterObject);
  }

  return inputs;
}
//deploy an CFN template-based kit
async function deployCfnTemplate(kitId, templateIndex = 0, updateConfirmed = false) {
  if (!window.loggedIn) {
    return;
  }
  const kitObject = kitMetadata[kitId];
  const templates = kitObject.Templates;
  let inputs = getFormInputs(kitId);
  let derivedStacknames = [];
  let stacksWithParams = [];
  // console.log(inputs);
  for (let i = 0; i < templates.length; i++) {
    let thisStacksParams = [];
    let templateJson = await window.getFileFromFileHost(`kits/cfn-templates/${templates[i]}`);
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
    let stackName = window.deriveCfnStackName(templates[i], thisStacksParams, stackNamingParam);
    derivedStacknames.push(stackName);
    stacksWithParams[i] = [stackName, thisStacksParams, templateJson];
  }
  let stacksBeingUpdated = stacksToBeUpdated(derivedStacknames);
  if (kitMetadata[kitId].AllowUpdates && stacksBeingUpdated.length > 0 && !updateConfirmed) {
    showConfirmationModal(
      true,
      "Are you sure?",
      `You are going to update the stack${stacksBeingUpdated.length > 1 ? "s" : ""} <b>${stacksBeingUpdated.join(
        " and "
      )}</b>. <p>Click Confirm to continue or Cancel.</p>`,
      deployCfnTemplate,
      cancelInstall,
      [kitId, templateIndex, true]
    );
  } else if (!kitMetadata[kitId].AllowUpdates && stacksBeingUpdated.length > 0 && !updateConfirmed) {
    showConfirmationModal(
      true,
      "Unsupported Stack Update",
      `If you proceed we will attempt to update the stack${stacksBeingUpdated.length > 1 ? "s" : ""} <b>${stacksBeingUpdated.join(
        " and "
      )}</b>. This may fail. <p>Click Confirm to continue or Cancel.</p>`,
      deployCfnTemplate,
      cancelInstall,
      [kitId, templateIndex, true]
    );
  } else {
    for (let i = 0; i < templates.length; i++) {
      let stackName = stacksWithParams[i][0];
      let thisStacksParams = stacksWithParams[i][1];
      let templateJson = stacksWithParams[i][2];
      if (templateIndex === i) {
        let bucketName = getValueInNamespace(`${account}-${region}`, "SourceBucket");
        if (JSON.stringify(templateJson).length > 51999) {
          if (bucketName !== "") {
            startMonitoring();
            phoneHome({
              action: "deploy-cfn-kit",
              kit_id: kitId,
              starter_kit: templates[i],
              details: thisStacksParams,
            });
            window.deployCloudFormationTemplate(
              kitId,
              templates[i],
              stackName,
              thisStacksParams,
              bucketName,
              kitObject,
              deployResponseHandler,
              updateConfirmed
            );
          } else {
            console.log("no bucket available, so not deploying");
          }
        } else {
          startMonitoring();
          phoneHome({
            action: "deploy-cfn-kit",
            kit_id: kitId,
            starter_kit: templates[i],
            details: thisStacksParams,
          });
          window.deployCloudFormationTemplate(kitId, templates[i], stackName, thisStacksParams, bucketName, kitObject, deployResponseHandler, updateConfirmed);
        }
      } else if (i > 0 && i > templateIndex) {
        let previousStackName = stacksWithParams[i - 1][0]; //window.deriveCfnStackName(templates[i - 1], thisStacksParams);
        // amazonq-ignore-next-line
        console.log(`adding a listener for completion of ${previousStackName} to deploy ${stackName}`);
        addEventListener(TASK_EVENTS.DEPLOYMENT_COMPLETE, (event) => {
          if (event.detail === previousStackName) {
            deployCfnTemplate(kitId, i);
          }
        });
      }
    }
  }
}

function stacksToBeUpdated(stackNameArray) {
  let updatedStacks = [];
  for (const stack in allStacks) {
    for (let i = 0; i < stackNameArray.length; i++) {
      if (stackNameArray[i].hasOwnProperty("name") && allStacks[stack].StackName === stackNameArray[i].name) {
        updatedStacks.push(allStacks[stack].StackName);
      } else if (allStacks[stack].StackName === stackNameArray[i]) {
        updatedStacks.push(allStacks[stack].StackName);
      }
    }
  }
  return updatedStacks;
}

//deploy a cdk-based kit using codepipeline
async function deployApp(kitId, updateConfirmed = false) {
  if (!window.loggedIn) {
    return;
  }
  let kitObject = kitMetadata[kitId];
  let inputs = getFormInputs(kitId);
  let derivedStacknames = await window.deriveAppStackNames(kitObject, inputs);
  let stacksBeingUpdated = stacksToBeUpdated(derivedStacknames);
  if (kitMetadata[kitId].AllowUpdates && stacksBeingUpdated.length > 0 && !updateConfirmed) {
    showConfirmationModal(
      true,
      "Are you sure?",
      `You are going to update ${stacksBeingUpdated.join(" and ")} - click Confirm to continue or Cancel.`,
      deployApp,
      cancelInstall,
      [kitId, true]
    );
  } else if (!kitMetadata[kitId].AllowUpdates && stacksBeingUpdated.length > 0 && !updateConfirmed) {
    showConfirmationModal(
      true,
      "Unsupported Stack Update",
      `If you proceed we will attempt to update the stack${stacksBeingUpdated.length > 1 ? "s" : ""} <b>${stacksBeingUpdated.join(
        " and "
      )}</b>. This may fail. <p>Click Confirm to continue or Cancel.</p>`,
      deployApp,
      cancelInstall,
      [kitId, true]
    );
  } else {
    // all non-CFN kits will be deployed the same way, via upload to s3 source bucket
    const sourceBucket = getValueInNamespace(`${account}-${region}`, "SourceBucket");
    if (sourceBucket === "") {
      console.log("No source bucket available");
      return;
    }
    startMonitoring();
    phoneHome({
      csk_id: window.resellerConfig.csk_id,
      kit_id: kitId,
      action: `deploy-${kitMetadata[kitId]["AppType"].toLowerCase()}-kit`,
      partner_name: window.resellerConfig.AWSDistributorName,
      country_code: window.resellerConfig.CountryCode,
      starter_kit: kitObject.Manifest,
      details: inputs,
    });
    window.deployAppViaSourceBucket(kitId, kitObject, inputs, region, account, sourceBucket, deployResponseHandler, updateConfirmed);
  }
}

function destroyStack(kitId) {
  if (!window.loggedIn) {
    return;
  }
  window.listStacks((err, stacks) => {
    if (err) {
      // amazonq-ignore-next-line
      console.error(err);
    } else {
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
  });
}


/*
* ###########################################
* ## src/scripts/get-amis-and-instance-types.js
* ###########################################
*/

/*
 * Get different classes of AMI
 */

window.amis = {};
window.amis["windows"] = [];
window.amis["linux2"] = [];
window.amis["linuxArm"] = [];
window.amis["ubuntu"] = [];
window.amis["ubuntuArm"] = [];
window.amis["linux2023"] = [];
window.amis["linux2023Arm"] = [];
window.amis["rhel"] = [];
window.amis["rhelArm"] = [];

let latestRhels = {};

function removeOldRhelAmis(amis) {
  for (let i = 0; i < amis.length; i++) {
    // RHEL_HA-9.5.0_HVM_GA-20241029-x86_64-0-Hourly2-GP3
    // RHEL_8.10-x86_64-SQL_2022_Standard-2024.06.19
    // RHEL_HA_8.8-x86_64-SQL_2022_Enterprise-2023.10.18
    // RHEL-9.4.0_HVM_BETA-20240411-x86_64-30-Hourly2-GP3
    let isHa = amis[i].Name.match(/_HA/) ? " (HA)" : "";
    let isGa = amis[i].Name.match(/_GA/) ? " (GA)" : "";
    let arch = `(${amis[i].Architecture})`;
    amis[i].Name = amis[i].Name.replace(/^RHEL_HA/, "RHEL~HA");
    if (amis[i].Name.match(/SQL_/)) {
      let amiVersion = `RHEL SQL${isHa} ${amis[i].Name.split("-")[0].split("_")[1]}${isGa} ${arch}`;
      let amiDate = parseInt(amis[i].Name.split("-")[3].replace(/\D/g), 10);
      if (!latestRhels.hasOwnProperty(amiVersion)) {
        latestRhels[amiVersion] = [amiDate, amis[i]];
      } else if (latestRhels[amiVersion][0] < amiDate) {
        latestRhels[amiVersion] = [amiDate, amis[i]];
      }
    } else if (amis[i].Name.match(/^RHEL~HA/)) {
      let amiVersion = `RHEL (HA) ${amis[i].Name.split("-")[1].split("_")[0]} ${isGa} ${arch}`;
      let amiDate = parseInt(amis[i].Name.split("-")[2], 10);
      if (!latestRhels.hasOwnProperty(amiVersion)) {
        latestRhels[amiVersion] = [amiDate, amis[i]];
      } else if (latestRhels[amiVersion][0] < amiDate) {
        latestRhels[amiVersion] = [amiDate, amis[i]];
      }
    } else if (amis[i].Name.match(/^RHEL-/)) {
      let amiVersion = `RHEL ${amis[i].Name.split("-")[1].split("_")[0]} ${isGa} ${arch}`;
      let amiDate = parseInt(amis[i].Name.split("-")[2], 10);
      if (!latestRhels.hasOwnProperty(amiVersion)) {
        latestRhels[amiVersion] = [amiDate, amis[i]];
      } else if (latestRhels[amiVersion][0] < amiDate) {
        latestRhels[amiVersion] = [amiDate, amis[i]];
      }
    }
  }
  let filteredAmis = [];
  for (let amiVersion in latestRhels) {
    latestRhels[amiVersion][1].Name = amiVersion;
    filteredAmis.push(latestRhels[amiVersion][1]);
  }
  return filteredAmis;
}

function fetchAmis() {
  let now = Math.round(new Date().getTime() / 1000);
  let lastFetch = Number(getValueInNamespace(region, `amiDataLastFetch`));
  if (lastFetch && now - lastFetch > 60 && lastFetch > now - 86400) {
    let cachedData = getValueInNamespace(region, `amiData`);
    if (cachedData !== "") {
      window.amis = JSON.parse(cachedData);
      console.log("using cached AMI data");
      dispatchEvent(new Event("UI_DATA_UPDATE"));
      return;
    }
  }
  dispatchEvent(new Event("EXTEND_LOAD_DELAY"));
  setValueInNamespace(region, `amiDataLastFetch`, now);
  window.describeAmis(
    {
      Filters: [
        { Name: "owner-alias", Values: ["amazon"] },
        { Name: "name", Values: ["*arm64-server*"] },
        { Name: "description", Values: ["Canonical, Ubuntu*LTS*"] },
        { Name: "architecture", Values: ["arm64"] },
        { Name: "virtualization-type", Values: ["hvm"] },
        { Name: "state", Values: ["available"] },
        { Name: "image-type", Values: ["machine"] },
        { Name: "root-device-type", Values: ["ebs"] },
        { Name: "hypervisor", Values: ["xen", "nitro"] },
        { Name: "owner-id", Values: ["099720109477"] },
      ],
    },
    (err, data) => {
      if (err) {
        console.error(err);
      } else {
        //console.log(data)
        let sortedAmis = [];
        let keyedAmis = {};
        for (let i = 0; i < data.Images.length; i++) {
          if (!data.Images[i].Name.match("daily") && !data.Images[i].Name.match("eks")) {
            let shortName = data.Images[i].Name.split("/").pop();
            shortName = shortName.split("-").pop() + `-${shortName}`;
            sortedAmis.push(shortName);
            keyedAmis[shortName] = data.Images[i];
          }
        }
        sortedAmis.sort().reverse();
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
          sortedAmiObjects.push(latestImages[key]);
        }
        window.amis.ubuntuArm = sortedAmiObjects;
        dispatchEvent(new Event("UI_DATA_UPDATE"));
        dispatchEvent(new Event("AMI_DATA_UPDATE"));
      }
    }
  );
  // RHEL
  window.describeAmis(
    {
      Owners: ["309956199498", "199830906635"],
      IncludeDeprecated: false,
      IncludeDisabled: false,
      Filters: [
        { Name: "owner-alias", Values: ["amazon"] },
        { Name: "name", Values: ["RHEL*"] },
        { Name: "virtualization-type", Values: ["hvm"] },
        { Name: "state", Values: ["available"] },
        { Name: "image-type", Values: ["machine"] },
        { Name: "root-device-type", Values: ["ebs"] },
        { Name: "hypervisor", Values: ["xen", "nitro"] },
      ],
    },
    (err, data) => {
      if (err) {
        console.error(err);
      } else {
        //console.log(data)
        let sortedAmis = [];
        let keyedAmis = {};
        let sortedAmisArm = [];
        let keyedAmisArm = {};
        // let uniqueAmis = {};
        let latestAmis = removeOldRhelAmis(data.Images);
        for (let i = 0; i < latestAmis.length; i++) {
          // if (uniqueAmis.hasOwnProperty(latestAmis[i].Name)) {
          //   continue;
          // }
          // uniqueAmis[latestAmis[i].Name] = true;

          if (latestAmis[i].Architecture === "arm64") {
            sortedAmisArm.push(latestAmis[i].Name);
            keyedAmisArm[latestAmis[i].Name] = latestAmis[i];
          } else {
            sortedAmis.push(latestAmis[i].Name);
            keyedAmis[latestAmis[i].Name] = latestAmis[i];
          }
        }
        sortedAmis.sort().reverse();
        let latestImages = {};
        for (let i = 0; i < sortedAmis.length; i++) {
          let image = keyedAmis[sortedAmis[i]];
          // let datelessName = image.Name.replace(/-\d{8}(\.\d)*/, "").replace(/Hourly2-/, "");
          // if (!latestImages.hasOwnProperty(datelessName)) {
          //   image["ShortName"] = datelessName;
          //   latestImages[datelessName] = image;
          // }

          image["ShortName"] = image.Name;
          latestImages[image.Name] = image;
        }
        let sortedAmiObjects = [];
        for (let key in latestImages) {
          sortedAmiObjects.push(latestImages[key]);
        }
        window.amis.rhel = sortedAmiObjects;
        // arm
        sortedAmisArm.sort().reverse();
        let latestImagesArm = {};
        for (let i = 0; i < sortedAmisArm.length; i++) {
          let image = keyedAmisArm[sortedAmisArm[i]];
          // let datelessName = image.Name.replace(/-\d{8}(\.\d)*/, "").replace(/Hourly2-/, "");
          // if (!latestImagesArm.hasOwnProperty(datelessName)) {
          //   image["ShortName"] = datelessName;
          //   latestImagesArm[datelessName] = image;
          // }

          image["ShortName"] = image.Name;
          latestImagesArm[image.Name] = image;
        }
        let sortedAmiObjectsArm = [];
        for (let key in latestImagesArm) {
          sortedAmiObjectsArm.push(latestImagesArm[key]);
        }
        window.amis.rhelArm = sortedAmiObjectsArm;
        dispatchEvent(new Event("UI_DATA_UPDATE"));
        dispatchEvent(new Event("AMI_DATA_UPDATE"));
      }
    }
  );

  window.describeAmis(
    {
      Filters: [
        { Name: "owner-alias", Values: ["amazon"] },
        { Name: "name", Values: ["*server*"] },
        { Name: "description", Values: ["Canonical, Ubuntu*LTS*"] },
        { Name: "architecture", Values: ["x86_64"] },
        { Name: "virtualization-type", Values: ["hvm"] },
        { Name: "state", Values: ["available"] },
        { Name: "image-type", Values: ["machine"] },
        { Name: "root-device-type", Values: ["ebs"] },
        { Name: "hypervisor", Values: ["xen", "nitro"] },
        { Name: "owner-id", Values: ["099720109477"] },
      ],
    },
    (err, data) => {
      if (err) {
        console.error(err);
      } else {
        //console.log(data)
        let sortedAmis = [];
        let keyedAmis = {};
        for (let i = 0; i < data.Images.length; i++) {
          if (!data.Images[i].Name.match("daily") && !data.Images[i].Name.match("eks")) {
            let shortName = data.Images[i].Name.split("/").pop();
            shortName = shortName.split("-").pop() + `-${shortName}`;
            sortedAmis.push(shortName);
            keyedAmis[shortName] = data.Images[i];
          }
        }
        sortedAmis.sort().reverse();
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
          sortedAmiObjects.push(latestImages[key]);
        }
        window.amis.ubuntu = sortedAmiObjects;
        dispatchEvent(new Event("UI_DATA_UPDATE"));
        dispatchEvent(new Event("AMI_DATA_UPDATE"));
      }
    }
  );

  window.describeAmis(
    {
      Filters: [
        { Name: "owner-alias", Values: ["amazon"] },
        { Name: "platform", Values: ["windows"] },
        { Name: "architecture", Values: ["x86_64"] },
        { Name: "virtualization-type", Values: ["hvm"] },
        { Name: "state", Values: ["available"] },
        { Name: "image-type", Values: ["machine"] },
        { Name: "root-device-type", Values: ["ebs"] },
        { Name: "hypervisor", Values: ["xen", "nitro"] },
      ],
    },
    (err, data) => {
      if (err) {
        console.error(err);
      } else {
        //console.log(data)
        let sortedAmis = [];
        let keyedAmis = {};
        for (let i = 0; i < data.Images.length; i++) {
          if (data.Images[i].Name.match("English") && !data.Images[i].Name.match("EKS") && !data.Images[i].Name.match("ECS")) {
            let shortName = data.Images[i].Name.split("/").pop();
            shortName = shortName.split("-").pop() + `-${shortName}`;
            sortedAmis.push(shortName);
            keyedAmis[shortName] = data.Images[i];
          }
        }
        sortedAmis.sort().reverse();
        let latestImages = {};
        for (let i = 0; i < sortedAmis.length; i++) {
          let image = keyedAmis[sortedAmis[i]];
          let datelessName = image.Name.replace(/-\d{4}\.\d{2}\.\d{2}/, "").replace(/[\W_]/g, " ");
          if (!latestImages.hasOwnProperty(datelessName)) {
            image["ShortName"] = datelessName;
            latestImages[datelessName] = image;
          }
        }
        let sortedAmiObjects = [];
        for (let key in latestImages) {
          sortedAmiObjects.push(latestImages[key]);
        }
        window.amis.windows = sortedAmiObjects;
        dispatchEvent(new Event("UI_DATA_UPDATE"));
        dispatchEvent(new Event("AMI_DATA_UPDATE"));
      }
    }
  );

  window.describeAmis(
    {
      Filters: [
        { Name: "owner-alias", Values: ["amazon"] },
        { Name: "name", Values: ["*al2023*"] },
        { Name: "description", Values: ["Amazon Linux*"] },
        { Name: "architecture", Values: ["x86_64"] },
        { Name: "virtualization-type", Values: ["hvm"] },
        { Name: "state", Values: ["available"] },
        { Name: "image-type", Values: ["machine"] },
        { Name: "root-device-type", Values: ["ebs"] },
        { Name: "hypervisor", Values: ["xen", "nitro"] },
      ],
    },
    (err, data) => {
      if (err) {
        console.error(err);
      } else {
        //console.log(data)
        let sortedAmis = [];
        let keyedAmis = {};
        for (let i = 0; i < data.Images.length; i++) {
          if (!data.Images[i].Name.match("ecs")) {
            let shortName = data.Images[i].Name;
            shortName = data.Images[i].CreationDate + `-${shortName}`;
            sortedAmis.push(shortName);
            keyedAmis[shortName] = data.Images[i];
          }
        }
        sortedAmis.sort().reverse();
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
          sortedAmiObjects.push(latestImages[key]);
        }
        window.amis.linux2023 = sortedAmiObjects;
        dispatchEvent(new Event("UI_DATA_UPDATE"));
        dispatchEvent(new Event("AMI_DATA_UPDATE"));
      }
    }
  );

  window.describeAmis(
    {
      Filters: [
        { Name: "owner-alias", Values: ["amazon"] },
        { Name: "name", Values: ["*al2023*"] },
        { Name: "description", Values: ["Amazon Linux*"] },
        { Name: "architecture", Values: ["arm64"] },
        { Name: "virtualization-type", Values: ["hvm"] },
        { Name: "state", Values: ["available"] },
        { Name: "image-type", Values: ["machine"] },
        { Name: "root-device-type", Values: ["ebs"] },
        { Name: "hypervisor", Values: ["xen", "nitro"] },
      ],
    },
    (err, data) => {
      if (err) {
        console.error(err);
      } else {
        //console.log(data)
        let sortedAmis = [];
        let keyedAmis = {};
        for (let i = 0; i < data.Images.length; i++) {
          if (!data.Images[i].Name.match("ecs")) {
            let shortName = data.Images[i].Name;
            shortName = data.Images[i].CreationDate + `-${shortName}`;
            sortedAmis.push(shortName);
            keyedAmis[shortName] = data.Images[i];
          }
        }
        sortedAmis.sort().reverse();
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
          sortedAmiObjects.push(latestImages[key]);
        }
        window.amis.linux2023Arm = sortedAmiObjects;
        dispatchEvent(new Event("UI_DATA_UPDATE"));
        dispatchEvent(new Event("AMI_DATA_UPDATE"));
      }
    }
  );

  window.describeAmis(
    {
      Filters: [
        { Name: "owner-alias", Values: ["amazon"] },
        { Name: "name", Values: ["*amzn2*"] },
        { Name: "description", Values: ["Amazon Linux 2*"] },
        { Name: "architecture", Values: ["x86_64"] },
        { Name: "virtualization-type", Values: ["hvm"] },
        { Name: "state", Values: ["available"] },
        { Name: "image-type", Values: ["machine"] },
        { Name: "root-device-type", Values: ["ebs"] },
        { Name: "hypervisor", Values: ["xen", "nitro"] },
      ],
    },
    (err, data) => {
      if (err) {
        console.error(err);
      } else {
        //console.log(data)
        let sortedAmis = [];
        let keyedAmis = {};
        for (let i = 0; i < data.Images.length; i++) {
          if (!data.Images[i].Name.match("ecs")) {
            let shortName = data.Images[i].Name;
            shortName = data.Images[i].CreationDate + `-${shortName}`;
            sortedAmis.push(shortName);
            keyedAmis[shortName] = data.Images[i];
          }
        }
        sortedAmis.sort().reverse();
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
          sortedAmiObjects.push(latestImages[key]);
        }
        window.amis.linux2 = sortedAmiObjects;
        dispatchEvent(new Event("UI_DATA_UPDATE"));
        dispatchEvent(new Event("AMI_DATA_UPDATE"));
      }
    }
  );

  window.describeAmis(
    {
      Filters: [
        { Name: "owner-alias", Values: ["amazon"] },
        { Name: "name", Values: ["*amzn2*"] },
        { Name: "description", Values: ["Amazon Linux 2*"] },
        { Name: "architecture", Values: ["arm64"] },
        { Name: "virtualization-type", Values: ["hvm"] },
        { Name: "state", Values: ["available"] },
        { Name: "image-type", Values: ["machine"] },
        { Name: "root-device-type", Values: ["ebs"] },
        { Name: "hypervisor", Values: ["xen", "nitro"] },
      ],
    },
    (err, data) => {
      if (err) {
        console.error(err);
      } else {
        //console.log(data)
        let sortedAmis = [];
        let keyedAmis = {};
        for (let i = 0; i < data.Images.length; i++) {
          if (!data.Images[i].Name.match("ecs")) {
            let shortName = data.Images[i].Name;
            shortName = data.Images[i].CreationDate + `-${shortName}`;
            sortedAmis.push(shortName);
            keyedAmis[shortName] = data.Images[i];
          }
        }
        sortedAmis.sort().reverse();
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
          sortedAmiObjects.push(latestImages[key]);
        }
        window.amis.linuxArm = sortedAmiObjects;
        dispatchEvent(new Event("UI_DATA_UPDATE"));
        dispatchEvent(new Event("AMI_DATA_UPDATE"));
      }
    }
  );
}

function cacheAmiData() {
  setValueInNamespace(region, `amiData`, JSON.stringify(window.amis));
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
  window.amis["windows"] = [];
  window.amis["linux2"] = [];
  window.amis["linuxArm"] = [];
  window.amis["ubuntu"] = [];
  window.amis["ubuntuArm"] = [];
  window.amis["linux2023"] = [];
  window.amis["linux2023Arm"] = [];
}

function getInstanceTypes(nextToken) {
  let now = Math.round(new Date().getTime() / 1000);
  let lastFetch = Number(getValueInNamespace(region, `instanceDataLastFetch`));
  if (!nextToken && lastFetch && now - lastFetch > 60 && lastFetch > now - 86400) {
    let cachedData = getValueInNamespace(region, `instanceData`);
    if (cachedData !== "") {
      window.instanceTypes = JSON.parse(cachedData);
      console.log("using cached instance data");
      dispatchEvent(new Event("UI_DATA_UPDATE"));
      return;
    }
  }
  dispatchEvent(new Event("EXTEND_LOAD_DELAY"));
  setValueInNamespace(region, `instanceDataLastFetch`, now);
  let params = {
    Filters: [
      { Name: "instance-type", Values: ["*"] },
      { Name: "bare-metal", Values: ["false"] },
      { Name: "current-generation", Values: ["true"] },
      { Name: "supported-virtualization-type", Values: ["hvm"] },
    ],
  };
  if (nextToken) {
    params.NextToken = nextToken;
  }

  window.describeInstanceTypes(params, (err, data) => {
    if (err) {
      console.error(err);
    } else {
      //console.log(data)
      for (let i = 0; i < data.InstanceTypes.length; i++) {
        if (data.InstanceTypes[i].InstanceType.match(/(flex|u-|hpc)/) || !data.InstanceTypes[i].InstanceType.match(/^[a-z][\d\w]{1,5}\./)) {
          continue;
        }
        let instanceLabel = data.InstanceTypes[i].InstanceType.split(".")[0];
        instanceLabel += String(data.InstanceTypes[i].VCpuInfo.DefaultVCpus).padStart(3, "0");
        instanceLabel += String(data.InstanceTypes[i].MemoryInfo.SizeInMiB).padStart(4, "0");
        instanceTypeNames.push(instanceLabel + "-" + data.InstanceTypes[i].InstanceType);
        window.instanceTypes[data.InstanceTypes[i].InstanceType] = data.InstanceTypes[i];
      }
      instanceTypeNames.sort();
      // console.log(instanceTypeNames)
      let sortedInstanceTypes = {};
      for (let i = 0; i < instanceTypeNames.length; i++) {
        let instanceName = instanceTypeNames[i].split("-")[1];
        sortedInstanceTypes[instanceName] = window.instanceTypes[instanceName];
      }
      // console.log(sortedInstanceTypes)
      if (data.NextToken) {
        dispatchEvent(new Event("EXTEND_LOAD_DELAY"));
        getInstanceTypes(data.NextToken);
      } else {
        window.instanceTypes = sortedInstanceTypes;
        dispatchEvent(new Event("UI_DATA_UPDATE"));
        dispatchEvent(new Event("INSTANCE_DATA_UPDATE"));
      }
    }
  });
}

// function instanceSort(instanceTypes) {
//   return instanceTypes
// }

function cacheInstanceData() {
  setValueInNamespace(region, `instanceData`, JSON.stringify(window.instanceTypes));
}

addEventListener("INSTANCE_DATA_UPDATE", cacheInstanceData);


/*
* ###########################################
* ## src/scripts/get-bedrock-models.js
* ###########################################
*/

/*
 * Get different db engines available
 */

window.bedrockModels = {};

function resetBedrockModels() {
  window.bedrockModels = {};
}

function getAllBedrockModels() {
  let now = Math.round(new Date().getTime() / 1000);
  let lastFetch = Number(getValueInNamespace(region, `bedrockModelsLastFetch`));
  if (lastFetch && now - lastFetch > 60 && lastFetch > now - 86400) {
    let cachedData = getValueInNamespace(region, `bedrockModels`);
    if (cachedData !== "") {
      window.bedrockModels = JSON.parse(cachedData);
      console.log("using cached bedrock model data");
      console.log(window.bedrockModels);
      dispatchEvent(new Event("UI_DATA_UPDATE"));
      return;
    }
  }
  dispatchEvent(new Event("EXTEND_LOAD_DELAY"));
  setValueInNamespace(region, `dbEngineLastFetch`, now);
  window.getBedrockModels((err, data) => {
    if (data) {
      console.log("bedrock models");

      const models = data.modelSummaries;
      const active = models.filter((m) => m.modelLifecycle.status === "ACTIVE");
      const legacy = models.filter((m) => m.modelLifecycle.status === "LEGACY");
      window.bedrockModels = { active: active, legacy: legacy };
      for (let m = 0; m < window.bedrockModels.active.length; m++) {
        let model = window.bedrockModels.active[m];
        console.log(model);
        // ignore provisioned capacity variants
        if (model.inferenceTypesSupported.indexOf("ON_DEMAND") > -1) {
          // let inputModalities = model.inputModalities ? model.inputModalities : [];
          let outputModalities = model.outputModalities ? model.outputModalities : [];
          // for (i = 0; i < inputModalities.length; i++) {
          for (i = 0; i < outputModalities.length; i++) {
            let mode = outputModalities[i].toLowerCase();
            if (window.bedrockModels.hasOwnProperty(mode)) {
              window.bedrockModels[mode].push(model);
            } else {
              window.bedrockModels[mode] = [model];
            }
          }
        }
      }
      console.log(window.bedrockModels);
      // console.log("Listing the available Bedrock foundation models:");

      // for (const model of models) {
      //   console.log("=".repeat(42));
      //   console.log(` Model: ${model.modelId}`);
      //   console.log("-".repeat(42));
      //   console.log(` Name: ${model.modelName}`);
      //   console.log(` Provider: ${model.providerName}`);
      //   console.log(` Model ARN: ${model.modelArn}`);
      //   console.log(` Input modalities: ${model.inputModalities}`);
      //   console.log(` Output modalities: ${model.outputModalities}`);
      //   console.log(` Supported customizations: ${model.customizationsSupported}`);
      //   console.log(` Supported inference types: ${model.inferenceTypesSupported}`);
      //   console.log(` Lifecycle status: ${model.modelLifecycle.status}`);
      //   console.log(`${"=".repeat(42)}\n`);
      // }

      // const active = models.filter((m) => m.modelLifecycle.status === "ACTIVE").length;
      // const legacy = models.filter((m) => m.modelLifecycle.status === "LEGACY").length;

      setValueInNamespace(region, `bedrockModels`, JSON.stringify(window.bedrockModels));
    } else {
      console.log(err);
    }
  });
}


/*
* ###########################################
* ## src/scripts/get-db-engines-and-instance-types.js
* ###########################################
*/

/* 
* Get different db engines available
*/

window.dbEngines = {};
window.serverlessDbEngines = {};
window.dbInstances = {};

function resetDbInfraLists() {
  window.dbEngines = {};
  window.serverlessDbEngines = {};
  window.dbInstances = {};
}

function getAllDbEngines() {
  let now = Math.round(new Date().getTime() / 1000);
  let lastFetch = Number(getValueInNamespace(region, `dbEngineLastFetch`));
  if (lastFetch && (now - lastFetch) > 60 && lastFetch > (now - 86400)) {
    let cachedData = getValueInNamespace(region, `dbEngines`);
    let cachedData2 = getValueInNamespace(region, `serverlessDbEngines`);
    if (cachedData !== "") {
      window.dbEngines = JSON.parse(cachedData);
      window.serverlessDbEngines = JSON.parse(cachedData2);
      getAllDbInstances();
      console.log("using cached dbEngine data")
      dispatchEvent(new Event('UI_DATA_UPDATE'))
      return;
    }
  }
  dispatchEvent(new Event('EXTEND_LOAD_DELAY'))
  setValueInNamespace(region, `dbEngineLastFetch`, now)
  window.describeDatabaseEngines({}, (err, data) => {
    if (data) {
      console.log(err);
      window.dbEngines = data;
      for (const engine in window.dbEngines) {
        for (const engineVersion in window.dbEngines[engine]) {
          if (window.dbEngines[engine][engineVersion].hasOwnProperty("SupportedEngineModes") && window.dbEngines[engine][engineVersion]["SupportedEngineModes"].includes("serverless")) {
            if (!window.serverlessDbEngines.hasOwnProperty(engine)) {
              window.serverlessDbEngines[engine] = {};
            }
            if (!window.serverlessDbEngines[engine].hasOwnProperty(engineVersion)) {
              window.serverlessDbEngines[engine][engineVersion] = {};
            }
            window.serverlessDbEngines[engine][engineVersion] = window.dbEngines[engine][engineVersion];
          }
        }
      }
      console.log(window.dbEngines, window.serverlessDbEngines);
      setValueInNamespace(region, `dbEngines`, JSON.stringify(window.dbEngines))
      setValueInNamespace(region, `serverlessDbEngines`, JSON.stringify(window.serverlessDbEngines))
      getAllDbInstances();
    }
    else {
      console.log(err);
    }
  });
}



function getAllDbInstances() {
  let now = Math.round(new Date().getTime() / 1000);
  let lastFetch = Number(getValueInNamespace(region, `dbInstancesLastFetch`));
  if (lastFetch && (now - lastFetch) > 60 && lastFetch > (now - 86400)) {
    let cachedData = getValueInNamespace(region, `dbInstances`);
    if (cachedData !== "") {
      window.dbInstances = JSON.parse(cachedData);
      console.log("using cached dbInstances data")
      dispatchEvent(new Event('UI_DATA_UPDATE'))
      return;
    }
  }
  dispatchEvent(new Event('EXTEND_LOAD_DELAY'))
  setValueInNamespace(region, `dbInstancesLastFetch`, now)
  for (const engine in window.dbEngines) {
    window.describeDatabaseInstances(engine, (err, data) => {
      if (data) {
        window.dbInstances[engine] = data[engine];
        setValueInNamespace(region, `dbInstances`, JSON.stringify(window.dbInstances));
        console.log(window.dbInstances);
      }
      else {
        console.log(err);
      }
    });
  }
}


/*
* ###########################################
* ## src/scripts/sdk-commands.js
* ###########################################
*/


function runSdkCommand() {
    document.getElementById('sdk-output').hidden = false;
    try {
        switch (document.getElementById('sdk-commands-list').value) {
            case "list-buckets":
                window.listBuckets(function (err, data) {
                    if (err) {
                        document.getElementById('sdk-result').innerText = preformatted(err, true);
                    } else {
                        console.log("Success", data);
                        let output = "";
                        for (let i = 0; i < data.Buckets.length; i++) {
                            output += "* " + data.Buckets[i].Name + "<br>\n";
                        }
                        document.getElementById('sdk-result').innerText = preformatted(output, false);
                    }
                })
                break;
            case "list-subnets":
                window.getSubnets(function (err, data) {
                    if (err) {
                        console.log("Error", err);
                        document.getElementById('sdk-result').innerText = preformatted(err, true);
                    } else {
                        console.log("Success", data);
                        let output = "";
                        for (let i = 0; i < data.Subnets.length; i++) {
                            output += "* " + data.Subnets[i].SubnetId + " | " + data.Subnets[i].VpcId + " | " + data.Subnets[i].CidrBlock + " | " + data.Subnets[i].AvailabilityZone + "<br>\n";
                        }
                        document.getElementById('sdk-result').innerText = preformatted(output, false);
                    }
                })
                break;
            case "get-credential-report":
                window.getCredentialReport(function (err, data) {
                    if (err) {
                        console.log("Error", err);
                        document.getElementById('sdk-result').innerText = preformatted(err, true);
                    } else {
                        console.log("Success", data);
                        let decodedData = new TextDecoder("utf-8").decode(data.Content).replace(/[<>]/g, '');
                        let lines = decodedData.split("\n");
                        let fields = lines[0].split(",");
                        let values = lines[1].split(",");
                        let output = {};
                        for (let i = 0; i < fields.length; i++) {
                            output[fields[i]] = values[i]
                        }
                        document.getElementById('sdk-result').innerText = preformatted(output, true);
                    }
                })
                break;
            case "get-cloudfront-prefix-list":
                window.getPrefixLists({
                    Filters: [{
                        Name: "prefix-list-name",
                        Values: ["com.amazonaws.global.cloudfront.origin-facing"]
                    }]
                }, function (err, data) {
                    if (err) {
                        console.log("Error", err);
                        document.getElementById('sdk-result').innerText = preformatted(err, true);
                    } else {
                        console.log("Success", data);
                        document.getElementById('sdk-result').innerText = preformatted(data, true);
                    }
                })
                break;
        }
    } catch (err) {
        console.log("Error", err);
        document.getElementById('sdk-result').innerText = preformatted(err, true);
    }
}

function preformatted(data, bool) {
    console.log(typeof data);
    console.log(data instanceof String);
    if (bool) {
        document.getElementById('sdk-result').classList.add('pre');
        if (data.toString() === '[object Object]') {
            return JSON.stringify(data, null, 4);
        }
        else {
            return data;
        }
    } else {
        document.getElementById('sdk-result').classList.remove('pre');
        return data;
    }
}
document.getElementById("execute-sdk-button").addEventListener("click", runSdkCommand);


/*
* ###########################################
* ## src/scripts/renderer.js
* ###########################################
*/

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

let region = null;
let account = null;
let progressBars = {};
let templateParameters = {};
let templateParameterObjects = {};
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
    if (e.key === "Enter") {
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
  console.log(`configuring ${kit.kitId}`);
  if (kit.hasOwnProperty("Templates")) {
    //cfn kit
    displayTemplateConfig(kitId);
  } else if (kit.hasOwnProperty("AppType") && kit.AppType === "SAM") {
    //sam kit
    displaySamAppConfig(kitId);
  } else if (kit.hasOwnProperty("AppType") && kit.AppType === "Codebuild") {
    //Codebuild kit
    displayCodebuildAppConfig(kitId);
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
    const index = Object.keys(kitConfigsShowing).indexOf(kitId);
    if (index !== -1) {
      kitConfigsShowing.splice(index, 1);
    }
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
    // } else if (kit.hasOwnProperty("AppType") && kit.AppType === "SAM") {
    //   //cdk kit
    //   deployApp(kitId);
  } else {
    //cdk kit
    deployApp(kitId);
  }
}

function cancelInstall(kitId) {
  unlockInstallButton(kitId);
  closeDeploymentPane(kitId);
  closeConfirmationModal();
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
  } else if (kit.hasOwnProperty("AppType") && kit.AppType === "SAM") {
    //cdk kit
    destroySamApp(kitId);
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

function destroySamApp(kitId) {
  console.log("destroySamApp", kitId);
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

function toggleDeploymentDetails(kitId, forceOpen = false) {
  let detailsDiv = document.getElementById(`${kitId}-deployment-details`);
  if (forceOpen || detailsDiv.style.display === "none") {
    detailsDiv.style.display = "block";
  } else {
    detailsDiv.style.display = "none";
  }
}

function closeDeploymentPane(kitId) {
  document.getElementById(`${kitId}-deployment-progress`).style.display = "none";
  document.getElementById(`${kitId}-deployment-details`).style.display = "none";
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
      // amazonq-ignore-next-line
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
          if (kit.hasOwnProperty("AppType")) {
            kitTech = kit.AppType.toLowerCase();
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
          // amazonq-ignore-next-line
          kitConfig.setAttribute("onclick", `configureKit('${kitId}')`);
          //install button
          let kitInstall = document.createElement("button");
          kitInstall.id = `${kitId}-install-button`;
          kitInstall.innerText = `Install ${kit["Name"]}`;
          // amazonq-ignore-next-line
          kitInstall.setAttribute("onclick", `installKit('${kitId}')`);
          kitInstall.style.display = "none";
          //update button
          let kitUpdate = document.createElement("button");
          kitUpdate.id = `${kitId}-update-button`;
          kitUpdate.innerText = `Update ${kit["Name"]}`;
          // amazonq-ignore-next-line
          kitUpdate.setAttribute("onclick", `installKit('${kitId}')`);
          kitUpdate.style.display = "none";
          //delete button
          let kitDelete = document.createElement("button");
          kitDelete.id = `${kitId}-delete-button`;
          kitDelete.innerText = `Delete`;
          // amazonq-ignore-next-line
          kitDelete.setAttribute("onclick", `deleteKit('${kitId}')`);
          kitDelete.style.display = "none";
          //cancel button
          let kitCancel = document.createElement("button");
          kitCancel.id = `${kitId}-cancel-button`;
          kitCancel.innerText = `Cancel`;
          // amazonq-ignore-next-line
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
          // amazonq-ignore-next-line
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
    } else if (data && data.hasOwnProperty("StackId") && data.StackId === "csk-cdk-app-delivery-pipeline-stack") {
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
  resetBedrockModels();
  getAllBedrockModels();
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
    if (document.getElementById(`${kitId}|${params[i]}`)) {
      currentValues[params[i]] = document.getElementById(`${kitId}|${params[i]}`).value;
    }
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
  select.style.width = "50%";
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
  return configDiv.outerHTML;
}

function attachConfigLoaderListeners(kitId) {
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
}

async function displayTemplateConfig(kitId) {
  if (regionSelected) {
    let kit = kitMetadata[kitId];
    //fetch all current values so we can add them back if we reload the config form
    const currentValues = getCurrentValues(kitId);
    const existingConfigs = await getExistingConfigs(kitId);
    const templates = kit.Templates;
    const amiFilter = kit.hasOwnProperty("AmiFilter") ? kit.AmiFilter : "";
    const dbEngineFilter = kit.hasOwnProperty("DbEngineFilter") ? kit.DbEngineFilter : "";
    let configElements = `<div>`;
    configElements += existingConfigs;
    configElements += `<input id="AWSDistributorName" type="hidden" value="${window.resellerConfig.AWSDistributorName}" name="AWSDistributorName" required>`;
    configElements += `<input id="CountryCode" type="hidden" value="${window.resellerConfig.CountryCode}" name="CountryCode" required>`;
    configElements += `<input id="ReportingEnabled" type="hidden" value="false" name="ReportingEnabled" required>`;
    templateParameters[kitId] = [];
    templateParameterObjects[kitId] = {};
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
          if (parameterGroups[i].Label.default.includes("Starter-kit Specific Details")) {
            // we handle these directly
            continue;
          }
          configElements += makeGroupLabel(parameterGroups[i].Label.default);
          for (let j = 0; j < parameterGroups[i].Parameters.length; j++) {
            let thisParam = parameterGroups[i].Parameters[j];
            templateParameters[kitId].push(thisParam);
            templateParameterObjects[kitId][thisParam] = content["Parameters"][thisParam];
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
          templateParameterObjects[kitId][thisParam] = content["Parameters"][thisParam];
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
    setTimeout(attachConfigLoaderListeners, 200, kitId);
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
    console.log(e);
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
    console.log(e);
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

async function displaySamAppConfig(kitId) {
  return displayAppConfig("sam-apps", kitId);
}
async function displayCdkAppConfig(kitId) {
  return displayAppConfig("cdk-apps", kitId);
}
async function displayCodebuildAppConfig(kitId) {
  return displayAppConfig("codebuild-apps", kitId);
}
async function displayAppConfig(path, kitId) {
  if (regionSelected) {
    let kit = kitMetadata[kitId];
    const currentValues = getCurrentValues(kitId);
    const existingConfigs = await getExistingConfigs(kitId);
    const manifest = kit.Manifest;
    const amiFilter = kit.hasOwnProperty("AmiFilter") ? kit.AmiFilter : "";
    const dbEngineFilter = kit.hasOwnProperty("DbEngineFilter") ? kit.DbEngineFilter : "";
    if (!manifest) {
      document.getElementById(`${kitId}-config-pane`).innerText = "No manifest file found.";
      return;
    }
    const response = await fetch(`https://${window.hosts.FILE_HOST}/kits/${path}/${manifest}`, {
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
    templateParameterObjects[kitId] = {};

    let rowclass = "griditemlight";

    if (content.hasOwnProperty("ParameterGroups") && Object.keys(content["ParameterGroups"]).length > 0) {
      hasConfig = true;
      let parameterGroups = content["ParameterGroups"];
      for (let i = 0; i < parameterGroups.length; i++) {
        configElements += makeGroupLabel(parameterGroups[i].Label.default);
        for (let j = 0; j < parameterGroups[i].Parameters.length; j++) {
          let thisParam = parameterGroups[i].Parameters[j];
          templateParameters[kitId].push(thisParam);
          templateParameterObjects[kitId][thisParam] = content["Parameters"][thisParam];

          if (content["Parameters"][thisParam].hasOwnProperty("Alias")) {
            continue;
          } else if (content["Parameters"][thisParam].hasOwnProperty("Hidden")) {
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
        templateParameterObjects[kitId][thisParam] = content["Parameters"][thisParam];

        if (thisParam === "AWSDistributorName") {
          continue;
        }
        if (content["Parameters"][thisParam].hasOwnProperty("Alias")) {
          continue;
        } else if (content["Parameters"][thisParam].hasOwnProperty("Hidden")) {
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
    setTimeout(attachConfigLoaderListeners, 200, kitId);
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
  console.log(obj);
  if (key.match(/^InstanceType$/i)) {
    obj["Type"] = "CSK::InstanceType";
  }
  if (obj.hasOwnProperty("AllowedValues")) {
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
    if (obj["Type"].includes("CSK::BedrockModelId")) {
      element = `<select id="${uniqueId}" name="${key}">`;
      if (obj["Type"].includes("List")) {
        // make it multi select
        element = `<select id="${uniqueId}" name="${key}" multiple>`;
      }
      let models = [];
      if (obj["Type"].includes("TEXT")) {
        models = window.bedrockModels.text;
      } else if (obj["Type"].includes("IMAGE") && window.bedrockModels.hasOwnProperty("image")) {
        models = window.bedrockModels.image;
      } else if (obj["Type"].includes("VIDEO") && window.bedrockModels.hasOwnProperty("video")) {
        models = window.bedrockModels.video;
      } else if (obj["Type"].includes("SPEECH") && window.bedrockModels.hasOwnProperty("speech")) {
        models = window.bedrockModels.speech;
      } else {
        // models = window.bedrockModels.active;
      }
      // console.log(obj["Default"]);
      for (let i = 0; i < models.length; i++) {
        // console.log(models[i]);
        let model = models[i];
        let selected = "";
        if (obj["Default"].includes(model.modelId)) {
          selected = "selected";
        }
        element += `<option value="${model.modelId}" ${selected}>${model.modelName} (Inputs: ${model.inputModalities})</option>`;
      }
      element += "</select>";
    } else if (obj["Type"] === "CSK::PrefixList") {
      if (managedPrefixLists.hasOwnProperty(obj["Service"])) {
        element += `<input id="${uniqueId}" name="${key}" value="${managedPrefixLists[obj["Service"]]}">`;
      }
    } else if (obj["Type"] === "CSK::InstanceType") {
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
    } else if (obj["Type"] === "AWS::EC2::VPC::Id") {
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
      if (def === "0.0.0.0/0" || obj["Type"].includes("CSK::UserIp")) {
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
            let osType = ami.PlatformDetails.includes("linux") ? "Linux" : "Windows";
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
  if (error && error.toString().includes("Missing credentials in config, if using AWS_CONFIG_FILE, set AWS_SDK_LOAD_CONFIG=1")) {
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
