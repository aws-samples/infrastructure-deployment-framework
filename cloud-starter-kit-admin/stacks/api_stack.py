from aws_cdk import (
    Duration,
    Size,
    Stack,
    aws_dynamodb as ddb,
    aws_lambda as aws_lambda,
    aws_apigateway as apigateway,
    aws_dynamodb as ddb,
    aws_route53 as route53,
    aws_route53_targets as r53targets,
    aws_certificatemanager as acm,
    aws_cognito as cognito,
    custom_resources as cr,
)
import aws_cdk as cdk
from aws_cdk import Aspects
from constructs import Construct
from datetime import datetime
import os


class ApiStack(Stack):

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        # user_pool: cognito.UserPool,
        params: map,
        **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        user_pool = cognito.UserPool.from_user_pool_arn(
            self,
            "UserPoolFromArn",
            user_pool_arn="arn:aws:cognito-idp:us-east-1:{}:userpool/{}".format(
                self.account, params["user_pool_id"]
            ),
        )

        # table to track app opens
        csk_config_table = ddb.Table(
            self,
            "csk_config_table",
            encryption=ddb.TableEncryption.AWS_MANAGED,
            partition_key=ddb.Attribute(name="csk_id", type=ddb.AttributeType.STRING),
            point_in_time_recovery=True,
            billing_mode=ddb.BillingMode.PAY_PER_REQUEST,
            removal_policy=cdk.RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
        )

        distributor_config_table = ddb.Table(
            self,
            "distributor_config_table",
            encryption=ddb.TableEncryption.AWS_MANAGED,
            partition_key=ddb.Attribute(
                name="distributor_id", type=ddb.AttributeType.STRING
            ),
            point_in_time_recovery=True,
            billing_mode=ddb.BillingMode.PAY_PER_REQUEST,
            removal_policy=cdk.RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
        )

        user_distributors_table = ddb.Table(
            self,
            "user_distributors_table",
            encryption=ddb.TableEncryption.AWS_MANAGED,
            partition_key=ddb.Attribute(name="user_id", type=ddb.AttributeType.STRING),
            point_in_time_recovery=True,
            billing_mode=ddb.BillingMode.PAY_PER_REQUEST,
            removal_policy=cdk.RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
        )

        csk_config_table.add_global_secondary_index(
            index_name="distributor_id_gsi",
            partition_key=ddb.Attribute(
                name="distributor_id", type=ddb.AttributeType.STRING
            ),
        )
        csk_actions_table = ddb.Table(
            self,
            "csk_actions_table",
            encryption=ddb.TableEncryption.AWS_MANAGED,
            partition_key=ddb.Attribute(name="csk_id", type=ddb.AttributeType.STRING),
            sort_key=ddb.Attribute(name="datetime", type=ddb.AttributeType.STRING),
            point_in_time_recovery=True,
            billing_mode=ddb.BillingMode.PAY_PER_REQUEST,
            removal_policy=cdk.RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
        )

        stack_deployments_table = ddb.Table(
            self,
            "stack_deployments_table",
            encryption=ddb.TableEncryption.AWS_MANAGED,
            partition_key=ddb.Attribute(
                name="stack_name", type=ddb.AttributeType.STRING
            ),
            sort_key=ddb.Attribute(name="datetime", type=ddb.AttributeType.STRING),
            point_in_time_recovery=True,
            billing_mode=ddb.BillingMode.PAY_PER_REQUEST,
            removal_policy=cdk.RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
        )
        Aspects.of(stack_deployments_table).add(
            cdk.Tag("Name", "CSK Deployments Table")
        )
        stack_deployments_table.add_global_secondary_index(
            index_name="csk_id_gsi",
            partition_key=ddb.Attribute(name="csk_id", type=ddb.AttributeType.STRING),
        )
        stack_deployments_table.add_global_secondary_index(
            index_name="kit_id_gsi",
            partition_key=ddb.Attribute(name="kit_id", type=ddb.AttributeType.STRING),
        )
        stack_deployments_table.add_global_secondary_index(
            index_name="stack_status_gsi",
            partition_key=ddb.Attribute(
                name="stack_status", type=ddb.AttributeType.STRING
            ),
        )
        shortuuid_layer = aws_lambda.LayerVersion(
            self,
            "ShortUUIDLayer",
            code=aws_lambda.Code.from_asset(os.path.join("lambda", "python.zip")),
            license="MIT-0",
            description="ShortUUID",
            compatible_runtimes=[aws_lambda.Runtime.PYTHON_3_12],
        )
        admin_lambda = aws_lambda.Function(
            self,
            "admin_lambda",
            code=aws_lambda.Code.from_asset(
                path=os.path.join("lambda"),
            ),
            handler="admin.lambda_handler",
            runtime=aws_lambda.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(10),
            environment={
                "CSK_CONFIG_TABLE": csk_config_table.table_name,
                "DISTRIBUTOR_CONFIG_TABLE": distributor_config_table.table_name,
                "USER_DISTRIBUTORS_TABLE": user_distributors_table.table_name,
                "COGNITO_USER_POOL": user_pool.user_pool_id,
                "ADMIN_EMAIL_DOMAIN": params["admin_email_domain"],
            },
            layers=[shortuuid_layer],
        )
        user_pool.grant(admin_lambda, "cognito-idp:AdminCreateUser")
        user_pool.grant(admin_lambda, "cognito-idp:AdminGetUser")
        user_pool.grant(admin_lambda, "cognito-idp:ListUsers")

        csk_config_table.grant_read_write_data(admin_lambda)
        distributor_config_table.grant_read_write_data(admin_lambda)
        user_distributors_table.grant_read_write_data(admin_lambda)

        config_lambda = aws_lambda.Function(
            self,
            "config_lambda",
            code=aws_lambda.Code.from_asset(
                path=os.path.join("lambda"),
            ),
            handler="config.lambda_handler",
            runtime=aws_lambda.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(3),
            environment={
                "CSK_CONFIG_TABLE": csk_config_table.table_name,
                "DISTRIBUTOR_CONFIG_TABLE": distributor_config_table.table_name,
            },
        )

        csk_config_table.grant_read_data(config_lambda)
        distributor_config_table.grant_read_data(config_lambda)

        reporting_lambda = aws_lambda.Function(
            self,
            "reporting_lambda",
            code=aws_lambda.Code.from_asset(
                path=os.path.join("lambda"),
            ),
            handler="reporting.lambda_handler",
            runtime=aws_lambda.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(3),
            environment={
                "CSK_ACTIONS_TABLE": csk_actions_table.table_name,
                "STACK_DEPLOYMENTS_TABLE": stack_deployments_table.table_name,
            },
        )

        csk_actions_table.grant_read_write_data(reporting_lambda)
        stack_deployments_table.grant_read_write_data(reporting_lambda)

        cors_options = apigateway.CorsOptions(
            allow_origins=apigateway.Cors.ALL_ORIGINS,
            allow_methods=apigateway.Cors.ALL_METHODS,
        )

        hosted_zone = route53.HostedZone.from_hosted_zone_attributes(
            self,
            "HostedZoneId",
            hosted_zone_id=params["hosted_zone_id"],
            zone_name=params["hosted_zone"],
        )
        api_cert = acm.Certificate(
            self,
            "ApiCert",
            domain_name="api.{}".format(params["hosted_zone"]),
            validation=acm.CertificateValidation.from_dns(hosted_zone),
        )

        self.api = apigateway.RestApi(
            self,
            "starter_kit_api",
            rest_api_name="starter_kit_api",
            domain_name=apigateway.DomainNameOptions(
                domain_name="api.{}".format(params["hosted_zone"]), certificate=api_cert
            ),
            min_compression_size=Size.kibibytes(0),
            cloud_watch_role=True,
            disable_execute_api_endpoint=False,
        )

        self.api.add_request_validator(
            "request_validator",
            request_validator_name="json-validator",
            validate_request_parameters=True,
            validate_request_body=True,
        )
        self.api.add_model("request_schema", schema={}, content_type="application/json")

        auth_lambda = aws_lambda.Function(
            self,
            "auth_lambda",
            code=aws_lambda.Code.from_asset(
                path=os.path.join("lambda"),
            ),
            handler="apig_authoriser.lambda_handler",
            runtime=aws_lambda.Runtime.PYTHON_3_12,
            timeout=Duration.seconds(5),
            environment={
                "CSK_CONFIG_TABLE": csk_config_table.table_name,
                "DISTRIBUTOR_CONFIG_TABLE": distributor_config_table.table_name,
            },
        )
        csk_config_table.grant_read_data(auth_lambda)
        distributor_config_table.grant_read_data(auth_lambda)

        lambda_authoriser = apigateway.RequestAuthorizer(
            self,
            "LambdaAuth",
            handler=auth_lambda,
            identity_sources=[apigateway.IdentitySource.header("secret")],
            results_cache_ttl=cdk.Duration.millis(0),
        )

        cognito_authoriser = apigateway.CognitoUserPoolsAuthorizer(
            self,
            "CognitoAuth",
            cognito_user_pools=[user_pool],
            authorizer_name="CognitoAuthorizer",
            identity_source=apigateway.IdentitySource.header("Authorization"),
            results_cache_ttl=cdk.Duration.millis(0),
        )

        route53.RecordSet(
            self,
            "AliasRecordForAPI",
            record_type=route53.RecordType.A,
            target=route53.RecordTarget.from_alias(r53targets.ApiGateway(self.api)),
            record_name="api.{}".format(params["hosted_zone"]),
            zone=hosted_zone,
        )

        admin_api = self.api.root.add_resource("admin")

        admin_api_int = apigateway.LambdaIntegration(
            handler=admin_lambda,
            proxy=True,
        )

        admin_api_res = admin_api.add_resource(
            "manage", default_cors_preflight_options=cors_options
        )
        admin_api_res.add_method(
            "POST",
            admin_api_int,
            authorizer=cognito_authoriser,
            authorization_type=apigateway.AuthorizationType.COGNITO,
        )

        # config service
        config_api = self.api.root.add_resource("config")

        config_api_int = apigateway.LambdaIntegration(
            handler=config_lambda,
            proxy=True,
        )

        config_api_res = config_api.add_resource(
            "get",
            default_cors_preflight_options=cors_options,
            default_method_options=apigateway.MethodOptions(
                authorizer=lambda_authoriser,
                authorization_type=apigateway.AuthorizationType.CUSTOM,
            ),
            default_integration=config_api_int,
        )

        config_api_res.add_method(
            "POST",
            config_api_int,
        )

        # reporting service
        reporting_api = self.api.root.add_resource("reporting")

        reporting_api_int = apigateway.LambdaIntegration(
            handler=reporting_lambda,
            proxy=True,
        )

        reporting_api_res = reporting_api.add_resource(
            "report", default_cors_preflight_options=cors_options
        )
        reporting_api_res.add_method(
            "POST",
            reporting_api_int,
            authorizer=lambda_authoriser,
            authorization_type=apigateway.AuthorizationType.CUSTOM,
        )

        cr.AwsCustomResource(
            self,
            "csk_config_table_initializer",
            on_create=cr.AwsSdkCall(
                service="DynamoDB",
                action="PutItem",
                parameters={
                    "TableName": csk_config_table.table_name,
                    "Item": {
                        "csk_id": {"S": "e3YeCgHwiZKtFGD9qLhFRa"},
                        "config": {
                            "M": {
                                "BusinessName": {"S": "Lorem Ipsum Tech"},
                                "CountryCode": {"S": "AUS"},
                                "DefaultRegion": {"S": "ap-southeast-2"},
                                "LogoCssLeft": {"S": "height: fit-content"},
                                "LogoCssRight": {
                                    "S": "height: fit-content; padding: 0px;"
                                },
                                "LogoUrl": {
                                    "S": "https://cloud-starter-kit.com/images/placeholder-logo.png"
                                },
                                "PreferredLanguage": {"S": "en-US"},
                            }
                        },
                        "distributor_id": {"S": "045ade37-6cbd-4f4e-a25a-b072aa96b6a8"},
                        "status": {"S": "active"},
                    },
                },
                physical_resource_id=cr.PhysicalResourceId.of(
                    datetime.today().strftime("%Y%m%d%H%M%S".format("config_init"))
                ),
            ),
            removal_policy=cdk.RemovalPolicy.DESTROY,
            policy=cr.AwsCustomResourcePolicy.from_sdk_calls(
                resources=cr.AwsCustomResourcePolicy.ANY_RESOURCE
            ),
        )

        cr.AwsCustomResource(
            self,
            "distributor_config_table_initializer",
            on_create=cr.AwsSdkCall(
                service="DynamoDB",
                action="PutItem",
                parameters={
                    "TableName": distributor_config_table.table_name,
                    "Item": {
                        "distributor_id": {"S": "045ade37-6cbd-4f4e-a25a-b072aa96b6a8"},
                        "config": {
                            "M": {
                                "BusinessName": {"S": "Generic Distribution"},
                                "LogoCss": {"S": "height: fit-content"},
                                "LogoUrl": {
                                    "S": "https://cloud-starter-kit.com/images/generic-logo.gif"
                                },
                            }
                        },
                        "status": {"S": "active"},
                    },
                },
                physical_resource_id=cr.PhysicalResourceId.of(
                    datetime.today().strftime("%Y%m%d%H%M%S".format("config_init"))
                ),
            ),
            removal_policy=cdk.RemovalPolicy.DESTROY,
            policy=cr.AwsCustomResourcePolicy.from_sdk_calls(
                resources=cr.AwsCustomResourcePolicy.ANY_RESOURCE
            ),
        )

        cr.AwsCustomResource(
            self,
            "user_distributors_table_initializer",
            on_create=cr.AwsSdkCall(
                service="DynamoDB",
                action="PutItem",
                parameters={
                    "TableName": user_distributors_table.table_name,
                    "Item": {
                        "user_id": {"S": "4428a418-1051-7050-1c0a-96a149a06c27"},
                        "distributors": {"S": "045ade37-6cbd-4f4e-a25a-b072aa96b6a8"},
                    },
                },
                physical_resource_id=cr.PhysicalResourceId.of(
                    datetime.today().strftime("%Y%m%d%H%M%S".format("config_init"))
                ),
            ),
            removal_policy=cdk.RemovalPolicy.DESTROY,
            policy=cr.AwsCustomResourcePolicy.from_sdk_calls(
                resources=cr.AwsCustomResourcePolicy.ANY_RESOURCE
            ),
        )

        self.export_value(user_distributors_table.table_name)
        self.export_value(distributor_config_table.table_name)
        self.export_value(csk_config_table.table_name)
        self.export_value(csk_actions_table.table_name)
        self.export_value(stack_deployments_table.table_name)
