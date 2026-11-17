import React, {useState} from 'react';
import {Button, message, Modal, Progress} from 'antd';
import {CloudDownloadOutlined, LoadingOutlined} from '@ant-design/icons';
import {useTranslation} from "react-i18next";
import {installStatusApi} from "../../../api/dstConfigApi.jsx";
import {isFailLine, parsePercent} from "../../../utils/parseProgress.js";
import useAutoScroll from "../../../hooks/useAutoScroll.js";

// 一键下载系统组件：SteamCMD + 专用服务器 + 模组目录（SSE 实时进度）
export default ({disabled, onFinished, downloading}) => {
    const {t} = useTranslation()
    const [open, setOpen] = useState(false)
    const [logs, setLogs] = useState([])
    const autoScrollRef = useAutoScroll(logs)
    const [running, setRunning] = useState(false)
    const [percent, setPercent] = useState(null)
    const [result, setResult] = useState(null) // null | success | failed
    const openRef = React.useRef(false)
    const resultRef = React.useRef(null)

    const start = async () => {
        setOpen(true)
        openRef.current = true
        resultRef.current = null
        setRunning(true)
        setLogs([])
        setPercent(null)
        setResult(null)
        try {
            const resp = await fetch('/api/dst/install/oneclick')
            if (!resp.ok || !resp.body) {
                setLogs([t('setting.dstConfig.oneclick.failed')])
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
                        if (isFailLine(line)) { setResult('failed'); resultRef.current = 'failed' }
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
            if (onFinished) onFinished()
            // 弹窗已关闭时用 toast 通知完成状态
            if (!openRef.current) {
                if (resultRef.current === 'failed') {
                    message.error(t('setting.dstConfig.oneclick.failed'))
                } else {
                    message.success(t('setting.dstConfig.oneclick.done'))
                }
            }
        }
    }

    return (
        <>
            <Button
                icon={downloading || running ? <LoadingOutlined/> : <CloudDownloadOutlined/>}
                disabled={disabled}
                onClick={async () => {
                    // 进行中：直接打开接上进度
                    if (downloading || running) {
                        start()
                        return
                    }
                    // 已全部安装：直接校验/更新（已是最新则几秒完成），不弹确认
                    let installedBoth = false
                    try {
                        const resp = await installStatusApi()
                        installedBoth = resp.code === 200 && resp.data?.steamcmd && resp.data?.server
                    } catch (e) {
                        // 状态查不到就走正常流程
                    }
                    if (installedBoth) {
                        start()
                        return
                    }
                    Modal.confirm({
                        title: t('setting.dstConfig.oneclick.confirm'),
                        content: t('setting.dstConfig.oneclick.confirmContent'),
                        okText: t('setting.dstConfig.oneclick.start'),
                        onOk: () => { start() },
                    })
                }}
            >
                {t('setting.dstConfig.oneclick.button')}
            </Button>
            <Modal
                title={t('setting.dstConfig.oneclick.title')}
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
                        {result === 'success' && <span style={{color: '#52c41a'}}>{t('setting.dstConfig.oneclick.done')}</span>}
                        {result === 'failed' && <span style={{color: '#ff4d4f'}}>{t('setting.dstConfig.oneclick.failed')}</span>}
                    </div>
                )}
                <pre ref={autoScrollRef} style={{
                    maxHeight: 420,
                    overflow: 'auto',
                    padding: 12,
                    borderRadius: 6,
                    background: 'rgba(128,128,128,0.12)',
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                }}>
                    {logs.join('\n')}{running ? '\n…' : ''}
                </pre>
            </Modal>
        </>
    )
}
