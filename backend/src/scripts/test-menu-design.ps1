$ErrorActionPreference = 'Stop'
$iface = Read-Host "Partner interface (m3-creative, m3-production or m3-finance)"
$email = Read-Host "Partner email"
$pw = Read-Host "Partner password" -AsSecureString
$pass = [System.Net.NetworkCredential]::new('', $pw).Password
$U = 'http://localhost:3000'
$CAT = "$U/v1/partner/catalog"
function Call($method, $url, $body) {
  $a = @{ Method = $method; Uri = $url; Headers = $H; ContentType = 'application/json'; UseBasicParsing = $true }
  if ($body) { $a.Body = ($body | ConvertTo-Json -Depth 6) }
  try {
    $r = Invoke-WebRequest @a
    return @{ Code = [int]$r.StatusCode; Data = ($r.Content | ConvertFrom-Json) }
  } catch {
    return @{ Code = $_.Exception.Response.StatusCode.value__; Data = $null }
  }
}
function Show($label, $got, $want) {
  if ("$got" -eq "$want") { "PASS  $label" } else { "FAIL  $label (got $got, wanted $want)" }
}
$r = Invoke-RestMethod -Method Post -Uri "$U/v1/auth/login" -Headers @{'X-Interface'=$iface} -ContentType 'application/json' -Body (@{email=$email;password=$pass} | ConvertTo-Json)
$H = @{'X-Interface'=$iface; Authorization=('Bearer ' + $r.token)}
$link = 'https://res.cloudinary.com/demo/image/upload/sample.jpg'

$c = Call 'Post' "$CAT/items" @{ name='ZZ TEST Menu Mug'; category='Test Category'; description='Test'; priceKes=500; storefronts=@('mco') }
Show 'create a draft product' $c.Code 201
$sku = $c.Data.item.sku
"Test product: $sku"
Show 'add a photo by link' (Call 'Post' "$CAT/items/$sku/images" @{ url=$link }).Code 201
Show 'add a design' (Call 'Post' "$CAT/items/$sku/designs" @{ name='Test design'; url=$link }).Code 201
$m = Call 'Get' "$CAT/menu" $null
Show 'menu list offers Mugs' @($m.Data.nodes | Where-Object { $_.slug -eq 'mugs' }).Count 1
Show 'unknown menu place is refused' (Call 'Put' "$CAT/items/$sku/menu" @{ slugs=@('no-such-place') }).Code 400
Show 'place it in Mugs' (Call 'Put' "$CAT/items/$sku/menu" @{ slugs=@('mugs') }).Code 200
Show 'menu places saved' @((Call 'Get' "$CAT/items/$sku/menu" $null).Data.slugs).Count 1
Show 'publish' (Call 'Post' "$CAT/items/$sku/publish" $null).Code 200
$l = Call 'Get' "$U/v1/catalog/mco/items?node=mugs&q=ZZ%20TEST&limit=10" $null
Show 'it now shows under Mugs in the shop' @($l.Data.items | Where-Object { $_.sku -eq $sku }).Count 1
$d = Call 'Get' "$U/v1/catalog/mco/items/$sku" $null
Show 'shop page offers 1 design' @($d.Data.item.designs).Count 1
Show 'bad job ref gives not found' (Call 'Get' "$CAT/jobs/JOB-1/designs" $null).Code 404
Show 'job with no designs gives an empty list' @((Call 'Get' "$CAT/jobs/JOB-000012/designs" $null).Data.designs).Count 0
"Now open the shop, search ZZ TEST and check the design picker. Then remove the test product."
