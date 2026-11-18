import {shipwreckedTpl, volcanoTpl} from "../../types/dst.ts";
import {parse} from "lua-json";
import Modoverrides from "./Modoverrides";
import ServerIni from "./ServerIni";
import CreateWorld from "./CreateWorld";
import {fillLevelDefaults} from "../../utils/levelDefaults";
import {useTranslation} from "react-i18next";
import React, {useEffect, useRef, useState} from "react";
import {Alert, Button, Divider, Dropdown, Empty, Form, Input, message, Modal, Skeleton, Space, Tabs, TabsProps, Tag, Tooltip, Upload} from "antd";
import type {MenuProps} from 'antd';
import {CloseOutlined, EditOutlined, ImportOutlined, DownloadOutlined, SaveOutlined, PlusOutlined, AppstoreOutlined} from '@ant-design/icons';
import type {MonacoEditorRef} from "../NewEditor2";
// Monaco 体积大,懒加载(类型走 type import 不进运行时)
const MonacoEditor2 = React.lazy(() => import("../NewEditor2"));
import {useTheme} from "../../hooks/useTheme";
import {useParams} from "react-router-dom";

import axios from "axios";
import LevelViewer from "./LevelViewer.tsx";
import {getLevelListApi, createLevelApi, deleteLevelApi, updateLevelsApi, getLevelStatusApi} from "../../api/levelApi";
import {modSubscribedApi} from "../../api/gezigeApi";
import type {LevelData, LevelServerIni} from "../../type";
import {forest} from "../../utils/dst";
import Preinstall from "../Tool/Preinstall/index.jsx";

// 世界标签组件
interface LevelTagsProps {
    isMaster?: boolean;
    serverPort?: number;
}

const LevelTags: React.FC<LevelTagsProps> = ({isMaster, serverPort}) => {
    const {t} = useTranslation();
    return (
        <>
            {isMaster && <Tag color="blue" bordered={false}>{t('level2.tag.master')}</Tag>}
            {serverPort && <Tag color="green" bordered={true}>{serverPort}</Tag>}
        </>
    );
};

