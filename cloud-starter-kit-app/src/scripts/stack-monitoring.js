/**
 * Stack Monitoring Module
 * Handles CloudFormation stack monitoring, event tracking, and UI updates
 */

// All utilities are defined in utilities.js (concatenated before this file)
// StackMonitor class, TASK_STATES, evaluateStatus, labelStatus, etc. are already available

// Create a global stack monitor instance
const stackMonitor = new StackMonitor({
  preMonitoringDelay: 1,
  monitoringTimeout: 1800,
  pollInterval: 3000,
  onStackUpdate: showStacksProgressFunc,
  onTimeout: handleMonitoringTimeout,
});

// Legacy compatibility - expose monitor state
let stackStates = stackMonitor.stackStates;
let lastReportedStates = stackMonitor.lastReportedStates;
let stackEvents = stackMonitor.stackEvents;
let stackInfoRequestors = stackMonitor.stackInfoRequestors;
let stackOutputs = stackMonitor.stackOutputs;
let debugMessages = stackMonitor.debugMessages;
let allStacks = stackMonitor.allStacks;

// For backward compatibility
const bouncyBox = BOUNCY_BOX;

/**
 * Lists all CloudFormation stacks and displays them in the UI
 */
function listAllStacks() {
  window.listStacks((err, stacks) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log(stacks);
    allStacks = {};

    // Build stacks lookup
    for (let i = 0; i < stacks.Stacks.length; i++) {
      allStacks[stacks.Stacks[i].StackId] = stacks.Stacks[i];
    }

    stackMonitor.setAllStacks(allStacks);

    const parentNode = document.getElementById("deployed-stacks");
    if (!parentNode) return;

    parentNode.innerText = "";

    const stackDiv = document.createElement("div");
    stackDiv.classList.add("scrollable");

    const pageHeading = document.createElement("h1");
    pageHeading.classList = ["installed-kits-heading"];
    pageHeading.innerText = "Installed Kits";

    const pageInfo = document.createElement("p");
    pageInfo.innerText = "This is a listing of the kits that have been deployed as CloudFormation stacks into this account.";

    stackDiv.appendChild(pageHeading);
    stackDiv.appendChild(pageInfo);

    // Render each stack
    for (const stackId in allStacks) {
      const stack = allStacks[stackId];

      // Skip statistics stacks
      if (stack.StackName.match(/sendStatisticsStack/)) {
        continue;
      }

      // Skip nested stacks
      if (stack.hasOwnProperty("RootId") && stack.RootId.match(/\w/)) {
        console.log("not showing nested stack");
        continue;
      }

      // Parse tags
      const stackTags = stack.Tags || [];
      const tags = {};
      for (let i = 0; i < stackTags.length; i++) {
        tags[stackTags[i].Key] = stackTags[i].Value;
      }

      // Only show kit stacks
      if (!tags.hasOwnProperty("KitId") && stack.StackName !== "CDKToolkit") {
        continue;
      }

      // Render stack card
      renderStackCard(stackDiv, stack, tags);
    }

    parentNode.appendChild(stackDiv);

    // Attach event listeners after rendering
    attachStackEventListeners();
  });
}

/**
 * Renders a single stack card
 * @param {HTMLElement} container - Container element
 * @param {object} stack - Stack object
 * @param {object} tags - Stack tags
 */
