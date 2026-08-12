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

// Stack status constants and helpers
const TASK_STATES = {
  WAITING: "waiting",
  STARTED: "started",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETE: "COMPLETE",
  FAILED: "FAILED",
  FAILED_NEEDS_DELETION: "FAILED_NEEDS_DELETION",
  DELETED: "DELETED",
  DELETE_FAILED: "DELETE_FAILED",
};

const BOUNCY_BOX = `<span class="la-square-jelly-box la-dark la-sm" style="margin-left: 3px; margin-right: 10px; margin-bottom: -1px; display: inline-block; color: black; height: 12px; width: 12px;"><div></div><div></div></span>`;

function evaluateStatus(status) {
  if (!status) return TASK_STATES.IN_PROGRESS;
  const statusUpper = status.toUpperCase();
  if (statusUpper.match(/(CREATE_COMPLETE|UPDATE_COMPLETE|IMPORT_COMPLETE|UPDATE_ROLLBACK_COMPLETE)/)) {
    return TASK_STATES.COMPLETE;
  }
  if (statusUpper.match(/(ROLLBACK_COMPLETE|CREATE_FAILED|UPDATE_ROLLBACK_FAILED|ROLLBACK_FAILED)/)) {
    return TASK_STATES.FAILED_NEEDS_DELETION;
  }
  if (statusUpper.match(/DELETE_COMPLETE/)) return TASK_STATES.DELETED;
  if (statusUpper.match(/DELETE_FAILED/)) return TASK_STATES.DELETE_FAILED;
  if (statusUpper.match(/FAILED/)) return TASK_STATES.FAILED;
  return TASK_STATES.IN_PROGRESS;
}

function labelStatus(status) {
  if (!status) return BOUNCY_BOX;
  const state = evaluateStatus(status);
  switch (state) {
    case TASK_STATES.COMPLETE:
      return `${status}  ✅`;
    case TASK_STATES.FAILED:
    case TASK_STATES.FAILED_NEEDS_DELETION:
    case TASK_STATES.DELETED:
    case TASK_STATES.DELETE_FAILED:
      return `${status}  ❌`;
    default:
      return `${status}  ${BOUNCY_BOX}`;
  }
}

function getConsoleUrl(region, stackId, view = "stackinfo") {
  if (!region || !stackId) return "";
  return `https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/${view}?stackId=${stackId}`;
}

function getPipelineConsoleUrl(region, pipelineName, executionId = null) {
  if (!region || !pipelineName) return "";
  const baseUrl = `https://${region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipelineName}`;
  if (executionId) {
    return `${baseUrl}/executions/${executionId}/visualization?region=${region}`;
  }
  return baseUrl;
}

function isTerminalStatus(status) {
  const state = evaluateStatus(status);
  return [
    TASK_STATES.COMPLETE,
    TASK_STATES.FAILED,
    TASK_STATES.FAILED_NEEDS_DELETION,
    TASK_STATES.DELETED,
    TASK_STATES.DELETE_FAILED,
  ].includes(state);
}

function isSuccessStatus(status) {
  return evaluateStatus(status) === TASK_STATES.COMPLETE;
}

function isFailedStatus(status) {
  const state = evaluateStatus(status);
  return [TASK_STATES.FAILED, TASK_STATES.FAILED_NEEDS_DELETION, TASK_STATES.DELETE_FAILED].includes(state);
}
/**
 * StackMonitor Class
 * Manages CloudFormation stack monitoring with polling and state tracking
 */

/**
 * StackMonitor handles the lifecycle of monitoring CloudFormation stacks
 * Encapsulates polling logic, state management, and timeout handling
 */
