# General imports
import boto3
import botocore
from boto3.dynamodb.conditions import Key, Attr
import os
import json
import shortuuid
import uuid
import re

dynamo_client = boto3.resource("dynamodb", region_name=os.environ["AWS_REGION"])
cognito_client = boto3.client("cognito-idp", region_name="us-east-1")
cognito_user_pool = os.environ["COGNITO_USER_POOL"]

csk_config_table_name = os.environ["CSK_CONFIG_TABLE"]
csk_config_table = dynamo_client.Table(csk_config_table_name)
distributor_config_table_name = os.environ["DISTRIBUTOR_CONFIG_TABLE"]
distributor_config_table = dynamo_client.Table(distributor_config_table_name)
user_distributors_table_name = os.environ["USER_DISTRIBUTORS_TABLE"]
user_distributors_table = dynamo_client.Table(user_distributors_table_name)

admin_email_domain = os.environ["ADMIN_EMAIL_DOMAIN"]


def lambda_handler(event, context):
    print(event)
    # result = event
    payload = ""
    user_id = ""
    user_is_admin = False
    response = {}
    if isinstance(event["body"], str):
        payload = json.loads(event["body"])
    elif isinstance(event["body"], dict):
        payload = event["body"]

    if "action" in payload and payload["action"] != "ping":
        print(json.dumps(payload))
    # check if user logged in

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

        if "action" in payload:
            valid_distributors = get_distributors_from_user_id(user_id)
            if payload["action"] == "get_my_distributors":
                response = {
                    "result": "success",
                    "distributors": valid_distributors,
                }
            elif payload["action"] == "ping":
                response = {
                    "result": "success",
                    "response": "pong",
                }
            elif "distributor_id" in payload:
                if (
                    user_is_admin == False
                    and payload["distributor_id"] not in valid_distributors
                ):
                    response = {"error": "invalid distributor_id"}
                else:
                    if payload["action"] == "create_csk":
                        csk_id = shortuuid.ShortUUID().random(length=22)
                        config = csk_config_from_payload(payload)
                        # print(json.dumps(config))
                        params = {
                            "Item": {
                                "csk_id": csk_id,
                                "config": config,
                                "distributor_id": payload["distributor_id"],
                                "status": "active",
                            }
                        }
                        ddb_result = csk_config_table.put_item(**params)
                        if ddb_result["ResponseMetadata"]["HTTPStatusCode"] == 200:
                            response = {"result": "success", "item": params["Item"]}
                        else:
                            response = {
                                "result": "failure",
                                "details": ddb_result["ResponseMetadata"],
                            }
                    elif "csk_id" in payload:
                        csk_id = check_csk_id(payload["csk_id"], valid_distributors)
                        if payload["action"] == "get_csk":
                            config = get_current_csk_config(csk_id)
                            response = {
                                "result": "success",
                                "item": {"csk_id": csk_id, "config": config},
                            }

                        elif payload["action"] == "update_csk":
                            config = csk_config_from_payload(payload)
                            params = {
                                "Item": {
                                    "csk_id": csk_id,
                                    "config": config,
                                    "distributor_id": payload["distributor_id"],
                                    "status": "active",
                                }
                            }
                            ddb_result = csk_config_table.put_item(**params)
                            if ddb_result["ResponseMetadata"]["HTTPStatusCode"] == 200:
                                response = {"result": "success", "item": params["Item"]}
                            else:
                                response = {
                                    "result": "failure",
                                    "details": ddb_result["ResponseMetadata"],
                                }

                        elif "activate_csk" in payload["action"]:  # both de and re
                            status = "active"
                            if payload["action"] == "deactivate_csk":
                                status = "inactive"
                            params = {
                                "Item": {
                                    "csk_id": csk_id,
                                    "config": get_current_csk_config(csk_id),
                                    "distributor_id": payload["distributor_id"],
                                    "status": status,
                                }
                            }
                            ddb_result = csk_config_table.put_item(**params)
                            if ddb_result["ResponseMetadata"]["HTTPStatusCode"] == 200:
                                response = {"result": "success", "item": params["Item"]}
                            else:
                                response = {
                                    "result": "failure",
                                    "details": ddb_result["ResponseMetadata"],
                                }
                    elif "distributor_id" in payload:
                        distributor_id = check_distributor_id(payload["distributor_id"])
                        if payload["action"] == "list_csks":
                            ddb_result = csk_config_table.query(
                                TableName=csk_config_table_name,
                                IndexName="distributor_id_gsi",
                                KeyConditionExpression=Key("distributor_id").eq(
                                    distributor_id
                                ),
                                Limit=200,
                            )
                            if ddb_result["ResponseMetadata"]["HTTPStatusCode"] == 200:
                                response = {
                                    "result": "success",
                                    "csks": ddb_result["Items"],
                                }
                            else:
                                response = {
                                    "result": "failure",
                                    "details": ddb_result["ResponseMetadata"],
                                }

                        elif user_is_admin and payload["action"] == "edit_distributor":
                            response["result"] = "success"
                            response["item"] = {
                                "distributor_id": distributor_id,
                                "config": get_current_distributor_config(
                                    distributor_id
                                ),
                            }

                        elif (
                            user_is_admin and payload["action"] == "update_distributor"
                        ):
                            params = {
                                "Item": {
                                    "distributor_id": distributor_id,
                                    "config": distributor_config_from_payload(payload),
                                    "status": "active",
                                }
                            }
                            ddb_result = distributor_config_table.put_item(**params)
                            if ddb_result["ResponseMetadata"]["HTTPStatusCode"] == 200:
                                response["result"] = "success"
                                response["item"] = params["Item"]
                            else:
                                response["result"] = "failure"
                                response["details"] = ddb_result["ResponseMetadata"]

                        elif (
                            user_is_admin
                            and payload["action"] == "deactivate_distributor"
                        ):
                            params = {
                                "Item": {
                                    "distributor_id": distributor_id,
                                    "config": get_current_distributor_config(
                                        distributor_id
                                    ),
                                    "status": "inactive",
                                }
                            }
                            ddb_result = distributor_config_table.put_item(**params)
                            if ddb_result["ResponseMetadata"]["HTTPStatusCode"] == 200:
                                response["result"] = "success"
                                response["item"] = params["Item"]
                            else:
                                response["result"] = "failure"
                                response["details"] = ddb_result["ResponseMetadata"]

                        elif user_is_admin and payload["action"] == "add_user":
                            email = check_email(payload["email"])
                            print("adding {} to {}".format(email, distributor_id))
                            if email != "":
                                ok = create_distributor_user(distributor_id, email)
                                if ok:
                                    response["result"] = "success"
                                    response["details"] = "{} added".format(email)
                                else:
                                    response["result"] = "failure"
                                    response["details"] = "failed creation - {}".format(
                                        email
                                    )
                            else:
                                response["result"] = "failure"
                                response["details"] = "invalid email - {}".format(email)

                        elif user_is_admin and payload["action"] == "list_users":
                            users = list_distributor_users(distributor_id)
                            if users:
                                response["result"] = "success"
                                response["users"] = json.dumps(users)
                            else:
                                response["result"] = "failure"
                                response["details"] = "no users found"

                        elif user_is_admin and payload["action"] == "detach_user":
                            user_id = check_user_id(payload["user_id"])
                            if user_id != "" and distributor_id != "":
                                ok = detach_user_from_distributor(
                                    user_id, distributor_id
                                )
                                if ok == "detached":
                                    response["result"] = "success"
                                    response["details"] = ok
                                else:
                                    response["result"] = "failure"
                                    response["details"] = ok
                            else:
                                response["result"] = "failure"
                                response["details"] = "invalid inputs"

                    else:
                        response = {"result": "no valid action in request"}

            # admin users can create/manage distributors
            elif user_is_admin:
                if payload["action"] == "create_distributor":
                    distributor_id = str(uuid.uuid4())
                    email = check_email(payload["email"])
                    config = distributor_config_from_payload(payload)
                    params = {
                        "Item": {
                            "distributor_id": distributor_id,
                            "config": config,
                            "status": "active",
                        }
                    }
                    ddb_result = distributor_config_table.put_item(**params)
                    if ddb_result["ResponseMetadata"]["HTTPStatusCode"] == 200:
                        # give current user access to this distributor
                        valid_distributors[distributor_id] = {
                            "name": params["Item"]["config"]["BusinessName"],
                            "logo": params["Item"]["config"]["LogoUrl"],
                        }
                        grant_access_to_distributor(user_id, valid_distributors)
                        if email != "":
                            create_distributor_user(distributor_id, email)
                        response["result"] = "success"
                        response["item"] = params["Item"]
                    else:
                        response["result"] = "failure"
                        response["details"] = ddb_result["ResponseMetadata"]

                elif payload["action"] == "list_distributors":
                    ddb_result = distributor_config_table.scan(
                        TableName=distributor_config_table_name,
                        Limit=200,
                    )
                    if ddb_result["ResponseMetadata"]["HTTPStatusCode"] == 200:
                        response = {
                            "result": "success",
                            "distributors": ddb_result["Items"],
                        }
                    else:
                        response = {
                            "result": "failure",
                            "details": ddb_result["ResponseMetadata"],
                        }
                else:
                    response = {
                        "result": "no valid action in request - got '{}'".format(
                            payload["action"]
                        )
                    }
            else:
                response = {"result": "no valid action in general request"}
        else:
            response = {"error": "no action in request"}
    else:
        response = {"error": "no auth token found"}

    if user_is_admin:
        response["user_is_admin"] = "true"

    if "action" in payload and payload["action"] != "ping":
        print(response)

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


