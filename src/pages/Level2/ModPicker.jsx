import React, {useEffect, useMemo, useState} from 'react';
import {Button, Checkbox, Empty, Input, Modal, Spin, Typography, message} from 'antd';
import {SearchOutlined} from '@ant-design/icons';
import {useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {getMyModInfoList} from '../../api/modApi.jsx';
import {modMatches} from '../../utils/modIndex';

// 订阅池选模组弹窗：按名/ID 搜、多选 → onAdd(勾选行原样)。追加语义（不覆盖已有）
// 由调用方经 appendModsToOverrides 保证。
export default ({open, onClose, onAdd}) => {
    const {t} = useTranslation();
    const {cluster} = useParams();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState({});

    useEffect(() => {
        if (!open || rows.length > 0) return;
        setLoading(true);
        getMyModInfoList(cluster || '').then((resp) => {
            if (resp?.code === 200) setRows(resp.data || []);
            else message.error(t('level2.modPicker.fetchError'));
        }).catch(() => message.error(t('level2.modPicker.fetchError')))
            .finally(() => setLoading(false));
    }, [open, cluster]);

    const visible = useMemo(() => rows.filter(r => modMatches(r.modid, r.name, query)), [rows, query]);
    const selectedRows = rows.filter(r => selected[r.modid]);

    const toggle = (modid) => setSelected(prev => ({...prev, [modid]: !prev[modid]}));
    const close = () => {
        setSelected({});
        setQuery('');
        onClose();
    };

    return (
        <Modal
            title={t('level2.modPicker.title')}
            open={open}
            onCancel={close}
            width={560}
            footer={[
                <Button key="cancel" onClick={close}>{t('level2.modPicker.cancel')}</Button>,
                <Button key="add" type="primary" disabled={selectedRows.length === 0}
                        onClick={() => {
                            onAdd(selectedRows);
                            close();
                        }}>
                    {t('level2.modPicker.add', {count: selectedRows.length})}
                </Button>,
            ]}
        >
            <Input
                allowClear
                prefix={<SearchOutlined/>}
                placeholder={t('level2.modPicker.search')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{marginBottom: 8}}
            />
            <Spin spinning={loading}>
                <div style={{maxHeight: '50vh', overflowY: 'auto'}}>
                    {visible.length === 0 && !loading ? (
                        <Empty description={t('level2.modPicker.empty')} style={{margin: '24px 0'}}/>
                    ) : visible.map(r => (
                        <div
                            key={r.modid}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '6px 4px', cursor: 'pointer', borderRadius: 4,
                                background: selected[r.modid] ? 'rgba(232, 196, 106, 0.12)' : undefined,
                            }}
                            onClick={() => toggle(r.modid)}
                        >
                            <Checkbox checked={!!selected[r.modid]} onChange={() => toggle(r.modid)}/>
                            <Typography.Text style={{flex: 1, minWidth: 0}}
                                             ellipsis={{tooltip: r.name}}>{r.name || r.modid}</Typography.Text>
                            <Typography.Text type="secondary">{r.modid}</Typography.Text>
                        </div>
                    ))}
                </div>
            </Spin>
        </Modal>
    );
};
