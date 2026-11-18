import React, {useEffect, useRef, useState} from 'react';
import {Button, Divider, Input, message, Modal, Radio, Tabs, Typography} from 'antd';
import {PlusOutlined, RedoOutlined} from '@ant-design/icons';
import {useTranslation} from 'react-i18next';
import LevelViewer from './LevelViewer.tsx';
import Modoverrides from './Modoverrides';
import ServerIni from './ServerIni';
import ModPicker from './ModPicker';
import {appendModsToOverrides, ensureModEnabled} from '../../utils/modIndex';
import {modSubscribedApi} from '../../api/gezigeApi';
import {forest, cave} from '../../utils/dst';
import {shipwreckedTpl, volcanoTpl} from '../../types/dst.ts';

const TYPE_TPL = {forest, cave, shipwrecked: shipwreckedTpl, volcano: volcanoTpl};
const IA_MOD_KEY = 'workshop-1467214795';

// 世界类型条目：同世界设置左竖列的行样式（无图标、无尾叉），行首加单选
const TYPE_OPTIONS = [
    {value: 'forest', labelKey: 'level.type.forest'},
    {value: 'cave', labelKey: 'level.type.caves'},
    {value: 'shipwrecked', labelKey: 'level.type.shipwrecked', ia: true},
    {value: 'volcano', labelKey: 'level.type.volcano', ia: true},
];

