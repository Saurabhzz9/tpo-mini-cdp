@description('Deploy only after approving billable Azure resources. Globally unique lowercase name.')
param appName string
param location string = resourceGroup().location
param databaseAdmin string = 'tpoadmin'
@secure()
param databasePassword string
@secure()
param sessionSecret string
@secure()
param webhookSecret string
@secure()
param adminPasswordHash string
param azureAiEndpoint string
param azureAiDeployment string
@secure()
param azureAiKey string
@description('Explicit trusted IPv4 addresses only. Add App Service outbound IPs after deployment.')
param allowedDatabaseIps array = []

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${appName}-plan'
  location: location
  sku: {name:'B1',tier:'Basic',capacity:1}
  kind: 'linux'
  properties: {reserved:true}
}
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: '${appName}-pg'
  location: location
  sku: {name:'Standard_B1ms',tier:'Burstable'}
  properties: {
    version:'16'
    administratorLogin:databaseAdmin
    administratorLoginPassword:databasePassword
    storage:{storageSizeGB:32}
    backup:{backupRetentionDays:7,geoRedundantBackup:'Disabled'}
    highAvailability:{mode:'Disabled'}
    network:{publicNetworkAccess:'Enabled'}
  }
}
resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name:'tpo'
  properties:{charset:'UTF8',collation:'en_US.utf8'}
}
resource firewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = [for (ip,i) in allowedDatabaseIps: {
  parent:postgres
  name:'trusted-${i}'
  properties:{startIpAddress:ip,endIpAddress:ip}
}]
resource site 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location:location
  kind:'app,linux'
  identity:{type:'SystemAssigned'}
  properties:{
    serverFarmId:plan.id
    httpsOnly:true
    siteConfig:{
      linuxFxVersion:'NODE|24-lts'
      minTlsVersion:'1.2'
      ftpsState:'Disabled'
      alwaysOn:true
      healthCheckPath:'/api/health'
      appCommandLine:'node scripts/migrate-prod.mjs && node server.js'
      appSettings:[
        {name:'NODE_ENV',value:'production'}
        {name:'PORT',value:'8080'}
        {name:'HOSTNAME',value:'0.0.0.0'}
        {name:'APP_URL',value:'https://${appName}.azurewebsites.net'}
        {name:'DATABASE_URL',value:'postgresql://${databaseAdmin}:${uriComponent(databasePassword)}@${postgres.properties.fullyQualifiedDomainName}:5432/tpo?sslmode=verify-full'}
        {name:'SESSION_SECRET',value:sessionSecret}
        {name:'WEBHOOK_SECRET',value:webhookSecret}
        {name:'ADMIN_USERNAME',value:'admin'}
        {name:'ADMIN_PASSWORD_HASH',value:adminPasswordHash}
        {name:'ANALYSIS_DATE',value:'2026-09-28'}
        {name:'AZURE_AI_ENDPOINT',value:azureAiEndpoint}
        {name:'AZURE_AI_DEPLOYMENT',value:azureAiDeployment}
        {name:'AZURE_AI_KEY',value:azureAiKey}
        {name:'SCM_DO_BUILD_DURING_DEPLOYMENT',value:'false'}
      ]
    }
  }
}
output appUrl string = 'https://${site.properties.defaultHostName}'
output webhookUrl string = 'https://${site.properties.defaultHostName}/webhooks/app'
output databaseHost string = postgres.properties.fullyQualifiedDomainName
