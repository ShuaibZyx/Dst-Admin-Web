import React, {useState} from 'react';
import {Button, Modal, Empty, Spin, message} from 'antd';
import {
    FolderOutlined,
    ArrowUpOutlined,
    HomeOutlined,
    ReloadOutlined,
    CheckOutlined,
    LaptopOutlined,
    HddOutlined,
    AppstoreOutlined,
} from '@ant-design/icons';
import {useTranslation} from "react-i18next";
import {listDirs, makeDir} from "../../../api/dstConfigApi.jsx";

const ROOTS = '__roots__'
const APPDIR = '__app__'

// 悬停/滚动条样式（深浅主题通用）
const pickerCSS = `
.dp-row { display:flex; align-items:center; gap:8px; padding:8px 14px; cursor:pointer;
  border-bottom:1px solid rgba(128,128,128,0.15); color:inherit; }
.dp-row:hover { background: rgba(128,128,128,0.22); }
.dp-scroll { scrollbar-width: thin; scrollbar-color: rgba(128,128,128,0.45) transparent; }
.dp-scroll::-webkit-scrollbar { width:8px; height:8px; }
.dp-scroll::-webkit-scrollbar-track { background:transparent; }
.dp-scroll::-webkit-scrollbar-thumb { background:rgba(128,128,128,0.45); border-radius:4px; }
.dp-scroll::-webkit-scrollbar-thumb:hover { background:rgba(128,128,128,0.7); }
`

// 服务端目录选择弹窗：逐级浏览服务器真实目录，选中即回填绝对路径
export default ({value, onChange, disabled}) => {
    const {t} = useTranslation()
    const [open, setOpen] = useState(false)
    const [path, setPath] = useState('')
    const [dirs, setDirs] = useState([])
    const [loading, setLoading] = useState(false)
    const [err, setErr] = useState('')

    const load = async (p) => {
        setLoading(true)
        setErr('')
        try {
            const resp = await listDirs(p)
            if (resp && resp.code === 200 && resp.data) {
                setPath(resp.data.path || '')
                setDirs(resp.data.dirs || [])
            } else {
                const msg = (resp && resp.msg) || t('setting.dstConfig.picker.error')
                setErr(msg)
                message.warning(msg)
            }
        } catch (e) {
            const msg = (e && e.message) || t('setting.dstConfig.picker.error')
            setErr(msg)
            message.error(msg)
        } finally {
            setLoading(false)
        }
    }

    const openPicker = () => {
        setOpen(true)
        load(value || '')
    }

    // 确认选择：目录已存在直接回显；不存在则弹窗询问是否创建
    const confirmPick = async () => {
        const finalPath = joinServerDir(path)
        const name = finalPath.replace(/[\/]+$/, '').split(/[\/]/).pop()
        let exists = false
        try {
            const resp = await listDirs(parentOf(finalPath))
            exists = (resp?.data?.dirs || []).some(d => d.name === name)
        } catch (e) {
            exists = false
        }
        if (exists) {
            onChange && onChange(finalPath)
            message.success(t('setting.dstConfig.picker.selected', {path: finalPath}))
            setOpen(false)
            return
        }
        Modal.confirm({
            title: t('setting.dstConfig.picker.createTitle'),
            content: t('setting.dstConfig.picker.createContent', {path: finalPath}),
            onOk: async () => {
                const r = await makeDir(finalPath)
                if (r && r.code === 200) {
                    onChange && onChange(finalPath)
                    message.success(t('setting.dstConfig.picker.selected', {path: finalPath}))
                    setOpen(false)
                } else {
                    message.warning(r?.msg || t('setting.dstConfig.picker.error'))
                }
            }
        })
    }

    const pathLabel = (p) => {
        if (p === ROOTS) return t('setting.dstConfig.picker.filesystem')
        if (p === APPDIR) return t('setting.dstConfig.picker.appdir')
        return p || '…'
    }

    return (
        <>
            <style>{pickerCSS}</style>
            <Button
                icon={<FolderOutlined/>}
                onClick={openPicker}
                disabled={disabled}
                style={{borderTopLeftRadius: 0, borderBottomLeftRadius: 0}}
            >
                {t('setting.dstConfig.picker.button')}
            </Button>
            <Modal
                title={
                    <span>
                        <FolderOutlined style={{marginRight: 8, color: '#faad14'}}/>
                        {t('setting.dstConfig.picker.title')}
                    </span>
                }
                open={open}
                onCancel={() => setOpen(false)}
                width={640}
                destroyOnClose
                okText={t('setting.dstConfig.picker.select')}
                cancelText={t('setting.dstConfig.picker.cancel')}
                onOk={confirmPick}
                okButtonProps={{icon: <CheckOutlined/>, disabled: !path || path === ROOTS}}
            >
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', marginBottom: 12,
                    background: 'rgba(128,128,128,0.15)', border: '1px solid rgba(128,128,128,0.25)', borderRadius: 6,
                    fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all', color: 'inherit',
                }}>
                    {pathLabel(path)}
                </div>
                <div style={{display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap'}}>
                    <Button size="small" icon={<HddOutlined/>} onClick={() => load(ROOTS)}>
                        {t('setting.dstConfig.picker.filesystem')}
                    </Button>
                    <Button size="small" icon={<HomeOutlined/>} onClick={() => load('')}>
                        {t('setting.dstConfig.picker.userhome')}
                    </Button>
                    <Button size="small" icon={<AppstoreOutlined/>} onClick={() => load(APPDIR)}>
                        {t('setting.dstConfig.picker.appdir')}
                    </Button>
                    <Button size="small" icon={<ArrowUpOutlined/>} onClick={() => load(upFrom(path))}>
                        {t('setting.dstConfig.picker.up')}
                    </Button>
                    <Button size="small" icon={<ReloadOutlined/>} onClick={() => load(path)}>
                        {t('setting.dstConfig.picker.refresh')}
                    </Button>
                </div>
                <div className="dp-scroll" style={{
                    border: '1px solid rgba(128,128,128,0.25)', borderRadius: 6,
                    height: 320, overflow: 'auto',
                }}>
                    {loading ? (
                        <div style={{textAlign: 'center', padding: 48}}><Spin/></div>
                    ) : err ? (
                        <Empty description={err} style={{padding: 48}}/>
                    ) : dirs.length === 0 ? (
                        <Empty description={t('setting.dstConfig.picker.empty')} style={{padding: 48}}/>
                    ) : (
                        dirs.map(d => (
                            <div key={d.path} className="dp-row" onClick={() => load(d.path)}>
                                <FolderOutlined style={{color: '#faad14'}}/>
                                <span>{d.name}</span>
                            </div>
                        ))
                    )}
                </div>
                <div style={{marginTop: 8, opacity: 0.65, fontSize: 12}}>
                    {t('setting.dstConfig.picker.hint')}
                </div>
            </Modal>
        </>
    )
}

function parentOf(p) {
    if (!p) return ''
    const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
    return i > 0 ? p.slice(0, i) : p
}

// 选中目录后默认补上 DST-Server 子目录
function joinServerDir(p) {
    const base = (p || '').replace(/[\\/]+$/, '')
    if (!base) return 'DST-Server'
    const sep = base.includes('\\') ? '\\' : '/'
    return `${base}${sep}DST-Server`
}

// 盘符根（C:\\）再上一级 → 文件系统视图
function upFrom(p) {
    if (!p || p === ROOTS) return ROOTS
    if (/^[a-zA-Z]:[\\/]?$/.test(p)) return ROOTS
    return parentOf(p)
}
