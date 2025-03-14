# General imports
import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError
import os
import re
import json
from datetime import datetime

dynamo_client = boto3.resource("dynamodb", region_name=os.environ["AWS_REGION"])

csk_actions_table_name = os.environ["CSK_ACTIONS_TABLE"]
stack_deployments_table_name = os.environ["STACK_DEPLOYMENTS_TABLE"]
csk_config_table_name = os.environ["CSK_CONFIG_TABLE"]
distributor_config_table_name = os.environ["DISTRIBUTOR_CONFIG_TABLE"]
user_distributors_table_name = os.environ["USER_DISTRIBUTORS_TABLE"]
admin_email_domain = os.environ["ADMIN_EMAIL_DOMAIN"]

csk_actions_table = dynamo_client.Table(csk_actions_table_name)
stack_deployments_table = dynamo_client.Table(stack_deployments_table_name)
csk_config_table = dynamo_client.Table(csk_config_table_name)
distributor_config_table = dynamo_client.Table(distributor_config_table_name)
user_distributors_table = dynamo_client.Table(user_distributors_table_name)


def lambda_handler(event, context):
    print(event)
    response = {}
    payload = ""
    content_type = "text/json"
    filename = ""
    if isinstance(event["body"], str):
        payload = json.loads(event["body"])
    elif isinstance(event["body"], dict):
        payload = event["body"]

    if (
        "requestContext" in event
        and "authorizer" in event["requestContext"]
        and "claims" in event["requestContext"]["authorizer"]
        and "sub" in event["requestContext"]["authorizer"]["claims"]
    ):
        # check if user belongs to admin domain
        if (
            "email_verified" in event["requestContext"]["authorizer"]["claims"]
            and event["requestContext"]["authorizer"]["claims"]["email_verified"]
            == "true"
            and event["requestContext"]["authorizer"]["claims"]["email"].split("@")[1]
            == admin_email_domain
        ):
            user_is_admin = True

            user_id = event["requestContext"]["authorizer"]["claims"]["sub"]

            # check inputs match regex
            start_date = None
            end_date = None
            table_name = None
            data_type = None
            if "start_date" in payload and re.match(
                r"^\d{4}-\d{2}-\d{2}$", payload["start_date"]
            ):
                start_date = payload["start_date"]
            if "end_date" in payload and re.match(
                r"^\d{4}-\d{2}-\d{2}$", payload["end_date"]
            ):
                end_date = payload["end_date"]
            if "data_type" in payload and re.match(
                r"^(actions|deployments)$", payload["data_type"]
            ):
                data_type = payload["data_type"]
                table_name = (
                    stack_deployments_table_name
                    if data_type == "deployments"
                    else csk_actions_table_name
                )

            if start_date and end_date and table_name:
                # get all items from the stack_deployments_table that are between 2 dates
                items = query_items_by_date_range(
                    start_date, end_date, table_name, data_type, user_id
                )
                # print(start_date)
                # print(end_date)
                # print(table_name)
                # print(items)
                filename = start_date + "_" + end_date + "_" + data_type + ".csv"
                content_type = "text/csv"
                response = ""

                if data_type == "deployments":
                    response = (
                        "datetime,csk_id,partner_name,kit_id,stack_name,stack_status\n"
                    )
                    for item in items:
                        response += f"{datetime.fromtimestamp(float(item['datetime'])).strftime('%Y-%m-%d %H:%M:%S')},{item['csk_id']},{item['data']['partner_name']},{item['data']['country_code']},{item['kit_id']},{item['stack_name']},{item['stack_status']}\n"

                elif data_type == "actions":
                    response = "datetime,csk_id,partner_name,action,starter_kit\n"
                    for item in items:
                        response += f"{datetime.fromtimestamp(float(item['datetime'])).strftime('%Y-%m-%d %H:%M:%S')},{item['csk_id']},{item['data']['partner_name']},{item['country_code']},{item['action']},{item['starter_kit']}\n"
                else:
                    response = {"result": "no data found for {}".format(data_type)}
            else:
                response = {"result": "invalid request parameters"}
        else:
            print("user not admin")
            response = {"result": "not admin"}
    else:
        print("no id found")
        response = {"result": "no token"}
    if content_type == "text/json":
        return {
            "statusCode": 200,
            "headers": {
                "Content-type": content_type,
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST",
            },
            "body": json.dumps(response),
            "isBase64Encoded": False,
        }
    else:
        return {
            "statusCode": 200,
            "headers": {
                "Content-type": content_type,
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST",
                "Content-Disposition": "attachment; filename=" + filename,
            },
            "body": response,
            "isBase64Encoded": False,
        }


