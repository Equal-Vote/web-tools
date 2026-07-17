import { useEffect } from 'react'
import { useCookie } from './useCookie'
import { exchangeCodeForTokens, login as nbLogin, parseTokens, refreshTokens } from './nationBuilderAuth'

export type NationBuilderAuth = {
    isLoggedIn: boolean
    login: () => void
    logout: () => void
    getValidAccessToken: () => Promise<string | null>
}

export const useNationBuilderAuth = (): NationBuilderAuth => {
    const [nbTokensRaw, setNbTokensRaw] = useCookie('nationbuilder_oauth', null)
    const nbTokens = parseTokens(nbTokensRaw)

    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get('code')
        if (!code) return
        exchangeCodeForTokens(code).then(tokens => {
            if (tokens) setNbTokensRaw(JSON.stringify(tokens))
            window.history.replaceState({}, '', window.location.pathname + window.location.hash)
        })
    }, [])

    const getValidAccessToken = async (): Promise<string | null> => {
        if (!nbTokens) return null
        if (nbTokens.expires_at > Date.now() + 60_000) return nbTokens.access_token
        const refreshed = await refreshTokens(nbTokens.refresh_token)
        if (!refreshed) {
            setNbTokensRaw(null)
            return null
        }
        setNbTokensRaw(JSON.stringify(refreshed))
        return refreshed.access_token
    }

    return {
        isLoggedIn: !!nbTokens,
        login: nbLogin,
        logout: () => setNbTokensRaw(null),
        getValidAccessToken,
    }
}
