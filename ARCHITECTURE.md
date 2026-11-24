# Architectuur: Takkie & Siep's Keto Tracker

Een webapp zonder build-stap: gewone HTML, CSS en JavaScript, met Supabase (Auth, Postgres, Realtime, Edge Functions) als backend. Gehost op GitHub Pages. De tekst in de app is Nederlands.

> **Voor AI-assistenten:** lees dit bestand eerst, open daarna alleen het ene `js/`- of `css/`-bestand dat bij de taak hoort. Draai na elke wijziging `node tools/check.js`.

## Bestanden

```
index.html          HTML van alle tabbladen + <link>/<script>-tags (geen CSS of logica)
css/                opmaak, opgesplitst per onderdeel
js/                 alle logica, opgesplitst per onderdeel
sw.js               service worker (Web Push)
manifest.json       PWA-gegevens
supabase-config.js  Supabase-URL en publieke key (blijft in de root)
supabase/functions/send-push/index.ts   Edge Function voor Web Push
supabase-*.sql      SQL-scripts voor Supabase (zie "Database")
tools/check.js      controlescript (zie "Controleren")
```

## Scripts: gewone scripts, geen modules

Alle bestanden in `js/` zijn **klassieke scripts**. Ze delen één globale scope: een functie of `let` in het ene bestand is direct bruikbaar in een ander. Daardoor werken ook de `onclick="..."`-attributen in de HTML. Er is **geen** `import`/`export` en geen bundler.

### Laadvolgorde (staat zo in `index.html`; wijzig die niet zomaar)

| # | Bestand | Waarvoor |
|---|---|---|
| 1 | `js/state.js` | Globale variabelen en `appState` |
| 2 | `js/quotes.js` | Data: motiverende quotes |
| 3 | `js/utils.js` | Datum-, tekst- en gram-hulpfuncties |
| 4 | `js/auth.js` | Inloggen, registreren, wachtwoord vergeten/herstel, `checkUser`, `initAuthEvents` |
| 5 | `js/data.js` | Gebruikersdata laden en opslaan, streak, punten, water, `saveMeal`, `saveRecipe`, profieldoelen |
| 6 | `js/meals.js` | Gelogde maaltijd/drank wijzigen en verwijderen; formulieren om nieuwe te loggen (`initMealEvents`, `initLogEvents`) |
| 7 | `js/favorites.js` | Favorieten (`saved_items`) beheren (`initFavoriteEvents`) |
| 8 | `js/nutrition-db.js` | Nederlandse voedingsdatabase (RIVM NEVO-online referentie, Open Food Facts zoeker, zelfgroeiende Supabase `food_products` tabel & directe autocomplete, `initNutritionSearchEvents`) |
| 9 | `js/ai.js` | Gemini AI: interactieve dialoog voor macro-analyse (verankerd op NEVO-cijfers, met vervolgvragen & snelknoppen voor gram, ml, plakjes, aantal), receptgeneratie, lokale fallback |
| 10 | `js/recipes.js` | Receptenboek: receptpagina, bewerken, verwijderen, "Bedenk een recept" (`initRecipeEvents`) |
| 11 | `js/team.js` | Clubje: aanmaken, joinen, verlaten, ledenstatus, co-op dashboard, clubje-tabblad (`initTeamEvents`) |
| 12 | `js/chat.js` | Huiskamer-chat: berichten, privéberichten, SOS, gedeelde recepten, realtime (`initChatEvents`) |
| 13 | `js/notifications.js` | Meldingen en Web Push (`initNotificationEvents`) |
| 14 | `js/history.js` | Logboek met grafieken: weken, dagen, dagdetails |
| 15 | `js/ui.js` | Tabbladen (`switchTab`), quotes tonen, level, sliders, `renderApp` (`initNavEvents`, `initProfileEvents`) |
| 16 | `js/main.js` | **Laatste.** Roept alle `init...Events()` aan op `DOMContentLoaded` en daarna `checkUser()` |

Functies worden pas tijdens het gebruik aangeroepen, dus de volgorde doet er vooral toe voor top-level `let`/`const` en voor `main.js`, dat als laatste moet staan.

## De staat van de app

Alles wat de app onthoudt staat in `appState` (`js/state.js`):

| Veld | Betekenis |
|---|---|
| `meals`, `recipes`, `savedItems` | Maaltijden van vandaag, receptenboek, favorieten |
| `water`, `dailyLogId` | Glazen water vandaag en het id van de `daily_logs`-rij |
| `goals` | `{ carbs, fat, protein, kcal }` |
| `points`, `streak` | Punten (bepalen het level) en streak |
| `displayName`, `petChoice` | Naam en icoon (`takkie` of `siepie`) |
| `teamId`, `team`, `teamMembers`, `teamStreak`, `teamMessages` | Clubje-gegevens |
| `geminiApiKey` | API-key uit Supabase `app_settings` |

Daarnaast zijn er losse globale variabelen voor wat er wordt bewerkt: `currentUser`, `currentRecipeIndex`, `editingMealIndex`, `editingFavoriteIndex`, `previousTabBeforeFavorites`, `teamRealtimeChannel`. Ze staan in `js/state.js`, behalve enkele die bij één onderdeel horen (bijvoorbeeld `editingRecipeIndex` in `js/recipes.js`).

## Regels voor wijzigingen

