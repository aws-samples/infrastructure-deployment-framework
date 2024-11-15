import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';

interface KitStackProps extends cdk.StackProps {
  env: {
    account: string,
    region: string
  },
  params: {
    fifo: string,
    account: string,
    region: string
  };
}

export class QueueStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: KitStackProps) {
    super(scope, id, props);

    if (props.params.fifo === "true") {
      let dlq = new sqs.Queue(this, 'DeadLetterQueue', { enforceSSL: true, fifo: true });
      let queueProps = {
        fifo: true,
        visibilityTimeout: cdk.Duration.seconds(300),
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        enforceSSL: true,
        deadLetterQueue: {
          maxReceiveCount: 10,
          queue: dlq,
        },
      };
      const queue = new sqs.Queue(this, 'SqsQueue', queueProps);
      this.exportValue(queue.queueName);
    }
    else {
      let dlq = new sqs.Queue(this, 'DeadLetterQueue', { enforceSSL: true });
      let queueProps = {
        visibilityTimeout: cdk.Duration.seconds(300),
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        enforceSSL: true,
        deadLetterQueue: {
          maxReceiveCount: 10,
          queue: dlq,
        },
      };
      const queue = new sqs.Queue(this, 'SqsQueue', queueProps);
      this.exportValue(queue.queueName);
    }

  }
}
