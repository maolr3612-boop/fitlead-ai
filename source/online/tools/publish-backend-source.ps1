$ErrorActionPreference='Stop'
$env:GIT_TERMINAL_PROMPT='0'
$env:GCM_INTERACTIVE='Never'
$credentialLines="protocol=https`nhost=github.com`n`n" | git credential fill 2>$null
if($LASTEXITCODE -ne 0){throw 'GitHub credentials unavailable'}
$credential=($credentialLines -join "`n") | ConvertFrom-StringData
$headers=@{Authorization=('Bearer '+$credential.password);'User-Agent'='FitLead-development';Accept='application/vnd.github+json'}
$repo='https://api.github.com/repos/maolr3612-boop/fitlead-ai'
$branch='codex/health-v2-backend'
$ref=Invoke-RestMethod "$repo/git/ref/heads/main" -Headers $headers
try{$null=Invoke-RestMethod "$repo/git/refs" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{ref="refs/heads/$branch";sha=$ref.object.sha}|ConvertTo-Json)}catch{
 if($_.Exception.Response.StatusCode.value__ -ne 422){throw}
}
$file='services/fitlead-worker.js'
$existing=$null
try{$existing=Invoke-RestMethod "$repo/contents/${file}?ref=$branch" -Headers $headers}catch{if($_.Exception.Response.StatusCode.value__ -ne 404){throw}}
$payload=@{message='Add validated health plan and private account service';branch=$branch;content=[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $PSScriptRoot '../dist/worker.js')))}
if($existing){$payload.sha=$existing.sha}
$result=Invoke-RestMethod "$repo/contents/$file" -Method Put -Headers $headers -ContentType 'application/json' -Body ($payload|ConvertTo-Json -Compress)
$sourceHash=(Get-FileHash -LiteralPath (Join-Path $PSScriptRoot '../dist/worker.js') -Algorithm SHA256).Hash.ToLowerInvariant()
[pscustomobject]@{commit=$result.commit.sha;url="https://raw.githubusercontent.com/maolr3612-boop/fitlead-ai/$($result.commit.sha)/$file";sha256=$sourceHash}|ConvertTo-Json -Compress
