// Nederlandse Voedingsmiddelendatabase (RIVM NEVO-online referentie + Open Food Facts + zelfgroeiende Supabase food_products tabel).
// Klassiek script (geen module): deelt globale functies en variabelen met de andere bestanden in js/.
// Zie ARCHITECTURE.md voor de laadvolgorde.

const FOOD_PRODUCTS_CACHE_KEY = 'takkie_food_products_cache_v1';

// ==========================================
// 1. RIVM NEVO-ONLINE REFERENTIEDATABASE (NL)
// ==========================================
// Waarden in NEVO (en Voedingscentrum) zijn per 100g of 100ml en bevatten ALTIJD
// netto (verteerbare) koolhydraten: voedingsvezels zijn in Nederland al afgetrokken.
const NEVO_FOODS = [
    // EIEREN
    { name: 'Kippenei (gekookt)', aliases: ['ei', 'eieren', 'gekookt ei', 'hardgekookt ei', 'zachtgekookt ei'], category: 'meal', unit: 'stuks', portionLabel: '1 ei (50 g)', portionGrams: 50, carbs100: 0.0, fat100: 9.5, protein100: 12.3, options: ['1 ei', '2 eieren', '3 eieren', '4 eieren'], defaultOption: '2 eieren' },
    { name: 'Gebakken ei / spiegelei', aliases: ['gebakken ei', 'gebakken eieren', 'spiegelei', 'spiegeleieren'], category: 'meal', unit: 'stuks', portionLabel: '1 gebakken ei (55 g)', portionGrams: 55, carbs100: 0.2, fat100: 15.0, protein100: 12.5, options: ['1 ei', '2 eieren', '3 eieren', '4 eieren'], defaultOption: '2 eieren' },
    { name: 'Roerei (scrambled eggs)', aliases: ['roerei', 'roereieren', 'scrambled eggs'], category: 'meal', unit: 'stuks', portionLabel: 'Portie van 2 eieren (120 g)', portionGrams: 60, carbs100: 0.8, fat100: 14.5, protein100: 11.2, options: ['1 ei', '2 eieren', '3 eieren', '4 eieren'], defaultOption: '2 eieren' },
    { name: 'Omelet (naturel)', aliases: ['omelet', 'boerenomelet', 'kaasomelet'], category: 'meal', unit: 'stuks', portionLabel: '1 omelet (2 eieren, 120 g)', portionGrams: 120, carbs100: 0.6, fat100: 15.4, protein100: 11.8, options: ['1 omelet (2 eieren)', 'Grote omelet (3 eieren)'], defaultOption: '1 omelet (2 eieren)' },

    // KAAS & ZUIVEL
    { name: 'Goudse kaas 48+ (jong / belegen)', aliases: ['kaas', 'goudse kaas', 'jonge kaas', 'belegen kaas', 'plak kaas', 'plakje kaas', 'blokjes kaas'], category: 'meal', unit: 'plakjes', portionLabel: '1 plak (20 g)', portionGrams: 20, carbs100: 0.0, fat100: 30.6, protein100: 22.9, options: ['1 plakje (20 g)', '2 plakjes (40 g)', '3 plakjes (60 g)', '50 g blokjes'], defaultOption: '2 plakjes (40 g)' },
    { name: 'Oude kaas 48+', aliases: ['oude kaas', 'overjarige kaas', 'brokkelkaas', 'oude goudse'], category: 'meal', unit: 'plakjes', portionLabel: '1 plak (20 g)', portionGrams: 20, carbs100: 0.0, fat100: 32.5, protein100: 25.4, options: ['1 plakje (20 g)', '2 plakjes (40 g)', '50 g blokjes'], defaultOption: '2 plakjes (40 g)' },
    { name: 'Brie 60+ (roombrie)', aliases: ['brie', 'roombrie', 'franse kaas'], category: 'meal', unit: 'g', portionLabel: '1 puntje / portie (45 g)', portionGrams: 45, carbs100: 0.0, fat100: 29.1, protein100: 17.6, options: ['30 g', '45 g (portie)', '75 g', '100 g'], defaultOption: '45 g (portie)' },
    { name: 'Camembert 45+', aliases: ['camembert'], category: 'meal', unit: 'g', portionLabel: '1 portie (45 g)', portionGrams: 45, carbs100: 0.0, fat100: 22.2, protein100: 19.9, options: ['45 g', '75 g', '100 g'], defaultOption: '45 g' },
    { name: 'Mozzarella', aliases: ['mozzarella', 'buffelmozzarella', 'bol mozzarella'], category: 'meal', unit: 'g', portionLabel: '½ bol (62 g)', portionGrams: 62, carbs100: 0.7, fat100: 19.5, protein100: 18.7, options: ['62 g (½ bol)', '125 g (1 bol)', '50 g'], defaultOption: '125 g (1 bol)' },
    { name: 'Feta (Griekse schapen-/geitenkaas)', aliases: ['feta', 'fetakaas', 'witte kaas', 'saladekaas'], category: 'meal', unit: 'g', portionLabel: '1 portie (50 g)', portionGrams: 50, carbs100: 1.0, fat100: 23.0, protein100: 16.5, options: ['30 g', '50 g', '75 g', '100 g'], defaultOption: '50 g' },
    { name: 'Geitenkaas (zacht, 45+)', aliases: ['geitenkaas', 'zachte geitenkaas', 'geitenkaasbolletjes'], category: 'meal', unit: 'g', portionLabel: '1 portie (45 g)', portionGrams: 45, carbs100: 0.6, fat100: 23.8, protein100: 18.5, options: ['30 g', '45 g', '75 g', '100 g'], defaultOption: '45 g' },
    { name: 'Parmezaanse kaas (Grana Padano)', aliases: ['parmezaan', 'parmezaanse kaas', 'grana padano', 'pecorino'], category: 'meal', unit: 'g', portionLabel: '1 eetlepel geraspt (15 g)', portionGrams: 15, carbs100: 0.0, fat100: 28.6, protein100: 35.1, options: ['15 g (1 el)', '30 g (2 el)', '50 g'], defaultOption: '15 g (1 el)' },
    { name: 'Roomkaas naturel (bijv. MonChou / Philadelphia)', aliases: ['roomkaas', 'monchou', 'philadelphia', 'kruidenroomkaas', 'boursin', 'mascarpone'], category: 'meal', unit: 'g', portionLabel: '1 portie (30 g)', portionGrams: 30, carbs100: 3.0, fat100: 31.0, protein100: 5.8, options: ['15 g (1 el)', '30 g (2 el)', '50 g', '100 g'], defaultOption: '30 g (2 el)' },
    { name: 'Mascarpone', aliases: ['mascarpone'], category: 'meal', unit: 'g', portionLabel: '1 portie (50 g)', portionGrams: 50, carbs100: 3.6, fat100: 44.0, protein100: 4.8, options: ['30 g', '50 g', '100 g'], defaultOption: '50 g' },
    { name: 'Hüttenkäse / Cottage cheese', aliases: ['huttenkase', 'hüttenkäse', 'cottage cheese'], category: 'meal', unit: 'g', portionLabel: '1 schaaltje (100 g)', portionGrams: 100, carbs100: 2.5, fat100: 4.0, protein100: 12.3, options: ['50 g', '100 g', '150 g', '200 g'], defaultOption: '100 g' },
    { name: 'Griekse yoghurt (10% vet, vol)', aliases: ['griekse yoghurt', 'volle griekse yoghurt', 'yoghurt grieks'], category: 'meal', unit: 'g', portionLabel: '1 schaaltje (150 g)', portionGrams: 150, carbs100: 3.5, fat100: 10.0, protein100: 5.8, options: ['100 g', '150 g (schaaltje)', '200 g', '250 g'], defaultOption: '150 g (schaaltje)' },
    { name: 'Volle kwark', aliases: ['kwark', 'volle kwark'], category: 'meal', unit: 'g', portionLabel: '1 schaaltje (150 g)', portionGrams: 150, carbs100: 3.2, fat100: 8.2, protein100: 8.8, options: ['100 g', '150 g', '200 g'], defaultOption: '150 g' },
    { name: 'Volle yoghurt', aliases: ['yoghurt', 'volle yoghurt'], category: 'meal', unit: 'g', portionLabel: '1 schaaltje (150 g)', portionGrams: 150, carbs100: 3.7, fat100: 3.0, protein100: 3.8, options: ['100 g', '150 g', '200 g'], defaultOption: '150 g' },
    { name: 'Slagroom (ongezoet, 35% vet)', aliases: ['slagroom', 'ongeklopte slagroom', 'opgeklopte slagroom', 'kookroom'], category: 'meal', unit: 'el', portionLabel: '2 eetlepels (30 ml)', portionGrams: 30, carbs100: 3.1, fat100: 35.0, protein100: 2.3, options: ['1 el (15 ml)', '2 el (30 ml)', '50 ml', '100 ml'], defaultOption: '2 el (30 ml)' },
    { name: 'Crème fraîche', aliases: ['creme fraiche', 'crème fraîche', 'zure room', 'sour cream'], category: 'meal', unit: 'el', portionLabel: '1 eetlepel (25 g)', portionGrams: 25, carbs100: 2.6, fat100: 30.0, protein100: 2.4, options: ['1 el (25 g)', '2 el (50 g)', '100 g'], defaultOption: '1 el (25 g)' },

    // VLEES, GEVOGELTE & VLEESWAREN
    { name: 'Ontbijtspek / Bacon (gebakken)', aliases: ['spek', 'bacon', 'ontbijtspek', 'gebakken spek', 'uitgebakken spek', 'plakje spek', 'plakjes spek', 'spekblokjes'], category: 'meal', unit: 'plakjes', portionLabel: '1 plakje gebakken (15 g)', portionGrams: 15, carbs100: 0.2, fat100: 37.0, protein100: 25.0, options: ['1 plakje (15 g)', '2 plakjes (30 g)', '3 plakjes (45 g)', '4 plakjes (60 g)', '50 g spekblokjes'], defaultOption: '2 plakjes (30 g)' },
    { name: 'Ribeye (rund, gebakken)', aliases: ['ribeye', 'rib-eye', 'entrecote', 'steak'], category: 'meal', unit: 'g', portionLabel: '1 stuk (175 g)', portionGrams: 175, carbs100: 0.0, fat100: 16.5, protein100: 25.8, options: ['125 g', '175 g', '225 g', '250 g'], defaultOption: '175 g' },
    { name: 'Biefstuk (rund, gebakken)', aliases: ['biefstuk', 'kogelbiefstuk', 'ossenhaas', 'tournedos'], category: 'meal', unit: 'g', portionLabel: '1 stuk (150 g)', portionGrams: 150, carbs100: 0.0, fat100: 5.5, protein100: 28.5, options: ['100 g', '125 g', '150 g', '200 g'], defaultOption: '150 g' },
    { name: 'Rundergehakt (vol, gebakken)', aliases: ['gehakt', 'rundergehakt', 'half-om-half gehakt', 'gehaktbal', 'hamburger'], category: 'meal', unit: 'g', portionLabel: '1 portie (125 g)', portionGrams: 125, carbs100: 0.0, fat100: 18.5, protein100: 24.5, options: ['100 g', '125 g', '150 g', '200 g'], defaultOption: '125 g' },
    { name: 'Kipfilet (gebakken)', aliases: ['kip', 'kipfilet', 'kipstukjes', 'gerookte kip', 'gerookte kipfilet'], category: 'meal', unit: 'g', portionLabel: '1 filet (150 g)', portionGrams: 150, carbs100: 0.0, fat100: 3.5, protein100: 29.8, options: ['100 g', '125 g', '150 g', '200 g'], defaultOption: '150 g' },
    { name: 'Kippendijfilet (gebakken)', aliases: ['kippendij', 'kippendijen', 'kippendijfilet', 'kippenbout', 'kippenvleugels', 'drumstick'], category: 'meal', unit: 'g', portionLabel: '1 portie (150 g)', portionGrams: 150, carbs100: 0.0, fat100: 11.2, protein100: 24.5, options: ['100 g', '150 g', '200 g'], defaultOption: '150 g' },
    { name: 'Rookworst (Gelderse)', aliases: ['rookworst', 'gelderse rookworst', 'unox rookworst'], category: 'meal', unit: 'g', portionLabel: '1 kwart/portie (100 g)', portionGrams: 100, carbs100: 1.5, fat100: 28.0, protein100: 13.5, options: ['75 g', '100 g', '150 g'], defaultOption: '100 g' },
    { name: 'Varkenshaas / Karbonade (gebakken)', aliases: ['varkenshaas', 'karbonade', 'schouderkarbonade', 'riblap', 'speklap', 'speklapje'], category: 'meal', unit: 'g', portionLabel: '1 stuk (150 g)', portionGrams: 150, carbs100: 0.0, fat100: 13.0, protein100: 26.5, options: ['100 g', '150 g', '200 g'], defaultOption: '150 g' },
    { name: 'Achterham / Schouderham', aliases: ['ham', 'achterham', 'schouderham', 'beenham', 'plakje ham'], category: 'meal', unit: 'plakjes', portionLabel: '1 plakje (20 g)', portionGrams: 20, carbs100: 0.8, fat100: 3.8, protein100: 19.5, options: ['1 plakje (20 g)', '2 plakjes (40 g)', '3 plakjes (60 g)'], defaultOption: '2 plakjes (40 g)' },
    { name: 'Serranoham / Parmaham', aliases: ['serranoham', 'parmaham', 'prosciutto', 'rauwe ham', 'coburger ham'], category: 'meal', unit: 'plakjes', portionLabel: '1 plakje (15 g)', portionGrams: 15, carbs100: 0.2, fat100: 14.5, protein100: 30.0, options: ['2 plakjes (30 g)', '3 plakjes (45 g)', '50 g'], defaultOption: '2 plakjes (30 g)' },
    { name: 'Salami / Chorizo / Cervelaat', aliases: ['salami', 'chorizo', 'cervelaat', 'snijworst', 'droge worst', 'fuet', 'leverworst'], category: 'meal', unit: 'g', portionLabel: '1 portie (35 g)', portionGrams: 35, carbs100: 1.2, fat100: 34.0, protein100: 21.5, options: ['20 g (2 plakjes)', '35 g (portie)', '50 g', '75 g'], defaultOption: '35 g (portie)' },
    { name: 'Rosbief / Carpaccio', aliases: ['rosbief', 'carpaccio', 'rundercarpaccio', 'filet americain'], category: 'meal', unit: 'g', portionLabel: '1 portie (75 g)', portionGrams: 75, carbs100: 0.5, fat100: 4.5, protein100: 22.0, options: ['40 g', '75 g (portie)', '100 g'], defaultOption: '75 g (portie)' },
    { name: 'Shoarma / Gyros (vlees, gebakken)', aliases: ['shoarma', 'gyros', 'kebab', 'doner'], category: 'meal', unit: 'g', portionLabel: '1 portie (150 g)', portionGrams: 150, carbs100: 1.8, fat100: 15.5, protein100: 23.0, options: ['100 g', '150 g', '200 g'], defaultOption: '150 g' },

    // VIS, SCHAAL- & SCHELPDIEREN
    { name: 'Zalmfilet (gebakken of gerookt)', aliases: ['zalm', 'zalmfilet', 'gebakken zalm', 'gerookte zalm'], category: 'meal', unit: 'g', portionLabel: '1 filet (150 g)', portionGrams: 150, carbs100: 0.0, fat100: 16.2, protein100: 21.5, options: ['75 g (gerookt)', '125 g', '150 g (filet)', '200 g'], defaultOption: '150 g (filet)' },
    { name: 'Makreel (gerookt)', aliases: ['makreel', 'gerookte makreel', 'makreelfilet'], category: 'meal', unit: 'g', portionLabel: '1 portie (125 g)', portionGrams: 125, carbs100: 0.0, fat100: 24.5, protein100: 20.4, options: ['75 g', '125 g', '150 g'], defaultOption: '125 g' },
    { name: 'Hollandse Nieuwe Haring', aliases: ['haring', 'hollandse nieuwe', 'zure haring'], category: 'meal', unit: 'stuks', portionLabel: '1 haring (75 g)', portionGrams: 75, carbs100: 0.0, fat100: 16.0, protein100: 18.0, options: ['1 haring (75 g)', '2 haringen (150 g)'], defaultOption: '1 haring (75 g)' },
    { name: 'Tonijn uit blik (op water of olie)', aliases: ['tonijn', 'blikje tonijn', 'tonijnsteak', 'tonijnsalade'], category: 'meal', unit: 'g', portionLabel: '1 blikje uitgelekt (130 g)', portionGrams: 130, carbs100: 0.0, fat100: 4.5, protein100: 25.0, options: ['65 g (½ blikje)', '130 g (1 blikje)', '150 g'], defaultOption: '130 g (1 blikje)' },
    { name: 'Kabeljauw / Witvis (gebakken)', aliases: ['kabeljauw', 'kabeljauwfilet', 'witvis', 'pangasius', 'tilapia', 'schol', 'zeebaars'], category: 'meal', unit: 'g', portionLabel: '1 filet (150 g)', portionGrams: 150, carbs100: 0.0, fat100: 2.0, protein100: 21.0, options: ['125 g', '150 g', '200 g'], defaultOption: '150 g' },
    { name: 'Garnalen (Hollandse of Gamba\'s)', aliases: ['garnalen', 'hollandse garnalen', 'gamba', 'gambas', 'scampi'], category: 'meal', unit: 'g', portionLabel: '1 portie (100 g)', portionGrams: 100, carbs100: 0.0, fat100: 1.5, protein100: 19.5, options: ['75 g', '100 g', '150 g'], defaultOption: '100 g' },

    // GROENTEN & AVOCADO (NEVO: netto koolhydraten, vezels al afgetrokken!)
    { name: 'Avocado', aliases: ['avocado', 'halve avocado', 'guacamole'], category: 'meal', unit: 'stuks', portionLabel: '1 hele avocado (180 g) of ½ avocado (90 g)', portionGrams: 180, carbs100: 1.8, fat100: 19.5, protein100: 1.9, options: ['½ avocado (90 g)', '1 avocado (180 g)'], defaultOption: '½ avocado (90 g)' },
    { name: 'Broccoli (gekookt/gestoomd)', aliases: ['broccoli', 'broccoliroosjes'], category: 'meal', unit: 'g', portionLabel: '1 portie (150 g)', portionGrams: 150, carbs100: 2.0, fat100: 0.4, protein100: 3.0, options: ['100 g', '150 g', '200 g', '250 g'], defaultOption: '150 g' },
    { name: 'Bloemkool / Bloemkoolrijst', aliases: ['bloemkool', 'bloemkoolrijst', 'bloemkoolpuree'], category: 'meal', unit: 'g', portionLabel: '1 portie (150 g)', portionGrams: 150, carbs100: 3.0, fat100: 0.3, protein100: 2.0, options: ['100 g', '150 g', '200 g', '250 g'], defaultOption: '150 g' },
    { name: 'Spinazie (vers of gekookt)', aliases: ['spinazie', 'bladspinazie', 'spinazie a la creme'], category: 'meal', unit: 'g', portionLabel: '1 portie (150 g)', portionGrams: 150, carbs100: 0.8, fat100: 0.6, protein100: 2.8, options: ['100 g', '150 g', '200 g'], defaultOption: '150 g' },
    { name: 'Courgette / Courgetti', aliases: ['courgette', 'courgetti'], category: 'meal', unit: 'g', portionLabel: '1 portie (150 g)', portionGrams: 150, carbs100: 2.7, fat100: 0.3, protein100: 1.2, options: ['100 g', '150 g', '200 g'], defaultOption: '150 g' },
    { name: 'Champignons (gebakken)', aliases: ['champignons', 'paddenstoelen', 'kastanjechampignons'], category: 'meal', unit: 'g', portionLabel: '1 portie (100 g)', portionGrams: 100, carbs100: 0.6, fat100: 0.5, protein100: 2.7, options: ['75 g', '100 g', '150 g'], defaultOption: '100 g' },
    { name: 'Komkommer', aliases: ['komkommer', 'schijfjes komkommer', 'snoepkomkommer'], category: 'meal', unit: 'g', portionLabel: '1 portie (100 g)', portionGrams: 100, carbs100: 1.3, fat100: 0.2, protein100: 0.6, options: ['50 g', '100 g (¼ komkommer)', '200 g (½ komkommer)'], defaultOption: '100 g (¼ komkommer)' },
    { name: 'Tomaat / Cherrytomaatjes', aliases: ['tomaat', 'tomaten', 'cherrytomaatjes', 'snoeptomaatjes'], category: 'meal', unit: 'g', portionLabel: '1 tomaat / handje (85 g)', portionGrams: 85, carbs100: 2.9, fat100: 0.3, protein100: 0.8, options: ['50 g', '85 g (1 tomaat)', '150 g'], defaultOption: '85 g (1 tomaat)' },
    { name: 'Paprika (groen / rood / geel)', aliases: ['paprika', 'rode paprika', 'groene paprika'], category: 'meal', unit: 'g', portionLabel: '½ paprika (75 g)', portionGrams: 75, carbs100: 4.5, fat100: 0.3, protein100: 1.0, options: ['50 g', '75 g (½ paprika)', '150 g (1 paprika)'], defaultOption: '75 g (½ paprika)' },
    { name: 'Sla / Gemengde salade (onbereid)', aliases: ['sla', 'ijsbergsla', 'rucola', 'veldsla', 'gemengde salade', 'salade'], category: 'meal', unit: 'g', portionLabel: '1 schaal (100 g)', portionGrams: 100, carbs100: 1.4, fat100: 0.3, protein100: 1.2, options: ['50 g', '100 g', '150 g'], defaultOption: '100 g' },
    { name: 'Sperziebonen / Haricots verts', aliases: ['sperziebonen', 'boontjes', 'haricots verts', 'snijbonen'], category: 'meal', unit: 'g', portionLabel: '1 portie (150 g)', portionGrams: 150, carbs100: 3.5, fat100: 0.2, protein100: 2.0, options: ['100 g', '150 g', '200 g'], defaultOption: '150 g' },
    { name: 'Spruitjes / Boerenkool / Zuurkool', aliases: ['spruitjes', 'boerenkool', 'zuurkool', 'witte kool', 'Chinese kool', ' spitskool'], category: 'meal', unit: 'g', portionLabel: '1 portie (150 g)', portionGrams: 150, carbs100: 3.2, fat100: 0.6, protein100: 3.1, options: ['100 g', '150 g', '200 g'], defaultOption: '150 g' },
    { name: 'Asperges (groen of wit)', aliases: ['asperges', 'groene asperges', 'witte asperges'], category: 'meal', unit: 'g', portionLabel: '1 portie (150 g)', portionGrams: 150, carbs100: 2.0, fat100: 0.2, protein100: 1.9, options: ['100 g', '150 g', '200 g'], defaultOption: '150 g' },
    { name: 'Aubergine / Witlof / Andijvie', aliases: ['aubergine', 'witlof', 'andijvie', 'bleekselderij', 'venkel', 'radijs'], category: 'meal', unit: 'g', portionLabel: '1 portie (150 g)', portionGrams: 150, carbs100: 2.2, fat100: 0.2, protein100: 1.1, options: ['100 g', '150 g', '200 g'], defaultOption: '150 g' },
    { name: 'Olijven (groen of zwart)', aliases: ['olijven', 'groene olijven', 'zwarte olijven', 'kalamata olijven'], category: 'meal', unit: 'g', portionLabel: '1 schaaltje / 10 stuks (35 g)', portionGrams: 35, carbs100: 0.8, fat100: 14.5, protein100: 1.2, options: ['25 g', '35 g (10 olijven)', '50 g', '75 g'], defaultOption: '35 g (10 olijven)' },

    // NOTEN, ZADEN & PITTEN (NEVO netto koolhydraten!)
    { name: 'Walnoten (ongezouten)', aliases: ['walnoten', 'walnoot', 'handje walnoten'], category: 'meal', unit: 'g', portionLabel: '1 handje (25 g)', portionGrams: 25, carbs100: 5.4, fat100: 68.1, protein100: 15.9, options: ['15 g (klein handje)', '25 g (1 handje)', '40 g', '50 g'], defaultOption: '25 g (1 handje)' },
    { name: 'Amandelen', aliases: ['amandelen', 'amandel', 'gerookte amandelen', 'handje amandelen'], category: 'meal', unit: 'g', portionLabel: '1 handje (25 g)', portionGrams: 25, carbs100: 6.2, fat100: 55.8, protein100: 21.7, options: ['15 g', '25 g (1 handje)', '40 g', '50 g'], defaultOption: '25 g (1 handje)' },
    { name: 'Pecannoten', aliases: ['pecannoten', 'pecannoot'], category: 'meal', unit: 'g', portionLabel: '1 handje (25 g)', portionGrams: 25, carbs100: 4.4, fat100: 72.0, protein100: 9.2, options: ['15 g', '25 g (1 handje)', '40 g', '50 g'], defaultOption: '25 g (1 handje)' },
    { name: 'Macadamianoten', aliases: ['macadamia', 'macadamianoten'], category: 'meal', unit: 'g', portionLabel: '1 handje (25 g)', portionGrams: 25, carbs100: 4.5, fat100: 75.8, protein100: 7.9, options: ['15 g', '25 g (1 handje)', '40 g', '50 g'], defaultOption: '25 g (1 handje)' },
    { name: 'Paranoten', aliases: ['paranoten', 'paranooot'], category: 'meal', unit: 'g', portionLabel: '1 handje / 5 stuks (25 g)', portionGrams: 25, carbs100: 3.1, fat100: 67.1, protein100: 14.3, options: ['15 g (3 stuks)', '25 g (5 stuks)', '40 g'], defaultOption: '25 g (5 stuks)' },
    { name: 'Hazelnoten', aliases: ['hazelnoten', 'hazelnoot'], category: 'meal', unit: 'g', portionLabel: '1 handje (25 g)', portionGrams: 25, carbs100: 4.8, fat100: 63.0, protein100: 14.1, options: ['15 g', '25 g (1 handje)', '40 g'], defaultOption: '25 g (1 handje)' },
    { name: 'Gemengde noten (ongezouten)', aliases: ['noten', 'gemengde noten', 'notenmix', 'handje noten'], category: 'meal', unit: 'g', portionLabel: '1 handje (25 g)', portionGrams: 25, carbs100: 7.5, fat100: 60.5, protein100: 17.5, options: ['15 g', '25 g (1 handje)', '40 g', '50 g'], defaultOption: '25 g (1 handje)' },
    { name: 'Pinda\'s / Pindakaas (100%)', aliases: ['pindas', 'pinda', 'pindakaas', '100% pindakaas'], category: 'meal', unit: 'g', portionLabel: '1 handje / 1 grote el (25 g)', portionGrams: 25, carbs100: 11.2, fat100: 51.5, protein100: 25.6, options: ['15 g (1 el)', '25 g (handje)', '40 g'], defaultOption: '25 g (handje)' },
    { name: 'Zonnebloempitten / Pompoenpitten / Chiazaad / Lijnzaad', aliases: ['pompoenpitten', 'zonnebloempitten', 'pijnboompitten', 'chiazaad', 'lijnzaad', 'sesamzaad', 'hennepzaad'], category: 'meal', unit: 'g', portionLabel: '1 eetlepel (15 g)', portionGrams: 15, carbs100: 4.0, fat100: 48.0, protein100: 24.0, options: ['10 g', '15 g (1 el)', '25 g'], defaultOption: '15 g (1 el)' },

    // VETTEN, OLIËN & SAUZEN
    { name: 'Roomboter (ongezouten)', aliases: ['roomboter', 'boter', 'grasboter', 'klontje boter', 'klontje roomboter'], category: 'meal', unit: 'el', portionLabel: '1 klontje / el (10 g)', portionGrams: 10, carbs100: 0.6, fat100: 82.5, protein100: 0.6, options: ['5 g (1 tl)', '10 g (1 klontje)', '20 g (2 klontjes)'], defaultOption: '10 g (1 klontje)' },
    { name: 'Olijfolie / Kokosolie / MCT-olie', aliases: ['olijfolie', 'kokosolie', 'mct olie', 'mct-olie', 'avocado-olie'], category: 'meal', unit: 'el', portionLabel: '1 eetlepel (12 g)', portionGrams: 12, carbs100: 0.0, fat100: 100.0, protein100: 0.0, options: ['6 g (1 tl)', '12 g (1 el)', '24 g (2 el)'], defaultOption: '12 g (1 el)' },
    { name: 'Mayonaise (vol, 80% olie, bijv. Zaanse)', aliases: ['mayonaise', 'mayo', 'zaanse mayonaise', 'hellmanns'], category: 'meal', unit: 'el', portionLabel: '1 eetlepel (20 g)', portionGrams: 20, carbs100: 1.5, fat100: 78.0, protein100: 1.1, options: ['15 g (1 el)', '30 g (2 el)', '45 g'], defaultOption: '15 g (1 el)' },
    { name: 'Pesto (groene basilicumpesto)', aliases: ['pesto', 'groene pesto', 'rode pesto'], category: 'meal', unit: 'el', portionLabel: '1 eetlepel (20 g)', portionGrams: 20, carbs100: 4.5, fat100: 45.0, protein100: 4.8, options: ['15 g (1 el)', '30 g (2 el)'], defaultOption: '15 g (1 el)' },

    // FRUIT (KETO-VRIENDELIJK) & PURE CHOCOLADE
    { name: 'Aardbeien / Frambozen / Blauwe bessen / Bramen', aliases: ['aardbeien', 'frambozen', 'bramen', 'blauwe bessen', 'bosbessen', 'rood fruit'], category: 'meal', unit: 'g', portionLabel: '1 handje / schaaltje (50 g)', portionGrams: 50, carbs100: 5.5, fat100: 0.3, protein100: 0.9, options: ['30 g', '50 g (handje)', '100 g'], defaultOption: '50 g (handje)' },
    { name: 'Pure chocolade (85% cacao)', aliases: ['pure chocolade', 'chocolade 85%', 'donkere chocolade', 'stukje chocolade'], category: 'meal', unit: 'g', portionLabel: '1 blokje (10 g)', portionGrams: 10, carbs100: 19.0, fat100: 48.0, protein100: 11.0, options: ['10 g (1 blokje)', '20 g (2 blokjes)', '30 g'], defaultOption: '10 g (1 blokje)' },

    // KETO BROOD & CRACKERS
    { name: 'Koolhydraatarm brood (Keto brood)', aliases: ['koolhydraatarm brood', 'keto brood', 'eiwitbrood', 'sneetje keto brood'], category: 'meal', unit: 'plakjes', portionLabel: '1 sneetje (35 g)', portionGrams: 35, carbs100: 5.5, fat100: 12.0, protein100: 22.0, options: ['1 sneetje (35 g)', '2 sneetjes (70 g)', '3 sneetjes (105 g)'], defaultOption: '2 sneetjes (70 g)' },
    { name: 'Zaden- / Lijnzaadcracker (Keto cracker)', aliases: ['zadencracker', 'lijnzaadcracker', 'keto cracker', 'koolhydraatarme cracker'], category: 'meal', unit: 'plakjes', portionLabel: '1 cracker (25 g)', portionGrams: 25, carbs100: 3.5, fat100: 28.0, protein100: 16.0, options: ['1 cracker (25 g)', '2 crackers (50 g)'], defaultOption: '2 crackers (50 g)' },

    // DRANKEN (KOFFIE, THEE, WATER, ZUIVELDRANK, ALCOHOL)
    { name: 'Zwarte koffie / Espresso / Americano', aliases: ['koffie', 'zwarte koffie', 'espresso', 'americano', 'kopje koffie'], category: 'drink', unit: 'glazen', portionLabel: '1 kopje (150 ml)', portionGrams: 150, carbs100: 0.0, fat100: 0.0, protein100: 0.1, options: ['1 kopje (150 ml)', '2 kopjes (300 ml)', 'Grote mok (250 ml)'], defaultOption: '1 kopje (150 ml)' },
    { name: 'Bulletproof koffie (met roomboter & MCT-olie)', aliases: ['bulletproof koffie', 'bulletproof coffee', 'keto koffie', 'koffie met boter'], category: 'drink', unit: 'glazen', portionLabel: '1 mok (200 ml)', portionGrams: 200, carbs100: 0.0, fat100: 9.0, protein100: 0.2, options: ['1 kopje (200 ml)', 'Grote mok (250 ml)'], defaultOption: '1 kopje (200 ml)' },
    { name: 'Koffie met slagroom', aliases: ['koffie met slagroom', 'koffie met room'], category: 'drink', unit: 'glazen', portionLabel: '1 kopje met scheutje slagroom (170 ml)', portionGrams: 170, carbs100: 0.4, fat100: 4.2, protein100: 0.3, options: ['1 kopje (170 ml)', '2 kopjes (340 ml)'], defaultOption: '1 kopje (170 ml)' },
    { name: 'Cappuccino / Koffie verkeerd (volle melk)', aliases: ['cappuccino', 'koffie verkeerd', 'latte', 'flat white'], category: 'drink', unit: 'glazen', portionLabel: '1 kop (180 ml, ca. 100 ml melk)', portionGrams: 180, carbs100: 2.5, fat100: 1.9, protein100: 1.8, options: ['1 kopje (180 ml)', 'Met amandelmelk (180 ml)', '2 kopjes'], defaultOption: '1 kopje (180 ml)' },
    { name: 'Thee / Kruidenthee / Groene thee (zonder suiker)', aliases: ['thee', 'groene thee', 'kruidenthee', 'muntthee', 'gemberthee', 'rooibosthee'], category: 'drink', unit: 'glazen', portionLabel: '1 glas / mok (200 ml)', portionGrams: 200, carbs100: 0.0, fat100: 0.0, protein100: 0.0, options: ['1 glas (200 ml)', 'Grote mok (250 ml)', '2 glazen (400 ml)'], defaultOption: '1 glas (200 ml)' },
    { name: 'Water / Bruiswater / Spa Rood', aliases: ['water', 'bruiswater', 'spa rood', 'spa blauw', 'water met citroen'], category: 'drink', unit: 'glazen', portionLabel: '1 glas (200 ml)', portionGrams: 200, carbs100: 0.0, fat100: 0.0, protein100: 0.0, options: ['1 glas (200 ml)', '2 glazen (400 ml)', 'Flesje (500 ml)'], defaultOption: '1 glas (200 ml)' },
    { name: 'Amandelmelk (ongezoet)', aliases: ['amandelmelk', 'ongezoete amandelmelk'], category: 'drink', unit: 'glazen', portionLabel: '1 glas (200 ml)', portionGrams: 200, carbs100: 0.2, fat100: 1.1, protein100: 0.5, options: ['½ glas (100 ml)', '1 glas (200 ml)', '250 ml'], defaultOption: '1 glas (200 ml)' },
    { name: 'Volle melk / Halfvolle melk', aliases: ['melk', 'volle melk', 'halfvolle melk', 'glas melk'], category: 'drink', unit: 'glazen', portionLabel: '1 glas (200 ml)', portionGrams: 200, carbs100: 4.5, fat100: 3.5, protein100: 3.4, options: ['½ glas (100 ml)', '1 glas (200 ml)', '2 glazen (400 ml)', '50 ml (scheutje)'], defaultOption: '1 glas (200 ml)' },
    { name: 'Bouillon (kippen- of runderbouillon)', aliases: ['bouillon', 'kippenbouillon', 'runderbouillon', 'bottenbouillon', 'bone broth', 'opkikker'], category: 'drink', unit: 'glazen', portionLabel: '1 mok (200 ml)', portionGrams: 200, carbs100: 0.4, fat100: 0.5, protein100: 1.2, options: ['1 kop (200 ml)', 'Grote mok (250 ml)'], defaultOption: '1 kop (200 ml)' },
    { name: 'Droge witte wijn / Rosé / Prosecco Brut', aliases: ['witte wijn', 'droge witte wijn', 'rose', 'rosé', 'prosecco', 'champagne', 'cava', 'glas wijn'], category: 'drink', unit: 'glazen', portionLabel: '1 wijnglas (150 ml)', portionGrams: 150, carbs100: 1.0, fat100: 0.0, protein100: 0.1, options: ['1 glas (150 ml)', '2 glazen (300 ml)'], defaultOption: '1 glas (150 ml)' },
    { name: 'Rode wijn', aliases: ['rode wijn', 'glas rode wijn', 'wijn'], category: 'drink', unit: 'glazen', portionLabel: '1 wijnglas (150 ml)', portionGrams: 150, carbs100: 1.8, fat100: 0.0, protein100: 0.1, options: ['1 glas (150 ml)', '2 glazen (300 ml)'], defaultOption: '1 glas (150 ml)' },
    { name: 'Sterke drank puur (Wodka / Gin / Whisky / Rum)', aliases: ['wodka', 'gin', 'whisky', 'rum', 'jenever', 'tequila', 'gin spa rood'], category: 'drink', unit: 'glazen', portionLabel: '1 borrelglas (35 ml)', portionGrams: 35, carbs100: 0.0, fat100: 0.0, protein100: 0.0, options: ['1 glas (35 ml)', '2 glazen (70 ml)'], defaultOption: '1 glas (35 ml)' },
    { name: 'Frisdrank Zero / Light (Cola Zero, Sinassplit Zero)', aliases: ['cola zero', 'cola light', 'pepsi max', 'fanta zero', '7up free', 'rivella', 'ice tea green zero'], category: 'drink', unit: 'glazen', portionLabel: '1 glas (200 ml)', portionGrams: 200, carbs100: 0.0, fat100: 0.0, protein100: 0.0, options: ['1 glas (200 ml)', '1 blikje (330 ml)'], defaultOption: '1 glas (200 ml)' },
    { name: 'Koolhydraatarm bier / Pilsener (ter vergelijking)', aliases: ['bier', 'pils', 'biirtje'], category: 'drink', unit: 'glazen', portionLabel: '1 glas (250 ml)', portionGrams: 250, carbs100: 3.0, fat100: 0.0, protein100: 0.3, options: ['1 glas (250 ml)', '1 flesje (300 ml)'], defaultOption: '1 glas (250 ml)' }
];

