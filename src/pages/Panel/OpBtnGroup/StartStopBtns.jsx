import {Button, message, Modal} from "antd";
import React, {useState} from "react";
import {useTranslation} from "react-i18next";
import {PlayCircleOutlined, PoweroffOutlined} from "@ant-design/icons";
import {startAllLevelApi} from "../../../api/level.jsx";
import {useLevelsStore} from "../../../store/useLevelsStore.tsx";

// 启动/停止（互斥）：有世界运行时只能停，全部停止时只能启。
// 状态与各世界开关同源（useLevelsStore）；启停进行中按钮锁定（"启动中/停止中"），
// 直到状态流确认真实状态（store.setLevels 内嵌确认）。
export default () => {
    const {t, i18n} = useTranslation()
    const levels = useLevelsStore((state) => state.levels)
    const tick = useLevelsStore((state) => state.tick)
    const pendingOps = useLevelsStore((state) => state.pendingOps)
    const setPendingOp = useLevelsStore((state) => state.setPendingOp)
    const clearPendingOps = useLevelsStore((state) => state.clearPendingOps)
    const anyRunning = levels.some(l => l.status)
    const [busy, setBusy] = useState(false)

    const pendingList = Object.values(pendingOps)
    const anyPending = pendingList.length > 0
    const pendingLabel = pendingList.some(p => p.op === 'stopping') ? t('panel.stopping') : t('panel.starting')

    const joinNames = (list) => list.map(l => l.levelName).join(i18n.language.includes('zh') ? '、' : ', ')

    const run = (checked) => {
        setBusy(true)
        // 批量操作：全部世界锁定,状态流逐个确认后自动解锁
        for (const l of levels) setPendingOp(l.uuid, checked ? 'starting' : 'stopping')
        startAllLevelApi("", checked)
            .then(resp => {
                if (resp.code === 200) {
                    message.success(t(checked ? 'panel.startAll.success' : 'panel.stopAll.success'))
                } else {
                    message.error(`${t(checked ? 'panel.startAll.error' : 'panel.stopAll.error')} ${resp.msg || ''}`)
                    clearPendingOps() // 失败立即解锁
                }
                setBusy(false)
                setTimeout(tick, 800) // 通知世界开关刷新状态
            })
            .catch(error => {
                console.log(error)
                message.error(t(checked ? 'panel.startAll.error' : 'panel.stopAll.error'))
                clearPendingOps()
                setBusy(false)
                setTimeout(tick, 800)
            })
    }

    // 互斥显示：运行中只显示「停止」，否则只显示「启动」；操作进行中锁定为"启动中/停止中"
    if (busy || anyPending) {
        return (
            <Button disabled icon={<PlayCircleOutlined/>} loading>
                {pendingLabel}
            </Button>
        )
    }
    return anyRunning ? (
        <Button danger icon={<PoweroffOutlined/>} onClick={() => Modal.confirm({
            centered: true,
            title: t('panel.stop.all.question'),
            content: t('panel.stop.all.pending') + joinNames(levels.filter(l => l.status)),
            okText: t('panel.y'),
            cancelText: t('panel.n'),
            okButtonProps: {danger: true},
            onOk: () => run(false),
        })}>
            {t('panel.stop.all')}
        </Button>
    ) : (
        <Button type="primary" icon={<PlayCircleOutlined/>} onClick={() => Modal.confirm({
            centered: true,
            title: t('panel.start.all.question'),
            content: t('panel.start.all.pending') + joinNames(levels),
            okText: t('panel.y'),
            cancelText: t('panel.n'),
            onOk: () => run(true),
        })}>
            {t('panel.start.all')}
        </Button>
    )
}
