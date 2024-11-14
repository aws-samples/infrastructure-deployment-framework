// job queue, tracks until complete state but not longer than that
let taskQueue = [];
const TASK_TYPES = {
  KIT_DEPLOYMENT: "kit-deployment",
  REGIONAL_PIPELINE_BUILD: "regional-pipeline-build",
  REGIONAL_DATA_LOADING: "regional-data-load",
  CREATE_KEY: "create-key-pair",
  OTHER: "other"
};
const TASK_STATES = {
  WAITING: "waiting",
  STARTED: "started",
  IN_PROGRESS: "in-progress",
  COMPLETE: "complete",
  FAILED: "failed",
  FAILED_NEEDS_DELETION: "failed-needs-deletion",
  DELETED: "deleted",
  DELETE_FAILED: "delete-failed"
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
Object.defineProperty(Task, 'TYPES', {
  value: TASK_TYPES,
  writable: false, // makes the property read-only
});
Object.defineProperty(Task, 'STATES', {
  value: TASK_STATES,
  writable: false,
});
Object.defineProperty(Task, 'EVENTS', {
  value: TASK_EVENTS,
  writable: false,
});

function evaluateStatus(stackStatus) {
  if (stackStatus.match(/(ATE_COMPLETE|UPDATE_ROLLBACK_COMPLETE|Succeeded)$/)) {
    return TASK_STATES.COMPLETE;
  }
  else if (stackStatus.match(/^(CREATE_FAILED|ROLLBACK_COMPLETE|ROLLBACK_FAILED|UPDATE_ROLLBACK_FAILED|Failed)/)) {
    return TASK_STATES.FAILED_NEEDS_DELETION;
  }
  else if (stackStatus.match(/DELETE_FAILED/)) {
    return TASK_STATES.FAILED;
  }
  else if (stackStatus.match(/DELETE_COMPLETE/)) {
    return TASK_STATES.DELETED;
  }
  else if (stackStatus.match(/(_IN_PROGRESS|InProgress)/)) {
    return TASK_STATES.IN_PROGRESS;
  }
  else {
    return TASK_STATES.FAILED;
  }
}

addEventListener('LOADING_COMPLETE', checkTasks);
addEventListener('KEY_READY', checkTasks);
addEventListener('DEPLOYMENT_COMPLETE', checkTasks);
addEventListener('DEPLOYMENT_FAILED', checkTasks);

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
            checkStackComplete('csk-cdk-app-delivery-pipeline-stack', taskQueue, i);
          }
          else if (event.type === TASK_EVENTS.DEPLOYMENT_FAILED) {
            taskQueue[i].state = TASK_STATES.FAILED;
          }
          break;
        case TASK_TYPES.REGIONAL_DATA_LOADING:
          //test to see if done
          if (event.type === TASK_EVENTS.LOADING_COMPLETE) {
            taskQueue[i].state = TASK_STATES.COMPLETE;
          }
          else {
            taskQueue[i].state = TASK_STATES.IN_PROGRESS;
            taskQueue[i].lastCheck = new Date();
          }
          break
        case TASK_TYPES.CREATE_KEY:
          //test to see if done
          if (event.type === TASK_EVENTS.KEY_READY) {
            taskQueue[i].state = TASK_STATES.COMPLETE;
          }
          else {
            taskQueue[i].state = TASK_STATES.IN_PROGRESS;
            taskQueue[i].lastCheck = new Date();
          }
          break
        default:
          break;
      }
    }
    removeCompletedTasks();
  }
  else {
    console.log("No tasks in queue")
  }
}

function checkTasksFromStackList() {
  for (let i = 0; i < taskQueue.length; i++) {
    if (taskQueue[i].type === TASK_TYPES.KIT_DEPLOYMENT) {
      checkStackComplete(taskQueue[i].name, taskQueue, i + 0);
    }
    else if (taskQueue[i].type === TASK_TYPES.REGIONAL_PIPELINE_BUILD) {
      checkStackComplete('csk-cdk-app-delivery-pipeline-stack', taskQueue, i + 0);
    }
  }
}

