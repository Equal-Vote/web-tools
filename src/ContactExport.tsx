import { Button } from "@mui/material";
import { ALL_MEMBERS_API, MEMBER_API, ReqFunc, StateReporter, StringMap } from "./util";
import { useState } from "react";

export default ({req, state} : {req: ReqFunc, state: StateReporter}) => {
    const [applyEnabled, setApplyEnabled] = useState(true);

    const formatField = (member: {[key: string]: string | StringMap}, header: string) => {
        if(header.startsWith('merge_fields.')){
            let value = (member.merge_fields as StringMap)[header.replace('merge_fields.', '')]
            if(header == 'merge_fields.ADDRESS'){
               value = JSON.stringify(value);
            }
            return value;
        }

        if(header == 'timestamp_opt')
            return (member[header] as string).split('T')[0]

        return member[header]
    }

    const onSubmit = async () => {
        state.pending()

        setApplyEnabled(false);
        
        // Init Structures
        const MAILCHIMP = 0;
        const CONTACT = 1;
        const headers = [
            ['status', 'subscribe_status'],
            ['full_name', 'full_name'],
            ['merge_fields.FNAME', 'first_name'],
            ['merge_fields.LNAME', 'last_name'],
            ['email_address', 'email'],
            ['merge_fields.PHONE', 'phone'],
            ['timestamp_opt', 'join_date'],
            ['merge_fields.STATE', 'state'],
            ['merge_fields.CITY', 'city'],
            ['merge_fields.ZIP', 'zip'],
            // Mailchimp doesn't have the full address from nationbuilder
            //['merge_fields.ADDRESS', 'address'],
        ] as const;

        let items: {[key: string]: string}[]= [];
        const LIMIT = 50000; // Reduce this for testing
        let totalCount = 0; 
        let prevLength = 0;

        // Populate Items
        state.pending(`DO NOT REFRESH PAGE, this could take a few minutes`)
        do{
            state.pending(`${items.length}/${totalCount}`)
            prevLength = items.length;
            await req(
                ALL_MEMBERS_API
                    .replace('__OFFSET__', ''+items.length)
                    .replace('__COUNT__', ''+Math.min(LIMIT,500)),
                'GET',
            )
            .then(res => res ? res.json() : (new Response()).json())
            .then(data => {
                console.log(data)
                items = [
                    ...items,
                    ...data.members.map((member: {[key:string]: string | StringMap}) => Object.fromEntries(
                        headers.map(header => [header[CONTACT], formatField(member, header[MAILCHIMP])])
                    ))
                ];
                totalCount = Math.min(data.total_items, LIMIT);
            })
        }while(prevLength < items.length && items.length < totalCount);
        state.pending(`DONE! ${items.length}/${totalCount}`)

        if(items.length != totalCount){
            state.error("Couldn't load all the items");
            return;
        }

        // sort
        items.sort((a, b) => {
            const toNum = (item: StringMap) => {
                let [year, month, day] = item.join_date.split('-');
                return Number(year)*12*40 + Number(month)*40 + Number(day) 
            }
            return -(toNum(a) - toNum(b));
        })

        state.success()

        // Download File
        const url = URL.createObjectURL(new Blob([
            // TODO: figure out how to escape items with comma or quote
            `${headers.map(h => h[CONTACT]).join(',')}\n${items.map((item) => headers.map(h => item[h[CONTACT]]).join(',')).join('\n')}`
        ], {type: "text/csv"}));
        const link = document.createElement("a");
        link.download = "contacts.csv";
        link.href = url;
        link.click();
    }

    return <Button variant='contained' disabled={!applyEnabled} onClick={onSubmit} sx={{width: '400px', margin: 'auto'}}>Download Contacts</Button>
}