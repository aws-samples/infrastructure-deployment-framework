import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
interface KitStackProps extends cdk.StackProps {
    env: {
        account: string;
        region: string;
    };
    params: {
        fifo: string;
        account: string;
        region: string;
    };
}
export declare class QueueStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: KitStackProps);
}
export {};