class StackMonitor {
  constructor(options = {}) {
    // Configuration
    this.preMonitoringDelay = options.preMonitoringDelay || 1; // seconds
    this.monitoringTimeout = options.monitoringTimeout || 1800; // seconds
    this.pollInterval = options.pollInterval || 3000; // milliseconds
    this.timeoutCheckInterval = options.timeoutCheckInterval || 3000; // milliseconds

    // State tracking
    this.stackStates = {};
    this.lastReportedStates = {};
    this.stackEvents = {};
    this.stackInfoRequestors = {};
    this.stackOutputs = {};
    this.debugMessages = {};
    this.allStacks = {};
    this.eventOutput = {};
    this.previousEventOutput = {};
    this.htmlCfnOutputs = {};

    // Timing
    this.mostRecentEventTime = null;

    // Polling instances
    this.mainMonitor = null;
    this.timeoutMonitor = null;

    // Callbacks
    this.onStackUpdate = options.onStackUpdate || null;
    this.onTimeout = options.onTimeout || null;
  }

  /**
   * Starts monitoring with a delay
   */
  startMonitoring() {
    console.log(`Stack monitoring starting in ${this.preMonitoringDelay}s`);

    setTimeout(() => {
      this.mainMonitor = setInterval(() => {
        this._pollStacks();
      }, this.pollInterval);

      this.timeoutMonitor = setTimeout(() => {
        this._checkTimeout();
      }, this.monitoringTimeout * 1000);
    }, this.preMonitoringDelay * 1000);
  }

  /**
   * Stops all monitoring activities
   */
  stopMonitoring() {
    console.log("Stack monitoring STOPPED");

    if (this.mainMonitor) {
      clearInterval(this.mainMonitor);
      this.mainMonitor = null;
    }

    if (this.timeoutMonitor) {
      clearTimeout(this.timeoutMonitor);
      this.timeoutMonitor = null;
    }

    // Clear all stack info requestors
    Object.keys(this.stackInfoRequestors).forEach((stack) => {
      clearInterval(this.stackInfoRequestors[stack]);
    });
    this.stackInfoRequestors = {};
  }

  /**
   * Resets all state to initial values
   */
  reset() {
    this.stopMonitoring();

    this.stackStates = {};
    this.lastReportedStates = {};
    this.stackEvents = {};
    this.stackInfoRequestors = {};
    this.stackOutputs = {};
    this.debugMessages = {};
    this.allStacks = {};
    this.eventOutput = {};
    this.previousEventOutput = {};
    this.htmlCfnOutputs = {};
    this.mostRecentEventTime = null;
  }

  /**
   * Updates the most recent event time
   * @param {Date|string|number} timestamp - Event timestamp
   */
  updateEventTime(timestamp) {
    const eventTime = new Date(timestamp).getTime();

    if (!this.mostRecentEventTime || eventTime > this.mostRecentEventTime) {
      this.mostRecentEventTime = eventTime;
    }
  }

  /**
   * Sets the state for a stack
   * @param {string} stackName - Stack name
   * @param {object} state - Stack state object
   */
  setStackState(stackName, state) {
    if (!this.stackStates[stackName]) {
      this.stackStates[stackName] = {};
    }
    this.stackStates[stackName] = state;
  }

  /**
   * Gets the state for a stack
   * @param {string} stackName - Stack name
   * @returns {object|null} Stack state or null
   */
  getStackState(stackName) {
    return this.stackStates[stackName] || null;
  }

  /**
   * Sets events for a stack
   * @param {string} stackName - Stack name
   * @param {object} events - Stack events object
   */
  setStackEvents(stackName, events) {
    this.stackEvents[stackName] = events || {};
  }

  /**
   * Gets events for a stack
   * @param {string} stackName - Stack name
   * @returns {object} Stack events
   */
  getStackEvents(stackName) {
    return this.stackEvents[stackName] || {};
  }

  /**
   * Checks if a stack's state has changed
   * @param {string} stackName - Stack name
   * @param {string} currentStatus - Current status
   * @returns {boolean} True if state changed
   */
  hasStateChanged(stackName, currentStatus) {
    return this.lastReportedStates[stackName] !== currentStatus;
  }

