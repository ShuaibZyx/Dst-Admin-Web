/* eslint-disable no-unused-vars */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import {TableSkeleton} from "../../../components/Skeletons.jsx";
import {Button, Dropdown, Input, message, Modal, Popconfirm, Space, Table, Tag, Tooltip} from 'antd';
import {DeleteOutlined, DownloadOutlined, EditOutlined, FileZipOutlined, FolderOpenOutlined, UndoOutlined} from '@ant-design/icons';
import React, {useEffect, useRef, useState} from 'react';
import {useParams} from "react-router-dom";
import axios from 'axios';
import {useTranslation} from "react-i18next";

import {
    deleteBackupApi,
    getBackupApi,
    renameBackupApi,
    restoreBackupApi
} from '../../../api/backupApi.jsx';
import {openFolder} from '../../../api/saveApi.jsx';
import {formatSize} from '../../../utils/fileSize.js';
import BackupStatistic from "./Statistic/index.jsx";
import CreateBackUpBtn from "../../Panel/OpBtnGroup/CreateBackUpBtn.jsx";

import style from "../../Home/DstEomj/index.module.css";



const Backup = ({showStatistic}) => {

    const {t} = useTranslation()
    const {cluster} = useParams()
    const actionRef = useRef();

    const [loading, setLoading] = useState(true)

    // 选中的备份文件
    const [selectBackup, setSelectBackup] = useState({})
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    const [backupData, setBackupData] = useState([])
    // 备份目录（展示在列表上方，同存档管理的存档目录行）
    const [backupDir, setBackupDir] = useState('')

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteBackup, setDeleteBackup] = useState({});

    const [confirmLoading, setConfirmLoading] = useState(false);

    // 名称列内联重命名（双击 / 右键→重命名）
    const [renaming, setRenaming] = useState(null);   // 正在重命名的 fileName
    const [renameDraft, setRenameDraft] = useState('');

    const updateBackupData = () => {
        getBackupApi(cluster)
            .then(data => {
                const resp = data.data || {}
                const backupList = resp.backups || []
                setBackupDir(resp.dir || '')
                // eslint-disable-next-line no-plusplus
                for (let i = 0; i < backupList.length; i++) {
                    backupList[i].key = i
                }
                backupList.sort((a, b) => {
                    return b.createTime < a.createTime ? -1 : 1
                })
                setBackupData(backupList)
                setData(backupList)
                setLoading(false)
            })
    }

    useEffect(() => {
        updateBackupData()
    }, [])

    const rowSelection = {
        selectedRowKeys,
        onChange: (selectedRowKeys, selectedRows) => {
            console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows)
            setSelectedRowKeys(selectedRowKeys)
            setSelectBackup(selectedRows)
        },
    }

    const deleteSelectBackup = () => {
        const {length} = selectBackup
        if (length < 1) {
            message.warning(t('backup.select.empty'))
            return
        }
        const fileNames = selectBackup.map(item => item.fileName)
        deleteBackupApi(cluster, fileNames)
            .then(data => {
                console.log(data);
                message.success(t("backup.delete.ok"))

                setSelectBackup([])
                setSelectedRowKeys([])
                updateBackupData()
            })
    }

    const deletBackupItem = (value) => {
        setConfirmLoading(true);
        const oldBackupData = backupData
        const newBackupData = oldBackupData.filter(item => value.key !== item.key)

        const newData = data.filter(item => value.key !== item.key)

        deleteBackupApi(cluster, [value.fileName])
            .then(data => {
                if (data.code === 200) {
                    setTimeout(() => {
                        message.success(t("backup.delete.ok"))
                        setConfirmLoading(false);
                        setIsDeleteModalOpen(false)
                        setBackupData(newBackupData)

                        setData(newData)
                    }, 100);

                }
            })
    }

    // 内联重命名：双击名称 / 右键→重命名进入编辑，Enter/失焦提交、Esc 取消
    const startRename = (record) => {
        setRenaming(record.fileName)
        setRenameDraft(record.fileName.replace(/\.zip$/i, ''))
    }

    const commitRename = (record) => {
        const name = renameDraft.trim()
        setRenaming(null)
        if (!name || `${name}.zip` === record.fileName) return
        renameBackupApi(cluster, {fileName: record.fileName, newName: `${name}.zip`})
            .then(data => {
                if (data.code === 200) {
                    message.success(t("backup.rename.ok"))
                    updateBackupData()
                } else {
                    message.error(data.msg || t("backup.rename.error"))
                }
            }).catch(() => {
            message.error(t("backup.rename.error"))
        })
    }

    const restoreArchive = (fileName) => {
        restoreBackupApi(cluster, fileName)
            .then(data => {
                if (data.code === 200) {
                    message.success(t("backup.restore.ok"))
                }
            }).catch(error => {
            console.log(error)
            message.error(t("backup.restore.error"))
        })
    }

    const columns = [
        {
            title: t('backup.column.name'),
            dataIndex: 'fileName',
            key: 'fileName',
            // 文件式条目：zip 小图标 + 名称；双击 / 右键→重命名（编辑功能收纳进名称列）
            render: (text, record) => (
                <Dropdown
                    trigger={['contextMenu']}
                    menu={{
                        items: [{key: 'rename', icon: <EditOutlined/>, label: t('backup.rename')}],
                        onClick: ({key, domEvent}) => {
                            domEvent.stopPropagation()
                            if (key === 'rename') startRename(record)
                        },
                    }}
                >
                    <div onDoubleClick={() => startRename(record)}
                         style={{display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none'}}>
                        <FileZipOutlined style={{color: '#faad14', flexShrink: 0}}/>
                        {renaming === record.fileName ? (
                            <Input
                                size="small"
                                autoFocus
                                value={renameDraft}
                                style={{flex: 1, minWidth: 0}}
                                onChange={e => setRenameDraft(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onPressEnter={e => e.target.blur()}
                                onBlur={() => commitRename(record)}
                                onKeyDown={e => {
                                    if (e.key === 'Escape') {
                                        setRenaming(null)
                                        setRenameDraft('')
                                    }
                                }}
                            />
                        ) : (
                            <Space size={6}>
                                {text}
                                {/* 快照备份产生的归档：文件名以 (snapshot) 开头，加 tag 标注 */}
                                {text.startsWith('(snapshot)') && <Tag color="blue">{t('backup.snapshotTag')}</Tag>}
                            </Space>
                        )}
                    </div>
                </Dropdown>
            ),
        },
        {
            title: t('backup.column.location'),
            key: 'location',
            ellipsis: true,
            // 完整路径 = 备份目录 + 文件名（分隔符随服务端目录风格）
            render: (_, record) => (
                <span>{backupDir ? `${backupDir}${backupDir.includes('\\') ? '\\' : '/'}${record.fileName}` : record.fileName}</span>
            ),
        },
        {
            // 表头居中（align 驱动）、数值右对齐（块级容器内右对齐）；不提供点击排序
            title: t('backup.column.size'),
            dataIndex: 'fileSize',
            width: 100,
            align: 'center',
            key: 'fileSize',
            render: (fileSize) => <div style={{textAlign: 'right'}}>{formatSize(fileSize)}</div>,
        },
        {
            title: t('backup.action'),
            key: 'action',
            width: 210,
            align: 'center',
            // 重命名已收入名称列（双击/右键）；除「恢复」外按钮均图标化
            render: (_, record) => (
                <Space size={8}>
                    <Button size="small" icon={<UndoOutlined/>} onClick={() => {
                        Modal.confirm({
                            title: t('backup.restore.title'),
                            content: (
                                <div>
                                    <p><strong>{record.fileName}</strong></p>  {/* 显示备份文件名 */}
                                    <p>{t('backup.restore.desc')}</p>
                                    <CreateBackUpBtn/>
                                </div>
                            ),
                            okText: t('panel.y'),
                            cancelText: t('panel.n'),
                            onOk: () => restoreArchive(record.fileName),
                        });
                    }}>{t('backup.restore')}</Button>

                    <Tooltip title={t('backup.download')}>
                        <Button size="small" icon={<DownloadOutlined/>} onClick={() => {
                            window.location.href = `/api/game/backup/download?fileName=${record.fileName}`;
                        }}/>
                    </Tooltip>

                    <Tooltip title={t('backup.file')}>
                        <Button size="small" icon={<FolderOpenOutlined/>} onClick={() => {
                            openFolder('backup', record.fileName).then(r => {
                                if (r.code !== 200) message.warning(r.msg)
                            }).catch(() => message.warning(t('backup.restore.error')))
                        }}/>
                    </Tooltip>

                    <Tooltip title={t('backup.delete')}>
                        <Button danger size="small" icon={<DeleteOutlined/>} onClick={() => {
                            setIsDeleteModalOpen(true);
                            setDeleteBackup(record)
                        }}/>
                    </Tooltip>
                </Space>
            ),
        },
    ]

    const HeaderTitle = () => (
        <Space wrap style={{
            paddingBottom: 12
        }}>
            <Button icon={<DeleteOutlined/>} type="primary" danger disabled={selectedRowKeys.length === 0} onClick={deleteSelectBackup}>
                {t('backup.batchDelete')}
            </Button>
        </Space>

    )

    const DeletetModal = () => (
        <Modal title={t('backup.delete.title')}
               open={isDeleteModalOpen}
               confirmLoading={confirmLoading}
               getContainer={false}
               onOk={() => {
                   deletBackupItem(deleteBackup)
               }}
               onCancel={() => {
                   setIsDeleteModalOpen(false)
               }}>
            <p>{t('backup.cur.filename')}</p>
            <p>{deleteBackup.fileName || ""}</p>
        </Modal>
    )

    // 备份总大小（单位 GB，展示格式化交给 BackupStatistic 统一处理）
    const backupDataSize = backupData
        .map(backup => backup.fileSize)
        // eslint-disable-next-line no-restricted-globals
        .reduce((prev, curr) => !isNaN(Number(curr)) ? prev + curr : prev, 0) / 1024 / 1024 / 1024

    const [data, setData] = useState([]);

    return (
        <>
            {loading ? <TableSkeleton rows={6} cols={4}/> : <>
            <DeletetModal/>
            {/* 备份目录（同存档管理的存档目录行） */}
            {backupDir && <div style={{marginBottom: 8, opacity: 0.65, fontSize: 12}}>{t('backup.dir')}: {backupDir}</div>}

            {showStatistic && <BackupStatistic size={backupData.length} data={backupDataSize}/>}
            <HeaderTitle/>
            <Table
                ref={actionRef}
                rowKey="fileName"
                className="content-fade"
                rowSelection={rowSelection}
                size="small"
                scroll={{
                    x: 600,
                }}
                columns={columns}
                dataSource={data}
                pagination={false}
            />
            </>}
        </>
    )
};
export default Backup;