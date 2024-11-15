# General imports
import boto3
import os
import json
from datetime import datetime

dynamo_client = boto3.resource("dynamodb", region_name=os.environ["AWS_REGION"])

csk_actions_table_name = os.environ["CSK_ACTIONS_TABLE"]
stack_deployments_table_name = os.environ["STACK_DEPLOYMENTS_TABLE"]
csk_actions_table = dynamo_client.Table(csk_actions_table_name)
stack_deployments_table = dynamo_client.Table(stack_deployments_table_name)


def lambda_handler(event, context):
    print(event)
    response = {}
    payload = ""
    user_id = ""
    if isinstance(event["body"], str):
        payload = json.loads(event["body"])
    elif isinstance(event["body"], dict):
        payload = event["body"]

    # if (
    #     "requestContext" in event
    #     and "authorizer" in event["requestContext"]
    #     and "claims" in event["requestContext"]["authorizer"]
    #     and "sub" in event["requestContext"]["authorizer"]["claims"]
    # ):
    #     user_id = event["requestContext"]["authorizer"]["claims"]["sub"]
    # else:
    #     response = {"error": "no auth token"}

    allowed_keys = [
        "csk_id",
        "action",
        "partner_name",
        "country_code",
        "default_region",
        "stack_status",
        "stack_config",
        "stack_name",
        "starter_kit",
    ]
    saved_data = {}
    # print(payload)
    for key in payload:
        if key in allowed_keys:
            saved_data[key] = payload[key]

    print("storing " + json.dumps(saved_data))

    # if user_id != "":
    if "csk_id" in payload:
        csk_id = payload["csk_id"]
        if "stack_name" in payload:
            stack_status = payload["stack_status"]
            stack_name = payload["stack_name"]
            kit_id = payload["kit_id"]
            stack_deployments_table.put_item(
                TableName=stack_deployments_table_name,
                Item={
                    "csk_id": csk_id,
                    "stack_name": stack_name,
                    "stack_status": stack_status,
                    "kit_id": kit_id,
                    "data": saved_data,
                    "datetime": str(datetime.timestamp(datetime.now())),
                },
            )
            response = {"result": "stack name recorded"}
        elif "action" in payload:
            csk_actions_table.put_item(
                TableName=csk_actions_table_name,
                Item={
                    "csk_id": csk_id,
                    "partner_name": if_set("partner_name", saved_data),
                    "country_code": if_set("country_code", saved_data),
                    "action": if_set("action", saved_data),
                    "starter_kit": if_set("starter_kit", saved_data),
                    "data": saved_data,
                    "datetime": str(datetime.timestamp(datetime.now())),
                },
            )
            response = {"result": "csk_id action recorded"}
        else:
            response = {"result": "csk_id no action requested"}
    else:
        print("no id found")
        response = {"result": "no token"}

    return {
        "statusCode": 200,
        "headers": {
            "Content-type": "application/json",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST",
        },
        "body": json.dumps(response),
        "isBase64Encoded": False,
    }


def if_set(key, saved_data):
    if key in saved_data:
        return saved_data[key]
    else:
        return ""
