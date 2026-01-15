import { useState } from 'react'
import { Box, Divider, MenuItem, Select, TextField, Typography } from '@mui/material'
import { Labeled, ReqFunc, StateReporter } from './util'
import CoffeePairing from './CoffeePairing'
import ContactExport from './ContactExport'
import { useCookie } from './useCookie'

export default () => {
    const tools = ['Coffee Pairing', 'Contact Export']
    const [tool, setTool] = useCookie('recent_tool', tools[0]);
    const [result, setResult] = useState([] as string[]);
    const [resultState, setResultState] = useState<'fail'|'success'|'pending'>('pending');
    const [mailchimpKey, setMailchimpKey] = useCookie('mailchimp_api_key', '');
    const [nationBuilderKey, setNationBuilderKey] = useCookie('nationbuilder_api_key', '');
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
        nationbuilder: nationBuilderKey,
    }

    const req: ReqFunc = async (keyName: 'mailchimp'|'nationbuilder', url: string, method: string, body?: string) => {
				let found_error = false;
				return fetch(
						`https://thawing-lowlands-28251-6bae9d7d987a.herokuapp.com/${url}`, {
								method: method,
								headers: new Headers({
										'Accept': 'application/json',
										'Content-Type': 'application/json',
										'Authorization': (() => {
												if(keyName == 'mailchimp') return `Basic ${btoa(`anystring:${keys[keyName]}`)}`
												if(keyName == 'nationbuilder') return `Bearer ${keys[keyName]}`
												return ''
										})(),
								}),
								body: body ?? undefined
						}
				).then(
						res => res ? res.json() : (new Response()).json()
				).then(res => {
						if(res.status !== 200){
								state.error(JSON.stringify(res))
								return null;
						}
						return res;
				}).catch(e => {
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
            <Labeled label='NATIONBUILDER KEY'>
                <TextField type='password' defaultValue={nationBuilderKey} onChange={(e) => setNationBuilderKey(e.target.value as string)}/>
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
            {tool == 'Contact Export' && <ContactExport req={req} state={state}/>}

            <Divider/>

            <Labeled label='RESPONSE'>
                <Box sx={{overflow: 'auto', p: 2, backgroundColor: colors[resultState], display: 'flex', flexDirection: 'column-reverse', height: '150px', width: '100%', border: '2px solid gray', borderRadius: '5px'}}>
                    {result.map((row, i) => <Typography component='p' key={i}>{row}</Typography>)}
                    
                </Box>
            </Labeled>
        </Box>
    </Box>
}
