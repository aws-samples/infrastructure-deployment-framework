
# Deploying the CSK Admin portal
 


Before you install this project you will need to register a domain name, or create 
a subdomain of an existing domain, and delegate it to Route 53 in the target AWS 
account. You will need the resulting Hosted Zone ID to configure the project before
you run it.

>**NOTE:** you must create an A record for the root domain in Route 53 before you will be able to use it with Cognito (if you don't you will get an error when attempting to build the Cognito stack). 
>
>Also, your domain must be properly delegated to your account so DNS queries for your domain are resolved correctly by Route 53 (this is required to allow ACM to create a certificate).

## Pre-installation steps

[Download the code](https://github.com/aws-samples/infrastructure-deployment-framework), unzip it and `cd` into the `cloud-starter-kit-admin` directory. 

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
python -m venv .venv
.venv\Scripts\activate.bat
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

### Install additional dependencies 

Install the dependencies for the Lambda@Edge functions.

```
cd custom-resources
pip install crhelper -t .
```

Change directory back to the project root, then 

```
cd lambda/cognito_auth
npm install
```

>**NOTE:** If you make any changes to the Lambda@Edge functions you must force a new version to be created by modifying the resource ID for the Lambda version in the web stack. If you do not, your changes will not be propagated.


## Edit the `parameters` file

Enter into the host name and hosted zone ID you created in the prerequisite step.

```json
{
    "hosted_zone": "<your domain name>",
    "hosted_zone_id": "<your hosted zone id>",
    "environment": "prod",
    "user_pool_id": "<your cognito user pool id - fill out later>",
    "user_pool_client_id": "<your cognito user pool client id - fill out later>",
    "admin_email_domain": "<the email domain your admin users will use, without the @ symbol>"
}
```

>The Cognito settings will be exported from the Cognito stack in a future step. 

Note that the `admin_email_domain` will be used to identify the users who will have admin capabilities when logged in. Only admins can create users in the portal, and these users' email addresses will also need to be marked as verified.

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

### Deploy the stacks

Once you have entered the hosted zone info into the parameters file you can deploy the Cognito stacks:

```
cdk deploy csk-admin-cognito-stack -c env=prod
cdk deploy csk-admin-cognito-ui-stack -c env=prod
```

Once deployed, you will need to copy the exported values from the stack outputs `csk-admin-user-pool-client-id` and `csk-admin-user-pool-id` and enter their values into the `parameters.json` file.

Once you have done that, you can deploy the other two stacks. You can do this by just requesting the deployment of the WebStack, as it will automatically deploy the ApiStack first.

>Note that the web and Cognito stacks must be deployed to `us-east-1`, but the api stack can be deployed into any Region. You should deploy this to whichever Region is closest to your customers.

```
cdk deploy csk-admin-web-stack -c env=prod
```
You will see output in your console from the CloudFormation service. You can also open the CloudFormation console to check on progress.

The creation of the CloudFront distribution will take about 5 minutes, and the creation of the ACM certificate may also take 5 or so minutes.

Once complete, you should be able to navigate to your host, eg https://admin.yourhost.com/, and see a login box. Click Next to set up the admin portal. 

