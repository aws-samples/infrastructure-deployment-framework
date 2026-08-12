
# CDK Kits
 


Adding your CDK app-based Kit to the CSK involves a few more steps.

>NOTE: It's a good idea to check your CDK-based projects with tools such as [cdk-nag](https://github.com/cdklabs/cdk-nag) before you make them available as Kits. 

## Step 1: Create your CDK Kit manifest

The `cdk-apps` root directory has the following structure. You can see that at the root there is a file called `catalogue.json`, and there are folders containing CDK apps. Each app folder has a matching a JSON file with the same name and a `.json` extension - this is the `manifest` file.

```
www/
├─ kits/
│  ├─ cdk-apps/
│  │  ├─ catalogue.json
│  |  ├─ ec2.json
│  │  ├─ ec2/
│  │  │  ├─ cdk.json
│  │  │  ├─ ...
```

CDK Kit manifest files allow you to control the behaviour of the CSK app when rendering your CDK-based Kit. Manifest files contain the following:

```json
{
    "AppName": "VPC with NAT", //name that will appear in the drop-down
    "ConfigFile": "parameters.json", //location and name of CDK config file
    "Parameters": { //any config items you want to pass into your CDK project
        "natCount": {
            "Label": "NAT Gateway Count",
            "Description": "How many NAT Gateway instances do you want to include?",
            "AllowedValues": [
                1,
                2,
                3
            ],
            "Default": 1
        }
    },
    "Tags": {}, //tags you want to add
    "Stacks": [ //the name of the stack(s) your project will deploy
        {
            "name": "csk-vpc-with-nat-stack",
            "resourceCount": 15,
            "hasOutputs": false
        }
    ],
    "FileList": [
        "vpc-with-nat/bin/vpc-with-nat.js",
        "vpc-with-nat/lib/vpc-with-nat.js",
        "vpc-with-nat/buildspec.yml",
        "vpc-with-nat/cdk.json",
        "vpc-with-nat/package.json",
        "vpc-with-nat/parameters-template.json"
    ]
}
```

You can copy this as a starting point, save it to your Kit Hub directory alongside your CDK-based Kit and edit as required. 

## Step 2: Create your parameters file

The CSK expects to find a file called `parameters-template.json` in the root of your CDK project. This file contains a JSON object that has properties defined that represent variable values that you wish to pass into your CDK app at deploy time.

```json
{
    "natCount": "",
    "region": "",
    "account": "",
    "kitId": "",
    "appKey": "",
    "businessName": ""
}
```

When the user deploys a CDK-based kit, this template file will be copied to `parameters.json` and the values the user has set in the CSK for each of the Kit's parameters will be set, eg

```json
{
    "natCount": "1",
    "region": "ap-southeast-2",
    "account": "1234567891011",
    "kitId": "cdk-vpc-with-nat",
    "appKey": "esMz4hynhkuYJPFc39pK",
    "businessName": "Sam Industries"
}
```

>Note that region, account, kitId, appKey and businessName are set by the CSK app, not the user.

This file is then combined with the other files specified in `FileList` and zipped before being uploaded to the target account and deployed.

## Step 3: Set up your CDK Kit to consume the parameters file

Inside your app, you will need to read and parse the parameters file and then use the resulting configuration items as required. How you will do that depends on the language you are using with CDK, but the sample apps under `kit-utils` show how to do this for TypeScript, JavaScript and Python.

#### Configuring Python projects

In your app.py, read in and pass your parameters.json file like so:

```python
import json

params = json.load(open("parameters.json"))

app = cdk.App()
VpcStack(
    app,
    "ask-vpc-stack",
    params,
    env=cdk.Environment(account=params["account"], region=params["region"]),
)
```

Then in your stack:

```python
class VpcStack(Stack):

    def __init__(
        self, scope: Construct, construct_id: str, params: map, **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        vpc = ec2.Vpc(
            self,
            "Vpc",
            vpc_name="ask-vpc-with-nat",
            nat_gateways=int(params["natCount"]),
            max_azs=3,
        )
```

#### Configuring Typescript projects

Add this to your `tsconfig.ts` file:

```json
    "resolveJsonModule": true,
```

In your `bin/app.ts`, read the `parameters.json` file using the `fs` and `path` modules and pass it into your stack.

```typescript
import { readFileSync } from 'fs';
import { resolve } from 'path';

const params = JSON.parse(readFileSync(resolve(__dirname, '../', 'parameters.json')).toString());

const app = new cdk.App();
const backupStack = new BackupStack(app, 'csk-backup-stack', {
  params: params,
  env: { account: params["account"], region: params["region"] },
});
```

