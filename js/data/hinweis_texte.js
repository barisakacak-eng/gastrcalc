// Hinweis-Karten in anderen Sprachen (24.10.2026, Gremium 1 + 2: türkischer Wirt sah nur deutsche Steuerkarten).
// Deutsch bleibt führend und steht in js/hinweis.js (Inhalt, Quelle, Prüfdatum). Hier nur Titel, Satz und Beleg-Stichworte
// je Karten-Kennung für en und tr. Fehlt eine Sprache oder eine Karte, zeigt die App Deutsch. Quelle (Paragraf) bleibt immer Deutsch.
// Einfache Sprache, höchstens 25 Wörter je Satz, jeder Satz endet sinngemäß mit „mit deinem Steuerberater klären“.
export const HINWEIS_TEXTE = {
  en: {
    steuer_sieben: { titel: "7 % on food", satz: "Since 2026 food is taxed at 7 % VAT, drinks at 19 %. Set your till accordingly and check with your tax advisor.", belege: ["Z report", "Till settings"] },
    menue_aufteilen: { titel: "Split combo meals", satz: "Combo with a drink: food 7 %, drink 19 %, split by single prices, not by cost. Store single prices and check with your tax advisor.", belege: ["Price list", "Combo prices"] },
    sachentnahme: { titel: "Your own meals count", satz: "Your own meals count as a withdrawal with fixed yearly amounts; children up to 12 count half, babies not. Book monthly, check with your tax advisor.", belege: ["Flat rates 2026"] },
    personalessen: { titel: "Record staff meals", satz: "Free meals for staff count as wages with a fixed official value. Record meals daily and check with your tax advisor.", belege: ["Staff meal list"] },
    berufskleidung: { titel: "Deduct work clothes", satz: "Chef jacket, apron and safety shoes can be business expenses, normal clothes not. Keep receipts and check with your tax advisor.", belege: ["Chef jacket", "Apron", "Safety shoes"] },
    gwg: { titel: "Small devices at once", satz: "Devices up to 800 € net are fully deductible in the purchase year, dearer ones over several years. Keep the invoice and check with your tax advisor.", belege: ["Device invoice"] },
    belehrung: { titel: "Deduct hygiene training", satz: "Fees for hygiene briefings and trainings are business expenses and proof for the authority. Receipt in both folders and check with your tax advisor.", belege: ["Health office briefing", "Training"] },
    aufbewahrung: { titel: "Keep receipts", satz: "Keep invoices eight years; till data, books and statements ten years, readable. Save monthly pack and till export, check with your tax advisor.", belege: ["Daily closing", "Z report"] },
    tagesabschluss: { titel: "Close the till daily", satz: "Every day needs a till closing, otherwise the tax office may estimate your profit. Save Z reports daily and check with your tax advisor.", belege: ["Z report", "Cash book"] },
    inventur_schwund: { titel: "Explain shrinkage", satz: "Recorded waste and stock counts help explain why goods are missing but unsold. Keep both going and check with your tax advisor.", belege: ["Waste list", "Stock count"] },
    bewirtung: { titel: "Hospitality receipt from 250 €", satz: "Business customer wants a hospitality receipt: always give the till receipt. Over 250 €: full invoice with customer name and address. Check with your tax advisor.", belege: ["Hospitality receipt"] },
    gmbh_chefessen: { titel: "Account for the boss's meals", satz: "As managing director you do not eat for free: your meals count as wages or a hidden profit payout. Settle this with your tax advisor.", belege: ["Director payslip"] },
    gmbh_bilanz: { titel: "Balance sheet is mandatory", satz: "Your company always needs a balance sheet, however small the turnover. Sort receipts monthly and check with your tax advisor.", belege: ["Monthly pack", "Bank statements"] },
    gmbh_gewerbesteuer: { titel: "No trade tax allowance", satz: "The 24,500 € trade tax allowance is only for sole traders and partnerships, not your company. Plan for trade tax, check with your tax advisor.", belege: ["Trade tax assessment"] },
    trinkgeld: { titel: "Separate tips correctly", satz: "Tips from guests to your staff are tax-free for the staff. Tips for yourself are income with VAT. Keep a list, check with your tax advisor.", belege: ["Tip list"] },
    gutschein: { titel: "Book vouchers correctly", satz: "Voucher for an amount for food and drinks: tax when redeemed. Voucher for a specific dish: tax already at sale. Check with your tax advisor.", belege: ["Voucher list"] },
    pfand: { titel: "Deposit like the drink", satz: "Deposit on bottles gets the same tax rate as the drink inside, usually 19 %. Separate it in the till and check with your tax advisor.", belege: ["Deposit journal"] },
  },
  tr: {
    steuer_sieben: { titel: "Yemekte % 7", satz: "2026'dan beri yemeklerde % 7, içeceklerde % 19 KDV geçerli. Kasayı buna göre ayarla ve mali müşavirinle görüş.", belege: ["Z raporu", "Kasa ayarı"] },
    menue_aufteilen: { titel: "Menüleri ayır", satz: "İçecekli menü: yemek % 7, içecek % 19, tek fiyatlara göre bölünür, maliyete göre değil. Tek fiyatları kaydet ve mali müşavirinle görüş.", belege: ["Fiyat listesi", "Menü fiyatları"] },
    sachentnahme: { titel: "Kendi yemeğin sayılır", satz: "Kendi yediğin işletmeden çekim sayılır. Vergi dairesi sabit yıllık tutarlar verir; 12 yaşına kadar çocuk yarım, bebek sayılmaz. Aylık kaydet, mali müşavirinle görüş.", belege: ["Götürü tutarlar 2026"] },
    personalessen: { titel: "Personel yemeğini kaydet", satz: "Personele bedava yemek, sabit resmi değerle ücret sayılır. Öğünleri her gün kaydet ve mali müşavirinle görüş.", belege: ["Personel yemek listesi"] },
    berufskleidung: { titel: "İş kıyafetini düş", satz: "Aşçı ceketi, önlük ve iş ayakkabısı gider olabilir, normal kıyafet olmaz. Fişleri topla ve mali müşavirinle görüş.", belege: ["Aşçı ceketi", "Önlük", "İş ayakkabısı"] },
    gwg: { titel: "Küçük cihazlar hemen", satz: "800 € nete kadar cihazlar alındığı yıl tam düşülür, pahalıları birkaç yıla yayılır. Faturayı sakla ve mali müşavirinle görüş.", belege: ["Cihaz faturası"] },
    belehrung: { titel: "Hijyen eğitimini düş", satz: "Hijyen bilgilendirmesi ve eğitim ücretleri giderdir ve daire için kanıttır. Makbuz iki klasöre, mali müşavirinle görüş.", belege: ["Sağlık dairesi bilgilendirmesi", "Eğitim"] },
    aufbewahrung: { titel: "Belgeleri sakla", satz: "Faturaları sekiz yıl, kasa verisi, defter ve bilançoları on yıl okunur sakla. Aylık paketi ve kasa dışa aktarımını yedekle, mali müşavirinle görüş.", belege: ["Gün kapanışı", "Z raporu"] },
    tagesabschluss: { titel: "Kasayı her gün kapat", satz: "Her günün kasa kapanışı olmalı. Yoksa vergi dairesi kârını tahmin edebilir. Z raporlarını her gün yedekle ve mali müşavirinle görüş.", belege: ["Z raporu", "Kasa defteri"] },
    inventur_schwund: { titel: "Fireyi açıkla", satz: "Kaydedilen çöp ve sayım, malın satılmadan neden eksildiğini açıklamaya yardım eder. İkisine devam et ve mali müşavirinle görüş.", belege: ["Çöp listesi", "Sayım"] },
    bewirtung: { titel: "250 €'dan itibaren ağırlama fişi", satz: "Kurumsal müşteri ağırlama fişi istiyor: her zaman kasa fişi ver. 250 € üstü: müşterinin adı ve adresiyle tam fatura. Mali müşavirinle görüş.", belege: ["Ağırlama fişi"] },
    gmbh_chefessen: { titel: "Patron yemeğini hesapla", satz: "Müdür olarak bedava yemiyorsun: yemeğin ücret ya da sana gizli kâr dağıtımı sayılır. Hesabı mali müşavirinle görüş.", belege: ["Müdür maaş bordrosu"] },
    gmbh_bilanz: { titel: "Bilanço zorunlu", satz: "Şirketinin cirosu ne kadar küçük olursa olsun bilanço gerekir. Belgeleri aylık sırala ve mali müşavirinle görüş.", belege: ["Aylık paket", "Hesap ekstreleri"] },
    gmbh_gewerbesteuer: { titel: "İşletme vergisi muafiyeti yok", satz: "İşletme vergisindeki 24.500 € muafiyet sadece şahıs işletmeleri ve şahıs şirketleri için, senin şirketin için değil. İşletme vergisini planla, mali müşavirinle görüş.", belege: ["İşletme vergisi kararı"] },
    trinkgeld: { titel: "Bahşişi doğru ayır", satz: "Müşterilerin personele verdiği bahşiş personel için vergisizdir. Kendine gelen bahşiş KDV'li gelirdir. Liste tut, mali müşavirinle görüş.", belege: ["Bahşiş listesi"] },
    gutschein: { titel: "Hediye çekini doğru kaydet", satz: "Yemek ve içecek için tutarlı çek: vergi kullanımda. Belirli bir yemek için çek: vergi satışta. Mali müşavirinle görüş.", belege: ["Hediye çeki listesi"] },
    pfand: { titel: "Depozito içecek gibi", satz: "Şişe depozitosu içindeki içecekle aynı vergi oranını alır, genelde % 19. Kasada ayır ve mali müşavirinle görüş.", belege: ["Depozito defteri"] },
  },
};

// Karte in der gewünschten Sprache: Felder titel, satz, belege ersetzt, Rest (id, quelle, status …) bleibt. Unbekannt → unverändert (Deutsch).
export function hinweisAnzeige(h, sprache) {
  const x = HINWEIS_TEXTE[sprache]?.[h?.id];
  return x ? { ...h, titel: x.titel, satz: x.satz, belege: Array.isArray(x.belege) ? x.belege : h.belege } : h;
}