function renderStackCard(container, stack, tags) {
  // Determine display name
  let name = stack.StackName;
  const kit = getFromKitMetadata(tags["KitId"]);
  if (kit) {
    name = kit.Name;
  }

  // Create elements
  const stackName = document.createElement("h5");
  stackName.classList.add("sub-heading");
  stackName.innerText = name;

  const stackStatus = document.createElement("p");
  appendHtmlToNode(stackStatus, `<b>Status:</b> ${labelStatus(stack.StackStatus)}`);

  const stackDesc = document.createElement("p");
  stackDesc.innerText = stack.Description || "No description available";

  const stackLinks = document.createElement("p");

  // Inputs link
  const stackInputsLink = document.createElement("a");
  stackInputsLink.innerText = "⬆️ Inputs";
  stackInputsLink.classList = ["stack-info"];
  stackInputsLink.dataset.stackId = stack.StackId;
  stackInputsLink.dataset.action = "showInputs";
  stackLinks.appendChild(stackInputsLink);

  // Outputs link
  const stackOutputsLink = document.createElement("a");
  stackOutputsLink.innerText = "⬇️ Outputs";
  stackOutputsLink.classList = ["stack-info"];
  stackOutputsLink.dataset.stackId = stack.StackId;
  stackOutputsLink.dataset.action = "showOutputs";
  stackLinks.appendChild(stackOutputsLink);

  // Delete link (if needed)
  if (evaluateStatus(stack.StackStatus) === TASK_STATES.FAILED_NEEDS_DELETION) {
    const stackDeleteLink = document.createElement("a");
    stackDeleteLink.innerText = "🗑️ Delete";
    stackDeleteLink.classList = ["stack-info"];
    stackDeleteLink.dataset.stackId = stack.StackId;
    stackDeleteLink.dataset.action = "confirmDelete";
    stackLinks.appendChild(stackDeleteLink);
  }

  // Console link
  const stackConsoleLink = document.createElement("a");
  stackConsoleLink.innerText = "👀 View in Console";
  stackConsoleLink.classList = ["stack-info"];
  stackConsoleLink.dataset.stackId = stack.StackId;
  stackConsoleLink.dataset.action = "goToConsole";
  stackLinks.appendChild(stackConsoleLink);

  // Metadata container
  const stackMetadata = document.createElement("div");
  stackMetadata.id = `${stack.StackId}-metadata`;
  stackMetadata.classList.add("deployed-kit-metadata");

  // Append all elements
  container.appendChild(stackName);
  container.appendChild(stackStatus);
  container.appendChild(stackDesc);
  container.appendChild(stackLinks);
  container.appendChild(stackMetadata);
}

/**
 * Attaches event listeners to stack action links
 */
function attachStackEventListeners() {
  const stackLinks = document.querySelectorAll(".stack-info");

  stackLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const stackId = link.dataset.stackId;
      const action = link.dataset.action;

      if (!stackId || !action) return;

      switch (action) {
        case "showInputs":
          showInputs(stackId);
          break;
        case "showOutputs":
          showOutputs(stackId);
          break;
        case "confirmDelete":
          confirmDeleteStack(stackId);
          break;
        case "goToConsole":
          goToConsole(stackId);
          break;
      }
    });
  });
}

/**
 * Confirms and deletes a stack
 * @param {string} stackId - Stack ID to delete
 */
function confirmDeleteStack(stackId) {
  const stack = allStacks[stackId];
  const stackName = stack ? stack.StackName : stackId;

  if (confirm(`Are you sure you want to delete stack ${stackName}?`)) {
    window.deleteStack(stackId, (err, data) => {
      if (err) {
        console.error("Error deleting stack:", err);
      } else {
        console.log("Stack deletion initiated:", data);
      }
    });
  }
}

/**
 * Gets kit metadata by ID
 * @param {string} kitId - Kit ID
 * @returns {object|null} Kit metadata or null
 */
function getFromKitMetadata(kitId) {
  if (!kitId) return null;
  return kitMetadata && kitMetadata.hasOwnProperty(kitId) ? kitMetadata[kitId] : null;
}

/**
 * Shows stack inputs in the metadata section
 * @param {string} stackId - Stack ID
 */
