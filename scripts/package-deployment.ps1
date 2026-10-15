$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path '.').Path
$taskStage = Join-Path $taskRoot 'tmp/deploy'
if (Test-Path -LiteralPath $taskStage) { throw 'tmp/deploy already exists. Choose a fresh staging folder before packaging.' }
New-Item -ItemType Directory -Path $taskStage -Force | Out-Null
Copy-Item -Path '.next/standalone/*' -Destination $taskStage -Recurse -Force
Copy-Item -LiteralPath '.next/standalone/.next' -Destination (Join-Path $taskStage '.next') -Recurse -Force
Copy-Item -LiteralPath '.next/static' -Destination (Join-Path $taskStage '.next/static') -Recurse -Force
Copy-Item -LiteralPath 'public','migrations' -Destination $taskStage -Recurse -Force
New-Item -ItemType Directory -Path (Join-Path $taskStage 'scripts') -Force | Out-Null
Copy-Item -LiteralPath 'scripts/migrate-prod.mjs' -Destination (Join-Path $taskStage 'scripts')
# Never package local environment files or embedded databases.
Get-ChildItem -LiteralPath $taskStage -Filter '.env*' -Force | Remove-Item -Force
Compress-Archive -Path (Join-Path $taskStage '*') -DestinationPath 'tmp/tpo-deployment.zip'
Write-Output 'Created tmp/tpo-deployment.zip. Build the release on Linux for Azure; local Windows standalone junctions are not portable.'
