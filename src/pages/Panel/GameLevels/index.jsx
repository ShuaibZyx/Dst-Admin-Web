import React, {useEffect, useState} from 'react';
import {useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Skeleton, 
    Avatar, Button,
    Card,
    Flex,
    List,
    message,
    Popconfirm,
    Progress,
    Space,
    Select,
    Spin,
    Modal,
    Switch,
    Tag,
    Tooltip
} from 'antd';


import {PictureOutlined, SyncOutlined} from "@ant-design/icons";
import {getLevelStatusApi, startAllLevelApi, startLevelApi} from "../../../api/level.jsx";
import {getClusters, readDstConfigSync, writeDstConfigSync} from "../../../api/dstConfigApi.jsx";
import CreateBackUpBtn from "../OpBtnGroup/CreateBackUpBtn";
import {useLevelsStore} from "../../../store/useLevelsStore.tsx";
import {useLiveStream} from "../../../hooks/useLiveStream.js";
import {ProCard} from "@ant-design/pro-components";
import {useThemeConfigStore} from "../../../store/useThemeConfigStore.tsx";


function formatData(data, num) {
    const numValue = Number(data)
    return Number.isFinite(numValue) ? numValue.toFixed(num) : (0).toFixed(num)
}

function roundTo(value, digits = 1) {
    const numValue = Number(value)
    if (!Number.isFinite(numValue)) return 0
    const factor = 10 ** digits
    return Math.round(numValue * factor) / factor
}


