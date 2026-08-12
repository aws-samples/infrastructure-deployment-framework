
# Cloud Starter Kit Repo project

This project, built using CDK with Python, is the Repo companion to the Cloud Starter Kit (CSK) App.

The CSK App is a desktop app (built using the Electron framework) that facilitates the deployment of solutions on AWS. The CSK App looks like this:

![Cloud Starter Kit screen grab](www/images/main-screen-generic.png "Cloud Starter Kit")

The CSK Repo project creates the infrastructure you need to host your own Starter Kits for the CSK App.

## CSK Repo Architecture

The repo portal deploys the following AWS services:

* Amazon CloudFront (CDN and request auth/routing)
* Amazon S3 (Object storage for web-accessible content)
* AWS Lambda@Edge (Used by CloudFront to enable directory index files)
* Amazon Route 53 (DNS records, optional)
* AWS Certificate Manager (TLS certs to use with API gateway and CloudFront, optional)

It deploys example content into the `Kit Repository` S3 bucket as per the diagram below. The diagram simplifies the architecture a little to avoid clutter and the bit this project deploys is highlighted in orange.

![Cloud Starter Kit Admin Portal architecture diagram](www/images/csk-architecture-repo.png "Cloud Starter Kit Admin Portal architecture")

## Prerequisites

If you want to use a custom domain name for your Kit repository site, you first need to  delegate the root hostname to Route 53 in the target AWS 
account. You will need the resulting Hosted Zone ID to configure the project before
you run it.

If you don't want to use a custom domain, you can skip that configuration and use the default CloudFront URL.

## The `parameters.json` file

There is a file `parameters-template.json` in the root of the project. Copy that and
rename the copy `parameters.json`. Enter into it the host name and hosted zone ID you 
created in the prerequisite step.

```json
{
    "hosted_zone": "<your domain name>",
    "hosted_zone_id": "<your hosted zone id>",
    "environment": "<eg prod or dev>"
}
```

## Deploying

Make sure your CLI has credentials for the account you wish to deploy to, then

```
cdk deploy
```

## About the directories under `www`

### about

You can put content here that gives users additional information about your Kits. 

This URL will appear in a popup window if the user chooses `About the Cloud Starter Kit` from the app's context menu (right-click in the app).

### help

You can put content here that will help people use your Kits. 

This URL will appear in a popup window if the user chooses `Cloud Starter Kit Help` from the CSK App's Help menu.

### kits

The Kits directory holds your Kits. At the root of this directory you must have:

```
/
├─ index.html
├─ top-level-categories.json
├─ category-descriptions.json
├─ cdk-apps/
├─ cfn-templates/
```

### index.html

This is a simple HTML file that will be served to anyone requesting the `/kits/` route of your Repo site. Nothing in the app points to this file so you can choose whether or not you want to customise it. It may be useful from an SEO point of view if you publicise the `/kits/` route anywhere.

### top-level-categories.json

This is where you define the categories that will be displayed in the main content area of the app. 

![Cloud Starter Kit screen grab](www/images/main-screen-generic-tlc.png "Cloud Starter Kit")

The `top-level-categories.json` contains a JSON array of top-level category objects:


```
[ 
    {
        "Label": "Common Patterns",
        "Description": "These kits solve for common patterns using multiple AWS services.",
        "CategoryOrder": [
            "Migration",
            "Backup",
            "Identity",
            "Messaging and Events"
        ]
    },
    {...}
]
```

The parameters in each top-level category are:

| Parameter | What it defines |
| -------- | ------- |
| Label | The text that will be displayed in the heading area |
| Description | The text that will appear under the heading at the top of each top-level category page |
| CategoryOrder | An array of sub-categories. Sets the order in which Kits within those categories will appear for this top-level category |


### category-descriptions.json

The `category-descriptions.json` file contains a JSON object with key/value pairs where the keys are the category label and the values are the descriptive text that will appear under the category heading.

![Cloud Starter Kit screen grab](www/images/main-screen-generic-category-desc.png "Cloud Starter Kit")

```
{
    "Networking": "Set up Amazon VPC (Virtual Private Clouds) and more.",
    "Virtual Machines": "Create EC2 instances with a range of hardware configurations and operating systems.",
    "Databases": "Create database solutions with popular databases such as MySQL, PostgreSQL, and MSSQL using Amazon RDS (Relational Database Service).",
}
```

