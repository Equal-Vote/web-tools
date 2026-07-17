import { Route, HashRouter as Router, Routes } from "react-router-dom"
import WebTools from "./WebTools"
import EventFinder from "./EventFinder"
import Dashboard from "./Dashboard"

export default () => {

    return <Router>
        <Routes>
            <Route path='/' element={<WebTools/>} />
            <Route path='/event_finder' element={<EventFinder/>} />
            <Route path='/dashboard' element={<Dashboard/>} />
        </Routes>
    </Router>
}
