from aws_cdk import (
    Stack,
    aws_cognito as cognito,
    aws_route53 as route53,
    aws_route53_targets as r53targets,
    aws_certificatemanager as acm,
    aws_lambda as aws_lambda,
    aws_iam as iam,
    aws_logs as logs,
)
import aws_cdk as cdk
from constructs import Construct
from aws_cdk import CustomResource
import aws_cdk.custom_resources as cr
from aws_cdk.aws_s3_assets import Asset
import os.path


class CognitoUiStack(Stack):
    def __init__(
        self, scope: Construct, construct_id: str, params: map, **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Write CSS and logo files to S3 as Assets
        ui_logo = Asset(
            self,
            "CognitoHostedUiLogo",
            path=os.path.join("cognito-ui", "logo.png"),
        )
        ui_css = Asset(
            self,
            "CognitoHostedUiCss",
            path=os.path.join("cognito-ui", "hosted-ui.css"),
        )

        # Create the Lambda function that will do the work, and set the
        # environment variables that it will need
        setup_ui_lambda = aws_lambda.Function(
            self,
            "CognitoSetupUiEventHandler",
            environment={
                "ASSET_BUCKET": ui_logo.s3_bucket_name,
                "IMAGE_FILE_KEY": ui_logo.s3_object_key,
                "CSS_KEY": ui_css.s3_object_key,
                "USER_POOL_ID": params["user_pool_id"],
                "CLIENT_ID": params["user_pool_client_id"],
            },
            runtime=aws_lambda.Runtime.PYTHON_3_9,
            architecture=aws_lambda.Architecture.ARM_64,
            handler="customise_hosted_ui.handler",
            code=aws_lambda.Code.from_asset("custom-resources"),
            dead_letter_queue_enabled=False,
            timeout=cdk.Duration.seconds(30),
        )

        # Let the Lambda role access the files
        setup_ui_lambda.add_to_role_policy(
            statement=iam.PolicyStatement(
                actions=[
                    "s3:GetObject",
                ],
                effect=iam.Effect.ALLOW,
                resources=[
                    "arn:aws:s3:::"
                    + ui_logo.s3_bucket_name
                    + "/"
                    + ui_logo.s3_object_key,
                    "arn:aws:s3:::"
                    + ui_css.s3_bucket_name
                    + "/"
                    + ui_css.s3_object_key,
                ],
            )
        )

        setup_ui_lambda.add_to_role_policy(
            statement=iam.PolicyStatement(
                actions=[
                    "cognito-idp:SetUICustomization",
                ],
                effect=iam.Effect.ALLOW,
                resources=[
                    "arn:aws:cognito-idp:{}:{}:userpool/{}".format(
                        self.region, self.account, params["user_pool_id"]
                    )
                ],
            )
        )

        setup_ui_lambda.add_to_role_policy(
            statement=iam.PolicyStatement(
                actions=[
                    "events:PutRule",
                    "events:PutTargets",
                    "events:RemoveTargets",
                    "events:DeleteRule",
                ],
                effect=iam.Effect.ALLOW,
                resources=[
                    "arn:aws:events:{}:{}:rule/CustomResourceToConfigUi*".format(
                        self.region, self.account
                    )
                ],
            )
        )
        setup_ui_lambda.add_to_role_policy(
            statement=iam.PolicyStatement(
                actions=["lambda:AddPermission", "lambda:RemovePermission"],
                effect=iam.Effect.ALLOW,
                resources=[
                    "arn:aws:lambda:{}:{}:function:{}-CognitoSetupUiEventHandler*".format(
                        self.region, self.account, self.stack_name
                    )
                ],
            )
        )

        ui_provider_role = iam.Role(
            self,
            "CognitoUiProviderRole",
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    managed_policy_name="AWSLambdaExecute"
                )
            ],
            assumed_by=iam.ServicePrincipal(service="lambda.amazonaws.com"),
        )

        ui_provider = cr.Provider(
            self,
            "CognitoUiProvider",
            on_event_handler=setup_ui_lambda,
            log_retention=logs.RetentionDays.ONE_WEEK,  # default is INFINITE
            role=ui_provider_role,
        )

        CustomResource(
            self,
            "CustomResourceToConfigUi1",
            service_token=ui_provider.service_token,
            properties={"css": ui_css.s3_object_key, "logo": ui_logo.s3_object_key},
        )
