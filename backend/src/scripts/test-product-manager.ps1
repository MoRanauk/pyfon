$ErrorActionPreference = 'Stop'
$iface = Read-Host "Partner interface (m3-creative, m3-production or m3-finance)"
$email = Read-Host "Partner email"
$pw = Read-Host "Partner password" -AsSecureString
$photo = Read-Host "Full path of a small photo on this laptop (jpg or png)"
$p = [System.Net.NetworkCredential]::new('', $pw).Password
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
$r = Invoke-RestMethod -Method Post -Uri "$U/v1/auth/login" -Headers @{'X-Interface'=$iface} -ContentType 'application/json' -Body (@{email=$email;password=$p} | ConvertTo-Json)
$H = @{'X-Interface'=$iface; Authorization=('Bearer ' + $r.token)}
$link = 'https://res.cloudinary.com/demo/image/upload/sample.jpg'

$c = Call 'Post' "$CAT/items" @{ name='ZZ TEST Mug'; category='Test Category'; description='Test product'; features=@('Dishwasher safe','11oz'); priceType='fixed'; priceKes=500; storefronts=@('mco'); options=@(@{ name='Colour'; values=@('Red','Blue') }) }
Show 'create a draft product' $c.Code 201
$sku = $c.Data.item.sku
"Test product: $sku"

$ct = if ($photo -match '\.png$') { 'image/png' } else { 'image/jpeg' }
$code = curl.exe -s -o "$env:TEMP\pyfon-up.json" -w "%{http_code}" -X POST -H "X-Interface: $iface" -H "Authorization: Bearer $($r.token)" -F "file=@$photo;type=$ct" -F "label=Front" "$CAT/items/$sku/images"
Show 'upload a photo to Cloudinary' $code 201
$img1 = (Get-Content "$env:TEMP\pyfon-up.json" -Raw | ConvertFrom-Json).image.id

$a = Call 'Post' "$CAT/items/$sku/images" @{ url=$link; label='Side' }
Show 'add a photo by link' $a.Code 201
$img2 = $a.Data.image.id
Show 'reorder photos' (Call 'Put' "$CAT/items/$sku/images/order" @{ order=@($img2,$img1) }).Code 200
$rp = Call 'Post' "$CAT/items/$sku/images/$img1/replace" @{ url='https://res.cloudinary.com/demo/image/upload/lake.jpg'; label='Front new' }
Show 'replace a photo (old one archived)' $rp.Code 201
$img3 = $rp.Data.image.id
$d = Call 'Get' "$CAT/items/$sku" $null
Show 'detail shows 2 current photos' @($d.Data.images.current).Count 2
Show 'detail shows 1 archived photo' @($d.Data.images.archive).Count 1
Show 'archive a photo' (Call 'Post' "$CAT/items/$sku/images/$img2/archive" @{ reason='test' }).Code 200
Show 'restore it' (Call 'Post' "$CAT/items/$sku/images/$img2/restore" $null).Code 200

$g = Call 'Post' "$CAT/items/$sku/designs" @{ name='Test design'; url=$link }
Show 'add a design' $g.Code 201
$dz = $g.Data.design.id
Show 'archive the design' (Call 'Post' "$CAT/items/$sku/designs/$dz/archive" $null).Code 200
Show 'restore the design' (Call 'Post' "$CAT/items/$sku/designs/$dz/restore" $null).Code 200

Show 'publish' (Call 'Post' "$CAT/items/$sku/publish" $null).Code 200
$pub = Call 'Get' "$U/v1/catalog/mco/items/$sku" $null
Show 'shop page lists 2 photos' @($pub.Data.item.images).Count 2
Show 'shop page lists 2 features' @($pub.Data.item.features).Count 2
Show 'shop page lists 1 design' @($pub.Data.item.designs).Count 1
Show 'price change on a live product is refused' (Call 'Patch' "$CAT/items/$sku" @{ priceKes=600 }).Code 409
Show 'renaming a live product is allowed' (Call 'Patch' "$CAT/items/$sku" @{ name='ZZ TEST Mug renamed' }).Code 200
Show 'archive one of two photos' (Call 'Post' "$CAT/items/$sku/images/$img3/archive" $null).Code 200
Show 'cannot archive the last photo of a live product' (Call 'Post' "$CAT/items/$sku/images/$img2/archive" $null).Code 409

$ap = Call 'Post' "$U/v1/partner/approvals" @{ action='price_change'; payload=@{ sku=$sku; priceKes=650 } }
Show 'price change goes to approval' $ap.Code 201
Show 'cancel that approval' (Call 'Post' "$U/v1/partner/approvals/$($ap.Data.request.id)/cancel" $null).Code 200
$after = Call 'Get' "$CAT/items/$sku" $null
Show 'price is still 500' $after.Data.item.priceKes 500
"Done. Remove the test product with: node --env-file=.env src/scripts/remove-test-product.js (from backend)"

