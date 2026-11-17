import {Avatar, Button, Card, Col, Divider, Form, Input, message, Row, Skeleton, Space, Typography, Upload} from 'antd';
import {CameraOutlined, SaveOutlined, UserOutlined} from '@ant-design/icons';
import {useEffect, useState} from "react";
import {ProCard} from "@ant-design/pro-components";
import {getUserInfoApi, updateUserApi} from "../api/userApi.jsx";
import {useTranslation} from "react-i18next";

// 文字头像兜底：无图时用 displayName 首字母（按名字取色）
const textAvatarColor = (name) => {
    const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#87d068', '#2db7f5']
    let sum = 0
    for (let i = 0; i < (name || '').length; i++) sum += name.charCodeAt(i)
    return colors[sum % colors.length]
}

export default () => {
    const {t} = useTranslation();

    const [loading, setLoading] = useState(false)
    const [profileForm] = Form.useForm();
    const [pwdForm] = Form.useForm();
    const [photoURL, setPhotoURL] = useState('')
    const [displayName, setDisplayName] = useState('')

    useEffect(() => {
        setLoading(true)
        getUserInfoApi()
            .then(resp => {
                if (resp.code === 200) {
                    const d = resp.data || {}
                    profileForm.setFieldsValue({username: d.username, displayName: d.displayName})
                    setPhotoURL(d.photoURL || '')
                    setDisplayName(d.displayName || '')
                }
                setLoading(false)
            })
            .catch(error => {
                console.error('load user info failed:', error)
                setLoading(false)
            })
    }, [])

    // 头像上传：图片转 base64 存 photoURL（无图时文字头像兜底）
    const beforeUpload = (file) => {
        if (!file.type.startsWith('image/')) {
            message.warning(t('userProfile.avatar.typeError'))
            return false
        }
        const reader = new FileReader()
        reader.onload = (e) => setPhotoURL(e.target.result)
        reader.readAsDataURL(file)
        return false
    }

    // 资料保存（不含密码）
    const saveProfile = () => {
        profileForm.validateFields().then(values => {
            updateUserApi("", {...values, photoURL})
                .then(resp => {
                    if (resp.code === 200) {
                        setDisplayName(values.displayName)
                        message.success(t('userProfile.save.ok'))
                    } else {
                        message.error(t('userProfile.save.error'))
                    }
                })
                .catch(error => {
                    console.error('save profile failed:', error)
                    message.error(t('userProfile.save.error'))
                })
        }).catch(err => {
            message.error(err.errorFields[0].errors[0])
        })
    }

    // 密码保存（二次确认后单独提交）
    const savePassword = () => {
        pwdForm.validateFields().then(values => {
            updateUserApi("", {password: values.newPassword})
                .then(resp => {
                    if (resp.code === 200) {
                        pwdForm.resetFields()
                        message.success(t('userProfile.password.save.ok'))
                    } else {
                        message.error(t('userProfile.save.error'))
                    }
                })
                .catch(error => {
                    console.error('save password failed:', error)
                    message.error(t('userProfile.save.error'))
                })
        }).catch(err => {
            message.error(err.errorFields[0].errors[0])
        })
    }

    return <>
        <ProCard>
            <Skeleton loading={loading} active>
                <Row gutter={[32, 24]}>
                    {/* 左栏：头像（悬浮显示上传，无单独按钮/无文字信息） */}
                    <Col xs={24} md={8}>
                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 260}}>
                            <Upload accept="image/*" showUploadList={false} beforeUpload={beforeUpload}>
                                <div style={{position: 'relative', cursor: 'pointer'}}>
                                    {photoURL
                                        ? <Avatar size={112} src={photoURL}/>
                                        : <Avatar size={112} style={{backgroundColor: textAvatarColor(displayName), fontSize: 42}}>
                                            {(displayName || '?').charAt(0).toUpperCase()}
                                        </Avatar>}
                                    <div style={{
                                        position: 'absolute', inset: 0, borderRadius: '50%',
                                        background: 'rgba(0,0,0,0.45)', color: '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        opacity: 0, transition: 'opacity 0.2s', fontSize: 13,
                                    }}
                                         className="avatar-hover-mask">
                                        <CameraOutlined style={{marginRight: 6}}/>{t('userProfile.avatar.upload')}
                                    </div>
                                </div>
                            </Upload>
                        </div>
                    </Col>

                    {/* 右栏：资料（与左栏垂直居中对齐） */}
                    <Col xs={24} md={16} style={{display: "flex", flexDirection: "column", justifyContent: "center"}}>
                        <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: 12}}>
                            <Button icon={<SaveOutlined/>} type="primary" onClick={saveProfile}>
                                {t('userProfile.save.profile')}
                            </Button>
                        </div>
                        <Form form={profileForm} layout="vertical">
                            <Form.Item
                                label={t('init.displayName')}
                                name="displayName"
                                rules={[{required: true, message: t('userProfile.displayName.required')}]}>
                                <Input onChange={(e) => setDisplayName(e.target.value)}/>
                            </Form.Item>
                            <Form.Item
                                label={t('init.username')}
                                name="username"
                                rules={[{required: true, message: t('userProfile.username.required')}]}>
                                <Input/>
                            </Form.Item>
                        </Form>
                    </Col>

                    {/* 修改密码：整行一行排列（占满一行） */}
                    <Col xs={24}>
                        <Divider/>
                        <Form form={pwdForm} layout="inline" style={{display: 'flex', width: '100%', gap: 8}}>
                            <Form.Item
                                label={t('userProfile.password.new')}
                                name="newPassword"
                                style={{flex: 1}}
                                rules={[{required: true, message: t('userProfile.password.required')}]}>
                                <Input.Password style={{width: '100%'}}/>
                            </Form.Item>
                            <Form.Item
                                label={t('userProfile.password.confirm')}
                                name="confirmPassword"
                                style={{flex: 1}}
                                dependencies={['newPassword']}
                                rules={[
                                    {required: true, message: t('userProfile.password.required')},
                                    ({getFieldValue}) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('newPassword') === value) {
                                                return Promise.resolve()
                                            }
                                            return Promise.reject(new Error(t('userProfile.password.mismatch')))
                                        },
                                    }),
                                ]}>
                                <Input.Password style={{width: '100%'}}/>
                            </Form.Item>
                            <Form.Item>
                                <Button icon={<SaveOutlined/>} type="primary" onClick={savePassword}>
                                    {t('userProfile.save.password')}
                                </Button>
                            </Form.Item>
                        </Form>
                    </Col>
                </Row>
            </Skeleton>
        </ProCard>
        <style>{`.avatar-hover-mask:hover { opacity: 1 !important; }`}</style>
    </>
}
