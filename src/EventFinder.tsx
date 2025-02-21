import { Box, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import useFetch from "./useFetch";
import { useEffect } from "react";

export default () => {
    const [params] = useSearchParams();
    const { data, isPending, error, makeRequest: fetchEvents } = useFetch(
        'https://thawing-lowlands-28251-6bae9d7d987a.herokuapp.com/https://starvoting.org/events',
        'get', 
    )

    useEffect(() => {fetchEvents()}, [])

    //http://localhost:5173/mailchimp/event_finder?prefix=ca_call
    let matchedUrl = ''
    if(isPending || !params.get('prefix')){
        return <Typography>{params.get('prefix') ? `finding ${params.get('prefix')}...` : 'No prefix found'}</Typography>        
    }else{
        let arr = data?.match(`"(/${params.get('prefix')}[^"]*)"`) ?? []
        if(arr[1]){
            window.location.href = `https://starvoting.org${arr[1]}`;
            return <></>
        }else{
            return <Typography>Failed to process {JSON.stringify(arr)}</Typography>
        }
    }
}