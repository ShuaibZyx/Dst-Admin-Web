import React, {useEffect, useState} from "react";
import {SendOutlined} from '@ant-design/icons';
import {useTranslation} from "react-i18next";

import {Button, Col, Input, Row, Select, Space, message, Spin, Tag} from 'antd';
import {sendCommandApi} from "../../../api/level.jsx";
import {useLevelsStore} from "../../../store/useLevelsStore.tsx";
import {ProCard} from "@ant-design/pro-components";
import {TimeButtons, ItemGive} from "../../TooManyItemsPlus/OtherIOrder.tsx";


const {TextArea} = Input;

export default () => {
    const {t} = useTranslation()
    const levels = useLevelsStore((state) => state.levels)

    useEffect(() => {
        const historyJson = localStorage.getItem('history');
        let history = JSON.parse(historyJson);
        if (history === null) {
            history = []
        }
        setHistoryCommand(history)
    }, [])

    function addHistory(command) {
        const h = [...historyCommand]
        h.push(command)
        setHistoryCommand(h)
        localStorage.setItem("history", JSON.stringify(h))
    }

    function removeHistory(command) {
        const h = [...historyCommand]
        const j = h.filter(o => command !== o)
        setHistoryCommand(j)
        localStorage.setItem("history", JSON.stringify(j))
    }

    const [historyCommand, setHistoryCommand] = useState([])

    const [command, setCommand] = useState('');
    const [command2, setCommand2] = useState('');
    const [spin, setSpin] = useState(false)

    const onchange = (e) => {
        setCommand(e.target.value);
    };
    const onchange2 = (e) => {
        setCommand2(e.target.value);
    };

    const notHasLevels = levels?.length === 0
    const [levelName, setLevelName] = useState(notHasLevels ? "" : levels[0]?.key)

    function sendInstructOrder() {
        if (command === "") {
            message.warning(t('panel.command.required'))
            return
        }
        console.log(levelName, command)
        setSpin(true)
        addHistory(command)
        sendCommandApi("", levelName, command)
            .then(resp => {
                if (resp.code === 200) {
                    message.success(t('panel.command.send.success'))
                } else {
                    message.error(t('panel.command.send.error'))
                }
                setSpin(false)
            })
    }

    function SentBroad() {
        if (command2 === "") {
            message.warning(t('panel.command.required'))
            return
        }
        console.log(levelName, command2)
        setSpin(true)
        const cmd = `c_announce"${command2}"`
        addHistory(command2)
        sendCommandApi("", levelName, cmd)
            .then(resp => {
                if (resp.code === 200) {
                    message.success(t('panel.command.send.success'))
                } else {
                    message.error(t('panel.command.send.error'))
                }
                setSpin(false)
            })
    }

    const handleChange = (value) => {
        setLevelName(value)
    }

    return (
        <Spin spinning={spin} tip={t('panel.command.sending')}>
            <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
                <ProCard title={t('tooManyItems.timeButtons')} bordered>
                    <TimeButtons/>
                </ProCard>

                <ProCard title={t('tooManyItems.customItemGive')} bordered>
                    <ItemGive/>
                </ProCard>

                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                        <ProCard title={t('panel.remote.send.command')} bordered>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8}}>
                                <Select
                                    value={notHasLevels ? undefined : levelName}
                                    style={{width: 160}}
                                    placeholder={t('panel.remote.card.pickLevel')}
                                    onChange={handleChange}
                                    options={levels.map(level => ({
                                        value: level.key,
                                        label: level.levelName,
                                    }))}
                                />
                                <Button icon={<SendOutlined/>} type="primary" onClick={() => sendInstructOrder()}>{t('panel.send')}</Button>
                            </div>
                            <TextArea style={{marginTop: 12}} onChange={onchange} rows={4}/>
                        </ProCard>
                    </Col>
                    <Col xs={24} lg={12}>
                        <ProCard title={t('panel.remote.send.message')} bordered>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8}}>
                                <Select
                                    value={notHasLevels ? undefined : levelName}
                                    style={{width: 160}}
                                    placeholder={t('panel.remote.card.pickLevel')}
                                    onChange={handleChange}
                                    options={levels.map(level => ({
                                        value: level.key,
                                        label: level.levelName,
                                    }))}
                                />
                                <Button icon={<SendOutlined/>} type="primary" onClick={() => SentBroad()}>{t('panel.send')}</Button>
                            </div>
                            <TextArea style={{marginTop: 12}} onChange={onchange2} rows={4}/>
                        </ProCard>
                    </Col>
                </Row>

                <ProCard title={t('panel.remote.send.history')} bordered>
                    {historyCommand.length === 0
                        ? <span style={{opacity: 0.55}}>{t('panel.remote.card.noHistory')}</span>
                        : historyCommand.map(c => (
                            <Tag key={c} closeIcon onClose={() => removeHistory(c)}>{c}</Tag>
                        ))}
                </ProCard>
            </div>
        </Spin>
    );
}
