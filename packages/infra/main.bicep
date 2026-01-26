// Azure Infrastructure - Bicep Template
// Phase 2/3: Deploy Azure Web PubSub and Azure Container Apps

@description('Location for all resources')
param location string = resourceGroup().location

@description('Base name for all resources')
param baseName string = 'acp-editor'

@description('Environment name (dev, staging, prod)')
param environment string = 'dev'

// Variables
var webPubSubName = '${baseName}-pubsub-${environment}'
var containerAppsEnvName = '${baseName}-env-${environment}'
var tokenBrokerAppName = '${baseName}-token-broker-${environment}'
var agentBridgeAppName = '${baseName}-agent-bridge-${environment}'
var miniLlmAppName = '${baseName}-mini-llm-${environment}'

// Azure Web PubSub
resource webPubSub 'Microsoft.SignalRService/webPubSub@2023-02-01' = {
  name: webPubSubName
  location: location
  sku: {
    name: 'Free_F1' // Use 'Standard_S1' for production
    capacity: 1
  }
  properties: {
    publicNetworkAccess: 'Enabled'
    tls: {
      clientCertEnabled: false
    }
  }
}

// Container Apps Environment
resource containerAppsEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppsEnvName
  location: location
  properties: {
    zoneRedundant: false
  }
}

// Token Broker Container App
resource tokenBrokerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: tokenBrokerAppName
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 4000
        transport: 'http'
      }
      secrets: [
        {
          name: 'webpubsub-connection'
          value: webPubSub.listKeys().primaryConnectionString
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'token-broker'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest' // Replace with your image
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'WEBPUBSUB_CONNECTION'
              secretRef: 'webpubsub-connection'
            }
            {
              name: 'PORT'
              value: '4000'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
      }
    }
  }
}

// Agent Bridge Container App
resource agentBridgeApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: agentBridgeAppName
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      ingress: {
        external: false
        targetPort: 3001
        transport: 'http'
      }
      secrets: [
        {
          name: 'webpubsub-connection'
          value: webPubSub.listKeys().primaryConnectionString
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'agent-bridge'
          image: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest' // Replace with your image
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'WEBPUBSUB_CONNECTION'
              secretRef: 'webpubsub-connection'
            }
            {
              name: 'LLM_URL'
              value: 'http://${miniLlmAppName}.internal.${containerAppsEnv.properties.defaultDomain}'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 5
      }
    }
  }
}

// Mini LLM Container App
resource miniLlmApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: miniLlmAppName
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      ingress: {
        external: false
        targetPort: 11434
        transport: 'http'
      }
    }
    template: {
      containers: [
        {
          name: 'mini-llm'
          image: 'ollama/ollama:latest'
          resources: {
            cpu: json('2')
            memory: '4Gi'
          }
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 2
      }
    }
  }
}

// Outputs
output webPubSubName string = webPubSub.name
output webPubSubHostname string = webPubSub.properties.hostName
output tokenBrokerUrl string = tokenBrokerApp.properties.configuration.ingress.fqdn
output containerAppsEnvId string = containerAppsEnv.id