  /**
   * Updates the last reported state
   * @param {string} stackName - Stack name
   * @param {string} status - Status to record
   */
  updateLastReportedState(stackName, status) {
    this.lastReportedStates[stackName] = status;
  }

  /**
   * Starts requesting stack info at intervals
   * @param {string} stackName - Stack name
   * @param {Function} callback - Callback function
   * @param {number} interval - Interval in milliseconds
   */
  startStackInfoRequestor(stackName, callback, interval = 3000) {
    if (!this.stackInfoRequestors[stackName]) {
      this.stackInfoRequestors[stackName] = setInterval(callback, interval, stackName);
    }
  }

  /**
   * Stops requesting stack info for a stack
   * @param {string} stackName - Stack name
   */
  stopStackInfoRequestor(stackName) {
    if (this.stackInfoRequestors[stackName]) {
      clearInterval(this.stackInfoRequestors[stackName]);
      delete this.stackInfoRequestors[stackName];
    }
  }

  /**
   * Sets outputs for a stack
   * @param {string} stackName - Stack name
   * @param {Array} outputs - Stack outputs array
   */
  setStackOutputs(stackName, outputs) {
    this.stackOutputs[stackName] = outputs;
  }

  /**
   * Gets outputs for a stack
   * @param {string} stackName - Stack name
   * @returns {Array} Stack outputs
   */
  getStackOutputs(stackName) {
    return this.stackOutputs[stackName] || [];
  }

  /**
   * Sets a debug message for a stack
   * @param {string} stackName - Stack name
   * @param {string|object} message - Debug message
   */
  setDebugMessage(stackName, message) {
    this.debugMessages[stackName] = message;
  }

  /**
   * Gets debug message for a stack
   * @param {string} stackName - Stack name
   * @returns {string|object|null} Debug message
   */
  getDebugMessage(stackName) {
    return this.debugMessages[stackName] || null;
  }

  /**
   * Gets all debug messages
   * @returns {object} All debug messages
   */
  getAllDebugMessages() {
    return this.debugMessages;
  }

  /**
   * Sets all stacks data
   * @param {object} stacks - Stacks object keyed by stack ID
   */
  setAllStacks(stacks) {
    this.allStacks = stacks;
  }

  /**
   * Gets all stacks data
   * @returns {object} All stacks
   */
  getAllStacks() {
    return this.allStacks;
  }

  /**
   * Gets a specific stack by ID
   * @param {string} stackId - Stack ID
   * @returns {object|null} Stack object or null
   */
  getStack(stackId) {
    return this.allStacks[stackId] || null;
  }

  /**
   * Private method to poll stacks
   */
  _pollStacks() {
    if (this.onStackUpdate && typeof this.onStackUpdate === "function") {
      this.onStackUpdate();
    }
  }

  /**
   * Private method to check for timeout
   */
  _checkTimeout() {
    const timeNow = new Date().getTime();
    const timeSinceLastEvent = timeNow - (this.mostRecentEventTime || timeNow);

    if (timeSinceLastEvent > this.monitoringTimeout * 1000) {
      console.warn(`Monitoring timeout reached after ${this.monitoringTimeout}s`);

      if (this.onTimeout && typeof this.onTimeout === "function") {
        this.onTimeout(this.monitoringTimeout);
      }

      this.stopMonitoring();
    } else {
      // Schedule next check
      this.timeoutMonitor = setTimeout(() => {
        this._checkTimeout();
      }, this.timeoutCheckInterval);
    }
  }

  /**
   * Gets the count of stacks being monitored
   * @returns {number} Number of stacks
   */
  getStackCount() {
    return Object.keys(this.stackStates).length;
  }

  /**
   * Checks if monitoring is active
   * @returns {boolean} True if monitoring
   */
  isMonitoring() {
    return this.mainMonitor !== null;
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = StackMonitor;
}
