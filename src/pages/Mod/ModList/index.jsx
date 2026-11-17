import React, {useEffect, useRef, useState} from 'react';
import _ from "lodash";
import {Row, Col, Button, Tooltip, message, Alert, Modal, Popconfirm, Progress, Spin} from 'antd';
import {useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {LoadingOutlined, OrderedListOutlined, SaveOutlined, SyncOutlined, ExportOutlined} from "@ant-design/icons";
import {format} from "lua-json";

import {updateModinfosApi, deleteModInfo} from '../../../api/modApi.jsx';
import {doUpdateMod} from '../../../utils/modUpdate.js';
import ModItem from "./ModItem/index.jsx";
import ModConfigOptions from "../ModConfigOptions/index.jsx";
import {useLevelsStore} from "../../../store/useLevelsStore";
import {isFailLine, parsePercent} from "../../../utils/parseProgress.js";
import useAutoScroll from "../../../hooks/useAutoScroll.js";
import {modDownloadStatusApi} from "../../../api/dstConfigApi.jsx";
import {updateLevelsApi} from "../../../api/clusterLevelApi.jsx";
import i18n from "i18next";
import {useUserPreferences} from "../../../hooks/useUserPreferences.ts";

// eslint-disable-next-line react/prop-types
export default ({modList, setModList,defaultConfigOptionsRef, modConfigOptionsRef}) => {

    const levels = useLevelsStore((state) => state.levels)
    const reFlushLevels = useLevelsStore((state) => state.reFlushLevels)
    const { t } = useTranslation()
    const {cluster} = useParams()
    const lang = i18n.language
    const {isDismissed, dismissAlert} = useUserPreferences()

    const [confirmLoading, setConfirmLoading] = useState(false);
    const [mod, setMod] = useState({})
    const modListRef = useRef(modList)
    const levelsRef = useRef(levels)
    const [showModTips1Alert, setShowModTips1Alert] = useState(true)

    const changeMod = (mod) => {
        const _mod = _.cloneDeep(mod);
        setMod(_mod)
    }

    const changeEnable = (modId) => {
        const newModList = modList.map(mod =>
            mod.modid === modId ? { ...mod, enable: !mod.enable } : mod
        );
        commitModList(newModList);
    };

    function isWorkshopId(str) {
        return /^[0-9]+$/.test(str);
    }

    function formatModOverride(targetModList = modList) {
        try {
            const chooses = targetModList.filter(mod => mod.enable)
            const modids = chooses.map(mod => mod.modid)
            const object = _.pick(modConfigOptionsRef.current, modids)
            const object1 = {}
            // eslint-disable-next-line no-restricted-syntax
            for (const id of modids) {
                defaultConfigOptionsRef.current.get(id)
                object1[id] = defaultConfigOptionsRef.current.get(id)
            }
            const workshopObject = _.merge({}, object, object1)
            const workshopIdKeys = Object.keys(workshopObject)
            const workShops = {}
            workshopIdKeys.forEach(workshopId => {
                if (workshopObject[workshopId] === undefined) {
                    workshopObject[workshopId] = {}
                }
                let workshop
                if (isWorkshopId(workshopId)) {
                    workshop = `workshop-${workshopId}`
                } else {
                    workshop = workshopId
                }
                const options = workshopObject[workshopId]
                delete options.null
                if (options !== undefined || options !== null) {
                    Object.keys(options).map(k=>{
                        if (options[k] === null || options[k] === undefined) {
                            delete options[k]
                        }
                    })
                }
                workShops[workshop] = {
                    configuration_options: options,
                    enabled: true
                }
            })
            console.log("结果",workShops)
            return format(workShops, {
                singleQuote: false
            })
        } catch (error) {
            console.log(error)
            message.warning(t('mod.parse.error'), error.message)
            return "return { error }"
        }
    }

    // 列表变更即写入所有世界的 modoverrides（开启/关闭、配置调整即时生效）
    function commitModList(list) {
        setModList(list)
        const modoverrides = formatModOverride(list)
        if (modoverrides === "return { error }") {
            message.warning(t('mod.parse.error'))
            return
        }
        const newLevels = levelsRef.current.map(item => ({
            ...item,
            modoverrides,
        }))
        updateLevelsApi({levels: newLevels})
            .then(resp => {
                if (resp.code === 200) {
                    message.success(t('mod.save.ok'))
                    reFlushLevels(cluster)
                    // 运行中的世界热更不了，提示重启后生效
                    if ((levels || []).some(l => l.status)) {
                        message.info(t('mod.save.runningHint'), 4)
                    }
                } else {
                    message.warning(resp.msg || t('level.save.error'))
                }
            })
            .catch(error => {
                console.log(error)
                message.error(t('mod.save.error'))
            })
    }

    function saveModConfig() {
        const modoverrides = formatModOverride(modListRef.current)
        if (modoverrides === "return { error }") {
            message.warning(t('mod.parse.error'))
            return Promise.resolve(false)
        }
        const newLevels = levelsRef.current.map(item => ({
            ...item,
            modoverrides,
        }))
        console.log("save all levels modoverrides", newLevels)
        return updateLevelsApi({levels: newLevels})
            .then(resp => {
                if (resp.code === 200) {
                    message.info(t('mod.save.ok'))
                    reFlushLevels(cluster)
                    return true
                } else {
                    message.warning(t('level.save.error'))
                    message.warning(resp.msg)
                    return false
                }
            })
            .catch(error => {
                console.log(error);
                message.error(t('mod.save.error'))
                return false
            })
    }


    function updateModConfigOptions() {
        setConfirmLoading(true)
        updateModinfosApi(lang)
            .then(data => {
                if (data.code === 200) {
                    message.success(t('mod.update.ok'))
                } else {
                    message.warning(t('mod.update.error'))
                }
                setConfirmLoading(false)
            })
    }

    const removeMod = (modId) => {
        // 先删模组文件与库记录（全量清扫）；失败则整个不动、条目保留可重试
        return deleteModInfo(cluster, modId).then(resp => {
            if (resp.code !== 200) {
                message.warning(resp.msg || t('mod.delete.error'))
                return false
            }
            // 文件已清，再退订：从所有 level 的 modoverrides 摘掉并重写 dedicated_server_mods_setup.lua
            const newModList = modList.filter(mod => mod.modid !== modId)
            const modoverrides = formatModOverride(newModList)
            if (modoverrides === "return { error }") {
                message.warning(t('mod.parse.error'))
                return false
            }
            const newLevels = levelsRef.current.map(item => ({...item, modoverrides}))
            return updateLevelsApi({levels: newLevels})
                .then(resp2 => {
                    if (resp2.code === 200) {
                        defaultConfigOptionsRef.current.delete(modId)
                        delete modConfigOptionsRef.current[modId]
                        modListRef.current = newModList
                        setModList([...newModList])
                        setMod(current => current?.modid === modId ? (newModList[0] || {}) : current)
                        message.success(t('mod.delete.ok'))
                        reFlushLevels(cluster)
                        return true
                    } else {
                        message.warning(t('level.save.error'))
                        message.warning(resp2.msg)
                        return false
                    }
                })
        }).catch(error => {
            console.log(error)
            message.error(t('mod.delete.error'))
            return false
        })
    }

    // 下载当前存档模组
    const [syncOpen, setSyncOpen] = useState(false)
    const [syncLogs, setSyncLogs] = useState([])
    const autoScrollRef = useAutoScroll(syncLogs)
    const [syncing, setSyncing] = useState(false)
    const [syncPercent, setSyncPercent] = useState(null)
    const [syncResult, setSyncResult] = useState(null)
    const syncOpenRef = React.useRef(false)
    const syncResultRef = React.useRef(null)
    const [dlRunning, setDlRunning] = useState(false)
    // 逐条更新：正在更新的模组 id（驱动条目转圈与按钮禁用）
    const [updatingModid, setUpdatingModid] = useState(null)

    useEffect(() => {
        modDownloadStatusApi().then(resp => {
            if (resp.code === 200) setDlRunning(!!resp.data?.downloading)
        }).catch(() => {})
    }, [])
    useEffect(() => {
        if (!dlRunning) return
        const timer = setInterval(() => {
            modDownloadStatusApi().then(resp => {
                if (resp.code === 200) setDlRunning(!!resp.data?.downloading)
            }).catch(() => {})
        }, 4000)
        return () => clearInterval(timer)
    }, [dlRunning])

    const startSync = async (mode) => {
        setSyncOpen(true); syncOpenRef.current = true; syncResultRef.current = null
        setSyncing(true); setSyncLogs([]); setSyncPercent(null); setSyncResult(null)
        try {
            const resp = await fetch(`/api/dst/mods/download?mode=${mode || 'repair'}`)
            if (!resp.ok || !resp.body) {
                setSyncLogs([t('mod.downloadCurrent.failed')])
                setSyncing(false)
                return
            }
            const reader = resp.body.getReader()
            const decoder = new TextDecoder()
            let buf = ''
            while (true) {
                const {done, value} = await reader.read()
                if (done) break
                buf += decoder.decode(value, {stream: true})
                const parts = buf.split('\n\n')
                buf = parts.pop()
                for (const part of parts) {
                    const line = part.replace(/^data:\s?/, '').trim()
                    if (line) {
                        setSyncLogs(prev => [...prev, line])
                        const pct = parsePercent(line)
                        if (pct !== null) setSyncPercent(pct)
                        if (isFailLine(line)) { setSyncResult('failed'); syncResultRef.current = 'failed' }
                        if (line.startsWith('完成') && syncResultRef.current !== 'failed') {
                            setSyncResult('success')
                            syncResultRef.current = 'success'
                            setSyncPercent(100)
                        }
                    }
                }
            }
        } catch (e) {
            setSyncLogs(prev => [...prev, String(e)])
        } finally {
            setSyncing(false)
            if (!syncResultRef.current) syncResultRef.current = 'success'
            setSyncResult(syncResultRef.current)
            setSyncPercent(prev => prev === null ? 100 : prev)
            setDlRunning(false)
            // 弹窗已关闭时用 toast 通知完成状态
            if (!syncOpenRef.current) {
                if (syncResultRef.current === 'failed') {
                    message.error(t('mod.downloadCurrent.failed'))
                } else {
                    message.success(t('mod.downloadCurrent.done'))
                }
            }
        }
    }

    // 逐条更新：按列表顺序依次执行每个模组条目自己的更新
    const updateOneByOne = async () => {
        if (dlRunning || syncing || updatingModid) return
        const targets = modList.map(m => m.modid).filter(Boolean)
        let ok = 0
        let fail = 0
        // eslint-disable-next-line no-restricted-syntax
        for (const modid of targets) {
            setUpdatingModid(modid)
            try {
                // eslint-disable-next-line no-await-in-loop
                const r = await doUpdateMod(cluster, modid, lang, setModList)
                if (r.ok) ok += 1
                else fail += 1
            } catch (e) {
                console.log(e)
                fail += 1
            }
        }
        setUpdatingModid(null)
        if (fail === 0) {
            message.success(t('mod.update.oneByOne.result', {ok, fail}))
        } else {
            message.warning(t('mod.update.oneByOne.result', {ok, fail}))
        }
    }



    useEffect(() => {
        // 去重：根据 modid 去重，保留第一个
        const uniqueModList = modList.reduce((acc, current) => {
            const existingMod = acc.find(item => item.modid === current.modid);
            if (!existingMod) {
                acc.push(current);
            }
            return acc;
        }, []);

        // 如果去重后的列表和原列表不同，更新列表
        if (uniqueModList.length !== modList.length) {
            modListRef.current = uniqueModList
            setModList(uniqueModList);
            return
        }

        modListRef.current = uniqueModList
        setMod(current => uniqueModList.find(item => item.modid === current?.modid) || uniqueModList[0] || {})
    }, [modList, setModList])

    useEffect(() => {
        levelsRef.current = levels
    }, [levels])

    useEffect(() => {
        // 检查用户是否已关闭提示
        isDismissed('mod-tips1').then(dismissed => {
            setShowModTips1Alert(!dismissed)
        })
    }, [isDismissed])

    const handleDismissModTips1 = async () => {
        const success = await dismissAlert('mod-tips1')
        if (success) {
            setShowModTips1Alert(false)
            message.success(t('mod.dismiss.success'))
        }
    }

    const updateModSize = modList.filter(mod=>mod.update)

    return (
        <div translate="no">
            <Modal
                title={t('mod.downloadCurrent.title')}
                open={syncOpen}
                onCancel={() => { setSyncOpen(false); syncOpenRef.current = false }}
                footer={null}
                width={720}
            >
                {syncPercent !== null && (
                    <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8}}>
                        <Progress
                            percent={syncResult === 'success' ? 100 : syncPercent}
                            status={syncResult === 'failed' ? 'exception' : (syncResult === 'success' ? 'success' : 'active')}
                            size="small"
                            style={{flex: 1}}
                        />
                        {syncResult === 'success' && <span style={{color: '#52c41a'}}>{t('mod.downloadCurrent.done')}</span>}
                        {syncResult === 'failed' && <span style={{color: '#ff4d4f'}}>{t('mod.downloadCurrent.failed')}</span>}
                    </div>
                )}
                <pre ref={autoScrollRef} style={{maxHeight: 420, overflow: 'auto', padding: 12, borderRadius: 6,
                    background: 'rgba(128,128,128,0.12)', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>
                    {syncLogs.join('\n')}{syncing ? '\n\u2026' : ''}
                </pre>
            </Modal>

            <Spin spinning={confirmLoading}>


                    {updateModSize.length > 0 && <>
                        <div style={{
                            paddingBottom: 8
                        }}>
                            <Alert message={t('mod.update.pending.count', {count: updateModSize.length})} type="warning" showIcon
                                   closable/>
                        </div>
                    </>}
                    <div style={{marginBottom: 16, width: '100%', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center'}}>
                        <Button
                            type="primary"
                            icon={dlRunning || syncing ? <LoadingOutlined/> : <SyncOutlined/>}
                            disabled={dlRunning || syncing}
                            onClick={() => startSync('repair')}
                        >{t('mod.check.button')}</Button>
                        <Button
                            type="primary"
                            icon={updatingModid ? <LoadingOutlined/> : <OrderedListOutlined/>}
                            disabled={dlRunning || syncing || updatingModid !== null}
                            onClick={updateOneByOne}
                        >{t('mod.update.oneByOne')}</Button>
                        <Button
                            danger
                            icon={dlRunning || syncing ? <LoadingOutlined/> : <SyncOutlined/>}
                            disabled={dlRunning || syncing}
                            onClick={() => Modal.confirm({
                                title: t('mod.redownload.confirm.title'),
                                content: t('mod.redownload.confirm.desc'),
                                okText: t('mod.redownload.button'),
                                okButtonProps: {danger: true},
                                onOk: () => startSync('redownload'),
                            })}
                        >{t('mod.redownload.button')}</Button>
                    </div>
                    <Row gutter={24}>
                        <Col span={10} xs={24} md={10} lg={10}>
                            <div className={'scrollbar'} style={{
                                height: 'calc(100vh - 320px)',
                                minHeight: '400px',
                                overflowY: 'auto',
                                overflowX: 'auto'
                            }}>
                                {modList.length > 0 && <div>
                                    {modList.map((item, index) =>
                                        <ModItem
                                            key={item.modid}
                                            mod={item}
                                            updatingModid={updatingModid}
                                            changeMod={changeMod}
                                            changeEnable={changeEnable}
                                            removeMod={removeMod}
                                            modList={modList}
                                            setModList={setModList}
                                            defaultConfigOptionsRef={defaultConfigOptionsRef}
                                            modConfigOptionsRef={modConfigOptionsRef}
                                        />)}
                                </div>}
                            </div>
                            <br/>
                        </Col>
                        <Col span={14} xs={24} md={14} lg={14}>
                            {mod.modid !== undefined && <ModConfigOptions
                                setModList={(updater) => {
                                    const next = typeof updater === 'function' ? updater(modList) : updater
                                    commitModList(next)
                                }}
                                mod={mod}
                                setMod={setMod}
                                defaultConfigOptionsRef={defaultConfigOptionsRef}
                                modConfigOptionsRef={modConfigOptionsRef}
                            />}
                        </Col>
                    </Row>
            </Spin>
        </div>
)
}
