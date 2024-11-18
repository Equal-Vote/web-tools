import { useRef, useState } from 'react'
import { Box, Button, TextField, Typography } from '@mui/material'

const MAILCHIMP = 'https://us19.api.mailchimp.com/3.0'
const MEMBER_API = `${MAILCHIMP}/lists/ac99b517dc/members/__MEMBER__`
const COFFEE_MEMBERS_API = `${MAILCHIMP}/lists/ac99b517dc/segments/26023824/members`

export default () => {
  const info = useRef({
    key: '',
    pairings: '',
    contacts: '',
  });
  const [result, setResult] = useState('');
  const [resultState, setResultState] = useState<'fail'|'success'|'pending'>('pending');
  const apiRef = useRef();
  const pairingRef = useRef();
  const contactsRef = useRef();
  const colors = {
    'fail': '#FF8888',
    'success': '#88FF88',
    'pending': 'unset'
  }

  const setError = (err: string) => {
    setResult(err);
    setResultState('fail');
  }

  const setSuccess = () => {
    setResult('Sucess!');
    setResultState('success');
  }

  const req = (url: string, method: string, body?: string) => {
    return fetch(
      `https://thawing-lowlands-28251-6bae9d7d987a.herokuapp.com/${url}`, {
        method: method,
        headers: new Headers({
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`anystring:${info.current.key}`)}`,
        }),
        body: body ?? undefined
      }
    ).catch(e => setError(e))
  }

  const setPairing = async (email: string, pairing: string) => {
    return await req(
      MEMBER_API.replace('__MEMBER__', email),
      'GET',
    )
    .then(res => res ? res.json() : (new Response()).json())
    .then(data => {
      if(data['status'] == 400 || data['status'] == 404){
        setError(`Couldn't find contact ${email} in mailchimp`)
      }
      console.log(`Found contact ${email}`, data)
      data.merge_fields.COFFEEPAIR = pairing;
      req(
        MEMBER_API.replace('__MEMBER__', email)+'?skip_merge_validation=true',
        'PUT',
        JSON.stringify(data)
      )
      .then(res => res ? res.json() : (new Response()).json())
      .then(data => {
        if(data['status'] == 400 || data['status'] == 404){
          setError(`There was an issue setting the pairing for ${email}`)
        }
        console.log(`set pair: ${email} and ${pairing}`, data)
      })
    })
  }

  const clearCoffeeMembers = async () => {
    const clearPairing = async (email: string) => {
      return req(
        MEMBER_API.replace('__MEMBER__', email),
        'GET',
      )
      .then(res => res ? res.json() : (new Response()).json())
      .then(data => {
        if(data['status'] == 404){
          setError(`Couldn't find contact ${email} in mailchimp`)
        }
        data.merge_fields.COFFEEPAIR = '';
        req(
          MEMBER_API.replace('__MEMBER__', email),
          'PUT',
          JSON.stringify(data)
        )
        .then(res => res ? res.json() : (new Response()).json())
        .then(data => 
          console.log(`cleared pair: ${email}`, data)
        )
      })
    }

    let num_members = 1
    let i = 0; 
    while(num_members > 0 && i < 20){
      console.log('clearing', i++);
      await req(COFFEE_MEMBERS_API, 'GET')
        .then(res => res ? res.json() : (new Response()).json())
        .then(async data => {
          num_members = data.members.length;
          await Promise.all(
            data.members.map((member:any) => clearPairing(member.email_address))
          );
        });
      console.log('end', i, num_members);
    }
  }

  const parseCSV = (str: string) => {
    const lines = str.split('\n');
    const keys : string[] = (lines.shift() ?? '').split('\t');
    return lines.map((line:string) => Object.fromEntries(line.split('\t').map((value, i) => [keys[i], value])))
  }

  const v = (r: any) => (r.current as any)?.value ?? '';

  const onSubmit = async () => {
    setResult('pending...');
    setResultState('pending');
    info.current.key = v(apiRef);;

    await clearCoffeeMembers(); 

    info.current.pairings = v(pairingRef);;
    info.current.contacts = v(contactsRef);;
    let pairings = parseCSV(info.current.pairings);
    let contacts = Object.fromEntries(parseCSV(info.current.contacts).map(row => [row['Members'], row]));
    let reqs: Promise<void>[] = [];
    pairings.forEach(item => {
      if(contacts[item['Name']] === undefined) setError(`'${item['Name']}' from ${JSON.stringify(item)} not in contacts`)
      if(contacts[item['Partner Name']] === undefined) setError(`'${item['Partner Name']}' from ${JSON.stringify(item)} not in contacts.`)
      reqs.push(setPairing(
        contacts[item['Name']]['Email'],
        contacts[item['Partner Name']]['Email Blurb'],
      ))
      reqs.push(setPairing(
        contacts[item['Partner Name']]['Email'],
        contacts[item['Name']]['Email Blurb'],
      ))
    })
    await Promise.all(reqs).then(() => {
      console.log('DONE')
      if(resultState != 'fail') setSuccess()
    });
    console.log('THE END')
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
        <TextField type='password' inputRef={apiRef} defaultValue={info.current.key}/>
      </Labeled>
      <Labeled label='PAIRINGS'>
        <TextField multiline rows={3} inputRef={pairingRef} defaultValue={info.current.pairings}/>
      </Labeled>
      <Labeled label='CONTACTS'>
        <TextField multiline rows={3} inputRef={contactsRef} defaultValue={info.current.contacts}/>
      </Labeled>
      <Button variant='contained' onClick={onSubmit} sx={{width: '200px'}}>Apply</Button>
      <Labeled label='RESPONSE'>
        <TextField disabled multiline rows={2} sx={{backgroundColor: colors[resultState]}} value={result}/>
      </Labeled>
    </Box>
  </Box>
}