// ==========================================
// 2. HULPFUNCTIES VOOR BEREKENING & DATABASE
// ==========================================
function normalizeFoodNameKey(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function getNevoPortionMacros(item) {
    const factor = (Number(item.portionGrams) || 100) / 100;
    return {
        carbs: Math.max(0, Math.round((Number(item.carbs100) || 0) * factor)),
        fat: Math.max(0, Math.round((Number(item.fat100) || 0) * factor)),
        protein: Math.max(0, Math.round((Number(item.protein100) || 0) * factor))
    };
}

function loadLocalFoodProductsCache() {
    try {
        const raw = localStorage.getItem(FOOD_PRODUCTS_CACHE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
        return [];
    }
}

function saveLocalFoodProductsCache(list) {
    try {
        localStorage.setItem(FOOD_PRODUCTS_CACHE_KEY, JSON.stringify((list || []).slice(0, 400)));
    } catch (_e) {
        // Negeer opslagfouten in private browsing
    }
}

async function loadFoodProductsDatabase() {
    const cached = loadLocalFoodProductsCache();
    appState.foodProducts = cached;
    if (!currentUser || !window.supabaseClient) return;

    try {
        const { data, error } = await window.supabaseClient
            .from('food_products')
            .select('*')
            .order('usage_count', { ascending: false })
            .limit(300);

        if (!error && Array.isArray(data)) {
            appState.foodProducts = data;
            saveLocalFoodProductsCache(data);
        }
    } catch (_err) {
        // Gebruik lokale cache als de tabel nog niet in Supabase is aangemaakt
    }
}

async function saveProductToDatabase(prod) {
    if (!prod || !prod.name) return null;
    const cleanName = String(prod.name).trim();
    const nameKey = normalizeFoodNameKey(cleanName);
    if (!nameKey || nameKey.length < 2) return null;

    if (!Array.isArray(appState.foodProducts)) {
        appState.foodProducts = loadLocalFoodProductsCache();
    }

    const existingIdx = appState.foodProducts.findIndex(p => (p.name_key || normalizeFoodNameKey(p.name)) === nameKey);
    const existing = existingIdx !== -1 ? appState.foodProducts[existingIdx] : null;
    const nextUsage = (existing ? (Number(existing.usage_count) || 1) + 1 : 1);

    const record = {
        name_key: nameKey,
        name: cleanName,
        brand: String(prod.brand || existing?.brand || '').trim(),
        category: prod.category || existing?.category || 'meal',
        source: prod.source || existing?.source || 'user',
        unit: prod.unit || existing?.unit || 'g',
        portion_label: prod.portion_label || existing?.portion_label || '1 portie',
        portion_grams: Number(prod.portion_grams) || Number(existing?.portion_grams) || 100,
        carbs_100g: Number(prod.carbs_100g ?? existing?.carbs_100g ?? prod.carbs_portion ?? 0),
        fat_100g: Number(prod.fat_100g ?? existing?.fat_100g ?? prod.fat_portion ?? 0),
        protein_100g: Number(prod.protein_100g ?? existing?.protein_100g ?? prod.protein_portion ?? 0),
        carbs_portion: Math.max(0, Math.round(Number(prod.carbs_portion ?? existing?.carbs_portion ?? 0))),
        fat_portion: Math.max(0, Math.round(Number(prod.fat_portion ?? existing?.fat_portion ?? 0))),
        protein_portion: Math.max(0, Math.round(Number(prod.protein_portion ?? existing?.protein_portion ?? 0))),
        usage_count: nextUsage,
        updated_at: new Date().toISOString()
    };

    if (currentUser && currentUser.id) {
        record.created_by = currentUser.id;
    }

    if (existingIdx !== -1) {
        appState.foodProducts[existingIdx] = { ...existing, ...record };
    } else {
        appState.foodProducts.unshift(record);
    }
    saveLocalFoodProductsCache(appState.foodProducts);

    if (currentUser && window.supabaseClient) {
        try {
            const { data } = await window.supabaseClient
                .from('food_products')
                .upsert([record], { onConflict: 'name_key' })
                .select()
                .maybeSingle();
            if (data) {
                const idx = appState.foodProducts.findIndex(p => (p.name_key || normalizeFoodNameKey(p.name)) === nameKey);
                if (idx !== -1) appState.foodProducts[idx] = data;
                saveLocalFoodProductsCache(appState.foodProducts);
            }
        } catch (_err) {
            // Tabel bestaat mogelijk nog niet in Supabase; lokale cache vangt dit op
        }
    }

    return record;
}

// ==========================================
// 3. ZOEKEN IN FAVORIETEN, SUPABASE DB & NEVO
// ==========================================
function searchNutritionCatalog(query, contextType = 'meal', limit = 7) {
    const q = normalizeFoodNameKey(query);
    if (!q || q.length < 2) return [];
    const qTokens = q.split(/\s+/).filter(Boolean);
    const results = [];
    const seenKeys = new Set();

    // A. Zoek in persoonlijke favorieten (appState.savedItems)
    const favs = (appState.savedItems || []).filter(f => !contextType || (f.type || 'meal') === contextType);
    for (const fav of favs) {
        const fKey = normalizeFoodNameKey(fav.name);
        if (!fKey || seenKeys.has(fKey)) continue;
        const matches = qTokens.every(tok => fKey.includes(tok));
        if (matches) {
            seenKeys.add(fKey);
            results.push({
                source: 'fav',
                badge: '💖 Favoriet',
                name: fav.name,
                category: fav.type || contextType,
                portionLabel: 'Opgeslagen portie',
                portionGrams: 100,
                carbsPortion: Math.round(Number(fav.carbs) || 0),
                fatPortion: Math.round(Number(fav.fat) || 0),
                proteinPortion: Math.round(Number(fav.protein) || 0),
                score: fKey.startsWith(q) ? 100 : 85
            });
        }
    }

    // B. Zoek in RIVM NEVO-online basisproducten
    for (const item of NEVO_FOODS) {
        if (contextType && item.category !== contextType) continue;
        const nKey = normalizeFoodNameKey(item.name);
        const aliasKeys = (item.aliases || []).map(normalizeFoodNameKey);
        const allText = [nKey, ...aliasKeys].join(' ');
        if (!qTokens.every(tok => allText.includes(tok))) continue;
        if (seenKeys.has(nKey)) continue;
        seenKeys.add(nKey);

        const exactAlias = aliasKeys.some(a => a === q || a.startsWith(q));
        const pm = getNevoPortionMacros(item);
        results.push({
            source: 'nevo',
            badge: '🏛️ NEVO / Voedingscentrum',
            name: item.name,
            category: item.category,
            unit: item.unit,
            portionLabel: item.portionLabel,
            portionGrams: item.portionGrams,
            carbs100: item.carbs100,
            fat100: item.fat100,
            protein100: item.protein100,
            carbsPortion: pm.carbs,
            fatPortion: pm.fat,
            proteinPortion: pm.protein,
            options: item.options,
            defaultOption: item.defaultOption,
            score: exactAlias ? 95 : (nKey.startsWith(q) ? 90 : 75)
        });
    }

    // C. Zoek in de gedeelde Supabase food_products tabel
    const dbProducts = Array.isArray(appState.foodProducts) ? appState.foodProducts : [];
    for (const prod of dbProducts) {
        if (contextType && prod.category && prod.category !== contextType) continue;
        const pKey = prod.name_key || normalizeFoodNameKey(prod.name);
        const bKey = normalizeFoodNameKey(prod.brand);
        const combined = `${pKey} ${bKey}`.trim();
        if (!pKey || seenKeys.has(pKey)) continue;
        if (!qTokens.every(tok => combined.includes(tok))) continue;
        seenKeys.add(pKey);

        const badge = prod.source === 'off'
            ? '🛒 Open Food Facts (DB)'
            : (prod.source === 'nevo' ? '🏛️ NEVO (DB)' : '📦 Productendatabase');

        results.push({
            source: prod.source || 'db',
            badge,
            name: prod.brand && !prod.name.toLowerCase().includes(prod.brand.toLowerCase())
                ? `${prod.name} (${prod.brand})`
                : prod.name,
            brand: prod.brand || '',
            category: prod.category || contextType,
            unit: prod.unit || 'g',
            portionLabel: prod.portion_label || '1 portie',
            portionGrams: Number(prod.portion_grams) || 100,
            carbs100: Number(prod.carbs_100g) || 0,
            fat100: Number(prod.fat_100g) || 0,
            protein100: Number(prod.protein_100g) || 0,
            carbsPortion: Math.round(Number(prod.carbs_portion) || 0),
            fatPortion: Math.round(Number(prod.fat_portion) || 0),
            proteinPortion: Math.round(Number(prod.protein_portion) || 0),
            score: (pKey.startsWith(q) ? 88 : 72) + Math.min(8, Number(prod.usage_count) || 0)
        });
    }

    return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

// ==========================================
// 4. OPEN FOOD FACTS LIVE ZOEKER (NL SUPERMARKT)
// ==========================================
async function searchOpenFoodFactsNL(query, contextType = 'meal', limit = 6) {
    const cleanQ = String(query || '').trim();
    if (!cleanQ) return [];

    const url = `https://nl.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(cleanQ)}&search_simple=1&action=process&json=1&page_size=12&fields=product_name,product_name_nl,brands,serving_size,serving_quantity,nutriments`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);

    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) return [];
        const data = await res.json();
        const rawProducts = Array.isArray(data?.products) ? data.products : [];
        const items = [];
        const seen = new Set();

        for (const p of rawProducts) {
            const rawName = (p.product_name_nl || p.product_name || '').trim();
            if (!rawName) continue;
            const nutr = p.nutriments || {};
            const c100 = Number(nutr.carbohydrates_100g);
            const f100 = Number(nutr.fat_100g);
            const p100 = Number(nutr.proteins_100g);
            if (Number.isNaN(c100) && Number.isNaN(f100) && Number.isNaN(p100)) continue;

            const brand = String(p.brands || '').split(',')[0].trim();
            const fullName = (brand && !rawName.toLowerCase().includes(brand.toLowerCase()))
                ? `${rawName} (${brand})`
                : rawName;
            const key = normalizeFoodNameKey(fullName);
            if (!key || seen.has(key)) continue;
            seen.add(key);

            const isDrink = contextType === 'drink';
            const servQty = Number(p.serving_quantity) || (isDrink ? 200 : 100);
            const servUnit = isDrink ? 'ml' : 'g';
            const servLabel = p.serving_size
                ? `Portie: ${p.serving_size}`
                : `${servQty} ${servUnit}`;
            const factor = servQty / 100;

            items.push({
                source: 'off',
                badge: '🛒 Open Food Facts',
                name: fullName,
                brand,
                category: contextType,
                unit: servUnit,
                portionLabel: `${servLabel} (per 100${servUnit}: ${Math.round(c100 || 0)}g KH)`,
                portionGrams: servQty,
                carbs100: Math.max(0, Number((c100 || 0).toFixed(1))),
                fat100: Math.max(0, Number((f100 || 0).toFixed(1))),
                protein100: Math.max(0, Number((p100 || 0).toFixed(1))),
                carbsPortion: Math.max(0, Math.round((c100 || 0) * factor)),
                fatPortion: Math.max(0, Math.round((f100 || 0) * factor)),
                proteinPortion: Math.max(0, Math.round((p100 || 0) * factor))
            });
            if (items.length >= limit) break;
        }
        return items;
    } catch (_err) {
        clearTimeout(timer);
        return [];
    }
}

