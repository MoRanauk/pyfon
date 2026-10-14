$base = 'http://localhost:3000'
function Plain($s) { [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)) }
$iface = Read-Host 'Interface for this account (m3-creative or dev)'
$email = Read-Host 'Account email'
$old = Plain (Read-Host 'Temporary password (hidden)' -AsSecureString)
$new = Plain (Read-Host 'NEW password, 12+ characters (hidden)' -AsSecureString)
$h = @{ 'X-Interface' = $iface }
$r = Invoke-RestMethod -Method Post -Uri "$base/v1/auth/login" -Headers $h -ContentType 'application/json' -Body (@{ email = $email; password = $old } | ConvertTo-Json)
$tok = if ($r.token) { $r.token } else { $r.accessToken }
$h['Authorization'] = "Bearer $tok"
$body = @{ current_password = $old; new_password = $new } | ConvertTo-Json
try {
  Invoke-RestMethod -Method Post -Uri "$base/v1/auth/change-password" -Headers $h -ContentType 'application/json' -Body $body | Out-Null
  Write-Host 'Password changed.'
} catch { Write-Host 'FAILED'; Write-Host $_.ErrorDetails.Message }
