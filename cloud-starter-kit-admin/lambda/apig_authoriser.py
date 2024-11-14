# A simple request-based authorizer example to demonstrate how to use request
# parameters to allow or deny a request. In this example, a request is
# authorized if the client-supplied headerauth1 header, QueryString1
# query parameter, and stage variable of StageVar1 all match
# specified values of 'headerValue1', 'queryValue1', and 'stageValue1',
# respectively.

# import json
import os
import boto3

dynamo_client = boto3.resource("dynamodb", region_name=os.environ["AWS_REGION"])
csk_config_table_name = os.environ["CSK_CONFIG_TABLE"]
csk_config_table = dynamo_client.Table(csk_config_table_name)


def lambda_handler(event, context):
    print(event)

    # Retrieve request parameters from the Lambda function input:
    headers = event["headers"]
    queryStringParameters = event["queryStringParameters"]
    pathParameters = event["pathParameters"]
    stageVariables = event["stageVariables"]

    # Parse the input for the parameter values
    tmp = event["methodArn"].split(":")
    apiGatewayArnTmp = tmp[5].split("/")
    awsAccountId = tmp[4]
    region = tmp[3]
    restApiId = apiGatewayArnTmp[0]
    stage = apiGatewayArnTmp[1]
    method = apiGatewayArnTmp[2]
    resource = "/"

    if apiGatewayArnTmp[3]:
        resource += apiGatewayArnTmp[3]

    # Perform authorization to return the Allow policy for correct parameters
    # and the 'Unauthorized' error, otherwise.

    # secret header set by lambda@edge, x-csk set by app
    if headers["secret"] == "mZu!n*B@7E9H@iTycuxXWbWVo_":
        if "x-csk" in headers:
            # check csk is valid
            response = csk_config_table.get_item(Key={"csk_id": headers["x-csk"]})
            if "Item" in response:
                response = generateAllow("me", event["methodArn"])
                print("authorized by csk...{}".format(headers["x-csk"]))
            else:
                response = generateDeny("me", event["methodArn"])
                print("denied by csk...{}".format(headers["x-csk"]))
        else:
            response = generateDeny("me", event["methodArn"])
            print("denied as x-csk header not present")
    else:
        response = generateDeny("me", event["methodArn"])
        print("denied as secret header not present...")

    return response

    # Help function to generate IAM policy


def generatePolicy(principalId, effect, resource):
    authResponse = {}
    authResponse["principalId"] = principalId
    if effect and resource:
        policyDocument = {}
        policyDocument["Version"] = "2012-10-17"
        policyDocument["Statement"] = []
        statementOne = {}
        statementOne["Action"] = "execute-api:Invoke"
        statementOne["Effect"] = effect
        statementOne["Resource"] = resource
        policyDocument["Statement"] = [statementOne]
        authResponse["policyDocument"] = policyDocument

    authResponse["context"] = {
        "stringKey": "stringval",
        "numberKey": 123,
        "booleanKey": True,
    }

    return authResponse


def generateAllow(principalId, resource):
    return generatePolicy(principalId, "Allow", resource)


def generateDeny(principalId, resource):
    return generatePolicy(principalId, "Deny", resource)
