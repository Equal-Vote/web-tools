import { Button } from "@mui/material";
import { ALL_MEMBERS_API, ReqFunc, StateReporter } from "./util";

export default ({req, state} : {req: ReqFunc, state: StateReporter}) => {

    const onSubmit = async () => {
        state.pending()
        
        // Init Structures
        const headers = ['a', 'b', 'c'] as const;
        let items = [{
            'a': '456',
            'b': '456',
            'c': '456',
        }, {
            'a': 'asdf',
            'b': 'asdf',
            'c': 'asdf',
        }];

        // Populate Items
        //req(
        //    ALL_MEMBERS_API,
        //    'GET',
        //)
        //.then(res => res ? res.json() : (new Response()).json())
        //.then(data => {
        //    console.log(data)
        //    state.success()
        //})

        // Download File
        const url = URL.createObjectURL(new Blob([
            // TODO: figure out how to escape items with comma or quote
            `${headers.join(',')}\n${items.map((item) => headers.map(h => item[h]).join(',')).join('\n')}`
        ], {type: "text/csv"}));
        const link = document.createElement("a");
        link.download = "contacts.csv";
        link.href = url;
        link.click();
    }

    return <Button variant='contained' onClick={onSubmit} sx={{width: '200px'}}>Apply</Button>
}