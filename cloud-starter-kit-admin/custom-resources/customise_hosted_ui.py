from __future__ import print_function
from crhelper import CfnResource
import logging
import boto3
import os

logger = logging.getLogger(__name__)

# Initialise the helper, all inputs are optional, this example shows the defaults
helper = CfnResource(
    json_logging=False,
    log_level="DEBUG",
    boto_level="CRITICAL",
    sleep_on_delete=120,
    ssl_verify=None,
)
cognito_client = boto3.client("cognito-idp")
s3_resource = boto3.resource("s3")

image = None
css = None

try:
    ## Init code goes here
    css = s3_resource.Object(os.environ["ASSET_BUCKET"], os.environ["CSS_KEY"]).get()
    image = s3_resource.Object(
        os.environ["ASSET_BUCKET"], os.environ["IMAGE_FILE_KEY"]
    ).get()
except Exception as e:
    helper.init_failure(e)


def set_ui_customizations():
    try:
        css_data = css["Body"].read().decode("utf-8")
        image_data = image["Body"].read()
        cognito_client.set_ui_customization(
            UserPoolId=os.environ["USER_POOL_ID"],
            ClientId=os.environ["CLIENT_ID"],
            CSS=css_data,
            ImageFile=image_data,
        )
        logger.info("Updated Cognito Hosted UI")
    except Exception as e:
        logger.exception(e)
        raise ValueError(
            "An error occurred when attempting to set the UI customizations for the user pool client. See the CloudWatch logs for details"
        )


@helper.create
def create(event, context):
    logger.info("Got Create")
    set_ui_customizations()
    return None


@helper.update
def update(event, context):
    logger.info("Got Update")
    set_ui_customizations()
    return None


# Delete never returns anything.
# Should not fail if the underlying resources are already deleted.
@helper.delete
def delete(event, context):
    logger.info("Got Delete")
    # We won't do anything on delete as the userpool will be
    # probably be being manually destroyed anyway


@helper.poll_create
def poll_create(event, context):
    logger.info("Got create poll")
    # Return a resource id or True to indicate that creation is complete.
    # If True is returned an id will be generated
    return True


def handler(event, context):
    # logger.info(json.dumps(event))
    helper(event, context)