// ==========================================
// 5. NEVO-VERANKERING VOOR GEMINI AI & LOKALE BEREKENING
// ==========================================
function findSingleNevoMatch(partText, contextType = null) {
    const normPart = normalizeFoodNameKey(partText);
    if (!normPart) return null;

    // Verwijder aantallen en eenheden aan het begin/einde om het kernwoord te vinden
    const stripped = normPart
        .replace(/\b\d+(?:[.,]\d+)?\s*(?:g|gr|gram|ml|l|cl|dl|el|tl|stuks?|plak(?:je|jes)?|glas|glazen|kop(?:je|jes)?|mok|handje|schaaltje|portie|eetlepels?|theelepels?|klontje)\b/g, ' ')
        .replace(/^\b(?:een|twee|drie|vier|vijf|zes|halve|half|kwart|gebakken|gekookt|gekookte|gerookte|gerookt|verse|vers)\b\s*/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const candidates = [stripped, normPart].filter(Boolean);

    // 1. Exacte match op alias of naam in NEVO_FOODS
    let bestMatch = null;
    let bestLen = 0;

    for (const item of NEVO_FOODS) {
        if (contextType && item.category !== contextType) continue;
        const terms = [normalizeFoodNameKey(item.name), ...(item.aliases || []).map(normalizeFoodNameKey)];
        for (const term of terms) {
            if (!term) continue;
            for (const cand of candidates) {
                if (cand === term || ` ${cand} `.includes(` ${term} `)) {
                    if (term.length > bestLen) {
                        bestLen = term.length;
                        bestMatch = item;
                    }
                }
            }
        }
    }
    return bestMatch;
}

function findMatchedNevoReferences(description, contextType = null) {
    const parts = String(description || '')
        .split(/\s*(?:,|\bmet\b|\ben\b|\bplus\b|&)\s*/i)
        .map(s => s.trim())
        .filter(Boolean);

    const searchParts = parts.length > 0 ? parts : [String(description || '').trim()];
    const matched = [];
    const seen = new Set();

    for (const part of searchParts) {
        const nevoItem = findSingleNevoMatch(part, contextType);
        if (nevoItem && !seen.has(nevoItem.name)) {
            seen.add(nevoItem.name);
            const pm = getNevoPortionMacros(nevoItem);
            matched.push({
                part,
                item: nevoItem,
                refLine: `- ${nevoItem.name} (RIVM NEVO): per 100g/ml = ${nevoItem.carbs100}g netto KH, ${nevoItem.fat100}g vet, ${nevoItem.protein100}g eiwit | Standaardportie (${nevoItem.portionLabel}) = ${pm.carbs}g KH, ${pm.fat}g vet, ${pm.protein}g eiwit`
            });
        }
    }

    // Controleer ook de opgeslagen food_products database
    const normDesc = normalizeFoodNameKey(description);
    for (const prod of (appState.foodProducts || [])) {
        const pKey = prod.name_key || normalizeFoodNameKey(prod.name);
        if (pKey && pKey.length >= 3 && normDesc.includes(pKey) && !seen.has(prod.name)) {
            seen.add(prod.name);
            matched.push({
                part: prod.name,
                dbProd: prod,
                refLine: `- ${prod.name} (${prod.source === 'off' ? 'Open Food Facts' : 'Productendatabase'}): per 100g/ml = ${prod.carbs_100g}g KH, ${prod.fat_100g}g vet, ${prod.protein_100g}g eiwit | Portie (${prod.portion_label}) = ${prod.carbs_portion}g KH, ${prod.fat_portion}g vet, ${prod.protein_portion}g eiwit`
            });
        }
    }

    return matched;
}

function buildNevoReferencePromptBlock(description, contextType = null) {
    const matches = findMatchedNevoReferences(description, contextType);
    if (matches.length === 0) {
        return `\nVOEDINGSRICHTLIJN (NL): Gebruik altijd officiële Nederlandse RIVM NEVO / Voedingscentrum waarden waarbij voedingsvezels AL zijn afgetrokken van de koolhydraten (netto koolhydraten).`;
    }
    return `\nOFFICIËLE NL REFERENTIECIJFERS (RIVM NEVO / Voedingscentrum & Productendatabase - netto koolhydraten excl. vezels):
${matches.map(m => m.refLine).join('\n')}
Gebruik BOVENSTAANDE cijfers exact voor je berekening (schaal naar het opgegeven gewicht of aantal porties).`;
}

function estimateGramsFromTextAndItem(textSnippet, nevoItem) {
    const raw = String(textSnippet || '').toLowerCase();
    const portionG = Number(nevoItem.portionGrams) || 100;

    // 1. Expliciet gewicht in gram of ml (bijv. "150 g" of "200ml")
    const gramMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gram|ml)\b/i);
    if (gramMatch) {
        return parseFloat(gramMatch[1].replace(',', '.')) || portionG;
    }

    // 2. Halve / kwart
    if (/\b(?:halve|half)\b|½/i.test(raw)) {
        return portionG * 0.5;
    }
    if (/\bkwart\b|¼/i.test(raw)) {
        return portionG * 0.25;
    }

    // 3. Expliciet aantal stuks/plakjes/glazen/eetlepels
    const wordToNum = { een: 1, 'één': 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6 };
    for (const [w, n] of Object.entries(wordToNum)) {
        if (new RegExp(`\\b${w}\\b`, 'i').test(raw)) {
            return portionG * n;
        }
    }
    const countMatch = raw.match(/\b(\d+)\b/);
    if (countMatch) {
        const count = parseInt(countMatch[1], 10);
        if (count > 0 && count <= 15) {
            return portionG * count;
        }
    }

    return portionG;
}

