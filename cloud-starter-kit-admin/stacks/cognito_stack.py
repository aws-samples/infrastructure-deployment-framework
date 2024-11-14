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


class CognitoStack(Stack):
    def __init__(
        self, scope: Construct, construct_id: str, params: map, **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        auth_domain_name = "auth." + params["hosted_zone"]
        cloudfront_web_hostname = "admin." + params["hosted_zone"]
        if params["environment"] != "prod":
            cloudfront_web_hostname = (
                params["environment"] + "." + cloudfront_web_hostname
            )

        hosted_zone = route53.HostedZone.from_hosted_zone_attributes(
            self,
            "HostedZoneId",
            hosted_zone_id=params["hosted_zone_id"],
            zone_name=params["hosted_zone"],
        )
        auth_cert = acm.Certificate(
            self,
            "ApiCert",
            domain_name=auth_domain_name,
            validation=acm.CertificateValidation.from_dns(hosted_zone),
        )

        self.cognito_region = self.region
        self.cognito_pool = cognito.UserPool(
            self,
            "CskUserPool",
            user_pool_name="csk-userpool",
            advanced_security_mode=cognito.AdvancedSecurityMode.ENFORCED,
            self_sign_up_enabled=False,
            custom_attributes={
                "distributor_id": cognito.StringAttribute(
                    min_len=36, max_len=36, mutable=False
                )
            },
            password_policy=cognito.PasswordPolicy(
                require_symbols=True,
                require_lowercase=False,
                require_digits=True,
                require_uppercase=True,
                min_length=8,
                temp_password_validity=cdk.Duration.days(5),
            ),
            sign_in_case_sensitive=False,
            removal_policy=cdk.RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
        )
        user_pool_domain = cognito.UserPoolDomain(
            self,
            "CskCognitoDomain",
            user_pool=self.cognito_pool,
            custom_domain=cognito.CustomDomainOptions(
                certificate=auth_cert, domain_name=auth_domain_name
            ),
        )

        self.cognito_pool_client = cognito.UserPoolClient(
            self,
            "UserPoolClient",
            user_pool=self.cognito_pool,
            refresh_token_validity=cdk.Duration.minutes(240),
            access_token_validity=cdk.Duration.minutes(120),
            enable_token_revocation=True,
            o_auth=cognito.OAuthSettings(
                callback_urls=["https://{}".format(cloudfront_web_hostname)],
                logout_urls=[
                    "https://{}/logout?client_id={}&redirect_uri=https://{}&response_type=code".format(
                        auth_domain_name, "insert-client-id", cloudfront_web_hostname
                    )
                ],
            ),
        )

        self.auth_domain_record = route53.ARecord(
            self,
            "UserPoolCloudFrontAliasRecord",
            zone=hosted_zone,
            record_name=auth_domain_name,
            target=route53.RecordTarget.from_alias(
                r53targets.UserPoolDomainTarget(user_pool_domain)
            ),
        )

        # Write CSS and logo files to S3 as Assets
        # ui_logo = Asset(
        #     self,
        #     "CognitoHostedUiLogo",
        #     path=os.path.join("cognito-ui", "logo.png"),
        # )
        # ui_css = Asset(
        #     self,
        #     "CognitoHostedUiCss",
        #     path=os.path.join("cognito-ui", "hosted-ui.css"),
        # )

        # # Create the Lambda function that will do the work, and set the
        # # environment variables that it will need
        # setup_ui_lambda = aws_lambda.Function(
        #     self,
        #     "CognitoSetupUiEventHandler",
        #     environment={
        #         "ASSET_BUCKET": ui_logo.s3_bucket_name,
        #         "IMAGE_FILE_KEY": ui_logo.s3_object_key,
        #         "CSS_KEY": ui_css.s3_object_key,
        #         "USER_POOL_ID": self.cognito_pool.user_pool_id,
        #         "CLIENT_ID": self.cognito_pool_client.user_pool_client_id,
        #     },
        #     runtime=aws_lambda.Runtime.PYTHON_3_9,
        #     architecture=aws_lambda.Architecture.ARM_64,
        #     handler="customise_hosted_ui.handler",
        #     code=aws_lambda.Code.from_asset("custom-resources"),
        #     dead_letter_queue_enabled=False,
        #     timeout=cdk.Duration.seconds(30),
        # )

        # # Let the Lambda role access the files
        # setup_ui_lambda.add_to_role_policy(
        #     statement=iam.PolicyStatement(
        #         actions=[
        #             "s3:GetObject",
        #         ],
        #         effect=iam.Effect.ALLOW,
        #         resources=[
        #             "arn:aws:s3:::"
        #             + ui_logo.s3_bucket_name
        #             + "/"
        #             + ui_logo.s3_object_key,
        #             "arn:aws:s3:::"
        #             + ui_css.s3_bucket_name
        #             + "/"
        #             + ui_css.s3_object_key,
        #         ],
        #     )
        # )

        # setup_ui_lambda.add_to_role_policy(
        #     statement=iam.PolicyStatement(
        #         actions=[
        #             "cognito-idp:SetUICustomization",
        #         ],
        #         effect=iam.Effect.ALLOW,
        #         resources=[self.cognito_pool.user_pool_arn],
        #     )
        # )

        # setup_ui_lambda.add_to_role_policy(
        #     statement=iam.PolicyStatement(
        #         actions=[
        #             "events:PutRule",
        #             "events:PutTargets",
        #             "events:RemoveTargets",
        #             "events:DeleteRule",
        #         ],
        #         effect=iam.Effect.ALLOW,
        #         resources=[
        #             "arn:aws:events:{}:{}:rule/CustomResourceToConfigUi*".format(
        #                 self.region, self.account
        #             )
        #         ],
        #     )
        # )
        # setup_ui_lambda.add_to_role_policy(
        #     statement=iam.PolicyStatement(
        #         actions=["lambda:AddPermission", "lambda:RemovePermission"],
        #         effect=iam.Effect.ALLOW,
        #         resources=[
        #             "arn:aws:lambda:{}:{}:function:{}-CognitoSetupUiEventHandler*".format(
        #                 self.region, self.account, self.stack_name
        #             )
        #         ],
        #     )
        # )

        # ui_provider_role = iam.Role(
        #     self,
        #     "CognitoUiProviderRole",
        #     managed_policies=[
        #         iam.ManagedPolicy.from_aws_managed_policy_name(
        #             managed_policy_name="AWSLambdaExecute"
        #         )
        #     ],
        #     assumed_by=iam.ServicePrincipal(service="lambda.amazonaws.com"),
        # )

        # ui_provider = cr.Provider(
        #     self,
        #     "CognitoUiProvider",
        #     on_event_handler=setup_ui_lambda,
        #     log_retention=logs.RetentionDays.ONE_WEEK,  # default is INFINITE
        #     role=ui_provider_role,
        # )

        # custom_resource = CustomResource(
        #     self,
        #     "CustomResourceToConfigUi1",
        #     service_token=ui_provider.service_token,
        #     properties={"css": ui_css.s3_object_key, "logo": ui_logo.s3_object_key},
        # )
        # custom_resource.node.add_dependency(auth_cert)

        # self.user_pool_id = self.cognito_pool.user_pool_id
        # self.user_pool_app_id = self.cognito_pool_client.user_pool_client_id
        self.user_pool_domain = auth_domain_name
        self.export_value(
            exported_value=self.cognito_pool_client.user_pool_client_id,
            name="{}-user-pool-client-id".format(self.stack_name),
        )

        self.export_value(
            exported_value=self.cognito_pool.user_pool_id,
            name="{}-user-pool-id".format(self.stack_name),
        )
