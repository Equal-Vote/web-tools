import { Route, BrowserRouter as Router, Routes } from "react-router-dom"
import MailchimpTools from "./MailchimpTools"
import EventFinder from "./EventFinder"

export default () => {

    return <Router>
        <Routes>
            <Route path='/mailchimp' element={<MailchimpTools/>} />
            <Route path='/mailchimp/event_finder' element={<EventFinder/>} />
        </Routes>
    </Router>
}
