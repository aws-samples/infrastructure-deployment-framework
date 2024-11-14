# Creating CDK projects for the AWS Starter Kit

This README will give you the info you need to deploy CDK apps successfully via this app.

## SEE THE SAMPLE PROJECTS

Look in the `kit-utils/cdk` directory in this repo. In there are sample projects for TypeScript, Javascript and Python. 

If you can choose, Javascript is slightly faster to deploy.

## Configuring a CDK project using the app

In the `cdk-apps` root directory there are project.json files that allow you to drive the behaviour of the Electron app. Each has the name of the project as the file name, with `.json` appended, eg the project in the `vpc` directory has a project file in `cdk-apps` called `vpc.json` which contains the following:

| Kit Parameter | Purpose |
| -------- | ------- |
| AppName | The title that will be displayed for this Kit |
| Description | The descriptive text that will appear under the Kit title |
| Templates | One or more template names. If multiple specified, they will be deployed in the same order as they appear here |
| CostCalculator | Add a URL to the AWS Calculator configured to include the services in your Kit |
| VpcRequired | If your Kit requires a VPC to have been created in this account, set to `true`, otherwise set it to `false` or don't include this parameter |
| AmiFilter | If set to one of `Windows`, `Ubuntu` or `AmazonLinux` will filter the list of AMIs to only include those OSes |

``` json
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
    "Tags": {},//tags you want to add
    "Stacks": [//the name of the stack(s) your project will deploy
        {
            "name": "ask-vpc-stack",
            "hasOutputs": true
        }
    ],
    "CodeBuildPolicy": {//the IAM policy that CodeBuild will use. Must be able to assume CDK roles.
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowAllAccess",
                "Effect": "Allow",
                "Action": "*",
                "Resource": "*"
            }
        ]
    }
}

```

## How parameters get from the App to CDK

The `parameters.json` file in the project root is written to during the deployment process prior to the project being zipped and uploaded. Any config items you specify will be added to that file. Inside your app, read and parse this file and then used the resulting configuration items as required. *NB: the account ID and region will be passed as a minimum.*

``` python
import os
import json

import aws_cdk as cdk

from vpc.vpc_stack import VpcStack

params = json.load(open("parameters.json"))

app = cdk.App()
VpcStack(
    app,
    "csk-vpc-stack",
    params,
    env=cdk.Environment(account=params["account"], region=params["region"]),
)
```

## The CDK app catalogue

In the root of the `cdk-apps` directory you will find `catalogue.json`. To display your project in the app you need to add it here. 


``` json
{
  "Catalogue": [
    {
      "Category": "All",
      "Kits": [
        {
          "Name": "VPC with NAT", // name that will appear in the app
          "Manifest": "vpc.json", // detailed config for the app
          "Description": "This stack creates and Amazon VPC (Virtual Private Cloud) in the target account. A VPC is a pre-requisite for a range of other services you may want to create in this account, eg EC2 instances must be created in a VPC.<br>This VPC will create 3 public subnets and 3 private subnets. The public subnets will be accessible from the Internet via an Internet Gateway.<br><br>You can add NAT Gateways to enable outbound access to the Internet from the private subnets - add more than one to have multi-AZ resilience for NAT. ", //a description that will appear in the electron app when this kit is selected
          "CostCalculator": "" // if set will point to an AWS cost calculator link or the pricing for the principal service
        },
        {
          "Name": "Hello World CDK",
          "Manifest": "hello.json"
        },
        {
          "Name": "Python CDK App",
          "Manifest": "python-cdk-app.json"
        }
      ]
    }
  ]
}
```

## Python projects

In your app.py, read in and pass your parameters.json file like so:

``` python
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

## Typescript projects

You need this in your `tsconfig.ts` file:

``` json
    "resolveJsonModule": true,
```
In your `bin/app.ts` you need to read the `parameters.json` file and pass it into your stack.

```javascript

import { readFileSync } from 'fs';
import { resolve } from 'path';

const params = JSON.parse(readFileSync(resolve(__dirname, '../', 'parameters.json')).toString());

new MyStack(app, 'my-stack', {
  params: params,
  env: { account: params["account"], region: params["region"] },
});

```

In your `lib/app-stack.ts` you need to define your params and their types:

``` javascript
interface KitStackProps extends cdk.StackProps {
  params: {
    account: string,
    region: string
  };
}
```

Your `buildspec.yml` file should contain

``` yaml
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