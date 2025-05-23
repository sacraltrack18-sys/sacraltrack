// Google OAuth utility functions for browser detection and URL construction

export function detectBrowser() {
    if (typeof window === 'undefined') return {};
    const userAgent = navigator.userAgent;
    const isMobileSafari = /iPhone|iPad|iPod/.test(userAgent) && /AppleWebKit/.test(userAgent) && !userAgent.includes('CriOS');
    const isMobileFirefox = /Android/.test(userAgent) && /Firefox/.test(userAgent);
    const isMobileChrome = /Android/.test(userAgent) && /Chrome/.test(userAgent);
    const isDesktopSafari = /^((?!chrome|android).)*safari/i.test(userAgent) &&
        /AppleWebKit/.test(userAgent) &&
        !userAgent.includes('Chrome') &&
        !userAgent.includes('Chromium');
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return {
        isMobileSafari,
        isMobileFirefox,
        isMobileChrome,
        isDesktopSafari,
        isIOS,
        userAgent: userAgent.substring(0, 200)
    };
}

export function needsEnhancedAuth(browserInfo: any) {
    return browserInfo.isIOS || browserInfo.isMobileSafari || browserInfo.isMobileFirefox || browserInfo.isDesktopSafari;
}

export function buildGoogleOAuthUrl({
    appwriteEndpoint,
    projectId,
    successUrl,
    failureUrl,
    browserInfo
}: {
    appwriteEndpoint: string,
    projectId: string,
    successUrl: string,
    failureUrl: string,
    browserInfo: any
}) {
    const cookieParams = 'cookieSameSite=none&cookieSecure=true';
    const browserParams = (browserInfo.isDesktopSafari || browserInfo.isMobileSafari)
        ? '&forceRedirect=true&useQueryForSuccessUrl=true'
        : '';
    return `${appwriteEndpoint}/account/sessions/oauth2/google?` +
        `project=${projectId}&` +
        `success=${encodeURIComponent(successUrl)}&` +
        `failure=${encodeURIComponent(failureUrl)}&` +
        `${cookieParams}${browserParams}`;
} 