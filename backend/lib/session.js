// The sign-in kept where the page's own code can't read it (spec 9.10): the
// signed token goes into an HttpOnly cookie — Secure, SameSite=Strict, for
// /api only — and the page is handed a hint instead: the token's header and
// payload without its signature. The hint says who is signed in and until
// when (the page shows the company, and knows a session that ran out);
// sent back to the server it opens nothing.
//
// A request may still carry a signed token as Bearer (tests, scripts, and
// sessions from before the cookie, until they expire). One that leans on
// the cookie must name the page's own account in a header (X-Company, or
// X-Admin for the admin panel): no other site can send a custom header,
// and a page opened for one account never acts as another signed in since
// in another tab.
const COOKIES = {
  company: { name: 'chekino_session', path: '/api' },
  admin: { name: 'chekino_admin', path: '/api/admin' },
};

function cookieOf(req, kind) {
  const want = COOKIES[kind].name + '=';
  for (const part of String(req.headers.cookie || '').split(';')) {
    const p = part.trim();
    if (p.startsWith(want)) {
      try { return decodeURIComponent(p.slice(want.length)); } catch (e) { return ''; }
    }
  }
  return '';
}

const options = (kind) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: COOKIES[kind].path,
});

function setSession(res, kind, token, maxAgeMs) {
  res.cookie(COOKIES[kind].name, token, { ...options(kind), maxAge: maxAgeMs });
}
function clearSession(res, kind) {
  res.clearCookie(COOKIES[kind].name, options(kind));
}

// the token without its signature: readable, useless as a key
function hintOf(token) {
  const [h, p] = String(token).split('.');
  return `${h}.${p}.`;
}

// The token a request carries: a Bearer one if it verifies, else the cookie.
// verify(token) returns the payload or throws. Returns { payload, viaCookie }
// or null.
function tokenOf(req, kind, verify) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try { return { payload: verify(auth.slice(7)), viaCookie: false }; } catch (e) { /* the hint, or an old one: try the cookie */ }
  }
  const c = cookieOf(req, kind);
  if (c) {
    try { return { payload: verify(c), viaCookie: true }; } catch (e) { return null; }
  }
  return null;
}

module.exports = { COOKIES, cookieOf, setSession, clearSession, hintOf, tokenOf };
