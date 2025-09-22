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
