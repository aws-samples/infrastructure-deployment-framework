
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const { fromEnv } = require("@aws-sdk/credential-providers");
const { CloudFormationClient, DescribeStacksCommand, DescribeStackEventsCommand, CreateStackCommand, ValidateTemplateCommand, DeleteStackCommand } = require('@aws-sdk/client-cloudformation');
const { CodePipelineClient, StartPipelineExecutionCommand, GetPipelineExecutionCommand } = require('@aws-sdk/client-codepipeline');
const { EC2Client, DescribeRegionsCommand, DescribeVpcsCommand, DescribeSubnetsCommand, DescribeKeyPairsCommand, CreateKeyPairCommand, DescribeManagedPrefixListsCommand, DescribeInstanceTypesCommand, DescribeImagesCommand, DescribeVpcEndpointsCommand, DescribeInstanceConnectEndpointsCommand } = require('@aws-sdk/client-ec2');
const { IAMClient, GetCredentialReportCommand } = require('@aws-sdk/client-iam');
const { Upload } = require('@aws-sdk/lib-storage');
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const { SSMClient, GetParametersByPathCommand } = require('@aws-sdk/client-ssm');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const { RDSClient, DescribeDBEngineVersionsCommand, DescribeOrderableDBInstanceOptionsCommand } = require("@aws-sdk/client-rds");
const { Route53Client, ListHostedZonesCommand } = require("@aws-sdk/client-route-53");
const { rootPath } = require('electron-root-path');
const path = require('path');
const fs = require("fs");
const JSZip = require("jszip");
const yaml = require("js-yaml");

const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('api', {
  saveFile: (fileName, fileData) => ipcRenderer.send('save-file-to-desktop', fileName, fileData),
  getHosts: () => {
    return window.hosts
  },
  restartApp: () => ipcRenderer.send('restart-app')
})

window.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  ipcRenderer.send('show-context-menu')
})

ipcRenderer.on('getHosts', (event, message) => {
  window.hosts = message;
  localStorage.setItem("hosts", JSON.stringify(message));
});

// stacks holds references to all the stacks we are deploying or have deployed in this session
const stacks = {};

process.env.ELECTRON_ENABLE_LOGGING = true;
// process.versions['sdk'] = sdk.VERSION;

//set default region
let REGION = process.env.AWS_DEFAULT_REGION || 'us-east-1';

//keep record of current account
let ACCOUNT = null;

function openInBrowser(url) {
  require('electron').shell.openExternal(url);
}
contextBridge.exposeInMainWorld('openInBrowser', (url) => openInBrowser(url))

function setFileHost(url) {
  process.env.FILE_HOST = url
}
contextBridge.exposeInMainWorld('setFileHost', (url) => setFileHost(url))

/* 
* Credential management
*/

function checkIfCredsAvailable(callback) {
  if (process.env.hasOwnProperty('AWS_ACCESS_KEY_ID') && process.env.hasOwnProperty('AWS_SECRET_ACCESS_KEY')) {
    configureSdkFromEnv(callback);
  }
}
contextBridge.exposeInMainWorld('checkIfCredsAvailable', (callback) => checkIfCredsAvailable(callback))

//When the user submits credentials in the UI, this gets called

function setCredentials(data, callback) {
  try {
    let rows = data.split("\n");
    if (rows.length < 2) {
      // Need at least 3 rows of data
      callback(new Error("You haven't supplied sufficient information in either the pasted credentials or the supplied key and secret. Please check your inputs and try again."))
    }
    else {
      /* 
      * Parse the input text and find the credentials. 
      * NB we don't know if these creds are valid until we check them using 
      * sts.getCallerIdentity further down
      */
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].match(/AWS_ACCESS_KEY_ID/)) {
          let accessKey = rows[i].split('=')[1].replace(/\W/, '').substring(0, 20)
          if (rows[i].includes(accessKey)) {
            process.env['AWS_ACCESS_KEY_ID'] = accessKey
          }
          else {
            console.log("parsed 'AWS_ACCESS_KEY_ID' didn't match input")
          }
        }
        else if (rows[i].match(/AWS_SECRET_ACCESS_KEY/)) {
          let secretKey = rows[i].split('=')[1].replace(/[^\w/+]/, '').substring(0, 40)
          if (rows[i].includes(secretKey)) {
            process.env['AWS_SECRET_ACCESS_KEY'] = secretKey
          }
          else {
            console.log("parsed 'AWS_SECRET_ACCESS_KEY' didn't match input")

          }
        }
        else if (rows[i].match(/AWS_SESSION_TOKEN/)) {
          let sessToken = rows[i].replace(/.+?=/, '').replace(/[^\w/+=]/, '')
          if (rows[i].includes(sessToken)) {
            process.env['AWS_SESSION_TOKEN'] = sessToken
          }
          else {
            console.log("parsed 'AWS_SESSION_TOKEN' didn't match input")
          }
        }
      }
      // console.log(envVars)
      if (process.env.hasOwnProperty('AWS_ACCESS_KEY_ID') && process.env.hasOwnProperty('AWS_SECRET_ACCESS_KEY')) {
        // Let's see if the credentials work
        configureSdkFromEnv(callback, true);
      }
      else {
        callback(new Error("Wasn't able to parse valid credentials from pasted text!"))
      }
    }
  }
  catch (e) {
    console.log(e);
    callback(new Error("Credential processing failed: " + JSON.stringify(e)))
  }
}

contextBridge.exposeInMainWorld('setCredentials', (data, cb) => setCredentials(data, cb))

async function configureSdkFromEnv(callback, showError = false) {
  let sts = new STSClient({
    region: REGION,
    credentials: fromEnv(),
  })
  const command = new GetCallerIdentityCommand();
  await sts.send(command).then((data) => {
    if (data.Account !== process.env.CDK_DEFAULT_ACCOUNT) {
      resetStacks();
    }
    let credentialSummary = {};
    credentialSummary['AWS_SECRET_ACCESS_KEY'] = process.env['AWS_SECRET_ACCESS_KEY'].split('').map(x => "*").join('');
    credentialSummary['AWS_ACCESS_KEY_ID'] = process.env['AWS_ACCESS_KEY_ID']
    credentialSummary['AWS_ACCOUNT_ID'] = process.env.CDK_DEFAULT_ACCOUNT = ACCOUNT = data.Account;
    credentialSummary['IDENTITY'] = data.Arn.split(':').pop()
    credentialSummary['SDK_VERSION'] = sts.SDK_VERSION;
    try {
      callback(null, credentialSummary)
    }
    catch (e) {
      console.trace(e)
    }
  }, (err) => {
    if (showError) {
      callback(new Error("Unable to create a session with the current supplied credentials."))
    }
    else {
      callback(null, null)
    }
  })
}

