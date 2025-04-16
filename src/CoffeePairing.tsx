import { Button, TextField } from "@mui/material"
import { COFFEE_MEMBERS_API, Labeled, MEMBER_API, ReqFunc, StateReporter, v } from "./util"
import { useRef } from "react";


export default ({req, state} : {req: ReqFunc, state: StateReporter}) => {
    const pairingRef = useRef();
    const contactsRef = useRef();

    const info = useRef({
        pairings: '',
        contacts: '',
    });

    const setPairing = (email: string, pairing: string) => {
        return req(
            'mailchimp',
            MEMBER_API.replace('__MEMBER__', email),
            'GET',
        )
        .then(res => res ? res.json() : (new Response()).json())
        .then(data => {
            if(data['status'] == 400 || data['status'] == 404){
				state.error(`Couldn't find contact ${email} in mailchimp`)
            }
            console.log(`Found contact ${email}`, data)
            data.merge_fields.COFFEEPAIR = pairing;
            req(
                'mailchimp',
                MEMBER_API.replace('__MEMBER__', email)+'?skip_merge_validation=true',
                'PUT',
                JSON.stringify(data)
            )
            .then(res => res ? res.json() : (new Response()).json())
            .then(data => {
                if(data['status'] == 400 || data['status'] == 404){
                    state.error(`There was an issue setting the pairing for ${email}`)
                }
                console.log(`set pair: ${email} and ${pairing}`, data)
            })
        })
    }

    const clearCoffeeMembers = async () => {
        const clearPairing = (email: string) => {
            return req(
                'mailchimp',
                MEMBER_API.replace('__MEMBER__', email),
                'GET',
            )
            .then(res => res ? res.json() : (new Response()).json())
            .then(data => {
                if(data['status'] == 404){
                    state.error(`Couldn't find contact ${email} in mailchimp`)
                }
                data.merge_fields.COFFEEPAIR = '';
                req(
                    'mailchimp',
                    MEMBER_API.replace('__MEMBER__', email)+'?skip_merge_validation=true',
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
            await req('mailchimp', COFFEE_MEMBERS_API, 'GET')
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

    const parseCSV = (str: string) => { const lines = str.split('\n'); const keys : string[] = (lines.shift() ?? '').split('\t'); return lines.map((line:string) => Object.fromEntries(line.split('\t').map((value, i) => [keys[i], value]))) }

    const onSubmit = async () => {
        state.pending()
        info.current.pairings = v(pairingRef);
        info.current.contacts = v(contactsRef);

        await clearCoffeeMembers(); 

        let pairings = parseCSV(info.current.pairings);
        let contacts = Object.fromEntries(parseCSV(info.current.contacts).map(row => [row['Members'], row]));
        let reqs: Promise<void>[] = [];
        pairings.forEach(item => {
        if(contacts[item['Name']] === undefined) state.error(`'${item['Name']}' from ${JSON.stringify(item)} not in contacts`)
        if(contacts[item['Partner Name']] === undefined) state.error(`'${item['Partner Name']}' from ${JSON.stringify(item)} not in contacts.`)
        reqs.push(setPairing(
            contacts[item['Name']]['Email'],
            contacts[item['Partner Name']]['Email Blurb'],
        ))
        reqs.push(setPairing(
            contacts[item['Partner Name']]['Email'],
            contacts[item['Name']]['Email Blurb'],
        ))
        })
        console.log('pairing reqs', pairings.length, reqs.length)
        await Promise.all(reqs).then(() => {
            console.log('DONE')
            state.success()
        });
        console.log('THE END')
    }

    return <>
        <Labeled label='PAIRINGS'>
            <TextField multiline rows={3} inputRef={pairingRef} defaultValue={info.current.pairings}/>
        </Labeled>
        <Labeled label='CONTACTS'>
            <TextField multiline rows={3} inputRef={contactsRef} defaultValue={info.current.contacts}/>
        </Labeled>
        <Button variant='contained' onClick={onSubmit} sx={{width: '200px'}}>Apply</Button>
    </>
}