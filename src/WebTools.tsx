import { useState } from 'react'
import { Box, Divider, MenuItem, Select, TextField, Typography } from '@mui/material'
import { Labeled, PROXY_ORIGIN, ReqFunc, StateReporter } from './util'
import CoffeePairing from './CoffeePairing'
import ContactExport from './ContactExport'
import { useCookie } from './useCookie'
import { useNationBuilderAuth } from './useNationBuilderAuth'
import { NationBuilderStatus } from './NationBuilderStatus'
import logo from './assets/logo.png'

export default () => {
    const tools = ['Coffee Pairing', 'Contact Export']
    const [tool, setTool] = useCookie('recent_tool', tools[0]);
    const [result, setResult] = useState([] as string[]);
    const [resultState, setResultState] = useState<'fail'|'success'|'pending'>('pending');
    const [mailchimpKey, setMailchimpKey] = useCookie('mailchimp_api_key', '');
    const nbAuth = useNationBuilderAuth();
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

    const req: ReqFunc = async (keyName: 'mailchimp'|'nationbuilder', url: string, method: string, body?: string) => {
				const authHeader = keyName == 'mailchimp'
						? `Basic ${btoa(`anystring:${keys[keyName]}`)}`
						: await (async () => {
								const token = await nbAuth.getValidAccessToken();
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

    const size = '150px';
    const Header = () => <Box display='flex' flexDirection='row' alignItems='center' gap={2} sx={{margin: 'auto', maxWidth: '500px'}}>
        <Box sx={{
            width: size,
            height: size,
            my: 'auto',
            backgroundImage: `url(${logo})`,
            backgroundPosition: 'center center',
            backgroundSize: size,
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
                <NationBuilderStatus auth={nbAuth} />
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