### The `cdk-apps` directory

CDK app-based Kits are stored in the cdk-apps directory. The structure for this directory is:

```
cdk-apps/
├─ catalogue.json
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
```

### catalogue.json

At the root of the `cdk-apps` directory there is the `catalogue.json` file. This contains a JSON object with a key `Catalogue` that contains an array of CDK app collections grouped by a top-level category and sub category. Each CDK app collection contains an array of Kit objects that define metadata about each Kit in the collection.

![Cloud Starter Kit screen grab](www/images/main-screen-generic-catalogue.png "Cloud Starter Kit")

``` json
{
  "Catalogue": [
    {
      "TopLevelCategory": "Foundations",
      "Category": "Networking",
      "Kits": [
        {
          "Name": "VPC with NAT",
          "Manifest": "vpc-with-nat.json",
          "Description": "This stack crea...e for NAT. ",
          "CostCalculator": "https://calculator.aws/#/estimate?id=4169b"
        },
        {
          "Name": "VPC without NAT",
          "Manifest": "vpc-without-nat.json",
          "Description": "This stack creat...rnet Gateway.",
          "CostCalculator": "https://calculator.aws/#/estimate?id=3fd3a36e"
        }
      ]
    },
    {
      "TopLevelCategory": "Basic Components",
      "Category": "Virtual Machines",
      "Kits": [
        {
          "Name": "Single EC2 instance",
          "Description": "A kit to cre... stack.",
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
          "Description": "If you need to ...ions, the kits you need are here.",
          "Manifest": "queue.json"
        }
      ]
    }
  ]
}
```

The parameters in the catalogue are:

| Parameter | What it defines |
| -------- | ------- | 
| Catalogue | Top level object key whose value is the array of CDK app collections | 
| TopLevelCategory | Which top-level category will this collection appear under | 
| Category | The sub category this collection of CDK app Kits will appear under | 
| Kits | The array of CDK app Kits that are in this collection | 
| Name | The name of this Kit as it will appear in the UI |
| Description | The description of this Kit as it will appear in the UI |
| Manifest | The individual Kit's JSON manifest file name. Must be the same as the app's directory name, appended with `.json` |
| VpcRequired | If a VPC is required for this Kit, set this to true |
| AmiFilter | Can filter the AMI list by OS by being set to Ubuntu, AmazonLinux or Windows |
| AllowUpdates† | Whether to allow updates to this Kit |

† In development

### Individual Kit JSON manifests

This individual Kit manifest JSON files are where input parameters and other metadata about the Kit are defined. 

![Cloud Starter Kit screen grab](www/images/main-screen-generic-manifest.png "Cloud Starter Kit")

It consists of a JSON file with the following structure:

```json
{
    "ConfigFile": "parameters.json",
    "ParameterGroups": [
        {
            "Label": {
                "default": "Server Details"
            },
            "Parameters": [
                "ec2Name",
                "os"
            ]
        },
        {
            "Label": {
                "default": "Networking Details"
            },
            "Parameters": [
                "vpcId",
                "subnetId"
            ]
        }
    ],
    "Parameters": {
        "ec2Name": {
            "Label": "Instance Name",
            "Description": "What name would you like to use to identify this instance?",
            "Type": "String",
            "Default": "MyWebServer",
            "AllowedPattern": "\\w{1,30}"
        },
        "os": {
            "Label": "Operating System",
            "Description": "The OS that your server will run",
            "AllowedValues": [
                "Windows",
                "Linux"
            ],
            "Default": "Linux"
        },
        "vpcId": {
            "Label": "VPC",
            "Description": "The VPC where the instance is going to be deployed",
            "Type": "AWS::EC2::VPC::Id"
        },
        "subnetId": {
            "Label": "Subnet",
            "Description": "The Subnet where this instance is going to be deployed",
            "Type": "AWS::EC2::Subnet::Id"
        }
    },
    "Tags": {},
    "Stacks": [
        {
            "name": "csk-ec2-stack",
            "resourceCount": 15,
            "hasOutputs": false
        }
    ],
    "FileList": [
        "ec2/bin/ec2.js",
        "ec2/lib/ec2.js",
        "ec2/buildspec.yml",
        "ec2/cdk.json",
        "ec2/package.json",
        "ec2/parameters-template.json"
    ]
}
```

