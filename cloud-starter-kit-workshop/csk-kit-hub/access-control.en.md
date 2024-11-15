
# Kit Access Control
 


You can create a passcode that users must include in http requests to allow them to access the Kits in your Kit Hub.

#### Create a Kit Hub passcode

In the AWS console, navigate to CloudFront. Choose `Functions` on the left hand menu, and then click on the CSK kit hub function (will have `csk-kit-hub` in the name). 

In the console that appears, see the `Associated KeyValueStore` section. Click on the link to the live key value store. 

In the `KeyValueStore` details page, click the `Edit` button next to the Key-Value pairs section. Click on the editor where it currently says `none`, type in the passcode you wish to use and click the `tick` icon to confirm. Click `Save Changes`.

#### Configure a CSK

In the admin portal, create or edit a CSK. Set the `Kit Hub` to the domain name of your Kit Hub and enter your passcode in the `Kit Hub Passcode` field. Save your changes.

Now, a CSK app that uses the key associated with this CSK will receive the passcode and use it to access the protected Kit Hub's files.

Click <a href="how-it-works.en.md">next</a> to continue.