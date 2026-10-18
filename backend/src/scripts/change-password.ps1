$ErrorActionPreference = 'Stop'
$iface = Read-Host "Interface (m3-creative, m3-production or m3-finance)"
$email = Read-Host "Email"
$old = Read-Host "Temporary password" -AsSecureString
$new = Read-Host "New password (10+ characters)" -AsSecureString
$new2 = Read-Host "Type the new password again" -AsSecureString
$o = [System.Net.NetworkCredential]::new('', $old).Password
$n = [System.Net.NetworkCredential]::new('', $new).Password
$n2 = [System.Net.NetworkCredential]::new('', $new2).Password
if ($n -ne $n2) { Write-Host 'The two new passwords do not match. Run it again.'; exit 1 }
$U = 'http://localhost:3000'
function Call($url, $headers, $body) {
  try {
    return Invoke-RestMethod -Method Post -Uri $url -Headers $headers -ContentType 'application/json' -Body ($body | ConvertTo-Json)
  } catch {
    $msg = $_.Exception.Message
    if ($_.Exception.Response) {
      $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $msg = $sr.ReadToEnd()
    }
    Write-Host ('SERVER SAID: ' + $msg)
    exit 1
  }
}
$r = Call "$U/v1/auth/login" @{'X-Interface'=$iface} @{email=$email;password=$o}
$H = @{'X-Interface'=$iface; Authorization=('Bearer ' + $r.token)}
Call "$U/v1/auth/change-password" $H @{current_password=$o;new_password=$n} | Out-Null
Write-Host 'Password changed. You can now log in with the new password.'
