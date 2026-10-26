param([string]$CommitMessage='Publish tested FitLead website')
$ErrorActionPreference='Stop'
$env:GIT_TERMINAL_PROMPT='0'
$env:GCM_INTERACTIVE='Never'
$credentialLines="protocol=https`nhost=github.com`n`n" | git credential fill 2>$null
if($LASTEXITCODE -ne 0){throw 'GitHub credentials unavailable'}
$credential=($credentialLines -join "`n") | ConvertFrom-StringData
$headers=@{Authorization=('Bearer '+$credential.password);'User-Agent'='FitLead-development';Accept='application/vnd.github+json'}
$repo='https://api.github.com/repos/maolr3612-boop/fitlead-ai'
$ref=Invoke-RestMethod "$repo/git/ref/heads/main" -Headers $headers
$commit=Invoke-RestMethod "$repo/git/commits/$($ref.object.sha)" -Headers $headers
$out=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../apps/web/out')).Path
$items=@()
foreach($f in (Get-ChildItem -LiteralPath $out -Recurse -File)){
 $relative=[IO.Path]::GetRelativePath($out,$f.FullName).Replace('\','/')
 if($relative -match '\.(map|log)$'){continue}
 $items+=@{path=$relative;mode='100644';type='blob';content=[IO.File]::ReadAllText($f.FullName,[Text.Encoding]::UTF8)}
}
$items+=@{path='.nojekyll';mode='100644';type='blob';content=''}
$notice=@'
# FitLead AI online health platform

This GitHub Pages site connects to the independently deployed FitLead Workers/D1 API.
Data sources: USDA FoodData Central (CC0/public domain), free-exercise-db text (Unlicense per upstream; images excluded).
Rehabilitation sources are linked and independently summarized, not copied as a clinical manual. See the site's source/rights registry.
Generation is validated deterministic rules, not an enabled LLM. User health data and secrets are not stored in this public repository.
Backend bundle source is on branch codex/health-v2-backend; editable project sources remain in the local FitLead project.
'@
$items+=@{path='README.md';mode='100644';type='blob';content=$notice}
$tree=Invoke-RestMethod "$repo/git/trees" -Method Post -Headers $headers -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes((@{base_tree=$commit.tree.sha;tree=$items}|ConvertTo-Json -Depth 8 -Compress)))
$newCommit=Invoke-RestMethod "$repo/git/commits" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{message=$CommitMessage;tree=$tree.sha;parents=@($ref.object.sha)}|ConvertTo-Json -Compress)
# Non-force update protects concurrent work. Previous static assets remain for cache compatibility.
$null=Invoke-RestMethod "$repo/git/refs/heads/main" -Method Patch -Headers $headers -ContentType 'application/json' -Body (@{sha=$newCommit.sha;force=$false}|ConvertTo-Json)
[pscustomobject]@{commit=$newCommit.sha;files=$items.Count;url='https://maolr3612-boop.github.io/fitlead-ai/';previous_commit=$ref.object.sha}|ConvertTo-Json -Compress
