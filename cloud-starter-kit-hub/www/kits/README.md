# Kits README

## cfn-templates directory

"Classic" Starter Kits are self-contained CloudFormation templates. Other than ensuring they are in JSON format, the only other thing you must to do to have them supporting in the app are to add them to the `catalogue.json` in the root of the `cfn-templates` directory.

``` json
{
    "Catalogue": [
        {
            "TopLevelCategory": "Foundations",
            "Category": "Security",
            "Kits": [
                {
                    "Name": "Foundational Security Controls",
                    "Description": "This kit deploys baseline security controls in the account - Amazon GuardDuty, AWS Config and AWS CloudTrail.",
                    "Templates": [
                        "management-governance.json"
                    ],
                    "VpcRequired": false
                }
            ]
        },
        {
            "TopLevelCategory": "Foundations",
            "Category": "Cost Management",
            "Kits": [
                {
                    "Name": "Cost Management Foundations",
                    "Description": "This stack creates an AWS Budget and budget alert in the target account.",
                    "Templates": [
                        "cost-management.json"
                    ],
                    "VpcRequired": false
                }
            ]
        }
    ]
}
```

## cdk-apps directory

CDK projects are in the `cdk-apps` directory. They must not be nested more than one folder deep and must contain a `buildspec.yml` at the archive root that instructs CodeBuild how to deploy each app. CDK apps written in any language that is supported by CDK can be deployed using CodeBuild.

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

``` json
{
  "Catalogue": [
    {
      "TopLevelCategory": "Foundations",
      "Category": "Networking",
      "Description": "These kits help you establish good foundations in an AWS Account. They include basic security and compliance tools, cost controls and network setup.",
      "Kits": [
        {
          "Name": "VPC with NAT",
          "Manifest": "vpc-with-nat.json",
          "Description": "This stack creates and Amazon VPC (Virtual Private Cloud) in the target account. A VPC is a pre-requisite for a range of other services you may want to create in this account, eg EC2 instances must be created in a VPC.<br>This VPC will create 3 public subnets and 3 private subnets. The public subnets will be accessible from the Internet via an Internet Gateway.<br>NAT Gateways enable outbound access to the Internet from the private subnets - add more than one to have multi-AZ resilience for NAT. ",
          "CostCalculator": "https://calculator.aws/#/estimate?id=8959e91d8c49f6c9ac695cb2dce398b032c4169b"
        },
        {
          "Name": "VPC without NAT",
          "Manifest": "vpc-without-nat.json",
          "Description": "This stack creates and Amazon VPC (Virtual Private Cloud) in the target account. A VPC is a pre-requisite for a range of other services you may want to create in this account, eg EC2 instances must be created in a VPC.<br>This VPC will create 3 public subnets and 3 private subnets. The public subnets will be accessible from the Internet via an Internet Gateway.",
          "CostCalculator": "https://calculator.aws/#/estimate?id=f5d27ea6e30b72437f63c27338f9315e3fd3a36e"
        }
      ]
    },
    {
      "TopLevelCategory": "Basic Components",
      "Category": "Virtual Machines",
      "Kits": [
        {
          "Name": "Single EC2 instance",
          "Description": "A kit to create a single server instance, with or without a DNS hostname and SSL certificate. Each unique server name you specify will be created in its own CloudFormation stack.",
          "Manifest": "ec2.json",
          "AllowUpdates": "false"
        }
      ]
    },
    {
      "TopLevelCategory": "Common Patterns",
      "Category": "Messaging and Events",
      "Kits": [
        {
          "Name": "Simple Queue",
          "Description": "If you need to start out with message queues and notifications, the kits you need are here.",
          "Manifest": "queue.json"
        }
      ]
    }
  ]
}
```
Deploy CDK apps written in different languages by specifying different `runtime-versions` in the install phase, eg this is a sample `buildspec.yml` that will deploy a single-stack CDK project written in TypeScript:

```yaml
# buildspec.yml
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      - cd $CODEBUILD_SRC_DIR
      - pwd
      - ls -l
      - npm install aws-cdk -g
      - npm install
  build:
    commands:
      - pwd
      - ls -l
      - npm run build
      - cdk bootstrap --termination-protection
      - cdk deploy --require-approval never
cache:
  paths:
    - "node_modules/**/*"

```
