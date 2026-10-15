@description('Deploy only after approving billable Azure resources. Globally unique lowercase name.')
param appName string
param location string = resourceGroup().location
param databaseAdmin string = 'tpoadmin'
@secure()
param databasePassword string
param applicationDatabaseUser string = databaseAdmin
@secure()
param applicationDatabasePassword string = ''
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
param expiresOn string = '2026-10-29'
@description('Build a source ZIP with Oryx on Linux, or deploy a prebuilt standalone ZIP.')
param sourceBuild bool = false
var demoTags = {project:'tpo-mini-cdp',expiresOn:expiresOn,monthlyBudgetUSD:'30',purpose:'14-day-assessment-demo'}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${appName}-plan'
  location: location
  sku: {name:'B1',tier:'Basic',capacity:1}
  kind: 'linux'
  tags:demoTags
  properties: {reserved:true}
}
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: '${appName}-pg'
  location: location
  tags:demoTags
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
  tags:demoTags
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
      appCommandLine:sourceBuild ? 'node scripts/start.mjs' : 'node server.js'
      appSettings:[
        {name:'NODE_ENV',value:'production'}
        {name:'PORT',value:'8080'}
        {name:'HOSTNAME',value:'0.0.0.0'}
        {name:'APP_URL',value:'https://${appName}.azurewebsites.net'}
        {name:'DATABASE_URL',value:'postgresql://${applicationDatabaseUser}:${uriComponent(empty(applicationDatabasePassword) ? databasePassword : applicationDatabasePassword)}@${postgres.properties.fullyQualifiedDomainName}:5432/tpo?sslmode=verify-full'}
        {name:'SESSION_SECRET',value:sessionSecret}
        {name:'WEBHOOK_SECRET',value:webhookSecret}
        {name:'ADMIN_USERNAME',value:'admin'}
        {name:'LOGIN_TRUSTED_PROXY',value:'azure-app-service'}
        {name:'ADMIN_PASSWORD_HASH',value:adminPasswordHash}
        {name:'ANALYSIS_DATE',value:'2026-09-28'}
        {name:'ASSISTANT_DAILY_LIMIT',value:'10'}
        {name:'AZURE_AI_ENDPOINT',value:azureAiEndpoint}
        {name:'AZURE_AI_DEPLOYMENT',value:azureAiDeployment}
        {name:'AZURE_AI_KEY',value:azureAiKey}
        {name:'SCM_DO_BUILD_DURING_DEPLOYMENT',value:sourceBuild ? 'true' : 'false'}
        {name:'ENABLE_ORYX_BUILD',value:sourceBuild ? 'true' : 'false'}
        {name:'NPM_CONFIG_INCLUDE',value:sourceBuild ? 'dev' : ''}
      ]
    }
  }
}
output appUrl string = 'https://${site.properties.defaultHostName}'
output webhookUrl string = 'https://${site.properties.defaultHostName}/webhooks/app'
output databaseHost string = postgres.properties.fullyQualifiedDomainName
