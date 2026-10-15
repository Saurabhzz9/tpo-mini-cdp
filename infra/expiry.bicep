@description('Dedicated assessment resource group only. This workflow deletes its own group after expiry.')
param appName string
param cleanupAt string = '2026-10-29T06:30:00Z'
var groupUri = uri(environment().resourceManager,resourceGroup().id)
var contributor = subscriptionResourceId('Microsoft.Authorization/roleDefinitions','b24988ac-6180-42a0-ab88-20f7382dd24c')
resource cleanup 'Microsoft.Logic/workflows@2019-05-01' = {
  name:'${appName}-expiry'
  location:resourceGroup().location
  identity:{type:'SystemAssigned'}
  tags:{project:'tpo-mini-cdp',expiresOn:'2026-10-29',purpose:'14-day-assessment-demo'}
  properties:{
    state:'Enabled'
    definition:{
      '$schema':'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#'
      contentVersion:'1.0.0.0'
      triggers:{Expiry:{type:'Recurrence',recurrence:{frequency:'Day',interval:1,startTime:cleanupAt}}}
      actions:{
        Read_group:{
          type:'Http'
          inputs:{method:'GET',uri:'${groupUri}?api-version=2022-09-01',authentication:{type:'ManagedServiceIdentity'}}
          runAfter:{}
        }
        List_resources:{
          type:'Http'
          inputs:{method:'GET',uri:'${groupUri}/resources?api-version=2021-04-01',authentication:{type:'ManagedServiceIdentity'}}
          runAfter:{Read_group:['Succeeded']}
        }
        Unexpected_resources:{
          type:'Query'
          inputs:{
            from:'@body(\'List_resources\')?[\'value\']'
            where:'@not(contains(createArray(\'${appName}\',\'${appName}-plan\',\'${appName}-pg\',\'${appName}-expiry\',\'${appName}-ci\'),item()?[\'name\']))'
          }
          runAfter:{List_resources:['Succeeded']}
        }
        Verify_expiry_and_ownership:{
          type:'If'
          expression:'@and(greaterOrEquals(ticks(utcNow()),ticks(\'${cleanupAt}\')),equals(body(\'Read_group\')?[\'tags\']?[\'project\'],\'tpo-mini-cdp\'),equals(body(\'Read_group\')?[\'tags\']?[\'expiresOn\'],\'2026-10-29\'),equals(length(body(\'Unexpected_resources\')),0),empty(body(\'List_resources\')?[\'nextLink\']))'
          actions:{
            Delete_demo_group:{
              type:'Http'
              operationOptions:'DisableAsyncPattern'
              inputs:{method:'DELETE',uri:'${groupUri}?api-version=2022-09-01',authentication:{type:'ManagedServiceIdentity'}}
              runAfter:{}
            }
          }
          else:{actions:{Refuse_unexpected_inventory:{type:'Terminate',inputs:{runStatus:'Failed',runError:{code:'DemoCleanupGuard',message:'Expiry, ownership or inventory did not match. No resources were deleted.'}},runAfter:{}}}}
          runAfter:{Unexpected_resources:['Succeeded']}
        }
      }
      outputs:{}
    }
  }
}
resource cleanupRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name:guid(resourceGroup().id,cleanup.name,'delete-demo-after-expiry')
  properties:{principalId:cleanup.identity.principalId,principalType:'ServicePrincipal',roleDefinitionId:contributor}
}
output cleanupWorkflow string = cleanup.id
output scheduledUtc string = cleanupAt
