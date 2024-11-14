# Kits README

## cfn-templates directory

"Classic" Starter Kits are self-contained CloudFormation templates. Other than ensuring they are in JSON format, the only other thing you must to do to have them supported in the app are to add them to the `catalogue.json` in the root of the `cfn-templates` directory.

``` json
{
  "Catalogue": [
    {
      "Category": "Networking",
      "Kits": [
        {
          "Name": "VPC",
          "Manifest": "VPC.json",
          "Description": "This stack creates and Amazon VPC (Virtual Private Cloud) in the target account. A VPC is a pre-requisite for a range of other services you may want to create in this account, eg EC2 instances must be created in a VPC.<br>This VPC will create 3 public subnets, 3 private subnets and NAT Gateways to enable outbound access to the Internet from the private subnets. The public subnets will be accessible from the Internet via an Internet Gateway.",
          "CostCalculator": "",
          "VpcRequired": false
        }
      ]
    },
    {
      "Category": "Compute",
      "Kits": [...]
    }
  ]
}
```

## cdk-apps directory

CDK projects are in the `cdk-apps` directory. They must not be nested more than one folder deep and must contain a `buildspec.yml` at the archive root that instructs CodeBuild how to deploy each app. CDK apps written in any language that is supported by CDK and can be deployed using CodeBuild.

```
cdk-apps/
├─ app1/
│  ├─ buildspec.yaml
│  ├─ app.py
│  ├─ etc...
├─ app1.json
├─ app2
│  ├─ buildspec.yaml
│  ├─ package.json
│  ├─ bin/app.ts
│  ├─ lib/etc...
├─ app2.json
├─ catalogue.json
```

Each app must have a JSON file at the same level as the CDK project that contains a `Stacks` property that describes the stacks that will be tracked by the Electron app during deployment.

You can specify configuration items under the `Parameters` key that will be rendered by the Electron app and written into the `ConfigFile` you specify here. The config file must be a JSON file, and should contain the parameter names you have specified here.

Also in this file is a `CodeBuildPolicy` property that will be used to create the service role that will be assumed by CodeBuild when it runs the deployment commands. 

``` json
{
  "ConfigFile": "parameters.json",
  "Parameters": {
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
  "Tags": {},
  "Stacks": [
    {
      "name": "ask-vpc-nat-stack",
      "hasOutputs": true
    }
  ],
  "CodeBuildPolicy": {
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
Deploy CDK apps written in different languages by specifying different `runtime-versions` in the install phase, eg this is a sample `buildspec.yml` that will deploy a single-stack CDK project written in TypeScript:

```
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
      - cdk bootstrap
      - cdk deploy --require-approval never
cache:
  paths:
    - "node_modules/**/*"
