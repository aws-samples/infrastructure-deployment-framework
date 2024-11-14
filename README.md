# Infrastructure Deployment Framework

This project enables you to build a distributable, cross-platform desktop app that makes it easy for lower-skilled users to successfully deploy infrastructure into their AWS accounts. It provides a common user experience for deploying both CDK and CloudFormation-based solutions ("Kits") and reduces the complexity of deploying them - no trips to the command line, no installing of Python or Node required.

Here's what configuring a CDK-based app looks like in the app:

![Infrastructure Deployment Framework architecture](assets/app.png)

The desktop app is implemented using the popular [Electron](https://electronjs.org) framework that also powers apps such as Chime, Discord, Slack and Visual Studio Code.

Examples of wrapping user-friendly features around them to make using them easier:

* Common configuration panel for all Kits
* Pre-populating parameters with information from the user's account (eg VPCs)
* Helpers in the UI to assist in making valid choices, eg matching Arm instance types with Arm AMIs
* Simplified display of what is being deployed and deployment state

![Installing a Kit](assets/installation.png)

The framework doesn't simplify by removing choices or by compromising security. A key goal is to make it easier for you to help your users build well-architected workloads.

### What's included?

In addition to the Electron app, the framework includes a "Kit Hub", which allows you to easily create a repository of Kits that your users can browse, configure and deploy through the app. The Admin Portal that allows you to create, configure and manage access to the Kits that you make available in your app, as well as collect usage metrics.

![Infrastructure Deployment Framework architecture](assets/architecture.png)

## Next steps

To learn more about how this framework works, go through the [workshop](cloud-starter-kit-workshop/index.en.md) for the Cloud Starter Kit sample app. It goes through all the steps required to build and configure each of the components of this framework.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.