function tryCalculateFromNevoLocal(description, answersList = [], contextType = 'meal') {
    const parts = String(description || '')
        .split(/\s*(?:,|\bmet\b|\ben\b|\bplus\b|&)\s*/i)
        .map(s => s.trim())
        .filter(Boolean);
    if (parts.length === 0) return null;

    let totalC = 0;
    let totalF = 0;
    let totalP = 0;
    const matchedLabels = [];

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const nevoItem = findSingleNevoMatch(part, null);
        if (!nevoItem) return null;

        // Kijk of er in answersList een specifiek antwoord voor dit onderdeel staat
        const answerForPart = (answersList || []).find(a => {
            const normA = normalizeFoodNameKey(a);
            const normName = normalizeFoodNameKey(nevoItem.name);
            return normA.includes(normName.split(' ')[0]) || normA.includes(normalizeFoodNameKey(part).split(' ')[0]);
        }) || (answersList && answersList[i]) || '';

        const combinedText = answerForPart ? `${part} (${answerForPart})` : part;
        const grams = estimateGramsFromTextAndItem(answerForPart || part, nevoItem);
        const factor = grams / 100;

        totalC += (Number(nevoItem.carbs100) || 0) * factor;
        totalF += (Number(nevoItem.fat100) || 0) * factor;
        totalP += (Number(nevoItem.protein100) || 0) * factor;
        matchedLabels.push(`${nevoItem.name} (${Math.round(grams)}${nevoItem.category === 'drink' ? 'ml' : 'g'})`);
    }

    // Controleer of er nog een losse bereidingsvraag (bijv. roomboter/olijfolie) in answersList zat
    for (const ans of (answersList || [])) {
        if (/bereiding/i.test(ans) && !/zonder/i.test(ans)) {
            if (/roomboter|boter/i.test(ans)) {
                totalF += 8.2;
                matchedLabels.push('1 klontje roomboter (10g)');
            } else if (/olijfolie|olie/i.test(ans)) {
                totalF += 10.0;
                matchedLabels.push('1 el olijfolie (10g)');
            }
        }
    }

    const c = Math.max(0, Math.round(totalC));
    const f = Math.max(0, Math.round(totalF));
    const p = Math.max(0, Math.round(totalP));

    return {
        carbs: c,
        fat: f,
        protein: p,
        refinedName: answersList && answersList.length > 0
            ? `${description} (${answersList.map(a => a.replace(/^[^:]+:\s*/, '')).join(', ')})`
            : description,
        explanation: `🏛️ Berekend met officiële RIVM NEVO / Voedingscentrum cijfers voor ${matchedLabels.join(' + ')}.`,
        source: 'nevo'
    };
}

