$ErrorActionPreference='Stop'
$env:GIT_TERMINAL_PROMPT='0'
$env:GCM_INTERACTIVE='Never'
$credentialLines="protocol=https`nhost=github.com`n`n" | git credential fill 2>$null
if($LASTEXITCODE -ne 0){throw 'GitHub credentials unavailable'}
$credential=($credentialLines -join "`n") | ConvertFrom-StringData
$headers=@{Authorization=('Bearer '+$credential.password);'User-Agent'='FitLead-development';Accept='application/vnd.github+json'}
$repo='https://api.github.com/repos/maolr3612-boop/fitlead-ai'
$branch='codex/health-v2-backend'
$ref=Invoke-RestMethod "$repo/git/ref/heads/$branch" -Headers $headers
$commit=Invoke-RestMethod "$repo/git/commits/$($ref.object.sha)" -Headers $headers
$root=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
$relativePaths=@('README.md','.env.example','docker-compose.yml','apps/web/package.json','apps/web/package-lock.json','apps/web/tsconfig.json','apps/web/next.config.ts','apps/web/postcss.config.mjs','apps/web/playwright.v2.config.ts','online/package.json','online/package-lock.json','online/tsconfig.json','online/wrangler.jsonc','online/README.md','online/.gitignore','online/worker-configuration.d.ts')
foreach($folder in @('apps/web/app','apps/web/components','apps/web/hooks','apps/web/lib','apps/web/types','apps/web/tests-v2','online/src','online/migrations','online/tools','online/tests')){
 foreach($f in Get-ChildItem -LiteralPath (Join-Path $root $folder) -File -Recurse){$relativePaths+=[IO.Path]::GetRelativePath($root,$f.FullName).Replace('\','/')}
}
foreach($name in @('exercises.json','foods.json','manifest.json','sources.json','rehabilitation.json','EXERCISES-LICENSE.md')){$relativePaths+='online/data/'+$name}
foreach($name in @('V2_TEST_REPORT.md','V2_IMPLEMENTATION_PLAN.md')){if(Test-Path -LiteralPath (Join-Path $root "docs/$name")){$relativePaths+='docs/'+$name}}
$treeItems=@()
foreach($relative in ($relativePaths|Select-Object -Unique)){
 if($relative -match '(^|/)(\.env|\.dev\.vars|node_modules|\.runtime)(/|$)|\.raw\.|\.db$'){throw "Refusing sensitive/local path: $relative"}
 $treeItems+=@{path=('source/'+$relative);mode='100644';type='blob';content=[IO.File]::ReadAllText((Join-Path $root $relative),[Text.Encoding]::UTF8)}
}
$tree=Invoke-RestMethod "$repo/git/trees" -Method Post -Headers $headers -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes((@{base_tree=$commit.tree.sha;tree=$treeItems}|ConvertTo-Json -Depth 8 -Compress)))
$newCommit=Invoke-RestMethod "$repo/git/commits" -Method Post -Headers $headers -ContentType 'application/json' -Body (@{message='Preserve editable frontend, private account API, open data and provenance';tree=$tree.sha;parents=@($ref.object.sha)}|ConvertTo-Json -Compress)
$null=Invoke-RestMethod "$repo/git/refs/heads/$branch" -Method Patch -Headers $headers -ContentType 'application/json' -Body (@{sha=$newCommit.sha;force=$false}|ConvertTo-Json)
[pscustomobject]@{commit=$newCommit.sha;source_files=$treeItems.Count;url="https://github.com/maolr3612-boop/fitlead-ai/tree/$branch/source"}|ConvertTo-Json -Compress
