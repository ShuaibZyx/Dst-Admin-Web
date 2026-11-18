import React, {useEffect, useMemo, useState} from "react";
import {Alert, Col, message, Row, Select, Tabs} from "antd";
import {parse, format} from "lua-json";
import {luaSafe} from "../../utils/luaFormat";
import './index.css';
import {useTranslation} from "react-i18next";
import i18n from "../../locales/i18n.tsx";
import {modSubscribedApi} from "../../api/gezigeApi";
import modWorldOptions from "../../types/modWorldOptions.json";

// ---- 图集：name -> 面板图片 URL（缓存击穿参数必须保留，图集换图后旧缓存会顶死） ----
const ATLAS_URL: Record<string, string> = {
    'worldgen_customization': './misc/worldgen_customization_game.webp?v=20261117',
    'worldsettings_customization': './misc/worldsettings_customization_game.webp?v=20261117',
    'customization_shipwrecked': '/misc/customization_shipwrecked.png?v=20261117',
    'customization_core': '/misc/customization_core.png?v=20261117',
    'worldgen_cherry': '/misc/worldgen_cherry.png?v=20261117',
};

// ---- 运行时模组选项注册表（IA/樱林等；文件里有该键才显示，与游戏"注册即显示"的差异是刻意的取舍） ----
interface ModOption {
    tab: 'WORLDGEN' | 'WORLDSETTINGS';
    group: string;
    world: string[] | null;
    master: boolean;
    value: string;
    image: string;
    atlas: { name: string, width: number, height: number, item_size: number };
    uv: { x: number, y: number } | null;
    descDomain: string;
    text: { zh: string, en: string };
    order?: number;
    modId: string;
}
const MOD_TABLE = (modWorldOptions as any).options as Record<string, ModOption>;
const MOD_DOMAINS = (modWorldOptions as any).domains as Record<string, { zh: Record<string, string>, en: Record<string, string> }>;

// master_controlled 项（季节长度/中毒/起始季节等）只在集群主世界显示——游戏 IsMasterLevel 语义，
// 面板以 server_ini.is_master 判定（集群第一/主世界），不再按世界名固化
const LOCATION: Record<string, string> = {forest: 'forest', cave: 'cave', shipwrecked: 'shipwrecked', volcano: 'volcanoworld'};

// 游戏不展示的键：WORLDGEN_MISC/WORLDSETTINGS_MISC 家族由构建器从 customize.lua 提取（hiddenKeys），
// 其余为预设书签与旧版位置模板残留
const HIDDEN_KEYS = new Set<string>([
    ...(((modWorldOptions as any).hiddenKeys as string[]) || []),
    'playstyle', 'settings_desc', 'settings_id', 'settings_name',
    'worldgen_desc', 'worldgen_id', 'worldgen_name',
    'clocktype', 'poi', 'traps', 'version',
]);

// IA 的火山岛联动（modservercreationmain.lua VOLCANO_ISLAND_OPTIONS）：
// 海难世界「火山岛=无」时隐藏火山岛系选项——与游戏补丁行为一致
const VOLCANO_ISLAND_KEYS = new Set([
    'coffeebush', 'elephantcactus', 'rock_obsidian', 'rock_charcoal', 'volcano_shrub', 'dragoon',
    'daywalker', 'rock_obsidian_regrowth', 'rock_charcoal_regrowth', 'volcano_shrub_regrowth', 'magmarock_regrowth',
]);

// 未知键（不在目录/注册表）给个通用下拉，防呆写入明显非法值
const GENERIC_OPTIONS: Array<{ value: string, label: string }> = [
    'default', 'never', 'rare', 'often', 'always', 'none', 'enabled', 'disabled', 'true', 'false',
].map(v => ({value: v, label: v}));

function getLevelObject(value: string): Record<string, any> {
    // 不删换行：多行 lua 与 -- 注释安全（删换行会让注释吞掉后续代码）
    try {
        return parse(value)
    } catch (error) {
        message.warning(i18n.t("level.warning.lua.error"))
        console.log(error)
        return {}
    }
}

