// Zekis Sätze (Kurswechsel 24.10.2026). Format genau wie Frankys Lieferung „GastroCash Zeki Sätze 27.10.2026“:
// id; ausloeser; art (hinweis | frage | aussage); bewegung (nicken | kopfschuetteln | zwinkern | grinsen | hand | keine); de; tr; en.
// Platzhalter in geschweiften Klammern: {betrag} {tage} {stelle} {gericht}. Höchstens 12 Wörter je Satz, A2, kein Steuer-Deutsch, kein leeres Lob.
// VORLÄUFIG: je Auslöser ein Satz von Zoro, bis Frankys 40 Sätze eingetragen sind (dann ersetzt diese Liste, Format bleibt).
export const ZEKI_AUSLOESER = ["kuehl_abweichung", "kuehl_offen", "umsatz_fehlt", "karte_leer", "preis_fehlt", "erster_muell", "muell_hoch", "ziel_erreicht", "tag_abgeschlossen", "inventur_faellig", "sicherung_alt", "hinweis_neu"];
export const ZEKI_ARTEN = ["hinweis", "frage", "aussage"];
export const ZEKI_BEWEGUNGEN = ["nicken", "kopfschuetteln", "zwinkern", "grinsen", "hand", "keine"];

export const ZEKI_SAETZE = [
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
