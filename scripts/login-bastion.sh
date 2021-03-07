export AWS_REGION=eu-west-2
export BASTION_INSTANCE_ID=$(aws ec2 describe-instances \
                          --region=$AWS_REGION \
                          --filter "Name=tag:Name,Values=ex-ec2-example-redis-bastion" \
                          --query "Reservations[].Instances[?State.Name == 'running'].InstanceId[]" \
                          --output text)

echo $BASTION_INSTANCE_ID
aws ssm start-session --target $BASTION_INSTANCE_ID --region=$AWS_REGION