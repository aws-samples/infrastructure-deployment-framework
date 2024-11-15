# Creating CFN template projects for the AWS Starter Kit

## Configuring a CFN project using the app

Place the CFN template for your project in the `cfn-templates` root directory. 

Templates must be in JSON format - if yours is in YAML, run the `flip-yaml.sh` script to convert it to JSON:

``` sh
$ cd kits/cfn-templates
$ ./flip-yaml.sh
```

## CFN Parameters

The app will read the `ParameterGroups` and `Parameters` sections of your template (if you have defined them) and render the configuration options in the client. 

## The CFN template kit catalogue

In the root of the `cfn-templates` directory you will find `catalogue.json`. To display your project in the app you need to add it here. 

``` json
{
    "Catalogue": [
        {
            "Category": "Networking", //how kits are grouped in the drop-down
            "Kits": [
                {
                    "Name": "VPC", //what will appear in the drop-down
                    "Manifest": "VPC.json", // the CFN template that will be deployed
                    "Description": "This stack creates and Amazon VPC (Virtual Private Cloud) in the target account. A VPC is a pre-requisite for a range of other services you may want to create in this account, eg EC2 instances must be created in a VPC.<br>This VPC will create 3 public subnets, 3 private subnets and NAT Gateways to enable outbound access to the Internet from the private subnets. The public subnets will be accessible from the Internet via an Internet Gateway.", // desc to display to user to help them decide if this is the right kit for them
                    "CostCalculator": "", // if given, will add a link to the UI to allow the user to explore the costs for this solution
                    "VpcRequired": false // if this kit requires a VPC to be in the account already, set this to true to indicate that in the UI
                }
            ]
        },
        {
            "Category": "Compute",
            "Kits": [
                {
                    "Name": "Windows VM",
                    "Manifest": "EC2-windows.json",
                    "AmiFilter": "Windows",
                    "VpcRequired": true
                },
                {
                    "Name": "Ubuntu VM",
                    "Manifest": "EC2-ubuntu.json",
                    "AmiFilter": "Ubuntu",
                    "VpcRequired": true
                },
                {
                    "Name": "Amazon Linux VM",
                    "Manifest": "EC2-ubuntu.json",
                    "AmiFilter": "AmazonLinux",
                    "VpcRequired": true
                }
            ]
        }
    ]
}
```