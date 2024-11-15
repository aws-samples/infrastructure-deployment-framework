from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
)
from constructs import Construct


class ExampleStack(Stack):

    def __init__(
        self, scope: Construct, construct_id: str, params: map, **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        vpc = ec2.Vpc(
            self,
            "Vpc",
            vpc_name="ask-vpc-with-nat",
            nat_gateways=int(params["natCount"]),
            max_azs=3,
        )
        self.export_value(exported_value=vpc.vpc_id, name="CskVpcIdWithNat")
