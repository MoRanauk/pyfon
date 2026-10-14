$base = 'http://localhost:3000'
function Plain($s) { [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)) }
$email = Read-Host 'Creative partner email'
$pw = Plain (Read-Host 'Password (hidden)' -AsSecureString)
$r = Invoke-RestMethod -Method Post -Uri "$base/v1/auth/login" -Headers @{ 'X-Interface' = 'm3-creative' } -ContentType 'application/json' -Body (@{ email = $email; password = $pw } | ConvertTo-Json)
$tok = if ($r.token) { $r.token } else { $r.accessToken }
$h = @{ 'X-Interface' = 'm3-creative'; Authorization = "Bearer $tok" }
$me = (Invoke-RestMethod -Uri "$base/v1/auth/me" -Headers $h).user
$pending = (Invoke-RestMethod -Uri "$base/v1/partner/approvals" -Headers $h).requests | Where-Object { $_.requestedBy -eq $me.id }
foreach ($p in $pending) {
  try { Invoke-RestMethod -Method Post -Uri ("$base/v1/partner/approvals/" + $p.id + "/cancel") -Headers $h | Out-Null; Write-Host ('Cancelled ' + $p.id) }
  catch { Write-Host ('Could not cancel ' + $p.id + ': ' + $_.ErrorDetails.Message) }
}
Write-Host 'Still pending:'
(Invoke-RestMethod -Uri "$base/v1/partner/approvals" -Headers $h).requests | Format-Table id, summary, status
