// Zekis Sätze (Kurswechsel 24.10.2026). Format genau wie Frankys Lieferung „GastroCash Zeki Sätze 27.10.2026“:
// id; ausloeser; art (hinweis | frage | aussage); bewegung (nicken | kopfschuetteln | zwinkern | grinsen | hand | keine); de; tr; en.
// Platzhalter in geschweiften Klammern: {betrag} {tage} {stelle} {gericht}. Höchstens 12 Wörter je Satz, A2, kein Steuer-Deutsch, kein leeres Lob.
// Stand 26.10.2026: 46 Sätze im umgangssprachlichen Ton (Baris Ja 26.10., 13:23). Herkunft: 32 Franky, 12 Zoro, 2 neu (zeki_u..).
export const ZEKI_AUSLOESER = ["kuehl_abweichung", "kuehl_offen", "umsatz_fehlt", "karte_leer", "preis_fehlt", "erster_muell", "muell_hoch", "ziel_erreicht", "tag_abgeschlossen", "inventur_faellig", "sicherung_alt", "hinweis_neu"];
export const ZEKI_ARTEN = ["hinweis", "frage", "aussage"];
export const ZEKI_BEWEGUNGEN = ["nicken", "kopfschuetteln", "zwinkern", "grinsen", "hand", "keine"];