// ==========================================
// 6. AUTOCOMPLETE UI VOOR STAP 1 & BEWERKEN
// ==========================================
function selectAutocompleteProduct(item, config) {
    const inputEl = document.getElementById(config.inputId);
    const dropdownEl = document.getElementById(config.dropdownId);
    if (!inputEl) return;

    if (dropdownEl) dropdownEl.style.display = 'none';

    // Sla merkproduct uit Open Food Facts direct op in de zelfgroeiende database
    if (item.source === 'off' || item.source === 'nevo') {
        saveProductToDatabase({
            name: item.name,
            brand: item.brand || '',
            category: item.category || config.contextType,
            source: item.source,
            unit: item.unit || 'g',
            portion_label: item.portionLabel,
            portion_grams: item.portionGrams,
            carbs_100g: item.carbs100 ?? item.carbsPortion,
            fat_100g: item.fat100 ?? item.fatPortion,
            protein_100g: item.protein100 ?? item.proteinPortion,
            carbs_portion: item.carbsPortion,
            fat_portion: item.fatPortion,
            protein_portion: item.proteinPortion
        });
    }

    inputEl.value = `${item.name} (${item.portionLabel})`;

    if (document.getElementById(config.carbsId)) document.getElementById(config.carbsId).value = item.carbsPortion;
    if (document.getElementById(config.fatId)) document.getElementById(config.fatId).value = item.fatPortion;
    if (document.getElementById(config.proteinId)) document.getElementById(config.proteinId).value = item.proteinPortion;

    const expl = `${item.badge}: ${item.name} (${item.portionLabel}) — ${item.carbsPortion}g KH, ${item.fatPortion}g vet, ${item.proteinPortion}g eiwit.`;

    if (config.mode === 'meal-wizard' && typeof setMealWizardStep === 'function') {
        setMealWizardStep(3, { explanation: expl });
    } else if (config.mode === 'drink-wizard' && typeof setDrinkWizardStep === 'function') {
        if (document.getElementById('drink-amount')) document.getElementById('drink-amount').value = 1;
        setDrinkWizardStep(3, { explanation: expl });
    } else if (config.feedbackId) {
        const fbEl = document.getElementById(config.feedbackId);
        if (fbEl) {
            fbEl.style.display = 'block';
            fbEl.innerHTML = `✨ <b>Bron:</b> ${escapeHtml(expl)}`;
        }
    }
}