export default () => {

    // cluster 需先于任何使用它的 hook 声明(useEffect 依赖数组在渲染期求值,TDZ)
    const {cluster} = useParams()
    const levels = useLevelsStore((state) => state.levels)
    const setLevels = useLevelsStore((state) => state.setLevels)

    const normalizeLevels = (data) => {
        return data.map(level => {
            const item = {
                key: level.uuid,
                uuid: level.uuid,
                levelName: level.levelName,
                location: level.location || t('level.unknown'),
                ps: level.ps,
                Ps: level.Ps,
                status: level.status,
                startedAt: level.started_at
            }
            return item
        })
    }

    const refreshingRef = React.useRef(false)
    const refreshLevelStatus = () => {
        // 防堆积：上一次查询未返回时跳过本轮
        if (refreshingRef.current) return Promise.resolve([])
        refreshingRef.current = true
        return getLevelStatusApi()
                .then(resp => {
                    if (resp.code === 200) {
                        const items = normalizeLevels(resp.data)
                        setLevels(items)
                        return items
                    }
                    return []
                })
                .catch(error => {
                    console.log(error)
                    // 全静默：状态主数据源是 SSE 流，这里的拉取（操作后确认）失败不再弹窗打扰
                    return []
                })
                .finally(() => {
                    refreshingRef.current = false
                })
    }

    // 世界状态走聚合 SSE（useLiveStream 多组件共享一条连接）；页面隐藏自动释放
    useEffect(() => {
        refreshLevelStatus() // 建连前先拉一次即时数据
    }, [])
    useLiveStream({
        cluster,
        level: '',
        onStatus: (data) => setLevels(normalizeLevels(data)),
    })

    // 总启动/停止按钮操作后立即刷新开关状态（联动，不等 3 秒轮询）
    const statusTick = useLevelsStore((state) => state.statusTick)
    useEffect(() => {
        if (statusTick > 0) refreshLevelStatus()
    }, [statusTick])

    const [spin, setSpin] = useState(false)
    // 启停进行中(store 共享)：锁定到真实状态确认(SSE 达标自动解锁),5 分钟超时兜底
    const pendingOps = useLevelsStore((state) => state.pendingOps)
    const setPendingOp = useLevelsStore((state) => state.setPendingOp)
    const clearPendingOps = useLevelsStore((state) => state.clearPendingOps)
    // 地图预览弹窗
    const [mapLevel, setMapLevel] = useState(null)
    const [mapTs, setMapTs] = useState(0)
    const [mapImgErr, setMapImgErr] = useState(false)
    const {t} = useTranslation()

    const statusOnClick = (checked, event, levelName, uuid) => {
        // 停止需确认，启动直接执行
        if (!checked) {
            Modal.confirm({
                title: t('panel.start.down'),
                content: t('panel.stop.confirm.desc', {levelName}),
                okText: t('panel.y'),
                cancelText: t('panel.n'),
                onOk: () => doStatus(checked, event, levelName, uuid),
            })
            return
        }
        doStatus(checked, event, levelName, uuid)
    }

    const doStatus = async (checked, event, levelName, uuid) => {
        const prefix = checked ? t('panel.start.up') : t('panel.start.down')
        setPendingOp(uuid, checked ? 'starting' : 'stopping')
        try {
            const resp = await startLevelApi(cluster || "", uuid, checked)
            if (resp.code !== 200) {
                // 失败(含 409 操作进行中)：立即解锁并提示
                message.error(`${prefix} ${levelName}${t('panel.failed')} ${resp.msg || ''}`)
                clearPendingOps([uuid])
                await refreshLevelStatus()
                return
            }
            // 成功：保持锁定,状态流确认真实状态后自动解锁(store.setLevels 内嵌确认)。
            // 过程看启动日志的进度条,失败会红色打点。
        } catch (error) {
            console.log(error)
            message.error(`${prefix} ${levelName}${t('panel.failed')}`)
            clearPendingOps([uuid])
            await refreshLevelStatus()
        }
    }




    const {themeConfig} = useThemeConfigStore();

    function GetLevelIcon(level) {
        // 文字图标：世界名首字（按 location 取色），替代 emoji
        const location = level?.location || ''
        const name = level?.levelName || '?'
        return (
            <Avatar
                shape="square"
                size={32}
                style={{backgroundColor: themeConfig.colorPrimary, color: '#fff', fontWeight: 600}}
            >
                {name.charAt(0).toUpperCase()}
            </Avatar>
        )
    }

    return (
        <ProCard title={<span style={{whiteSpace: 'nowrap'}}>{t('panel.levelList')}</span>}
                 extra={<Space wrap>
                     <CreateBackUpBtn disabled={Object.keys(pendingOps).length > 0}/>
                 </Space>}
        >

            <Skeleton loading={spin} active>
                <List
                    pagination={false}
                    dataSource={levels}
                    renderItem={(record) => (
                        <List.Item>
                            <Card style={{width: '100%'}} className={'dst'}>
                                <div>
                                    <Flex justify={"space-between"} align={"center"}>
                                        <div>
                                            <Space>
                                                <div>{GetLevelIcon(record)}</div>
                                                <div>
                                                    {pendingOps[record.uuid]?.op === 'starting' && <Tag color={'processing'} bordered={false}>{record.levelName} · {t('panel.starting')}</Tag>}
                                                    {pendingOps[record.uuid]?.op === 'stopping' && <Tag color={'warning'} bordered={false}>{record.levelName} · {t('panel.stopping')}</Tag>}
                                                    {!pendingOps[record.uuid] && record.status && <Tag color={'green'} bordered={false}>{record.levelName}</Tag>}
                                                    {!pendingOps[record.uuid] && !record.status && <Tag color={'default'} bordered={false}>{record.levelName}</Tag>}
                                                    <div style={{fontSize: 12}}>
                                                        <>
                                                            <span>{`${formatData((record.Ps !== undefined ? record.Ps.RSS : 0) / 1024, 2)}MB`}</span>
                                                        </>
                                                    </div>
                                                </div>
                                            </Space>
                                        </div>
                                        <div style={{display: 'flex', alignItems: 'center'}}>
                                            <Space size="middle" wrap>
                                                <Button size="small" icon={<PictureOutlined/>} onClick={async () => {
                                                    setMapImgErr(false)
                                                    // 先生成再取图：地图只在生成后落盘（旧 DstMapData 页下线后无人触发生成）
                                                    await fetch(`/api/dst/map/gen?levelName=${record.uuid}`).catch(() => null)
                                                    setMapLevel(record)
                                                    setMapTs(Date.now())
                                                }}>{t('panel.map')}</Button>
                                                <Switch checked={pendingOps[record.uuid]?.op === 'starting' ? true : pendingOps[record.uuid]?.op === 'stopping' ? false : record.status}
                                                        loading={Boolean(pendingOps[record.uuid])}
                                                        disabled={Boolean(pendingOps[record.uuid])}
                                                        checkedChildren={pendingOps[record.uuid]?.op === 'starting' ? t('panel.starting') : t('panel.run')}
                                                        unCheckedChildren={pendingOps[record.uuid]?.op === 'stopping' ? t('panel.stopping') : t('panel.stop')}
                                                        onClick={(checked, event) => {
                                                            statusOnClick(checked, event, record.levelName, record.uuid)
                                                        }}
                                                />
                                            </Space>
                                        </div>
                                    </Flex>
                                </div>
                            </Card>
                        </List.Item>
                    )}
                />
            </Skeleton>

            {/* 地图预览弹窗:每世界看自己的地图 */}
            <Modal title={(
                    <Space>
                        <span>{mapLevel ? `${mapLevel.levelName} · ${t('panel.map')}` : t('panel.map')}</span>
                        <Button size="small" icon={<SyncOutlined/>} onClick={async () => {
                            setMapImgErr(false)
                            await fetch(`/api/dst/map/gen?levelName=${mapLevel.uuid}`).catch(() => null)
                            setMapTs(Date.now())
                        }}>{t('panel.map.refresh')}</Button>
                    </Space>
                )}
                   open={!!mapLevel} onCancel={() => setMapLevel(null)} footer={null} width={720}>
                {mapLevel && (
                    <div style={{textAlign: 'center'}}>
                        {!mapImgErr && <img alt={mapLevel.levelName} style={{maxWidth: '100%', maxHeight: '60vh', animation: 'dstFadeIn 0.4s ease both'}}
                             src={`/api/dst/map/image?levelName=${mapLevel.uuid}&t=${mapTs}`}
                             onError={() => setMapImgErr(true)}/>}
                        {mapImgErr && <div style={{padding: 24}}>{t('panel.map.empty')}</div>}
                    </div>
                )}
            </Modal>
        </ProCard>
    )
}