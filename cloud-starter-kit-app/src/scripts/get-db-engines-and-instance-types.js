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
