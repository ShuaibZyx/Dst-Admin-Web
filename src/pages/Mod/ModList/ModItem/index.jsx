/* eslint-disable react/prop-types */
import {useEffect, useState} from 'react';
import {CloudDownloadOutlined, DeleteOutlined, ExportOutlined, MoreOutlined, SettingOutlined, SyncOutlined} from '@ant-design/icons';
import {Card, Switch, Popconfirm, Row, Col, Button, Dropdown, Modal, message, Spin, Badge} from 'antd';

import './mod.css';
import {useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import OptionsDrawer from '../../ModConfigOptions/OptionsDrawer.jsx';
import {getModInfo} from "../../../../api/modApi.jsx";
import {doUpdateMod} from "../../../../utils/modUpdate.js";

function subscribeMod(lang, t, modid, modList, setModList, setStartLoading) {
    setStartLoading(true)
    getModInfo(lang, "", modid).then(data => {
        console.log(data.data);
        if (data.code !== 200) {
            message.warning(t('mod.subscribe.error'))
        } else {
            setStartLoading(false)
            setModList(current => {
                // return [...current, data.data]
                const newModList = []
                // eslint-disable-next-line no-restricted-syntax
                for (const mod of current) {
                    if (mod.modid !== modid) {
                        newModList.push(mod)
                    }
                }
                data.data.installed = true
                data.data.enable = true
                newModList.push(data.data)
                console.log("newModList: ", newModList)
                return newModList
            })
            message.success(`${t('mod.subscribe.ok')} ${modid}`)
        }
    }).catch(error => {
        console.log(error)
    })

}

const ModItem = (props) => {

    const {t} = useTranslation()
    const {i18n} = useTranslation();
    const lang = i18n.language

    const {removeMod, modList, setModList, defaultConfigOptionsRef, modConfigOptionsRef} = props
    // 初始值直接取 props，避免首帧渲染空卡片（installed 未定义时两个 Row 都不渲染）
    const [mod, setMod] = useState(() => ({...props.mod}))
    const {cluster} = useParams()
    const [startLoading, setStartLoading] = useState(false)
    const [optionsOpen, setOptionsOpen] = useState(false)
    const [updateLoading, setUpdateLoading] = useState(false)

    const updateMod = async () => {
        setUpdateLoading(true)
        try {
            const r = await doUpdateMod(cluster, mod.modid, lang, setModList)
            if (r.ok) {
                message.success(t('mod.update.ok'))
            } else {
                message.warning(r.msg || t('mod.update.error'))
            }
        } catch (error) {
            console.log(error)
            message.error(t('mod.update.error'))
        } finally {
            setUpdateLoading(false)
        }
    }

    // 条目右下角操作组：选项(彩色) + "…"下拉收纳 更新/删除（不外显）
    const moreItems = [
        {
            key: 'update',
            icon: <SyncOutlined style={{color: '#1677ff'}}/>,
            label: <span style={{color: '#1677ff'}}>{t('mod.update')}</span>,
        },
        ...(/^\d+$/.test(mod?.modid || '') ? [{
            key: 'workshop',
            icon: <ExportOutlined/>,
            label: t('mod.workshop'),
        }] : []),
        ...(mod?.modid !== "client_mods_disabled" ? [{
            key: 'delete',
            danger: true,
            icon: <DeleteOutlined/>,
            label: t('mod.delete'),
        }] : []),
    ]

    const actionButtons = (
        <>
            <Button icon={<SettingOutlined/>} size="small" color="primary" variant="outlined" onClick={(event) => {
                event.stopPropagation()
                setOptionsOpen(true)
            }}>{t('mod.options')}</Button>
            <Dropdown
                trigger={['click']}
                menu={{
                    items: moreItems,
                    onClick: ({key, domEvent}) => {
                        domEvent.stopPropagation()
                        if (key === 'update') {
                            updateMod()
                        } else if (key === 'workshop') {
                            window.open(`https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.modid}`, '_blank', 'noopener,noreferrer')
                        } else if (key === 'delete') {
                            setMod(props.mod)
                            Modal.confirm({
                                title: t('mod.delete.title'),
                                okText: 'Yes',
                                cancelText: 'No',
                                onOk: () => removeMod(mod.modid),
                            })
                        }
                    },
                }}
            >
                <Button icon={<MoreOutlined/>} size="small" aria-label="more" onClick={(event) => event.stopPropagation()}/>
            </Dropdown>
        </>
    )

    useEffect(()=>{
        setMod({...props.mod})
    }, [props?.mod])

    return <Spin spinning={startLoading || updateLoading || props.updatingModid === props.mod?.modid} tip={t('mod.updating')}>
        <Card className='mod' style={{margin: ' 0 0 16px', cursor: 'pointer', backgroundColor: mod?.update ? "#583D23" : ""}}
              onClick={() => {
                props.changeMod(mod)
            }}>
            <Row>
                {mod?.installed && <>
                    <div style={{display: "flex", justifyContent: "stretch", flex: "1", overflow: "hidden"}}>
                        <div style={{flexBasis: "20%", marginRight: "20px"}}>
                            {props.mod.img ? <img
                                style={{display: "inline-block", maxWidth: "auto"}}
                                alt={mod?.name || mod?.modid || ''}
                                src={props.mod.img}
                            /> : <div style={{width: 64, height: 64, borderRadius: 8, background: 'rgba(128,128,128,0.2)'}}/>}
                        </div>

                        <div style={{flexBasis: "80%", overflow: "hidden"}}>

                            <div style={{
                                fontSize: '16px',
                                paddingBottom: '8px',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                            >

                                <span style={{}}>{mod?.name}</span>
                            </div>
                            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap'}}>
                                <div>
                                {mod?.update && <Badge count={1}>
                                    <Switch checkedChildren={t('switch.open')} unCheckedChildren={t('switch.close')}
                                            checked={mod?.enable}
                                            onClick={(checked, event) => event.stopPropagation()}
                                            onChange={() => {
                                                props.changeEnable(mod?.modid)
                                            }}
                                    />
                                </Badge>}
                                {!mod?.update &&
                                    <Switch checkedChildren={t('switch.open')} unCheckedChildren={t('switch.close')}
                                            checked={mod?.enable}
                                            onChange={() => {
                                                props.changeEnable(mod?.modid)
                                            }}
                                    />}
                                {mod?.update && <span style={{marginLeft: 8}}>{t('mod.update')}</span>}
                                </div>
                                <div style={{display: 'flex', gap: '12px'}}>
                                    {actionButtons}
                                </div>
                            </div>
                        </div>
                    </div>
                </>}
            </Row>
            <Row>
                {mod?.installed === false && <>
                    <Col flex="64px">
                        {props?.mod?.img ? <img
                            alt={props?.mod?.modid || ''}
                            src={props?.mod?.img}
                        /> : <div style={{width: 64, height: 64, borderRadius: 8, background: 'rgba(128,128,128,0.2)'}}/>}
                    </Col>
                    <Col flex="auto" style={{paddingLeft: '16px'}}>
                        <Row>
                            <Col span={24}><span style={{
                                fontSize: '16px'
                            }}>{props?.mod?.modid}</span></Col>
                        </Row>
                        <div style={{
                            marginTop: '12px',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px'
                        }}>
                            <Popconfirm
                                title={t('mod.install')}
                                okText="Yes"
                                cancelText="No"
                                onConfirm={() => {
                                    subscribeMod(lang, t, mod?.modid, modList, setModList, setStartLoading)
                                }}
                            >
                                <Button icon={<CloudDownloadOutlined/>} size="small" type="primary" onClick={(event) => {
                                    event.stopPropagation()
                                    setMod(props.mod)
                                }}>
                                    {t('mod.install')}
                                </Button>
                            </Popconfirm>
                            {actionButtons}
                        </div>
                    </Col>
                </>}
            </Row>
            <OptionsDrawer
                mod={mod}
                open={optionsOpen}
                onClose={() => setOptionsOpen(false)}
                defaultConfigOptionsRef={defaultConfigOptionsRef}
                modConfigOptionsRef={modConfigOptionsRef}
            />
        </Card>
    </Spin>
}

export default ModItem