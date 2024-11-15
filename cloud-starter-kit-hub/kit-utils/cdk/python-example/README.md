
# VPC CDK project

This is a simple example of a CDK project that uses Python and deploys via the Electron Cloud Starter Kit.

## Configuring the CDK project using the app

In the `cdk-apps` root directory there are project.json files that allow you to drive the behaviour of the Electron app. Each has the name of the project as the file name, with `.json` appended, eg this project is in the `vpc` directory and has a project file in `cdk-apps` called `vpc.json` which contains the following:

``` json
{
    "AppName": "VPC with NAT", //name that will appear in the drop-down
    "ConfigFile": "parameters.json", //location and name of CDK config file
    "Parameters": { //any config items you want to pass into your CDK project
        "natCount": {
            "Label": "NAT Gateway Count",
            "Description": "How many NAT Gateway instances do you want to include?",
            "AllowedValues": [
                0,
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

## How parameters get from the App to CDK

The `parameters.json` file in the project root is written to during the deployment process prior to the project being zipped and uploaded. Any config items you specify will be added to that file. Inside your app you read and parse this file and then used the resulting configuration items as required.

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
          "Manifest": "app1.json"
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


## Common CDK doco

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
