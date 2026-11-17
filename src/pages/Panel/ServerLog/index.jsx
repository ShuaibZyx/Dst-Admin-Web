import {Skeleton, Button, Card, Input, message, Modal, Popconfirm, Popover, Progress, Select, Space, Spin, Tag, Typography} from "antd";
import {DownloadOutlined, HistoryOutlined, SaveOutlined, SendOutlined, ThunderboltOutlined} from '@ant-design/icons';
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";

// Monaco 体积大,懒加载:进入日志卡才拉取编辑器 chunk
const MonacoEditor = React.lazy(() => import("../../NewEditor/index.jsx").then(m => ({default: m.MonacoEditor})));
import {sendCommandApi, startLevelApi} from "../../../api/level.jsx";
import {isFailLine} from "../../../utils/parseProgress.js";
import {useTheme} from "../../../hooks/useTheme";
import style from "../../Home/DstEomj/index.module.css";
import {useLevelsStore} from "../../../store/useLevelsStore.tsx";
import "../../../utils/dstLogHighlight.js";
import {ProCard} from "@ant-design/pro-components";
import {useLiveStream} from "../../../hooks/useLiveStream.js";
import {useWorldLogsStore} from "../../../store/useWorldLogsStore.tsx";

// 启动就绪阶段：拉起进程(85%)到真的能玩(100%)之间，游戏初始化的阶段标志（实证自启动日志）。
// 命令发出/进程拉起都不算启动完成——只有 "Reset() returning" 才是玩家真的能进。
// 启动失败信号（启动中检测）：游戏宣告失败时自动停止世界并红条告知原因。
// 顺序=优先级（具体原因在前）。"Reset() returning" 可能先于认证失败打印（世界初始化完≠能玩），
// 所以失败检测要在整个启动过程中持续生效，不能只看就绪标志。
const FAIL_SIGNS = [
    {match: 'No auth token could be found', key: 'panel.serverLog.fail.noToken'},
    {match: 'Account Failed', key: 'panel.serverLog.fail.authFailed'},
    {match: 'Your Server Will Not Start', key: 'panel.serverLog.fail.willNotStart'},
];

const READY_STAGES = [
    {match: 'Beginning normal load sequence', percent: 40, key: 'panel.serverLog.stage.loading'},
    // "Loading mod:" 逐个加载(34+ 个 mod 是启动大头,约 100 秒)：每行 +0.6% 渐进 40→62
    {match: 'RegisterPrefabs', percent: 62, key: 'panel.serverLog.stage.prefabs'},
    {match: 'ModIndex: 加载序列已成功完成', percent: 68, key: 'panel.serverLog.stage.mods'},
    {match: 'Load FE: done', percent: 73, key: 'panel.serverLog.stage.fe'},
    // Reset() returning 只是 Lua 就绪：之后还有世界内容初始化(传送门/洞穴)、Klei 认证、开服
    {match: 'Reset() returning', percent: 78, key: 'panel.serverLog.stage.lua'},
    {match: 'Account Communication Success', percent: 88, key: 'panel.serverLog.stage.auth'},
    {match: 'Starting Dedicated Server Game', percent: 94, key: 'panel.serverLog.stage.server'},
    // Sim paused = 世界就绪、暂停等玩家：真的能玩，才算启动完成
    {match: 'Sim paused', percent: 100, key: 'panel.serverLog.ready'},
];
const LOAD_MOD_MAX = 62 // Loading mod 渐进的封顶(RegisterPrefabs 兜底)