| Parameter | What it defines |
| -------- | ------- | 
| ConfigFile | The config file that will be used to pass parameters set in the app into the CDK app | 
| ParameterGroups | Array of objects containing a Label and Parameters key, used to group parameters in the UI | 
| Parameters | A JSON object where the keys are parameters that will be passed into the CDK app at deploy time. Parameters use the same syntax as CloudFormation parameters. |
| Tags | Key-Value pairs that should be created as Tags on the stack |
| Stacks | Array of stack objects that describe the stacks that will be created by this Kit |
| name | The stack name that the CSK app should track when this Kit is being deployed |
| resourceCount | The number of resources this stack is expected to deploy |
| hasOutputs | Whether this stack will produce CloudFormation outputs |
| FileList | The files needed to enable this kit to be deployed. |

### The `cfn-templates` directory

The `cfn-templates` directory has the following structure:

```
cdk-apps/
├─ catalogue.json
├─ kit_template1.json
├─ kit_template2.json
```

As with the `cdk-apps` directory, the Catalogue file add some metadata around the projects that appears in the UI in the same places it appears with the CDK Catalogue.

```json
{
    "Catalogue": [
        {
            "TopLevelCategory": "Foundations",
            "Category": "Security",
            "Kits": [
                {
                    "Name": "Foundational Security Controls",
                    "Description": "This kit deploys baseline security controls.",
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
                    "Description": "This stack creates an AWS Budget and budget alert .",
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

Parameters are exactly the same as for the CDK Kits, with the exception of the Templates parameter.

| Parameter | What it defines |
| -------- | ------- | 
| Catalogue | Top level object key whose value is the array of CDK app collections | 
| TopLevelCategory | Which top-level category will this collection appear under | 
| Category | The sub category this collection of CDK app Kits will appear under | 
| Kits | The array of CDK app Kits that are in this collection | 
| Name | The name of this Kit as it will appear in the UI |
| Description | The description of this Kit as it will appear in the UI |
| Templates | An array of templates that will be deployed as part of this Kit |
| VpcRequired | If a VPC is required for this Kit, set this to true |
| AmiFilter | Can filter the AMI list by OS by being set to Ubuntu, AmazonLinux or Windows |
| AllowUpdates† | Whether to allow updates to this Kit or not |

† In development

## Deploying projects with the CSK

Put kits in the `cdk-apps` or `cfn-templates` directory as appropriate. 

For CloudFormation template-based projects, look in the `kit-utils/cfn` directory in this repo, and refer to [CFN_PROJECT_PREP](CFN_PROJECT_PREP.md). Note that CFN templates must be in JSON format and there is a script in that directory to allow you to flip them from YAML. Do not try to use a generic converter as CloudFormation YAML has some features that will not convert correctly.

For CDK-based projects, look in the `kit-utils/cdk` directory in this repo - it contains sample projects for TypeScript, Javascript and Python. If you can choose, Javascript is slightly faster to deploy.

[CDK_APP_PREP](CDK_APP_PREP.md) has some additional information if you need it.






---

### Generic CDK instructions to assist with installing this project

The `cdk.json` file tells the CDK Toolkit how to execute your app.

This project is set up like a standard Python project.  The initialization
process also creates a virtualenv within this project, stored under the `.venv`
directory.  To create the virtualenv it assumes that there is a `python3`
(or `python` for Windows) executable in your path with access to the `venv`
package. If for any reason the automatic creation of the virtualenv fails,
you can create the virtualenv manually.

To manually create a virtualenv on MacOS and Linux:

```
$ python3 -m venv .venv
```

After the init process completes and the virtualenv is created, you can use the following
step to activate your virtualenv.

```
$ source .venv/bin/activate
```

If you are a Windows platform, you would activate the virtualenv like this:

```
% .venv\Scripts\activate.bat
```

Once the virtualenv is activated, you can install the required dependencies.

```
$ pip install -r requirements.txt
```

At this point you can now synthesize the CloudFormation template for this code.

```
$ cdk synth
```

To add additional dependencies, for example other CDK libraries, just add
them to your `setup.py` file and rerun the `pip install -r requirements.txt`
command.

## Useful commands

 * `cdk ls`          list all stacks in the app
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk docs`        open CDK documentation

Enjoy!
