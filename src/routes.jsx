import {Navigate, useRoutes} from 'react-router-dom';

import Login from './pages/Login/index.tsx';

import Backup from './pages/Backup/index.jsx';
import Setting from './pages/System/index.jsx';
import Github from './pages/Github/index.jsx';
import Panel from './pages/Panel/index.jsx';
import Begin from './pages/Begin/index.jsx';
import Link from "./pages/WebLink/index.jsx";

import Help from "./pages/Help/index.jsx";

import Levels from "./pages/Levels/index.jsx";
import Mod from "./pages/Mod/index.jsx";
import PlayerLog from "./pages/PlayerLog/index.jsx";
import Layout from "./layout/index";
import Home from "./pages/Home/index.jsx";
import Page404 from "./pages/Page404/index";
import DstMapData from "./pages/DstData/DstMapData";
import UserProfile from "./layout/UserProfile.jsx";
import Level2 from "./pages/Level2/index";
import ModViewer from "./pages/ModViewer/index";

export default function Routes() {
    return useRoutes([
        {
            path: '/',
            element: <Layout/>,
            children: [
                {element: <Navigate to="/panel"/>, index: true,},
                {path: 'playerLog', element: <PlayerLog/>},
                {path: 'mod', element: <Mod/>},
                {path: 'panel', element: <Panel/>},
                {path: ':cluster/:name/panel', element: <Panel/>},
                {path: 'home', element: <Home/>},
                {
                    path: 'levels',
                    children: [
                        {path: 'levels', element: <Level2/>},
                        {path: 'genMap', element: <DstMapData/>},
                    ]
                },
                {path: 'backup', element: <Backup/>},
                {path: 'setting', element: <Setting/>},
                {path: 'help', element: <Help/>},
                {path: 'userProfile', element: <UserProfile/>},
                {path: 'link', element: <Link/>},
                {path: '404', element: <Page404/>},
                {path: 'level2', element: <Level2 />},
                {path: 'mod2', element: <ModViewer />},
            ],
        },
        {
            path: 'login',
            element: <Login/>,
        },
        {
            path: 'init',
            element: <Begin/>,
        },
        {
            path: '*',
            element: <Navigate to="/404" replace/>,
        },
    ]);
}
