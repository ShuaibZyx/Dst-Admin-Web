import {Alert, Button, Col, Row, Select, Space, Tag, Tooltip, theme, Skeleton} from 'antd';

import {QuestionCircleOutlined} from '@ant-design/icons';
import React, {useEffect, useState} from 'react';

import {useTranslation} from "react-i18next";
import {useParams, useNavigate} from "react-router-dom";
import {archiveApi} from '../../../api/gameApi.jsx';

import style from "../../Home/DstEomj/index.module.css";
import HiddenText from "../../Home/HiddenText/HiddenText";
import {TableSkeleton} from "../../../components/Skeletons.jsx";
import {dstSeason, dstSegs, getDstMod} from "../../../utils/dst.js";
import {usePlayerListStore} from "../../../store/usePlayerListStore.tsx";
import {useLevelsStore} from "../../../store/useLevelsStore.tsx";
import {ProCard, ProForm, ProFormText} from "@ant-design/pro-components";
import CreateBackUpBtn from "../OpBtnGroup/CreateBackUpBtn.jsx";
import StartStopBtns from "../OpBtnGroup/StartStopBtns";
import UpdateGameBtn from "../OpBtnGroup/UpdateGameBtn.jsx";
import {readDstConfigSync, writeDstConfigSync, getClusters} from "../../../api/dstConfigApi.jsx";
import {getMyModInfoList} from "../../../api/modApi.jsx";


