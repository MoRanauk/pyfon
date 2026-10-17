$ErrorActionPreference = 'Stop'
$iface = Read-Host "Interface (m3-creative, m3-production or m3-finance)"
$email = Read-Host "Email"
$old = Read-Host "Temporary password" -AsSecureString
$new = Read-Host "New password (10+ characters)" -AsSecureString
$o = [System.Net.NetworkCredential]::new('', $old).Password
$n = [System.Net.NetworkCredential]::new('', $new).Password
$U = 'http://localhost:3000'
$r = Invoke-RestMethod -Method Post -Uri "$U/v1/auth/login" -Headers @{'X-Interface'=$iface} -ContentType 'application/json' -Body (@{email=$email;password=$o} | ConvertTo-Json)
$H = @{'X-Interface'=$iface; Authorization=('Bearer ' + $r.token)}
Invoke-RestMethod -Method Post -Uri "$U/v1/auth/change-password" -Headers $H -ContentType 'application/json' -Body (@{current_password=$o;new_password=$n} | ConvertTo-Json) | Out-Null
'Password changed. You can now log in with the new password.'