def check_csk_id(csk_id, valid_distributors):
    response = csk_config_table.get_item(Key={"csk_id": csk_id})
    if "Item" in response:
        if response["Item"]["distributor_id"] in valid_distributors:
            return csk_id
        else:
            return ""
    else:
        return ""


def check_distributor_id(distributor_id):
    response = distributor_config_table.get_item(Key={"distributor_id": distributor_id})
    if "Item" in response:
        return distributor_id
    else:
        return ""


def check_user_id(user_id):
    response = user_distributors_table.get_item(Key={"user_id": user_id})
    if "Item" in response:
        return user_id
    else:
        return ""


def check_email(email):
    if re.match(r"(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)", email.lower()):
        return email.lower()
    else:
        return ""


def get_current_csk_config(csk_id):
    response = csk_config_table.get_item(Key={"csk_id": csk_id})
    if "Item" in response:
        return response["Item"]["config"]
    else:
        return {}


def get_current_distributor_config(distributor_id):
    response = distributor_config_table.get_item(Key={"distributor_id": distributor_id})
    if "Item" in response:
        return response["Item"]["config"]
    else:
        return {}


def is_active_distributor(distributor_id):
    response = distributor_config_table.get_item(Key={"distributor_id": distributor_id})
    if "Item" in response:
        if "status" in response["Item"]:
            return response["Item"]["status"] == "active"
        else:
            return True
    else:
        return False


