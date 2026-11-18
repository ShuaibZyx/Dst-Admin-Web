import React, {useEffect, useState} from 'react';
import {FormSkeleton} from '../../../components/Skeletons.jsx';
import {SaveOutlined} from '@ant-design/icons';
import {
    Button,
    Form,
    Input,
    message,
    Skeleton,
    Radio,
    Segmented,
    Drawer,
    Space,
    Typography,
    Tooltip,
    Alert, Card, Modal, Tag
} from 'antd';
import {useTranslation} from "react-i18next";
import i18next from "../../../locales/i18n.tsx";

import {readDstConfigSync, writeDstConfigSync} from "../../../api/dstConfigApi.jsx";
import MarkdownRender from "../../Help/MarkdownRender.jsx";
import DirPicker from "./DirPicker.jsx";
import OneClickInstall from "./OneClickInstall.jsx";
import {installStatusApi} from "../../../api/dstConfigApi.jsx";


const REL_DEFAULTS = {
    steamcmd: 'steamcmd',
    force_install_dir: 'dst-dedicated-server',
    backup: 'backups',
    mod_download_path: 'mods',
    conf_dir: 'worlds',
}

// 旧单数默认值 → 新复数默认值
const LEGACY_ALIAS = {
    backup: {backup: 'backups'},
    mod_download_path: {mod: 'mods'},
    conf_dir: {world: 'worlds'},
}

// 旧样式值（绝对路径 / ~ 开头 / 空 / 旧单数默认）一律换成新的相对路径默认值
const isOldStyle = (v) => {
    if (!v) return true
    return /^[a-zA-Z]:[\\/]/.test(v) || v.startsWith('~') || v.startsWith('/') || v.startsWith('\\')
}

const onFinishFailed = (errorInfo) => {
    message.error(i18next.t('setting.dstConfig.save.error'))
    console.log('Failed:', errorInfo);
};

const { Title, Paragraph} = Typography;

