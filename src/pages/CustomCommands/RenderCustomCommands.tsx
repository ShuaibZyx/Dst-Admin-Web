import {useEffect, useState} from 'react';
import {Skeleton, Button, Card, Drawer, Empty, Spin} from 'antd';
import {EditOutlined} from '@ant-design/icons';
import {useTranslation} from 'react-i18next';
import ItemsManager from '../TooManyItemsPlus/ItemsManager';
import CustomCommands from './index';
import {getKv} from '../../api/clusterApi';
import {ProCard} from "@ant-design/pro-components";

// 自定义指令：指令网格 + 抽屉内编辑（原"自定义指令/自定义指令-编辑"两个 tab 合并）
export default function RenderCustomCommands() {
    const {t} = useTranslation();
    const [data, setData] = useState<Record<string, Record<string, string>>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [hasData, setHasData] = useState<boolean>(false);
    const [editOpen, setEditOpen] = useState<boolean>(false);

    const [tips, setTips] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const response = await getKv('custom-commands');
            if (response.code === 200 && response.data) {
                const jsonString = response.data as string;
                const kvData = JSON.parse(jsonString);
                setTips(kvData['_tips'])
                const itemsData: Record<string, Record<string, string>> = {};
                Object.entries(kvData).forEach(([key, value]) => {
                    if (key !== '_tips') {
                        itemsData[key] = value as Record<string, string>;
                    }
                });

                setData(itemsData);
                setHasData(Object.keys(itemsData).length > 0);
            } else {
                setHasData(false);
            }
        } catch (error) {
            console.error('Error loading custom commands:', error);
            if (!(error instanceof SyntaxError)) {
                console.error('加载数据失败');
            }
            setHasData(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const renderContent = () => {
        if (loading) {
            return (
                <Card>
                    <Spin tip={t('customCommands.loading')}>
                        <div style={{ height: '300px' }} />
                    </Spin>
                </Card>
            );
        }
        if (!hasData) {
            return (
                <ProCard>
                    <Empty description={t('customCommands.render.empty')} />
                </ProCard>
            );
        }
        return (
            <ItemsManager
                dataSource={data}
                isLoading={false}
                filterCategories={[]}
                warningMessage={tips || ''}
            />
        );
    };

    return (
        <Skeleton loading={loading} active>
        <div>
            <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: 12}}>
                <Button icon={<EditOutlined/>} onClick={() => setEditOpen(true)}>
                    {t('customCommands.edit.button')}
                </Button>
            </div>
            {renderContent()}
            <Drawer
                title={t('customCommands.title')}
                width={720}
                open={editOpen}
                onClose={() => setEditOpen(false)}
                destroyOnClose
            >
                <CustomCommands onSaved={() => {
                    loadData();
                    setEditOpen(false);
                }}/>
            </Drawer>
        </div>
    </Skeleton>);
}
