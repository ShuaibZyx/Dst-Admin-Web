import React from "react";
import {Tabs} from "antd";
import {useTranslation} from "react-i18next";
import ClusterIni from "./ClusterIni/index";
import Adminlist from "./Adminlist.tsx";
import Whitelist from "./Whitelist.tsx";
import Blacklist from "./Blacklist.tsx";

// 房间设置：房间设置 / 管理员 / 白名单 / 黑名单 合并为一页多 tab
export default () => {
    const {t} = useTranslation()
    const items = [
        {key: 'clusterIni', label: t('menu.home.clusterIni'), children: <ClusterIni/>},
        {key: 'adminlist', label: t('menu.home.adminlist'), children: <Adminlist/>},
        {key: 'whitelist', label: t('menu.home.whitelist'), children: <Whitelist/>},
        {key: 'blacklist', label: t('menu.home.blacklist'), children: <Blacklist/>},
    ]
    return <Tabs defaultActiveKey="clusterIni" items={items}/>
}
