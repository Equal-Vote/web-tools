import { PROXY_ORIGIN } from './util'

const NATION_SLUG = 'unifiedprimary'

export const NB_OAUTH_AUTHORIZE_URL = `https://${NATION_SLUG}.nationbuilder.com/oauth/authorize`
// client_id identifies the app to NationBuilder but authorizes nothing on its own — the
// authorization-code exchange and refresh calls require client_secret, which only the proxy holds.
// It's the OAuth analog of a username, not a password, so it's safe to ship in client-side code.
export const NB_CLIENT_ID = 'gDRuQqQTYE1t35A49JduP7oYZ28OAqtYVz0NdKHVWLo'
// Only one redirect_uri is registered with NationBuilder (production). Logging in from
// localhost still bounces through this URL, so the round trip only completes on the deployed site.
export const NB_REDIRECT_URI = 'https://equal-vote.github.io/web-tools/'

const TOKEN_EXCHANGE_URL = `${PROXY_ORIGIN}/nationbuilder-oauth/token`
const TOKEN_REFRESH_URL = `${PROXY_ORIGIN}/nationbuilder-oauth/refresh`

export type NBTokens = {
    refresh_token: string
    access_token: string
    expires_at: number // epoch ms
}

export const parseTokens = (raw: string | null): NBTokens | null => {
    if (!raw) return null
    try {
        return JSON.parse(raw)
    } catch {
        return null
    }
}

const toTokens = (json: any): NBTokens => ({
    refresh_token: json.refresh_token,
    access_token: json.access_token,
    expires_at: Date.now() + (json.expires_in ?? 0) * 1000,
})

export const login = () => {
    const url = new URL(NB_OAUTH_AUTHORIZE_URL)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', NB_CLIENT_ID)
    url.searchParams.set('redirect_uri', NB_REDIRECT_URI)
    window.location.href = url.toString()
}

export const exchangeCodeForTokens = async (code: string): Promise<NBTokens | null> => {
    const res = await fetch(TOKEN_EXCHANGE_URL, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ code, redirect_uri: NB_REDIRECT_URI }),
    })
    if (!res.ok) return null
    return toTokens(await res.json())
}

export const refreshTokens = async (refresh_token: string): Promise<NBTokens | null> => {
    const res = await fetch(TOKEN_REFRESH_URL, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ refresh_token }),
    })
    if (!res.ok) return null
    return toTokens(await res.json())
}