In your `lib/app-stack.ts` define your params and their types:

```typescript
interface KitStackProps extends StackProps {
  env: {
    account: string,
    region: string
  },
  params: {
    kitId: string,
    appKey: string,
    businessName: string,
    enableVss: string
  }
}

export class BackupStack extends Stack {
  constructor(scope: Construct, id: string, props: KitStackProps) {
    super(scope, id, props);

    const vssEnabled = props.params["enableVss"] === "Yes";
  }
}
```

#### Configuring JavaScript projects

For Javascript projects, you use the `fs` and `path` modules to read the `parameters.json` file in the file where you declare your app and instantiate your stack classes. 

```code{language=javascript showCopyAction=true}
const fs = require("fs");
const path = require("path");
const params = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../', 'parameters.json')).toString());

const app = new cdk.App();
new ExampleStack(app, `csk-ec2-${params["example"]}-stack`, {
  params: params,
  env: { account: params["account"], region: params["region"] },
});
```

In your stack files, unlike with TypeScript you can just use the params as passed via the StackProps object: 

```code{language=javascript showCopyAction=true}
class ExampleStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcId: props.params["vpcId"],
    });

  }
}
```

>**NOTE**: You should manually create a populated `parameters.json` file and test your CDK app is able to successfully read and use the parameters before you move to the next step.

## Step 4: Add a `buildspec.yaml` file

The `buildspec.yaml` file defines the steps CodeBuild will execute to deploy your CDK app. The needed steps will vary depending on the language you have used.

It must appear here in your Kit directory:

```
www/
├─ kits/
│  ├─ cdk-apps/
│  │  ├─ catalogue.json
│  |  ├─ ec2.json
│  │  ├─ ec2/
│  │  │  ├─ buildspec.yaml
│  │  │  ├─ ...
```

#### Python buildspec example

```yaml
# buildspec.yml
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 20
      python: 3.9
    commands:
      - npm install aws-cdk -g
      - pip install -r requirements.txt
  build:
    commands:
      - cdk bootstrap --termination-protection
      - cdk deploy --require-approval never
```

#### TypeScript buildspec example

```yaml
# buildspec.yml
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      - npm install aws-cdk -g
      - npm install
  build:
    commands:
      - npm run build
      - cdk bootstrap --termination-protection
      - cdk deploy --require-approval never
cache:
  paths:
    - "node_modules/**/*"
```

#### JavaScript buildspec example

```yaml
# buildspec.yml
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      - npm install aws-cdk -g
      - npm install
  build:
    commands:
      - cdk bootstrap --termination-protection
      - cdk deploy --require-approval never
cache:
  paths:
    - "node_modules/**/*"
```

## Step 5: Define your Kit object

Now you have all the pieces configured, to display your project in the app you need to add it to the `catalogue.json` file. 

As with the CFN kit example, you first create your Kit Object:

```json
{
    "Name": "My New Kit",
    "Description": "This kit deploys something interesting and useful.",
    "Manifest": "new-kit.json",
    "CostCalculator": "https://calculator.aws/#/estimate?id=f5d27ea6e30b72437f63c27338f9315e3fd3a36e",
    "VpcRequired": false
}
```

>See the previous page for a list of all the possible parameters you can use in the Kit object.

## Step 6: Decide where your Kit should appear

Now you need to decide which `TopLevelCategory` and `Category` combination your new Kit should appear under. Note all `TopLevelCategory` and `Category` names are defined in these files:

```
www/
├─ kits/
│  ├─ top-level-categories.json
│  ├─ category-descriptions.json
```

If one exists you can add your new kit to its Kits array

```json
{
    "Catalogue": [
        {
            "TopLevelCategory": "Foundations",
            "Category": "Security",
            "Kits": [{add-your-kit-object-here}]
        }
    ]
}
```

If it doesn't, create a new Category object:

```json
{
    "TopLevelCategory": "Other TLC",
    "Category": "Other Category",
    "Kits": []
}
```

and add it to the Catalogue array:

```json
{
    "Catalogue": [
        {
            "TopLevelCategory": "Foundations",
            "Category": "Security",
            "Kits": []
        },
        {
            "TopLevelCategory": "Other TLC",
            "Category": "Other Category",
            "Kits": [{add-your-kit-object-here}]
        }
    ]
}
```

Save your changes once done.

Commit your code to your Git repo and do a `cdk deploy` to push your new Kit to your Kit Hub.

Click <a href="../../csk-app/index.en.md">next</a> to build the CSK desktop app.