export const LANGUAGES = Object.freeze(['plain', 'css', 'markdown', 'html', 'json', 'javascript']);
export const THEME_SWATCHES = Object.freeze({
    auto: ['var(--SmartThemeBlurTintColor, #1e1e24)', 'var(--SmartThemeBodyColor, #e6e6e6)', 'var(--SmartThemeQuoteColor, #8ab4f8)'],
    'one-dark': ['#282c34', '#abb2bf', '#61afef'],
    'solarized-light': ['#fdf6e3', '#657b83', '#268bd2'],
    'solarized-dark': ['#002b36', '#839496', '#268bd2'],
    'github-light': ['#ffffff', '#24292f', '#0969da'],
    'github-dark': ['#0d1117', '#c9d1d9', '#58a6ff'],
    dracula: ['#282a36', '#f8f8f2', '#bd93f9'],
});
export const THEME_IDS = Object.freeze(Object.keys(THEME_SWATCHES));
