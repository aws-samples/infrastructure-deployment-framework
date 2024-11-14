---
title : "Deploying the Kit Hub"
weight : 20
---

Make sure you have python and the CDK installed on your machine. Download the code for the :link[CSK Kit Hub]{href="/assets/cloud-starter-kit-repo-v1.0.1.zip" action=download} and unzip it in a working directory. 

Check the version of `python` in your path is v3 not v2:

```
python --version
```

>If the above returns a 2.x response, you may need to specify `python3` instead, both in the commands in this workshop and where `python` appears in each project's `cdk.json` file.

### Standard CDK project setup steps

Run through the standard python CDK project setup steps:

>Note that Windows users should use Powershell, not the `cmd` shell. 

```
python -m venv .venv
source .venv/bin/activate
```
or on Windows

```
% python -m venv .venv
% .venv\Scripts\activate.bat
```

Once the virtualenv is activated, you can install the required dependencies.

```
pip install -r requirements.txt
```

### Setup the parameters file

There is a file called `parameters-template.json` in the root of the project. Copy that and rename the copy `parameters-prod.json`.

```
cp parameters-template.json parameters-prod.json
```

>Note that you can create parameters files for multiple environments. For the purposes of this workshop we will assume the desired environment name is `prod`.

Now, test your setup by typing the following command. 

```
cdk synth -c env=prod
```
>We use a context variable to pass the value of `prod` to the CDK app. This value is used to identify the correct parameters file and is also included in the stack name.

If a template is displayed in the console, you're ready to move to the next step.

### Using a custom domain

If you don't want to use a custom domain, you can skip this configuration and use the default CloudFront URL.

If you want to use a custom domain name for your Kit Hub site, you first need to delegate the root hostname to Route 53 in the target AWS account. You will need the resulting Hosted Zone ID to configure the project before you run it.

>NOTE: If you are using a custom domain, please ensure it is correctly delegated to Route 53 in your account and that DNS requests resolve correctly. If you do not, ACM will be unable to create the TLS certificate for your hostname.

Enter the host name and hosted zone ID, if you have them, into the parameters file.

```json
{
    "hosted_zone": "<your domain name>",
    "hosted_zone_id": "<your hosted zone id>",
    "environment": "prod",
    "kvs_data": {
        "data": [
            {
                "key": "x-access-control",
                "value": "none"
            }
        ]
    }
}
```
>NOTE: The `kvs_data` parameter is used to create a CloudFront Key Value Store that can contain a shared secret you can use to restrict access to the Kit Hub's starter kits. For now, you should leave this set to "none".

## Deploying

Make sure your CLI has credentials for the account to which you wish to deploy - internal users can get them from Isengard, external users can <a target="_blank" href="https://aws.amazon.com/blogs/security/aws-single-sign-on-now-enables-command-line-interface-access-for-aws-accounts-using-corporate-credentials/">get temporary credentials</a> from IAM Identity Center or from Cloudshell, using these commands:

For MacOS:

```
aws configure export-credentials --format env
```
Or for Windows:
```
aws configure export-credentials --format powershell
```

Copy and paste the credentials block into your CLI, and check them by calling:

```
aws sts get-caller-identity
```
Then, assuming you have the right credentials, you will need to bootstrap the Regions you will use. 

### CDK Bootstrapping

Bootstrapping creates roles and a bucket in your account that are used by CDK. Once you have bootstrapped an account and Region, you will see a stack called `CDKToolkit` in your CloudFormation console. 

>Please don't delete the `CDKToolkit` stack. It does not cost anything to have it in your account and if you delete it it can cause issues later if you decide you want to use CDK again.

You must bootstrap `us-east-1` in addition to whichever local Region you may use, as CloudFront and other globally-scoped services will be created in `us-east-1`. Replace `<accountid>` and `<local-region-id>` in the following commands with the account you are deploying to:

```
cdk bootstrap aws://<accountid>/us-east-1 -c env=prod
cdk bootstrap aws://<accountid>/<local-region-id> -c env=prod
```

to bootstrap the account and Region.

### Deploying the project

Assuming all the above has been done, you should be ready to deploy. To do so, issue the following command:

```
cdk deploy -c env=prod
```
You will see output in your console from the CloudFormation service. You can also open the CloudFormation console to check on progress.

The creation of the CloudFront distribution will take about 5 minutes, and if you are using a custom domain, the creation of the ACM certificate may also take 5 or so minutes.

Once complete, you should be able to navigate to your host and see files, eg

* https://kits.yourhost.com/index.html
* https://kits.yourhost.com/about/index.html
* https://kits.yourhost.com/kits/cdk-apps/ec2.json (should return a 403 page if access control is in place)

#### Updating the Kit Hub files

Once you have the base deployment done, you can modify the contents under the `www` director in this project and run `cdk deploy` again to upload your changes to your Kit Hub. We'll cover this in more detail later.

Click Next to read about how to use the Kit Hub.