function showInputs(stackId) {
  const stack = allStacks[stackId];
  if (!stack) return;

  const inputs = stack.Parameters || [];
  const filteredInputs = inputs.filter((param) => param.ParameterKey !== "BootstrapVersion");

  // Get locally stored inputs
  const localInputStore = localStorage.getItem(`${account}-${region}-${stack.StackName}`);
  const localInputs = localInputStore && localInputStore.match(/^\[/) ? JSON.parse(localInputStore) : [];

  const inputDiv = document.createElement("div");

  if (filteredInputs.length === 0 && localInputs.length === 0) {
    const paramDiv = document.createElement("div");
    paramDiv.innerText = "Stack had no inputs.";
    inputDiv.appendChild(paramDiv);
  } else {
    // Show CloudFormation inputs
    filteredInputs.forEach((input) => {
      const paramDiv = document.createElement("div");
      appendHtmlToNode(paramDiv, `<b>${input.ParameterKey}</b>: ${input.ParameterValue}`);
      inputDiv.appendChild(paramDiv);
    });

    // Show local inputs
    localInputs.forEach((input) => {
      const paramDiv = document.createElement("div");
      appendHtmlToNode(paramDiv, `<b>${input.ParameterKey}</b>: ${input.ParameterValue}`);
      inputDiv.appendChild(paramDiv);
    });
  }

  const parentNode = document.getElementById(`${stackId}-metadata`);
  if (parentNode) {
    parentNode.innerText = "";
    parentNode.appendChild(inputDiv);
  }
}

/**
 * Shows stack outputs in the metadata section
 * @param {string} stackId - Stack ID
 */
function showOutputs(stackId) {
  const stack = allStacks[stackId];
  if (!stack) return;

  const outputs = stack.Outputs || [];
  const outputDiv = document.createElement("div");

  if (outputs.length === 0) {
    const paramDiv = document.createElement("div");
    paramDiv.innerText = "Stack had no outputs.";
    outputDiv.appendChild(paramDiv);
  } else {
    outputs.forEach((output) => {
      const paramDiv = document.createElement("div");
      appendHtmlToNode(paramDiv, `<b>${output.OutputKey}</b>: ${output.OutputValue}`);
      outputDiv.appendChild(paramDiv);
    });
  }

  const parentNode = document.getElementById(`${stackId}-metadata`);
  if (parentNode) {
    parentNode.innerText = "";
    parentNode.appendChild(outputDiv);
  }
}

/**
 * Opens the CloudFormation console for a stack
 * @param {string} stackId - Stack ID
 */
function goToConsole(stackId) {
  const consoleUrl = getConsoleUrl(region, stackId, "stackinfo");
  if (consoleUrl) {
    openConsole(consoleUrl);
  }
}

/**
 * Resets all stack monitoring state
 */
function resetStackMonitoring() {
  stackMonitor.reset();

  // Update legacy references
  stackStates = stackMonitor.stackStates;
  lastReportedStates = stackMonitor.lastReportedStates;
  stackEvents = stackMonitor.stackEvents;
  stackInfoRequestors = stackMonitor.stackInfoRequestors;
  stackOutputs = stackMonitor.stackOutputs;
  debugMessages = stackMonitor.debugMessages;
  allStacks = stackMonitor.allStacks;
}

/**
 * Main function to check stack progress
 */
function showStacksProgressFunc() {
  if (!window.loggedIn) {
    return;
  }

  const stacks = window.getStacksInProgress();

  if (Object.keys(stacks).length > 0) {
    for (const stack in stacks) {
      if (stacks[stack].tracking) {
        console.log("checking stack progress for: " + stack);
        window.getStackEvents(stack, stackEventsResponseHandler);
      } else {
        console.log("not tracking: " + stack);
      }
    }
  }
}

/**
 * Callback for processing stack events
 * @param {string} stack - Stack name
 * @param {object} stackStatus - Stack status object
 * @param {Array} states - Array of resource states
 */
const stackEventsResponseHandler = function (stack, stackStatus, states) {
  console.log("stackEventsResponseHandler", stack, stackStatus, states);

  const stacksInProgress = window.getStacksInProgress();

  if (!stackStatus || !stackStatus.hasOwnProperty("Timestamp")) {
    window.getStackInfo(stack, (stackName, outputs) => {
      console.log(outputs);

      if (outputs && outputs.toString().match("does not exist")) {
        console.log("Stack does not exist, yet");
      } else if (stacksInProgress[stack].hasOwnProperty("updateRequested") && stacksInProgress[stack]["updateRequested"]) {
        console.log(`requesting an update to ${stack}`);
      } else if (outputs && outputs.hasOwnProperty("Stacks") && evaluateStatus(outputs.Stacks[0].StackStatus) === TASK_STATES.COMPLETE) {
        window.handleCompletedStack(stackName);
        unlockInstallButton(stacksInProgress[stack].kitId);
        registerProgress(stacksInProgress[stack].kitId, 100, `Kit has already been installed as <b>${stack}</b>.`);
        dispatchEvent(
          new CustomEvent(TASK_EVENTS.DEPLOYMENT_COMPLETE, {
            detail: outputs.Stacks[0].StackName,
          })
        );
        stopMonitoring();
      }
    });
    return;
  }

  // Update event times
  stackMonitor.updateEventTime(stackStatus.Timestamp);

  if (states && states.length > 0) {
    states.forEach((state) => {
      if (state.Timestamp) {
        stackMonitor.updateEventTime(state.Timestamp);
      }
    });
  }

  // Update stack state
  stackMonitor.setStackState(stack, stackStatus);
  stackStates = stackMonitor.stackStates;

  // Check if stack is complete
  if (stackStatus && stackStatus.hasOwnProperty("ResourceStatus")) {
    stacksInProgress[stack].status = stackStatus.ResourceStatus;

    // If stack is complete and has outputs, request them
    if (
      evaluateStatus(stackStatus.ResourceStatus) === TASK_STATES.COMPLETE &&
      stacksInProgress[stack].hasOutputs &&
      !stackInfoRequestors.hasOwnProperty(stack)
    ) {
      stackMonitor.startStackInfoRequestor(stack, requestStackInfo);
      stackInfoRequestors = stackMonitor.stackInfoRequestors;
    }
  } else {
    console.log("stackStatus didn't have ResourceStatus", stackStatus);
  }

  // Update stack events
  if (Object.keys(states).length > 0) {
    stackMonitor.setStackEvents(stack, states);
  } else {
    stackMonitor.setStackEvents(stack, {});
  }
  stackEvents = stackMonitor.stackEvents;

  updateStackEventDisplay(stacksInProgress);
};

/**
 * Displays stack events to the user
 * @param {object} stacks - Stacks in progress
 */
let eventOutput = {};
let previousEventOutput = {};

const updateStackEventDisplay = function (stacks) {
  let inProgressStacks = Object.keys(stacks).length;

  // Initialize output tracking
  for (const thisStack in stackStates) {
    const kitId = stacks[thisStack].kitId;

    if (!eventOutput.hasOwnProperty(kitId)) {
      eventOutput[kitId] = {};
    }

    eventOutput[kitId][thisStack] = "";

    const outputElement = document.getElementById(`${kitId}-cf-stack-states`);
    if (outputElement) {
      previousEventOutput[kitId] = outputElement.innerHTML;
    }
  }

  // Build output for each stack
  for (const thisStack in stackStates) {
    const kitId = stacks[thisStack].kitId;
    const stackState = stackStates[thisStack];
    const resourceTotal = Number(stacks[thisStack].resourceCount);
    const resourceComplete = Object.keys(stackEvents[thisStack] || {}).length;

    // Calculate progress
    let pcComplete = 50;
    if (resourceTotal > 0 && resourceComplete > -1) {
      pcComplete = (resourceComplete / Math.max(resourceTotal, resourceComplete)) * 100;
    }

    // Build stack header
    eventOutput[kitId][thisStack] += `<b>${thisStack}</b>: `;

    // Generate console link
    const consoleLink = ` <a onclick="openConsole('${getConsoleUrl(region, stackState.StackId)}')">View in Console</a><br>`;

    // Check if state changed
    if (stackMonitor.hasStateChanged(thisStack, stackState.ResourceStatus)) {
      phoneHome({
        csk_id: window.resellerConfig.csk_id,
        kit_id: kitId,
        stack_status: stackState.ResourceStatus,
        stack_name: thisStack,
        details: stackState,
      });

      eventOutput[kitId][thisStack] += labelStatus(stackState.ResourceStatus);
      eventOutput[kitId][thisStack] += consoleLink;

      // Handle state transitions
      const state = evaluateStatus(stackState.ResourceStatus);

      if (state === TASK_STATES.COMPLETE) {
        console.log(` **** marking ${thisStack} complete from updateStackEventDisplay *** `);
        registerProgress(kitId, 100, "Deployment complete");
        dispatchEvent(new CustomEvent(TASK_EVENTS.DEPLOYMENT_COMPLETE, { detail: thisStack }));
        dispatchEvent(new Event("POST_STACK_UPDATE"));
        window.handleCompletedStack(thisStack);
        unlockInstallButton(kitId);
        inProgressStacks--;
      } else if (state === TASK_STATES.FAILED) {
        console.log(` **** marking ${thisStack} FAILED from updateStackEventDisplay *** `);
        registerProgress(kitId, 1, "Stack is in failed state and may need to be deleted via the console");
        dispatchEvent(new CustomEvent(TASK_EVENTS.DEPLOYMENT_FAILED, { detail: thisStack }));
        window.handleFailedStack(thisStack);
        unlockInstallButton(kitId);
        inProgressStacks--;
      } else if (state === TASK_STATES.FAILED_NEEDS_DELETION) {
        console.log(` **** marking ${thisStack} FAILED/ROLLED BACK from updateStackEventDisplay *** `);
        registerProgress(kitId, 100, "Stack is in failed state and should be deleted via the console");
        dispatchEvent(new CustomEvent(TASK_EVENTS.DEPLOYMENT_FAILED, { detail: thisStack }));
        window.handleFailedStack(thisStack);
        unlockInstallButton(kitId);
        inProgressStacks--;
      } else if (state === TASK_STATES.DELETED) {
        registerProgress(kitId, 1, "Stack has been deleted");
        dispatchEvent(new CustomEvent(TASK_EVENTS.DEPLOYMENT_FAILED, { detail: thisStack }));
        window.handleFailedStack(thisStack);
        unlockInstallButton(kitId);
        inProgressStacks--;
      } else {
        console.log(`${thisStack} state is ${stackState.ResourceStatus}`);
        registerProgress(kitId, pcComplete);
        window.keepWatchingStack(thisStack);
      }

      stackMonitor.updateLastReportedState(thisStack, stackState.ResourceStatus);
      lastReportedStates = stackMonitor.lastReportedStates;
    } else {
      // Status hasn't changed, still need to register progress
      const state = evaluateStatus(stackState.ResourceStatus);

      if (isTerminalStatus(stackState.ResourceStatus)) {
        inProgressStacks--;
        registerProgress(kitId, state === TASK_STATES.COMPLETE ? 100 : 1);
      } else {
        registerProgress(kitId, pcComplete);
      }

      eventOutput[kitId][thisStack] += labelStatus(stackState.ResourceStatus);
      eventOutput[kitId][thisStack] += consoleLink;
    }

    // Add resource output
    eventOutput[kitId][thisStack] += buildResourceOutput(thisStack, stackState.StackId);
  }

  // Concatenate and display output
  const kitOutputs = {};
  for (const thisStack in stackStates) {
    const kitId = stacks[thisStack].kitId;
    if (!kitOutputs.hasOwnProperty(kitId)) {
      kitOutputs[kitId] = "";
    }
    kitOutputs[kitId] += eventOutput[kitId][thisStack];
  }

  // Update UI if content changed
  for (const kitId in kitOutputs) {
    if (previousEventOutput[kitId] !== kitOutputs[kitId]) {
      const element = document.getElementById(`${kitId}-cf-stack-states`);
      if (element) {
        appendHtmlToNode(element, kitOutputs[kitId]);
      }
    }
  }

  if (inProgressStacks <= 0) {
    console.info("ALL STACKS DONE");
  } else {
    console.info(`${inProgressStacks} stacks left to complete`);
  }
};

/**
 * Builds resource output HTML for a stack
 * @param {string} stackName - Stack name
 * @param {string} stackId - Stack ID
 * @returns {string} HTML string
 */
function buildResourceOutput(stackName, stackId) {
  const events = stackEvents[stackName] || {};
  const resourceLink = `<a onclick="openConsole('${getConsoleUrl(region, stackId, "resources")}')">`;
  let output = "";

  if (Object.keys(events).length > 0) {
    for (const resourceId in events) {
      const resource = events[resourceId];
      const shortenedId = resourceId.replace(stackName.replace(/-stack/, "").replace(/-/g, ""), "");

      output += `├─ <b>${resource.ResourceType}</b> ${resourceLink}<div class="inline-truncated">${shortenedId}</div></a> ${labelStatus(resource.ResourceStatus)}<br>`;
    }
  } else {
    output += "├─ No resources found";
  }

  return output;
}

/**
 * Unlocks the install button for a kit
 * @param {string} kitId - Kit ID
 */
function unlockInstallButton(kitId) {
  console.log("unlocking install button");
  const button = document.getElementById(`${kitId}-install-button`);
  if (button) {
    button.disabled = false;
  }
}

/**
 * Requests stack info (outputs)
 * @param {string} stack - Stack name
 */
const requestStackInfo = function (stack) {
  console.log("Getting outputs for " + stack);
  window.getStackInfo(stack, outputsResponseHandler);
};

/**
 * Callback for outputs retrieval
 * @param {string} stack - Stack name
 * @param {object} outputs - Outputs object
 */
const outputsResponseHandler = function (stack, outputs) {
  if (outputs.hasOwnProperty("Stacks") && outputs.Stacks[0].Outputs.length > 0) {
    // We have the outputs, stop requesting
    stackMonitor.stopStackInfoRequestor(outputs.Stacks[0].StackName);
    stackMonitor.setStackOutputs(outputs.Stacks[0].StackName, outputs.Stacks[0].Outputs);

    // Update legacy references
    stackInfoRequestors = stackMonitor.stackInfoRequestors;
    stackOutputs = stackMonitor.stackOutputs;

    showCfnOutputs(outputs.Stacks[0].StackName);
  }
};

/**
 * Displays CloudFormation outputs
 * @param {string} stack - Stack name
 */
let htmlCfnOutputs = {};

const showCfnOutputs = function (stack) {
  const stacks = window.getStacksInProgress();
  const kitId = stacks[stack].kitId;
  const cfOutDiv = document.getElementById(`${kitId}-cf-stack-outputs`);

  if (!cfOutDiv) return;

  const outputs = stackMonitor.getStackOutputs(stack);

  if (!htmlCfnOutputs.hasOwnProperty(kitId)) {
    htmlCfnOutputs[kitId] = "";
  }

  htmlCfnOutputs[kitId] += `<b>${stack}:</b><br/>`;

  outputs.forEach((output) => {
    htmlCfnOutputs[kitId] += `<b>${output.OutputKey}</b>: ${output.OutputValue}<br>`;
  });

  appendHtmlToNode(cfOutDiv, htmlCfnOutputs[kitId]);
};

/**
 * Handles the response from stack deployment request
 * @param {Error|string} failure - Failure message or error
 * @param {object} success - Success response
 * @param {string} stackName - Stack name
 */
const deployResponseHandler = function (failure, success, stackName) {
  console.log("callback from deploy request", stackName, success, failure);

  const stacks = window.getStacksInProgress();

  if (failure) {
    handleDeploymentFailure(failure, stackName, stacks);
  } else if (success) {
    handleDeploymentSuccess(success, stackName, stacks);
  }

  // Check if region controls can be unlocked
  const checker = setInterval(() => {
    if (regionControlsCanBeUnlocked()) {
      lockRegionControls(false);
      clearInterval(checker);
    }
  }, 3000);

  // Display debug messages
  displayDebugMessages(stacks);
};

/**
 * Handles deployment failure
 * @param {Error|string} failure - Failure message
 * @param {string} stackName - Stack name
 * @param {object} stacks - Stacks in progress
 */
function handleDeploymentFailure(failure, stackName, stacks) {
  // Extract stack name from error if not provided
  if (!stackName) {
    if (failure.hasOwnProperty("StackId")) {
      stackName = failure.StackId.split("/")[1];
    } else if (failure.toString().match(/Stack \[([A-Za-z0-9-]+)\] already exists/)) {
      stackName = failure.toString().match(/Stack \[([A-Za-z0-9-]+)\] already exists/)[1];
    } else {
      stackName = "Unknown";
    }
  }

  if (stackName === "Unknown") {
    console.error("Failure with no stack name");
    return;
  }

  // Handle stack already exists
  if (failure.toString().match(/Stack \[([A-Za-z0-9-]+)\] already exists/)) {
    stopMonitoring();
    registerProgress(stacks[stackName].kitId, 1, failure.toString());
    unlockInstallButton(stacks[stackName].kitId);
    return;
  }

  const failureStr = typeof failure === "object" ? failure.toString() : failure;

  // Handle credential errors
  if (failureStr.match(/credentials/i)) {
    displayCredentialErrors(true, failureStr);
    resetUi();
    registerProgress(stacks[stackName].kitId, 1, failureStr);
    window.handleFailedStack(stackName);
  } else {
    stackMonitor.setDebugMessage(stackName, failureStr);
    debugMessages = stackMonitor.getAllDebugMessages();

    phoneHome({
      csk_id: window.resellerConfig.csk_id,
      kit_id: stacks[stackName].kitId,
      stack_status: "failed",
      stack_name: stackName,
      details: failureStr,
    });

    registerProgress(stacks[stackName].kitId, 1, failureStr);
    window.handleFailedStack(stackName);
  }
}

/**
 * Handles deployment success
 * @param {object} success - Success response
 * @param {string} stackName - Stack name
 * @param {object} stacks - Stacks in progress
 */
function handleDeploymentSuccess(success, stackName, stacks) {
  // Extract stack name if not provided
  if (!stackName && success.hasOwnProperty("StackId")) {
    stackName = success.StackId.split("/")[1];
  }

  stackMonitor.setDebugMessage(stackName, success);
  debugMessages = stackMonitor.getAllDebugMessages();

  // Handle different success types
  if (success.hasOwnProperty("noOp") && success.noOp === true) {
    // Stack already deployed
    console.log(` **** marking ${stackName} complete from deployResponseHandler *** `, success);
    phoneHome({
      csk_id: window.resellerConfig.csk_id,
      kit_id: stacks[stackName].kitId,
      stack_status: "success",
      stack_name: stackName,
      details: success,
    });
    registerProgress(stacks[stackName].kitId, 100, `${stackName} already deployed`);
    window.handleCompletedStack(stackName);
  } else if (success.hasOwnProperty("pipelineExecutionId")) {
    // Pipeline deployment
    addToTaskQueue(new Task(Task.TYPES.KIT_DEPLOYMENT, stackName));
    lockRegionControls(true);
    registerProgress(stacks[stackName].kitId, 1, "Kit uploaded successfully, starting pipeline...please wait");

    const pipelineName = getValueInNamespace(`${account}-${region}`, "PipelineName");
    const url = getPipelineConsoleUrl(region, pipelineName, success.pipelineExecutionId);

    stackMonitor.setDebugMessage(stackName, `Deploying via pipeline: <a onclick="openConsole('${url}')">View in Console</a>`);
    debugMessages = stackMonitor.getAllDebugMessages();

    monitorPipeline(stacks[stackName].kitId, stackName, success.pipelineExecutionId, pipelineName);
  } else if (success.hasOwnProperty("Location")) {
    // S3 upload deployment
    addToTaskQueue(new Task(Task.TYPES.KIT_DEPLOYMENT, stackName));
    lockRegionControls(true);
    registerProgress(stacks[stackName].kitId, 1, "Kit uploaded successfully, starting deployment pipeline...");

    stackMonitor.setDebugMessage(
      stackName,
      `Deploying via pipeline: <a onclick="openConsole('https://${region}.console.aws.amazon.com/codesuite/codepipeline/pipelines')">View in Console</a>`
    );
    debugMessages = stackMonitor.getAllDebugMessages();
  } else {
    // Standard deployment
    addToTaskQueue(new Task(Task.TYPES.KIT_DEPLOYMENT, stackName));
    lockRegionControls(true);
    registerProgress(stacks[stackName].kitId, 1, "Kit uploaded successfully, starting deployment...please wait");
  }
}

/**
 * Displays debug messages for all stacks
 * @param {object} stacks - Stacks in progress
 */
function displayDebugMessages(stacks) {
  const kitResponses = {};
  const allDebugMessages = stackMonitor.getAllDebugMessages();

  // Group messages by kit
  for (const stack in allDebugMessages) {
    const kitId = stacks[stack].kitId;
    if (!kitResponses.hasOwnProperty(kitId)) {
      kitResponses[kitId] = {};
    }
  }

  // Format messages
  for (const stack in allDebugMessages) {
    const kitId = stacks[stack].kitId;
    const message = allDebugMessages[stack];

    kitResponses[kitId][stack] = "";

    if (typeof message === "object") {
      kitResponses[kitId][stack] += `<b>${stack}</b>: ${JSON.stringify(message, null, 4)}<br>`;
    } else {
      const cssClass = message.match(/failed|error/i) ? "error" : "success";
      kitResponses[kitId][stack] += `<b>${stack}</b>: <span class="${cssClass}">${message}</span><br>`;
    }
  }

  // Concatenate and display
  const cfnResponseOutputs = {};
  for (const kitId in kitResponses) {
    cfnResponseOutputs[kitId] = "";
    for (const stack in kitResponses[kitId]) {
      cfnResponseOutputs[kitId] += kitResponses[kitId][stack];
    }

    const outputElement = document.getElementById(`${kitId}-deploystack-output`);
    if (outputElement) {
      appendHtmlToNode(outputElement, cfnResponseOutputs[kitId]);
    }
  }
}

/**
 * Monitors pipeline execution status
 * @param {string} kitId - Kit ID
 * @param {string} stackName - Stack name
 * @param {string} execId - Execution ID
 * @param {string} pipelineName - Pipeline name
 */
function monitorPipeline(kitId, stackName, execId, pipelineName) {
  const checker = setInterval(() => {
    window.getPipelineStatus(execId, (err, data) => {
      if (err) {
        console.log(err);
        clearInterval(checker);
        unlockInstallButton(kitId);
        registerProgress(kitId, 1, "Pipeline failed - check the console for more information");
        window.handleFailedStack(stackName);
        return;
      }

      if (!data.hasOwnProperty("pipelineExecution") || !data.pipelineExecution.hasOwnProperty("status")) {
        return;
      }

      const status = data.pipelineExecution.status;
      const url = getPipelineConsoleUrl(region, pipelineName, execId);
      const statusLabel = labelStatus(status).replace(/([a-z0-9])([A-Z])/g, "$1 $2");

      const output = `<span class="success"><b>Pipeline Status:</b> ${statusLabel}&nbsp;&nbsp;&nbsp;<a onclick="openConsole('${url}')">View in Console</a></span><br>`;

      const outputElement = document.getElementById(`${kitId}-deploystack-output`);
      if (outputElement) {
        appendHtmlToNode(outputElement, output);
      }

      if (status === "Succeeded") {
        clearInterval(checker);
        unlockInstallButton(kitId);
        registerProgress(kitId, 100, `${stackName} deployed successfully`);
        window.handleCompletedStack(stackName);
      } else if (status === "Failed") {
        clearInterval(checker);
        unlockInstallButton(kitId);
        registerProgress(kitId, 1, `Failed to deploy ${stackName} - check the console for more information`);
        window.handleFailedStack(stackName);
      } else {
        updateProgressBarMessage(kitId, `${stackName} deployment: ${status.replace(/([a-z0-9])([A-Z])/g, "$1 $2")}`);
      }
    });
  }, 5000);
}

/**
 * Resets all kit monitors
 */
function resetAllKitMonitors() {
  console.log("resetting all kit monitors");

  for (const kitId in kitMetadata) {
    try {
      registerProgress(kitId, 1);

      const elements = [`${kitId}-deploystack-output`, `${kitId}-cf-stack-states`, `${kitId}-cf-stack-outputs`];

      elements.forEach((elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
          appendHtmlToNode(element, "");
        }
      });

      const installButton = document.getElementById(`${kitId}-install-button`);
      if (installButton) {
        installButton.disabled = false;
      }

      const progressElement = document.getElementById(`${kitId}-deployment-progress`);
      if (progressElement) {
        progressElement.style.display = "none";
      }

      const detailsElement = document.getElementById(`${kitId}-deployment-details`);
      if (detailsElement) {
        detailsElement.style.display = "none";
      }

      hideConfigForKit(kitId);
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * Registers progress for a kit
 * @param {string} kitId - Kit ID
 * @param {number} value - Progress value (0-100)
 * @param {string} message - Optional message
 */
function registerProgress(kitId, value, message = "") {
  if (!progressBars || !progressBars[kitId]) return;

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

/**
 * Updates progress bar message
 * @param {string} kitId - Kit ID
 * @param {string} message - Message to display
 */
function updateProgressBarMessage(kitId, message) {
  if (message && progressBars && progressBars[kitId]) {
    progressBars[kitId][2].textContent = message;
  }
}

/**
 * Starts monitoring
 */
function startMonitoring() {
  stackMonitor.startMonitoring();
}

/**
 * Stops monitoring
 */
function stopMonitoring() {
  stackMonitor.stopMonitoring();
}

/**
 * Handles monitoring timeout
 * @param {number} timeout - Timeout value in seconds
 */
function handleMonitoringTimeout(timeout) {
  displayErrors(
    `Monitoring timeout reached - ${timeout}s has passed with no new events. Check the status of your stacks in the CloudFormation console.`
  );
}

/**
 * Clears a specific stack monitor
 * @param {string} stackName - Stack name
 */
function clearStackMonitor(stackName) {
  window.clearTrackedStacks(stackName);
}

/**
 * Clears all stack monitors
 */
function clearStackMonitors() {
  window.clearTrackedStacks();
}
