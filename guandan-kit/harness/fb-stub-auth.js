// In-memory Firebase Auth stub for the email-link flow (never touches production). Calls are recorded in
// window.__authCalls; signInWithEmailLink resolves a user whose ID token is window.__authIdToken (the live suite
// sets a locally signed one for the real dealer) or else "test-id-token" (the fake dealer accepts exactly that),
// and window.__authFail = true makes the next call reject.
const calls = (window.__authCalls = window.__authCalls || []);
const maybeFail = name => {
    if (!window.__authFail) return;
    window.__authFail = false;
    throw Object.assign(new Error(`${name} failed`), { code: "auth/invalid-action-code" });
};
export function getAuth(app) { return { app, currentUser: null }; }
export async function sendSignInLinkToEmail(auth, email, settings) {
    calls.push({ fn: "sendSignInLinkToEmail", email, url: settings?.url, handleCodeInApp: settings?.handleCodeInApp });
    maybeFail("sendSignInLinkToEmail");
}
export function isSignInWithEmailLink(auth, link) {
    calls.push({ fn: "isSignInWithEmailLink", link });
    return /[?&](mode=signIn|oobCode=)/.test(link) || window.__authLinkOk === true;
}
export async function signInWithEmailLink(auth, email, link) {
    calls.push({ fn: "signInWithEmailLink", email, link });
    maybeFail("signInWithEmailLink");
    const user = { email, emailVerified: true, getIdToken: async () => window.__authIdToken || "test-id-token" };
    auth.currentUser = user;
    return { user };
}
export async function signOut(auth) {
    calls.push({ fn: "signOut" });
    auth.currentUser = null;
}
