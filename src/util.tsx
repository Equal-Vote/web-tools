import { Box, Typography } from "@mui/material";


const MAILCHIMP = 'https://us19.api.mailchimp.com/3.0'
export const MEMBER_API = `${MAILCHIMP}/lists/ac99b517dc/members/__MEMBER__`
export const COFFEE_MEMBERS_API = `${MAILCHIMP}/lists/ac99b517dc/segments/26023824/members`
export const ALL_MEMBERS_API = `${MAILCHIMP}/lists/ac99b517dc/members?count=__COUNT__&offset=__OFFSET__`

const NATIONBUILDER = 'https://unifiedprimary.nationbuilder.com/api/v2'
export const SIGNUPS_API = `${NATIONBUILDER}/signups?fields[signups]=__FIELDS__&extra_fields[signups]=__EXTRA_FIELDS__&page[number]=__PAGE__&page[size]=__PAGE_SIZE__&filter[with_bouncing_email]=false`
export const GET_SIGNUP_API = `${NATIONBUILDER}/signups/__ID__`//?fields[signups]=__FIELDS__&extra_fields[signups]=__EXTRA_FIELDS__`

export type ReqFunc = (keyName: 'mailchimp' | 'nationbuilder', url: string, method: string, body?: string) => Promise<void | Response>;
export type StateReporter = {error: Function, pending: Function, success: Function};
export type StringMap = {[key: string]: string};

export const v = (r: any) => (r.current as any)?.value ?? '';

export const Labeled = ({label, children} : {label: any, children: any}) => <Box display='flex' flexDirection='column'>
    <Typography>{label}</Typography>
    {children}
</Box>