import { useRef, useState } from 'react'
import { Box, Divider, MenuItem, Select, TextField, Typography } from '@mui/material'
import { Labeled, v, ReqFunc, StateReporter } from './util'
import CoffeePairing from './CoffeePairing'

export default () => {
  const tools = ['Coffee Pairing', 'Contact Export']
  const [tool, setTool] = useState(tools[0]);
  const [result, setResult] = useState('');
  const [resultState, setResultState] = useState<'fail'|'success'|'pending'>('pending');
  const [apiKey, setApiKey] = useState('');
  const colors = {
    'fail': '#FF8888',
    'success': '#88FF88',
    'pending': 'unset'
  }

  const state: StateReporter = {
    error: (err: string) => {
      setResult(err);
      setResultState('fail');
    },
    success: () => {
      if(resultState == 'fail') return;
      setResult('Sucess!');
      setResultState('success');
    },
    pending: () => {
      setResult('pending...');
      setResultState('pending');
    }
  }

  const req: ReqFunc = (url: string, method: string, body?: string) => {
    return fetch(
        `https://thawing-lowlands-28251-6bae9d7d987a.herokuapp.com/${url}`, {
        method: method,
        headers: new Headers({
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(`anystring:${apiKey}`)}`,
        }),
        body: body ?? undefined
        }
    ).catch(e => state.error(e))
}

  const Header = () => <Box display='flex' flexDirection='row' gap={2} sx={{margin: 'auto', maxWidth: '500px'}}>
    <Box sx={{
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      my: 'auto',
      backgroundImage: 'url(https://cdn.icon-icons.com/icons2/2407/PNG/512/mailchimp_icon_146054.png)',
      backgroundPosition: 'center center',
      backgroundSize: '150px',
      flexGrow: '0',
      flexShrink: '0',
    }}/>
    <Typography variant='h3' textAlign='center'>Equal Vote Mailchimp Helper</Typography>
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
      <Labeled label='API KEY'>
        <TextField type='password' defaultValue={apiKey} onChange={(e) => setApiKey(e.target.value as string)}/>
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

      <Divider/>

      <Labeled label='RESPONSE'>
        <TextField disabled multiline rows={2} sx={{backgroundColor: colors[resultState]}} value={result}/>
      </Labeled>
    </Box>
  </Box>
}
