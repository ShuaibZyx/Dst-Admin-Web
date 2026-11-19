import React, {useEffect, useState} from 'react';
import {Button, Checkbox, Input, message, Modal, Popconfirm, Space, Table, Tag, Upload} from 'antd';
import {CloudUploadOutlined, DeleteOutlined, FolderOpenOutlined, FolderOutlined, ImportOutlined} from '@ant-design/icons';
import {useTranslation} from "react-i18next";
import {deleteSave, detectSaves, listSaves, moveSaves, openFolder, uploadSaveFolder} from "../../../api/saveApi.jsx";
import BackupStatistic from "../BackupList/Statistic/index.jsx";
import {formatSize} from "../../../utils/fileSize.js";
import {TableSkeleton} from "../../../components/Skeletons.jsx";

// 存档管理：显示 / 上传（文件夹）/ 搬入同步
export default () => {
    const {t} = useTranslation()
    const [saves, setSaves] = useState([])
    const [base, setBase] = useState('')
    const [configured, setConfigured] = useState(true)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [moveOpen, setMoveOpen] = useState(false)
    const [detected, setDetected] = useState([])
    const [checked, setChecked] = useState([])
    const [detecting, setDetecting] = useState(false)
    const [selected, setSelected] = useState([])

    const reload = () => {
        setLoading(true)
        listSaves().then(resp => {
            if (resp.code === 200) {
                setSaves(resp.data?.saves || [])
                setBase(resp.data?.base || '')
                setConfigured(!!resp.data?.configured)
            }
        }).finally(() => setLoading(false))
    }
    useEffect(reload, [])

    const doUpload = async (fileList) => {
        setUploading(true)
        try {
            const fd = new FormData()
            fileList.forEach(f => fd.append('files/' + f.webkitRelativePath, f, f.name))
            const resp = await uploadSaveFolder(fd)
            if (resp.code === 200) {
                message.success(t('backup.saveManager.uploadOk', {name: resp.data?.name}))
                reload()
            } else {
                message.warning(resp.msg)
            }
        } catch (e) {
            message.error(t('backup.saveManager.uploadError'))
        } finally {
            setUploading(false)
        }
    }

    const openMove = () => {
        setMoveOpen(true)
        setDetecting(true)
        detectSaves().then(resp => {
            if (resp.code === 200) {
                setDetected(resp.data?.saves || [])
                setChecked([])
            }
        }).finally(() => setDetecting(false))
    }

    const doMove = async () => {
        const sources = detected.filter(s => checked.includes(s.path) && !s.inPlace).map(s => s.path)
        if (sources.length === 0) {
            message.warning(t('backup.saveManager.moveNone'))
            return
        }
        const resp = await moveSaves(sources)
        if (resp.code === 200) {
            const results = resp.data?.results || []
            const ok = results.filter(r => r.ok).length
            message.success(t('backup.saveManager.moveOk', {n: ok, total: results.length}))
            results.filter(r => !r.ok).forEach(r => message.warning(`${r.path}: ${r.message}`))
            setMoveOpen(false)
            reload()
        } else {
            message.warning(resp.msg)
        }
    }

    const doDelete = async (row) => {
        const resp = await deleteSave(row.name)
        if (resp.code === 200) {
            message.success(t('backup.saveManager.deleteOk', {name: row.name}))
            reload()
        } else {
            message.warning(resp.msg)
        }
    }

    // 批量删除选中存档：运行中的跳过并提示，其余逐个删除
    const doBatchDelete = async () => {
        const rows = saves.filter(s => selected.includes(s.path))
        const targets = rows.filter(s => !s.running)
        rows.filter(s => s.running).forEach(s => message.warning(`${s.name}: ${t('backup.saveManager.deleteRunning')}`))
        let ok = 0
        for (const row of targets) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const resp = await deleteSave(row.name)
                if (resp.code === 200) ok++
                else message.warning(resp.msg)
            } catch (e) {
                message.warning(`${row.name}: ${t('backup.saveManager.deleteFail')}`)
            }
        }
        setSelected([])
        if (ok > 0) message.success(t('backup.saveManager.batchDeleteOk', {n: ok}))
        reload()
    }

    // 打开所在文件夹（服务端文件管理器，定位到该存档条目并选中）
    const doOpenFolder = (row) => openFolder('save', row.path).then(r => {
        if (r.code !== 200) message.warning(r.msg)
    }).catch(() => message.warning(t('backup.saveManager.uploadError')))

    const columns = [
        {
            title: t('backup.saveManager.column.name'),
            dataIndex: 'name',
            render: (v, r) => (
                <Space>
                    <FolderOutlined style={{color: '#faad14'}}/>
                    {v}
                    {r.current && <Tag color="blue">{t('backup.saveManager.current')}</Tag>}
                </Space>
            ),
        },
        {title: t('backup.saveManager.column.path'), dataIndex: 'path', ellipsis: true},
        {
            // 表头居中（align 驱动）、数值右对齐（块级容器内右对齐）；不提供点击排序
            title: t('backup.column.size'),
            dataIndex: 'size',
            width: 100,
            align: 'center',
            render: v => <div style={{textAlign: 'right'}}>{formatSize(v)}</div>,
        },
        {
            title: t('namelist.column.action'),
            width: 160,
            align: 'center',
            render: (_, row) => (
                <Space size={8}>
                    <Button
                        size="small"
                        icon={<FolderOpenOutlined/>}
                        onClick={() => doOpenFolder(row)}
                    >{t('backup.file')}</Button>
                    <Popconfirm
                        title={t('backup.saveManager.deleteConfirm', {name: row.name})}
                        okText={t('panel.y')}
                        cancelText={t('panel.n')}
                        onConfirm={() => doDelete(row)}
                    >
                        <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined/>}
                            disabled={row.running}
                            title={row.running ? t('backup.saveManager.deleteRunning') : t('backup.saveManager.delete')}
                        >{t('backup.delete')}</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ]

    return (
        <>
            {loading ? <TableSkeleton rows={6} cols={5}/> : (<>
        <div>
            {!configured ? (
                <div style={{marginBottom: 12, opacity: 0.65}}>{t('backup.saveManager.needRoot')}</div>
            ) : base && <div style={{marginBottom: 8, opacity: 0.65, fontSize: 12}}>{t('backup.saveManager.base')}: {base}</div>}
            {/* 统计卡（同备份列表）：存档数量 + 存档总大小 */}
            {configured && (
                <div style={{marginBottom: 12}}>
                    <BackupStatistic size={saves.length}
                                     data={saves.reduce((s, r) => s + (r.size || 0), 0) / 1024 / 1024 / 1024}/>
                </div>
            )}
            <Space style={{marginBottom: 12}} wrap>
                <Upload
                    webkitdirectory="true"
                    multiple
                    showUploadList={false}
                    beforeUpload={(file, fileList) => {
                        if (file === fileList[0]) doUpload(fileList)
                        return false
                    }}
                >
                    <Button icon={<CloudUploadOutlined/>} loading={uploading} disabled={!configured}>
                        {t('backup.saveManager.upload')}
                    </Button>
                </Upload>
                <Button icon={<ImportOutlined/>} onClick={openMove} disabled={!configured}>
                    {t('backup.saveManager.move')}
                </Button>
                <Popconfirm
                    title={t('backup.saveManager.batchDeleteConfirm', {n: selected.length})}
                    okText={t('panel.y')}
                    cancelText={t('panel.n')}
                    onConfirm={doBatchDelete}
                >
                    <Button danger icon={<DeleteOutlined/>} disabled={!configured || selected.length === 0}>
                        {t('backup.batchDelete')}
                    </Button>
                </Popconfirm>
            </Space>
            <Table className="content-fade" rowKey="path" size="small" columns={columns} dataSource={configured ? saves : []} loading={loading} pagination={false}
                   rowSelection={{selectedRowKeys: selected, onChange: setSelected}}/>
            <Modal
                title={t('backup.saveManager.moveTitleOutside')}
                open={moveOpen}
                onCancel={() => setMoveOpen(false)}
                onOk={doMove}
                width={720}
                okText={t('backup.saveManager.moveConfirm')}
            >
                <Table
                    rowKey="path"
                    size="small"
                    loading={detecting}
                    dataSource={detected}
                    pagination={false}
                    rowSelection={{
                        selectedRowKeys: checked,
                        onChange: setChecked,
                        getCheckboxProps: r => ({disabled: r.inPlace}),
                    }}
                    columns={[
                        {
                            title: t('backup.saveManager.column.name'),
                            dataIndex: 'name',
                            render: (v, r) => (
                                <Space>
                                    {v}
                                    {r.current && <Tag color="blue">{t('backup.saveManager.current')}</Tag>}
                                    {r.conflict && <Tag color="orange">{t('backup.saveManager.conflictTag')}</Tag>}
                                </Space>
                            ),
                        },
                        {title: t('backup.saveManager.column.path'), dataIndex: 'path', ellipsis: true},
                    ]}
                    locale={{emptyText: t('backup.saveManager.empty')}}
                />
            </Modal>
        </div>
            </>)}
        </>
    )
}