function renderAutocompleteDropdown(dropdownEl, query, items, config, offLoading = false, offResults = null) {
    if (!dropdownEl) return;
    if (!query || query.trim().length < 2) {
        dropdownEl.style.display = 'none';
        dropdownEl.innerHTML = '';
        return;
    }

    const allItems = [...items];
    if (Array.isArray(offResults)) {
        for (const offItem of offResults) {
            allItems.push(offItem);
        }
    }

    const rowsHtml = allItems.map((it, idx) => `
        <button type="button" class="nutrition-ac-item" data-ac-idx="${idx}">
            <div class="nutrition-ac-top">
                <span class="nutrition-ac-name">${escapeHtml(it.name)}</span>
                <span class="nutrition-ac-badge">${escapeHtml(it.badge)}</span>
            </div>
            <div class="nutrition-ac-sub">
                <span>${escapeHtml(it.portionLabel)}</span>
                <span class="nutrition-ac-macros"><b>${it.carbsPortion}g KH</b> · ${it.fatPortion}g V · ${it.proteinPortion}g E</span>
            </div>
        </button>
    `).join('');

    let offSectionHtml = '';
    if (offLoading) {
        offSectionHtml = `<div class="nutrition-ac-off-status"><span class="ai-spinner"></span> Zoeken bij Open Food Facts (NL supermarkten)...</div>`;
    } else if (offResults && offResults.length === 0) {
        offSectionHtml = `<div class="nutrition-ac-off-status">Geen verpakt merkproduct gevonden op Open Food Facts voor "${escapeHtml(query)}".</div>`;
    } else if (!offResults) {
        offSectionHtml = `
            <button type="button" class="nutrition-ac-off-btn" data-ac-off-search="1">
                🔎 Zoek "${escapeHtml(query)}" als supermarkt-/merkproduct (Open Food Facts)
            </button>`;
    }

    dropdownEl.innerHTML = `
        <div class="nutrition-ac-box">
            ${rowsHtml || '<div class="nutrition-ac-empty">Geen directe NEVO-match — druk op <b>Volgende stap</b> voor AI-analyse of zoek bij Open Food Facts:</div>'}
            ${offSectionHtml}
        </div>`;
    dropdownEl.style.display = 'block';

    dropdownEl.querySelectorAll('.nutrition-ac-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-ac-idx'), 10);
            if (allItems[idx]) {
                selectAutocompleteProduct(allItems[idx], config);
            }
        });
    });

    const offBtn = dropdownEl.querySelector('[data-ac-off-search]');
    if (offBtn) {
        offBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            renderAutocompleteDropdown(dropdownEl, query, items, config, true, null);
            const foundOff = await searchOpenFoodFactsNL(query, config.contextType, 5);
            renderAutocompleteDropdown(dropdownEl, query, items, config, false, foundOff);
        });
    }
}

