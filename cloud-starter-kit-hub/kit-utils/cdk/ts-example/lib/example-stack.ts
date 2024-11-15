import {
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";

//configure your params here
interface KitStackProps extends StackProps {
  env: {
    account: string,
    region: string
  },
  params: {
    kitId: string,
    appKey: string,
    businessName: string
  }
}

export class CdkAppStack extends Stack {
  constructor(scope: Construct, id: string, props: KitStackProps) {
    super(scope, id, props);

    //do your thing
    console.log(props.params.kitId)
  }
}
