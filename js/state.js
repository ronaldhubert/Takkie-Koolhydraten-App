// Globale variabelen en appState (gedeelde staat van de hele app).
// Klassiek script (geen module): deelt globale functies en variabelen met de andere bestanden in js/.
// Zie ARCHITECTURE.md voor de laadvolgorde.

// ==========================================
// SUPABASE SETUP & GLOBALS
// ==========================================
let currentUser = null;
let currentRecipeIndex = null;
let editingMealIndex = null;
let editingFavoriteIndex = null;
let previousTabBeforeFavorites = 'home';

let teamRealtimeChannel = null;

let appState = {
    water: 0,
    meals: [],
    yesterdayMeals: [],
    activeDate: null,
    returnToHistoryDay: false,
    recipes: [],
    savedItems: [],
    foodProducts: [],
    goals: { carbs: 25, fat: 110, protein: 90, kcal: 2000 },
    points: 0,
    streak: 0,
    dailyLogId: null,
    geminiApiKey: null,
    displayName: '',
    petChoice: 'takkie',
    teamId: null,
    team: null,
    teamMembers: [],
    teamStreak: 0,
    teamMessages: []
};