async function checkSession(callback) {
  // console.log("checking session")
  if (process.env.hasOwnProperty('AWS_ACCESS_KEY_ID')) {
    let sts = new STSClient({
      region: REGION,
      credentials: fromEnv(),
    });
    const command = new GetCallerIdentityCommand();
    await sts.send(command).then((data) => {
      callback(null, data)
    }, (err) => {
      callback(err, null)
    })
  }
}
contextBridge.exposeInMainWorld('checkSession', (callback) => checkSession(callback))

/* 
* Once we have credentials, find the regions that are available to this identity
*/
async function getRegions(callback) {
  let client = new EC2Client({
    region: REGION,
    credentials: fromEnv(),
  });
  const input = {};
  const command = new DescribeRegionsCommand(input);
  await client.send(command).then((data) => {
    callback(null, data)
  }, (err) => {
    callback(err, null)
  })
}
contextBridge.exposeInMainWorld('getRegions', (cb) => getRegions(cb))

// unlikely to have the necessary permissions to do these

// function optIntoRegion(region, account, callback) {
//   let accountClient = new sdk.Account({ apiVersion: '2021-02-01', region: 'us-east-1' });
//   accountClient.enableRegion({ "RegionName": region, "AccountId": account }, callback)
// }
// contextBridge.exposeInMainWorld('optIntoRegion', (region, account, cb) => optIntoRegion(region, account, cb))

// function getAccountInfo(account, callback) {
//   let accountClient = new sdk.Account({ apiVersion: '2021-02-01', region: 'us-east-1' });
//   accountClient.getContactInformation({ "AccountId": account }, callback)
// }
// contextBridge.exposeInMainWorld('getAccountInfo', (account, cb) => getAccountInfo(account, cb))

/*
* These functions fetch info from the account that we use in the UI
*/
async function getVpcs(callback) {
  const ec2 = new EC2Client({
    region: REGION,
    credentials: fromEnv(),
  });
  const input = {};
  const command = new DescribeVpcsCommand(input);
  await ec2.send(command).then((data) => {
    callback(null, data)
  }, (err) => {
    callback(err, null)
  })
}
contextBridge.exposeInMainWorld('getVpcs', (cb) => getVpcs(cb))

async function getSubnets(callback) {
  let ec2 = new EC2Client({
    region: REGION,
    credentials: fromEnv(),
  });
  const input = {};
  const command = new DescribeSubnetsCommand(input);
  await ec2.send(command).then((data) => {
    callback(null, data)
  }, (err) => {
    callback(err, null)
  })
}
contextBridge.exposeInMainWorld('getSubnets', (cb) => getSubnets(cb))

async function getEc2KeyPairs(callback) {
  let ec2 = new EC2Client({
    region: REGION,
    credentials: fromEnv(),
  });
  const input = {};
  const command = new DescribeKeyPairsCommand(input);
  await ec2.send(command).then((data) => {
    callback(null, data)
  }, (err) => {
    callback(err, null)
  })
}
contextBridge.exposeInMainWorld('getEc2KeyPairs', (cb) => getEc2KeyPairs(cb))

async function getAmis(params, callback) {
  let ssm = new SSMClient({
    region: REGION,
    credentials: fromEnv(),
  });
  const command = new GetParametersByPathCommand(params);
  await ssm.send(command).then((data) => {
    callback(null, data)
  }, (err) => {
    callback(err, null)
  })
}
contextBridge.exposeInMainWorld('getAmis', (params, cb) => getAmis(params, cb))

async function describeAmis(params, callback) {
  let ec2 = new EC2Client({
    region: REGION,
    credentials: fromEnv(),
  });
  const command = new DescribeImagesCommand(params);
  await ec2.send(command).then((data) => {
    callback(null, data)
  }, (err) => {
    callback(err, null)
  })
}
contextBridge.exposeInMainWorld('describeAmis', (params, cb) => describeAmis(params, cb))

async function describeInstanceTypes(params, callback) {
  let ec2 = new EC2Client({
    region: REGION,
    credentials: fromEnv(),
  });
  const command = new DescribeInstanceTypesCommand(params);
  await ec2.send(command).then((data) => {
    callback(null, data)
  }, (err) => {
    callback(err, null)
  })
}
contextBridge.exposeInMainWorld('describeInstanceTypes', (params, cb) => describeInstanceTypes(params, cb))

async function describeDatabaseEngines(filters, callback) {
  const rds = new RDSClient({
    region: REGION,
    credentials: fromEnv(),
  });
  const input = {
    DefaultOnly: false,
    ListSupportedCharacterSets: false,
    ListSupportedTimezones: false,
    IncludeAll: false,
    Filters: [
      filters
    ],
  };
  try {
    let results = {};
    let error = null;
    let marker = "set";
    while (marker !== "") {
      input.Marker = marker === "set" ? "" : marker;
      const command = new DescribeDBEngineVersionsCommand(input);
      await rds.send(command).then((data) => {
        if (data.hasOwnProperty("DBEngineVersions")) {
          data.DBEngineVersions.forEach((item) => {
            if (!results.hasOwnProperty(item.Engine)) {
              results[item.Engine] = {};
            }
            if (!results[item.Engine].hasOwnProperty(item.EngineVersion)) {
              results[item.Engine][item.EngineVersion] = {};
            }
            results[item.Engine][item.EngineVersion] = item;
          })
          marker = data.hasOwnProperty("Marker") ? data.Marker : "";
        }
      }, (err) => {
        marker = "";
        error = err;
        console.log(err);
      })
    };
    callback(error, results);
  }
  catch (e) {
    callback(e, null)
  }
}
contextBridge.exposeInMainWorld('describeDatabaseEngines', (f, cb) => describeDatabaseEngines(f, cb))

