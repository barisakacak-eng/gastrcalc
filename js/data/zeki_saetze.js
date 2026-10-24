// Zekis Sätze (Kurswechsel 24.10.2026). Format genau wie Frankys Lieferung „GastroCash Zeki Sätze 27.10.2026“:
// id; ausloeser; art (hinweis | frage | aussage); bewegung (nicken | kopfschuetteln | zwinkern | grinsen | hand | keine); de; tr; en.
// Platzhalter in geschweiften Klammern: {betrag} {tage} {stelle} {gericht}. Höchstens 12 Wörter je Satz, A2, kein Steuer-Deutsch, kein leeres Lob.
// Stand 24.10.2026: 32 Sätze von Franky (40 geliefert, 8 von Zoro aussortiert – Gründe in raus unten) + 12 Sätze von Zoro (zeki_v..).
export const ZEKI_AUSLOESER = ["kuehl_abweichung", "kuehl_offen", "umsatz_fehlt", "karte_leer", "preis_fehlt", "erster_muell", "muell_hoch", "ziel_erreicht", "tag_abgeschlossen", "inventur_faellig", "sicherung_alt", "hinweis_neu"];
export const ZEKI_ARTEN = ["hinweis", "frage", "aussage"];
export const ZEKI_BEWEGUNGEN = ["nicken", "kopfschuetteln", "zwinkern", "grinsen", "hand", "keine"];

