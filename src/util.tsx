import { Box, Typography } from "@mui/material";


export const MAILCHIMP = 'https://us19.api.mailchimp.com/3.0'
export const MEMBER_API = `${MAILCHIMP}/lists/ac99b517dc/members/__MEMBER__`

export type ReqFunc = (url: string, method: string, body?: string) => Promise<void | Response>;
export type StateReporter = {error: Function, pending: Function, success: Function};

export const v = (r: any) => (r.current as any)?.value ?? '';

export const Labeled = ({label, children} : {label: any, children: any}) => <Box display='flex' flexDirection='column'>
    <Typography>{label}</Typography>
    {children}
</Box>