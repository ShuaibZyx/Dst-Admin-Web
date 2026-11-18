import React, {useMemo} from 'react';
import {Divider, Empty, Input, InputNumber, Switch, Typography} from 'antd';
import {parse, format} from 'lua-json';
import {luaSafe} from '../../utils/luaFormat';
import {useTranslation} from 'react-i18next';

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
    const patchOption = (modId, key, value) =>
        patch(modId, mod => ({...mod, options: mod.options.map(o => (o.key === key ? {...o, value} : o))}));

    return (
        <div style={{maxHeight: 'calc(100vh - 480px)', overflowY: 'auto', paddingRight: 4}}>
            {mods.map(m => (
                <React.Fragment key={m.id}>
                    <Divider style={{margin: '12px 0 8px'}}>
                        <span style={{fontSize: '14px', fontWeight: '600'}}>{m.id}</span>
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
                    {m.enabled && m.options.map((opt) => (
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
                </React.Fragment>
            ))}
        </div>
    );
};
