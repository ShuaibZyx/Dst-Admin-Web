import React, {useEffect, useState} from 'react';
import {TableSkeleton} from '../../../../components/Skeletons.jsx';
import {Skeleton, Button, Checkbox, Input, message, Modal, Popconfirm, Space, Table, Tag, Upload} from 'antd';
import {CloudUploadOutlined, DeleteOutlined, FolderOutlined, ImportOutlined, ReloadOutlined} from '@ant-design/icons';
import {useTranslation} from "react-i18next";
import {deleteSave, detectSaves, listSaves, moveSaves, uploadSaveFolder} from "../../../api/saveApi.jsx";

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
            title: t('namelist.column.action'),
            width: 100,
            align: 'center',
            render: (_, row) => (
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
            ),
        },
    ]

    return (
        <>
            {loading ? <TableSkeleton rows={5} cols={4}/> : (<>
        <div>
            {!configured ? (
                <div style={{marginBottom: 12, opacity: 0.65}}>{t('backup.saveManager.needRoot')}</div>
            ) : base && <div style={{marginBottom: 8, opacity: 0.65, fontSize: 12}}>{t('backup.saveManager.base')}: {base}</div>}
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
                <Button icon={<ReloadOutlined/>} onClick={reload}>
                    {t('backup.saveManager.refresh')}
                </Button>
            </Space>
            <Table rowKey="path" size="small" columns={columns} dataSource={configured ? saves : []} loading={loading} pagination={false}/>
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
