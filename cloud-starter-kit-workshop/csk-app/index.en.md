
# The CSK App
 


The CSK App is built using the [Electron](https://www.electronjs.org/) framework, and manages all the dependencies the end user needs, meaning they will not have to install [AWS SDK for JavaScript](https://aws.amazon.com/sdk-for-javascript/), [AWS CDK](https://aws.amazon.com/cdk/), or use the command line. The requirements to use the AWS Console are also minimal.

The app allows you to 

* deploy [AWS CloudFormation](https://aws.amazon.com/cloudformation/) templates,
* bootstrap an account for CDK, 
* install [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/home.html) apps using [AWS CodePipeline](https://aws.amazon.com/codepipeline/) and [AWS CodeBuild](https://aws.amazon.com/codebuild/), 
* use the [SDK](https://aws.amazon.com/sdk-for-javascript/) to make calls into the account, 

all from within the CSK app environment.

#### Before you begin

>**NOTE** you must build this project either on Windows or MacOS desktop computer. Although building it on Linux is possible, it has not been tested. You must [install Git](https://git-scm.com/downloads) and [Node.js v20, or later LTS version](https://nodejs.org/en/download/package-manager) on your machine before you will be able to build the app.

Click <a href="building.en.md">next</a> to continue.