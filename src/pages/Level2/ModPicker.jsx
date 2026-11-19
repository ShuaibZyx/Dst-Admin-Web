import React, {useEffect, useMemo, useState} from 'react';
import {Button, Checkbox, Empty, Input, Modal, Tag, Tooltip, Typography, message} from 'antd';
import {SearchOutlined} from '@ant-design/icons';
import {useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {getMyModInfoList} from '../../api/modApi.jsx';
import {http} from '../../utils/http';
import {modMatches} from '../../utils/modIndex';
import {ListSkeleton} from '../../components/Skeletons.jsx';

// 订阅池选模组弹窗：池=模组设置的「我的订阅」（Steam 资产库，跨存档）；
// 按名/ID 搜、多选 → onAdd(勾选行 {modid,name,mod_config})。追加语义由调用方保证。
// existingIds=当前 modoverrides 已有的 modid（workshop- 前缀归一）：置灰+「已添加」tag，不可再选。
export default ({open, onClose, onAdd, existingIds = []}) => {
    const {t} = useTranslation();
    const {cluster} = useParams();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState({});
    const addedSet = useMemo(
        () => new Set(existingIds.map(id => String(id).replace(/^workshop-/, ''))),
        [existingIds],
    );
    const isAdded = (modid) => addedSet.has(String(modid).replace(/^workshop-/, ''));
    // 客户端专属：仅展示不可选（不进 modoverrides）
    const isClientOnly = (r) => r.mod_config?.client_only_mod === true;

    useEffect(() => {
        if (!open || rows.length > 0) return;
        setLoading(true);
        // 订阅行是 PascalCase（Modid/Name/Img）；mod_config 默认值从 mod_infos 查得到的带上
        Promise.all([
            http.get('/api/mod/subscription', {headers: {Cluster: cluster || ''}}),
            getMyModInfoList(cluster || '').catch(() => null),
        ]).then(([subs, infos]) => {
            const infoMap = {};
            for (const m of (infos?.data || [])) if (m?.modid) infoMap[m.modid] = m.mod_config;
            // 客户端专属不进 modoverrides——不直接过滤：置灰+「客户端」tag 仅展示不可选；mod_config 缺省回退订阅行自带的
            const list = (subs?.data?.data || [])
                .map(r => ({modid: r.Modid, name: r.Name, img: r.Img, mod_config: infoMap[r.Modid] || r.mod_config}))
                .filter(r => r.modid);
            setRows(list);
        }).catch(() => message.error(t('level2.modPicker.fetchError')))
            .finally(() => setLoading(false));
    }, [open, cluster]);

    const visible = useMemo(() => rows.filter(r => modMatches(r.modid, r.name, query)), [rows, query]);
    const selectedRows = rows.filter(r => selected[r.modid]);

    const toggle = (r) => {
        if (isAdded(r.modid) || isClientOnly(r)) return;
        setSelected(prev => ({...prev, [r.modid]: !prev[r.modid]}));
    };
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
            {loading ? <ListSkeleton rows={6}/> : (
                <div className="content-fade" style={{maxHeight: '50vh', overflowY: 'auto'}}>
                    {visible.length === 0 && !loading ? (
                        <Empty description={t('level2.modPicker.empty')} style={{margin: '24px 0'}}/>
                    ) : visible.map(r => {
                        const added = isAdded(r.modid);
                        const clientOnly = isClientOnly(r);
                        const disabled = added || clientOnly;
                        return (
                        <Tooltip key={r.modid} title={clientOnly ? t('level2.modPicker.clientTip') : ''}>
                        <div
                            key={r.modid}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '6px 4px', borderRadius: 4,
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                opacity: disabled ? 0.55 : 1,
                                background: selected[r.modid] ? 'rgba(232, 196, 106, 0.12)' : undefined,
                            }}
                            onClick={() => toggle(r)}
                        >
                            {/* 勾选框点击与整行等效（单次 toggle）：外层 span 拦住冒泡，
                                否则 Checkbox onChange + 行 onClick 双触发互相抵消 */}
                            <span onClick={(e) => e.stopPropagation()}>
                                <Checkbox checked={!!selected[r.modid]} disabled={disabled}
                                          onChange={() => toggle(r)}/>
                            </span>
                            {r.img ? <img src={r.img} alt="" style={{width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0}}/>
                                : <div style={{width: 32, height: 32, borderRadius: 4, background: 'rgba(128,128,128,0.2)', flexShrink: 0}}/>}
                            <Typography.Text style={{flex: 1, minWidth: 0}}
                                             ellipsis={{tooltip: r.name}}>{r.name || r.modid}</Typography.Text>
                            {added && <Tag style={{marginInlineEnd: 0}}>{t('level2.modPicker.added')}</Tag>}
                            {clientOnly && <Tag style={{marginInlineEnd: 0}}>{t('level2.modPicker.clientTag')}</Tag>}
                            <Typography.Text type="secondary">{r.modid}</Typography.Text>
                        </div>
                        </Tooltip>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
};
