param appName string
param repository string = 'Saurabhzz9/tpo-mini-cdp'
param roleAssignmentName string = guid(resourceGroup().id,appName,'github-main-deployment')
resource site 'Microsoft.Web/sites@2023-12-01' existing = {name:appName}
resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name:'${appName}-ci'
  location:resourceGroup().location
  tags:{project:'tpo-mini-cdp',expiresOn:'2026-10-29',purpose:'14-day-assessment-demo'}
}
resource federation 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent:identity
  name:'github-main'
  properties:{issuer:'https://token.actions.githubusercontent.com',subject:'repo:${repository}:ref:refs/heads/main',audiences:['api://AzureADTokenExchange']}
}
resource deployRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope:site
  name:roleAssignmentName
  properties:{principalId:identity.properties.principalId,principalType:'ServicePrincipal',roleDefinitionId:subscriptionResourceId('Microsoft.Authorization/roleDefinitions','de139f84-1756-47ae-9be6-808fbbe84772')}
}
output clientId string = identity.properties.clientId
output tenantId string = tenant().tenantId
