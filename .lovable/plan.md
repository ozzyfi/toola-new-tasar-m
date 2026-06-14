## Amaç

Ana ekran (Home) iki küçük temizlik:
1. Üstteki "Merhaba Mehmet / Bugün 3 iş atandı." karşılama bloğu kaldırılacak.
2. Sekme başlığı "Bölgem" → **"Makinelerim"** (teknisyenin bölgesi zaten sabit, gereksiz bilgi). İçerideki "Mehmet'in bölgesi" başlığı da "İlgilendiğim makineler" olarak güncellenecek.

## Yapılacaklar (`public/toola.html`)

**1. Greeting bloğunu sil** (satır 3135-3138)
```html
<div class="greeting">
  <div class="greeting-hi">Merhaba Mehmet</div>
  <div class="greeting-sub" id="greetingSub">Bugün 3 iş atandı.</div>
</div>
```
Tamamen kaldırılacak. Hemen altındaki katkı kartı (contrib-card) sayfanın en üstünde kalacak.

**2. Sekme etiketi değişikliği** (satır 3181-3184)
- "Bölgem" → "Makinelerim"
- Sayaç (10 makine) korunur.

**3. Region tab başlığı** (satır 3222-3225)
- "Mehmet'in bölgesi" → "İlgilendiğim makineler"
- Alt satır "İstanbul · Ankara · İzmir" korunur (hangi şehirlerde makineleri olduğunu gösteriyor, kullanıcının "ilgilendiği makinalar" niyetiyle uyumlu).

## Dokunulmayacaklar

- `switchHomeTab('region')` fonksiyon adı ve `home-region` id'si değiştirilmeyecek (iç mantık çalışmaya devam etsin, sadece UI etiketleri).
- Katkı kartı, supervisor paneli, iş listesi ve makine kartları olduğu gibi kalır.
- `greetingSub` id'sine başka yerden referans var mı diye kontrol edildi — `setText('greetingSub', ...)` gibi bir kullanım yok, güvenle silinebilir.

## Test

Önizlemede:
- Ana ekran açılır açılmaz en üstte katkı kartı görünmeli (Mehmet Yılmaz / DENEYİMLİ / 145 katkı).
- Sekmeler: "İşlerim (3)" ve "Makinelerim (10)".
- "Makinelerim" sekmesine geçince başlık "İlgilendiğim makineler" görünmeli.