async function describeDatabaseInstances(engine, callback) {
  const rds = new RDSClient({
    region: REGION,
    credentials: fromEnv(),
  });
  const input = {
    Engine: engine
  };
  try {
    let results = {};
    let error = null;
    let marker = "set";
    while (marker !== "") {
      input.Marker = marker === "set" ? "" : marker;
      const command = new DescribeOrderableDBInstanceOptionsCommand(input);
      await rds.send(command).then((data) => {
        if (data.hasOwnProperty("OrderableDBInstanceOptions")) {
          data.OrderableDBInstanceOptions.forEach((item) => {
            if (!results.hasOwnProperty(item.Engine)) {
              results[item.Engine] = {};
            }
            if (!results[item.Engine].hasOwnProperty(item.EngineVersion)) {
              results[item.Engine][item.EngineVersion] = {};
            }
            if (!results[item.Engine][item.EngineVersion].hasOwnProperty(item.DBInstanceClass)) {
              results[item.Engine][item.EngineVersion][item.DBInstanceClass] = {};
            }
            results[item.Engine][item.EngineVersion][item.DBInstanceClass] = item;
          })
          marker = data.hasOwnProperty("Marker") ? data.Marker : "";
        }
      }, (err) => {
        marker = "";
        error = err;
        console.log(err);
      })
    };
    callback(error, results);
  }
  catch (e) {
    callback(e, null)
  }
}
contextBridge.exposeInMainWorld('describeDatabaseInstances', (f, cb) => describeDatabaseInstances(f, cb))

async function getPrefixLists(params, callback) {
  let ec2 = new EC2Client({
    region: REGION,
    credentials: fromEnv(),
    MaxResults: 100,
  });
  const command = new DescribeManagedPrefixListsCommand(params);
  await ec2.send(command).then((data) => {
    callback(null, data)
  }, (err) => {
    callback(err, null)
  })
  // ec2.describeManagedPrefixLists(params, callback)
}
contextBridge.exposeInMainWorld('getPrefixLists', (params, cb) => getPrefixLists(params, cb))


async function getVpcEndpoints(params, callback) {
  let ec2 = new EC2Client({
    region: REGION,
    credentials: fromEnv(),
    MaxResults: 100
  });
  const command = new DescribeVpcEndpointsCommand(params);
  await ec2.send(command).then((data) => {
    callback(null, data)
  }, (err) => {
    callback(err, null)
  })
  // ec2.describeManagedPrefixLists(params, callback)
}
contextBridge.exposeInMainWorld('getVpcEndpoints', (params, cb) => getVpcEndpoints(params, cb))


async function getEc2InstanceConnectEndpoints(params, callback) {
  let ec2 = new EC2Client({
    region: REGION,
    credentials: fromEnv(),
    MaxResults: 100
  });
  const command = new DescribeInstanceConnectEndpointsCommand(params);
  await ec2.send(command).then((data) => {
    callback(null, data)
  }, (err) => {
    callback(err, null)
  })
}
contextBridge.exposeInMainWorld('getEc2InstanceConnectEndpoints', (params, cb) => getEc2InstanceConnectEndpoints(params, cb))

async function getHostedZones(params, callback) {
  const r53 = new Route53Client({
    region: REGION,
    credentials: fromEnv(),
    MaxResults: 100
  });
  const command = new ListHostedZonesCommand(params);
  await r53.send(command).then((data) => {
    callback(null, data)
  }, (err) => {
    callback(err, null)
  })
}
contextBridge.exposeInMainWorld('getHostedZones', (params, cb) => getHostedZones(params, cb))

/* 
* Once we have credentials, there are some things we can do with SDK
*/
async function listBuckets(callback) {
  let s3 = new S3Client({
    region: REGION,
    credentials: fromEnv(),
  })
  const command = new ListBucketsCommand();
  await s3.send(command).then((data) => {
    callback(null, data)
  }, (err) => {
    callback(err, null)
  })
}
contextBridge.exposeInMainWorld('listBuckets', (cb) => listBuckets(cb))

async function getCredentialReport(callback) {
  let iam = new IAMClient({
    region: REGION,
    credentials: fromEnv(),
  });
  const command = new GetCredentialReportCommand();
  await iam.send(command).then((data) => {
    callback(null, data)
  }, (err) => {
    callback(err, null)
  })
}
contextBridge.exposeInMainWorld('getCredentialReport', (cb) => getCredentialReport(cb))

//create a key pair for the user
async function generateKeyPair(region, callback) {
  let ec2 = new EC2Client({
    region: REGION,
    credentials: fromEnv(),
  })
  var params = {
    KeyName: `${region}-ec2-key-pair`
  };
  const command = new CreateKeyPairCommand(params);
  await ec2.send(command).then((data) => {
    callback(null, data)
  }, (err) => {
    callback(err, null)
  })
}
contextBridge.exposeInMainWorld('generateKeyPair', (region, cb) => generateKeyPair(region, cb))


/* 
* When the user chooses a new region in the UI, this gets called
*/
function setRegion(region) {
  process.env.AWS_DEFAULT_REGION = process.env.CDK_DEFAULT_REGION = REGION = region;
}
contextBridge.exposeInMainWorld('setRegion', (region) => setRegion(region))

