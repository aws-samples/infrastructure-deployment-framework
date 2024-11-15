import aws_cdk as core
import aws_cdk.assertions as assertions

from starter_kit_aws_admin.starter_kit_aws_admin_stack import StarterKitAwsAdminStack

# example tests. To run these tests, uncomment this file along with the example
# resource in starter_kit_aws_admin/starter_kit_aws_admin_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = StarterKitAwsAdminStack(app, "starter-kit-aws-admin")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
