import React, {useEffect, useRef, useState} from 'react'
import {Alert, Button, Card, Divider, Drawer, Empty, Form, Input, message, Modal, Popconfirm, Progress, Space, Spin, Table, Tabs, Tag, Tooltip, Typography} from 'antd'
import {CloudDownloadOutlined, DeleteOutlined, DisconnectOutlined, ExportOutlined, EyeOutlined, LoadingOutlined, ReloadOutlined, StopOutlined, SyncOutlined} from '@ant-design/icons'
import {useTranslation} from 'react-i18next'
import {http} from '../../../utils/http'
import {deleteModInfo, getModInfo, updateModApi} from '../../../api/modApi.jsx'
import {doUpdateMod} from '../../../utils/modUpdate.js'
import {timestampToString} from '../../../utils/dateUitls'
import {renderBb} from '../../../utils/bbCode.jsx'
import {TableSkeleton, DetailSkeleton} from '../../../components/Skeletons.jsx'

// 我的订阅（Steam Workshop 资产库，跨存档）：表格版式。
// 顶部工具栏（同步订阅/下载模组/更新模组）；扫描到模组后自动逐条下载到系统模组路径。
// 逐条下载体现在表格行上：当前下载行自带进度条 + Spin 动效 + 按钮 loading（参照模组设置逐条更新）。
// 不可配置、不可启用（属存档模组管理）。
export default ({cluster, refreshKey}) => {
    const {t} = useTranslation()
    const [loading, setLoading] = useState(false)
    const [list, setList] = useState(null) // null=未同步
    const [open, setOpen] = useState(false)
    const [form] = Form.useForm()
    const [syncing, setSyncing] = useState(false)
    const [busyIds, setBusyIds] = useState([]) // 下载/更新中的行（锁定仅作用于这些行）
    const [detailRow, setDetailRow] = useState(null) // 详情抽屉
    const [oneByOne, setOneByOne] = useState(false)
    const stopRef = useRef(false)
    const [page, setPage] = useState(1)

    const pageSize = 12

    const loadList = () => {
        setLoading(true)
        http.get('/api/mod/subscription', {headers: {Cluster: cluster || ''}})
            .then(r => setList(r.data?.data || []))
            .catch(e => console.error(e))
            .finally(() => setLoading(false))
    }

    const markDownloaded = (modid) => {
        setList(prev => (prev || []).map(r => (r.Modid === modid ? {...r, downloaded: true} : r)))
    }

    const doSync = async () => {
        const values = await form.validateFields()
        setSyncing(true)
        try {
            const resp = await http.post('/api/mod/subscription/sync', values)
            if (resp.data?.code === 200) {
                message.success(t('mod.mySubs.syncOk', {count: resp.data?.data?.count ?? 0}))
                setOpen(false)
                await loadList()
                // 扫描到模组后执行逐条下载
                startDownloadAll()
            } else {
                message.error(resp.data?.msg || t('mod.mySubs.syncFail'))
            }
        } catch (e) {
            message.error(t('mod.mySubs.syncFail'))
        } finally {
            setSyncing(false)
        }
    }

    const addBusy = (id) => setBusyIds(prev => [...prev, id])
    const removeBusy = (id) => setBusyIds(prev => prev.filter(x => x !== id))

    const stopBatch = () => {
        stopRef.current = true
    }

    // 批量执行：进度落在表格行上，开始回第一页并自动跟随当前行；可随时停止，锁定仅作用于当前行
    const runBatch = async (targets, task) => {
        if (targets.length === 0) {
            message.info(t('mod.mySubs.dlFinish', {ok: 0, fail: 0}))
            return
        }
        stopRef.current = false
        setOneByOne(true)
        setPage(1) // 开始即回到第一页
        let ok = 0
        let fail = 0
        for (let i = 0; i < targets.length; i++) {
            if (stopRef.current) break
            const r = targets[i]
            const idx = (list || []).findIndex(x => x.Modid === r.Modid)
            if (idx >= 0) setPage(Math.floor(idx / pageSize) + 1) // 跟随当前行
            addBusy(r.Modid)
            try {
                // eslint-disable-next-line no-await-in-loop
                const okOne = await task(r)
                if (okOne) {
                    ok++
                    markDownloaded(r.Modid)
                } else {
                    fail++
                }
            } catch (e) {
                fail++
            }
            removeBusy(r.Modid)
        }
        setOneByOne(false)
        if (stopRef.current) message.info(t('mod.mySubs.dlStopped', {ok, fail}))
        else if (fail === 0) message.success(t('mod.mySubs.dlFinish', {ok, fail}))
        else message.warning(t('mod.mySubs.dlFinish', {ok, fail}))
    }

    // 下载模组：跳过已下载，串行下载到系统模组路径
    const startDownloadAll = () => runBatch(
        (list || []).filter(r => !r.downloaded),
        async (r) => {
            const data = await getModInfo('zh', cluster || '', r.Modid)
            return data?.code === 200
        },
    )

    // 更新模组：全部校验一遍（缺则补、旧则更）
    const startUpdateAll = () => runBatch(
        list || [],
        async (r) => {
            const res = await doUpdateMod(cluster || '', r.Modid, 'zh', () => {})
            return res.ok
        },
    )

    // 删除 = 清掉已下载的模组文件（保留订阅条目）
    const doDelete = (modid) => {
        deleteModInfo(cluster || '', modid)
            .then(r => {
                if (r?.code === 200) {
                    message.success(t('mod.mySubs.deleteOk'))
                    loadList()
                } else {
                    message.error(r?.msg || t('mod.mySubs.deleteFail'))
                }
            })
            .catch(() => message.error(t('mod.mySubs.deleteFail')))
    }

    // 取消订阅 = 从「我的订阅」移除条目
    const doUnsubscribe = (modid) => {
        http.delete(`/api/mod/subscription/${modid}`, {headers: {Cluster: cluster || ''}})
            .then(r => {
                if (r.data?.code === 200) {
                    message.success(t('mod.mySubs.unsubscribeOk'))
                    loadList()
                } else {
                    message.error(r.data?.msg || t('mod.mySubs.unsubscribeFail'))
                }
            })
            .catch(() => message.error(t('mod.mySubs.unsubscribeFail')))
    }

    const doDownload = (modid) => {
        getModInfo('zh', cluster || '', modid)
            .then((data) => {
                if (data?.code === 200) {
                    message.success(t('mod.mySubs.downloadOk'))
                    markDownloaded(modid)
                } else {
                    message.error(t('mod.mySubs.downloadFail'))
                }
            })
            .catch(() => message.error(t('mod.mySubs.downloadFail')))
    }

    const doUpdate = (modid) => {
        updateModApi(cluster || '', modid, 'zh')
            .then(() => {
                message.success(t('mod.mySubs.updateOk'))
                loadList()
            })
            .catch(() => message.error(t('mod.mySubs.updateFail')))
    }

    useEffect(() => { loadList() }, [refreshKey])

    const toolbar = (
        <div style={{marginBottom: 16, width: '100%', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center'}}>
            <Button type="primary" icon={syncing ? <LoadingOutlined/> : <SyncOutlined/>} disabled={syncing || oneByOne}
                    onClick={() => setOpen(true)}>{t('mod.mySubs.syncNow')}</Button>
            {oneByOne ? (
                <Button danger icon={<StopOutlined/>} onClick={stopBatch}>{t('mod.mySubs.stopDownload')}</Button>
            ) : (
                <>
                    <Button type="primary" icon={<CloudDownloadOutlined/>} disabled={syncing}
                            onClick={startDownloadAll}>{t('mod.mySubs.downloadMod')}</Button>
                    <Button type="primary" icon={<SyncOutlined/>} disabled={syncing}
                            onClick={startUpdateAll}>{t('mod.mySubs.updateMod')}</Button>
                </>
            )}
        </div>
    )

    // 未同步/列表为空时兜底引导
    if ((list === null || list.length === 0) && !loading) {
        return (
            <div>
                {toolbar}
                <Card>
                    <Empty description={t('mod.mySubs.emptyDesc')}>
                        <Button type="primary" icon={<SyncOutlined/>} onClick={() => setOpen(true)}>
                            {t('mod.mySubs.syncNow')}
                        </Button>
                    </Empty>
                </Card>
                <SyncModal open={open} form={form} syncing={syncing} onOk={doSync} onCancel={() => setOpen(false)} t={t}/>
            </div>
        )
    }

    // 服务端/客户端模组标签：按 modinfo 的 client_only_mod / server_only_mod 判定；
    // 其余（含 all_clients_require_mod 的内容模组）= 双端；未下载（无 mod_config）不显示
    const modTypeTag = (cfg) => {
        if (!cfg || Object.keys(cfg).length === 0) return null
        if (cfg.client_only_mod) return <Tag color="geekblue">{t('mod.mySubs.tagClient')}</Tag>
        if (cfg.server_only_mod) return <Tag color="orange">{t('mod.mySubs.tagServer')}</Tag>
        return <Tag color="purple">{t('mod.mySubs.tagBoth')}</Tag>
    }

    const columns = [
        {
            title: t('mod.mySubs.name'),
            dataIndex: 'Name',
            render: (text, r) => {
                const busy = busyIds.includes(r.Modid)
                return (
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <Spin spinning={busy} size="small">
                            {r.Img ? <img src={r.Img} alt="" style={{width: 40, height: 40, borderRadius: 4, objectFit: 'cover', display: 'block'}}/> : null}
                        </Spin>
                        <div style={{minWidth: 0}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                {r.downloaded
                                    ? <a onClick={() => setDetailRow(r)}>{text || r.Modid}</a>
                                    : <span>{text || r.Modid}</span>}
                                {r.downloaded && <Tag color="blue">{t('mod.mySubs.downloaded')}</Tag>}
                                {r.enabledInCurrent && <Tag color="green">{t('mod.mySubs.enabled')}</Tag>}
                                {modTypeTag(r.mod_config)}
                            </div>
                            {busy && <RowProgress/>}
                        </div>
                    </div>
                )
            },
        },
        {title: 'ID', dataIndex: 'Modid', width: 130},
        {
            title: t('mod.mySubs.updated'),
            dataIndex: 'TimeUpdated',
            width: 150,
            render: v => v ? new Date(v * 1000).toLocaleDateString() : '--',
        },
        {
            title: t('namelist.column.action'),
            width: 180,
            render: (_, r) => {
                const busy = busyIds.includes(r.Modid)
                return (
                    <Space>
                        <Tooltip title={r.downloaded ? t('mod.mySubs.redownload') : t('mod.mySubs.downloadMod')}>
                            <Button size="small" loading={busy} icon={<CloudDownloadOutlined/>}
                                    disabled={busy} onClick={() => doDownload(r.Modid)}/>
                        </Tooltip>
                        <Tooltip title={t('mod.mySubs.updateMod')}>
                            <Button size="small" icon={<SyncOutlined/>} disabled={busy} onClick={() => doUpdate(r.Modid)}/>
                        </Tooltip>
                        <Tooltip title={t('mod.mySubs.delete')}>
                            <Popconfirm title={t('mod.mySubs.deleteConfirm')} onConfirm={() => doDelete(r.Modid)}>
                                <Button size="small" danger icon={<DeleteOutlined/>} disabled={busy || !r.downloaded}/>
                            </Popconfirm>
                        </Tooltip>
                    </Space>
                )
            },
        },
        {
            // 低频操作独立一列，破坏性最强的「取消订阅」垫底
            title: t('mod.mySubs.moreAction'),
            width: 180,
            render: (_, r) => {
                const busy = busyIds.includes(r.Modid)
                return (
                    <Space>
                        <Tooltip title={t('mod.mySubs.detail')}>
                            <Button size="small" icon={<EyeOutlined/>} disabled={busy || !r.downloaded}
                                    onClick={() => setDetailRow(r)}/>
                        </Tooltip>
                        <Tooltip title={t('mod.workshop')}>
                            <Button size="small" icon={<ExportOutlined/>}
                                    onClick={() => window.open(`https://steamcommunity.com/sharedfiles/filedetails/?id=${r.Modid}`, '_blank', 'noopener,noreferrer')}/>
                        </Tooltip>
                        <Tooltip title={t('mod.mySubs.unsubscribe')}>
                            <Popconfirm title={t('mod.mySubs.unsubscribeConfirm')} onConfirm={() => doUnsubscribe(r.Modid)}>
                                <Button size="small" danger icon={<DisconnectOutlined/>} disabled={busy}/>
                            </Popconfirm>
                        </Tooltip>
                    </Space>
                )
            },
        },
    ]

    return (
        <div>
            {toolbar}
            {/* 首次加载用排版匹配的表格骨架；刷新保留表格自身 loading（数据可见不闪断） */}
            {loading && list === null ? <TableSkeleton rows={6} cols={5}/> : (
                <Card className="content-fade">
                    <Table rowKey="Modid" loading={loading} dataSource={list || []} columns={columns}
                           pagination={{pageSize, current: page, onChange: setPage, showSizeChanger: false}}/>
                </Card>
            )}
            <SyncModal open={open} form={form} syncing={syncing} onOk={doSync} onCancel={() => setOpen(false)} t={t}/>
            <DetailDrawer t={t} row={detailRow} cluster={cluster} onClose={() => setDetailRow(null)}/>
        </div>
    )
}

// 行内下载进度条：挂载即从 0 生长（先快后慢逼近 92），下载完成随行状态收起
const RowProgress = () => {
    const [percent, setPercent] = useState(0)
    useEffect(() => {
        setPercent(0)
        const timer = setInterval(() => {
            setPercent(p => (p >= 92 ? 92 : Math.min(92, p + (p < 50 ? 7 : p < 75 ? 4 : 2))))
        }, 150)
        return () => clearInterval(timer)
    }, [])
    return (
        <Progress
            percent={percent} status="active" showInfo={false}
            style={{width: '100%', minWidth: 240, marginTop: 4}}
        />
    )
}

// 详情抽屉：信息展示沿用模组设置 ModInfo 模板（图 | 名称/modid/作者 | 版本/最后更新/兼容），简介铺开，下方配置选项
const DetailDrawer = ({t, row, cluster, onClose}) => {
    const [detail, setDetail] = useState(null)
    const [loading, setLoading] = useState(false)
    useEffect(() => {
        if (!row?.Modid) {
            setDetail(null)
            return
        }
        setLoading(true)
        http.get(`/api/mod/subscription/detail/${row.Modid}`, {headers: {Cluster: cluster || ''}})
            .then(r => setDetail(r.data?.data || {}))
            .catch(() => setDetail({}))
            .finally(() => setLoading(false))
    }, [row?.Modid])

    const cfg = row?.mod_config || {}
    const rawOpts = cfg.configuration_options
    // 兼容两种形状：列表 [{label,name,default,options,...}] 或映射 {key: {...}}
    const optList = Array.isArray(rawOpts)
        ? rawOpts.map((v, i) => ({key: v?.name || String(i), v}))
        : Object.entries(rawOpts || {}).map(([key, v]) => ({key, v}))
    const cfgRows = optList.map(({key, v}) => {
        const opts = Array.isArray(v?.options) ? v.options : []
        const def = v?.default
        const defOpt = opts.find(o => o?.data === def)
        // 「Title」类条目 = 作者的分组标题占位（name/label 为 title，或唯一空选项）
        const nameLike = String(v?.name || '').toLowerCase()
        const labelLike = String(v?.label || '').toLowerCase()
        const isTitle = nameLike === 'title' || labelLike === 'title'
            || labelLike.startsWith('title:')
            || (opts.length <= 1 && !(opts[0]?.description || opts[0]?.data) && (def === undefined || def === null || def === ''))
            // 组标记主流写法（158 模组实测 239 例：SERVER/游戏功能/格式/_spacer 等）：
            // 仅一个空描述选项，default 常为 0/false——旧判定要求默认值为空，全漏了
            || (opts.length === 1 && !!opts[0] && !opts[0].description)
        return {
            key,
            name: v?.label || v?.name || key,
            default: defOpt?.description ?? (def !== undefined ? String(def) : '--'),
            choicesList: opts.map(o => o?.description ?? o?.data ?? '').filter(Boolean),
            choices: opts.map(o => o?.description ?? o?.data ?? '').join(' / '),
            hover: v?.hover || '',
            isTitle,
        }
    })
    const authorName = (cfg.author && cfg.author !== 'unknown') ? cfg.author : ''
    const desc = detail?.workshop?.description || row?.Description || (typeof cfg.description === 'string' ? cfg.description : '')
    const compatTags = [cfg.client_only_mod ? t('mod.mySubs.compatClientOnly') : null].filter(Boolean)
    return (
        <Drawer title={t('mod.mySubs.detailTitle')} open={!!row} onClose={onClose} width={620}>
            {loading ? <DetailSkeleton/> : (<div className="content-fade">
                {/* 头部：图标 + 名称 + 元信息（同模组设置卡片观感；兼容记金色） */}
                <div style={{display: 'flex', gap: 16}}>
                    {row?.Img
                        ? <img alt={row?.Name || row?.Modid} src={row.Img}
                               style={{width: 72, height: 72, borderRadius: 8, flexShrink: 0}}/>
                        : <div style={{width: 72, height: 72, borderRadius: 8, flexShrink: 0, background: 'rgba(128,128,128,0.15)'}}/>}
                    <div style={{flex: 1, minWidth: 0}}>
                        <div style={{fontSize: 16, fontWeight: 600, lineHeight: 1.4}}>
                            {row?.Name ? row.Name.slice(0, 20) : row?.Modid}
                        </div>
                        <div style={{marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '2px 16px'}}>
                            <Typography.Text type="secondary" style={{fontSize: 12}}>{t('mod.modid')}：{row?.Modid}</Typography.Text>
                            {authorName && (
                                <Typography.Text type="secondary" style={{fontSize: 12}}>{t('mod.author')}：{authorName.slice(0, 20)}</Typography.Text>
                            )}
                            {cfg.version && (
                                <Typography.Text type="secondary" style={{fontSize: 12}}>{t('mod.version')}：{cfg.version}</Typography.Text>
                            )}
                            {row?.TimeUpdated > 0 && (
                                <Typography.Text type="secondary" style={{fontSize: 12}}>{t('mod.lasttime')}：{timestampToString(row.TimeUpdated * 1000)}</Typography.Text>
                            )}
                            {cfg.dont_starve_compatible === true && (
                                <Typography.Text style={{fontSize: 12, color: '#E8C46A'}}>
                                    {t('mod.dst.compatible')}
                                </Typography.Text>
                            )}
                        </div>
                    </div>
                </div>
                {/* 状态徽标：仅在有信息量时显示 */}
                {(detail?.hasUpdate || (detail?.enabledWorlds || []).length > 0 || compatTags.length > 0) && (
                    <div style={{marginTop: 12, display: 'flex', gap: 4, flexWrap: 'wrap'}}>
                        {detail?.hasUpdate && <Tag color="orange">{t('mod.mySubs.hasUpdate')}</Tag>}
                        {(detail?.enabledWorlds || []).length > 0 && (
                            <Tag color="cyan">{detail.enabledWorlds.join(' / ')}</Tag>
                        )}
                        {compatTags.map(x => <Tag color="geekblue" key={x}>{x}</Tag>)}
                    </div>
                )}
                {/* 简介 / 配置选项：双 tab */}
                <Tabs items={[
                    {
                        key: 'desc',
                        label: t('mod.mySubs.tabDesc'),
                        children: (
                            <div style={{whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: 420, overflow: 'auto'}}>
                                {desc ? renderBb(desc) : t('mod.mySubs.noDescription')}
                            </div>
                        ),
                    },
                    {
                        key: 'config',
                        label: t('mod.mySubs.tabConfig'),
                        children: cfgRows.length > 0 ? (
                            <div>
                                {cfgRows.map(r => r.isTitle ? (
                                    <Divider key={r.key} style={{margin: '12px 0 8px'}}>
                                        <span style={{fontSize: '14px', fontWeight: '600'}}>{r.name}</span>
                                    </Divider>
                                ) : (
                                    <div key={r.key} style={{
                                        margin: '6px 0', paddingBottom: 6,
                                        borderBottom: '1px solid rgba(128, 128, 128, 0.12)',
                                    }}>
                                        <div style={{display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap'}}>
                                            <span style={{fontWeight: 600}}>{r.name}</span>
                                            <span style={{fontSize: 12, color: '#E8C46A'}}>{t('mod.mySubs.optDefault')}：{r.default}</span>
                                        </div>
                                        {r.choicesList.length > 0 && (
                                            <div style={{marginTop: 2, display: 'flex', flexWrap: 'wrap', gap: '2px 4px', alignItems: 'baseline'}}>
                                                <span style={{fontSize: 12, color: 'rgba(150, 150, 150, 1)'}}>{t('mod.mySubs.optChoices')}：</span>
                                                {r.choicesList.length <= 8
                                                    ? r.choicesList.map(c => <Tag key={c} style={{margin: 0}}>{c}</Tag>)
                                                    : <span style={{fontSize: 12, color: 'rgba(150, 150, 150, 1)', lineHeight: 1.6}}>{r.choicesList.join(' / ')}</span>}
                                            </div>
                                        )}
                                        {r.hover && (
                                            <div style={{marginTop: 2, fontSize: 12, color: 'rgba(150, 150, 150, 1)', lineHeight: 1.6}}>
                                                {r.hover}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : <Empty/>,
                    },
                ]}/>
            </div>)}
        </Drawer>
    )
}

const SyncModal = ({open, form, syncing, onOk, onCancel, t}) => (
    <Modal title={t('mod.mySubs.syncTitle')} open={open} onOk={onOk} onCancel={onCancel} confirmLoading={syncing} okText={t('mod.mySubs.syncOkBtn')}>
        <Alert type="warning" showIcon message={t('mod.mySubs.cookieWarn')} style={{marginBottom: 12}}/>
        <Form form={form} layout="vertical">
            <Form.Item label={t('mod.mySubs.steamid')} name="steamid" rules={[{required: true, message: t('mod.mySubs.steamidRequired')}]}>
                <Input placeholder="76561198xxxxxxxxx"/>
            </Form.Item>
            <Form.Item label={t('mod.mySubs.cookie')} name="cookie" rules={[{required: true, message: t('mod.mySubs.cookieRequired')}]}>
                <Input.TextArea rows={4} placeholder={t('mod.mySubs.cookiePlaceholder')}/>
            </Form.Item>
        </Form>
    </Modal>
)