export const ZEKI_SAETZE = [
  // Franky 24.10.2026
  { id: "zeki_002", ausloeser: "tag_abgeschlossen", art: "hinweis", bewegung: "keine", de: "Dein Tag ist fertig. Denk an den Müll.", tr: "Gün bitti. Çöpü unutma.", en: "Your day is done. Remember the trash." },
  { id: "zeki_003", ausloeser: "tag_abgeschlossen", art: "frage", bewegung: "zwinkern", de: "Alles sauber? Dann ab nach Hause.", tr: "Her yer temiz mi? O zaman eve git.", en: "Everything clean? Time to go home." },
  { id: "zeki_005", ausloeser: "ziel_erreicht", art: "aussage", bewegung: "grinsen", de: "Ab jetzt verdienst du für dich.", tr: "Şu andan itibaren kendin için kazanıyorsun.", en: "From now on you earn for yourself." },
  { id: "zeki_011", ausloeser: "erster_muell", art: "hinweis", bewegung: "keine", de: "Wir werfen Geld weg. Pass auf.", tr: "Parayı çöpe atıyoruz. Dikkat et.", en: "We are throwing money away. Watch out." },
  { id: "zeki_012", ausloeser: "erster_muell", art: "frage", bewegung: "zwinkern", de: "Muss das wirklich in den Müll?", tr: "Bunun gerçekten çöpe gitmesi mi lazım?", en: "Does this really need to be binned?" },
  { id: "zeki_013", ausloeser: "muell_hoch", art: "hinweis", bewegung: "kopfschuetteln", de: "Der Müll kostet dich heute {betrag}.", tr: "Çöp bugün sana {betrag} mal oldu.", en: "Trash costs you {betrag} today." },
  { id: "zeki_014", ausloeser: "muell_hoch", art: "frage", bewegung: "keine", de: "Warum werfen wir so viel weg?", tr: "Neden bu kadar çok atıyoruz?", en: "Why are we throwing away so much?" },
  { id: "zeki_015", ausloeser: "muell_hoch", art: "aussage", bewegung: "kopfschuetteln", de: "Das ist viel Müll für einen Tag.", tr: "Bir gün için çok fazla çöp.", en: "That is a lot of trash for one day." },
  { id: "zeki_016", ausloeser: "muell_hoch", art: "hinweis", bewegung: "hand", de: "Sprich mit deinem Team über den Müll.", tr: "Ekibinle çöp hakkında konuş.", en: "Talk to your team about the trash." },
  { id: "zeki_017", ausloeser: "kuehl_abweichung", art: "hinweis", bewegung: "kopfschuetteln", de: "{stelle} ist zu warm. Prüfe die Tür.", tr: "{stelle} çok sıcak. Kapıyı kontrol et.", en: "{stelle} is too warm. Check the door." },
  { id: "zeki_018", ausloeser: "kuehl_abweichung", art: "frage", bewegung: "keine", de: "Ist {stelle} kaputt? Die Temperatur ist falsch.", tr: "{stelle} bozuk mu? Derece yanlış.", en: "Is {stelle} broken? The temperature is wrong." },
  { id: "zeki_019", ausloeser: "kuehl_abweichung", art: "hinweis", bewegung: "hand", de: "In 2 Stunden bei {stelle} nochmal messen.", tr: "2 saat sonra {stelle} tekrar ölç.", en: "Measure {stelle} again in 2 hours." },
  { id: "zeki_020", ausloeser: "kuehl_abweichung", art: "aussage", bewegung: "kopfschuetteln", de: "Wenn das so bleibt, wird die Ware schlecht.", tr: "Böyle kalırsa ürün bozulur.", en: "If it stays like this, food goes bad." },
  { id: "zeki_021", ausloeser: "kuehl_offen", art: "hinweis", bewegung: "keine", de: "Du musst heute noch die Kühlung messen.", tr: "Bugün dolapları ölçmen lazım.", en: "You still need to measure cooling today." },
  { id: "zeki_022", ausloeser: "kuehl_offen", art: "frage", bewegung: "zwinkern", de: "Hast du die Temperatur schon geprüft?", tr: "Dereceye baktın mı?", en: "Did you check the temperature yet?" },
  { id: "zeki_023", ausloeser: "kuehl_offen", art: "aussage", bewegung: "hand", de: "Ein Rundgang fehlt noch. Mach das jetzt.", tr: "Bir tur eksik. Şimdi yap.", en: "One round missing. Do it now." },
  { id: "zeki_024", ausloeser: "preis_fehlt", art: "hinweis", bewegung: "keine", de: "Was kostet {gericht} im Einkauf? Trag das ein.", tr: "{gericht} alışı ne kadar? Bunu yaz.", en: "What does {gericht} cost to buy? Enter it." },
  { id: "zeki_025", ausloeser: "preis_fehlt", art: "frage", bewegung: "kopfschuetteln", de: "Wie viel bleibt bei {gericht} übrig?", tr: "{gericht} satınca ne kadar kalıyor?", en: "How much is left from {gericht}?" },
  { id: "zeki_026", ausloeser: "preis_fehlt", art: "aussage", bewegung: "hand", de: "Ohne Einkaufspreis weiß ich nicht, was dir bleibt.", tr: "Alış fiyatı yoksa sana ne kalır bilemem.", en: "Without buying price I do not know what you keep." },
  { id: "zeki_027", ausloeser: "preis_fehlt", art: "hinweis", bewegung: "nicken", de: "Bitte gib den Preis für {gericht} an.", tr: "Lütfen {gericht} için fiyat gir.", en: "Please enter the price for {gericht}." },
  { id: "zeki_028", ausloeser: "karte_leer", art: "aussage", bewegung: "keine", de: "Deine Karte hat noch keine Gerichte.", tr: "Menünde henüz yemek yok.", en: "Your menu has no dishes yet." },
  { id: "zeki_029", ausloeser: "karte_leer", art: "hinweis", bewegung: "hand", de: "Füge jetzt dein erstes Gericht hinzu.", tr: "Şimdi ilk yemeğini ekle.", en: "Add your first dish now." },
  { id: "zeki_030", ausloeser: "karte_leer", art: "frage", bewegung: "zwinkern", de: "Was verkaufst du? Zeig es mir.", tr: "Ne satıyorsun? Bana göster.", en: "What are you selling? Show me." },
  { id: "zeki_031", ausloeser: "inventur_faellig", art: "hinweis", bewegung: "keine", de: "Es ist Zeit zum Zählen. Mach Inventur.", tr: "Sayım zamanı geldi. Sayım yap.", en: "It is time to count. Do inventory." },
  { id: "zeki_032", ausloeser: "inventur_faellig", art: "aussage", bewegung: "kopfschuetteln", de: "Bei der Inventur frag deinen Steuerberater.", tr: "Sayım için mali müşavirine sor.", en: "Ask your tax advisor about inventory." },
  { id: "zeki_033", ausloeser: "inventur_faellig", art: "frage", bewegung: "hand", de: "Hast du alle Vorräte genau gezählt?", tr: "Tüm stoğu tam saydın mı?", en: "Did you count all supplies exactly?" },
  { id: "zeki_034", ausloeser: "hinweis_neu", art: "aussage", bewegung: "nicken", de: "Ich habe einen neuen Tipp für dich.", tr: "Senin için yeni bir ipucum var.", en: "I have a new tip for you." },
  { id: "zeki_035", ausloeser: "hinweis_neu", art: "hinweis", bewegung: "hand", de: "Schau dir das an. Es ist wichtig.", tr: "Buna bak. Bu önemli.", en: "Look at this. It is important." },
  { id: "zeki_036", ausloeser: "hinweis_neu", art: "frage", bewegung: "zwinkern", de: "Hast du eine Minute für eine Idee?", tr: "Bir fikir için bir dakikan var mı?", en: "Do you have a minute for an idea?" },
  { id: "zeki_038", ausloeser: "sicherung_alt", art: "hinweis", bewegung: "kopfschuetteln", de: "Deine letzte Sicherung ist {tage} Tage alt.", tr: "Son yedeğin {tage} günlük.", en: "Your last backup is {tage} days old." },
  { id: "zeki_039", ausloeser: "sicherung_alt", art: "frage", bewegung: "keine", de: "Willst du deine Daten jetzt sicher speichern?", tr: "Verilerini şimdi güvenle kaydetmek ister misin?", en: "Do you want to safely store your data now?" },
  { id: "zeki_040", ausloeser: "sicherung_alt", art: "aussage", bewegung: "hand", de: "Speichere jetzt, damit nichts verloren geht.", tr: "Şimdi kaydet ki hiçbir şey kaybolmasın.", en: "Save now so nothing gets lost." },
  // Zoro
  { id: "zeki_v01", ausloeser: "kuehl_abweichung", art: "hinweis", bewegung: "kopfschuetteln", de: "{stelle} ist zu warm. Tür zu, in 2 Stunden nochmal messen.", tr: "{stelle} çok sıcak. Kapıyı kapat, 2 saat sonra tekrar ölç.", en: "{stelle} is too warm. Close it, measure again in 2 hours." },
  { id: "zeki_v02", ausloeser: "kuehl_offen", art: "frage", bewegung: "keine", de: "Noch {tage} Kühlstellen ohne Messung. Machst du den Rundgang?", tr: "{tage} soğutma yeri ölçülmedi. Turu yapar mısın?", en: "{tage} fridges not measured yet. Will you do the round?" },
  { id: "zeki_v03", ausloeser: "umsatz_fehlt", art: "frage", bewegung: "keine", de: "Was hat die Kasse gestern gesagt? Dann stimmt deine Zahl.", tr: "Kasa dün ne gösterdi? O zaman rakamın doğru olur.", en: "What did the till say yesterday? Then your number is right." },
  { id: "zeki_v04", ausloeser: "karte_leer", art: "hinweis", bewegung: "hand", de: "Leg deine Karte an. Dann sehe ich, was jedes Gericht bringt.", tr: "Menünü kur. O zaman her yemeğin ne bıraktığını görürüm.", en: "Set up your menu. Then I see what each dish earns." },
  { id: "zeki_v05", ausloeser: "preis_fehlt", art: "frage", bewegung: "keine", de: "Was kostet {gericht} bei dir? Ohne Preis rechne ich blind.", tr: "{gericht} sende kaç para? Fiyatsız kör hesaplarım.", en: "What does {gericht} cost at your shop? Without a price I guess." },
  { id: "zeki_v06", ausloeser: "erster_muell", art: "aussage", bewegung: "zwinkern", de: "Erster Müll notiert. Nach 14 Tagen siehst du, wo Geld verschwindet.", tr: "İlk çöp yazıldı. 14 gün sonra paranın nereye gittiğini görürsün.", en: "First waste noted. After 14 days you see where money goes." },
  { id: "zeki_v07", ausloeser: "muell_hoch", art: "hinweis", bewegung: "kopfschuetteln", de: "Heute {betrag} im Müll, mehr als sonst. Morgen weniger vorbereiten?", tr: "Bugün çöpte {betrag}, normalden fazla. Yarın daha az hazırla?", en: "{betrag} wasted today, more than usual. Prepare less tomorrow?" },
  { id: "zeki_v08", ausloeser: "ziel_erreicht", art: "aussage", bewegung: "hand", de: "Ab heute arbeitest du diesen Monat für dich.", tr: "Bugünden itibaren bu ay kendin için çalışıyorsun.", en: "From today, you work for yourself this month." },
  { id: "zeki_v09", ausloeser: "tag_abgeschlossen", art: "aussage", bewegung: "nicken", de: "Tag zu. Bis null fehlen noch {betrag} in diesem Monat.", tr: "Gün kapandı. Bu ay sıfıra {betrag} kaldı.", en: "Day closed. {betrag} still missing to break even this month." },
  { id: "zeki_v10", ausloeser: "inventur_faellig", art: "hinweis", bewegung: "keine", de: "Letzte Inventur vor {tage} Tagen. Zählen zeigt, was wirklich fehlt.", tr: "Son sayım {tage} gün önce. Saymak neyin eksik olduğunu gösterir.", en: "Last stock count {tage} days ago. Counting shows what is missing." },
  { id: "zeki_v11", ausloeser: "sicherung_alt", art: "hinweis", bewegung: "keine", de: "Letzte Sicherung vor {tage} Tagen. Handy weg, Daten weg.", tr: "Son yedek {tage} gün önce. Telefon giderse veriler de gider.", en: "Last backup {tage} days ago. Phone gone, data gone." },
  { id: "zeki_v12", ausloeser: "hinweis_neu", art: "hinweis", bewegung: "zwinkern", de: "Im Büro liegt ein neuer Hinweis für dich.", tr: "Büroda senin için yeni bir ipucu var.", en: "There is a new tip for you in the office." },
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
