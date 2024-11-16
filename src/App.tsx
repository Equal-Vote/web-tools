import { useRef, useState } from 'react'
import { Box, Button, TextField, Typography } from '@mui/material'
import useFetch from './useFetch'

export default () => {
  const {data, isPending, error, makeRequest} = useFetch(
    //'https://google.com',
    // 'https://jsonplaceholder.typicode.com/todos/1',
    'https://us19.api.mailchimp.com/3.0/ping',
    'GET'
  )
  const [apiKey, setApiKey] = useState('');
  const apiRef = useRef();

  const onSubmit = () => {
    setApiKey((apiRef.current as any)?.value ?? '')
    makeRequest({
      headers: {
        mode: 'no-cors',
        Authorization: `Basic ${btoa(`anystring:${apiKey}`)}` 
      }
    })
  }

  const Labeled = ({label, children} : {label: any, children: any}) => <Box display='flex' flexDirection='column'>
      <Typography>{label}</Typography>
      {children}
    </Box>

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
        <TextField inputRef={apiRef} defaultValue={apiKey}/>
      </Labeled>
      <Button variant='contained' onClick={onSubmit} sx={{width: '200px'}}>Ping</Button>
      <Labeled label='RESPONSE'>
        <TextField disabled sx={{backgroundColor: error == null ? 'unset' : '#FF8888'}} value={
          isPending? '(pending)' : (error ?? (data==null? '' : JSON.stringify(data)))}
        />
      </Labeled>
    </Box>
  </Box>
}
