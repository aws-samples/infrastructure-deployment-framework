---
title : "CFN Kits"
weight : 27
---

Most CloudFormation templates should deploy with only minor modifications. Follow these steps to allow them to be deployed by the CSK App:

## Step 1: Convert YAML to JSON

CloudFormation templates must be in JSON format before they can be used in the CSK app. If your template is already in JSON, you can skip this step.

To convert a CFN template from YAML to JSON it is important to use a tool that understands CFN-specific syntax - `cfn-flip` is the one we recommend.

To install cfn-flip:

```
pip install cfn-flip
```

To convert a file `mytemplate.yaml` to JSON:

```
cfn-flip -c mytemplate.yaml mytemplate.json
```

>NOTE: It's a good idea to check your CloudFormation templates with tools such as  [cfn-nag](https://github.com/stelligent/cfn_nag) and [cfn-lint](https://github.com/aws-cloudformation/cfn-lint) before you make them available as Kits. 


## Step 2: Check CloudFormation RegExes

[CloudFormation uses the Java Regular Expression syntax](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-regexes.html) when defining `AllowedPattern` parameter properties, which is not 100% compatible with JavaScript regular expressions. In addition, flipping from YAML to JSON means any `\` characters in your regex will have been escaped to `\\`.

The CSK app attempts to automatically fix these issues by applying the following transformations:

* escapes `/` to `\/` (Java regex allows `/` but JS interprets it as a regex delimiter)
* replaces `\\` with `\` (to decode the JSON encoding)

If you are seeing issues you should check your regular expression syntax to ensure it is valid and does what you expect, by checking it on an [online regex checker](https://regex101.com/).

>NOTE: Consider whether you really need a complex regular expression. You may be able to simplify your regular expression by inverting your logic, e.g. instead of trying to think of all the characters you want to disallow, write a regex that allows a small set of characters (or vice versa).

## Step 3: Add the Kit file to the CSK Kit Hub

Add your Kit template to the Kit Hub under the `www/kits/cfn-templates` directory.

```
www/
├─ kits/
│  ├─ cfn-templates/
│  │  ├─ catalogue.json
│  |  ├─ new_kit.json
```
## Step 4: Define your Kit object

Your new Kit will be defined using a Kit object:

```json
{
    "Name": "My New Kit",
    "Description": "This kit deploys something interesting and useful.",
    "Templates": [
        "new-kit.json"
    ],
    "VpcRequired": false
}
```

>See the previous page for a list of all the possible parameters you can use in the Kit object.

## Step 5: Decide where your Kit should appear

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