// 每世界独立的运行日志与启动阶段识别：一个世界一个后台订阅（与日志页选中世界共享连接池，
// 选中世界不额外占连接）。日志进各世界的缓冲；启动中按游戏日志把该世界进度 35%→100%。
const WorldLogCollector = ({uuid, cluster}) => {
    const {t} = useTranslation()
    const pendingOps = useLevelsStore((state) => state.pendingOps)
    const levels = useLevelsStore((state) => state.levels)
    const pendingRef = React.useRef(pendingOps)
    const statusRef = React.useRef(false)
    pendingRef.current = pendingOps
    statusRef.current = !!levels.find(l => (l.key || l.uuid) === uuid)?.status

    useLiveStream({
        cluster: cluster || '',
        level: uuid,
        onLog: (line) => {
            // 渲染门（与日志页一致）：世界没跑且无启停操作时的收尾噪声/旧积压不入缓冲
            const active = pendingRef.current[uuid] || statusRef.current
            if (!active) return
            const st = useWorldLogsStore.getState()
            st.appendLog(uuid, line)
            if (pendingRef.current[uuid]?.op !== 'starting') return
            // 拉起进程(35%)后由游戏日志的阶段标志推进该世界进度，直到 Sim paused 打 100%
            const p = st.progress[uuid]
            if (line.includes('Loading mod:')) {
                if (p && !p.failed && p.percent < LOAD_MOD_MAX) {
                    st.setProgress(uuid, {
                        percent: Math.min(LOAD_MOD_MAX, Math.round((p.percent + 0.6) * 10) / 10),
                        label: t('panel.serverLog.stage.loading'),
                    })
                }
            }
            const stage = READY_STAGES.find(s2 => line.includes(s2.match))
            if (stage && p && !p.failed && p.percent < stage.percent) {
                st.setProgress(uuid, {percent: stage.percent, label: t(stage.key)})
                if (stage.percent >= 100) {
                    // 就绪=真的能玩：显式确认解锁按钮（进程活着不算数）
                    useLevelsStore.getState().clearPendingOps([uuid])
                }
            }
            const fail = FAIL_SIGNS.find(s2 => line.includes(s2.match))
            if (fail) {
                st.setProgress(uuid, {percent: 100, label: t(fail.key), failed: true})
                message.error({content: t(fail.key), key: 'startFailed-' + uuid})
                useLevelsStore.getState().clearPendingOps([uuid])
                startLevelApi(cluster || '', uuid, false).catch(err => console.log(err))
            }
        },
    })
    return null
}

const ConfirmButton = ({title, description, onConfirm, children, ...buttonProps}) => {
    const {t} = useTranslation()
    return (
        <Popconfirm
            title={title}
            description={description}
            onConfirm={onConfirm}
            okText={t('panel.y')}
            cancelText={t('panel.n')}
        >
            <Button {...buttonProps}>{children}</Button>
        </Popconfirm>
    );
};

const RollbackButton = ({onRollback, t, disabled}) => {
    const [open, setOpen] = React.useState(false);
    return (
        <Popover
            open={open}
            onOpenChange={setOpen}
            trigger="click"
            placement="top"
            content={
                <div style={{display: 'flex', flexDirection: 'column', gap: 4, minWidth: 88}}>
                    {[1, 2, 3, 4, 5, 6].map(day => (
                        <Button
                            key={day}
                            size="small"
                            block
                            onClick={() => {
                                setOpen(false);
                                Modal.confirm({
            centered: true,
                        title: t('panel.rollback'),
                                    content: t('panel.rollback.confirm.desc', {day}),
                                    okText: t('panel.y'),
                                    cancelText: t('panel.n'),
                                    onOk: () => onRollback(day),
                                });
                            }}
                        >
                            {t('panel.rollback.nDays', {day})}
                        </Button>
                    ))}
                </div>
            }
        >
            <Button type="primary" icon={<HistoryOutlined/>} disabled={disabled}>{t('panel.rollback')}</Button>
        </Popover>
    );
};

