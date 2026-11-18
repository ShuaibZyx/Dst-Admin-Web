import {
    AppstoreOutlined,
    CompassOutlined,
    DesktopOutlined,
    FolderOutlined,
    GithubOutlined,
    GlobalOutlined,
    HomeOutlined,
    SettingOutlined,
    SmileFilled, TeamOutlined,
} from '@ant-design/icons';
export default {
    route: {
        routes: [
            {
                path: '/panel',
                name: 'menu.panel',
                icon: <DesktopOutlined />,
            },
            {
                path: '/home',
                name: 'menu.home',
                icon: <HomeOutlined />,
            },
            {
                path: '/level',
                name: 'menu.levels',
                icon: <AppstoreOutlined />,
            },
            {
                path: '/mod',
                name: 'menu.mod',
                icon: <GlobalOutlined />,
            },
            {
                path: '/backup',
                name: 'menu.backup',
                icon: <FolderOutlined />,
            },
            {
                path: '/playerLog',
                name: 'menu.log',
                icon: <TeamOutlined />,
            },
            {
                path: '/setting',
                name: 'menu.setting',
                icon: <SettingOutlined />,
            },
            {
                path: '/help',
                name: 'menu.help',
                icon: <SmileFilled />,
            },
        ],
    },
    location: {
        pathname: '/panel',
    },
    appList: [
        {
            // icon: 'https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg',
            title: 'menu.appList.dstserverlist.title',
            desc: 'menu.appList.dstserverlist.desc',
            url: 'https://dstserverlist.top/',
            target: '_blank',
        },
        {
            // icon: 'https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg',
            title: 'menu.appList.ipRelay.title',
            desc: 'https://server.dstapi.com/server/',
            url: 'https://server.dstapi.com/server/',
            target: '_blank',
        },

    ],
};