import { Route, HashRouter as Router, Routes } from "react-router-dom"
import MailchimpTools from "./MailchimpTools"
import EventFinder from "./EventFinder"

export default () => {

    return <Router>
        <Routes>
            <Route path='/' element={<MailchimpTools/>} />
            <Route path='/event_finder' element={<EventFinder/>} />
        </Routes>
    </Router>
}
