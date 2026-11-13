// Die Standardnamen der Kühlstellen in Deutsch, Türkisch und Englisch – ein Auszug aus js/lang/{de,tr,en}.js (schnell2.arten.* und
// kuehl.obName/obNameTk/obNameWarm), damit js/kuehlname.js beim Start nicht drei ganze Sprachtabellen laden muss.
// tests/kuehlname_daten.test.mjs prüft, dass dieser Auszug mit den Sprachdateien übereinstimmt.
export const KUEHL_ARTEN = {"getraenke":["Getränke\u00adkühlschrank","İçecek dolabı","Drinks fridge"],"kuehlschrank":["Kühlschrank","Buzdolabı","Fridge"],"saladette":["Saladette","Saladet","Prep fridge"],"tiefkuehler":["Tiefkühler","Derin dondurucu","Freezer"],"warmhalter":["Warmhalter","Sıcak tutucu","Food warmer"],"eistheke":["Speiseeis-Theke","Dondurma dolabı","Ice-cream counter"]};
export const KUEHL_ALT = {"kuehlschrank":["Kühlschrank","Buzdolabı","Fridge"],"tiefkuehler":["Tiefkühler","Derin dondurucu","Freezer"],"warmhalter":["Warmhalter","Sıcak tutma","Hot holding"]};
