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

| Kit Parameter | Purpose |
| -------- | ------- |
| Name | The title that will be displayed for this Kit |
| Description | The descriptive text that will appear under the Kit title |
| Templates | One or more template names. If multiple specified, they will be deployed in the same order as they appear here |
| CostCalculator | Add a URL to the AWS Calculator configured to include the services in your Kit |
| VpcRequired | If your Kit requires a VPC to have been created in this account, set to `true`, otherwise set it to `false` or don't include this parameter |
| AmiFilter | If set to one of `Windows`, `Ubuntu` or `AmazonLinux` will filter the list of AMIs to only include those OSes |

### Display configuration

The order in which Kits are displayed in the app, and the descriptive text for each top-level category, is determined by the `top-level-categories.json` file in the `kits` directory root.

The descriptive text for each sub-category is read from `category-descriptions.json`, again in the `kits` directory root.

The structure should end up looking like this:

``` json
{
    "Catalogue": [
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
                    "CostCalculator": "",
                    "VpcRequired": false
                }
            ]
        },
        {
            "TopLevelCategory": "Basic Components",
            "Category": "Virtual Machines",
            "Kits": [
                {
                    "Name": "Ubuntu VM",
                    "Description": "This stack creates a Ubuntu EC2 instance in the target account.",
                    "Templates": [
                        "EC2-ubuntu.json"
                    ],
                    "AmiFilter": "Ubuntu",
                    "VpcRequired": true
                }
            ]
        },
        {
            "TopLevelCategory": "Advanced Solutions",
            "Category": "Migration",
            "Kits": [
                {
                    "Name": "Windows Migration Kit",
                    "Description": "This stack creates a Windows Migration Kit in the target account.",
                    "Templates": [
                        "azmapper.json",
                        "windows-migration-starter-kit.json"
                    ],
                    "CostCalculator": "",
                    "VpcRequired": true
                }
            ]
        },
    ]
}
```

