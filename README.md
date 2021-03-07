# Redis cluster

This project is intended to run against an AWS account that has been bootstrapped
with cdk-bootstrap. It will create:

* A security group dedicated to the Redis cluster
* A disabled default user
* An example RO user
* An example RW user
* A user group containing all three users
* A Redis (cluster mode disabled) replication set using the SG and user group
* An EC2 bastion host in its own SG, granted access to the Redis SG

## Prerequisites

* An AWS account with 10.0.0.0/16 unassigned
* AWS CLI, CDK, Node > 10
* SessionManager plugin
* A CLI user with administrator access set up as default CLI user
* Run cdk-bootstrap first

## Testing the bastion host

Run `scripts/login-bastion.sh` to connect to the bastion host.

On the bastion, run `sudo su -` and `pip install redis`.

Now create a script with the following code:

    import redis
    r = redis.Redis(host='<cluster primary endpoint>',
                    port=6379,
                    db=0,
                    ssl=True,
                    username="rw-client",
                    password="12345678901234567890")
    r.set('foo', 'bar')
    result = r.get('foo')
    print(result)

Run this script with `python <script name>.py`.


## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
 * `cdk destroy`     tear down the whole stack
