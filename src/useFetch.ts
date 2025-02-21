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
const useFetch = <Message, Response>(url: string, method: 'get' | 'post' | 'put' | 'delete', headers?: Object) => {
    const [isPending, setIsPending] = useState(false)
    const [error, setError] = useState<any>(null)
    const [data, setData] = useState<string | null>(null)

    const makeRequest = async (data?: Message) => {
        const options = {
            method: method,
            headers: {
                'Accept': 'text/html',
                'Content-Type': 'text/html',
            },
            body: JSON.stringify(data)
        }
        setIsPending(true);
        try {
            const res = await fetch(url, options)
            if (!res.ok) {
                var contentType = res.headers.get('content-type')

                if (contentType && contentType.indexOf('application/json') !== -1) {
                    const data = await res.text();
                    throw Error(`Error making request: ${res.status.toString()}: ${data.error}`)
                } else {
                    throw Error(`Error making request: ${res.status.toString()}`)
                }
            }
            const data = await res.text();
            setData(data);
            setIsPending(false);
            setError(null);
            
            return data as Response
        } catch (err: any) {
            setIsPending(false);
            setError(err.message ? err.message : 'Unknown error');
            return false
        }
    }
    return { data, isPending, error, makeRequest }
}

export default useFetch;