// deploy the prerequisite stack for each account/region combo
async function prepareRegion(callback) {
  let cloudFormation = new CloudFormationClient({
    region: REGION,
    credentials: fromEnv(),
  });
  const command = new DescribeStacksCommand({ StackName: "csk-cdk-app-delivery-pipeline-stack" });
  await cloudFormation.send(command).then((data) => {
    if (data.hasOwnProperty("Stacks")) {
      if (data.Stacks[0].StackStatus.match(/ATE_COMPLETE/)) {
        console.log("pre-requisite stack found and complete");
        callback(null, data);    // successful response
      }
      else if (data.Stacks[0].StackStatus.match(/(DELETE_COMPLETE|ROLLBACK_COMPLETE|FAILED)/)) {
        console.log("pre-requisite stack found but not complete");
        callback(new Error(`Prerequisite stack found but not successfully created - ${data.Stacks[0].StackStatus}`), null);
      }
    }
    else {
      console.log("unknown error");
      callback(new Error("Prerequisite stack creation issue.", data), null);
    }
  }, (err) => {
    console.log("pre-requisite stack not found, will attempt to create", err);
    let params = {
      StackName: 'csk-cdk-app-delivery-pipeline-stack',
      Capabilities: ['CAPABILITY_NAMED_IAM'],
      TemplateBody: fs.readFileSync(path.join(rootPath, 'pipeline-assets', 'cdk-app-pipeline', 'cdk.out', 'csk-cdk-app-delivery-pipeline.template.json'), 'utf-8')
    }
    const command = new CreateStackCommand({ StackName: "csk-cdk-app-delivery-pipeline-stack" });
    cloudFormation.send(command).then((data) => {
      callback(null, data);    // successful response
    }, (err) => {
      callback(err, null);
    });
  })
}
contextBridge.exposeInMainWorld('prepareRegion', (cb) => prepareRegion(cb))

function getUserdataTemplate(osName, archName) {
  let expectedFilename = `${osName}-${archName}.${osName === 'Linux' ? 'sh' : 'ps1'}`.toLowerCase();
  console.log(expectedFilename);
  if (fs.existsSync(path.join(rootPath, 'src', 'userdata', expectedFilename))) {
    return fs.readFileSync(path.join(rootPath, 'src', 'userdata', expectedFilename), 'utf-8')
  }
  else {
    return "";
  }
}
contextBridge.exposeInMainWorld('getUserdataTemplate', (os, arch) => getUserdataTemplate(os, arch))

async function getFileFromBucket(partialUri, type = 'json') {
  let url = `https://${process.env.FILE_HOST}/${partialUri}`;
  console.log(`getting ${url}`);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-access-control": JSON.parse(localStorage.getItem("kitConfig"))["KitHubCode"]
    }
  });
  let data = await response.text();
  if (type === 'json') {
    try {
      const dataobj = JSON.parse(data);
      return dataobj;
    }
    catch (e) {
      alert(e);
      return {};
    }
  }
  else if (type === 'yaml') {
    try {
      const dataobj = yaml.load(data);
      return dataobj;
    }
    catch (e) {
      alert(e);
      return {};
    }
  }
  return data;
}
contextBridge.exposeInMainWorld('getFileFromBucket', (p, t) => getFileFromBucket(p, t))

/* 
* Get the catalogue file and prepare it for display
*/
async function getFullCatalogue(callback) {
  let fullCatalogue = {};
  const tlCats = await getFileFromBucket('kits/top-level-categories.json');
  const catDescs = await getFileFromBucket('kits/category-descriptions.json');
  const cfnKits = await getFileFromBucket('kits/cfn-templates/catalogue.json');
  const cdkKits = await getFileFromBucket('kits/cdk-apps/catalogue.json');
  console.log(cdkKits);
  const allKits = cfnKits["Catalogue"].concat(cdkKits["Catalogue"]);

  for (let i = 0; i < allKits.length; i++) {
    let tlc = allKits[i]["TopLevelCategory"];
    let cat = allKits[i]["Category"];
    if (fullCatalogue.hasOwnProperty(tlc) && fullCatalogue[tlc].hasOwnProperty(cat)) {
      fullCatalogue[tlc][cat]["Kits"] = fullCatalogue[tlc][cat]["Kits"].concat(allKits[i]["Kits"]);
    }
    else {
      if (!fullCatalogue.hasOwnProperty(tlc)) {
        fullCatalogue[tlc] = {};
      }
      fullCatalogue[tlc][cat] = { "Kits": allKits[i]["Kits"], "Description": catDescs[cat] };
    }
  }
  console.log(fullCatalogue);
  let tlCatalogue = {};
  for (let i = 0; i < tlCats.length; i++) {
    tlCatalogue[tlCats[i]["Label"]] = { "Description": tlCats[i]["Description"], "Categories": fullCatalogue[tlCats[i]["Label"]], "CategoryOrder": tlCats[i]["CategoryOrder"] };
  }
  callback(tlCatalogue)
}
contextBridge.exposeInMainWorld('getFullCatalogue', (cb) => getFullCatalogue(cb))

function deriveStackName(template, inputs, stackNamingParam) {
  //remove .json extension, strip out anything illegal in a stack name and make it lower case
  let stackName = 'csk-' + template.replace(/\.json/, '').replace(/[^a-zA-Z0-9\-]/g, '').toLowerCase().substring(0, 100) + "-stack";
  for (let i = 0; i < inputs.length; i++) {
    if (inputs[i]["ParameterKey"] === stackNamingParam) {
      stackName = `${template.replace(/\.json/, '').toLowerCase()}-${inputs[i]["ParameterValue"].replace(/[^0-0a-zA-Z]/g).toLowerCase()}-stack`;
    }
  }
  return stackName;
}
contextBridge.exposeInMainWorld('deriveStackName', (template, inputs) => deriveStackName(template, inputs))

/* 
* Deploy CloudFormation template
*/
async function deployCloudFormationTemplate(kitId, templateName, stackName, inputs, bucket, callback) {
  console.trace("deploying " + templateName);
  let templateJson = await getFileFromBucket(`kits/cfn-templates/${templateName}`);
  let templateBody = JSON.stringify(templateJson);
  let hasOutputs = templateJson.hasOwnProperty("Outputs");
  let numResources = Object.keys(templateJson.Resources).length + 1;//include the stack itself

  let appConfig = JSON.parse(localStorage.getItem("kitConfig"));
  let tags = [{ Key: "KitId", Value: kitId }, { Key: "AppKey", Value: appConfig.csk_id }, { Key: "CreatedBy", Value: appConfig.BusinessName }]
  if (templateJson.hasOwnProperty("Tags")) {
    for (let tag in templateJson.Tags) {
      tags.push({ Key: tag, Value: templateJson.Tags[tag] })
    }
  }
  let stackTrackingData = { kitId: kitId, hasOutputs: hasOutputs, resourceCount: numResources, isDeferred: false, lastStatus: null, lastStatusTime: null, deployTime: new Date().getTime(), tracking: true };

  uploadIfNeededThenValidate(stackName, inputs, tags, templateName, templateBody, bucket, stackTrackingData, callback);
}
contextBridge.exposeInMainWorld('deployCloudFormationTemplate', (kitId, template, stackName, inputs, bucket, cb) => deployCloudFormationTemplate(kitId, template, stackName, inputs, bucket, cb))

