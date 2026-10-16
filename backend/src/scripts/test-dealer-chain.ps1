$email = Read-Host "Dealer email"
$pw = Read-Host "Dealer password" -AsSecureString
$p = [System.Net.NetworkCredential]::new('', $pw).Password
$U = 'http://localhost:3000'
function Call($method, $path, $body) {
  $a = @{ Method = $method; Uri = ($U + $path); Headers = $H; ContentType = 'application/json' }
  if ($body) { $a.Body = ($body | ConvertTo-Json) }
  try {
    $d = Invoke-RestMethod @a
    return @{ Code = 200; Data = $d }
  } catch {
    return @{ Code = $_.Exception.Response.StatusCode.value__; Data = $null }
  }
}
function Show($label, $got, $want) {
  if ("$got" -eq "$want") { "PASS  $label" } else { "FAIL  $label (got $got, wanted $want)" }
}
$r = Invoke-RestMethod -Method Post -Uri "$U/v1/auth/login" -Headers @{'X-Interface'='vendor'} -ContentType 'application/json' -Body (@{email=$email;password=$p} | ConvertTo-Json)
$H = @{'X-Interface'='vendor'; Authorization=('Bearer ' + $r.token)}
$out = node --env-file=.env src/scripts/test-dealer-chain.js setup
$ref = (($out | Where-Object { $_ -like 'JOBREF:*' }) -replace 'JOBREF:', '').Trim()
if (-not $ref) { throw 'setup failed, see the error above' }
try {
  "Job under test: $ref"
  $x = Call 'Get' '/v1/vendor/jobs' $null
  Show 'dealer sees the job in the list' (@($x.Data.jobs | Where-Object { $_.ref -eq $ref }).Count) 1
  $json = ($x.Data | ConvertTo-Json -Depth 6 -Compress)
  Show 'no phone, email or address in the data' ($json -match '(?i)phone|email|address') $false
  $json
  Show 'jump straight to ready is refused' (Call 'Post' "/v1/vendor/jobs/$ref/status" @{status='ready'}).Code 409
  Show 'offered -> accepted' (Call 'Post' "/v1/vendor/jobs/$ref/status" @{status='accepted'}).Code 200
  Show 'accepted twice is refused' (Call 'Post' "/v1/vendor/jobs/$ref/status" @{status='accepted'}).Code 409
  Show 'accepted -> in_progress' (Call 'Post' "/v1/vendor/jobs/$ref/status" @{status='in_progress'}).Code 200
  Show 'in_progress -> ready' (Call 'Post' "/v1/vendor/jobs/$ref/status" @{status='ready'}).Code 200
  Show 'ready twice is refused' (Call 'Post' "/v1/vendor/jobs/$ref/status" @{status='ready'}).Code 409
  Show 'nonsense status is refused' (Call 'Post' "/v1/vendor/jobs/$ref/status" @{status='done'}).Code 400
  Show 'fake job ref gives not found' (Call 'Get' '/v1/vendor/jobs/JOB-999999' $null).Code 404
  node --env-file=.env src/scripts/test-dealer-chain.js unassign
  Show 'job taken away from the dealer is hidden' (Call 'Get' "/v1/vendor/jobs/$ref" $null).Code 404
} finally {
  node --env-file=.env src/scripts/test-dealer-chain.js restore
}