def detach_user_from_distributor(user_id, distributor_id):
    response = user_distributors_table.get_item(Key={"user_id": user_id})
    if "Item" in response:
        distis = response["Item"]["distributors"].split(",")
        distis.remove(distributor_id)
        params = {
            "Item": {
                "distributors": ",".join(distis),
                "user_id": user_id,
            }
        }
        user_distributors_table.put_item(**params)
        return "detached"
    else:
        return "no user found"


def get_distributors_from_user_id(user_id):
    response = user_distributors_table.get_item(Key={"user_id": user_id})
    if "Item" in response:
        print(response["Item"]["distributors"])
        distis = response["Item"]["distributors"].split(",")
        print("distis array")
        print(distis)
        distie_details = {}
        for id in distis:
            print(id)
            if id and is_active_distributor(id):
                config = get_current_distributor_config(id)
                distie_details[id] = {
                    "name": config["BusinessName"],
                    "logo": config["LogoUrl"],
                }
        return distie_details
    else:
        return {}


def grant_access_to_distributor(user_id, distributors):
    params = {
        "Item": {
            "distributors": ",".join(distributors.keys()),
            "user_id": user_id,
        }
    }
    user_distributors_table.put_item(**params)


def csk_config_from_payload(payload):
    bn = re.sub(r"^[^\w\'\-\s]{3,50}$", "", payload["BusinessName"])
    cc = re.sub(r"^[^A-Z]{3}$", "", payload["CountryCode"])
    dr = re.sub(r"^[^a-z1-9\-]+$", "", payload["DefaultRegion"])
    lcl = re.sub(r"^[^\w\-:;\s\.()+]+$", "", payload["LogoCssLeft"])
    lcr = re.sub(r"^[^\w\-:;\s\.()+]+$", "", payload["LogoCssRight"])
    lu = re.sub(r"^[^\w\-\.\/?_:=,?]+$", "", payload["LogoUrl"])
    pl = re.sub(r"^[^\w\-]+$", "", payload["PreferredLanguage"])
    fr = re.sub(r"^[^\w\-\.]+$", "", payload["FileHost"])
    if payload["KitHubCode"] == "" or re.fullmatch(
        r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$", payload["KitHubCode"]
    ):
        kh = payload["KitHubCode"]

    return {
        "KitHubCode": kh,
        "FileHost": fr,
        "BusinessName": bn,
        "CountryCode": cc,
        "DefaultRegion": dr,
        "LogoCssLeft": lcl,
        "LogoCssRight": lcr,
        "LogoUrl": lu,
        "PreferredLanguage": pl,
    }


