---
title : "Using the CSK Admin portal"
weight : 45
---

## Before you log in

#### Create a Cognito user

Once the stacks are deployed you will need to manually create 
your first Cognito user via the Cognito console. Once created, copy the user_id (it's a UUID) and keep it handy for the next step.

#### Update DynamoDB

The DynamoDB tables are seeded with some sample data to get you started. Edit the record in the table that includes the string `userdistributors` (all the table names have been exported from the api stack, for your convenience) and replace the user_id with your user_id.

#### Log in

Navigate to your admin hostname and you should be prompted to log in. Once in, you should see the generic distributor and be able to create and edit CSKs.

>NOTE: To use your own custom Admin Portal you will need to configure the CSK app to point to your admin host and rebuild it. Specifically you will need to edit the `main.js` file under `src` and replace the `ADMIN_HOST` and `REPORTING_HOST` entries with your own admin portal's host name.

Click Next if you would like to delete any of the projects you have deployed.