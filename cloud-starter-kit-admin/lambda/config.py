# General imports
import boto3
import os
import json

dynamo_client = boto3.resource("dynamodb", region_name=os.environ["AWS_REGION"])

csk_config_table_name = os.environ["CSK_CONFIG_TABLE"]
csk_config_table = dynamo_client.Table(csk_config_table_name)
distributor_config_table_name = os.environ["DISTRIBUTOR_CONFIG_TABLE"]
distributor_config_table = dynamo_client.Table(distributor_config_table_name)


def lambda_handler(event, context):

    # print(event)
    result = event
    payload = {}
    if isinstance(event["body"], str):
        payload = json.loads(event["body"])
    elif isinstance(event["body"], dict):
        payload = event["body"]

    if "csk_id" in payload:
        csk_id = payload["csk_id"]
        # get record from table matching csk_id
        response = csk_config_table.get_item(Key={"csk_id": csk_id})
        if "Item" in response:
            result = response["Item"]["config"]
            result["csk_id"] = response["Item"]["csk_id"]
            if "distributor_id" in response["Item"]:
                disti_config = distributor_config_table.get_item(
                    Key={"distributor_id": response["Item"]["distributor_id"]}
                )
                if "Item" in disti_config:
                    result["distributor"] = disti_config["Item"]["config"]
                    # favour CSK-specific FileHost if there is one, otherwise use the disti one, if there is one
                    # if neither is set, app will use baked-in FileHost
                    if (
                        result["FileHost"] == ""
                        and "FileHost" in result["distributor"]
                        and result["distributor"]["FileHost"] != ""
                    ):
                        result["FileHost"] = result["distributor"]["FileHost"]
        else:
            result = {"result": "no config for {}".format(csk_id)}

    else:
        print("no id found")
        result = {"result": "no csk_id in request"}

    return {
        "statusCode": 200,
        "headers": {
            "Content-type": "application/json",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST",
        },
        "body": json.dumps(result),
        "isBase64Encoded": False,
    }
