import { useState } from "react";

// Example usage 
// Requst type: MyRequest
// Response type: ApiResponse
// MyRequestHook = useFetch<MyRequest, ApiResponse>(url, 'get')
// Where
// MyRequestHoot type = 
// {
//  data: ApiResponse | null, null by default until successful response
//  isPending: Boolean, true if waiting for request 
//  error: any | null, null by default until request error 
//  makeRequest: (MyRequest) => Promise<ApiResponse|false>, if request errors response with false
// }
type StringMap = {[key: string]: string};
const useFetch = <Message, Response>(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE') => {
    const [isPending, setIsPending] = useState(false)
    const [error, setError] = useState<any>(null)
    const [data, setData] = useState<Response | null>(null)

    const makeRequest = async ({body, headers} : {body?: Message, headers?: StringMap} ) => {
        setIsPending(true);
        try {
            console.log('fetch called')
            const res = await fetch(url, {
                method: method,
                mode: 'no-cors', 
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    ...headers,
                },
                //body: JSON.stringify(body)
            })
            console.log('done')
            console.log(res);
            if (!res.ok) {
                var contentType = res.headers.get('content-type')

                if (contentType && contentType.indexOf('application/json') !== -1) {
                    const data = await res.json();
                    throw Error(`Error making request: ${res.status.toString()}: ${data.error}`)
                } else {
                    throw Error(`Error making request: ${res.status.toString()}`)
                }
            }
            const data = await res.json();
            setData(data);
            console.log(data)
            setIsPending(false);
            setError(null);
            return data as Response
        } catch (err : any) {
            console.log(err);
            //err = err as StringMap;
            setIsPending(false);
            setError(err as string) //err?.message ? err.message : 'Unknown error');
            return false
        }
    }
    return { data, isPending, error, makeRequest }
}

export default useFetch;