export default () => {
    const {t} = useTranslation()
    const {theme} = useTheme();
    const {cluster} = useParams()
    const [spinLoading, setSpinLoading] = useState(false)

    const levels = useLevelsStore((state) => state.levels)

    const notHasLevels = levels === undefined || levels === null || levels.length === 0
    const defaultLevelName = useMemo(() => {
        if (notHasLevels) return ""
        return (levels.find(level => level.status)?.key) || levels[0].key
    }, [levels, notHasLevels])
    const [currentLevelName, setCurrentLevelName] = useState(defaultLevelName)
    const editorRef = useRef()
    const currentLevel = useMemo(() => levels.find(level => level.key === currentLevelName), [levels, currentLevelName])
    const processElapsed = currentLevel?.Ps?.elapsed || currentLevel?.ps?.elapsed

    // 当 levels 加载完成后，默认选择正在运行的世界，否则选择第一个世界
    useEffect(() => {
        if (!currentLevelName && defaultLevelName) {
            setCurrentLevelName(defaultLevelName)
        }
    }, [currentLevelName, defaultLevelName])

    const [command, setCommand] = useState('');

    const onchange = (e) => {
        setCommand(e.target.value);
    };

    function sendInstruct(command) {
        if (command === "") {
            message.warning(t('panel.command.required'))
            return
        }
        setSpinLoading(true)
        sendCommandApi(cluster, currentLevelName, command)
            .then(resp => {
                if (resp.code === 200) {
                    message.success(t('panel.command.send.success'))
                } else {
                    message.error(t('panel.command.send.error'))
                }
                setSpinLoading(false)
            })
    }

    // 日志批量渲染缓冲：大流量下防卡死。用 pushEditOperations 行尾增量追加（O(1)），
    // 不做 getValue+setValue 全量重写；超 3000 行时头尾同批裁剪，文档大小恒定。
    const logBufRef = React.useRef([])
    const flushTimerRef = React.useRef(null)
    const flushLogBuffer = () => {
        const buf = logBufRef.current
        if (buf.length === 0) return
        logBufRef.current = []
        const ed = editorRef?.current?.current
        const model = ed?.getModel?.()
        if (!model) return
        const batch = buf.join("\n") + "\n"
        const endPos = model.getPositionAt(model.getValueLength())
        const edits = []
        // 超长先裁头部（与追加同批提交，一次重绘）
        const overflow = model.getLineCount() + buf.length - 3000
        if (overflow > 0) {
            const cutPos = model.getPositionAt(0)
            const cutLine = Math.min(overflow + 1, model.getLineCount())
            edits.push({
                range: {startLineNumber: cutPos.lineNumber, startColumn: cutPos.column, endLineNumber: cutLine, endColumn: 1},
                text: "",
            })
        }
        edits.push({
            range: {startLineNumber: endPos.lineNumber, startColumn: endPos.column, endLineNumber: endPos.lineNumber, endColumn: endPos.column},
            text: batch,
        })
        model.pushEditOperations([], edits, () => null)
        ed.revealLine(model.getLineCount())
    }

    // 就绪标志检测（onLog 闭包防旧值用 ref）
    const pendingOpsRef = React.useRef({})
    const currentLevelRef = React.useRef(null)
    const pendingOpsStore = useLevelsStore((state) => state.pendingOps)
    pendingOpsRef.current = pendingOpsStore
    currentLevelRef.current = currentLevel
    const levelsRef = React.useRef(levels)
    levelsRef.current = levels

    // 聚合 SSE（多组件共享一条连接）：log 渲染 + startlog 进度全部从这进
    useLiveStream({
        // 空值=后端按 dst_config 解析真实集群（曾兜底硬编码 'Cluster_1'，真实集群不是它时
        // 订阅的是错误目录的 server_log.txt，游戏日志永远为空）
        cluster: cluster || '',
        level: currentLevelName,
        onLog: (line) => {
            // 渲染门：世界没跑且无启停操作时不渲染——挡掉停止后 tail 晚到的清理行
            // （~Proxy/lua_close 等）和页面刷新时 backlog 里的旧日志。
            const active = pendingOpsRef.current[currentLevelRef.current?.key] || currentLevelRef.current?.status
            if (!active) return
            // 批量缓冲渲染：每行 setValue 全量重写文档,大量日志涌来时 O(n²) 直接卡死;
            // 缓冲 150ms 合并一次 pushEditOperations 行尾增量,并只保留尾部 3000 行。
            logBufRef.current.push(line)
            if (!flushTimerRef.current) {
                flushTimerRef.current = setTimeout(() => {
                    flushTimerRef.current = null
                    flushLogBuffer()
                }, 150)
            }
        },
        onStartLog: (line, hist) => {
            setStartLogs(prev => [...prev.slice(-300), line])
            // 历史记录只进文本；进度条只由实时打点驱动
            if (hist) return
            // 进度按世界归属：打点行带世界 key(uuid)，"全部世界"行作用于所有世界——
            // 每个世界各挂各的进度条，互不串扰（取代旧的"只认当前世界"过滤）
            const st = useWorldLogsStore.getState()
            const keys = levelsRef.current.map(l => l.key)
            const m = line.match(/\[进度:(\d{1,3})%\]\s*(.*)/)
            const isFail = !m && (isFailLine(line) || /被拒|下载失败/.test(line))
            if (!m && !isFail) return
            const raw = (m ? m[2] : line.replace(/^\d{2}:\d{2}:\d{2}\s*/, '')).trim()
            const targets = /全部世界/.test(raw) ? keys : keys.filter(k => raw.includes(k))
            for (const k of targets) {
                st.setProgress(k, m
                    ? {percent: parseInt(m[1], 10), label: raw.replaceAll('全部世界', k)}
                    : {label: raw.replaceAll('全部世界', k), failed: true})
            }
        },
    })

    const handleChange = (value) => {
        setCurrentLevelName(value)
        // 每个世界各存各的日志：切换即显示该世界已积累的缓冲，不丢上下文
        const buf = useWorldLogsStore.getState().logs[value] || []
        editorRef?.current?.current?.setValue(buf.join("\n"))
    }
    // 启动过程事件日志（服务器日志页展示）
    const [startLogs, setStartLogs] = useState([])

    // 世界停止后清场：游戏日志+启动日志+进度条全部清空（旧日志停在启动期输出会误导，
    // 清场让下一轮启动从干净状态开始）。只在"同一世界 运行→停止"时触发，切换世界不误触发。
    const prevLevelRef = React.useRef({key: null, status: undefined})
    useEffect(() => {
        const key = currentLevel?.key
        const status = currentLevel?.status
        const prev = prevLevelRef.current
        if (prev.key === key && prev.status === true && status === false) {
            editorRef?.current?.current?.setValue("")
            setStartLogs([])
            const wl = useWorldLogsStore.getState()
            wl.clearLog(key)
            // 失败红条保留（原因要留存可见，下次启动/停止才清）
            if (!wl.progress[key]?.failed) {
                wl.clearProgress([key])
            }
        }
        prevLevelRef.current = {key, status}
    }, [currentLevel?.key, currentLevel?.status])

    // 点停止时进度从 0 重新算（停止打点 30%→100% 驱动）。
    // 启动的真实 100% 由游戏就绪标志驱动（onLog 的 "Reset() returning"）并保持到停止。
    const pendingOps = useLevelsStore((state) => state.pendingOps)
    const prevPendingOpRef = React.useRef(null)
    useEffect(() => {
        const op = pendingOps[currentLevel?.key]?.op
        if (op === 'stopping' && prevPendingOpRef.current !== 'stopping') {
            useWorldLogsStore.getState().clearProgress([currentLevel?.key]) // 停止从 0 重新开始算
        }
        prevPendingOpRef.current = op
    }, [pendingOps, currentLevel?.key])
    const startLogRef = React.useRef(null)
    // 每世界独立的启动/停止进度（worldLogs store，打点归属+阶段各自推进）；
    // 显示跟随顶部世界下拉：切到哪个世界就显示哪个世界的进度条
    const progressMap = useWorldLogsStore((state) => state.progress)
    const currentProgress = progressMap[currentLevelName]

    useEffect(() => {
        const el = startLogRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [startLogs])

    return <>
        {/* 每世界独立的后台订阅：各自缓冲运行日志 + 各自推进启动阶段（互不串扰） */}
        {levels.map(l => (
            <WorldLogCollector key={l.key || l.uuid} uuid={l.key || l.uuid} cluster={cluster}/>
        ))}
        <Skeleton loading={spinLoading} active>
            <ProCard
                title={<Space size={8}>
                    {t('panel.serverLog')}
                    <Tag color={processElapsed ? 'green' : 'default'}>
                        {processElapsed
                            ? t('panel.serverLog.running', {elapsed: processElapsed})
                            : t('panel.serverLog.notRunning')}
                    </Tag>
                </Space>}
                extra={<Space>
                    <Select
                        style={{
                            width: 120,
                        }}
                        onChange={handleChange}
                        defaultValue={notHasLevels ? "" : levels[0].levelName}
                        options={levels.map(level => {
                            return {
                                value: level.key,
                                label: level.levelName,
                            }
                        })}
                    />
                    <Button style={{float: "right"}}
                            onClick={() => {
                                window.location.href = `/api/game/level/server/download?fileName=server_log.txt&clusterName=${cluster || ''}&levelName=${currentLevelName}`
                            }}
                            icon={<DownloadOutlined/>}
                            type={'primary'}
                    >
                        {t('panel.download.log')}
                    </Button>
                </Space>}
            >
                {/* 启动/停止进度：跟随世界下拉显示当前世界（后台仍各世界独立推进） */}
                {currentProgress && (
                    <div style={{marginBottom: 12}}>
                        <Progress
                            percent={currentProgress.percent}
                            status={currentProgress.failed
                                ? 'exception'
                                : (currentProgress.percent >= 100 ? 'success' : 'active')}
                            size="small"
                        />
                        {currentProgress.label && (
                            <Typography.Text type="secondary" style={{display: 'block', marginTop: 4}}>
                                {currentProgress.label}
                            </Typography.Text>
                        )}
                    </div>
                )}
                <React.Suspense fallback={null}>
<MonacoEditor
                    className={style.icon}
                    ref={editorRef}
                    style={{
                        "height": "304px",
                        "width": "100%",
                    }}
                    options={{
                        readOnly: true,
                        language: 'dstlog',
                        padding: {top: 8, bottom: 8},
                        theme: theme === 'dark' ? 'dstlog-dark' : 'dstlog-light'
                    }}
                />
</React.Suspense>
                <br/>
                <Space.Compact
                    style={{
                        width: '100%',
                        marginBottom: 12
                    }}
                >
                    <Input defaultValue="" onChange={onchange}/>
                    <Button icon={<SendOutlined/>} type="primary" onClick={() => sendInstruct(command)}>{t('panel.send')}</Button>
                </Space.Compact>
                <Space size={8} wrap>
                    <ConfirmButton
                        title={t('panel.c_save()')}
                        description={t('panel.save.confirm.desc')}
                        onConfirm={() => {
                            sendInstruct("c_save()")
                        }}
                        type="primary"
                        icon={<SaveOutlined/>}
                        disabled={Object.keys(pendingOpsStore).length > 0}
                    >
                        {t('panel.c_save()')}
                    </ConfirmButton>
                    <RollbackButton
                        onRollback={(day) => sendInstruct(`c_rollback(${day})`)}
                        t={t}
                        disabled={Object.keys(pendingOpsStore).length > 0}
                    />
                    {/* 强制恢复：卡死的启动/停止一键解锁（清锁定+清进度+强杀卡死进程，世界干净可重启） */}
                    <Button icon={<ThunderboltOutlined/>} danger onClick={() => Modal.confirm({
            centered: true,
            title: t('panel.recover'),
                        content: t('panel.recover.desc'),
                        okText: t('panel.y'),
                        cancelText: t('panel.n'),
                        okButtonProps: {danger: true},
                        onOk: () => {
                            useLevelsStore.getState().clearPendingOps()
                            useWorldLogsStore.getState().clearProgress()
                            startLevelApi(cluster || '', currentLevelName, false).catch(err => console.log(err))
                            message.success({content: t('panel.recover.done'), key: 'recovered'})
                        },
                    })}>
                        {t('panel.recover')}
                    </Button>
                </Space>
            </ProCard>
        </Skeleton>
    </>
}