async function uploadIfNeededThenValidate(stackName, inputs, tags, templateName, templateBody, bucket, stackTrackingData, callback) {
  let cfParams = {
    StackName: stackName,
    Capabilities: ['CAPABILITY_NAMED_IAM'],
    Parameters: inputs,
    Tags: tags
  }
  // find out if template too big and create bucket if needed
  // let cloudformation = new sdk.CloudFormation();
  if (templateBody.length > 51999) {
    if (!bucket) {
      callback(new Error("Template too large for inline deployment and no bucket specified."), null);
      return;
    }
    //upload the file and pass the s3 URL to cloudformation
    let s3 = new S3Client({
      region: REGION,
      credentials: fromEnv(),
    });
    let params = {
      Bucket: bucket,
      Key: templateName,
      Body: templateBody
    };
    await new Upload({
      client: s3,
      params,
    }).done().then((data) => {
      cfParams["TemplateURL"] = data.Location;
      validateThenCreate(cfParams, stackTrackingData, callback)
    }).then((err) => {
      console.log(err)
    })
    // s3.upload(params, (err, data) => {
    //   if (err) {
    //     console.log(err)
    //   }
    //   else {
    //     cfParams["TemplateURL"] = data.Location;
    //     //console.log(`File uploaded successfully. ${data.Location}`);
    //     validateThenCreate(cfParams, stackTrackingData, callback)
    //   }
    // });
  }
  else {
    cfParams["TemplateBody"] = templateBody;
    validateThenCreate(cfParams, stackTrackingData, callback)
  }
}

async function validateThenCreate(params, stackTrack, callback) {
  let cloudFormation = new CloudFormationClient({
    region: REGION,
    credentials: fromEnv(),
  });
  let minimalParams = {};
  if (params.hasOwnProperty("TemplateURL")) {
    minimalParams = {
      TemplateURL: params.TemplateURL
    }
  }
  else {
    minimalParams = {
      TemplateBody: params.TemplateBody
    }
  }
  const command = new ValidateTemplateCommand(minimalParams);
  await cloudFormation.send(command).then((data) => {
    console.log('validateTemplate', data);
    localStorage.setItem(`${ACCOUNT}-${REGION}-${params["StackName"]}`, JSON.stringify(params));
    stacks[params["StackName"]] = stackTrack;
    // create or update
    const command = new CreateStackCommand(params);
    cloudFormation.send(command).then((data) => {
      callback(null, data);    // successful response
    }, (err) => {
      callback(err, null);
    });
    // cloudFormation.createStack(params, callback);
  }, (err) => {
    console.log(err);
    callback(err, null);
  });
  // cloudFormation.validateTemplate(minimalParams, (err, data) => {
  //   if (err) {
  //     console.log(err);
  //     callback(err, null);
  //   }
  //   else {
  //     console.log('validateTemplate', data);
  //     localStorage.setItem(`${ACCOUNT}-${REGION}-${params["StackName"]}`, JSON.stringify(params));
  //     stacks[params["StackName"]] = stackTrack;
  //     // create or update
  //     cloudFormation.createStack(params, callback);
  //   }
  // });
}

/* 
* Deploy CDK app
*/

