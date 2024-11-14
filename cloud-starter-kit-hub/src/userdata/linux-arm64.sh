#!/bin/bash
sudo yum update -y
sudo yum install -y https: //s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_arm64/amazon-ssm-agent.rpm
sudo systemctl status amazon-ssm-agent
sudo yum install -y ec2-instance-connect httpd
sudo systemctl enable httpd
sudo systemctl start httpd.service