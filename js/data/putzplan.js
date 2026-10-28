// Empfohlener Putzplan nach HACCP-Grundsätzen (Recherche 15.10.2026, 26 Quellen: VO (EG) 852/2004, Merkblätter der
// Lebensmittelüberwachung Dortmund, Freising, Mainz, Köln, Münster, Dresden, Bielefeld, Osnabrück, Kelheim, Bremen, Jena; VDI 2052 Blatt 2).
// Wichtig und ehrlich: Reinigen ist Pflicht, feste Abstände stehen in keinem Gesetz („so häufig, dass kein Risiko entsteht“).
// Die Abstände unten sind Empfehlungen der Behörden-Merkblätter (empfehlung) oder Branchenpraxis/Hersteller (praxis).
// pflicht = Reinigen ist Gesetzespflicht und Behörden erwarten einen Nachweis (Abstand bleibt Empfehlung).
// gilt: Geräte-Tag oder "alle". takt: nach | tag | woche | monat | quartal | jahr | zweijahre. „nach“ = Hinweis, kein Haken.
// Quellen-Kürzel Q1–Q26 wie in claude/GastroCalc HACCP Reinigung Recherche 15.10.md im Projekt.

export const TAKT_TAGE = { tag: 1, woche: 7, monat: 30, quartal: 91, jahr: 365, zweijahre: 730 };

export const GERAETE = ["grill_spiess", "fritteuse", "pizzaofen", "saladette", "kuehlschrank", "tiefkuehler", "abzug", "schneidemaschine", "eismaschine", "kaffeemaschine", "wc_gaeste", "lager", "muell"];

// Vorschlag je Laden-Art (der Wirt schaltet frei um)
export const GERAETE_JE_ART = {
  doener: ["grill_spiess", "fritteuse", "saladette", "kuehlschrank", "tiefkuehler", "abzug", "lager", "muell"],
  pizza: ["pizzaofen", "fritteuse", "saladette", "kuehlschrank", "tiefkuehler", "abzug", "lager", "muell"],
  imbiss: ["fritteuse", "kuehlschrank", "tiefkuehler", "abzug", "lager", "muell"],
  asia: ["kuehlschrank", "tiefkuehler", "abzug", "lager", "muell"],
  foodtruck: ["fritteuse", "kuehlschrank", "tiefkuehler", "abzug", "muell"],
  cafe: ["kaffeemaschine", "kuehlschrank", "lager", "muell"],
  baeckerei: ["kaffeemaschine", "kuehlschrank", "tiefkuehler", "lager", "muell"],
  kiosk: ["fritteuse", "kuehlschrank", "tiefkuehler", "lager", "muell"],
  anders: ["kuehlschrank", "lager", "muell"],
};