export default () => {

    const {t} = useTranslation()
    const {i18n} = useTranslation();
    const [lang, setLang] = useState('zh')

    useEffect(() => {
        const handleLanguageChange = (lng) => {
            setLang(lng)
            setActiveTab(lng === "en" ? "all" : "default");
        };

        i18n.on("languageChanged", handleLanguageChange);

        // 清理事件监听器
        return () => {
            i18n.off("languageChanged", handleLanguageChange);
        };
    }, [i18n]);

    const [form] = Form.useForm();
    const [installStatus, setInstallStatus] = useState({});
    const loadInstallStatus = () => {
        installStatusApi().then(resp => {
            if (resp.code === 200) setInstallStatus(resp.data || {})
        }).catch((error) => console.log('load install status:', error))
    }
    useEffect(loadInstallStatus, [])
    // 安装进行中轮询状态，结束后按钮自动恢复
    useEffect(() => {
        if (!installStatus.installing) return
        const t = setInterval(loadInstallStatus, 4000)
        return () => clearInterval(t)
    }, [installStatus.installing])
    const parentWatch = Form.useWatch('parent_path', form)
    const [loading, setLoading] = useState(true)

    const [activeTab, setActiveTab] = useState(lang === 'en' ? 'custom' : 'default');
    const handleTabChange = (value) => {
        setActiveTab(value);
    };
    const [data, setData] = useState({})
    useEffect(() => {
        // 获取配置文件
        readDstConfigSync()
            .then(data => {
                console.log('dst_config', data);
                const d = data.data || {}
                Object.keys(REL_DEFAULTS).forEach(k => {
                    if (isOldStyle(d[k]) || LEGACY_ALIAS[k]?.[d[k]] !== undefined) {
                        d[k] = REL_DEFAULTS[k]
                    }
                })
                form.setFieldsValue(d)
                setData(d)
                setLoading(false)
            })
            .catch(error => {
                console.error('load dst config failed:', error)
                message.error(t('setting.dstConfig.save.error'))
                setLoading(false)
            })
    }, [form])

    // 设了父级文件夹后，空路径框显示默认值（所见即所得）
    const defaultsApplied = React.useRef(false)
    useEffect(() => {
        if (loading || !parentWatch || defaultsApplied.current) return
        defaultsApplied.current = true
        const cur = form.getFieldsValue()
        form.setFieldsValue({
            steamcmd: cur.steamcmd || 'steamcmd',
            force_install_dir: cur.force_install_dir || 'dst-dedicated-server',
            backup: cur.backup || 'backup',
            mod_download_path: cur.mod_download_path || 'mod',
        })
    }, [loading, parentWatch, form])


    const onFinish = (values) => {
        const oldParent = (data.parent_path ?? '').trim()
        const newParent = (values.parent_path ?? '').trim()
        writeDstConfigSync(values)
            .then(resp => {
                if (resp.code === 200) {
                    setData(values) // 保存成功才更新本地状态
                    message.success(t('setting.dstConfig.save.ok'))
                } else {
                    message.warning(resp.msg)
                }
        })
            .catch(error => {
                console.error('save dst config failed:', error)
                message.error(t('setting.dstConfig.save.error'))
            })
        // §11.6：父级变更提示不阻塞保存
        if (oldParent !== newParent && (oldParent || newParent)) {
            Modal.warning({
                title: t('setting.dstConfig.parentChanged.title'),
                content: t('setting.dstConfig.parentChanged.content'),
            })
        }
    };

    const [open, setOpen] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);

    return (
        <div>
            <Drawer title={t('setting.dstConfig.dockerPathReference.title')} placement="right" onClose={() => setOpen(false)} open={open}>
                <Typography>
                    <Title level={4}>{t('setting.dstConfig.pathReference')}</Title>
                    <Title level={5}>{t('setting.dstConfig.docker.savePath')}</Title>
                    <Paragraph>
                        <pre>{'/root/.klei/DoNotStarveTogether'}</pre>
                    </Paragraph>
                    <Title level={5}>{t('setting.dstConfig.docker.backupPath')}</Title>
                    <Paragraph>
                        <pre>{'/app/backup'}</pre>
                    </Paragraph>
                    <Title level={5}>{t('setting.dstConfig.docker.modPath')}</Title>
                    <Paragraph>
                        <pre>{'/app/mod'}</pre>
                    </Paragraph>
                    <Title level={5}>{t('setting.dstConfig.docker.playerLogPath')}</Title>
                    <Paragraph>
                        <pre>{'/app/dst-db'}</pre>
                    </Paragraph>
                    <Title level={5}>{t('setting.dstConfig.docker.serviceLogPath')}</Title>
                    <Paragraph>
                        <pre>{'/app/dst-admin-go.log'}</pre>
                    </Paragraph>
                    <Title level={5}>{t('setting.dstConfig.docker.gameStartPath')}</Title>
                    <Paragraph>
                        <pre>{'/app/dst-dedicated-server'}</pre>
                    </Paragraph>
                    <Title level={5}>{t('setting.dstConfig.docker.steamcmdPath')}</Title>
                    <Paragraph>
                        <pre>{'/app/steamcmd'}</pre>
                    </Paragraph>
                    <Title level={4}>{t('setting.dstConfig.startCommandReference')}</Title>
                    <Paragraph>
                        <pre>{'docker run -d -p8082:8082 -v /root/dstsave:/root/.klei/DoNotStarveTogether -v /root/dstsave/backup:/app/backup -v /root/steamcmd:/app/steamcmd -v /root/dst-dedicated-server:/app/dst-dedicated-server  hujinbo23/dst-admin-go:1.2.6'}</pre>
                    </Paragraph>

                </Typography>
                <div style={{marginTop: 16}}>
                    <a target={'_blank'} href={'https://steamcommunity.com/sharedfiles/filedetails/?id=1616647350'} rel="noreferrer">{t('setting.dstConfig.dedicatedServerDocs')}</a>
                </div>
            </Drawer>

            <Drawer title={t('setting.dstConfig.dedicatedServerGuide.title')} placement="right" width={720} onClose={() => setGuideOpen(false)} open={guideOpen}>
                <MarkdownRender url={'misc/dst-dedicated-server-guide.es.md'} />
            </Drawer>

                {data.container_mode && (
                    <Alert style={{marginBottom: '12px'}}
                           message={t('setting.dstConfig.containerMode.tips')}
                           type="warning" showIcon/>
                )}
                <Form
                    onFinish={onFinish}
                    onFinishFailed={onFinishFailed}
                    layout="vertical"
                    labelAlign={'left'}
                    form={form}
                >
                    {loading ? <FormSkeleton fields={10}/> : (<>                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8}}>
                            <OneClickInstall disabled={data.container_mode || !parentWatch} downloading={!!installStatus.installing} onFinished={loadInstallStatus}/>
                            <Space size={16} wrap>
                                {lang === 'es' && (
                                    <Button
                                        size={"small"}
                                        onClick={()=>{
                                            setGuideOpen(true)
                                        }}>{t('setting.dstConfig.dedicatedServerGuide.button')}</Button>
                                )}
                                <Button
                                        type={'primary'}
                                        onClick={()=>{
                                    setOpen(true)
                                }}>{t('setting.dstConfig.dockerPathReference.button')}</Button>
                            </Space>
                        </div>
                        <Form.Item
                            label={t('setting.dstConfig.parent_path')}
                            name="parent_path"
                            tooltip={t('setting.dstConfig.parent_path.tooltip')}
                            style={{marginTop: 8}}
                            rules={[
                                {
                                    required: true,
                                    message: t('setting.dstConfig.parent_path.required'),
                                },
                            ]}
                        >
                            <div style={{display: 'flex'}}>
                                <Input
                                    style={{flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0}}
                                    placeholder={t('setting.dstConfig.parent_path.placeholder')}
                                    disabled={data.container_mode}
                                    value={parentWatch ?? ''}
                                    onChange={(e) => form.setFieldsValue({parent_path: e.target.value})}
                                />
                                <DirPicker
                                    disabled={data.container_mode}
                                    value={parentWatch}
                                    onChange={(p) => form.setFieldsValue({parent_path: p})}
                                />
                            </div>
                        </Form.Item>
                        <Form.Item
                            label={<Space size={6}><span>{t('setting.dstConfig.steamcmd')}</span><Tag color={installStatus.steamcmd ? 'green' : 'default'}>{installStatus.steamcmd ? t('setting.dstConfig.status.installed') : t('setting.dstConfig.status.notInstalled')}</Tag></Space>}
                            name="steamcmd"
                            rules={[
                                {
                                    required: true,
                                    message: t('setting.dstConfig.steamcmd.required'),
                                },
                            ]}
                        >
                            <Input disabled={data.container_mode}/>
                        </Form.Item>
                        <Form.Item
                            label={<Space size={6}><span>{t('setting.dstConfig.force_install_dir')}</span><Tag color={installStatus.server ? 'green' : 'default'}>{installStatus.server ? t('setting.dstConfig.status.installed') : t('setting.dstConfig.status.notInstalled')}</Tag></Space>}
                            name="force_install_dir"
                            rules={[
                                {
                                    required: true,
                                    message: t('setting.dstConfig.force_install_dir.required'),
                                },
                            ]}
                        >
                            <Input disabled={data.container_mode}/>
                        </Form.Item>
                        <Form.Item
                            label={t('setting.dstConfig.backup')}
                            name="backup"
                            rules={[
                                {
                                    required: true,
                                    message: t('setting.dstConfig.backup.required'),
                                },
                            ]}
                            tooltip={t('setting.dstConfig.backup.tooltip')}
                        >
                            <Input placeholder={t('setting.dstConfig.backup.placeholder')}/>
                        </Form.Item>
                        <Form.Item
                            label={t('setting.dstConfig.mod_download_path')}
                            name="mod_download_path"
                            tooltip={t('setting.dstConfig.mod_download_path.tooltip')}
                            rules={[
                                {
                                    required: true,
                                    message: t('setting.dstConfig.mod_download_path.required'),
                                },
                            ]}
                        >
                            <Input placeholder={t('setting.dstConfig.mod_download_path.placeholder')}/>
                        </Form.Item>
                        <Form.Item
                            label={t('setting.dstConfig.saveDir')}
                            name="conf_dir"
                            tooltip={t('setting.dstConfig.saveDir.tooltip')}
                            rules={[
                                {
                                    required: true,
                                    message: t('setting.dstConfig.saveDir.required'),
                                },
                            ]}
                        >
                            <Input placeholder={t('setting.dstConfig.saveDir.placeholder')} disabled={data.container_mode}/>
                        </Form.Item>
                        <Form.Item
                            label={t('setting.dstConfig.beta.label')}
                            name="beta"
                            rules={[
                                {
                                    required: true,
                                    message: t('setting.dstConfig.beta.required'),
                                },
                            ]}
                        >
                            <Radio.Group>
                                <Radio value={0}>{t('setting.dstConfig.beta.false')}</Radio>
                                <Radio value={1}>{t('setting.dstConfig.beta.true')}</Radio>
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item
                            label={t('setting.dstConfig.bin')}
                            name="bin"
                            rules={[
                                {
                                    required: true,
                                    message: t('setting.dstConfig.bin.required'),
                                },
                            ]}
                        >
                            <Radio.Group>
                                <Radio value={32}>{t('setting.dstConfig.bin.32')}</Radio>
                                <Radio value={64}>{t('setting.dstConfig.bin.64')}</Radio>
                                <Tooltip title={t('setting.dstConfig.bin.luajit.tooltip')}>
                                    <Radio value={100}>luajit</Radio>
                                </Tooltip>
                                <Tooltip title={t('setting.dstConfig.bin.box86.tooltip')}>
                                    <Radio value={86}>box86</Radio>
                                </Tooltip>
                                <Tooltip title={t('setting.dstConfig.bin.arm64.tooltip')}>
                                    <Radio value={2664}>arm64</Radio>
                                </Tooltip>
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item
                            wrapperCol={{
                                span: 24,
                            }}
                        >
                            <Button icon={<SaveOutlined/>} type="primary" htmlType="submit">
                                {t('setting.dstConfig.save')}
                            </Button>
                        </Form.Item>
                    </>) }
                </Form>

        </div>
    )
}