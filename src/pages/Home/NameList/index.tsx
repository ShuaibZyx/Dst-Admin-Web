import {useEffect, useState, useCallback} from "react";
import {TableSkeleton} from '../../../components/Skeletons.jsx';
import {useTranslation} from "react-i18next";
import {
    Button,
    Card,
    Input,
    Skeleton,
    message,
    Typography,
    Space,
    Table,
    Upload
} from 'antd';
import {
    UploadOutlined,
    DownloadOutlined,
    DeleteOutlined,
    SearchOutlined,
    SortAscendingOutlined,
    SortDescendingOutlined
} from '@ant-design/icons';
import {useParams} from "react-router-dom";
import type {PlayerListResponse, ApiResponse} from "../../../type";

const {Paragraph} = Typography;
const {TextArea} = Input;

interface NameListProps {
    title: string;
    tips: string;
    getApi: (cluster: string) => Promise<ApiResponse<PlayerListResponse>>;
    saveApi: (cluster: string, list: PlayerListResponse) => Promise<ApiResponse<void>>;
}

interface ReadTxtFileProps {
    onImported: (list: any[]) => void;
}

// 从 txt 导入（每行一条）
const ReadTxtFileWithAntd: React.FC<ReadTxtFileProps> = ({onImported}) => {
    const {t} = useTranslation();

    const handleBeforeUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const lines = (e.target?.result as string)
                .split('\n')
                .map(line => line.trim())
                .filter(line => line !== '');
            onImported(lines);
        };
        reader.readAsText(file);
        return false;
    };

    return (
        <Upload accept={'.txt'} beforeUpload={handleBeforeUpload} showUploadList={false}>
            <Button icon={<UploadOutlined/>}>{t('namelist.import')}</Button>
        </Upload>
    );
};

const NameList: React.FC<NameListProps> = ({title, tips, getApi, saveApi}) => {

    const {t} = useTranslation();
    const {cluster} = useParams<{ cluster?: string }>();

    const [loading, setLoading] = useState<boolean>(false);
    const [list, setList] = useState<string[]>([]);
    const [newItem, setNewItem] = useState<string>('');
    const [batchText, setBatchText] = useState<string>('');
    const [searchText, setSearchText] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const tipsLines = tips.split("\n").filter(line => line.trim() !== '');

    const saveData = useCallback(async (payload: string[]) => {
        try {
            const response = await saveApi(cluster || "", payload as unknown as PlayerListResponse);
            if (response.code === 200) {
                message.success(t('cluster.save.ok'));
            } else {
                message.warning(t('cluster.save.error'));
            }
        } catch (error) {
            console.error('Error saving data:', error);
            message.error(t('cluster.save.error'));
        }
    }, [saveApi, t, cluster]);

    // 变更即保存
    const commitList = useCallback((next: string[]) => {
        setList(next);
        saveData(next);
    }, [saveData]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getApi(cluster || "");
            setList(response.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [cluster, getApi]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddOne = () => {
        const value = (newItem || '').trim();
        if (!value) {
            message.warning(t('namelist.batchAdd.emptyWarning'));
            return;
        }
        if (list.includes(value)) {
            message.warning(t('namelist.add.duplicate'));
            return;
        }
        commitList([...list, value]);
        setNewItem('');
        message.success(t('namelist.batchAdd.successCount', {count: 1}));
    };

    const handleDelete = (idx: number) => {
        commitList(list.filter((_, i) => i !== idx));
    };

    const handleBatchAdd = () => {
        if (!batchText.trim()) {
            message.warning(t('namelist.batchAdd.emptyWarning'));
            return;
        }
        const added = batchText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line !== '');
        commitList([...list, ...added]);
        setBatchText('');
        message.success(t('namelist.batchAdd.successCount', {count: added.length}));
    };

    const handleExport = () => {
        const blob = new Blob([list.join('\n')], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'namelist.txt';
        a.click();
        URL.revokeObjectURL(url);
        message.success(t('namelist.export.success'));
    };

    const handleSort = () => {
        const nextOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        setSortOrder(nextOrder);
        const sorted = [...list].sort((a, b) =>
            nextOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
        );
        setList(sorted);
        saveData(sorted);
    };

    // 过滤（保留原索引供删除）
    const rows = list
        .map((id, idx) => ({key: idx, id, idx}))
        .filter(row => !searchText.trim() || row.id.toLowerCase().includes(searchText.toLowerCase()));

    return (
        <>
            {loading ? <TableSkeleton rows={6} cols={3}/> : (<>
            {/* 原样：页面标题 + 说明 */}
            <div style={{marginBottom: 12}}>
                <Typography.Title level={4} style={{margin: 0}}>
                    {title}
                </Typography.Title>
                {tipsLines.map((line, index) => (
                    <Paragraph key={index} style={{margin: '4px 0'}}>
                        {line}
                    </Paragraph>
                ))}
            </div>

            {/* 一行工具栏：左=回车添加，右=搜索/排序/导入/导出 */}
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12}}>
                <Input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onPressEnter={handleAddOne}
                    placeholder={t('namelist.add.placeholder')}
                    allowClear
                    style={{flex: 1, minWidth: 220}}
                />
                <Space size={8} wrap>
                <Input
                    placeholder={t('namelist.search.placeholder')}
                    prefix={<SearchOutlined/>}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{width: 200}}
                    allowClear
                />
                <Button
                    icon={sortOrder === 'asc' ? <SortAscendingOutlined/> : <SortDescendingOutlined/>}
                    onClick={handleSort}
                >
                    {sortOrder === 'asc' ? t('namelist.sort.asc') : t('namelist.sort.desc')}
                </Button>
                <ReadTxtFileWithAntd onImported={(added) => commitList([...list, ...added.filter(x => !list.includes(x))])}/>
                <Button icon={<DownloadOutlined/>} onClick={handleExport}>
                    {t('namelist.export')}
                </Button>
                </Space>
            </div>

            {/* KU ID 表格 */}
            <Table
                size="small"
                rowKey="key"
                dataSource={rows}
                pagination={list.length > 50 ? {
                    pageSize: 50,
                    showSizeChanger: true,
                    size: 'small',
                    showTotal: (n) => t('namelist.total', {n}),
                } : false}
                locale={{
                    emptyText: searchText ? t('namelist.search.noResults') : t('namelist.empty'),
                }}
                columns={[
                    {title: '#', width: 48, render: (_, __, i) => i + 1},
                    {title: 'KU ID', dataIndex: 'id', ellipsis: true},
                    {
                        title: t('namelist.column.action'),
                        width: 72,
                        align: 'center',
                        render: (_, row) => (
                            <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined/>}
                                title={t('backup.delete')}
                                onClick={() => handleDelete(row.idx)}
                            />
                        ),
                    },
                ]}
            />

            {/* 原样批量区：标题 + 解析按钮在标题右侧，下方输入框 */}
            <div style={{marginTop: 16}}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: 8,
                }}>
                    <Typography.Title style={{margin: 0}} level={5}>
                        {t('namelist.batchAdd.title')}
                    </Typography.Title>
                    <Button type="primary" onClick={handleBatchAdd}>
                        {t('namelist.batchAdd.parseButton')}
                    </Button>
                </div>
                <TextArea
                    value={batchText}
                    onChange={(e) => setBatchText(e.target.value)}
                    placeholder={t('namelist.batchAdd.placeholder')}
                    rows={6}
                />
            </div>
            </>)} 
        </>
    );
};

export default NameList;
