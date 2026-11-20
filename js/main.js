// Startpunt: koppelt alle knoppen zodra de pagina geladen is en controleert daarna of de gebruiker is ingelogd.
// Moet als LAATSTE script geladen worden (zie ARCHITECTURE.md).

document.addEventListener('DOMContentLoaded', () => {
    initAuthEvents();
    initNavEvents();
    initMealEvents();
    initFavoriteEvents();
    initRecipeEvents();
    initTeamEvents();
    initNotificationEvents();
    initChatEvents();
    initLogEvents();
    initProfileEvents();

    checkUser();
});