// 世界标签：双击/右键「重命名」直接在标签上内联编辑（Enter/失焦提交、Esc 取消），不弹窗
const LevelTabLabel: React.FC<{
    levelName: string,
    isMaster?: boolean,
    serverPort?: number,
    onCommitName: (newName: string) => void,
}> = ({levelName, isMaster, serverPort, onCommitName}) => {
    const {t} = useTranslation();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(levelName);
    useEffect(() => {
        setDraft(levelName);
    }, [levelName]);

    const startEdit = () => {
        setDraft(levelName);
        setEditing(true);
    };
    const commit = () => {
        setEditing(false);
        const v = draft.trim();
        if (v && v !== levelName) {
            onCommitName(v);
        }
    };

    const menuItems: MenuProps['items'] = [{
        key: 'rename',
        label: t('level2.rename'),
        icon: <EditOutlined/>,
        onClick: startEdit,
    }];

    return (
        <Dropdown menu={{items: menuItems}} trigger={['contextMenu']}>
            <div
                onDoubleClick={startEdit}
                style={{cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '8px'}}
            >
                {editing ? (
                    <Input
                        size="small"
                        autoFocus
                        value={draft}
                        style={{width: '110px'}}
                        onChange={e => setDraft(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onPressEnter={e => (e.target as HTMLInputElement).blur()}
                        onBlur={commit}
                        onKeyDown={e => {
                            if (e.key === 'Escape') {
                                setDraft(levelName);
                                setEditing(false);
                            }
                        }}
                    />
                ) : (
                    <span>{levelName}</span>
                )}
                <LevelTags isMaster={isMaster} serverPort={serverPort}/>
            </div>
        </Dropdown>
    );
};

interface LevelItemProps {
    dstWorldSetting?: Record<string, object>
    levelName: string,
    level: LevelData,
    changeLevel: (levelName: string, newValue: Record<string, unknown>) => void,
    has: (permission: string) => boolean
}

const LevelItem: React.FC<LevelItemProps> = ({dstWorldSetting, levelName, level, changeLevel, has}) => {
    const {t} = useTranslation();
    useEffect(() => {
    }, [level]);
    const items: any = [
        {
            label: t('level.leveldataoverride'),
            children: <div className={'scrollbar'} style={{
                height: 'calc(100vh - 290px)',
                minHeight: '400px',
                overflowY: 'auto',
            }}>
                <Leveldataoverride dstWorldSetting={dstWorldSetting}
                                   levelName={levelName}
                                   level={level} changeLevel={changeLevel} has={has}/>
            </div>,
            key: 1,
        },
        {
            label: t('level.modoverrides'),
            children: <div className={'scrollbar'} style={{
                height: 'calc(100vh - 290px)',
                minHeight: '400px',
                overflowY: 'auto',
            }}><Modoverrides levelName={levelName} level={level}
                             changeLevel={changeLevel} has={has}/>
            </div>,
            key: 2,
        },
        {
            key: 3,
            label: t('level.serverIni'),
            children: <div className={'scrollbar'} style={{
                height: 'calc(100vh - 290px)',
                minHeight: '400px',
                overflowY: 'auto',
            }}><ServerIni levelName={levelName} level={level}
                          changeLevel={changeLevel} has={has}/>
            </div>,
        },
    ];

    return (
        <div>
            <Tabs items={items}/>
        </div>
    );
};

const Leveldataoverride: React.FC<LevelItemProps> = (props) => {
    const {theme} = useTheme()
    const {t} = useTranslation()

    const editorRef = useRef<MonacoEditorRef>(null);
    const valueRef = useRef(props.level?.leveldataoverride || '')
    const [leveldataoverride, setLeveldataoverride] = useState<string>(props.level?.leveldataoverride || '')
    // editorRef?: React.RefObject<MonacoEditorRef>;

    useEffect(() => {
        editorRef.current?.setValue(props.level?.leveldataoverride || '')
        setLeveldataoverride(props.level?.leveldataoverride || '')
        valueRef.current = props.level?.leveldataoverride || ''
    }, [props.level?.leveldataoverride]);

    const items: TabsProps['items'] = [
        {
            forceRender: true,
            key: '1',
            label: t('level.view'),
            children: <LevelViewer leveldataoverride={leveldataoverride} dstWorldSetting={props.dstWorldSetting}
                                   isMaster={!!props.level?.server_ini?.is_master}
                                   changeValue={(value) => {
                                       props.changeLevel(props.levelName, {leveldataoverride: value})
                                       editorRef?.current?.setValue(value)
                                   }}/>,
        },
        {
            forceRender: true,
            key: '2',
            label: t('level.edit'),
            children: <div>
                <React.Suspense fallback={null}>
<React.Suspense fallback={null}><MonacoEditor2 ref={editorRef}
                               theme={theme === 'dark' ? 'vs-dark' : ''}
                               style={{
                                   "height": "calc(100vh - 340px)",
                                   "minHeight": "300px",
                                   "width": "100%"
                               }}
                               onChange={value => {
                                   if (props.changeLevel) {
                                       props.changeLevel(props.levelName, {leveldataoverride: value})
                                       setLeveldataoverride(value)
                                   }
                               }}
                /></React.Suspense>
</React.Suspense>
            </div>,
        },
    ];


    return (<Skeleton loading={false}>
        <Tabs defaultActiveKey="1" type={'card'} destroyInactiveTabPane={true} items={items}/>
    </Skeleton>)
}


const defaultDstWorldSetting = {
    zh: {
        forest: {
            WORLDGEN_GROUP: {},
            WORLDSETTINGS_GROUP: {}
        },
        cave: {
            WORLDGEN_GROUP: {},
            WORLDSETTINGS_GROUP: {}
        },
        shipwrecked: {
            WORLDGEN_GROUP: {},
            WORLDSETTINGS_GROUP: {}
        },
        volcano: {
            WORLDGEN_GROUP: {},
            WORLDSETTINGS_GROUP: {}
        }
    },
    en: {
        forest: {
            WORLDGEN_GROUP: {},
            WORLDSETTINGS_GROUP: {}
        },
        cave: {
            WORLDGEN_GROUP: {},
            WORLDSETTINGS_GROUP: {}
        }
    }
}

function base64ToUtf8(base64: string) {
    return new TextDecoder().decode(Uint8Array.from(atob(base64), c => c.charCodeAt(0)));
}


const Level2 = () => {
    const {cluster} = useParams<{ cluster?: string }>();

    const has= (p: string)=>{
        return true
    }

    const {t} = useTranslation();
    const {i18n} = useTranslation();
    const lang = i18n.language;

    const [dstWorldSetting, setDstWorldSetting] = useState(defaultDstWorldSetting)
    const [loading, setLoading] = useState(true)

    const levelListRef = useRef<LevelData[]>([]);
    const [items, setItems] = useState<TabsProps['items']>([])
    const itemsRef = useRef<TabsProps['items']>([])
    const [activeKey, setActiveKey] = useState('');
    // 顶层两 tab：世界设置（世界竖列+编辑区）| 创建世界（配置台）
    const [topTab, setTopTab] = useState('settings');

    // Modal states
    const [templateOpen, setTemplateOpen] = useState(false)
    const [openDelete, setOpenDelete] = useState(false)
    const [openDownload, setOpenDownload] = useState(false)
    const [downloadFileName, setDownloadFileName] = useState<string>('')
    const [confirmLoading, setConfirmLoading] = useState(false)
    const [deleteLevelName, setDeleteLevelName] = useState("")

    // IA 模组订阅状态(海难/火山世界创建闸门)
    const [iaModReady, setIaModReady] = useState(true)
    useEffect(() => {
        modSubscribedApi('workshop-1467214795').then(r => {
            setIaModReady(!!(r.data && r.data.subscribed))
        }).catch(() => setIaModReady(true))
    }, [])


    const changeLevel = (levelName: string, changeValue: Record<string, unknown>) => {
        const oldLevels = levelListRef.current
        levelListRef.current = oldLevels.map(level => {
            if (level.levelName === levelName) {
                return {...level, ...changeValue}
            }
            return level
        })
        refreshDirty()

        // 如果修改了 server_ini，更新对应标签的 label
        if (changeValue.server_ini && itemsRef.current && itemsRef.current.length > 0) {
            const updatedLevel = levelListRef.current.find(l => l.levelName === levelName)
            if (!updatedLevel) {
                return
            }

            const newItems = itemsRef.current.map(item => {
                // 只更新匹配的 item
                if (item.key === updatedLevel.uuid) {
                    const closable = (updatedLevel.uuid !== "Master" && has('allowAddLevel'))
                    
                    // 只更新 label，保持 children 不变以避免重新渲染
                    return {
                        ...item,
                        closable: closable,
                        label: (<LevelTabLabel levelName={levelName} isMaster={server_ini?.is_master} serverPort={server_ini?.server_port} onCommitName={(n) => applyRename(uuid, n)}/>)
                    }
                }
                // 其他 item 保持不变
                return item
            })

            itemsRef.current = newItems
            setItems(newItems)
        }
    }

    // 世界模板弹窗应用后需重新加载:提取为组件级函数供初始加载与 reload 共用
    const fetchData = async () => {
        setLoading(true);
        try {
                const response = await axios.get('/misc/dst_world_setting.json');

                let dstWorldSetting = response.data;
                if (typeof dstWorldSetting === 'string') {
                    try {
                        dstWorldSetting = JSON.parse(dstWorldSetting);
                    } catch {
                        dstWorldSetting = JSON.parse(base64ToUtf8(dstWorldSetting));
                    }
                } // R1: 兼容本地 JSON 与 Gitee base64 两种形态
                setDstWorldSetting(dstWorldSetting);

                
                const resp = await getLevelListApi();
                if (resp.code === 200 && resp.data) {
                    const levels = resp.data
                    levelListRef.current = levels
                    savedSnapshotRef.current = semanticSnapshot()
                    setDirty(false)
                    const items2 = levels.map(level => {
                        // master 世界不允许删除（海难模板的主世界是 Shipwrecked，不能只认 uuid=Master）
                        const closable = (!level.server_ini?.is_master && level.uuid !== "Master" && has('allowAddLevel'))
                        if (lang === "en") {
                            if (level.uuid === "Master") {
                                level.levelName = "Forest"
                            }
                            if (level.uuid === "Caves") {
                                level.levelName = "Caves"
                            }
                        }
                        if (level.uuid !== "Master") {
                            if (level.leveldataoverride === "return {}" || level.leveldataoverride === "") {
                                level.leveldataoverride = forest
                            }
                        }

                        
                        return {
                            label: (<LevelTabLabel levelName={level.levelName} isMaster={level.server_ini?.is_master} serverPort={level.server_ini?.server_port} onCommitName={(n) => applyRename(level.uuid, n)}/>),
                            children: <LevelItem
                                dstWorldSetting={dstWorldSetting}
                                level={level}
                                levelName={level.levelName}
                                changeLevel={changeLevel}
                                has={has}
                            />,
                            key: level.uuid,
                            closable: closable,
                        }
                    })
                    itemsRef.current = items2
                    setItems(items2)
                    if (levels.length === 0) {
                        setActiveKey("")
                    } else {
                        setActiveKey(levels[0].uuid)
                    }
                } else {
                    message.error(t('level.fetch.error'))
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                message.error(t('level.fetch.error'))
            } finally {
                setLoading(false);
            }
    };

    useEffect(() => {
        fetchData();
    }, [cluster, lang, t]);

    // Helper functions
    // IA(岛屿冒险)模组 modoverrides:海难/火山是 IA 模组世界,须启用 workshop-1467214795
    // (用户需先订阅该模组;no_joining_islands=true 与后端 iaModoverrides(true) 一致)
    const getIAModoverrides = () => `return {
  ["workshop-1467214795"] = {
    enabled = true,
    configuration_options = {
      no_joining_islands = true,
    },
  },
}
`

    const getNextServerIni = (levelName: string): LevelServerIni => {
        const levels = levelListRef.current
        let maxId = 0
        let maxPort = 0
        let maxMaster_server_port = 0
        let maxAuthentication_port = 0

        levels.forEach(level => {
            if (level?.server_ini?.id && level.server_ini.id > maxId) {
                maxId = level.server_ini.id
            }
            if (level?.server_ini?.server_port && level.server_ini.server_port > maxPort) {
                maxPort = level.server_ini.server_port
            }
            if (level?.server_ini?.authentication_port && level.server_ini.authentication_port > maxAuthentication_port) {
                maxAuthentication_port = level.server_ini.authentication_port
            }
            if (level?.server_ini?.master_server_port && level.server_ini.master_server_port > maxMaster_server_port) {
                maxMaster_server_port = level.server_ini.master_server_port
            }
        })

        return {
            id: maxId + 1,
            name: levelName,
            is_master: false,
            encode_user_path: true,
            server_port: maxPort + 1,
            authentication_port: maxAuthentication_port + 1,
            master_server_port: maxMaster_server_port + 1,
        }
    }

    // Save functionality
    // 未保存标记：编辑（世界设置/模组/ini/重命名/导入）只进内存，保存按钮才落盘；
    // 与"上次保存快照"对比——改回原值即自动清标记（真实无差异不算未保存）
    const [dirty, setDirty] = useState(false);
    const savedSnapshotRef = useRef('')
    // 语义快照：Lua 文本按解析后的值比较——format() 重排版/引号风格差异不算改动，
    // 只有真实值差异才算未保存（否则改回原值后文本≠原文，标记永远挂着）
    const semanticSnapshot = () => JSON.stringify(levelListRef.current.map((l: any) => {
        const o: any = {...l}
        for (const f of ['leveldataoverride', 'modoverrides']) {
            if (typeof l[f] === 'string') {
                try {
                    o[f] = parse(l[f])
                } catch {
                    o[f] = l[f] // 解析失败的文本按原文比较（视为有差异）
                }
            }
        }
        return o
    }))
    const refreshDirty = () => {
        setDirty(semanticSnapshot() !== savedSnapshotRef.current)
    }

    const handleSave = async () => {
        try {
            // 保存时全量写回（文件=屏集）：补屏上目录项中缺失的默认值
            // （编辑期不灌键——否则"改回原值"因新增键永远判脏）
            const levels = levelListRef.current.map((l: any) =>
                fillLevelDefaults(l, dstWorldSetting, !!l.server_ini?.is_master))
            const resp = await updateLevelsApi({levels})
            if (resp.code === 200) {
                savedSnapshotRef.current = semanticSnapshot()
                setDirty(false)
                message.success(t('level.save.success'))
                // 游戏只在世界启动时读取配置：有世界在运行时提示需重启才生效
                getLevelStatusApi(cluster || '').then(r => {
                    const list = Array.isArray(r.data) ? r.data : []
                    if (list.some((x: { status?: boolean }) => x.status)) {
                        message.info(t('level.save.restartHint'))
                    }
                }).catch(() => {})
            } else {
                message.warning(t('level.save.error'))
                if (resp.msg) {
                    message.warning(resp.msg)
                }
            }
        } catch (error) {
            message.error(t('level.save.error'))
            console.error(error)
        }
    }

    const handleDownload = () => {
        setDownloadFileName(cluster || 'levels')
        setOpenDownload(true)
    }

    const handleConfirmDownload = () => {
        const fileName = downloadFileName.trim()
        if (!fileName) {
            message.error(t('level2.filename.required'))
            return
        }

        const jsonString = JSON.stringify({levels: levelListRef.current}, null, 2)
        const blob = new Blob([jsonString], {type: "application/json"})
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${fileName}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setOpenDownload(false)
    }

    // Upload handler
    const handleUpload = (file: File) => {
        if (file.type !== "application/json") {
            message.warning(t('level2.upload.invalidType'));
            return false;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target) {
                try {
                    const result = event.target?.result as string
                    const parsedData = JSON.parse(result);
                    const levels = parsedData.levels as LevelData[];
                    levelListRef.current = levels;
                    refreshDirty()
                    const items2 = levels.map(level => {
                        // master 世界不允许删除（海难模板的主世界是 Shipwrecked，不能只认 uuid=Master）
                        const closable = (!level.server_ini?.is_master && level.uuid !== "Master" && has('allowAddLevel'))
                        
                        return {
                            label: (<LevelTabLabel levelName={level.levelName} isMaster={level.server_ini?.is_master} serverPort={level.server_ini?.server_port} onCommitName={(n) => applyRename(level.uuid, n)}/>),
                            key: level.uuid,
                            children: (
                                <LevelItem
                                    dstWorldSetting={dstWorldSetting}
                                    levelName={level.levelName || ''}
                                    level={level}
                                    changeLevel={changeLevel}
                                    has={has}
                                />
                            ),
                            closable: closable,
                        }
                    });
                    itemsRef.current = items2
                    setItems(items2);
                    message.success(t('level2.import.success'))
                } catch (error) {
                    message.error(t('level2.import.error'))
                    console.error(error)
                }
            }
        };
        reader.readAsText(file);
        return false
    }

    // Add level handlers
    const add = (levelName: string, uuid: string, leveldataoverride: string, modoverrides: string, server_ini: LevelServerIni) => {
        const newPanes = items ? [...items] : [];

        const newLevel: LevelData = {
            levelName,
            uuid,
            leveldataoverride,
            modoverrides,
            server_ini
        }

        const newLevels = [...levelListRef.current]
        newLevels.push(newLevel)
        levelListRef.current = newLevels

        
        newPanes.push({
            label: (<LevelTabLabel levelName={levelName} isMaster={server_ini?.is_master} serverPort={server_ini?.server_port} onCommitName={(n) => applyRename(uuid, n)}/>),
            children: <LevelItem
                dstWorldSetting={dstWorldSetting}
                level={newLevel}
                levelName={levelName}
                changeLevel={changeLevel}
                has={has}
            />,
            key: uuid,
            closable: has('allowAddLevel'),
        })
        itemsRef.current = newPanes
        setItems(newPanes);
        setActiveKey(uuid);
    }

    // 创建世界配置台落盘：成功 → 插入新世界 tab（add 内会切过去）；失败由调用方保草稿
    const handleCreateWorld = async (body: {
        levelName: string, uuid: string, type: string,
        leveldataoverride: string, modoverrides: string, server_ini: LevelServerIni
    }) => {
        try {
            const resp = await createLevelApi(body as never);
            if (resp.code === 200 && resp.data) {
                message.success(`${body.levelName} ${t('level.create.success')}`)
                add(body.levelName, resp.data.uuid, body.leveldataoverride, body.modoverrides, body.server_ini)
                setTopTab('settings')
                return true;
            }
            message.error(`${body.levelName} ${t('level.create.error')}`)
            return false;
        } catch {
            message.error(`${body.levelName} ${t('level.create.error')}`)
            return false;
        }
    };


    const onChange = (newActiveKey: string) => {
        setActiveKey(newActiveKey);
    };

    const remove = (targetKey: string) => {
        setDeleteLevelName(targetKey)
        setOpenDelete(true)
    };

    const removeLevel = (targetKey: string) => {
        let newActiveKey = activeKey;
        let lastIndex = -1;
        items?.forEach((item, i) => {
            if (item.key === targetKey) {
                lastIndex = i - 1;
            }
        });
        const newPanes = items?.filter((item) => item.key !== targetKey);
        if (newPanes && newPanes.length && newActiveKey === targetKey) {
            if (lastIndex >= 0) {
                newActiveKey = newPanes[lastIndex].key as string;
            } else {
                newActiveKey = newPanes[0].key as string;
            }
        }
        itemsRef.current = newPanes
        setItems(newPanes);
        setActiveKey(newActiveKey);

        levelListRef.current = levelListRef.current.filter((item) => item.uuid !== targetKey)
    }

    // 快捷创建海滩/火山世界（世界 Tab 行快捷卡）
    const quickAddWorld = (kind: 'shipwrecked' | 'volcano') => {
        const uuid = kind === 'shipwrecked' ? 'Shipwrecked' : 'Volcano';
        const levelName = kind === 'shipwrecked' ? t('level.quickAdd.shipwrecked') : t('level.quickAdd.volcano');
        if (levelListRef.current.some(l => l.uuid === uuid || l.levelName === levelName)) {
            message.info(levelName + ' ' + t('level.name.duplication'));
            return;
        }
        const body = {
            levelName,
            uuid,
            type: kind,
            leveldataoverride: kind === 'shipwrecked' ? shipwreckedTpl : volcanoTpl,
            // 海难/火山是 IA 模组世界:须启用 IA 模组(而非森林的 modoverrides)
            modoverrides: getIAModoverrides(),
            // 用 getNextServerIni 生成唯一 id/端口(硬编码 id 会与 getNextServerIni 顺序生成冲突,导致分片 id 重复)
            // name 用 uuid(Shipwrecked/Volcano),与 Master/Caves 的 name=uuid 一致(而非 levelName 中文)
            server_ini: getNextServerIni(uuid),
        };
        createLevelApi(body).then(resp => {
            if (resp.code === 200 && resp.data) {
                message.success(levelName + ' ' + t('level.create.success'));
                add(body.levelName, resp.data.uuid, resp.data.leveldataoverride, resp.data.modoverrides, resp.data.server_ini);
            } else {
                message.error(levelName + ' ' + t('level.create.error'));
            }
        }).catch(() => message.error(levelName + ' ' + t('level.create.error')));
    };

    // 快捷卡（已存在的世界不再显示；点按钮即创建，stopPropagation 防切 tab）
    // 海难/火山世界选项必须建立在已订阅 IA 模组的基础上:未订阅不显示
    const quickCards: any[] = [];
    const iaModTip = t('level.ia.modRequired');
    if (iaModReady && !levelListRef.current.some(l => l.uuid === 'Shipwrecked')) {
        quickCards.push({
            key: '__quick_shipwrecked',
            closable: false,
            label: (
                <Tooltip title={iaModTip}>
                    <Button size="small" type="dashed" icon={<PlusOutlined/>} onClick={(e) => {
                        e.stopPropagation();
                        quickAddWorld('shipwrecked');
                    }}>+ {t('level.quickAdd.shipwrecked')}</Button>
                </Tooltip>
            ),
            children: <Empty description={t('level.ia.createShipwrecked')}/>,
        });
    }
    if (iaModReady && !levelListRef.current.some(l => l.uuid === 'Volcano')) {
        quickCards.push({
            key: '__quick_volcano',
            closable: false,
            label: (
                <Tooltip title={iaModTip}>
                    <Button size="small" type="dashed" icon={<PlusOutlined/>} onClick={(e) => {
                        e.stopPropagation();
                        quickAddWorld('volcano');
                    }}>+ {t('level.quickAdd.volcano')}</Button>
                </Tooltip>
            ),
            children: <Empty description={t('level.ia.createVolcano')}/>,
        });
    }

    // Rename level handler
    // 重命名世界（内联编辑提交）：改内存并重建该标签（children 的 levelName 同步），落盘走保存按钮
    const applyRename = (uuid: string, newLevelName: string) => {
        const trimmed = (newLevelName || '').trim()
        if (!trimmed) {
            message.warning(t('level.warning.name.not.allow.null'))
            return
        }
        if (levelListRef.current.some(l => l.uuid !== uuid && l.levelName === trimmed)) {
            message.warning(t('level.name.duplication'))
            return
        }
        levelListRef.current = levelListRef.current.map(level =>
            level.uuid === uuid ? {...level, levelName: trimmed} : level
        )
        refreshDirty()
        const newItems = items?.map(item => {
            if (item.key !== uuid) return item
            const level = levelListRef.current.find(l => l.uuid === uuid)
            if (!level) return item
            return {
                ...item,
                label: (
                    <LevelTabLabel
                        levelName={level.levelName}
                        isMaster={level.server_ini?.is_master}
                        serverPort={level.server_ini?.server_port}
                        onCommitName={(n) => applyRename(level.uuid, n)}
                    />
                ),
                children: <LevelItem
                    dstWorldSetting={dstWorldSetting}
                    level={level}
                    levelName={level.levelName}
                    changeLevel={changeLevel}
                    has={has}
                />,
            }
        })
        itemsRef.current = newItems
        setItems(newItems)
        message.success(t('level2.rename.success', {name: trimmed}))
    }

    return (<Skeleton loading={loading}>
            <Tabs
                activeKey={topTab}
                onChange={setTopTab}
                type="card"
                items={[
                    {
                        key: 'settings',
                        label: t('level.leveldataoverride'),
                        children: (<>
                            {levelListRef.current.length === 0 && (<>
                                <Empty description={t('level.empty')}/>
                            </>)}
                            <div style={{display: 'flex', height: 'calc(100vh - 250px)', minHeight: '420px'}}>
                                {/* 世界切换竖列（弃 tab 套 tab）：双击/右键改名沿用 LevelTabLabel */}
                                <div style={{
                                    width: 220, flex: 'none', overflowY: 'auto',
                                    borderRight: '1px solid rgba(128, 128, 128, 0.2)', paddingRight: 4,
                                }}>
                                    {(items || []).map((it: any) => (
                                        <div key={it.key}
                                             onClick={() => onChange(String(it.key))}
                                             style={{
                                                 display: 'flex', alignItems: 'center', gap: 8,
                                                 padding: '6px 8px', cursor: 'pointer', borderRadius: 4,
                                                 background: activeKey === it.key ? 'rgba(232, 196, 106, 0.12)' : undefined,
                                             }}>
                                            <div style={{flex: 1, minWidth: 0}}>{it.label}</div>
                                            {it.closable && (
                                                <Button size="small" type="text" icon={<CloseOutlined/>}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            remove(String(it.key));
                                                        }}/>
                                            )}
                                        </div>
                                    ))}
                                    {quickCards.map((qc: any) => (
                                        <div key={qc.key} style={{padding: '6px 8px'}}>{qc.label}</div>
                                    ))}
                                </div>
                                {/* 各世界内容常驻挂载、显隐切换（保留各自内层 tab 状态） */}
                                <div style={{flex: 1, minWidth: 0, overflowY: 'auto', paddingLeft: 12}}>
                                    {(items || []).map((it: any) => (
                                        <div key={it.key} style={{display: it.key === activeKey ? undefined : 'none'}}>
                                            {it.children}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Divider/>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px'}}>
                                <Space size={8} wrap>
                                    <Button icon={<SaveOutlined/>} type={"primary"} onClick={handleSave}>{t('level.save')}</Button>
                                    <Upload beforeUpload={handleUpload} showUploadList={false}>
                                        <Button icon={<ImportOutlined/>} type={'primary'}>{t('level2.import.button')}</Button>
                                    </Upload>
                                    <Button icon={<DownloadOutlined/>} type={'primary'} onClick={handleDownload}>{t('backup.download')}</Button>
                                </Space>
                                <Space size={8}>
                                    {dirty && (
                                        <span style={{color: '#faad14', fontSize: '12px'}}>● {t('level.unsaved')}</span>
                                    )}
                                    {has('allowAddLevel') &&
                                        <Button icon={<PlusOutlined/>} type={"primary"} onClick={() => setTopTab('create')}>{t('level.add')}</Button>
                                    }
                                    <Button icon={<AppstoreOutlined/>} type={"primary"} style={{background: '#722ed1', borderColor: '#722ed1'}}
                                            onClick={() => setTemplateOpen(true)}>{t('tool.preinstall.worldTemplate')}</Button>
                                </Space>
                            </div>
                        </>),
                    },
                    {
                        key: 'create',
                        label: t('level2.createTab'),
                        children: (
                            <CreateWorld
                                dstWorldSetting={dstWorldSetting}
                                has={has}
                                getExisting={() => ({
                                    names: levelListRef.current.map((l: LevelData) => l.levelName),
                                    uuids: levelListRef.current.map((l: LevelData) => l.uuid),
                                })}
                                getServerIniInit={() => getNextServerIni('')}
                                getIAEntry={() => (parse(getIAModoverrides()) as Record<string, Record<string, unknown>>)['workshop-1467214795']}
                                onCreated={handleCreateWorld}
                            />
                        ),
                    },
                ]}
            />
        {/* 世界模板弹窗(集群级预设存档,整档替换语义与原独立页一致) */}
        <Modal title={t('tool.preinstall.worldTemplate')} open={templateOpen} onCancel={() => setTemplateOpen(false)} footer={null} width={860}>
            <Preinstall reload={() => { fetchData().catch(console.log) }} />
        </Modal>

        {/* Delete Level Modal */}
        <Modal
            title={t('level.delete.confirm.title', {name: deleteLevelName})}
            open={openDelete}
            onOk={() => {
                setConfirmLoading(true)
                deleteLevelApi(deleteLevelName)
                    .then(resp => {
                        if (resp.code === 200) {
                            message.success(t('level.delete.success'))
                            removeLevel(deleteLevelName)
                            setConfirmLoading(false)
                            setOpenDelete(false)
                        } else {
                            message.error(t('level.delete.error'))
                            setConfirmLoading(false)
                        }
                    })
                    .catch(() => {
                        message.error(t('level.delete.error'))
                        setConfirmLoading(false)
                    })
            }}
            confirmLoading={confirmLoading}
            onCancel={() => {
                setOpenDelete(false)
            }}
        >
            <Alert message={t('level.delete.warning')} type="warning" showIcon/>
        </Modal>

        {/* Download Modal */}
        <Modal
            title={t('level2.download.modal.title')}
            open={openDownload}
            onOk={() => handleConfirmDownload()}
            onCancel={() => setOpenDownload(false)}
        >
            <Form layout="vertical">
                <Form.Item
                    label={t('backup.fileName')}
                    rules={[
                        {
                            required: true,
                            validator: (_: unknown, value: string) => {
                                if (!value || value.trim() === '') {
                                    return Promise.reject(new Error(t('level2.filename.required')))
                                }
                                return Promise.resolve()
                            }
                        }
                    ]}
                >
                    <Input
                        value={downloadFileName}
                        onChange={(e) => setDownloadFileName(e.target.value)}
                        placeholder={t('level2.download.filename.placeholder', {cluster: cluster || 'levels'})}
                        suffix=".json"
                    />
                </Form.Item>
            </Form>
        </Modal>
    </Skeleton>)
}

export default Level2
