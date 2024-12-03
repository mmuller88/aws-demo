# aws-demo

## Getting Started

https://docs.aws.amazon.com/cdk/v2/guide/hello_world.html

## Architecture

```mermaid
graph TB
    Internet((Internet))

    subgraph vpc[VPC]
        subgraph public[Public Subnet]
            WebServer[Web Server]
            NAT[NAT Gateway]
        end

        subgraph private[Private Subnet]
            Bastion[Bastion Host]
            RDS[(RDS PostgreSQL)]
        end
    end

    Internet --> vpc
    NAT --> private
    WebServer -- Port 5432 --> RDS
    Bastion -- Port 5432 --> RDS
    Internet --> WebServer
```

## Bootstrap

```bash
npx cdk bootstrap
```

## Deploy

```bash
npx cdk deploy
```

## Connect to RDS

```bash
INSTANCE=i-03b3b80794bb91296
ENDPOINT=awsdemostack-databaseb269d8bb-chjer1oo2ode.c3mmk408cu5t.us-east-1.rds.amazonaws.com

aws ssm start-session \
    --target "$INSTANCE" \
    --document-name "AWS-StartPortForwardingSessionToRemoteHost" \
    --parameters "portNumber=5432,localPortNumber=5432,host=$ENDPOINT" \
    --region "us-east-1"
```

## Cost

The estimated monthly cost for running this AWS infrastructure is approximately $59.21. This includes:

- **EC2 Instances**: $12.10
- **RDS Instance**: $12.41
- **NAT Gateway**: $32.40
- **RDS Storage**: $2.30

Please note that these are estimated costs and actual costs may vary based on usage and AWS pricing changes.

Use <https://calculator.aws/#/> to calculate costs for different configurations.
