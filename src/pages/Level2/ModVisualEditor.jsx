import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Divider, Empty, Input, InputNumber, Switch, Tooltip, Typography} from 'antd';
import {SearchOutlined} from '@ant-design/icons';
import {parse, format} from 'lua-json';
import {luaSafe} from '../../utils/luaFormat';
import {modMatches} from '../../utils/modIndex';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../../hooks/useTheme';

// modoverrides.lua 的可视化镜像（样式沿用模组配置抽屉：Divider 加粗标题 + 标签/控件行）。
// 与代码视图同源：value → 解析 → 表单；表单改动 → 重新序列化 → onChange。
const parseMods = (value) => {
    try {
        const data = parse(value || 'return {}');
        if (!data || typeof data !== 'object') return null;
        return Object.entries(data).map(([id, mod]) => ({
            id,
            enabled: !!(mod && mod.enabled),
            options: mod && typeof mod.configuration_options === 'object' && mod.configuration_options !== null
                ? Object.entries(mod.configuration_options).map(([k, v]) => ({key: k, value: v}))
                : [],
        }));
    } catch (e) {
        return null;
    }
};

const serialize = (mods) => {
    const table = {};
    for (const m of mods) {
        const cfg = {};
        for (const {key, value} of m.options) cfg[key] = value;
        table[m.id] = {enabled: m.enabled, configuration_options: cfg};
    }
    return format(luaSafe(table));
};

const Row = ({label, control}) => (
    <div style={{display: 'flex', alignItems: 'center', margin: '6px 0'}}>
        <div style={{width: '33%', flex: 'none', paddingRight: 12, textAlign: 'right'}}>
            <Typography.Text type="secondary">{label}</Typography.Text>
        </div>
        <div style={{flex: 1, minWidth: 0}}>{control}</div>
    </div>
);

// 配置项滚入视口才挂载：进入（rootMargin 200px 预载）后不再卸载；小卡（≤8 项）直接挂。
// 未挂载渲染等高占位，避免滚动条高度跳动。
const LazyOptions = ({options, rootRef, children}) => {
    const [mounted, setMounted] = useState(() => options.length <= 8);
    const ref = useRef(null);

    useEffect(() => {
        if (mounted) return;
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
                setMounted(true);
                observer.disconnect();
            }
        }, {root: rootRef?.current || null, rootMargin: '200px'});
        observer.observe(el);
        return () => observer.disconnect();
    }, [mounted, rootRef]);

    if (!mounted) return <div ref={ref} style={{minHeight: 44 * options.length}}/>;
    return <>{children}</>;
};

export default ({value, onChange, nameMap = {}, activeModId = null, onSelectMod, focus = null}) => {
    const {t} = useTranslation();
    const {theme} = useTheme();
    const [query, setQuery] = useState('');
    const scrollRef = useRef(null);
    const cardRefs = useRef({});
    const mods = useMemo(() => parseMods(value), [value]);

    // 左→右联动：光标驱动的聚焦（focus 换代）才把卡片滚入视口；点标题不推进 focus、不回拉
    useEffect(() => {
        if (!focus?.id) return;
        cardRefs.current[focus.id]?.scrollIntoView({block: 'center'});
    }, [focus]);

    if (mods === null) {
        return <Empty description={t('level.modVisual.unparsed')} style={{marginTop: 24}}/>;
    }
    if (mods.length === 0) {
        return <Empty description={t('level.modVisual.empty')} style={{marginTop: 24}}/>;
    }

    const visible = mods.filter(m => modMatches(m.id, nameMap[m.id], query));

    const patch = (modId, fn) => {
        const next = mods.map(m => (m.id === modId ? fn(m) : m));
        onChange(serialize(next));
    };
    const patchOption = (modId, key, value) =>
        patch(modId, mod => ({...mod, options: mod.options.map(o => (o.key === key ? {...o, value} : o))}));

    return (
        <div ref={scrollRef} style={{
            height: 'calc(100vh - 280px)', minHeight: 400, maxHeight: 800,
            overflowY: 'auto', paddingRight: 4,
        }}>
            <div style={{
                position: 'sticky', top: 0, zIndex: 2, padding: '4px 0 10px',
                background: theme === 'dark' ? '#141414' : '#fff',
            }}>
                <Input
                    allowClear
                    prefix={<SearchOutlined/>}
                    placeholder={t('level.modVisual.search.placeholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>
            {visible.length === 0 ? (
                <Empty description={t('level.modVisual.search.empty')} style={{marginTop: 24}}/>
            ) : visible.map(m => (
                <div key={m.id} ref={(el) => { cardRefs.current[m.id] = el; }}
                     className={m.id === activeModId ? 'mod-card-active' : undefined}
                     style={{padding: '2px 8px'}}>
                    <Divider style={{margin: '12px 0 8px'}}>
                        <span
                            style={{fontSize: '14px', fontWeight: '600', cursor: 'pointer'}}
                            onClick={() => onSelectMod?.(m.id)}
                        >
                            {nameMap[m.id] ? <Tooltip title={m.id}>{nameMap[m.id]}</Tooltip> : m.id}
                        </span>
                    </Divider>
                    <Row
                        label={t('level.modVisual.enabled')}
                        control={
                            <Switch
                                checked={m.enabled}
                                checkedChildren={t('switch.open')}
                                unCheckedChildren={t('switch.close')}
                                onChange={(checked) => patch(m.id, mod => ({...mod, enabled: checked}))}
                            />
                        }
                    />
                    {m.enabled && (
                        <LazyOptions options={m.options} rootRef={scrollRef}>
                            {m.options.map((opt) => (
                                <Row
                                    key={opt.key}
                                    label={<Typography.Text type="secondary" ellipsis={{tooltip: opt.key}}>{opt.key}</Typography.Text>}
                                    control={
                                        typeof opt.value === 'boolean' ? (
                                            <Switch
                                                checked={opt.value}
                                                checkedChildren={t('switch.open')}
                                                unCheckedChildren={t('switch.close')}
                                                onChange={(checked) => patchOption(m.id, opt.key, checked)}
                                            />
                                        ) : typeof opt.value === 'number' ? (
                                            <InputNumber
                                                value={opt.value}
                                                style={{width: '100%'}}
                                                onChange={(v) => v !== null && v !== undefined && patchOption(m.id, opt.key, v)}
                                            />
                                        ) : typeof opt.value === 'string' ? (
                                            <Input
                                                value={opt.value}
                                                onChange={(e) => patchOption(m.id, opt.key, e.target.value)}
                                            />
                                        ) : (
                                            /* 表/数组等非标量值不做表单编辑（会改型），只读展示、到左侧代码改 */
                                            <Typography.Text type="secondary" ellipsis={{tooltip: String(opt.value)}}>
                                                {String(opt.value)}
                                            </Typography.Text>
                                        )
                                    }
                                />
                            ))}
                        </LazyOptions>
                    )}
                </div>
            ))}
        </div>
    );
};
