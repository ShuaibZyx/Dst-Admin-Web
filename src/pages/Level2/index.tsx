import {shipwreckedTpl, volcanoTpl} from "../../types/dst.ts";
import {parse} from "lua-json";
import ModVisualEditor from "./ModVisualEditor";
import {fillLevelDefaults} from "../../utils/levelDefaults";
import {useTranslation} from "react-i18next";
import React, {useEffect, useRef, useState} from "react";
import {Alert, Button, Divider, Dropdown, Empty, Form, Input, InputNumber, message, Modal, Radio, Skeleton, Space, Switch, Tabs, TabsProps, Tag, Tooltip, Upload, Row, Col} from "antd";
import type {MenuProps} from 'antd';
import {EditOutlined, ImportOutlined, DownloadOutlined, SaveOutlined, PlusOutlined, AppstoreOutlined} from '@ant-design/icons';
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
import {cave, forest} from "../../utils/dst";
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
                height: 'calc(100vh - 280px)',
                minHeight: '400px',
                maxHeight: '800px',
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
                height: 'calc(100vh - 280px)',
                minHeight: '400px',
                maxHeight: '800px',
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
                height: 'calc(100vh - 340px)',
                minHeight: '400px',
                maxHeight: '800px',
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
                                   "maxHeight": "600px",
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

const Modoverrides: React.FC<LevelItemProps> = (props) => {
    const {theme} = useTheme();
    const editorRef = useRef<MonacoEditorRef>(null);
    // props.level 是加载时快照（changeLevel 只写 levelListRef、不刷新 props），编辑期用本地 state
    // 承接两个视图的每次改动——否则可视化表单读旧快照，连续改动会互相覆盖
    const [text, setText] = useState(props.level?.modoverrides || '')

    useEffect(() => {
        const value = props.level?.modoverrides || ''
        editorRef.current?.setValue(value)
        setText(value)
    }, [props.level?.modoverrides]);
    return (<>
        {/* 左代码 / 右可视化：同一份 modoverrides 的两个视图，互为对照（可视化改动写回代码、代码改动重解析） */}
        <Row gutter={12} style={{flexWrap: 'nowrap'}}>
            <Col flex="auto">
                <React.Suspense fallback={null}><MonacoEditor2 ref={editorRef}
                                       value={text}
                                       theme={theme === 'dark' ? 'vs-dark' : ''}
                                       style={{
                                           "height": "calc(100vh - 340px)",
                                           "minHeight": "300px",
                                           "maxHeight": "600px",
                                           "width": "100%"
                                       }}
                                       onChange={value => {
                                           setText(value)
                                           if (props.changeLevel) {
                                               props.changeLevel(props.levelName || '', {modoverrides: value})
                                           }
                                       }}
                /></React.Suspense>
            </Col>
            <Col flex="380px" style={{minWidth: 300}}>
                <ModVisualEditor
                    value={text}
                    onChange={next => {
                        setText(next)
                        props.changeLevel?.(props.levelName || '', {modoverrides: next})
                        editorRef.current?.setValue(next)
                    }}
                />
            </Col>
        </Row>
    </>)
}