function checkStackComplete(stackName, taskQ, taskIndex) {
  console.log("checkStackComplete", stackName, taskQ, taskIndex)
  // if (!taskIndex) {
  //   console.trace("taskIndex is not set OUTSIDE checkStackComplete", stackName)
  // }
  let ti = taskIndex;
  let callback = function (err, data) {
    console.log(`inside callback ${taskIndex} = ${ti}`)
    if (ti === 'undefined') {
      console.log(`${ti} is not set inside checkStackComplete`, data)
    }
    if (err) {
      if (!err.message.match("does not exist")) {
        console.error(err);
        taskQ[ti].state = TASK_STATES.FAILED;
      }
      else {
        taskQ[ti].state = TASK_STATES.WAITING;
        taskQ[ti].lastCheck = new Date();
      }
    }
    else {
      console.log(data)
      taskQ[ti].state = evaluateStatus(data.Stacks[0].StackStatus);
      taskQ[ti].lastCheck = new Date();
      if (taskQ[ti].state === TASK_STATES.COMPLETE) {
        if (data.Stacks[0].Outputs.length > 0 && data.Stacks[0].Outputs[0].ExportName === "CskSourceBucketName") {
          setValueInNamespace(`${account}-${region}`, 'SourceBucket', data.Stacks[0].Outputs[0].OutputValue);
        }
      }
    }
  }
  window.getStackStatus(stackName, callback)
}

function removeCompletedTasks() {
  let temp = [];
  for (let i = 0; i < taskQueue.length; i++) {
    if (taskQueue[i].state === TASK_STATES.COMPLETE || taskQueue[i].state === TASK_STATES.DELETED) {
      if (TASK_TYPES.KIT_DEPLOYMENT === taskQueue[i].type) {
        reenableKitButton(taskQueue[i].name);
      }
      console.trace(`${taskQueue[i].type} taken out of the task queue with nothing further to do`);
    }
    else if (taskQueue[i].state === TASK_STATES.FAILED) {
      if (TASK_TYPES.KIT_DEPLOYMENT === taskQueue[i].type) {
        reenableKitButton(taskQueue[i].name);
      }
      console.trace(`${taskQueue[i].type} taken out of the task queue because it failed`);
    }
    else if (taskQueue[i].state === TASK_STATES.FAILED_NEEDS_DELETION) {
      if (TASK_TYPES.KIT_DEPLOYMENT === taskQueue[i].type) {
        reenableKitButton(taskQueue[i].name);
        showDeleteKitButton(taskQueue[i].name);
      }
      console.trace(`${taskQueue[i].type} taken out of the task queue - failed and needs deletion`);
    }
    else {
      temp.push(taskQueue[i]);
    }
  }
  taskQueue = temp;
}

function regionControlsCanBeUnlocked() {
  if (taskQueue.length === 0) {
    return true;
  }
  else {
    for (let i = 0; i < taskQueue.length; i++) {
      if (taskQueue[i].type === TASK_TYPES.REGIONAL_DATA_LOADING && taskQueue[i].state !== TASK_STATES.COMPLETE) {
        return false;
      }
      else if (taskQueue[i].type === TASK_TYPES.REGIONAL_PIPELINE_BUILD && taskQueue[i].state !== TASK_STATES.COMPLETE) {
        return false;
      }
      else if (taskQueue[i].type === TASK_TYPES.KIT_DEPLOYMENT && taskQueue[i].state !== TASK_STATES.COMPLETE) {
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
  }
  else {
    lockRegionControls(false);
  }
  document.getElementById("tasks-display").innerText = `${taskQueue.length > 0 ? taskQueue.length : 'No'} task${taskQueue.length > 1 ? 's' : ''} running`;
}

setInterval(checkTasksFromStackList, 5000)
setInterval(removeCompletedTasks, 5000)
setInterval(showTaskQueueLength, 1000)