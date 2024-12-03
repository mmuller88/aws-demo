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
INSTANCE=
ENDPOINT=

aws ssm start-session \
    --target "$INSTANCE" \
    --document-name "AWS-StartPortForwardingSessionToRemoteHost" \
    --parameters "portNumber=5432,localPortNumber=5432,host=$ENDPOINT" \
    --region "us-east-1"
```

## Cost