function modOptionVisible(e: ModOption, worldType: string, isMaster: boolean): boolean {
    const loc = LOCATION[worldType];
    if (e.world && loc && !e.world.includes(loc)) return false;
    if (e.master && !isMaster) return false;
    return true;
}

// 一个可渲染条目（目录项或模组项）
interface RenderItem {
    key: string;
    text: string;
    image?: { x: number, y: number };
    atlas?: { name: string, width: number, height: number, item_size: number };
    desc?: Record<string, string>;
    defaultValue: any;
    isMod: boolean;
    order?: number;
}

interface GroupProps {
    leveldataoverride?: string;
    data: Record<string, Record<string, any>>;
    leveldataoverrideObject: Record<string, any>;
    onStateChange: (name: string, newValue: any) => void;
    changeValue: (value: string) => void;
    type: string;
    isWorldGen?: boolean;
    lang: string;
    // 集群主世界(server_ini.is_master)：master_controlled 项仅主世界显示
    isMaster: boolean;
    // 该页签应显示的模组项（已按 文件存在∧世界∧master 过滤），按分类分组
    modItems: Record<string, Array<[string, ModOption]>>;
    // 不在任何注册表里的文件键（仅世界规则页签渲染"模组选项"补充节）
    unknownKeys?: string[];
    // 全量写回用：该世界两个页签的目录默认值
}

