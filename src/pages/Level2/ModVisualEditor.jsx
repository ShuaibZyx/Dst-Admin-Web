import React, {useMemo} from 'react';
import {Empty, Input, Switch, Typography} from 'antd';
import {parse} from 'lua-json';
import {luaSafe} from '../../utils/luaFormat';
import {format} from 'lua-json';
import {useTranslation} from 'react-i18next';

// modoverrides.lua 的可视化镜像：左侧表单与右侧代码同源（value → 解析 → 表单；
// 表单改动 → 重新序列化 → onChange）。代码含非标准结构时提示以代码为准。
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

// 值保型：bool 走开关、数字按数字、其余文本
const coerce = (old, raw) => {
    if (typeof old === 'boolean') return raw === true || raw === 'true';
    if (typeof old === 'number') {
        const n = Number(raw);
        return Number.isFinite(n) ? n : old;
    }
    return raw;
};

export default ({value, onChange}) => {
    const {t} = useTranslation();
    const mods = useMemo(() => parseMods(value), [value]);

    if (mods === null) {
        return <Empty description={t('level.modVisual.unparsed')} style={{marginTop: 24}}/>;
    }
    if (mods.length === 0) {
        return <Empty description={t('level.modVisual.empty')} style={{marginTop: 24}}/>;
    }

    const patch = (modId, fn) => {
        const next = mods.map(m => (m.id === modId ? fn(m) : m));
        onChange(serialize(next));
    };

    return (
        <div style={{maxHeight: 'calc(100vh - 480px)', overflowY: 'auto', paddingRight: 4}}>
            {mods.map(m => (
                <div key={m.id} style={{marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(128,128,128,0.2)'}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8}}>
                        <Typography.Text style={{maxWidth: '70%'}} ellipsis={{tooltip: m.id}}>{m.id}</Typography.Text>
                        <Switch
                            size="small"
                            checked={m.enabled}
                            checkedChildren={t('switch.open')}
                            unCheckedChildren={t('switch.close')}
                            onChange={(checked) => patch(m.id, mod => ({...mod, enabled: checked}))}
                        />
                    </div>
                    {m.enabled && m.options.length > 0 && (
                        <div style={{marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6}}>
                            {m.options.map((opt, idx) => (
                                <div key={opt.key} style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                    <Typography.Text type="secondary" style={{width: '40%', flex: 'none'}}
                                                     ellipsis={{tooltip: opt.key}}>{opt.key}</Typography.Text>
                                    {typeof opt.value === 'boolean' ? (
                                        <Switch
                                            size="small"
                                            checked={opt.value}
                                            checkedChildren={t('switch.open')}
                                            unCheckedChildren={t('switch.close')}
                                            onChange={(checked) => patch(m.id, mod => {
                                                const options = mod.options.map((o, i) => (i === idx ? {...o, value: checked} : o));
                                                return {...mod, options};
                                            })}
                                        />
                                    ) : (
                                        <Input
                                            size="small"
                                            value={String(opt.value)}
                                            onChange={(e) => patch(m.id, mod => {
                                                const options = mod.options.map((o, i) => (i === idx ? {...o, value: coerce(o.value, e.target.value)} : o));
                                                return {...mod, options};
                                            })}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
