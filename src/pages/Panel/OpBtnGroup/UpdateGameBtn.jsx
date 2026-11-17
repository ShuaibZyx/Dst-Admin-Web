import {Button, message, Modal, Popconfirm, Progress} from "antd";
import {SyncOutlined, LoadingOutlined} from '@ant-design/icons';
import React, {useState} from "react";
import {useTranslation} from "react-i18next";
import {isFailLine, parsePercent} from "../../../utils/parseProgress.js";
import useAutoScroll from "../../../hooks/useAutoScroll.js";
import {useLevelsStore} from "../../../store/useLevelsStore.tsx";

// 更新游戏：停世界 → 同步校验/更新（实时进度）→ 重写模组订阅
export default ({block, style, type = 'primary'}) => {

    const {t} = useTranslation()
    const [running, setRunning] = useState(false)
    const [open, setOpen] = useState(false)
    // 世界启停进行中：禁止更新游戏（文件被占用/状态不稳）
    const anyPending = Object.keys(useLevelsStore((s) => s.pendingOps)).length > 0
    const [logs, setLogs] = useState([])
    const autoScrollRef = useAutoScroll(logs)
    const [percent, setPercent] = useState(null)
    const [result, setResult] = useState(null)
    const openRef = React.useRef(false)
    const resultRef = React.useRef(null)

    const startUpdate = async (isDelete) => {
        setOpen(true)
        openRef.current = true
        resultRef.current = null
        setRunning(true)
        setLogs([])
        setPercent(null)
        setResult(null)
        try {
            const resp = await fetch(`/api/game/update?isDelete=${isDelete}`)
            if (resp.status === 401) {
                // 登录已过期：fetch 不走 axios 拦截器，这里对齐拦截器行为（提示+跳登录），
                // 不再显示误导性的"更新游戏失败"
                setLogs([t('error.loginExpired')])
                setRunning(false)
                message.warning({content: t('error.loginExpired'), key: 'loginExpired'})
                window.location.href = '/#/login'
                return
            }
            if (!resp.ok || !resp.body) {
                setLogs([t('panel.updateGame.failed')])
                setRunning(false)
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
                        setLogs(prev => [...prev, line])
                        const p = parsePercent(line)
                        if (p !== null) setPercent(p)
                        if (isFailLine(line)) {
                            setResult('failed')
                            resultRef.current = 'failed'
                        }
                        if (line.startsWith('完成') && resultRef.current !== 'failed') {
                            setResult('success')
                            resultRef.current = 'success'
                            setPercent(100)
                        }
                    }
                }
            }
        } catch (e) {
            setLogs(prev => [...prev, String(e)])
        } finally {
            setRunning(false)
            if (!resultRef.current) resultRef.current = 'success'
            setResult(resultRef.current)
            setPercent(prev => prev === null ? 100 : prev)
            if (!openRef.current) {
                if (resultRef.current === 'failed') {
                    message.error(t('panel.updateGame.failed'))
                } else {
                    message.success(t('panel.updateGame.done'))
                }
            }
        }
    }

    return (
        <>
            <Popconfirm
                title={t('panel.updateGame.confirm.title')}
                description={t('panel.updateGame.confirm.desc')}
                okText={t('panel.updateGame.deleteAndUpdate')}
                cancelText={t('panel.updateGame.updateOnly')}
                okButtonProps={{danger: true}}
                onConfirm={() => startUpdate(true)}
                onCancel={() => startUpdate(false)}
            >
                <Button block={block} style={style} type={type}
                        disabled={anyPending || running}
                        icon={running ? <LoadingOutlined/> : <SyncOutlined/>}>
                    {t('panel.updateGame')}
                </Button>
            </Popconfirm>
            <Modal
                title={t('panel.updateGame.progressTitle')}
                open={open}
                onCancel={() => { setOpen(false); openRef.current = false }}
                footer={null}
                width={720}
            >
                {percent !== null && (
                    <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8}}>
                        <Progress
                            percent={result === 'success' ? 100 : percent}
                            status={result === 'failed' ? 'exception' : (result === 'success' ? 'success' : 'active')}
                            size="small"
                            style={{flex: 1}}
                        />
                        {result === 'success' && <span style={{color: '#52c41a'}}>{t('panel.updateGame.done')}</span>}
                        {result === 'failed' && <span style={{color: '#ff4d4f'}}>{t('panel.updateGame.failed')}</span>}
                    </div>
                )}
                <pre ref={autoScrollRef} style={{maxHeight: 420, overflow: 'auto', padding: 12, borderRadius: 6,
                    background: 'rgba(128,128,128,0.12)', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>
                    {logs.join('\n')}{running ? '\n…' : ''}
                </pre>
            </Modal>
        </>
    )
}