1. **Nieuwe functie:** zet hem in het bestand van het onderdeel waar hij bij hoort. Past hij nergens, maak dan een nieuw bestand (zie hieronder).
2. **Nieuwe knop of invoer:** de HTML staat in het tabblad in `index.html`. De `addEventListener` hoort in de `init...Events()`-functie van het onderdeel, niet in `main.js`.
3. **Nieuwe `init...Events()`-functie:** voeg hem toe aan `main.js`. De naam moet het patroon `init<Naam>Events` volgen, anders herkent `tools/check.js` hem niet.
4. **Nieuw onderdeel (nieuw bestand):**
   - maak `js/<naam>.js` en zet bovenaan een korte uitleg in commentaar;
   - voeg het toe aan `JS_ORDER` in `tools/check.js`;
   - voeg de `<script>`-tag toe in `index.html`, op dezelfde plek in de volgorde (vóór `ui.js` en `main.js`).
5. **Geen dubbele namen:** alle bestanden delen één globale scope. Twee `function escapeHtml` of twee `let appState` breken de app. `tools/check.js` meldt dit.
6. **Opmaak:** voeg CSS toe aan het `css/`-bestand van het onderdeel. De volgorde van de `<link>`-tags is bewust gekozen (later wint bij gelijke specificiteit); wijzig die niet.
7. **Cache:** na een wijziging hoort het versienummer in alle `?v=...` van `index.html` omhoog (nu `20261120a`). Gebruik overal hetzelfde nummer, zodat een telefoon niet oude en nieuwe bestanden mengt.
8. **Teksten:** de app is Nederlands, en zo ook de commentaarregels. Gebruik UTF-8 zonder BOM.

## CSS (`css/`)

De volgorde is zoals in `index.html`. Bestanden zijn aaneengesloten stukken van de oorspronkelijke stylesheet.

| Bestand | Inhoud |
|---|---|
| `base.css` | Lettertype, kleurvariabelen (`:root`), body, telefoon-container |
| `auth.css` | Inlogscherm |
| `layout.css` | Header, bovennavigatie, contentgebied, tabbladen |
| `pets.css` | Takkie & Siepie: avatars en tekstballonnen |
| `widgets.css` | Widgets, voortgangsbalken, waterdruppels |
| `cards.css` | Lijstitems, receptkaarten, macro-badges |
| `components.css` | Knoppen, invoervelden, quote-kaart, checkboxen |
| `team.css` | Clubje en chat |
| `history.css` | Logboek-grafieken |

## Tabbladen in `index.html`

Elk tabblad is een `<div id="tab-...">`. `switchTab('naam')` in `js/ui.js` toont `#tab-naam`. De tabbladen: `home`, `recipes`, `recipe-detail`, `add-recipe`, `edit-recipe`, `log`, `log-drink`, `edit-meal`, `favorites`, `edit-favorite`, `history`, `team`, `quotes`, `profile`. De opmerkingen `<!-- TAB ... -->` in de HTML markeren het begin van elk tabblad.

`renderApp()` in `js/ui.js` tekent het hoofdscherm opnieuw vanuit `appState`. Roep het aan na een wijziging in `appState`.

## Database (Supabase)

| Bestand | Doel |
|---|---|
| `supabase-teams-setup.sql` | Tabellen `teams` en `team_messages`, profielkolommen, rechten, Realtime |
| `supabase-direct-messages.sql` | Kolom `recipient_id` voor privéberichten en de bijbehorende rechten |
| `supabase-push-setup.sql` | Tabel `push_subscriptions` |
| `supabase-push-trigger.sql` | Trigger die de Edge Function `send-push` aanroept bij een nieuw bericht |
| `supabase-food-products.sql` | Zelfgroeiende tabel `food_products` voor gedeelde producten uit NEVO, Open Food Facts en Gemini AI |

Tabellen die de app gebruikt: `profiles`, `daily_logs`, `meals`, `recipes`, `saved_items`, `food_products`, `app_settings`, `teams`, `team_messages`, `push_subscriptions`. Een wijziging aan de database vraagt altijd een bijbehorend `supabase-*.sql`-bestand in de root, dat de gebruiker zelf in de Supabase SQL Editor uitvoert.

## Controleren

```
node tools/check.js
```

Het script controleert:
1. de syntaxis van alle JS-bestanden;
2. dat elke functie uit `tools/baseline-symbols.json` nog bestaat en maar één keer;
3. dat `index.html` alle scripts laadt, in de volgorde van `JS_ORDER`, en dat alle CSS-bestanden bestaan;
4. dat elk `onclick="naam("` naar een bestaande functie verwijst;
5. dat alle scripts samen laden in een nep-browser en alle `init...Events()`-functies draaien zonder fout.

Het script kan **niet** controleren of een knop goed werkt of er goed uitziet. Dat vraagt een test in de browser, bij voorkeur met twee accounts voor alles rond het clubje en de chat.

> [!NOTE]
> De baseline (`tools/baseline-symbols.json`) is de lijst van functies en variabelen die er **moeten** zijn. Voeg je bewust iets toe, dan hoeft er niets te gebeuren; het script meldt alleen nieuwe namen die niet op `init...Events` eindigen. Verwijder je bewust een functie, of ben je klaar met een grote wijziging, werk de baseline dan bij met `node tools/check.js --baseline`.

## Hosting

GitHub Pages serveert de repo-root van de branch `main`. Er is geen build. `.nojekyll` zorgt dat bestanden ongewijzigd worden geserveerd.