def query_items_by_date_range(
    start_date: str, end_date: str, table_name: str, data_type: str, user_id: str
) -> list:
    """
    Query DynamoDB items between two dates from stack_deployments_table

    Args:
        start_date (str): Start date in format 'YYYY-MM-DD'
        end_date (str): End date in format 'YYYY-MM-DD'

    Returns:
        list: List of items from DynamoDB table
    """
    # Convert dates to unix timestamps
    start_timestamp = str(datetime.strptime(start_date, "%Y-%m-%d").timestamp())
    end_timestamp = str(datetime.strptime(end_date, "%Y-%m-%d").timestamp())
    valid_csks = get_csks_for_user_id(user_id)

    print(start_timestamp)
    print(end_timestamp)

    # Initialize DynamoDB client
    # dynamo_client = boto3.resource('dynamodb')
    table = dynamo_client.Table(table_name)

    # Query items between dates
    # response = table.scan(
    #     FilterExpression="#dt BETWEEN :start AND :end",
    #     ExpressionAttributeNames={"#dt": "datetime"},
    #     ExpressionAttributeValues={":start": start_timestamp, ":end": end_timestamp},
    # )
    items = []
    scan_kwargs = {
        "FilterExpression": Key("datetime").between(start_timestamp, end_timestamp)
        & Attr("stack_status").is_in(
            ["CREATE_COMPLETE", "UPDATE_COMPLETE", "DELETE_IN_PROGRESS", "failed"]
        )
        & Attr("csk_id").is_in(valid_csks),
    }
    if data_type == "actions":
        scan_kwargs = {
            "FilterExpression": Key("datetime").between(start_timestamp, end_timestamp)
            & Attr("action").ne(
                "session error Error: The security token included in the request is expired"
            )
            & Attr("action").ne("switched to credentials-block")
            & Attr("csk_id").is_in(valid_csks),
        }

    # TODO ADD IN THE RESELLER'S REGION (3 letter country code)
    try:
        done = False
        start_key = None
        while not done:
            if start_key:
                scan_kwargs["ExclusiveStartKey"] = start_key
            response = table.scan(**scan_kwargs)
            items.extend(response.get("Items", []))
            start_key = response.get("LastEvaluatedKey", None)
            done = start_key is None
    except ClientError as err:
        print(
            "Couldn't scan for items. Here's why: %s: %s",
            err.response["Error"]["Code"],
            err.response["Error"]["Message"],
        )
        raise

    print(items)
    return items


def get_csks_for_user_id(user_id):
    valid_csks = []
    distis = []
    user_distis = user_distributors_table.get_item(Key={"user_id": user_id})
    if "Item" in user_distis:
        print(user_distis["Item"]["distributors"])
        distis = user_distis["Item"]["distributors"].split(",")
        for disti in distis:
            print(distis)
            csks = csk_config_table.query(
                TableName=csk_config_table_name,
                IndexName="distributor_id_gsi",
                ExpressionAttributeNames={
                    "#pk": "distributor_id",
                },
                ExpressionAttributeValues={
                    ":pk": disti,
                },
                KeyConditionExpression="#pk = :pk",
            )
            print(csks)
            if "Items" in csks:
                for item in csks["Items"]:
                    if item["csk_id"] not in valid_csks:
                        valid_csks.append(item["csk_id"])
            elif "Item" in csks:
                if csks["Item"]["csk_id"] not in valid_csks:
                    valid_csks.append(csks["Item"]["csk_id"])

            print(valid_csks)
    return valid_csks