function attachAutocompleteToField(config) {
    const inputEl = document.getElementById(config.inputId);
    const dropdownEl = document.getElementById(config.dropdownId);
    if (!inputEl || !dropdownEl) return;

    const updateSuggestions = () => {
        const q = inputEl.value.trim();
        if (q.length < 2) {
            dropdownEl.style.display = 'none';
            return;
        }
        const matches = searchNutritionCatalog(q, config.contextType, 6);
        renderAutocompleteDropdown(dropdownEl, q, matches, config, false, null);
    };

    inputEl.addEventListener('input', updateSuggestions);
    inputEl.addEventListener('focus', () => {
        if (inputEl.value.trim().length >= 2) {
            updateSuggestions();
        }
    });

    document.addEventListener('click', (e) => {
        if (!dropdownEl.contains(e.target) && e.target !== inputEl) {
            dropdownEl.style.display = 'none';
        }
    });
}

function initNutritionSearchEvents() {
    attachAutocompleteToField({
        inputId: 'new-meal-name',
        dropdownId: 'meal-nutrition-autocomplete',
        contextType: 'meal',
        carbsId: 'new-meal-carbs',
        fatId: 'new-meal-fat',
        proteinId: 'new-meal-protein',
        mode: 'meal-wizard'
    });

    attachAutocompleteToField({
        inputId: 'drink-name',
        dropdownId: 'drink-nutrition-autocomplete',
        contextType: 'drink',
        carbsId: 'drink-carbs',
        fatId: 'drink-fat',
        proteinId: 'drink-protein',
        mode: 'drink-wizard'
    });

    attachAutocompleteToField({
        inputId: 'edit-meal-name',
        dropdownId: 'edit-meal-nutrition-autocomplete',
        contextType: null,
        carbsId: 'edit-meal-carbs',
        fatId: 'edit-meal-fat',
        proteinId: 'edit-meal-protein',
        feedbackId: 'ai-edit-meal-feedback',
        mode: 'edit-meal'
    });
}