// [id, takt, stufe, gilt, quellen, de, tr, en, warum de, warum tr, warum en]  (Paket 6, 17.10.2026: Begründungen dreisprachig)
const R = [
  ["R01", "tag", "pflicht", "alle", "Q2,Q4,Q10", "Arbeitsflächen putzen und desinfizieren", "Tezgâhları temizle ve dezenfekte et", "Clean and disinfect work surfaces", "Hauptkontaktfläche für Lebensmittel", "Yiyeceklerin en çok değdiği yüzey", "Main surface that touches food"],
  ["R02", "nach", "pflicht", "alle", "Q9,Q10", "Fläche desinfizieren nach rohem Fleisch oder Geflügel", "Çiğ et veya tavuktan sonra yüzeyi dezenfekte et", "Disinfect the surface after raw meat or poultry", "Keime nicht auf Salat und Brot übertragen", "Mikropları salataya ve ekmeğe taşıma", "Don't carry germs to salad and bread"],
  ["R03", "nach", "pflicht", "alle", "Q2,Q10", "Schneidbretter und Messer in die Spülmaschine", "Kesme tahtaları ve bıçakları bulaşık makinesine", "Cutting boards and knives into the dishwasher", "Bretter sind Keimträger Nummer 1", "Kesme tahtaları bir numaralı mikrop taşıyıcısı", "Boards are germ carrier number 1"],
  ["R04", "tag", "pflicht", "alle", "Q4,Q10", "Boden und Bodenablauf wischen", "Zemini ve gideri sil", "Mop the floor and floor drain", "Fett und Reste ziehen Schädlinge an", "Yağ ve artıklar haşereleri çeker", "Grease and leftovers attract pests"],
  ["R05", "tag", "pflicht", "alle", "Q3,Q15", "Handwaschbecken putzen, Seife und Papier auffüllen", "Lavaboyu temizle, sabun ve kâğıt doldur", "Clean hand basin, refill soap and paper", "Der Handwaschplatz muss immer bereit sein", "El yıkama yeri her zaman hazır olmalı", "The hand-wash station must always be ready"],
  ["R06", "woche", "empfehlung", "alle", "Q10", "Griffe, Schalter, Armaturen desinfizieren", "Kulpları, düğmeleri, muslukları dezenfekte et", "Disinfect handles, switches, taps", "Viele Hände, viele Keime", "Çok el, çok mikrop", "Many hands, many germs"],
  ["R07", "nach", "praxis", "grill_spiess", "Q10", "Dönermesser reinigen", "Döner bıçağını temizle", "Clean the döner knife", "Das Messer berührt Rohes und Gegartes", "Bıçak hem çiğ hem pişmiş kısma değer", "The knife touches raw and cooked meat"],
  ["R08", "tag", "praxis", "grill_spiess", "Q10,Q15", "Grill: Auffangschale leeren, Rückwand und Halter putzen", "Izgara: damlama tepsisini boşalt, arka duvarı ve tutucuyu temizle", "Grill: empty drip tray, clean back wall and holder", "Fett brennt ein: Brand- und Keimrisiko", "Yağ yanıp yapışır: yangın ve mikrop riski", "Grease burns on: fire and germ risk"],
  ["R09", "tag", "pflicht", "grill_spiess", "Q15", "Restspieß am Abend entsorgen oder ganz durchbraten", "Akşam kalan döneri at ya da tamamen pişir", "Discard leftover spit in the evening or cook it through", "Wiedereinfrieren ist verboten", "Tekrar dondurmak yasak", "Refreezing is not allowed"],
  ["R10", "woche", "praxis", "grill_spiess", "Q10", "Grill gründlich mit Fettlöser", "Izgarayı yağ çözücüyle iyice temizle", "Deep-clean the grill with degreaser", "Gargeräte mindestens wöchentlich gründlich", "Pişirme cihazları en az haftada bir iyice", "Cooking equipment thoroughly at least weekly"],
  ["R11", "tag", "empfehlung", "fritteuse", "Q12,Q13", "Frittieröl abfiltern und prüfen: Rauch, Geruch, zäh? Dann wechseln", "Kızartma yağını süz ve kontrol et: duman, koku, koyu mu? O zaman değiştir", "Filter and check frying oil: smoke, smell, thick? Then change it", "Verdorbenes Öl darf nicht verwendet werden", "Bozulmuş yağ kullanılamaz", "Spoiled oil must not be used"],
  ["R13", "woche", "praxis", "fritteuse", "Q12,Q13", "Fritteuse leeren, Becken und Heizschlangen reinigen", "Fritözü boşalt, hazneyi ve rezistansı temizle", "Empty fryer, clean basin and heating coils", "Beim Ölwechsel, spätestens wöchentlich", "Yağ değişiminde, en geç haftada bir", "At every oil change, at least weekly"],
  ["R14", "tag", "praxis", "pizzaofen", "Hersteller", "Pizzaofen: Stein abbürsten, außen putzen", "Pizza fırını: taşı fırçala, dışını temizle", "Pizza oven: brush the stone, clean outside", "Verbrannte Reste und Mehl entfernen", "Yanmış artıkları ve unu temizle", "Remove burnt bits and flour"],
  ["R15", "tag", "empfehlung", "abzug", "Q18,Q19", "Fettfilter der Abzugshaube ansehen: Fettfilm?", "Davlumbaz yağ filtresine bak: yağ tabakası var mı?", "Check hood grease filters: grease film?", "VDI 2052: Sichtprüfung täglich, Brandschutz", "VDI 2052: her gün göz kontrolü, yangın güvenliği", "VDI 2052: daily visual check, fire safety"],
  ["R16", "woche", "empfehlung", "abzug", "Q4,Q10,Q18", "Fettfilter in Spülmaschine oder Fettlöser", "Yağ filtrelerini bulaşık makinesine veya yağ çözücüye", "Grease filters into dishwasher or degreaser", "Fett im Filter ist Brandgefahr", "Filtredeki yağ yangın tehlikesi", "Grease in the filter is a fire hazard"],
  ["R17", "woche", "empfehlung", "abzug", "Q10", "Haube und Fettrinne innen putzen", "Davlumbazı ve yağ oluğunu içten temizle", "Clean hood and grease channel inside", "Sonst tropft Fett auf Speisen", "Yoksa yağ yemeklerin üstüne damlar", "Otherwise grease drips onto food"],
  ["R18", "jahr", "empfehlung", "abzug", "Q18,Q19", "Abluftkanal von Fachfirma reinigen lassen", "Havalandırma kanalını uzman firmaya temizlet", "Have the exhaust duct cleaned by a specialist", "Brandschutz und Versicherung; Abstand laut Fachfirma", "Yangın güvenliği ve sigorta; aralığı uzman firma söyler", "Fire safety and insurance; interval as the specialist says"],
  ["R19", "tag", "praxis", "saladette", "Q2", "Saladette: Behälter tauschen und spülen", "Saladet: kapları değiştir ve yıka", "Saladette: swap and wash containers", "Offene Zutaten, kurze Standzeit", "Açık malzeme, kısa bekleme süresi", "Open ingredients, short holding time"],
  ["R20", "woche", "praxis", "saladette", "Q4,Q10", "Saladette und Kühltheke innen, Dichtungen", "Saladet ve soğuk tezgâh içi, contalar", "Saladette and cold counter inside, seals", "Dichtungen schimmeln schnell", "Contalar çabuk küflenir", "Seals go mouldy quickly"],
  ["R21", "woche", "praxis", "kuehlschrank", "Q4,Q10", "Kühlschrank innen, Dichtungen, Griffe", "Buzdolabı içi, contalar, kulplar", "Fridge inside, seals, handles", "Ausgelaufene Reste verkeimen", "Dökülen artıklarda mikrop ürer", "Spilled leftovers grow germs"],
  ["R22", "monat", "empfehlung", "kuehlschrank", "Q4", "Kühlschrank leeren, Verdampfer und Abfluss reinigen", "Buzdolabını boşalt, evaporatörü ve gideri temizle", "Empty fridge, clean evaporator and drain", "Merkblatt Freising: Verdampfer monatlich", "Freising bilgi notu: evaporatör ayda bir", "Freising guidance sheet: evaporator monthly"],
  ["R23", "quartal", "empfehlung", "tiefkuehler", "Q4,Q9", "Tiefkühler abtauen und reinigen", "Derin dondurucunun buzunu çöz ve temizle", "Defrost and clean the freezer", "Merkblatt Köln: vierteljährlich", "Köln bilgi notu: üç ayda bir", "Cologne guidance sheet: every three months"],
  ["R24", "nach", "pflicht", "schneidemaschine", "Q2,Q5,Q10", "Schneidemaschine zerlegen und reinigen", "Dilimleme makinesini sök ve temizle", "Take apart and clean the slicer", "Messer und Schlitten sind ein Keimnest", "Bıçak ve kızak mikrop yuvası", "Blade and carriage are a germ nest"],
  ["R25", "monat", "empfehlung", "eismaschine", "Q14", "Eismaschine reinigen und desinfizieren (nach Hersteller)", "Buz makinesini temizle ve dezenfekte et (üreticiye göre)", "Clean and disinfect the ice machine (per manufacturer)", "„Regelmäßig nach Plan“", "„Plana göre düzenli olarak“", "“Regularly, according to plan”"],
  ["R27", "jahr", "empfehlung", "eismaschine", "Q14", "Eisprobe ins Labor", "Buz numunesini laboratuvara gönder", "Send an ice sample to the lab", "Empfehlung Bremen: einmal im Jahr", "Bremen tavsiyesi: yılda bir kez", "Bremen recommendation: once a year"],
  ["R28", "tag", "praxis", "kaffeemaschine", "Hersteller", "Kaffee: Siebträger, Brühgruppe, Milchlanze reinigen", "Kahve: portafiltre, demleme ünitesi, süt çubuğunu temizle", "Coffee: clean portafilter, group head, steam wand", "Milchreste verkeimen schnell", "Süt artıklarında mikrop çabuk ürer", "Milk residue grows germs fast"],
  ["R29", "monat", "praxis", "kaffeemaschine", "Hersteller", "Kaffeemaschine entkalken", "Kahve makinesinin kirecini al", "Descale the coffee machine", "Abstand nach Hersteller und Wasserhärte", "Aralık üreticiye ve suyun sertliğine göre", "Interval per manufacturer and water hardness"],
  ["R30", "tag", "pflicht", "wc_gaeste", "Q3,Q9", "Gäste-WC putzen, Seife und Papier auffüllen, Müll leeren", "Misafir tuvaletini temizle, sabun ve kâğıt doldur, çöpü boşalt", "Clean guest toilet, refill soap and paper, empty bin", "Merkblatt Köln: täglich mit Liste", "Köln bilgi notu: her gün, listeyle", "Cologne guidance sheet: daily, with a list"],
  ["R31", "woche", "empfehlung", "wc_gaeste", "Q9", "Gäste-WC desinfizieren", "Misafir tuvaletini dezenfekte et", "Disinfect the guest toilet", "Merkblatt Köln: einmal pro Woche", "Köln bilgi notu: haftada bir", "Cologne guidance sheet: once a week"],
  ["R32", "woche", "empfehlung", "lager", "Q4,Q7,Q10", "Regale und Lager auswischen, Haltbarkeit prüfen", "Rafları ve depoyu sil, son kullanma tarihlerini kontrol et", "Wipe shelves and storage, check best-before dates", "Merkblätter Freising und Mainz: wöchentlich", "Freising ve Mainz bilgi notları: haftada bir", "Freising and Mainz guidance sheets: weekly"],
  ["R33", "tag", "pflicht", "alle", "Q3", "Mülleimer leeren, Deckel zu", "Çöp kovalarını boşalt, kapakları kapat", "Empty bins, close lids", "Abfall schnell raus, Behälter verschlossen", "Çöp hemen dışarı, kaplar kapalı", "Get waste out fast, keep bins closed"],
  ["R34", "woche", "praxis", "muell", "Q3", "Mülltonnen und Müllplatz waschen", "Çöp konteynerlerini ve çöp alanını yıka", "Wash bins and bin area", "Abfallplatz frei von Schädlingen halten", "Çöp alanını haşeresiz tut", "Keep the bin area free of pests"],
  ["R35", "monat", "pflicht", "alle", "Q3,Q5,Q17", "Schädlingskontrolle: Fallen und Ecken ansehen", "Haşere kontrolü: tuzaklara ve köşelere bak", "Pest check: look at traps and corners", "Schädlingsschutz ist Pflicht; Merkblatt Dortmund: monatlich", "Haşere kontrolü zorunlu; Dortmund bilgi notu: ayda bir", "Pest control is required; Dortmund guidance sheet: monthly"],
  ["R36", "monat", "praxis", "alle", "Q4,Q10", "Wände, Fliesen, Lampen, Decke", "Duvarlar, fayanslar, lambalar, tavan", "Walls, tiles, lamps, ceiling", "Grundreinigung", "Genel temizlik", "Deep cleaning"],
  ["R37", "zweijahre", "pflicht", "alle", "Q23,Q5", "Belehrung Infektionsschutz für Mitarbeiter wiederholen", "Çalışanlara enfeksiyon koruma eğitimini tekrarla", "Repeat infection-protection briefing for staff", "Pflicht alle 2 Jahre (§ 43 IfSG), mit Unterschrift", "2 yılda bir zorunlu (§ 43 IfSG), imzalı", "Required every 2 years (§ 43 IfSG), with signature"],
];

export const AUFGABEN = R.map(([id, takt, stufe, gilt, quellen, de, tr, en, wde, wtr, wen]) => ({ id, takt, stufe, gilt, quellen, text: { de, tr, en }, warum: { de: wde, tr: wtr, en: wen } }));
// Standardmäßig aus (bis der Wirt sie einschaltet): Wände/Decke ist Grundreinigung, nicht Alltag
export const STANDARD_AUS = ["R36"];