export const ZEKI_SAETZE = [
  // Tonfall 26.10.2026 (Baris: umgangssprachlich, persönlich, nicht beleidigend; Anrede ab und zu „Chef“ / „usta“ / „boss“). Grundlage: Frankys 32 + Zoros 12, umgeschrieben von Zoro.
  { id: "zeki_002", ausloeser: "tag_abgeschlossen", art: "hinweis", bewegung: "nicken", de: "Feierabend, Chef. Schau morgen früh kurz auf den Müll.", tr: "Paydos usta. Yarın sabah çöpe bir göz at.", en: "Done for today, boss. Check the waste tomorrow morning." },
  { id: "zeki_003", ausloeser: "tag_abgeschlossen", art: "frage", bewegung: "zwinkern", de: "Alles sauber? Dann ab nach Hause, hast du dir verdient.", tr: "Her yer temiz mi? Hadi eve, hak ettin.", en: "All clean? Then go home, you earned it." },
  { id: "zeki_v09", ausloeser: "tag_abgeschlossen", art: "aussage", bewegung: "nicken", de: "Tag zu. Diesen Monat fehlen noch {betrag} bis null.", tr: "Gün kapandı. Bu ay sıfıra {betrag} kaldı.", en: "Day closed. {betrag} still to go this month to break even." },
  { id: "zeki_005", ausloeser: "ziel_erreicht", art: "aussage", bewegung: "grinsen", de: "Nullpunkt geschafft. Ab jetzt läuft's in deine Tasche.", tr: "Sıfırı geçtin usta. Artık kazanç senin cebine.", en: "Break-even done. From now on it goes in your pocket." },
  { id: "zeki_v08", ausloeser: "ziel_erreicht", art: "aussage", bewegung: "hand", de: "Ab heute arbeitest du diesen Monat für dich.", tr: "Bugünden sonra bu ay kendin için çalışıyorsun.", en: "From today you work for yourself this month." },
  { id: "zeki_011", ausloeser: "erster_muell", art: "hinweis", bewegung: "keine", de: "Jeder Eintrag zeigt dir, wo dein Geld hingeht.", tr: "Her kayıt paranın nereye gittiğini gösterir.", en: "Every entry shows you where your money goes." },
  { id: "zeki_012", ausloeser: "erster_muell", art: "frage", bewegung: "zwinkern", de: "Erster Müll drin. Musste das wirklich weg?", tr: "İlk çöp girildi. Gerçekten atılması mı lazımdı?", en: "First waste in. Did that really have to go?" },
  { id: "zeki_v06", ausloeser: "erster_muell", art: "aussage", bewegung: "zwinkern", de: "Erster Müll drin. In zwei Wochen weißt du, wo's hängt.", tr: "İlk çöp girildi. İki hafta sonra sorunu görürsün.", en: "First waste in. In two weeks you see the problem." },
  { id: "zeki_013", ausloeser: "muell_hoch", art: "hinweis", bewegung: "kopfschuetteln", de: "Heute {betrag} in der Tonne. Das ist mehr als sonst.", tr: "Bugün çöpe {betrag} gitti. Normalden fazla.", en: "{betrag} in the bin today. More than usual." },
  { id: "zeki_014", ausloeser: "muell_hoch", art: "frage", bewegung: "keine", de: "Warum fliegt heute so viel weg? Zu viel vorbereitet?", tr: "Bugün neden bu kadar çok atıldı? Fazla mı hazırladın?", en: "Why so much waste today? Prepared too much?" },
  { id: "zeki_015", ausloeser: "muell_hoch", art: "aussage", bewegung: "kopfschuetteln", de: "Das ist viel Müll für einen Tag, Chef.", tr: "Bir gün için çok çöp bu, usta.", en: "That is a lot of waste for one day, boss." },
  { id: "zeki_016", ausloeser: "muell_hoch", art: "hinweis", bewegung: "hand", de: "Sag's kurz deinem Team. Morgen wird's weniger.", tr: "Ekibine kısaca söyle. Yarın daha az olur.", en: "Tell your team quickly. Tomorrow it will be less." },
  { id: "zeki_v07", ausloeser: "muell_hoch", art: "frage", bewegung: "kopfschuetteln", de: "{betrag} weg heute. Morgen etwas weniger vorbereiten?", tr: "Bugün {betrag} gitti. Yarın biraz az mı hazırlasan?", en: "{betrag} gone today. Prepare a bit less tomorrow?" },
  { id: "zeki_017", ausloeser: "kuehl_abweichung", art: "hinweis", bewegung: "kopfschuetteln", de: "Chef, {stelle} ist zu warm. Tür zu, in zwei Stunden nochmal.", tr: "Usta, {stelle} çok sıcak. Kapağı kapat, iki saat sonra yine ölç.", en: "Boss, {stelle} is too warm. Close it, check again in two hours." },
  { id: "zeki_018", ausloeser: "kuehl_abweichung", art: "frage", bewegung: "keine", de: "{stelle} ist zu warm. Steht die Tür offen?", tr: "{stelle} çok sıcak. Kapı açık mı kaldı?", en: "{stelle} is too warm. Is the door open?" },
  { id: "zeki_019", ausloeser: "kuehl_abweichung", art: "hinweis", bewegung: "hand", de: "Bei {stelle} in zwei Stunden nochmal messen, nicht vergessen.", tr: "{stelle} için iki saat sonra yine ölç, unutma.", en: "Measure {stelle} again in two hours, don't forget." },
  { id: "zeki_020", ausloeser: "kuehl_abweichung", art: "aussage", bewegung: "kopfschuetteln", de: "Bleibt {stelle} so warm, kippt die Ware.", tr: "{stelle} böyle sıcak kalırsa mal bozulur.", en: "If {stelle} stays this warm, the food goes bad." },
  { id: "zeki_v01", ausloeser: "kuehl_abweichung", art: "hinweis", bewegung: "kopfschuetteln", de: "{stelle} ist zu warm. Ware umräumen, dann nochmal messen.", tr: "{stelle} çok sıcak. Malı başka yere al, sonra yine ölç.", en: "{stelle} is too warm. Move the food, then measure again." },
  { id: "zeki_021", ausloeser: "kuehl_offen", art: "hinweis", bewegung: "keine", de: "Kühlung ist heute noch offen. Kurz rum, zwei Minuten.", tr: "Soğutma bugün hâlâ açık. Kısa bir tur, iki dakika.", en: "Cooling is still open today. Quick round, two minutes." },
  { id: "zeki_022", ausloeser: "kuehl_offen", art: "frage", bewegung: "zwinkern", de: "Schon die Temperaturen gemessen heute?", tr: "Bugün dereceleri ölçtün mü?", en: "Measured the temperatures yet today?" },
  { id: "zeki_023", ausloeser: "kuehl_offen", art: "hinweis", bewegung: "hand", de: "Ein Rundgang fehlt noch. Machst du ihn jetzt?", tr: "Bir tur eksik. Şimdi yapar mısın?", en: "One round is missing. Will you do it now?" },
  { id: "zeki_v02", ausloeser: "kuehl_offen", art: "frage", bewegung: "keine", de: "Noch {tage} Kühlstellen offen. Kurz rum, dauert zwei Minuten.", tr: "{tage} soğutma yeri açık. Kısa bir tur, iki dakika.", en: "{tage} fridges still open. Quick round, two minutes." },
  { id: "zeki_v03", ausloeser: "umsatz_fehlt", art: "frage", bewegung: "keine", de: "Was hat die Kasse gestern gemacht? Tipp's kurz ein.", tr: "Kasa dün ne yaptı? Kısaca yaz.", en: "What did the till make yesterday? Type it in." },
  { id: "zeki_u01", ausloeser: "umsatz_fehlt", art: "hinweis", bewegung: "hand", de: "Ohne Kassenzahl von gestern rate ich nur. Trag sie ein.", tr: "Dünkü kasa olmadan sadece tahmin ederim. Yaz onu.", en: "Without yesterday's till number I only guess. Enter it." },
  { id: "zeki_u02", ausloeser: "umsatz_fehlt", art: "frage", bewegung: "zwinkern", de: "Chef, wie lief's gestern an der Kasse?", tr: "Usta, dün kasa nasıl geçti?", en: "Boss, how did the till do yesterday?" },
  { id: "zeki_024", ausloeser: "preis_fehlt", art: "frage", bewegung: "keine", de: "Was zahlst du für {gericht}? Sonst rechne ich ins Blaue.", tr: "{gericht} için ne ödüyorsun? Yoksa havadan hesaplarım.", en: "What do you pay for {gericht}? Otherwise I'm guessing." },
  { id: "zeki_025", ausloeser: "preis_fehlt", art: "frage", bewegung: "kopfschuetteln", de: "Was bleibt dir bei {gericht}? Ohne Einkaufspreis weiß ich's nicht.", tr: "{gericht} sana ne bırakıyor? Alış fiyatı olmadan bilemem.", en: "What does {gericht} leave you? I need the buying price." },
  { id: "zeki_026", ausloeser: "preis_fehlt", art: "aussage", bewegung: "hand", de: "Gib mir den Einkaufspreis, dann sag ich dir, was bleibt.", tr: "Alış fiyatını ver, ne kaldığını söyleyeyim.", en: "Give me the buying price and I tell you what's left." },
  { id: "zeki_027", ausloeser: "preis_fehlt", art: "hinweis", bewegung: "nicken", de: "Bei {gericht} fehlt noch der Preis. Kurz eintragen?", tr: "{gericht} için fiyat eksik. Hemen yazar mısın?", en: "{gericht} still has no price. Enter it quickly?" },
  { id: "zeki_v05", ausloeser: "preis_fehlt", art: "frage", bewegung: "keine", de: "Was kostet dich {gericht} im Einkauf, Chef?", tr: "{gericht} sana alışta kaça geliyor, usta?", en: "What does {gericht} cost you to buy, boss?" },
  { id: "zeki_028", ausloeser: "karte_leer", art: "aussage", bewegung: "keine", de: "Deine Karte ist noch leer. Was verkaufst du?", tr: "Menün daha boş. Ne satıyorsun?", en: "Your menu is still empty. What do you sell?" },
  { id: "zeki_029", ausloeser: "karte_leer", art: "hinweis", bewegung: "hand", de: "Fang mit deinem Bestseller an. Eins reicht für den Anfang.", tr: "En çok satanla başla. Başlangıç için biri yeter.", en: "Start with your best seller. One is enough to begin." },
  { id: "zeki_030", ausloeser: "karte_leer", art: "frage", bewegung: "zwinkern", de: "Was verkaufst du? Zeig mal deine Karte.", tr: "Ne satıyorsun? Menünü bir göster.", en: "What do you sell? Show me your menu." },
  { id: "zeki_v04", ausloeser: "karte_leer", art: "hinweis", bewegung: "hand", de: "Leg deine Karte an. Dann sehe ich, was jedes Gericht bringt.", tr: "Menünü kur. O zaman her yemeğin ne bıraktığını görürüm.", en: "Set up your menu. Then I see what each dish brings." },
  { id: "zeki_031", ausloeser: "inventur_faellig", art: "hinweis", bewegung: "keine", de: "Zeit zum Zählen, Chef. Lager einmal durchgehen.", tr: "Sayım zamanı usta. Depoyu bir kez dolaş.", en: "Time to count, boss. Go through the stock once." },
  { id: "zeki_032", ausloeser: "inventur_faellig", art: "aussage", bewegung: "hand", de: "Wer zählt, sieht, was wirklich fehlt und was rumliegt.", tr: "Sayan, neyin eksik ve neyin fazla olduğunu görür.", en: "Counting shows what's missing and what's just lying around." },
  { id: "zeki_033", ausloeser: "inventur_faellig", art: "frage", bewegung: "keine", de: "Wann hast du das Lager zuletzt gezählt?", tr: "Depoyu en son ne zaman saydın?", en: "When did you last count your stock?" },
  { id: "zeki_v10", ausloeser: "inventur_faellig", art: "hinweis", bewegung: "keine", de: "Letzte Inventur vor {tage} Tagen. Zeit, mal wieder zu zählen.", tr: "Son sayım {tage} gün önce. Yine sayma zamanı.", en: "Last count {tage} days ago. Time to count again." },
  { id: "zeki_034", ausloeser: "hinweis_neu", art: "aussage", bewegung: "nicken", de: "Ich hab was Neues für dich im Büro.", tr: "Büroda senin için yeni bir şey var.", en: "I have something new for you in the office." },
  { id: "zeki_035", ausloeser: "hinweis_neu", art: "hinweis", bewegung: "hand", de: "Schau mal ins Büro, da kann Geld drinstecken.", tr: "Büroya bir bak, orada para olabilir.", en: "Check the office, there might be money in it." },
  { id: "zeki_036", ausloeser: "hinweis_neu", art: "frage", bewegung: "zwinkern", de: "Hast du nach der Schicht eine Minute für einen Tipp?", tr: "Vardiyadan sonra bir ipucu için bir dakikan var mı?", en: "Got a minute after your shift for a tip?" },
  { id: "zeki_v12", ausloeser: "hinweis_neu", art: "hinweis", bewegung: "zwinkern", de: "Im Büro liegt ein neuer Hinweis für dich.", tr: "Büroda senin için yeni bir ipucu var.", en: "There is a new tip for you in the office." },
  { id: "zeki_038", ausloeser: "sicherung_alt", art: "hinweis", bewegung: "kopfschuetteln", de: "Deine letzte Sicherung ist {tage} Tage alt. Mach mal neu.", tr: "Son yedeğin {tage} günlük. Yenisini al.", en: "Your last backup is {tage} days old. Make a new one." },
  { id: "zeki_039", ausloeser: "sicherung_alt", art: "frage", bewegung: "keine", de: "Kurz sichern? Dauert eine Minute.", tr: "Hemen yedek alalım mı? Bir dakika sürer.", en: "Quick backup? Takes one minute." },
  { id: "zeki_040", ausloeser: "sicherung_alt", art: "aussage", bewegung: "hand", de: "Sichern, bevor das Handy mal runterfällt.", tr: "Telefon bir gün düşmeden önce yedek al.", en: "Back up before your phone ever drops." },
  { id: "zeki_v11", ausloeser: "sicherung_alt", art: "hinweis", bewegung: "keine", de: "Seit {tage} Tagen nicht gesichert. Handy weg, alles weg.", tr: "{tage} gündür yedek yok. Telefon giderse her şey gider.", en: "No backup for {tage} days. Phone gone, everything gone." },
];

// Aussortiert aus Frankys Lieferung (Zoro 24.10.2026):
export const ZEKI_RAUS = {
  "zeki_001": "behauptet „Kasse stimmt, Belege da“ – prüft die App nicht",
  "zeki_004": "„Ziel für heute“ falsch, Ziel ist Monat bis null",
  "zeki_006": "Lob ohne Inhalt",
  "zeki_010": "sagt nichts Neues",
  "zeki_037": "Lob ohne Inhalt",
  "zeki_007": "umsatz_fehlt heißt: Kassenzahl von gestern fehlt, kein Betrag",
  "zeki_008": "wie 007",
  "zeki_009": "wie 007"
};
