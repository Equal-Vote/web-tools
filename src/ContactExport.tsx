import { Button } from "@mui/material";
import { SIGNUPS_API, ReqFunc, StateReporter, StringMap, GET_SIGNUP_API } from "./util";
import { useState } from "react";
import JSZip from "jszip";

export default ({req, state} : {req: ReqFunc, state: StateReporter}) => {
    const [applyEnabled, setApplyEnabled] = useState(true);

    const formatField = (signup: {[key: string]: string | StringMap}, header: string) => {
        if(header.startsWith('primary_address.'))
            return (signup.primary_address as StringMap)?.[header.replace('primary_address.', '')] ?? '';

        if(header == 'created_at' || header == 'updated_at' || header == 'last_donated_at')
            return signup[header] ? (signup[header] as string).split('T')[0] : ''

        if(header == 'phone')
            return signup[header] ?? signup['mobile_number']

        if(header == 'donations_amount_in_cents')
            return signup[header] ? (Number(signup[header]) / 100) : 0

        if(header == 'donation_average')
            return (Number(signup['donations_count']) == 0) ? 0 : Math.floor(Number(signup['donations_amount_in_cents']) / Number(signup['donations_count'])) / 100

        return signup[header]
    }

    const onSubmit = async () => {
        state.pending()

        setApplyEnabled(false);
        
        // Init Structures
        const NATIONBUILDER = 0;
        const CONTACT = 1;
        const headers = [
            ['email', 'email'],
            ['phone_number', 'phone'],
            ['full_name', 'full_name'],
            ['first_name', 'first_name'],
            ['last_name', 'last_name'],
            ['email_opt_in', 'email_opt_in'],
            ['mobile_opt_in', 'mobile_opt_in'],
            ['is_volunteer', 'is_volunteer'],
            ['donations_count', 'donation_count'],
            ['donations_amount_in_cents', 'donation_dollars'],
            ['donation_average', 'donation_average'],
            ['last_donated_at', 'last_donation'],
            ['created_at', 'join_date'],
            ['updated_at', 'last_active'],
            ['primary_address.country_code', 'country'],
            ['primary_address.state', 'state'],
            ['primary_address.county', 'county'],
            ['primary_address.city', 'city'],
            ['primary_address.zip', 'zip'],
        ] as const;

        let items: {[key: string]: string}[]= [];
        let contact_id = ''; // Arend is 299964
        let page_size = 100;
        let page_limit = 100; // reduce for testing

        state.pending(`DO NOT REFRESH PAGE, this could take a few minutes`)
        let page = 0;
        let done = false;
        while(!done && page++ <= page_limit){
            state.pending(`${(page-1)*page_size}`)
            await req(
                'nationbuilder',
                (contact_id == '' ? SIGNUPS_API : GET_SIGNUP_API)
                    .replace('__ID__', contact_id)  
                    .replace('__FIELDS__',
                        [
                            'email_opt_in',
                            'mobile_opt_in',
                            'do_not_contact',
                            'email',
                            'full_name',
                            'first_name',
                            'last_name',
                            'phone_number',
                            'mobile_number',
                            'created_at',
                            'updated_at',
                            'donations_count',
                            'last_donated_at',
                            'donations_amount_in_cents',
                            'is_volunteer',
                        ].join(',')
                    )
                    .replace('__EXTRA_FIELDS__',
                        [
                            'primary_address',
                        ].join(',')
                    )
                    .replace('__PAGE__', ''+page)
                    .replace('__PAGE_SIZE__', ''+page_size),
                'GET'
            )
            .then(res => res ? res.json() : (new Response()).json())
            .then(obj => {
                let data = obj.data
                if(contact_id != '') data = [obj.data]
                console.log(data)
                // @ts-ignore
                items = [
                    ...items,
                    ...data
                        .map((user:any) => user.attributes)
                        .filter((attributes: {[key:string]: string | StringMap}) => !attributes.do_not_contact)
                        .map((attributes: {[key:string]: string | StringMap}) => Object.fromEntries(
                                headers.map(header => [header[CONTACT], formatField(attributes, header[NATIONBUILDER])])
                        ))
                ];
                if(data.length == 0 || contact_id != ''){
                    done = true;
                    return;
                }
            })
        }

        console.log(items)

        // sort
        items.sort((a, b) => {
            const toNum = (item: StringMap) => {
                let [year, month, day] = item.join_date.split('-');
                return Number(year)*12*40 + Number(month)*40 + Number(day) 
            }
            return -(toNum(a) - toNum(b));
        })

        state.success()

        // Zip and Download File
        const zip = new JSZip();
        const zipped = (file_name: string, items: StringMap[]) =>
            zip.file(file_name, new Blob([
                `${headers.map(h => h[CONTACT]).join(',')}\n${items.map((item) => headers.map(h => item[h[CONTACT]]).join(',')).join('\n')}`
            ], {type: 'text/csv'}));
        zipped('all_contacts.csv', items);
        zipped('ohio_contacts.csv', items.filter(item => item.state == 'OH'));
        zipped('oregon_contacts.csv', items.filter(item => item.state == 'OR'));
        zipped('california_contacts.csv', items.filter(item => item.state == 'CA'));
        zipped('georgia_contacts.csv', items.filter(item => item.state == 'GA'));
        zipped('utah_contacts.csv', items.filter(item => item.state == 'UT'));
        const url = URL.createObjectURL(await zip.generateAsync({type: 'blob'}));
        const link = document.createElement("a");
        link.download = "contacts.zip";
        link.href = url;
        link.click();
    }

    return <Button variant='contained' disabled={!applyEnabled} onClick={onSubmit} sx={{width: '400px', margin: 'auto'}}>Download Contacts</Button>
}