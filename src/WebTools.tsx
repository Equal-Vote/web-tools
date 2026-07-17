import { useEffect, useState } from 'react'
import { Box, Button, Divider, MenuItem, Select, TextField, Typography } from '@mui/material'
import { Labeled, PROXY_ORIGIN, ReqFunc, StateReporter } from './util'
import CoffeePairing from './CoffeePairing'
import ContactExport from './ContactExport'
import { useCookie } from './useCookie'
import { exchangeCodeForTokens, login, parseTokens, refreshTokens } from './nationBuilderAuth'

export default () => {
    const tools = ['Coffee Pairing', 'Contact Export']
    const [tool, setTool] = useCookie('recent_tool', tools[0]);
    const [result, setResult] = useState([] as string[]);
    const [resultState, setResultState] = useState<'fail'|'success'|'pending'>('pending');
    const [mailchimpKey, setMailchimpKey] = useCookie('mailchimp_api_key', '');
    const [nbTokensRaw, setNbTokensRaw] = useCookie('nationbuilder_oauth', null);
    const nbTokens = parseTokens(nbTokensRaw);
    const [zipcodesKey, setZipcodesKey] = useCookie('zipcodes_api_key', 'DEMOAPIKEY'); // defaults to DEMOAPIKEY, which works but has rate limits. Hence the caching to minimize calls
    const colors = {
        'fail': '#FF8888',
        'success': '#88FF88',
        'pending': 'unset'
    }

    const state: StateReporter = {
        error: (err: string) => {
            setResult((r) => [err, ...r]);
            setResultState('fail');
        },
        success: () => {
            if(resultState == 'fail') return;
            setResult((r) => ['Sucess!', ...r]);
            setResultState('success');
        },
        pending: (msg?: string) => {
            if(msg){
                setResult((r) => [msg  + '...', ...r]);
            }else{
                setResult(['pending...'])
            }
            setResultState('pending');
        }
    }

    const keys = {
        mailchimp: mailchimpKey,
    }

    // Proactively refreshes the access token before it expires, per the schema in #14.
    const getValidNbAccessToken = async (): Promise<string | null> => {
        if (!nbTokens) return null;
        if (nbTokens.expires_at > Date.now() + 60_000) return nbTokens.access_token;
        const refreshed = await refreshTokens(nbTokens.refresh_token);
        if (!refreshed) {
            setNbTokensRaw(null); // refresh token rotated out from under us or expired session: fall back to login button
            return null;
        }
        setNbTokensRaw(JSON.stringify(refreshed));
        return refreshed.access_token;
    }

    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get('code');
        if (!code) return;
        exchangeCodeForTokens(code).then(tokens => {
            if (tokens) setNbTokensRaw(JSON.stringify(tokens));
            window.history.replaceState({}, '', window.location.pathname + window.location.hash);
        });
    }, []);

    const req: ReqFunc = async (keyName: 'mailchimp'|'nationbuilder', url: string, method: string, body?: string) => {
				const authHeader = keyName == 'mailchimp'
						? `Basic ${btoa(`anystring:${keys[keyName]}`)}`
						: await (async () => {
								const token = await getValidNbAccessToken();
								if (!token) {
										state.error('Not logged in to NationBuilder');
										return null;
								}
								return `Bearer ${token}`;
						})();
				if (authHeader === null) return null;
				return fetch(
						`${PROXY_ORIGIN}/${url}`, {
								method: method,
								headers: new Headers({
										'Accept': 'application/json',
										'Content-Type': 'application/json',
										'Authorization': authHeader,
								}),
								body: body ?? undefined
						}
				).then(
						res => res ? res.json() : (new Response()).json()
				).then(res => {
						if(res.status !== undefined && res.status !== 200){
								console.log('error', res.status)
								state.error(JSON.stringify(res))
								return null;
						}
						return res;
				}).catch(e => {
					console.log('error')
					state.error(e)
					return null;
				})
    }

    const Header = () => <Box display='flex' flexDirection='row' gap={2} sx={{margin: 'auto', maxWidth: '500px'}}>
        <Box sx={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            my: 'auto',
            backgroundImage: 'url(https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRgNGe18hYP39IQTAd3h0CwupcSMat_iplgGA&s)',
            backgroundPosition: 'center center',
            backgroundSize: '100px',
            flexGrow: '0',
            flexShrink: '0',
        }}/>
        <Typography variant='h3' textAlign='center'>Equal Vote<br/>Web Tools</Typography>
    </Box>

    return <Box display='flex' flexDirection='column' width='100%'>
        <Header/>
        <Box display='flex' flexDirection='column' sx={{
            width: '100%',
            maxWidth: '500px',
            margin: 'auto',
            my: 4,
            gap: 3,
        }}>
            <Labeled label='MAILCHIMP KEY'>
                <TextField type='password' defaultValue={mailchimpKey} onChange={(e) => setMailchimpKey(e.target.value as string)}/>
            </Labeled>
            <Labeled label={`NATIONBUILDER`}>
                <Box display='flex' flexDirection='row' alignItems='center' gap={2}>
                {nbTokens
                    ? 
                    <>
                        <Typography><i>✓ Logged in</i></Typography>
                        <Button variant='outlined' size='small' onClick={() => setNbTokensRaw(null)}>Log out</Button>
                    </>
                    : 
                    <>
                        <Typography><i>Logged out</i></Typography>
                        <Button variant='contained' size='small' onClick={login}>Log in</Button>
                    </>

                }
                </Box>
            </Labeled>
            <Labeled label='ZIP CODES KEY'>
                <TextField type='password' defaultValue={zipcodesKey} onChange={(e) => setZipcodesKey(e.target.value as string)}/>
            </Labeled>
            <Labeled label='Tool'>
                <Select
                    value={tool}
                    onChange={(event) => setTool(event.target.value as string)}
                >
                    {tools.map((tool,i) => <MenuItem key={i} value={tool}>{tool}</MenuItem>)}
                </Select>
            </Labeled>

            <Divider/>

            {tool == 'Coffee Pairing' && <CoffeePairing req={req} state={state}/>}
            {tool == 'Contact Export' && <ContactExport req={req} state={state} zipcodesKey={zipcodesKey}/>}

            <Divider/>

            <Labeled label='RESPONSE'>
                <Box sx={{overflow: 'auto', p: 2, backgroundColor: colors[resultState], display: 'flex', flexDirection: 'column-reverse', height: '150px', width: '100%', border: '2px solid gray', borderRadius: '5px'}}>
                    {result.map((row, i) => <Typography component='p' key={i}>{row}</Typography>)}
                    
                </Box>
            </Labeled>
        </Box>
    </Box>
}
