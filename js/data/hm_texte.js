// Texte des Hinweis-Motors (Lauf 3, Phase 5, 09.11.2026) – Entwurf hinter window.__gcHM. Deutsch führt (Inhalt in js/hinweis_motor.js).
// Hier: Oberflächen-Wörter in de/tr/en/ar und die Hinweise selbst in tr und en. Fehlt eine Sprache oder ein Hinweis, zeigt die App Deutsch
// (übrige Sprachen Beta, wie im Katalog Abschnitt 4). Quelle und Paragraf bleiben immer Deutsch.
export const HM_UI = {
  de: { kopf: "Was dir zusteht", erledigtZahl: "Erledigt: {n}", quelle: "Quelle", abgerufen: "abgerufen", erledigt: "Erledigt", geklaert: "Mit Steuerberater geklärt",
    passt: "Passt nicht", frageMusik: "Hören Gäste Radio oder Musik?", frageSchwanger: "Ist eine Mitarbeiterin schwanger?", frageSchwangerKlein: "Nur für den Hinweis, ohne Namen.",
    frageElektro: "Letzte Prüfung der Elektrogeräte?", nie: "Noch nie", speichern: "Speichern", ja: "Ja", nein: "Nein",
    zekiGeld: "Im Büro wartet ein Hinweis, der dir Geld bringen kann.", zekiPflicht: "Im Büro wartet ein wichtiger Hinweis." },
  tr: { kopf: "Sana ne düşüyor", erledigtZahl: "Tamam: {n}", quelle: "Kaynak", abgerufen: "bakıldı", erledigt: "Tamam", geklaert: "Mali müşavirle konuşuldu",
    passt: "Uymuyor", frageMusik: "Müşteriler radyo veya müzik duyuyor mu?", frageSchwanger: "Hamile bir çalışan var mı?", frageSchwangerKlein: "Sadece hatırlatma için, isimsiz.",
    frageElektro: "Elektrikli aletler en son ne zaman kontrol edildi?", nie: "Hiç", speichern: "Kaydet", ja: "Evet", nein: "Hayır",
    zekiGeld: "Büroda sana para getirebilecek bir not var.", zekiPflicht: "Büroda önemli bir not var." },
  en: { kopf: "What you are owed", erledigtZahl: "Done: {n}", quelle: "Source", abgerufen: "retrieved", erledigt: "Done", geklaert: "Settled with tax advisor",
    passt: "Does not apply", frageMusik: "Do guests hear radio or music?", frageSchwanger: "Is an employee pregnant?", frageSchwangerKlein: "Only for the hint, no names.",
    frageElektro: "Last check of electrical devices?", nie: "Never", speichern: "Save", ja: "Yes", nein: "No",
    zekiGeld: "A hint in the office could bring you money.", zekiPflicht: "An important hint is waiting in the office." },
  ar: { kopf: "ما يحق لك", erledigtZahl: "تم: {n}", quelle: "المصدر", abgerufen: "تاريخ الاطلاع", erledigt: "تم", geklaert: "تم مع المستشار الضريبي",
    passt: "لا ينطبق", frageMusik: "هل يسمع الزبائن راديو أو موسيقى؟", frageSchwanger: "هل توجد موظفة حامل؟", frageSchwangerKlein: "للتنبيه فقط، بدون أسماء.",
    frageElektro: "آخر فحص للأجهزة الكهربائية؟", nie: "أبداً", speichern: "حفظ", ja: "نعم", nein: "لا",
    zekiGeld: "في المكتب تنبيه قد يجلب لك المال.", zekiPflicht: "في المكتب تنبيه مهم." },
};
export const hmUi = (sprache, key, werte = {}) => String((HM_UI[sprache] || HM_UI.de)[key] ?? HM_UI.de[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => werte[k] ?? "");

export const HM_TEXTE = {
  tr: {
    hm_u2: { titel: "Annelik izni: maaş geri", satz: "Annelik izni veya çalışma yasağında U2 kasası maaşın %100'ünü öder, her işletmede. Başvuru yap. Mali müşavirinle konuş." },
    hm_u1: { titel: "Hastalıkta maaş geri", satz: "Bir çalışan hasta olduysa U1 kasası ödenen maaşın çoğu zaman %80'ine kadarını geri öder. Başvuruyu sen yap. Mali müşavirinle konuş." },
    hm_vz: { titel: "Ön ödemeyi ayarla", satz: "Kârın düşerse vergi dairesi gelir vergisi ön ödemelerini ayarlayabilir. Sondaki vergi aynı kalır. Mali müşavirinle konuş." },
    hm_arbeitszeit: { titel: "Çalışma saatini yaz", satz: "Her vardiyanın başlangıcı, bitişi ve süresi en geç 7. günde yazılı olmalı. Uygulamada saatler eksik. Mali müşavirinle konuş." },
    hm_sofortmeldung: { titel: "İşe başlamadan bildir", satz: "Yeni çalışanlar, yardımcılar da, en geç ilk iş gününde bildirilmiş olmalı. Gastronomide bu zorunlu. Mali müşavirinle konuş." },
    hm_ausweis: { titel: "Kimlik notu yazılı", satz: "Yeni çalışanlara ilk günden önce kimliklerini yanlarında taşımaları gerektiğini yazılı söyle. Kanıtı sakla. Mali müşavirinle konuş." },
    hm_midijob: { titel: "Minijob sınırına yakın", satz: "Bir minijob maaşı aylık {grenze} € sınırına yakın. Üstünde primli midijob olur. Mali müşavirinle konuş." },
    hm_gema: { titel: "Müzik lisans ister", satz: "Müşteriler radyo veya müzik duyuyorsa önceden GEMA lisansı gerekir. Radyo-TV katkı payı bunun yerini tutmaz. Mali müşavirinle konuş." },
    hm_rundfunk: { titel: "Radyo-TV payını kontrol et", satz: "Sigortalı 9 çalışandan itibaren dükkan başına radyo-TV katkı payı artar. Minijob'cular ve sen sayılmazsınız. Mali müşavirinle konuş." },
    hm_lucid: { titel: "Ambalaj kaydı LUCID", satz: "Yemeği kutu, bardak veya poşetle veriyorsan önceden LUCID ambalaj kaydına girmelisin. Mali müşavirinle konuş." },
    hm_belehrung: { titel: "Hijyen eğitimini yenile", satz: "Gıdayla çalışan herkes iki yılda bir tekrar eğitim almalı. En az bir kişide süresi doluyor veya kayıt yok. Mali müşavirinle konuş." },
    hm_allergene: { titel: "Alerjenleri belirt", satz: "Açık satılan yemekte de 14 alerjen yemek başına yazılı olmalı veya listeyle ve tabelayla sözlü. Mali müşavirinle konuş." },
    hm_elektro: { titel: "Elektrikli aletleri kontrol ettir", satz: "Mikser, tost makinesi, kablo ve ocakları BGN'ye göre yaklaşık 6 ayda bir elektrikçi kontrol etmeli. Mali müşavirinle konuş." },
  },
  en: {
    hm_u2: { titel: "Maternity: wages back", satz: "During maternity leave or a work ban, the U2 fund refunds 100 % of wages, in every business. Apply. Check with your tax advisor." },
    hm_u1: { titel: "Sick pay back", satz: "If an employee was sick, the U1 fund usually refunds up to 80 % of the wages you kept paying. Apply yourself. Check with your tax advisor." },
    hm_vz: { titel: "Adjust prepayments", satz: "If your profit falls, the tax office can adjust your income tax prepayments. The final tax stays the same. Check with your tax advisor." },
    hm_arbeitszeit: { titel: "Record working hours", satz: "Start, end and length of every shift must be noted by day 7. Times are missing in the app. Check with your tax advisor." },
    hm_sofortmeldung: { titel: "Report before starting", satz: "New staff, helpers too, must be reported by their first working day. This applies to restaurants. Check with your tax advisor." },
    hm_ausweis: { titel: "ID notice in writing", satz: "Tell new staff in writing before day one that they must carry their ID. Keep the proof. Check with your tax advisor." },
    hm_midijob: { titel: "Near minijob limit", satz: "A minijob wage is close to the limit of {grenze} € a month. Above it becomes a midijob with contributions. Check with your tax advisor." },
    hm_gema: { titel: "Music needs licence", satz: "If guests hear radio or music, you need a GEMA licence first. The broadcasting fee does not replace it. Check with your tax advisor." },
    hm_rundfunk: { titel: "Check broadcasting fee", satz: "From 9 employees with social insurance, the broadcasting fee per shop goes up. Minijobbers and you do not count. Check with your tax advisor." },
    hm_lucid: { titel: "Packaging register LUCID", satz: "If you hand out food in boxes, cups or bags, you must register in the LUCID packaging register first. Check with your tax advisor." },
    hm_belehrung: { titel: "Renew hygiene briefing", satz: "Anyone handling food needs a follow-up briefing every two years. For at least one person it is due or missing. Check with your tax advisor." },
    hm_allergene: { titel: "State allergens", satz: "Even for loose food, the 14 allergens per dish must be written down or told with a list and sign. Check with your tax advisor." },
    hm_elektro: { titel: "Have devices checked", satz: "An electrician should check mixers, toasters, cables and hot plates, per BGN about every 6 months, yearly with few faults. Check with your tax advisor." },
  },
};
// Hinweis in Sprache: Titel und Satz übersetzt, Rest Deutsch. Platzhalter {grenze} aus dem deutschen Hinweis-Wert.
export function hmAnzeige(h, sprache, werte = {}) {
  const x = HM_TEXTE[sprache]?.[h.id]; if (!x) return h;
  return { ...h, titel: x.titel, satz: x.satz.replace(/\{(\w+)\}/g, (_, k) => werte[k] ?? "") };
}