const Group: React.FC<GroupProps> = ({
                                         leveldataoverride,
                                         data,
                                         leveldataoverrideObject,
                                         onStateChange,
                                         changeValue,
                                         type,
                                         isWorldGen,
                                         lang,
                                         isMaster,
                                         modItems,
                                         unknownKeys,                                     }) => {

    if (!data) return null; // F2: 数据未加载时防崩溃

    // 海难世界：火山岛=无 时隐藏火山岛系选项（游戏 IA 补丁同款）
    const volcanoIslandOff = type === 'shipwrecked'
        && !(leveldataoverrideObject?.volcanoisland && leveldataoverrideObject.volcanoisland !== 'none');

    const toRender = (key2: string, value: any, mod?: ModOption, catAtlas?: any): RenderItem => ({
        key: key2,
        text: value.text,
        image: value.image,
        // 条目只在换图集时才带 atlas，常规项回退分类图集——漏回退会导致图标整批丢失
        atlas: value.atlas || catAtlas,
        desc: value.desc,
        defaultValue: value.value,
        isMod: !!mod,
        order: value.order,
    });

    // @ts-ignore
    return (
        <>
            {Object.keys(data)
                .sort((a, b) => data[a].order - data[b].order)
                .map(key => {
                    // 完整显示该世界目录的选项集(与游戏定制界面同构);取值来自文件,未写入的取默认
                    const items: RenderItem[] = Object.entries(data[key].items)
                        .filter(([key2, value]) => (!value.master || isMaster)
                            && (!volcanoIslandOff || !VOLCANO_ISLAND_KEYS.has(key2)))
                        .map(([key2, value]) => toRender(key2, value, undefined, data[key].atlas));
                    // 模组项归入对应分类（模组可用即显示，与游戏注册行为一致）
                    for (const [key2, mod] of (modItems[key] || [])) {
                        if (volcanoIslandOff && VOLCANO_ISLAND_KEYS.has(key2)) continue;
                        items.push(toRender(key2, {
                            text: mod.text[lang.includes('zh') ? 'zh' : 'en'],
                            image: mod.uv,
                            atlas: mod.atlas,
                            desc: MOD_DOMAINS[mod.descDomain]?.[lang.includes('zh') ? 'zh' : 'en'],
                            value: mod.value,
                            order: mod.order,
                        }, mod));
                    }
                    // 与游戏同款排序：显式 order 优先(无 order 居后)，再按显示名——模组项由此就位而非堆在末尾
                    items.sort((a, b) => {
                        const ao = a.order, bo = b.order;
                        if ((ao === undefined) !== (bo === undefined)) return ao === undefined ? 1 : -1;
                        if (ao !== undefined && bo !== undefined && ao !== bo) return ao - bo;
                        return String(a.text).localeCompare(String(b.text), 'zh');
                    });
                    if (items.length === 0) return null
                    return (
                    <div key={key} style={{ overflow: 'hidden' }}>
                        <h3>{data[key].text}</h3>
                        <Row gutter={[16, 16]}>
                            {items.map(item =>
                                    <Col key={item.key} xs={24} sm={12} md={8} lg={8} xl={4}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {item.image && item.atlas && <div style={{
                                                width: '64px',
                                                height: '64px',
                                                flexShrink: 0,
                                                backgroundImage: `url(${ATLAS_URL[item.atlas.name] || ''})`,
                                                // @ts-ignore
                                                backgroundPosition: `-${Math.round(item.image.x * item.atlas.width / item.atlas.item_size) * 100}% -${Math.round(item.image.y * item.atlas.height / item.atlas.item_size) * 100}%`
                                            }}/>}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <span className={'option-name'}>{item.text}</span>
                                                <Item
                                                    options={
                                                        (item.desc && Object.entries(item.desc).map(([k, v]) => ({value: k, label: v})))
                                                        || GENERIC_OPTIONS
                                                    }
                                                    currentValue={leveldataoverrideObject[item.key]}
                                                    defaultValue={item.defaultValue}
                                                    name={item.key}
                                                    leveldataoverride={leveldataoverride}
                                                    onStateChange={onStateChange}
                                                    changeValue={changeValue}
                                                />
                                            </div>
                                        </div>
                                    </Col>)
                            }
                        </Row>
                    </div>
                    )
                })}
            {/* 拿不准归属的模组键：兜底"模组选项"节（只挂在世界规则页签） */}
            {!isWorldGen && (unknownKeys || []).length > 0 && (
                <div style={{ overflow: 'hidden' }}>
                    <h3>{lang.includes('zh') ? '模组选项' : 'Mod Options'}</h3>
                    <Row gutter={[16, 16]}>
                        {unknownKeys!.map(key2 => (
                            <Col key={key2} xs={24} sm={12} md={8} lg={8} xl={4}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '64px', height: '64px', flexShrink: 0 }}/>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <span className={'option-name'}>{key2}</span>
                                        <Item
                                            options={GENERIC_OPTIONS}
                                            currentValue={leveldataoverrideObject[key2]}
                                            defaultValue={leveldataoverrideObject[key2]}
                                            name={key2}
                                            leveldataoverride={leveldataoverride}
                                            onStateChange={onStateChange}
                                            changeValue={changeValue}
                                        />
                                    </div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </div>
            )}
        </>
    );
}

interface ItemProps {
    currentValue: any;
    defaultValue: any;
    options: Array<{ value: string; label: string }>;
    name: string;
    label?: string;
    leveldataoverride: string,
    onStateChange: (name: string, newValue: any) => void;
    changeValue: (value: string) => void;
}

const Item: React.FC<ItemProps> = ({
                                       currentValue,
                                       defaultValue,
                                       options,
                                       name,
                                       leveldataoverride,
                                       onStateChange,
                                       changeValue,                                   }) => {
    const {t} = useTranslation();
    const [isDefault, setIsDefault] = useState(true);

    useEffect(() => {
        setIsDefault(currentValue === defaultValue);
    }, [currentValue, defaultValue]);

    // 当前值不在预设值域里（文件被别处改过）也要能显示
    const selectOptions = useMemo(() => {
        if (currentValue !== undefined && currentValue !== null && !options.some(o => o.value === String(currentValue))) {
            return [{value: String(currentValue), label: String(currentValue)}, ...options];
        }
        return options;
    }, [options, currentValue]);

    function handleChange(value: any) {
        try {
            setIsDefault(value === defaultValue);
            const data: Record<string, any> = parse(leveldataoverride);
            data.overrides[name] = value;
            onStateChange(name, value);
            changeValue(format(luaSafe(data)));
        } catch (error) {
            console.log(error)
            message.warning(t("level.warning.lua.error"));
        }
    }

    const selectClassName = isDefault ? "" : "selected";
    return (
        <div>
            <Select
                style={{width: '100%'}}
                value={currentValue}
                defaultValue={defaultValue}
                onChange={handleChange}
                className={selectClassName}
                options={selectOptions}
            />
        </div>
    );
}

const LevelViewEditor: React.FC<{
    leveldataoverride?: string;
    dstWorldSetting: any;
    changeValue: (value: string) => void;
    isMaster?: boolean;
}> = ({leveldataoverride, dstWorldSetting, changeValue, isMaster}) => {

    const {t} = useTranslation();
    const {i18n} = useTranslation();
    const [lang, setLang] = useState(i18n.language);
    useEffect(() => {
        const handleLanguageChange = (lng: string) => {
            setLang(lng);
        };

        i18n.on("languageChanged", handleLanguageChange);
        return () => {
            i18n.off("languageChanged", handleLanguageChange);
        };
    }, [i18n]);

    const [leveldataoverrideObject, setLeveldataoverrideObject] = useState<Record<string, any>>(getLevelObject(leveldataoverride || '')?.overrides);
    const [levelType, setLevelType] = useState<string>()
    useEffect(() => {
        const levelObject = getLevelObject(leveldataoverride || '');
        // IA 模组火山的正式 location 是 volcanoworld(兼容旧模板的 volcano 短名)
        const loc = levelObject?.location || '';
        setLevelType(loc.includes('volcano') ? 'volcano' : loc.includes('shipwrecked') ? 'shipwrecked' : loc);
        setLeveldataoverrideObject(levelObject?.overrides)
    }, [leveldataoverride]);

    // 海难/火山世界选项必须建立在已订阅 IA 模组的基础上:未订阅不展示选项
    const [iaModReady, setIaModReady] = useState(true);
    useEffect(() => {
        modSubscribedApi('workshop-1467214795').then(r => {
            setIaModReady(!!(r.data && r.data.subscribed));
        }).catch(() => setIaModReady(true));
    }, []);

    // 获取世界默认值
    const forestWorldGenGroup = lang.includes('zh') ? dstWorldSetting.zh.forest.WORLDGEN_GROUP : dstWorldSetting.en.forest.WORLDGEN_GROUP;
    const forestWorldSettingsGroup = lang.includes('zh') ? dstWorldSetting.zh.forest.WORLDSETTINGS_GROUP : dstWorldSetting.en.forest.WORLDSETTINGS_GROUP;
    const cavesWorldGenGroup = lang.includes('zh') ? dstWorldSetting.zh.cave.WORLDGEN_GROUP : dstWorldSetting.en.cave.WORLDGEN_GROUP;
    const cavesWorldSettingsGroup = lang.includes('zh') ? dstWorldSetting.zh.cave.WORLDSETTINGS_GROUP : dstWorldSetting.en.cave.WORLDSETTINGS_GROUP;
    // 海滩/火山与森林洞穴同级：同一 dstWorldSetting 数据通道
    const shipwreckedWorldGenGroup = lang.includes('zh') ? dstWorldSetting.zh?.shipwrecked?.WORLDGEN_GROUP : dstWorldSetting.en?.shipwrecked?.WORLDGEN_GROUP;
    const shipwreckedWorldSettingsGroup = lang.includes('zh') ? dstWorldSetting.zh?.shipwrecked?.WORLDSETTINGS_GROUP : dstWorldSetting.en?.shipwrecked?.WORLDSETTINGS_GROUP;
    const volcanoWorldGenGroup = lang.includes('zh') ? dstWorldSetting.zh?.volcano?.WORLDGEN_GROUP : dstWorldSetting.en?.volcano?.WORLDGEN_GROUP;
    const volcanoWorldSettingsGroup = lang.includes('zh') ? dstWorldSetting.zh?.volcano?.WORLDSETTINGS_GROUP : dstWorldSetting.en?.volcano?.WORLDSETTINGS_GROUP;

    // 全目录键集合（四世界全量）：文件里出现但属于"别的世界原版项"时按游戏行为隐藏（如洞穴文件里的 hunger）
    const catalogKeySet = useMemo(() => {
        const s = new Set<string>();
        for (const langKey of ['zh', 'en']) {
            const tree = dstWorldSetting?.[langKey];
            if (!tree) continue;
            for (const w of Object.keys(tree)) {
                for (const gk of Object.keys(tree[w] || {})) {
                    for (const cat of Object.values(tree[w][gk] || {}) as any[]) {
                        for (const k of Object.keys(cat?.items || {})) s.add(k);
                    }
                }
            }
        }
        return s;
    }, [dstWorldSetting]);

    // 当前世界静态目录已显示的键（模组项合成去重用——海难/火山的 IA 项已烘进目录，勿重复渲染）
    const worldKeySet = useMemo(() => {
        const s = new Set<string>();
        const collect = (groups: any) => {
            for (const cat of Object.values(groups || {}) as any[]) {
                for (const k of Object.keys(cat?.items || {})) s.add(k);
            }
        };
        if (levelType === 'forest') {
            collect(forestWorldGenGroup); collect(forestWorldSettingsGroup);
        } else if (levelType === 'cave') {
            collect(cavesWorldGenGroup); collect(cavesWorldSettingsGroup);
        } else if (levelType === 'shipwrecked') {
            collect(shipwreckedWorldGenGroup); collect(shipwreckedWorldSettingsGroup);
        } else if (levelType === 'volcano') {
            collect(volcanoWorldGenGroup); collect(volcanoWorldSettingsGroup);
        }
        return s;
    }, [levelType, forestWorldGenGroup, forestWorldSettingsGroup, cavesWorldGenGroup, cavesWorldSettingsGroup,
        shipwreckedWorldGenGroup, shipwreckedWorldSettingsGroup, volcanoWorldGenGroup, volcanoWorldSettingsGroup]);

    // 模组可用性（服务器已下载/订阅）：注册项"模组可用即显示"，与游戏"注册即显示"一致；
    // 键已写进文件的也显示（模组被移除但文件残留时仍可查看/编辑）。新建世界由此不再缺项。
    const [modAvail, setModAvail] = useState<Record<string, boolean>>({});
    useEffect(() => {
        const ids = [...new Set(Object.values(MOD_TABLE).map(e => e.modId))];
        for (const id of ids) {
            modSubscribedApi(id).then(r => {
                setModAvail(prev => ({...prev, [id]: !!(r.data && r.data.subscribed)}));
            }).catch(() => setModAvail(prev => ({...prev, [id]: true})));
        }
    }, []);

    // 该世界应显示的模组项（已按 世界∧master∧(模组可用∨文件已有)∧目录去重 过滤）
    const visibleModOptions = useMemo(() => {
        const obj = leveldataoverrideObject || {};
        const out: Array<[string, ModOption]> = [];
        for (const [k, e] of Object.entries(MOD_TABLE)) {
            if (worldKeySet.has(k)) continue;                 // 当前世界静态目录已有（海难/火山的 IA 项）
            if (!(k in obj) && !modAvail[e.modId]) continue;  // 模组不可用且文件也没写 → 不显示
            if (!modOptionVisible(e, levelType || '', !!isMaster)) continue;
            out.push([k, e]);
        }
        return out;
    }, [leveldataoverrideObject, worldKeySet, modAvail, levelType, isMaster]);

    // 按页签/分类归组
    const modItemsFor = useMemo(() => {
        const res: Record<'WORLDGEN' | 'WORLDSETTINGS', Record<string, Array<[string, ModOption]>>> = {
            WORLDGEN: {}, WORLDSETTINGS: {}
        };
        for (const [k, e] of visibleModOptions) {
            (res[e.tab][e.group] ||= []).push([k, e]);
        }
        return res;
    }, [visibleModOptions]);

    // 拿不准归属的文件键（游戏里没注册过的残留/第三方模组项）
    const unknownKeys = useMemo(() => {
        const out: string[] = [];
        for (const k of Object.keys(leveldataoverrideObject || {})) {
            if (catalogKeySet.has(k) || MOD_TABLE[k] || HIDDEN_KEYS.has(k)) continue;
            out.push(k);
        }
        return out.sort();
    }, [leveldataoverrideObject, catalogKeySet]);


    const groupFor = (type: string, groups: any, tab: 'WORLDGEN' | 'WORLDSETTINGS', isWorldGen?: boolean) => (
        <Group
            leveldataoverride={leveldataoverride}
            data={groups}
            leveldataoverrideObject={leveldataoverrideObject}
            onStateChange={(name, newValue) => {
                setLeveldataoverrideObject(current => {
                    current[name] = newValue;
                    return {...current};
                });
            }}
            changeValue={changeValue}
            type={type}
            isWorldGen={isWorldGen}
            lang={lang}
            isMaster={!!isMaster}
            modItems={modItemsFor[tab]}
            unknownKeys={tab === 'WORLDSETTINGS' ? unknownKeys : undefined}
        />
    );

    const shipwreckedItems = [
        {label: t("level.worldSettings"), children: groupFor('shipwrecked', shipwreckedWorldSettingsGroup, 'WORLDSETTINGS'), key: '1'},
        {label: t("level.worldGeneration"), children: groupFor('shipwrecked', shipwreckedWorldGenGroup, 'WORLDGEN', true), key: '2'},
    ];

    const volcanoItems = [
        {label: t("level.worldSettings"), children: groupFor('volcano', volcanoWorldSettingsGroup, 'WORLDSETTINGS'), key: '1'},
        {label: t("level.worldGeneration"), children: groupFor('volcano', volcanoWorldGenGroup, 'WORLDGEN', true), key: '2'},
    ];

    const forestItems = [
        {label: t("level.worldSettings"), children: groupFor('forest', forestWorldSettingsGroup, 'WORLDSETTINGS'), key: '1'},
        {label: t("level.worldGeneration"), children: groupFor('forest', forestWorldGenGroup, 'WORLDGEN'), key: '2'},
    ];

    const caveItems = [
        {label: t("level.worldSettings"), children: groupFor('cave', cavesWorldSettingsGroup, 'WORLDSETTINGS'), key: 3},
        {label: t("level.worldGeneration"), children: groupFor('cave', cavesWorldGenGroup, 'WORLDGEN', true), key: 4},
    ];

    return (
        <>
            <div className={'scrollbar'} style={{
                "height": "calc(100vh - 420px)",
                "minHeight": "300px",
                overflowY: 'auto',
            }}>
                {levelType === 'forest' && <Tabs items={forestItems}/>}
                {levelType === 'cave' && <Tabs items={caveItems}/>}
                {levelType === 'shipwrecked' && (iaModReady ? <Tabs items={shipwreckedItems}/> :
                    <Alert message={t('level.ia.modRequired')} type="warning" showIcon/>)}
                {levelType === 'volcano' && (iaModReady ? <Tabs items={volcanoItems}/> :
                    <Alert message={t('level.ia.modRequired')} type="warning" showIcon/>)}
                {levelType && levelType !== 'forest' && levelType !== 'cave' && levelType !== 'shipwrecked' && levelType !== 'volcano' && (
                    <Alert style={{marginBottom: '4px'}} message={`${t("level.warning.not.support.view")} ${levelType}`}
                           type="info" showIcon closable/>
                )}
            </div>
        </>
    );
}

export default LevelViewEditor;