export default () => {

    const {t} = useTranslation()
    const {token} = theme.useToken()

    const {cluster} = useParams()
    const [archive, setArchive] = useState({})
    const [loading, setLoading] = useState(true)

    const playerList = usePlayerListStore((state) => state.playerList)
    // 存档切换器(自面板顶部迁入,置于信息表第一行):下拉即切换到对应存档的面板路由
    const navigate = useNavigate()
    const [clusters, setClusters] = useState([])
    const [currentCluster, setCurrentCluster] = useState('')
    // 模组概况:总数 + 可更新数(信息卡下方展示)
    const [modSummary, setModSummary] = useState({total: 0, updatable: 0})
    // 存储概要:世界存档大小 + 备份数量/总大小
    const [storage, setStorage] = useState({worldBytes: 0, backupCount: 0, backupBytes: 0})

    // 统一并行拉取:存档列表/模组概况/存储概要/房间信息——一个 effect 收敛,失败互不影响
    useEffect(() => {
        (async () => {
            const [cl, mods, stor, arc] = await Promise.allSettled([
                getClusters(),
                getMyModInfoList(cluster),
                fetch('/api/game/storage/summary', {headers: {Cluster: cluster || ''}}).then(r => r.json()),
                archiveApi(cluster),
            ])
            if (cl.status === 'fulfilled') {
                const resp = cl.value
                const list = Array.isArray(resp) ? resp : (resp?.clusters || resp?.data?.clusters || [])
                setClusters(list)
                // current=dst_config 配置的默认存档：无 URL 参数时下拉显示它的真实名
                if (!Array.isArray(resp) && resp?.current) setCurrentCluster(resp.current)
            }
            if (mods.status === 'fulfilled' && mods.value?.code === 200 && Array.isArray(mods.value.data)) {
                setModSummary({
                    total: mods.value.data.length,
                    updatable: mods.value.data.filter(m => m.update).length,
                })
            }
            if (stor.status === 'fulfilled' && stor.value?.code === 200 && stor.value.data) {
                setStorage(stor.value.data)
            }
            if (arc.status === 'fulfilled') {
                setArchive(arc.value.data)
            }
            setLoading(false)
        })()
    }, [cluster])

    const fmtBytes = (b) => {
        if (!b) return '0B'
        const u = ['B', 'KB', 'MB', 'GB', 'TB']
        let i = 0
        let v = b
        while (v >= 1024 && i < u.length - 1) { v /= 1024; i += 1 }
        return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)}${u[i]}`
    }

    // 运行状态徽标（与世界开关同源）：一眼看清世界跑没跑，不再从按钮文案猜状态
    const levels = useLevelsStore((state) => state.levels)
    const runningCount = levels.filter(l => l.status).length
    const pendingOps = useLevelsStore((state) => state.pendingOps)

    function getTimeStatus(daysElapsedInSeason, daysLeftInSeason) {
        const totalDays = daysElapsedInSeason + daysLeftInSeason;
        const thresholdEarly = totalDays / 3;

        if (daysElapsedInSeason <= thresholdEarly) {
            return t('panel.dayPhase.early');
        }
        if (daysLeftInSeason < thresholdEarly) {
            return t('panel.dayPhase.late');
        }
        return '';
    }

    const [dstConfig, setDstConfig] = useState({})
    useEffect(() => {
        // 获取配置文件
        readDstConfigSync()
            .then(data => {
                setDstConfig(data.data)
            })
    }, [])

    function getSeasonInfo() {
        return (
            <span translate="no">
                {t('panel.archive.dayCount', {day: archive?.meta?.Clock?.Cycles + 1})}/{dstSegs[archive?.meta?.Clock?.Phase]} {getTimeStatus(archive?.meta?.Seasons?.ElapsedDaysInSeason, archive?.meta?.Seasons?.RemainingDaysInSeason)}{dstSeason[archive?.meta?.Seasons?.Season]}({archive?.meta?.Seasons?.ElapsedDaysInSeason}/{archive?.meta?.Seasons?.ElapsedDaysInSeason + archive?.meta?.Seasons?.RemainingDaysInSeason})
            </span>
        )
    }

    // 兜底：数据未就绪时给骨架屏，避免面板首卡长时间空白
    if (loading) return <TableSkeleton rows={5} cols={4}/>

    return (
        <>
            <ProCard
                title={<Space size={8}>
                    {t('panel.serverInfo')}
                    {levels.length > 0 && (runningCount > 0
                        ? <Tag color="green">{t('panel.runningCount', {running: runningCount, total: levels.length})}</Tag>
                        : <Tag>{t('panel.allStopped')}</Tag>)}
                </Space>}
                extra={<Space>
                    <StartStopBtns/>
                    <UpdateGameBtn/>
                </Space>}
            >
                {dstConfig.beta !== 1 && archive?.version !== archive?.lastVersion && archive?.version !== 0 &&
                    <Alert
                        action={[
                            <>
                                <a target={'_blank'}
                                   href={'https://forums.kleientertainment.com/game-updates/dst/'}
                                   key="list-loadmore-edit"
                                   rel="noreferrer">
                                    {t('panel.new.version.read')}
                                </a>
                            </>
                        ]}
                        message={t('panel.has.new.version')} type="warning" showIcon closable/>}
                {archive?.version === 0 &&
                    <Alert
                        style={{marginBottom: 12}}
                        message={t('panel.dst.install.fail')}
                        type="info"
                        showIcon
                        closable/>
                }

                <style>{`
                    .game-info-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 2px 32px; }
                    .game-info-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 7px 4px; border-bottom: 1px dashed rgba(128,128,128,0.18); min-width: 0; }
                    .game-info-label { color: rgba(128,128,128,0.95); font-size: 13px; white-space: nowrap; }
                    .game-info-value { font-size: 14px; text-align: right; display: inline-flex; align-items: center; gap: 8px; min-width: 0; max-width: 100%; white-space: normal; word-break: break-all; }
                    .game-info-value .ant-typography { margin-bottom: 0; }
                    .game-shard-strip { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 16px; }
                    .game-info-item-wide { grid-column: 1 / -1; }
                    .game-info-label-strong { color: var(--ant-primary-color, #1677ff); font-weight: 600; }
                    .game-shard-chip { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; background: rgba(128,128,128,0.10); min-width: 0; }
                    .game-shard-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(128,128,128,0.45); flex: none; }
                    .game-shard-dot[data-on="true"] { background: #52c41a; box-shadow: 0 0 6px rgba(82,196,26,0.7); animation: dstDotPulse 2s ease-in-out infinite; }
                    .game-shard-dot[data-pending="true"] { background: #faad14; box-shadow: 0 0 6px rgba(250,173,20,0.7); animation: dstDotPulse 1s ease-in-out infinite; }
                    .game-shard-name { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                    .game-shard-meta { margin-left: auto; font-size: 12px; color: rgba(128,128,128,0.95); white-space: nowrap; }
                `}</style>
                {/* 存档切换：独占一行（label 在前 + 细小下拉，不与信息表混排） */}
                <div style={{marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8}}>
                    <span style={{whiteSpace: 'nowrap', color: token.colorPrimary, fontWeight: 600}}>{t('panel.switchSave')}:</span>
                    <Select
                        value={cluster || currentCluster || clusters[0] || ''}
                        options={clusters.map(c => ({value: c, label: c}))}
                        onChange={(v) => {
                            // 选中即设为默认存档（写入 dst_config 的 cluster 字段——服务端持久化，
                            // 换浏览器/清缓存也记得）；路由是 /:cluster/:name/panel——name 段面板不使用
                            writeDstConfigSync({cluster: v}).catch(() => {})
                            setCurrentCluster(v)
                            navigate(v ? `/${v}/${v}/panel` : '/panel')
                        }}
                        size="small"
                        style={{flex: 1}}
                    />
                </div>
                <div className="game-info-grid">
                    <div className="game-info-item">
                        <span className="game-info-label">{t('panel.roomName')}</span>
                        <span className="game-info-value">
                            {dstConfig.beta === 1 && (<Tag color={'orange'}>{t('panel.beta')}</Tag>)}
                            {archive.clusterName}
                        </span>
                    </div>
                    <div className="game-info-item">
                        <span className="game-info-label">{t('panel.gameMod')}</span>
                        <span className="game-info-value">{getDstMod(archive.gameMod)}</span>
                    </div>
                    <div className="game-info-item">
                        <span className="game-info-label">{t('panel.mods')}</span>
                        <span className="game-info-value">{archive.mods || 0}</span>
                    </div>
                    <div className="game-info-item">
                        <span className="game-info-label">{t('panel.dayProgress')}</span>
                        <span className="game-info-value">{getSeasonInfo()}</span>
                    </div>
                    <div className="game-info-item">
                        <span className="game-info-label">{t('panel.playerCount')}</span>
                        <span className="game-info-value">{`${playerList?.length}/${archive.maxPlayers}`}</span>
                    </div>
                    <div className="game-info-item">
                        <span className="game-info-label">{t('panel.version')}</span>
                        <span className="game-info-value">{archive.version || "--"} / {archive.lastVersion || "--"}</span>
                    </div>
                    <div className="game-info-item">
                        <span className="game-info-label">{t('panel.ipConnect')}</span>
                        <span className="game-info-value">
                            <HiddenText text={archive.ipConnect}/>
                            <Tooltip placement="topLeft" title={t('panel.portTooltip', {port: archive.port})}>
                                <QuestionCircleOutlined/>
                            </Tooltip>
                        </span>
                    </div>
                    <div className="game-info-item">
                        <span className="game-info-label">{t('panel.password')}</span>
                        <span className="game-info-value">
                            <HiddenText text={archive?.clusterPassword}/>
                        </span>
                    </div>
                    <div className="game-info-item">
                        <span className="game-info-label">{t('panel.storage.worlds')}</span>
                        <span className="game-info-value">{`${levels.length} · ${fmtBytes(storage.worldBytes)}`}</span>
                    </div>
                    <div className="game-info-item">
                        <span className="game-info-label">{t('panel.storage.backups')}</span>
                        <span className="game-info-value">{`${storage.backupCount} · ${fmtBytes(storage.backupBytes)}`}</span>
                    </div>
                    <div className="game-info-item game-info-item-wide">
                        <span className="game-info-label">{t('panel.mods.updateStatus')}</span>
                        <span className="game-info-value">
                            {modSummary.updatable > 0
                                ? <Tag color="orange" style={{marginInlineEnd: 0}}>{t('mod.update.pending.count', {count: modSummary.updatable})}</Tag>
                                : <Tag color="green" style={{marginInlineEnd: 0}}>{t('panel.mods.allLatest')}</Tag>}
                        </span>
                    </div>
                </div>

                {/* 分片状态条:各层世界运行状态一览 */}
                {levels.length > 0 && (
                    <div className="game-shard-strip">
                        {levels.map(l => {
                            const pending = pendingOps[l.uuid || l.key]
                            return (
                                <div className="game-shard-chip" key={l.uuid || l.key}>
                                    <span className="game-shard-dot" data-on={String(!!l.status)} data-pending={String(!!pending)}/>
                                    <span className="game-shard-name">{l.levelName}</span>
                                    <span className="game-shard-meta">
                                        {pending
                                            ? (pending.op === 'starting' ? t('panel.starting') : t('panel.stopping'))
                                            : l.status
                                                ? `${t('panel.run')} · CPU ${Math.round(Number(l.Ps?.cpuUage || 0))}% · ${Math.round((l.Ps?.RSS || 0) / 1024)}MB`
                                                : t('panel.stop')}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </ProCard>
        </>
    )
}