import React, {Suspense} from 'react';
import {Navigate, useRoutes} from 'react-router-dom';
import {Spin} from 'antd';

import Layout from './layout/index';
import Page404 from './pages/Page404/index';

// 路由级代码分割：页面组件懒加载，避免全部页面打进一个巨型首屏包
const Login = React.lazy(() => import('./pages/Login/index.tsx'));
const Backup = React.lazy(() => import('./pages/Backup/index.jsx'));
const Setting = React.lazy(() => import('./pages/System/index.jsx'));
const Github = React.lazy(() => import('./pages/Github/index.jsx'));
const Panel = React.lazy(() => import('./pages/Panel/index.jsx'));
const Begin = React.lazy(() => import('./pages/Begin/index.jsx'));
const Link = React.lazy(() => import('./pages/WebLink/index.jsx'));
const Help = React.lazy(() => import('./pages/Help/index.jsx'));
const Mod = React.lazy(() => import('./pages/Mod/index.jsx'));
const PlayerLog = React.lazy(() => import('./pages/PlayerLog/index.jsx'));
const Home = React.lazy(() => import('./pages/Home/index.jsx'));
const DstMapData = React.lazy(() => import('./pages/DstData/DstMapData'));
const UserProfile = React.lazy(() => import('./layout/UserProfile.jsx'));
const Level2 = React.lazy(() => import('./pages/Level2/index'));
const ModViewer = React.lazy(() => import('./pages/ModViewer/index'));

const loading = (
    <div style={{display: 'flex', justifyContent: 'center', padding: 48}}>
        <Spin size="large"/>
    </div>
);

export default function Routes() {
    return (
        <Suspense fallback={loading}>
            {useRoutes([
                {
                    path: '/',
                    element: <Layout/>,
                    children: [
                        {element: <Navigate to="/panel"/>, index: true},
                        {path: 'playerLog', element: <PlayerLog/>},
                        {path: 'mod', element: <Mod/>},
                        {path: 'panel', element: <Panel/>},
                        {path: ':cluster/:name/panel', element: <Panel/>},
                        {path: 'home', element: <Home/>},
                        {
                            path: 'level',
                            children: [
                                {index: true, element: <Level2/>},
                                {path: 'genMap', element: <DstMapData/>},
                            ]
                        },
                        // 旧地址兼容（统一单数前的路径）
                        {path: 'levels', element: <Navigate to="/level" replace/>},
                        {path: 'levels/genMap', element: <Navigate to="/level/genMap" replace/>},
                        {path: 'levels/levels', element: <Navigate to="/level" replace/>},
                        {path: 'level2', element: <Navigate to="/level" replace/>},
                        {path: 'backup', element: <Backup/>},
                        {path: 'setting', element: <Setting/>},
                        {path: 'help', element: <Help/>},
                        {path: 'userProfile', element: <UserProfile/>},
                        {path: 'link', element: <Link/>},
                        {path: '404', element: <Page404/>},
                        {path: 'mod2', element: <ModViewer/>},
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
            ])}
        </Suspense>
    );
}