function removePathTraversals(path) {
  return path.replace(/\.\.\//g, '');
}

async function deployCdkViaSourceBucket(kitId, manifestFilename, inputs, region, account, bucketName, callback) {
  manifestFilename = removePathTraversals(manifestFilename);
  const manifest = await getFileFromBucket(`kits/cdk-apps/${manifestFilename}`);
  const appFolder = manifest.hasOwnProperty("KitDirectoryOverride") ? manifest.KitDirectoryOverride : manifestFilename.replace(/.json$/, '')
  //download the relevant CDK files
  fs.writeFileSync(path.join(rootPath, 'downloaded', 'kits', 'cdk-apps', manifestFilename), JSON.stringify(manifest))
  for (let i = 0; i < manifest.FileList.length; i++) {
    let sanitizedFilepath = removePathTraversals(manifest.FileList[i]);
    let file = await getFileFromBucket(`kits/cdk-apps/${sanitizedFilepath}`, 'filedata');
    let pathToFile = sanitizedFilepath.split('/');
    let fileName = pathToFile.pop()
    let dirToCreate = [rootPath, 'downloaded', 'kits', 'cdk-apps']
    for (let j = 0; j < pathToFile.length; j++) {
      dirToCreate.push(pathToFile[j]);
      let dir = path.join(...dirToCreate)
      console.log(dir);
      if (!fs.existsSync(dirToCreate.join('/'))) {
        fs.mkdirSync(dirToCreate.join('/'));
      }
    }
    fs.writeFileSync(path.join(rootPath, 'downloaded', 'kits', 'cdk-apps', ...pathToFile, fileName), file)
  }
  //prepare the CDK files and zip the dir
  let usedInputs = await prepCdkAppDirectory(kitId, manifest, appFolder, inputs, region, account);
  const zipPath = path.join(rootPath, 'downloaded', 'kits', 'cdk-apps', `${appFolder}.zip`);
  const s3 = new S3Client({
    region: REGION,
    credentials: fromEnv(),
  });

  // The file always has the same name because this is how the cloudtrail event triggers the pipeline
  const params = {
    Bucket: bucketName,
    Key: 'csk-cdk-app.zip',
    Body: fs.createReadStream(zipPath)
  };

  let primaryStack = manifest.Stacks[0].name;
  for (let i = 0; i < manifest.Stacks.length; i++) {
    let modifiedStackName = manifest.Stacks[i].name;
    for (let j = 0; j < inputs.length; j++) {
      if (manifest.Stacks[i].name.indexOf(`{${inputs[j].ParameterKey}}`) > -1) {
        modifiedStackName = modifiedStackName.replace(`{${inputs[j].ParameterKey}}`, inputs[j].ParameterValue.replace(/[^a-zA-Z0-9\-]/g, '').toLowerCase().substring(0, 100));
      }
    }
    localStorage.setItem(`${account}-${region}-${modifiedStackName}`, JSON.stringify(usedInputs));
    if (i === 0) {
      primaryStack = modifiedStackName;
    }
    stacks[modifiedStackName] = { kitId: kitId, inputs: inputs, resourceCount: manifest.Stacks[i].resourceCount, hasOutputs: manifest.Stacks[i].hasOutputs, isDeferred: false, lastStatus: null, lastStatusTime: null, deployTime: new Date().getTime(), tracking: true };
  }
  let cloudFormation = new CloudFormationClient({
    region: REGION,
    credentials: fromEnv(),
  });
  const command = new DescribeStacksCommand({ StackName: primaryStack });
  await cloudFormation.send(command).then((data) => {
    callback(new Error(`Stack [${primaryStack}] already exists`), null, primaryStack);
  }, (err) => {
    if (err.message.match(/Stack with id (.*) does not exist/)) {
      // Upload the file to S3
      new Upload({
        client: s3,
        params,
      }).done().then((data) => {
        console.log('File uploaded successfully. File location:', data.Location);
        const pipelineName = localStorage.getItem(`${ACCOUNT}-${REGION}-PipelineName`);
        if (pipelineName) {
          // trigger the pipeline execution here and pass back the execution id
          var params = {
            name: pipelineName,
          };
          const codepipeline = new CodePipelineClient({
            region: REGION,
            credentials: fromEnv(),
          });
          const command = new StartPipelineExecutionCommand(params);
          codepipeline.send(command).then((data) => {
            console.log(data); // successful response
            callback(null, data, primaryStack);
          }, (err) => {
            console.log(err, err.stack); // an error occurred
            callback(err, null, primaryStack);
          })
        }
        else {
          callback(null, data, primaryStack);
        }
      }).then((err) => {
        console.log('Error uploading file:', err);
        callback(err, null, primaryStack);
      })
    }
  });
}
contextBridge.exposeInMainWorld('deployCdkViaSourceBucket', (kitId, manifestFilename, inputs, region, account, bucketName, callback) => deployCdkViaSourceBucket(kitId, manifestFilename, inputs, region, account, bucketName, callback))

async function prepCdkAppDirectory(kitId, manifest, appFolder, inputs, region, account) {
  console.log(kitId, manifest, appFolder, inputs, region, account);

  const appConfig = JSON.parse(localStorage.getItem("kitConfig"));
  let usedInputs = [];
  appFolder = removePathTraversals(appFolder);
  const appFolderPath = path.join(rootPath, 'downloaded', 'kits', 'cdk-apps', appFolder);
  if (fs.existsSync(appFolderPath)) {
    if (manifest.hasOwnProperty("ConfigFile")) {
      // populate the config file template with inputs and write the file that will be consumed by CDK
      const configTemplate = manifest.ConfigFile.replace('.json', '-template.json');
      if (fs.existsSync(path.join(appFolderPath, configTemplate))) {
        let configJson = JSON.parse(fs.readFileSync(path.join(appFolderPath, configTemplate)));
        configJson["region"] = region;
        configJson["account"] = account;
        configJson["kitId"] = kitId;
        configJson["appKey"] = appConfig.csk_id;
        configJson["businessName"] = appConfig.BusinessName;
        for (let i = 0; i < inputs.length; i++) {
          if (configJson.hasOwnProperty(inputs[i]["ParameterKey"])) {
            configJson[inputs[i]["ParameterKey"]] = inputs[i]["ParameterValue"];
            usedInputs.push(inputs[i]);
          }
        }
        fs.writeFileSync(path.join(appFolderPath, removePathTraversals(manifest.ConfigFile)), JSON.stringify(configJson))
      }
    }
    else {
      //console.log("either no config file specified or no inputs, or both");
    }
    //zip it good
    await zipFolder(appFolderPath, path.join(rootPath, 'downloaded', 'kits', 'cdk-apps', `${appFolder}.zip`));
  }
  return usedInputs;
}

async function zipFolder(folderPath, zipFilePath) {
  const zip = new JSZip();
  const addFilesToZip = (zipFile, folderPath, currentPath = "") => {
    folderPath = removePathTraversals(folderPath);
    currentPath = removePathTraversals(currentPath);
    const files = fs.readdirSync(path.join(folderPath, currentPath));
    if (!currentPath.match(/node_modules|cdk.out|tests|\.\w+/)) {
      for (const file of files) {
        const filePath = removePathTraversals(path.join(currentPath, file));
        const fullFilePath = removePathTraversals(path.join(folderPath, filePath));
        const stats = fs.statSync(fullFilePath);
        if (stats.isDirectory()) {
          addFilesToZip(zipFile, folderPath, filePath);
        } else {
          let fileContent = fs.readFileSync(fullFilePath);
          //enforce the correct path separator on windows
          zipFile.file(filePath.replace(/\\/g, "/"), fileContent);
        }
      }
    }
  };
  addFilesToZip(zip, folderPath);
  await zip.generateAsync({ type: "nodebuffer" }).then((content) => {
    fs.writeFileSync(zipFilePath, content);
  }).catch((error) => console.log(error))
}

function getPipelineStatus(execId, callback) {
  const pipelineName = localStorage.getItem(`${ACCOUNT}-${REGION}-PipelineName`);
  const codepipeline = new CodePipelineClient({
    region: REGION,
    credentials: fromEnv(),
  });
  if (pipelineName) {
    var params = {
      pipelineName: pipelineName,
      pipelineExecutionId: execId
    };
    const command = new GetPipelineExecutionCommand(params);
    codepipeline.send(command).then((data) => {
      console.log(data); // successful response
      callback(null, data);
    }, (err) => {
      console.log(err, err.stack); // an error occurred
      callback(err, null);
    })
    // codepipeline.getPipelineExecution(params, callback);
  }
}
contextBridge.exposeInMainWorld('getPipelineStatus', (pipeline, cb) => getPipelineStatus(pipeline, cb))

// delete stack by stackname
function deleteStack(stackName, callback) {
  let cloudFormation = new CloudFormationClient({
    region: REGION,
    credentials: fromEnv(),
  });
  try {
    const command = new DeleteStackCommand({ StackName: stackName });
    cloudFormation.send(command).then((data) => {
      callback(null, data);    // successful response
    }, (err) => {
      callback(err, null);
    });
    // cloudFormation.deleteStack({ StackName: stackName }, callback);
  }
  catch (e) {
    console.log(e);
    callback(e, null);
  }
}
contextBridge.exposeInMainWorld('deleteStack', (stack) => deleteStack(stack))

/* 
* Stack reporting functions
*/

//Poll for updates for stacks we're monitoring

let stackEvents = {}
let stackTokens = {}
let stackIds = {}
function getAllStackEvents(stackName, callback) {
  let cloudFormation = new CloudFormationClient({
    region: REGION,
    credentials: fromEnv(),
  });
  if (!stackEvents.hasOwnProperty(stackName)) {
    stackEvents[stackName] = [];
  }
  // stackEvents[stackName] = [];
  stackTokens[stackName] = null;
  let limit = 3;
  //console.log(`stack deploytime: ${new Date(stacks[stackName].deployTime)}`)
  let params = { StackName: stackName, NextToken: stackTokens[stackName] };
  if (stackIds.hasOwnProperty(stackName)) {
    params["StackId"] = stackIds[stackName];
  }
  do {
    const command = new DescribeStackEventsCommand(params);
    cloudFormation.send(command).then((data) => {
      for (let i = 0; i < data.StackEvents.length; i++) {
        let thisStatusTime = new Date(data.StackEvents[i].Timestamp).getTime();
        //ignore old events 
        if (thisStatusTime > stacks[stackName].deployTime) {
          // console.log(data.StackEvents[i].Timestamp);
          stackEvents[stackName].push(data.StackEvents[i]);
        }
      }
      stackTokens[stackName] = data.NextToken;
    }, (err) => {
      stackTokens[stackName] = null;
      callback(err, { StackEvents: stackEvents[stackName] })
    });
    // cloudFormation.describeStackEvents(params, (err, data) => {
    //   limit = limit--;
    //   if (data) {
    //     for (let i = 0; i < data.StackEvents.length; i++) {
    //       let thisStatusTime = new Date(data.StackEvents[i].Timestamp).getTime();
    //       //ignore old events 
    //       if (thisStatusTime > stacks[stackName].deployTime) {
    //         // console.log(data.StackEvents[i].Timestamp);
    //         stackEvents[stackName].push(data.StackEvents[i]);
    //       }
    //     }
    //     stackTokens[stackName] = data.NextToken;
    //   }
    //   else {
    //     stackTokens[stackName] = null;
    //     callback(err, { StackEvents: stackEvents[stackName] })
    //   }
    //   // console.log(limit);
    // });
  } while (limit && stackTokens[stackName] !== null);
  callback(null, { StackEvents: stackEvents[stackName] })
}

function getStackEvents(stackName, callback) {
  if (stacks.hasOwnProperty(stackName) && stacks[stackName].tracking) {
    getAllStackEvents(stackName, (err, data) => {
      if (data) {
        let stackStatus = null;
        let resourceEvents = {};
        let timeOrderedEvents = [];
        let timeOrderedEventObj = {};
        if (data.StackEvents.length > 0) {
          for (let i = 0; i < data.StackEvents.length; i++) {
            let thisStatusTime = new Date(data.StackEvents[i].Timestamp).getTime();
            let timeKey = `${thisStatusTime}-${data.StackEvents[i].LogicalResourceId}`.replace(/\W/g, '');
            if (!timeOrderedEventObj.hasOwnProperty(timeKey)) {
              timeOrderedEvents.push(timeKey)
              timeOrderedEventObj[timeKey] = data.StackEvents[i];
            }
          }
          timeOrderedEvents.sort();
          for (let i = 0; i < timeOrderedEvents.length; i++) {
            let thisEvent = timeOrderedEventObj[timeOrderedEvents[i]];
            if (thisEvent.LogicalResourceId === stackName) {
              stackStatus = thisEvent;
              stacks[stackName].lastStatus = thisEvent.ResourceStatus;
              stacks[stackName].lastStatusTime = new Date(thisEvent.Timestamp).getTime();
            }
            else {
              resourceEvents[thisEvent.LogicalResourceId] = thisEvent;
            }
          }
        }

        if (stackStatus) {
          console.log(stackName, stackStatus, resourceEvents);
          callback(stackName, stackStatus, resourceEvents);    // successful response
        }
        else {
          console.log(`no stack events for ${stackName} - could be already created?`)
          callback(stackName, stackStatus, resourceEvents);
        }
      }
      else {
        console.log(`describeStackEvents no data for ${stackName}`);
      }
      if (err) {
        // console.log("describeStackEvents ERROR", err);
        if (stacks.hasOwnProperty(stackName) && stacks[stackName].hasOwnProperty("isDeferred") && stacks[stackName].isDeferred) {
          // not necessarily a problem as we are waiting for the pipeline to build this one
          console.log(`${stackName} is deferred so ok that it's not reporting yet.`)
        }
        else if (stacks.hasOwnProperty(stackName) && err.toString().match(/does not exist/)) {
          // not necessarily a problem as we are waiting for the pipeline to build this one
          console.log(`${stackName} is not reporting yet.`);
        }
        else {
          // remove this stack from the list of monitored stacks
          // if it has previously received status events and now throws an error
          // we can assume that the stack has been deleted
          if (stacks.hasOwnProperty(stackName) && stacks[stackName].hasOwnProperty("lastStatus") && stacks[stackName].lastStatus !== null && !stacks[stackName].lastStatus.match(/does not exist/)) {
            //console.log(`${stackName} previous status: `, stacks[stackName].lastStatus);
            console.log(`getStackEvents is deleting ${stackName} from stacks because it has previously received status events (${stacks[stackName].lastStatus}) and now throws an error`, err.message)
            handleFailedStack(stackName);
          }
          else if (stacks.hasOwnProperty(stackName) && stacks[stackName].hasOwnProperty("lastStatus") && stacks[stackName]["lastStatus"] !== err) {
            stacks[stackName]["lastStatus"] = err;
            console.log("error changed stack status", err); // an error occurred
            handleFailedStack(stackName);
          }
          else if (stacks.hasOwnProperty(stackName)) {
            stacks[stackName]["lastStatus"] = err;
            console.log("repeated error", err); // an error occurred
            handleFailedStack(stackName);
          }
          else {
            console.log(`describeStackEvents error for ${stackName}`);
          }
        }
      }
    });
  }
  else {
    console.log(`no longer tracking ${stackName}`)
  }
}
contextBridge.exposeInMainWorld('getStackEvents', (stack, cb) => getStackEvents(stack, cb))

//Get info for stacks we're monitoring

async function getStackInfo(stackName, callback) {
  let cloudFormation = new CloudFormationClient({
    region: REGION,
    credentials: fromEnv(),
  });
  const command = new DescribeStacksCommand({ StackName: stackName });
  await cloudFormation.send(command).then((data) => {
    callback(data.Stacks[0].StackName, data);
  }, (err) => {
    if (err.message.match(/Stack with id (.*) does not exist/)) {
      handleFailedStack(stackName);
    }
    callback(stackName, err);
  });
}
contextBridge.exposeInMainWorld('getStackInfo', (stack, cb) => getStackInfo(stack, cb))


async function listStacks(callback) {
  let cloudFormation = new CloudFormationClient({
    region: REGION,
    credentials: fromEnv(),
  });
  try {
    const command = new DescribeStacksCommand();
    await cloudFormation.send(command).then((data) => {
      callback(null, data);
    }, (err) => {
      callback(err, null);
    });
  }
  catch (e) {
    callback(e, []);
  }
}
contextBridge.exposeInMainWorld('listStacks', (stack, cb) => listStacks(stack, cb))

async function getStackStatus(stackName, callback) {
  let cloudFormation = new CloudFormationClient({
    region: REGION,
    credentials: fromEnv(),
  });
  try {
    const command = new DescribeStacksCommand({ StackName: stackName });
    await cloudFormation.send(command).then((data) => {
      callback(null, data);
    }, (err) => {
      callback(err, null);
    });
  }
  catch (e) {
    callback(e, null);
  }
}
contextBridge.exposeInMainWorld('getStackStatus', (stackName, cb) => getStackStatus(stackName, cb))


function getStacksInProgress() {
  return stacks;
}
contextBridge.exposeInMainWorld('getStacksInProgress', () => getStacksInProgress())

//put 10 minute window on "failed" stacks
//stacks may "fail" for a bunch of reasons that don't necessarily indicate they won't recover
function handleFailedStack(stackName) {
  if (stacks.hasOwnProperty(stackName)) {
    if (stacks[stackName].hasOwnProperty("reliesOn") && (stacks.hasOwnProperty(stacks[stackName].reliesOn))) {
      console.log(`handleFailedStack doing nothing to ${stackName}`);
      // do nothing, this stack relies on another stack to be deployed first
    }
    else if (!stacks[stackName].hasOwnProperty("deleteTime") || stacks[stackName]["deleteTime"] === null) {
      console.log(`handleFailedStack setting deleteTime for 10 minutes hence on ${stackName}`);
      stacks[stackName]["deleteTime"] = new Date().getTime() + 600000;
    }
  }
}
contextBridge.exposeInMainWorld('handleFailedStack', (stackName) => handleFailedStack(stackName))

function handleCompletedStack(stackName) {
  //console.log(`handleCompletedStack marking ${stackName} as complete`);
  if (stacks.hasOwnProperty(stackName) && (!stacks[stackName].hasOwnProperty("deleteTime") || stacks[stackName]["deleteTime"] === null)) {
    stacks[stackName]["deleteTime"] = new Date().getTime() + 300000;
  }
}
contextBridge.exposeInMainWorld('handleCompletedStack', (stackName) => handleCompletedStack(stackName))

function keepWatchingStack(stackName) {
  //console.log(`keepWatchingStack marking ${stackName} as INcomplete`, stacks);
  if (stacks.hasOwnProperty(stackName) && stacks[stackName].hasOwnProperty("deleteTime")) {
    stacks[stackName]["deleteTime"] = null;
  }
}
contextBridge.exposeInMainWorld('keepWatchingStack', (stackName) => keepWatchingStack(stackName))
/* 
* Reset the UI and list of tracked stacks
*/
function clearTrackedStacks(stackName) {
  if (stackName) {
    //console.log(`clearTrackedStacks deleting ${stackName} from stacks Object`);
    stacks[stackName]["deleteTime"] = new Date().getTime() + 30000;
  }
  else {
    for (const key in stacks) {
      //console.log(`clearTrackedStacks emptying stacks Object: ${key}`);
      stacks[key]["deleteTime"] = new Date().getTime() + 30000;
    }
  }
}
contextBridge.exposeInMainWorld('clearTrackedStacks', (stackName) => clearTrackedStacks(stackName))

/* 
* Private functions that are not exposed in MainWorld
*/

function resetStacks() {
  for (const key in stacks) {
    delete stacks[key];
  }
}

// this is the baseline source for strings
const defaultStrings = yaml.load(fs.readFileSync(path.join(rootPath, 'src', 'i18n', `en-US.yaml`), 'utf8'));

window.addEventListener('LanguageChange', () => {
  let lang = document.getElementById('lang-select').value || window.resellerConfig.PreferredLanguage;
  const strings = yaml.load(fs.readFileSync(path.join(rootPath, 'src', 'i18n', `${lang}.yaml`), 'utf8'));
  const combinedStrings = { ...defaultStrings, ...strings };
  for (const key of Object.keys(combinedStrings)) {
    replaceText(`strings-${key}`, combinedStrings[key])
  }
  dispatchEvent(new Event('TEXT_LOADED'));
})

const parser = new DOMParser();
const replaceText = (selector, text) => {
  const element = document.getElementById(selector);
  if (element) {
    const doc = parser.parseFromString(text, "text/html");
    const isHtml = Array.from(doc.body.childNodes).some(node => node.nodeType === 1);
    if (isHtml) {
      element.appendChild(doc.documentElement);
    }
    else {
      element.innerText = text;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  for (const type of ['chrome', 'node', 'electron', 'cdk', 'sdk']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})
