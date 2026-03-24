import { Button } from "@mui/material";
import { SIGNUPS_API, ReqFunc, StateReporter, StringMap, GET_SIGNUP_API } from "./util";
import { useState, useEffect } from "react";
import JSZip from "jszip";
import zones from './zones.json';
import zipCacheRaw from '../zip_cache.csv?raw';

const PROXY = 'https://thawing-lowlands-28251-6bae9d7d987a.herokuapp.com/';
const ZIP_CODES_API = 'https://api.zip-codes.com/ZipCodesAPI.svc/1.0/QuickGetZipCodeDetails/';

const lookupCounty = async (zip: string, zipcodesKey: string): Promise<string> => {
    const cacheKey = `zip_county_${zip}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return cached;

    const r = await fetch(`${PROXY}${ZIP_CODES_API}${zip}?key=${zipcodesKey}`, {
        headers: new Headers({ 'Accept': 'application/json' })
    });
    if (!r.ok) throw new Error(`Zip codes API error for ${zip}: HTTP ${r.status}`);
    const data = await r.json();
    if (!data?.County) throw new Error(`Zip codes API returned no county for ${zip}: ${JSON.stringify(data)}`);
    sessionStorage.setItem(cacheKey, data.County);
    return data.County;
};

export default ({req, state, zipcodesKey} : {req: ReqFunc, state: StateReporter, zipcodesKey: string}) => {
    const [applyEnabled, setApplyEnabled] = useState(true);

    useEffect(() => {
        zipCacheRaw.trim().split('\n').slice(1).forEach(line => {
            const [zip, countyRaw] = line.split('\t');
            const county = countyRaw?.trim() ?? '';
            if (zip?.trim() && county) {
                sessionStorage.setItem(`zip_county_${zip.trim()}`, county);
            }
        });
    }, []);

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
            // ['donations_count', 'donation_count'],
            // ['donations_amount_in_cents', 'donation_dollars'],
            // ['donation_average', 'donation_average'],
            // ['last_donated_at', 'last_donation'],
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
            .then(obj => {
                if(!obj) return;
                // @ts-ignore
                let data = obj.data
                // @ts-ignore
                if(contact_id != '') data = [obj.data]
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

        // Metro zone filtering
        const zoneEntries = Object.entries(zones) as [string, { zip_prefixes: string[], counties: string[] }][];
        const candidateZips = new Set<string>();
        items.forEach(item => {
            const zip = item.zip;
            if (!zip) return;
            if (zoneEntries.some(([, zone]) => zone.zip_prefixes.some(p => zip.startsWith(p)))) {
                candidateZips.add(zip);
            }
        });

        state.pending(`Found ${candidateZips.size} candidate zips with a zone prefix`)

        const uncachedZips = [...candidateZips].filter(zip => !!sessionStorage.getItem(`zip_county_${zip}`));

        state.pending(`Found ${uncachedZips.length} zips required an API call`)

        if (uncachedZips.length > 250) {
            state.error(`Too many uncached zip lookups required (${uncachedZips.length}), limit is 250`);
            return;
        }

        if (uncachedZips.length > 0 && !zipcodesKey) {
            state.error(`ZIP Codes API key required for ${uncachedZips.length} uncached zip codes`);
            return;
        }

        if (uncachedZips.length > 0) {
            state.pending('Looking up zip codes for metro areas...');
            // No duplicates: uncachedZips is derived from a Set, each zip appears exactly once
            try {
                await Promise.all(uncachedZips.map(zip => lookupCounty(zip, zipcodesKey)));
            } catch(e) {
                state.error(`Zip code lookup failed: ${e}`);
                return;
            }
        }

        const zipCountyMap: { [zip: string]: string } = {};
        candidateZips.forEach(zip => {
            const county = sessionStorage.getItem(`zip_county_${zip}`);
            if (county) zipCountyMap[zip] = county;
        });

        const metroContacts: { [zoneName: string]: typeof items } = {};
        zoneEntries.forEach(([zoneName, zone]) => {
            metroContacts[zoneName] = items.filter(item => {
                const zip = item.zip;
                console.log(item, zip, zipCountyMap[zip])
                if (!zip || !zone.zip_prefixes.some(p => zip.startsWith(p))) return false;
                console.log('include', zone.counties)
                return zone.counties.includes(zipCountyMap[zip] ?? '');
            });
        });

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
        zipped('new_york_contacts.csv', items.filter(item => item.state == 'NY'));
        Object.entries(metroContacts).forEach(([zoneName, contacts]) => {
            zipped(`${zoneName}_contacts.csv`, contacts);
        });
        const url = URL.createObjectURL(await zip.generateAsync({type: 'blob'}));
        const link = document.createElement("a");
        link.download = "contacts.zip";
        link.href = url;
        link.click();
    }

    return <Button variant='contained' disabled={!applyEnabled} onClick={onSubmit} sx={{width: '400px', margin: 'auto'}}>Download Contacts</Button>
}
