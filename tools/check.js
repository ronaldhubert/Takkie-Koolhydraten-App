#!/usr/bin/env node
// Controlescript voor de code-indeling.
//
//   node tools/check.js --baseline app.js   (eenmalig: legt de functielijst van het oude app.js vast)
//   node tools/check.js                      (controle na wijzigingen)
//
// Controleert:
//  1. syntaxis van elk JS-bestand
//  2. dat elke functie/variabele uit de baseline nog bestaat, en maar één keer
//  3. dat index.html alle js/*.js-bestanden laadt, in de volgorde van JS_ORDER
//  4. dat elke onclick="naam(" in de code naar een bestaande functie verwijst
//  5. dat alle scripts samen laden en alle init...Events()-functies draaien in een nep-browser
//
// Vul JS_ORDER aan als je een nieuw bestand toevoegt (en voeg ook de <script>-tag toe).

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BASELINE_FILE = path.join(__dirname, 'baseline-symbols.json');

const JS_ORDER = [
    'js/state.js', 'js/quotes.js', 'js/utils.js', 'js/auth.js', 'js/data.js', 'js/meals.js',
    'js/favorites.js', 'js/ai.js', 'js/recipes.js', 'js/team.js', 'js/chat.js',
    'js/notifications.js', 'js/history.js', 'js/ui.js', 'js/main.js'
];
// Nieuwe functies die bewust zijn toegevoegd en dus niet in de baseline staan
const ALLOWED_NEW = /^init[A-Z]\w*Events$/;

function symbolsOf(src) {
    const out = [];
    for (const line of src.split(/\r?\n/)) {
        let m;
        if ((m = line.match(/^(?:async\s+)?function\s+(\w+)/))) out.push(m[1]);
        else if ((m = line.match(/^(?:const|let|var)\s+(\w+)/))) out.push(m[1]);
        else if ((m = line.match(/^window\.(\w+)\s*=/))) out.push('window.' + m[1]);
    }
    return out;
}

if (process.argv[2] === '--baseline') {
    const file = path.resolve(process.argv[3] || 'app.js');
    const syms = symbolsOf(fs.readFileSync(file, 'utf8'));
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(syms, null, 2));
    console.log(`Baseline opgeslagen: ${syms.length} symbolen uit ${file}`);
    process.exit(0);
}

let errors = 0;
const fail = (msg) => { errors++; console.error('FOUT: ' + msg); };

// 1. Syntax
for (const f of JS_ORDER.concat(['sw.js'])) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) { if (f !== 'sw.js') fail('ontbreekt: ' + f); continue; }
    try { execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' }); }
    catch (e) { fail('syntaxfout in ' + f + '\n' + String(e.stderr || e.message)); }
}

// 2. Symbolen
const present = JS_ORDER.filter(f => fs.existsSync(path.join(ROOT, f)));
const sources = Object.fromEntries(present.map(f => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
const found = {};
for (const f of present) for (const s of symbolsOf(sources[f])) (found[s] = found[s] || []).push(f);
if (fs.existsSync(BASELINE_FILE)) {
    const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
    for (const s of baseline) if (!found[s]) fail('ontbreekt na splitsen: ' + s);
    for (const [s, files] of Object.entries(found)) {
        if (files.length > 1) fail(`dubbel gedefinieerd: ${s} in ${files.join(', ')}`);
        if (!baseline.includes(s) && !ALLOWED_NEW.test(s)) console.warn('Let op, nieuw symbool: ' + s + ' (' + files[0] + ')');
    }
} else {
    console.warn('Geen baseline gevonden (tools/baseline-symbols.json); stap 2 overgeslagen.');
}

// 3. index.html laadt alle scripts in de juiste volgorde
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const tags = [...html.matchAll(/<script\s+src="(js\/[^"?]+)/g)].map(m => m[1]);
if (present.length === JS_ORDER.length) {
    if (JSON.stringify(tags) !== JSON.stringify(JS_ORDER)) {
        fail('de <script>-tags in index.html komen niet overeen met JS_ORDER.\n  html: ' + tags.join(', ') + '\n  orde: ' + JS_ORDER.join(', '));
    }
}

// 4. onclick-verwijzingen
const allCode = present.map(f => sources[f]).join('\n') + '\n' + html;
const defined = new Set(Object.keys(found).map(s => s.replace('window.', '')));
for (const m of allCode.matchAll(/onclick="\s*(?:window\.)?([A-Za-z_]\w*)\s*\(/g)) {
    if (!defined.has(m[1])) fail('onclick verwijst naar onbekende functie: ' + m[1]);
}

// 5. Laden in een nep-browser
function fakeEl() {
    const el = { style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        addEventListener() {}, appendChild() {}, querySelectorAll: () => [], querySelector: () => null,
        value: '', innerText: '', innerHTML: '', checked: false, dataset: {}, getAttribute: () => null };
    return el;
}
let domReady = [];
const sandbox = {
    console, setTimeout, clearTimeout, setInterval, clearInterval, Promise, Date, Math, JSON, URL,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: {}, alert() {}, prompt() {}, confirm: () => true,
    document: {
        hidden: false, body: fakeEl(),
        addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') domReady.push(fn); },
        getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, createElement: fakeEl
    },
    window: {
        location: { hash: '', origin: 'http://x', pathname: '/', href: '' }, scrollTo() {},
        supabaseClient: {
            auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange() {}, signOut: async () => ({}) },
            from: () => { throw new Error('geen database in de test'); }, channel: () => ({ on() { return this; }, subscribe() {} }),
            removeChannel() {}
        }
    }
};
sandbox.window.document = sandbox.document;
vm.createContext(sandbox);
try {
    for (const f of present) vm.runInContext(sources[f], sandbox, { filename: f });
    // Roep alle init...Events()-functies aan zoals main.js dat doet (zonder checkUser)
    const inits = Object.keys(found).filter(s => ALLOWED_NEW.test(s));
    for (const name of inits) vm.runInContext(name + '()', sandbox, { filename: 'init:' + name });
    console.log(`Nep-browser: ${present.length} bestanden geladen, ${inits.length} init-functies uitgevoerd.`);
} catch (e) {
    fail('laden in nep-browser mislukt: ' + (e.stack || e));
}

if (errors) { console.error(`\n${errors} fout(en) gevonden.`); process.exit(1); }
console.log('Alle controles geslaagd.');
