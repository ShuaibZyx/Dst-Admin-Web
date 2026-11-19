import React, {useEffect, useState} from "react";
import {Button, Divider, message, Tabs} from "antd";
import {SaveOutlined} from '@ant-design/icons';
import {useTranslation} from "react-i18next";
import {useParams} from "react-router-dom";
import {ProForm} from "@ant-design/pro-components";
import ClusterIni from "./ClusterIni/index";
import Adminlist from "./Adminlist.tsx";
import Whitelist from "./Whitelist.tsx";
import Blacklist from "./Blacklist.tsx";
import {getClusterIniApi, saveClusterIniApi} from "../../api/levelApi";
import {dstGameMod} from "../../types/dst.ts";
import {FormSkeleton} from "../../components/Skeletons.jsx";

// 房间设置：扁平六页签（弃 tab 套 tab，同世界设置方案）——
// 房间设置/网络设置/Steam设置（cluster.ini 三分区，共享一个 ProForm 实例，保存按钮全量写回）
// ‖ 管理员/白名单/黑名单（名单管理，各自保存）
const FORM_TABS = ['base', 'shard', 'steam']

// 页签滚动容器（同世界设置 tabScrollWrap）：表单分区/名单统一一层滚动
// padding 吸收 antd Row gutter(16) 的负边距、overflowX hidden 双保险防横向滚动条
const tabScrollWrap = (children) => (
    <div className={'scrollbar'} style={{
        height: 'calc(100vh - 330px)',
        minHeight: '400px',
        padding: '0 8px',
        overflowY: 'auto',
        overflowX: 'hidden',
    }}>
        {children}
    </div>
)

// 权限钩子占位（同原 ClusterIni 内）：网络/Steam 分区的显示闸门
const has = () => true

export default () => {
    const {t} = useTranslation()
    const {cluster} = useParams()
    const [form] = ProForm.useForm()
    const [loading, setLoading] = useState(true)
    const [choose, setChoose] = useState('survival')
    const [activeKey, setActiveKey] = useState('base')

    // cluster.ini 全量加载：三分区共享同一份表单数据（一个保存按钮写全部）
    useEffect(() => {
        setLoading(true)
        getClusterIniApi(cluster || '')
            .then((resp) => {
                if (resp.code === 200) {
                    const serverData = resp.data.cluster
                    const formValues = {...serverData, cluster_token: resp.data.token}
                    // 未知游戏模式按"自定义"处理（原 ClusterIni 同款）
                    if (!dstGameMod.some(item => item.name === serverData.game_mode)) {
                        formValues.customization_mode = serverData.game_mode
                        formValues.game_mode = 'customization'
                    }
                    form.setFieldsValue(formValues)
                    setChoose(formValues.game_mode)
                } else {
                    message.warning(t('cluster.fetch.error'))
                }
                setLoading(false)
            })
            .catch((error) => {
                console.error('load cluster ini failed:', error)
                message.error(t('cluster.fetch.error'))
                setLoading(false)
            })
    }, [cluster, form, t])

    // 全量保存：三个分区的字段都在同一表单里，任意分区点保存即整体写回
    const onFinish = async (values) => {
        try {
            const clusterValues = {...values}
            if (clusterValues.customization_mode) {
                clusterValues.game_mode = clusterValues.customization_mode
            }
            const body = {
                cluster: clusterValues,
                token: values.cluster_token
            }
            if (body.cluster.cluster_description) {
                body.cluster.cluster_description = body.cluster.cluster_description.replace(/\n/g, '')
            }
            const resp = await saveClusterIniApi(cluster || '', body)
            if (resp.code === 200) {
                message.success(t('cluster.save.ok'))
            } else {
                message.warning(t('cluster.save.error'))
                if (resp.msg) {
                    message.warning(resp.msg)
                }
            }
            return true
        } catch (error) {
            console.error('save cluster ini failed:', error)
            message.error(t('cluster.save.error'))
            return false
        }
    }

    const items = [
        {
            key: 'base', label: t('cluster.BaseSetting'), forceRender: true,
            children: tabScrollWrap(
                <ClusterIni onlyTab="base" form={form} onFinish={onFinish} choose={choose} onChoose={setChoose}/>),
        },
        ...(has() ? [{
            key: 'shard', label: t('cluster.ShardSetting'), forceRender: true,
            children: tabScrollWrap(<ClusterIni onlyTab="shard" form={form} onFinish={onFinish}/>),
        }] : []),
        ...(has() ? [{
            key: 'steam', label: t('cluster.SteamSetting'), forceRender: true,
            children: tabScrollWrap(<ClusterIni onlyTab="steam" form={form} onFinish={onFinish}/>),
        }] : []),
        // 分隔竖线：集群配置（表单三分区）与名单管理的分界（同世界设置的分组样式）
        {
            key: 'adminlist', label: <span className="tab-group-divider">{t('menu.home.adminlist')}</span>,
            children: tabScrollWrap(<Adminlist/>),
        },
        {key: 'whitelist', label: t('menu.home.whitelist'), children: tabScrollWrap(<Whitelist/>)},
        {key: 'blacklist', label: t('menu.home.blacklist'), children: tabScrollWrap(<Blacklist/>)},
    ]

    return (<>
        {loading ? <FormSkeleton fields={8}/> : (
            <Tabs className="content-fade" items={items} activeKey={activeKey} onChange={setActiveKey} destroyInactiveTabPane={false}/>
        )}
        {/* 保存按钮只跟表单三分区走（名单各自保存）；与原布局一致放底部 */}
        {!loading && FORM_TABS.includes(activeKey) && (
            <>
                <Divider/>
                <Button icon={<SaveOutlined/>} type="primary" onClick={() => form.submit()}>
                    {t('cluster.save')}
                </Button>
            </>
        )}
    </>)
}
