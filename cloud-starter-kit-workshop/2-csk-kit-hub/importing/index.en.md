---
title : "Importing Your Kits"
weight : 26
---

The CSK is designed to support the deployment of existing CloudFormation and CDK-based projects (Kits) with as few modifications as possible. This document will walk through the process of bringing a typical CloudFormation and CDK-based Kit into the CSK.

>NOTE: Before you begin you should check the Kit Hub project into a Git repo so that your kits, and the CDK project that deploys them to your Kit Hub, are under version control. For this you can make a private repository on Github, Gitlab or another Git provider. 

## Working with JSON

You should edit the JSON files used in the Kit Hub in an IDE, like Visual Studio Code, that has JSON file support. This will enable syntax highlighting, bracket matching and indenting that will make editing these files easier. Visual Studio Code can be downloaded for free [here](https://code.visualstudio.com/download).

## The Kit Utils directory

Take a look at the `kit-utils` directory in the Kit Hub project. It contains some useful resources to help you get started with bringing your Kits into the CSK.

For CloudFormation template-based projects, the `cfn` sub-directory contains CloudFormation helper scripts and examples. 

For CDK-based projects, the `cdk` directory contains sample projects for TypeScript, Javascript and Python.

## Supported Parameter Types

The CSK has specific rendering logic for some CloudFormation parameter types. These are supported for both CFN and CDK-based Kits:

* `AWS::EC2::Image::Id` - this will be rendered as a drop-down of available AMIs
* `AWS::EC2::KeyPair::KeyName` - fetches and displays a drop-down of available KeyPairs. If no KeyPair exists, displays a button to allow the user to create one.
* `AWS::EC2::VPC::Id` - shows a drop-down of the VPCs available in the account. Will not display the default VPC.
* `AWS::EC2::Subnet::Id` - shows the Subnets available in the chosen VPC. Can also insert a synthetic parameter containing the availability zone that the chosen subnet is in.
* `AWS::Route53::HostedZone::Id` - renders as a drop down of available hosted zones. Value is the hosted zone id but also synthesises a parameter containing the corresponding hosted zone name.

It also adds some CSK-specific Types:

* `CSK::PrefixList` - when coupled with a `Service` parameter, will return the AWS-managed prefix list ID for that service in the chosen Region. Service can be one of 
  * `cloudfront` (in SYD, returns "pl-b8a742d1")
  * `dynamodb` (in SYD, returns "pl-62a5400b")
  * `ec2-instance-connect` (in SYD, returns "pl-0e1bc5673b8a57acc")
  * `groundstation` (in SYD, returns "pl-08d24302b8c4d2b73")
  * `route53-healthchecks` (in SYD, returns "pl-08c8dbfdeb99a899b")
  * `s3` (in SYD, returns "pl-6ca54005")
  * `vpc-lattice` (in SYD, returns "pl-0c711dc34c6f2a9d0")
* `CSK::InstanceType` - a drop-down of all the available instance types is shown
* `CSK:UserIp`, we fetch the user's external IP address and set the value of that parameter to match it. Will also be used where the Parameter has the default value of `0.0.0.0/0`. This is so we scope down access by default.
* `CSK::DbEngineVersion` - will render as a drop-down of RDS engine versions that are available in the Region
* `CSK::DbInstanceClass` - will render as a drop-down of RDS instance classes that are available in the Region for the chosen DB Engine
* `CSK::Userdata` - renders as a textarea and will pull in sample userdata scripts that you will find under `scripts/userdata`
* `CSK::VpcEndpoint` - creates the parameter as a hidden field with the value set to a JSON-encoded object containing any VPC endpoints that exist in the chosen Region, keyed by VPC ID, eg
```json
{
    "vpc-00b16be5abd5e64b7": {
        "com.amazonaws.ap-southeast-2.s3": "vpce-0e503f5182968ab7e"
    },
    "vpc-0949519b06bff56f2": {
        "com.amazonaws.ap-southeast-2.s3": "vpce-0af8c099a55cb9989",
        "com.amazonaws.ap-southeast-2.dynamodb": "vpce-0b71aa1d99c7e77fe",
        "com.amazonaws.ap-southeast-2.ssmmessages": "vpce-091ca46458fed00b5",
        "com.amazonaws.ap-southeast-2.ec2messages": "vpce-0560eefaec556d3f2",
        "com.amazonaws.ap-southeast-2.secretsmanager": "vpce-0c60c92f2b64f3fc9",
        "com.amazonaws.ap-southeast-2.ssm": "vpce-0417f472c589d2dff"
    },
    "vpc-0b20bd35fd2f300e3": {
        "com.amazonaws.ap-southeast-2.s3": "vpce-06d1311a5782332b7",
        "com.amazonaws.ap-southeast-2.dynamodb": "vpce-034b8af82aa86c2a5"
    }
}
```
* `CSK::EicEndpoint` - creates the parameter as a hidden field with the value set to a JSON-encoded object containing data an array of EC2 Instance Connect endpoints (with State=`create-complete`) that have been created in the current VPC, eg
```json
[
    {
        "OwnerId": "319009603054",
        "InstanceConnectEndpointId": "eice-03905f4c709561765",
        "InstanceConnectEndpointArn": "arn:aws:ec2:ap-southeast-2:319009603054:instance-connect-endpoint/eice-03905f4c709561765",
        "State": "create-complete",
        "StateMessage": "",
        "DnsName": "eice-03905f4c709561765.48cb4dcd.ec2-instance-connect-endpoint.ap-southeast-2.amazonaws.com",
        "NetworkInterfaceIds": [
            "eni-090ccc25311e0faf3"
        ],
        "VpcId": "vpc-0b20bd35fd2f300e3",
        "AvailabilityZone": "ap-southeast-2a",
        "CreatedAt": "2024-11-09T06:14:57.000Z",
        "SubnetId": "subnet-04cfe0b715e5c2cd4",
        "PreserveClientIp": false,
        "SecurityGroupIds": [
            "sg-08c7610e2ebd77421"
        ],
        "Tags": []
    }
]
```

If the Parameter has a property

* `AllowedValues` - a drop-down of the allowed options is shown

All other CloudFormation parameters will be rendered with standard HTML `<input>` elements, with the `type` attribute set to either `text` or `number`, depending on the Parameter type. If the parameter `Type` is set to `String` and `MaxLength` is set to 50 or greater, it will be rendered using a `textarea` and its value will be base64 encoded before being passed to the Kit. 

## Client-side Parameter validation

The CSK app supports client-side input validation using standard HTML5 validation support. An icon in the UI will be displayed in fields where validation is being performed to indicate whether the input is valid or not. 

## Testing your Kits

We recommend you check your CFN templates using [cfn-nag](https://github.com/stelligent/cfn_nag). A Powershell script to assist in installing this on Windows is :link[here]{href="/assets/install-cfn-nag.ps1" action=download} - note you will need to run this as an Administrator. On MacOS you can install cfn-nag using Homebrew.

You can test CDK-based Kits by including the npm module [cdk-nag](https://github.com/cdklabs/cdk-nag) in your projects.

There are plugins for VSCode that can help integrate these tools into your development workflow, e.g.

* [CloudFormation Linter](https://marketplace.visualstudio.com/items?itemName=kddejong.vscode-cfn-lint)
* [Cfn-Nag Linter](https://marketplace.visualstudio.com/items?itemName=eastman.vscode-cfn-nag)


## Deploying your imported Kits to your Kit Hub

Once you have added your Kits to the Kit Hub project and updated the `catalogue.json` and other files as needed, you should perform a `cdk deploy` to install your changes. This will bundle your files and deploy them to your Kit Hub. 

By pairing this deployment approach with storing your Kit Hub code and kits in a Git repo, you gain visibility into changes made to it and can be sure it is always deployed correctly.