const ServerIni: React.FC<LevelItemProps> = (props) => {
    const {t} = useTranslation()
    const [form] = Form.useForm();
    useEffect(() => {
        form.setFieldsValue(props.level.server_ini)
    }, [props.level.server_ini, form]);

    function onValuesChange(_changedValues: object, allValues: Record<string, object>) {
        if (props.changeLevel) {
            // 确保 allValues 包含完整的 server_ini 数据
            const serverIni = allValues as unknown as LevelServerIni
            props.changeLevel(props.levelName || '', {server_ini: serverIni})
        }
    }

    return (
        <Form
            labelCol={{
                span: 3,
            }}
            wrapperCol={{
                span: 18,
            }}
            form={form}
            layout="horizontal"
            initialValues={props?.level?.server_ini || {
                is_master: false,
                encode_user_path: true
            }}
            onValuesChange={onValuesChange}
        >
            <Alert
                message={(
                    <>
                        <ul className="list-disc list-inside space-y-1 text-blue-800">
                            <li>{t('serverini.portTip.item1')}</li>
                            <li>{t('serverini.portTip.item2')}</li>
                            <li>{t('serverini.portTip.item3')}</li>
                        </ul>
                    </>
                )}
                type="info"

            />
            <br/>
            <Form.Item
                label={t('serverini.server_port')}
                name="server_port"
                tooltip={t('serverini.tooltip.server_port')}
            >
                <InputNumber style={{
                    width: '100%',
                }} placeholder={t('serverini.placeholder.server_port')} disabled={!props.has('allowEditingServerIni')}/>
            </Form.Item>

            <Form.Item
                label={t('serverini.is_master')}
                valuePropName="checked"
                name='is_master'
                tooltip={t('serverini.tooltip.is_master')}>
                <Switch checkedChildren={t('switch.open')} unCheckedChildren={t('switch.close')}/>
            </Form.Item>

            <Form.Item
                label={t('serverini.name')}
                name="name"
                tooltip={t('serverini.name')}
            >
                <Input placeholder={t('serverini.placeholder.name')}/>
            </Form.Item>

            <Form.Item
                label={t('serverini.id')}
                name="id"
                tooltip={t('serverini.tooltip.id')}
            >
                <InputNumber
                    style={{
                        width: '100%',
                    }}
                    placeholder={t('serverini.id')}/>
            </Form.Item>

            <Form.Item
                label={t('serverini.encode_user_path')}
                valuePropName="checked"
                name='encode_user_path'
                tooltip={t('serverini.tooltip.encode_user_path')}
            >
                <Switch checkedChildren={t('switch.open')} unCheckedChildren={t('switch.close')} defaultChecked/>
            </Form.Item>

            <Form.Item
                label={t('serverini.authentication_port')}
                name='authentication_port'
                tooltip={t('serverini.authentication_port')}
            >
                <InputNumber style={{
                    width: '100%',
                }} placeholder={t('serverini.authentication_port')} disabled={!props.has('allowEditingServerIni')}/>
            </Form.Item>

            <Form.Item
                label={t('serverini.master_server_port')}
                name='master_server_port'
                tooltip={t('serverini.master_server_port')}
            >
                <InputNumber
                    style={{
                        width: '100%',
                    }}
                    placeholder={t('serverini.master_server_port')} disabled={!props.has('allowEditingServerIni')}/>
            </Form.Item>
        </Form>
    )
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

    // Modal states
    const [openAdd, setOpenAdd] = useState(false)
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

    const [levelForm] = Form.useForm()

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
    const getMasterModoverrides = () => {
        const levels = levelListRef.current
        let modoverrides = "return {}"
        levels.forEach(level => {
            if (level.uuid === "Master") {
                modoverrides = level.modoverrides
            }
        })
        return modoverrides
    }

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

    const onEdit = (targetKey: string | React.MouseEvent<Element, MouseEvent> | React.KeyboardEvent<Element>, action: 'add' | 'remove') => {
        if (action === 'add') {
            setOpenAdd(true);
        } else {
            remove(targetKey as string);
        }
    };

    // Form validation
    const validateName1 = (_: unknown, value: string) => {
        const stringList = levelListRef.current.map(level => level.levelName)
        if (value && stringList.includes(value)) {
            return Promise.reject(new Error(t('level.name.duplication')));
        }
        return Promise.resolve();
    };

    const validateName2 = (_: unknown, value: string) => {
        const stringList = levelListRef.current.map(level => level.uuid)
        if (value && stringList.includes(value)) {
            return Promise.reject(new Error(t('level.filename.duplication')));
        }
        for (let i = 0; i < stringList.length; i++) {
            if (value && stringList[i].includes(value)) {
                return Promise.reject(new Error(t('level.filename.error.substring')));
            }
        }
        const regex = /^[a-zA-Z][a-zA-Z0-9]*$/;
        if (value && !regex.test(value)) {
            return Promise.reject(new Error(t('level.filename.error.contain.special.characters')));
        }
        return Promise.resolve();
    };

    const validateName3 = (_: unknown, value: string) => {
        if (value === undefined || value === null || value === "") {
            return Promise.reject(new Error(t('level.required.type')));
        }
        return Promise.resolve();
    };

    // Create level
    const onCreateLevel = () => {
        levelForm.validateFields().then(() => {
            const body = levelForm.getFieldsValue()

            if (body.levelName === undefined || body.levelName === '') {
                message.warning(t('level.warning.name.not.allow.null'))
                return
            }

            if (body.type === "forest") {
                body.leveldataoverride = forest
            } else if (body.type === 'shipwrecked') {
                body.leveldataoverride = shipwreckedTpl
            } else if (body.type === 'volcano') {
                body.leveldataoverride = volcanoTpl
            } else {
                body.leveldataoverride = cave
            }
            // 海难/火山是 IA 模组世界：须启用 IA 模组（与快捷创建一致），其余世界沿用森林的 modoverrides
            body.modoverrides = (body.type === 'shipwrecked' || body.type === 'volcano') ? getIAModoverrides() : getMasterModoverrides()
            body.server_ini = getNextServerIni(body.levelName)

            setConfirmLoading(true)
            createLevelApi(body).then(resp => {
                if (resp.code === 200 && resp.data) {
                    message.success(`${body.levelName} ${t('level.create.success')}`)
                    const data = resp.data
                    add(body.levelName, data.uuid, data.leveldataoverride, data.modoverrides, data.server_ini)
                    setConfirmLoading(false)
                    setOpenAdd(false)
                } else {
                    message.error(`${body.levelName} ${t('level.create.error')}`)
                    setConfirmLoading(false)
                }
            }).catch(() => {
                message.error(`${body.levelName} ${t('level.create.error')}`)
                setConfirmLoading(false)
            })
        }).catch(err => {
            message.error(err.errorFields[0].errors[0])
        });
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
            {/* 重命名提示 */}

            {levelListRef.current.length === 0 && (<>
                <Empty description={t('level.empty')}/>
            </>)}
            <Tabs
                tabPosition={'top'}
                style={{
                    height: 'calc(100vh - 240px)',
                    minHeight: '500px',
                }}
                hideAdd
                type="editable-card"
                onChange={onChange}
                activeKey={activeKey}
                onEdit={onEdit}
                items={items ? [...items, ...quickCards] : quickCards}
                tabBarExtraContent={{
                    right: dirty ? (
                        <span style={{color: '#faad14', fontSize: '12px'}}>● {t('level.unsaved')}</span>
                    ) : null,
                }}
            />
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
                    {has('allowAddLevel') &&
                        <Button icon={<PlusOutlined/>} type={"primary"} onClick={() => setOpenAdd(true)}>{t('level.add')}</Button>
                    }
                    <Button icon={<AppstoreOutlined/>} type={"primary"} style={{background: '#722ed1', borderColor: '#722ed1'}}
                            onClick={() => setTemplateOpen(true)}>{t('tool.preinstall.worldTemplate')}</Button>
                </Space>
            </div>
        {/* 世界模板弹窗(集群级预设存档,整档替换语义与原独立页一致) */}
        <Modal title={t('tool.preinstall.worldTemplate')} open={templateOpen} onCancel={() => setTemplateOpen(false)} footer={null} width={860}>
            <Preinstall reload={() => { fetchData().catch(console.log) }} />
        </Modal>
        {/* Add Level Modal */}
        <Modal
            title={t('level.add')}
            open={openAdd}
            onOk={() => onCreateLevel()}
            confirmLoading={confirmLoading}
            onCancel={() => {
                setOpenAdd(false)
            }}>

            <Form
                form={levelForm}
                layout="vertical"
                labelAlign={'left'}
            >
                <Form.Item label={t('level.name')}
                           name="levelName"
                           rules={[
                               {
                                   required: true,
                                   validator: validateName1
                               },
                           ]}
                >
                    <Input placeholder={t('level.placeholder.name')}/>
                </Form.Item>
                <Alert
                    message={t('level.add.tips2')}
                    type="warning" showIcon closable/>
                <br/>
                <Form.Item label={t('level.filename')}
                           name="uuid"
                           rules={[
                               {
                                   required: false,
                                   validator: validateName2
                               },
                           ]}
                >
                    <Input placeholder={t('level.placeholder.filename')}/>
                </Form.Item>
                <Form.Item label={t('level.type')}
                           name="type"
                           rules={[
                               {
                                   required: true,
                                   validator: validateName3,
                                   message: t('level.required.type'),
                               },
                           ]}
                >
                    <Radio.Group>
                        <Radio value={'forest'}>{t('level.type.forest')}</Radio>
                        <Radio value={'cave'}>{t('level.type.caves')}</Radio>
                        {/* 海难/火山世界选项必须建立在已订阅 IA 模组的基础上:未订阅不显示 */}
                        {iaModReady && <Radio value={'shipwrecked'}>{t('level.type.shipwrecked')}</Radio>}
                        {iaModReady && <Radio value={'volcano'}>{t('level.type.volcano')}</Radio>}
                    </Radio.Group>
                </Form.Item>
            </Form>
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