def distributor_config_from_payload(payload):
    bn = re.sub(r"^[^\w\'\-\s]{3,50}$", "", payload["BusinessName"])
    fr = re.sub(r"^[^\w\-:;\s\.()+]+$", "", payload["FileHost"])
    lc = re.sub(r"^[^\w\-:;\s\.()+]+$", "", payload["LogoCss"])
    lu = re.sub(r"^[^\w\-\.\/?_:=,?]+$", "", payload["LogoUrl"])
    return {
        "FileHost": fr,
        "BusinessName": bn,
        "LogoCss": lc,
        "LogoUrl": lu,
    }


def create_distributor_user(distributor_id, email):
    # create a user in cognito but if the user exists already, return the user's info
    cognito_result = {}
    try:
        cognito_result = cognito_client.admin_create_user(
            UserPoolId=cognito_user_pool,
            Username=email,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "True"},
            ],
            DesiredDeliveryMediums=[
                "EMAIL",
            ],
            MessageAction="RESEND",
        )
        print(cognito_result)
    except botocore.exceptions.ClientError as err:
        if (
            err.response["Error"]["Code"] == "UsernameExistsException"
            or err.response["Error"]["Code"] == "UnsupportedUserStateException"
        ):
            cognito_result = cognito_client.admin_get_user(
                UserPoolId=cognito_user_pool, Username=email
            )
            print(cognito_result)
        else:
            print(err)

    if "User" in cognito_result or "UserAttributes" in cognito_result:
        disti_user_id = ""
        if "User" in cognito_result:
            for attr in cognito_result["User"]["Attributes"]:
                if attr["Name"] == "sub":
                    disti_user_id = attr["Value"]
        elif "UserAttributes" in cognito_result:
            for attr in cognito_result["UserAttributes"]:
                if attr["Name"] == "sub":
                    disti_user_id = attr["Value"]
        # get existing disties and insert this one
        config = get_current_distributor_config(distributor_id)
        existing_disties = get_distributors_from_user_id(disti_user_id)
        existing_disties[distributor_id] = {
            "name": config["BusinessName"],
            "logo": config["LogoUrl"],
        }
        grant_access_to_distributor(disti_user_id, existing_disties)
        return True
    else:
        print("user creation failed")
        return False


def get_user_email(sub):
    response = cognito_client.list_users(
        UserPoolId=cognito_user_pool,
        Filter='sub = "{}"'.format(sub),
    )
    if "Users" in response and len(response["Users"]) > 0:
        for attr in response["Users"][0]["Attributes"]:
            if attr["Name"] == "email":
                return attr["Value"]
    return ""


# return all the users in a dynamodb table where the distributor exists in the list
def list_distributor_users(distributor_id):
    response = user_distributors_table.scan(
        TableName=user_distributors_table_name,
        FilterExpression=Attr("distributors").contains(distributor_id),
    )
    items = response["Items"]
    while "LastEvaluatedKey" in response:
        response = user_distributors_table.scan(
            TableName=user_distributors_table_name,
            FilterExpression=Attr("distributors").contains(distributor_id),
            ExclusiveStartKey=response["LastEvaluatedKey"],
        )
        items.extend(response["Items"])
    for item in items:
        item["email"] = get_user_email(item["user_id"])
    return items
