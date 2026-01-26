# Azure Infrastructure

This directory will contain Infrastructure as Code (IaC) for deploying to Azure.

## Phase 2 & 3: Azure Deployment

### Resources to Provision

1. **Azure Web PubSub**
   - Standard tier for production
   - Free tier for development
   - Configure hub and groups

2. **Azure Container Apps (ACA)**
   - Consumption plan for scale-to-zero
   - Three container apps:
     - token-broker
     - agent-bridge
     - mini-llm (Ollama or llama.cpp)

3. **Networking**
   - Virtual Network (optional, for private communication)
   - Internal ingress for agent-bridge and mini-llm
   - Public ingress for token-broker and client

### Deployment Options

#### Option 1: Azure CLI

```bash
# Create resource group
az group create --name acp-editor-rg --location eastus

# Create Web PubSub
az webpubsub create \
  --name acp-editor-pubsub \
  --resource-group acp-editor-rg \
  --location eastus \
  --sku Free_F1

# Create Container Apps Environment
az containerapp env create \
  --name acp-editor-env \
  --resource-group acp-editor-rg \
  --location eastus \
  --logs-destination none

# Deploy container apps (see deploy.sh)
```

#### Option 2: Bicep (Recommended)

See `main.bicep` for declarative infrastructure definition.

```bash
# Deploy with Bicep
az deployment group create \
  --resource-group acp-editor-rg \
  --template-file main.bicep \
  --parameters main.parameters.json
```

#### Option 3: Terraform

See `main.tf` for Terraform configuration.

```bash
# Initialize and deploy
terraform init
terraform plan
terraform apply
```

## Cost Estimation

### Free Tier / Free Grants

- **Web PubSub Free Tier**: 20 concurrent connections, 20K messages/day
- **ACA Consumption Free Grants** (per subscription/month):
  - 180,000 vCPU-seconds
  - 360,000 GiB-seconds
  - 2 million requests

### Typical Monthly Cost (Beyond Free Tier)

Small development workload:

- Web PubSub Standard: ~$50/month (1 unit)
- ACA Consumption: ~$10-20/month (with scale-to-zero)
- **Total: ~$60-70/month**

Production workload (minimal):

- Web PubSub Standard: ~$100/month (2 units)
- ACA Consumption: ~$50/month
- **Total: ~$150/month**

## Deployment Scripts

```bash
# Phase 2: Deploy infrastructure
./deploy-infra.sh

# Phase 3: Deploy containers
./deploy-apps.sh

# Cleanup
./cleanup.sh
```

## Security

- Use Azure Key Vault for secrets
- Enable Managed Identity for ACA
- Configure network security groups
- Use private endpoints where possible

## Monitoring

- Enable Application Insights
- Configure Container Apps logs
- Set up alerts for failures and high costs

## References

- [Azure Web PubSub Pricing](https://azure.microsoft.com/pricing/details/web-pubsub/)
- [Azure Container Apps Pricing](https://azure.microsoft.com/pricing/details/container-apps/)
- [ACA Free Grants](https://learn.microsoft.com/azure/container-apps/billing)
