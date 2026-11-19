import React, {useEffect} from 'react';
import {Alert, Form, Input, InputNumber, Switch} from 'antd';
import {useTranslation} from 'react-i18next';

// server_ini 编辑表单：对 level.server_ini 受控编辑、经 changeLevel 写回。
// 世界 tab 与创建台共用。
const ServerIni = (props) => {
    const {t} = useTranslation()
    const [form] = Form.useForm();
    useEffect(() => {
        form.setFieldsValue(props.level.server_ini)
    }, [props.level.server_ini, form]);

    function onValuesChange(_changedValues, allValues) {
        if (props.changeLevel) {
            // 确保 allValues 包含完整的 server_ini 数据
            props.changeLevel(props.levelName || '', {server_ini: allValues})
        }
    }

    return (
        <Form
            labelWrap
            labelCol={{
                // 4 栏：容纳 label + tooltip 问号图标（3 栏时图标被控件压住）；
                // labelWrap 让超长 label（Steam 主服务器端口）换行收纳图标，不压控件
                span: 4,
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

export default ServerIni;