// 创建世界配置台：草稿式完整编辑（世界生成/模组双栏/server_ini），创建一次落盘。
// 草稿不持久化（刷新即丢）；失败保留草稿可重试。
const CreateWorld = ({dstWorldSetting, has, getExisting, onCreated, getServerIniInit, getIAEntry}) => {
    const {t} = useTranslation();
    // 初始即 forest 模板（空文本会让 LevelViewer 误报 Lua 解析错误；type 同步预选）
    const emptyDraft = () => ({
        levelName: '',
        uuid: '',
        type: 'forest',
        leveldataoverride: forest,
        modoverrides: 'return {}',
        server_ini: getServerIniInit ? getServerIniInit() : null,
    });
    const [draft, setDraft] = useState(emptyDraft);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [iaModReady, setIaModReady] = useState(true);
    // 名称/文件名在「创建」时弹窗输入（左栏只留类型）
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formName, setFormName] = useState('');
    const [formUuid, setFormUuid] = useState('');
    // 当前模板原文：leveldataoverride 仍逐字等于它（未手改）才允许切 type 时换模板
    const templateTextRef = useRef(forest);

    useEffect(() => {
        modSubscribedApi(IA_MOD_KEY).then(r => {
            setIaModReady(!!(r.data && r.data.subscribed))
        }).catch(() => setIaModReady(true))
    }, []);

    // 切类型：未手改才换模板（换后记新模板原文）；手改过保留并提示
    const onTypeChange = (type) => {
        const tpl = TYPE_TPL[type] || '';
        const untouched = !draft.leveldataoverride || draft.leveldataoverride === templateTextRef.current;
        if (untouched) {
            templateTextRef.current = tpl;
            setDraft(d => ({...d, type, leveldataoverride: tpl}));
        } else {
            message.info(t('level2.create.keepEditedConfig'));
            setDraft(d => ({...d, type}));
        }
    };

    // 订阅池添加模组：追加语义（appendModsToOverrides 内部跳过已有键）；解析失败不动草稿
    const onAddMods = (rows) => {
        const next = appendModsToOverrides(
            draft.modoverrides,
            rows.map(r => ({modid: r.modid, modConfig: r.mod_config})),
        );
        if (next === null) {
            message.warning(t('level2.create.modParseError'));
            return;
        }
        setDraft(d => ({...d, modoverrides: next}));
    };

    // 与原「添加世界」弹窗同规则：重名/文件名（重复、含子串、特殊字符）/必填
    const validate = (levelName, uuid) => {
        const {names, uuids} = getExisting();
        if (!levelName) return t('level.warning.name.not.allow.null');
        if (names.includes(levelName)) return t('level.name.duplication');
        if (!uuid) return t('level2.filename.required');
        if (uuids.includes(uuid)) return t('level.filename.duplication');
        if (uuids.some(u => u.includes(uuid))) return t('level.filename.error.substring');
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(uuid)) return t('level.filename.error.contain.special.characters');
        if (!draft.type) return t('level.required.type');
        return null;
    };

    const submit = async (levelName, uuid) => {
        let modoverrides = draft.modoverrides;
        if (draft.type === 'shipwrecked' || draft.type === 'volcano') {
            // IA 世界规则：自动补入启用的 IA 模组（缺键插 entry、已存在只翻 enabled）
            const entry = typeof getIAEntry === 'function' ? getIAEntry() : null;
            if (entry) modoverrides = ensureModEnabled(modoverrides, IA_MOD_KEY, entry) ?? modoverrides;
        }
        const server_ini = {...(draft.server_ini || {})};
        // 名字单向补：server_ini.name 为空才补世界名（端口等不随名重算）
        if (!server_ini.name) server_ini.name = levelName;
        setCreating(true);
        const ok = await onCreated({
            levelName,
            uuid,
            type: draft.type,
            leveldataoverride: draft.leveldataoverride,
            modoverrides,
            server_ini,
        });
        setCreating(false);
        if (ok) {
            setDraft(emptyDraft());
            templateTextRef.current = forest;
        }
    };

    const reset = () => Modal.confirm({
        title: t('level2.create.resetConfirm'),
        okType: 'danger',
        onOk: () => {
            setDraft(emptyDraft());
            templateTextRef.current = forest;
        },
    });

    return (<>
        <div style={{display: 'flex', gap: 12}}>
        {/* 左栏：世界类型（与世界竖列同构图）；名称/文件名在「创建」弹窗输入 */}
        <div style={{width: 220, flex: 'none'}}>
            <Typography.Text type="secondary">{t('level.type')}</Typography.Text>
            {/* 同世界设置左竖列的行样式（无图标、无尾叉），行首加单选；选中行金色高亮 */}
            <div style={{marginTop: 4}}>
                {TYPE_OPTIONS.filter(o => !o.ia || iaModReady).map(o => (
                    <div key={o.value} onClick={() => onTypeChange(o.value)}
                         style={{
                             display: 'flex', alignItems: 'center', gap: 8,
                             padding: '6px 8px', cursor: 'pointer', borderRadius: 4,
                             background: draft.type === o.value ? 'rgba(232, 196, 106, 0.12)' : undefined,
                         }}>
                        <Radio checked={draft.type === o.value}/>
                        <div style={{flex: 1, minWidth: 0}}>{t(o.labelKey)}</div>
                    </div>
                ))}
            </div>
        </div>

        {/* 右区：三段结构完全照抄世界 tab（tab 在上、内容在下） */}
        <div style={{flex: 1, minWidth: 0}}>
        <Tabs items={[
            {
                key: '1',
                label: t('level.leveldataoverride'),
                children: (
                    <LevelViewer leveldataoverride={draft.leveldataoverride} dstWorldSetting={dstWorldSetting}
                                 isMaster={!!draft.server_ini?.is_master}
                                 changeValue={(v) => setDraft(d => ({...d, leveldataoverride: v}))}/>
                ),
            },
            {
                key: '2',
                label: t('level.modoverrides'),
                children: (
                    <div>
                        <Button icon={<PlusOutlined/>} style={{marginBottom: 8}}
                                onClick={() => setPickerOpen(true)}>
                            {t('level2.create.addMods')}
                        </Button>
                        <Modoverrides level={{...draft}} levelName={draft.levelName} has={has}
                                      changeLevel={(_n, v) => setDraft(d => ({...d, ...v}))}/>
                    </div>
                ),
            },
            {
                key: '3',
                label: t('level.serverIni'),
                children: (
                    <ServerIni level={{...draft}} levelName={draft.levelName} has={has}
                               changeLevel={(_n, v) => setDraft(d => ({...d, ...v}))}/>
                ),
            },
        ]}/>
        </div>
        </div>

        {/* 底栏（同世界设置的位置）：创建/重置 */}
        <Divider/>
        <div style={{display: 'flex', gap: 8}}>
            <Button type="primary" icon={<PlusOutlined/>} onClick={() => {
                setFormName(draft.levelName || '');
                setFormUuid(draft.uuid || '');
                setCreateOpen(true);
            }}>{t('level2.create.submit')}</Button>
            <Button icon={<RedoOutlined/>} onClick={reset}>{t('level2.create.reset')}</Button>
        </div>

        {/* 创建弹窗：世界名称/文件名 */}
        <Modal title={t('level2.createTab')} open={createOpen} confirmLoading={creating}
               onCancel={() => setCreateOpen(false)}
               onOk={() => {
                   const err = validate(formName, formUuid);
                   if (err) {
                       message.error(err);
                       return;
                   }
                   setCreateOpen(false);
                   submit(formName, formUuid);
               }}>
            <div style={{marginBottom: 12}}>
                <Typography.Text type="secondary">{t('level.name')}</Typography.Text>
                <Input placeholder={t('level.placeholder.name')} value={formName} style={{marginTop: 4}}
                       onChange={(e) => setFormName(e.target.value)}/>
            </div>
            <div>
                <Typography.Text type="secondary">{t('level.filename')}</Typography.Text>
                <Input placeholder={t('level.placeholder.filename')} value={formUuid} style={{marginTop: 4}}
                       onChange={(e) => setFormUuid(e.target.value)}/>
            </div>
        </Modal>

        <ModPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onAdd={onAddMods}/>
    </>);
};

export default CreateWorld;
