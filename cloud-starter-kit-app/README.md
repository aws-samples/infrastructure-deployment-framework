# Cloud Starter Kit

This project builds an [Electron](https://www.electronjs.org/) app that can be used to simplify the deployment of CloudFormation or CDK-based applications into the AWS Cloud. 

The app manages all the dependencies the end user needs, meaning they will not have to install [AWS SDK for JavaScript](https://aws.amazon.com/sdk-for-javascript/), [AWS CDK](https://aws.amazon.com/cdk/), or use the command line. The requirements to use the AWS Console are also minimal.

The app allows you to 

* deploy [AWS CloudFormation](https://aws.amazon.com/cloudformation/) templates,
* bootstrap an account for CDK, 
* install [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/home.html) apps using [AWS CodePipeline](https://aws.amazon.com/codepipeline/) and [AWS CodeBuild](https://aws.amazon.com/codebuild/), 
* use the [SDK](https://aws.amazon.com/sdk-for-javascript/) to make calls into the account, 

all from within the Electron app environment.

### Credentials and Permissions

What the app is permitted to do is determined by the policies associated with the credentials it is given. The app itself does not store any credentials between sessions.

It is always recommended that you grant the [least privileges](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#grant-least-privilege) required to perform the tasks you want the app to do.


## To Install, Build and Run

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. 

From your command line, `git clone` this repo and then `cd` into the directory root. Then:

```bash
npm install
```
To install the dependencies. 

There are two `bash` scripts you can use to launch the app. First, set them to be executable:

```bash
chmod +x build_make.sh build_start.sh 
```

and then you can start the Electron app in developer mode by running

```bash
./build_start.sh
```

or build a standalone packaged Electron app by running

```bash
./build_make.sh
```

The binary build will be output to a folder called `out` in your project directory.

>Note: If you're using Linux Bash for Windows, [see this guide](https://www.howtogeek.com/261575/how-to-run-graphical-linux-desktop-applications-from-windows-10s-bash-shell/) or use `node` from the command prompt.

## Configuring for a customer

There is a config DynamoDB table managed by AWS that contains valid keys and config objects. A config object contains the following information:

``` json
{ 
    "BusinessName" : { "S" : "Fitzroy IT" }, 
    "CountryCode" : { "S" : "AUS" }, 
    "DefaultRegion" : { "S" : "ap-southeast-2" }, 
    "LogoUrl" : { "S" : "https://res.cloudinary.com/siteglide/image/fetch/w_325,f_auto,q_auto,dpr_2.0/https://uploads.prod01.oregon.platform-os.com/instances/1027/assets/images/agency/FitzroyIT_Logo.png?updated=1585226706" }, 
    "PreferredLanguage" : { "S" : "en-US" } }
```

Config is stored against a key, which is a short UUID string, eg `drR2YH5q9SL2njzpdRpc5j`. Each customer config is uniquely identified by their UUID.

The customer will need to use a key to configure the app prior to use. Once configured via a key, the app stores the config in localStorage and does not require the key for subsequent uses.

To reload the config for the key, there is currently a link in the footer. This will probably move somewhere else.

## To use the Electron App

Once it opens you can paste temporary credentials for the account you want to use into the credentials box. The format for these credentials is the standard `Command line or programmatic access` output for setting AWS environment variables, as provided by [AWS Identity Center](https://aws.amazon.com/iam/identity-center/). 

Using [temporary credentials is best practice](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#bp-users-federation-idp), but the sample app also supports [IAM user access keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html) if you need to use them. 

Once the credentials are pasted in, click `Submit Credentials`.

If the provided credentials are valid, the view will change to show the main UI. The `regions` dropdown will be populated with the regions available to this account, and the account number will be displayed. 

The credentials, account and principal you are operating as can be seen in the `Current Credentials` tab. You can change to different credentials using the `Change Credentials` button.

### Classic Kits (CloudFormation templates)
Any CloudFormation templates found in the `cfn-templates` directory will be listed in the drop-down on the "Classic Kits" tab, and can be deployed by clicking the `Deploy Template` button. Output will appear in the "Deployments Progress" panel.

### CDK Kits 
Available CDK apps are installed in the `cdk-apps` directory and made available in the drop-down on the "CDK Kits" tab, and can be deployed by clicking the `Deploy CDK App` button. Output will appear in the "Deployments Progress" panel.

>Note: if an account and region has not been bootstrapped for CDK, a `Bootstrapping required` message will appear. Click the `Bootstrap CDK` button to bootstrap the account/Region combination to support deploying CDK apps.

CDK apps are deployed via a CodePipeline pipeline and use CodeBuild to deploy the app.

### SDK Commands
To see a sample SDK call, click the `List Buckets` button to list the buckets in your account. Provided that the credentials you have supplied have the necessary permissions, the output should appear in the UI under the heading `Output from SDK`.

------

## Electron docs

You can learn more about Electron on [electronjs.org](https://electronjs.org/).

## License

See the LICENSE file.
