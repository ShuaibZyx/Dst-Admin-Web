import React, { useState } from "react";

import {
    Button,
    Modal
} from "antd";
import type { RadioChangeEvent } from "antd/es/radio";

import { useTranslation } from "react-i18next";


import type { ClusterIniFormValues } from "../../../type";

import style from '../DstEomj/index.module.css'
import {
    ProForm,
    ProFormRadio,
    ProFormText,
    ProFormTextArea,
    ProFormDigit,
    ProFormSwitch,
} from "@ant-design/pro-components";

import DstEmojiList from "../DstEomj/DstEmojiList.tsx";
import { dstGameMod } from "../../../types/dst.ts";

const gameModeI18nKey: Record<string, string> = {
    endless: 'dst.gameMode.endless',
    survival: 'dst.gameMode.survival',
    wilderness: 'dst.gameMode.wilderness',
    lightsout: 'dst.gameMode.lightsout',
    lavaarena: 'dst.gameMode.lavaarena',
    quagmire: 'dst.gameMode.quagmire',
    OceanFishing: 'dst.gameMode.oceanFishing',
    starvingfloor: 'dst.gameMode.starvingFloor',
    customization: 'dst.gameMode.customization',
}

interface ClusterIniProps {
    // 只渲染一个分区：房间设置(base)/网络设置(shard)/Steam设置(steam)——页签由 Home 平铺
    onlyTab: 'base' | 'shard' | 'steam'
    // 三分区共享同一个 ProForm 实例（cluster.ini 全量表单）：加载/保存都在 Home，保存按钮全量写回。
    // 别在本组件里建 form 或拉数据——会拆散共享表单语义
    form: any
    onFinish: (values: ClusterIniFormValues) => Promise<boolean>
    // 游戏模式单选联动（自定义模式输入框显隐）：状态在 Home（数据加载时也要设置）
    choose?: string
    onChoose?: (mode: string) => void
}

const ClusterIni: React.FC<ClusterIniProps> = ({onlyTab, form: formRef, onFinish, choose, onChoose}) => {

    const { t } = useTranslation()

    const onRadioChange = (e: RadioChangeEvent) => {
        onChoose?.(e.target.value);
    }

    const [open, setOpen] = useState<boolean>(false)

    return (
        <div className={`${style.antInput}`}>
            <Modal title={t('cluster.emoji.title')} open={open} onCancel={() => setOpen(false)} footer={null}>
                <DstEmojiList />
            </Modal>

            {onlyTab === 'base' && (
                                <ProForm
                                    form={formRef}
                                                    onFinish={onFinish}
                                                    grid
                                                    rowProps={{
                                                        gutter: [16, 0],
                                                    }}
                                                    initialValues={{
                                                        pvp: false,
                                                        vote_enabled: true,
                                                        max_players: 8,
                                                        steam_group_only: false,
                                                        tick_rate: 15,
                                                        max_snapshots: 6,
                                                        bind_ip: '127.0.0.1',
                                                        pause_when_nobody: false,
                                                        console_enabled: true
                                                    }}
                                                    submitter={{
                                                        render: () => null
                                                    }}
                                                >
                                                    <ProFormText
                                                        colProps={{ md: 24, xl: 24 }}
                                                        label={t('cluster.cluster_name')}
                                                        name='cluster_name'
                                                        tooltip={t('cluster.tooltip.cluster_name')}
                                                        rules={[
                                                            {
                                                                required: true,
                                                                message: t('cluster.required.cluster_name'),
                                                            },
                                                        ]}
                                                        placeholder={t('cluster.placeholder.cluster_name')}
                                                        fieldProps={{
                                                            className: style.icon
                                                        }}
                                                        extra={(
                                                            <Button type="link" size="small" onClick={() => setOpen(true)}>{t('cluster.emoji.title')}</Button>
                                                        )}
                                                    />
                                                    <ProFormTextArea
                                                        colProps={{ md: 24, xl: 24 }}
                                                        label={t('cluster.cluster_description')}
                                                        name='cluster_description'
                                                        placeholder={t('cluster.placeholder.cluster_description')}
                                                        fieldProps={{
                                                            rows: 2,
                                                            className: style.icon
                                                        }}
                                                    />

                                                    <ProFormRadio.Group
                                                        colProps={{ md: 24, xl: 24 }}
                                                        label={t('cluster.game_mode')}
                                                        name='game_mode'
                                                        rules={[
                                                            {
                                                                required: true,
                                                                message: t('cluster.required.game_mode'),
                                                            },
                                                        ]}
                                                        tooltip={t('cluster.tooltip.game_mode')}
                                                        fieldProps={{ onChange: onRadioChange }}
                                                        options={dstGameMod.map((item: { name: string, cn: string, description: string }) => ({
                                                            label: t(gameModeI18nKey[item.name] || item.name),
                                                            value: item.name,
                                                        }))}
                                                    />

                                                    {choose === 'customization' &&
                                                        <ProFormText
                                                            colProps={{ md: 12, xl: 12 }}
                                                            label={t('cluster.customization_mode')}
                                                            tooltip={t('cluster.tooltip.customization_mode')}
                                                            name='customization_mode'
                                                            placeholder={t('cluster.placeholder.customization_mode')}
                                                            fieldProps={{ maxLength: 20 }}
                                                        />
                                                    }

                                                    <ProFormDigit
                                                        colProps={{ md: 12, xl: 12 }}
                                                        label={t('cluster.max_players')}
                                                        tooltip={t('cluster.tooltip.max_players')}
                                                        name='max_players'
                                                    />

                                                    <ProFormText.Password
                                                        colProps={{ md: 12, xl: 12 }}
                                                        label={t('cluster.cluster_password')}
                                                        name='cluster_password'
                                                        placeholder={t('cluster.placeholder.cluster_password')}
                                                        fieldProps={{ maxLength: 20, autoComplete: 'new-password' }}
                                                    />

                                                    <ProFormText.Password
                                                        colProps={{ md: 24, xl: 24 }}
                                                        label={t('cluster.cluster_token')}
                                                        name='cluster_token'
                                                        rules={[
                                                            {
                                                                required: true,
                                                                message: t('cluster.required.cluster_token'),
                                                            },
                                                        ]}
                                                        tooltip={t('cluster.tooltip.cluster_token')}
                                                        placeholder={t('cluster.placeholder.cluster_token')}
                                                        fieldProps={{ autoComplete: 'new-password' }}
                                                    />

                                                    <ProFormSwitch
                                                        colProps={{ md: 12, xl: 8 }}
                                                        label={t('cluster.pvp')}
                                                        tooltip={t('cluster.tooltip.pvp')}
                                                        name='pvp'
                                                        fieldProps={{
                                                            checkedChildren: t('switch.open'),
                                                            unCheckedChildren: t('switch.close')
                                                        }}
                                                    />

                                                    <ProFormSwitch
                                                        colProps={{ md: 12, xl: 8 }}
                                                        label={t('cluster.vote_enabled')}
                                                        tooltip={t('cluster.tooltip.vote_enabled')}
                                                        name='vote_enabled'
                                                        fieldProps={{
                                                            checkedChildren: t('switch.open'),
                                                            unCheckedChildren: t('switch.close')
                                                        }}
                                                    />

                                                    <ProFormSwitch
                                                        colProps={{ md: 12, xl: 8 }}
                                                        label={t('cluster.pause_when_nobody')}
                                                        tooltip={t('cluster.tooltip.pause_when_nobody')}
                                                        name='pause_when_nobody'
                                                        fieldProps={{
                                                            checkedChildren: t('switch.open'),
                                                            unCheckedChildren: t('switch.close')
                                                        }}
                                                    />

                                                    <ProFormSwitch
                                                        colProps={{ md: 12, xl: 8 }}
                                                        label={t('cluster.console_enabled')}
                                                        tooltip={t('cluster.tooltip.console_enabled')}
                                                        name='console_enabled'
                                                        extra={<span>{t('cluster.alert.console_enabled.disabled')}</span>}
                                                        fieldProps={{
                                                            checkedChildren: t('switch.open'),
                                                            unCheckedChildren: t('switch.close')
                                                        }}
                                                    />

                                                    <ProFormSwitch
                                                        colProps={{ md: 12, xl: 8 }}
                                                        label={t('cluster.offline_cluster')}
                                                        name='offline_cluster'
                                                        tooltip={t('cluster.tooltip.offline_cluster')}
                                                        fieldProps={{
                                                            checkedChildren: t('switch.open'),
                                                            unCheckedChildren: t('switch.close')
                                                        }}
                                                    />

                                                    <ProFormSwitch
                                                        colProps={{ md: 12, xl: 8 }}
                                                        label={t('cluster.lan_only_cluster')}
                                                        name='lan_only_cluster'
                                                        tooltip={t('cluster.tooltip.lan_only_cluster')}
                                                        fieldProps={{
                                                            checkedChildren: t('switch.open'),
                                                            unCheckedChildren: t('switch.close')
                                                        }}
                                                    />

                                                    <ProFormDigit
                                                        colProps={{ md: 12, xl: 12 }}
                                                        label={t('cluster.whitelist_slots')}
                                                        name='whitelist_slots'
                                                        tooltip={t('cluster.tooltip.whitelist_slots')}
                                                        placeholder={t('cluster.placeholder.whitelist_slots')}
                                                    />

                                                    <ProFormDigit
                                                        colProps={{ md: 12, xl: 12 }}
                                                        label={t('cluster.tick_rate')}
                                                        name='tick_rate'
                                                        tooltip={t('cluster.tooltip.tick_rate')}
                                                        placeholder={t('cluster.placeholder.tick_rate')}
                                                    />

                                                    <ProFormDigit
                                                        colProps={{ md: 12, xl: 12 }}
                                                        label={t('cluster.max_snapshots')}
                                                        name='max_snapshots'
                                                        tooltip={t('cluster.tooltip.max_snapshots')}
                                                        placeholder={t('cluster.max_snapshots')}
                                                    />

                                                    <ProFormText
                                                        colProps={{ md: 12, xl: 12 }}
                                                        label={t('cluster.cluster_language')}
                                                        name='cluster_language'
                                                        tooltip={t('cluster.tooltip.cluster_language')}
                                                        placeholder="zh"
                                                    />
                                </ProForm>
            )}
            {onlyTab === 'shard' && (
                                <ProForm
                                    form={formRef}
                                                    onFinish={onFinish}
                                                    grid
                                                    rowProps={{
                                                        gutter: [16, 0],
                                                    }}
                                                    submitter={{
                                                        render: () => null
                                                    }}
                                                >
                                                    <ProFormDigit
                                                        colProps={{ md: 24, xl: 24 }}
                                                        label={t('cluster.master_port')}
                                                        name='master_port'
                                                        tooltip={t('cluster.tooltip.master_port')}
                                                        extra={<span>{t('cluster.alert.master_port.info')}</span>}
                                                        placeholder={t('cluster.master_port')}
                                                    />

                                                    <ProFormSwitch
                                                        colProps={{ md: 24, xl: 24 }}
                                                        label={t('cluster.shard_enabled')}
                                                        tooltip={t('cluster.tooltip.shard_enabled')}
                                                        name='shard_enabled'
                                                        extra={<span>{t('cluster.alert.shard_enabled.disabled')}</span>}
                                                        fieldProps={{
                                                            checkedChildren: t('switch.open'),
                                                            unCheckedChildren: t('switch.close')
                                                        }}
                                                    />

                                                    <ProFormText.Password
                                                        colProps={{ md: 24, xl: 24 }}
                                                        label={t('cluster.bind_ip')}
                                                        name='bind_ip'
                                                        tooltip={t('cluster.tooltip.bind_ip')}
                                                        extra={<span>{t('cluster.alert.bind_ip.info')}</span>}
                                                        placeholder={t('cluster.bind_ip')}
                                                        fieldProps={{ autoComplete: 'new-password' }}
                                                    />

                                                    <ProFormText.Password
                                                        colProps={{ md: 24, xl: 24 }}
                                                        label={t('cluster.master_ip')}
                                                        name='master_ip'
                                                        tooltip={t('cluster.tooltip.master_ip')}
                                                        extra={<span>{t('cluster.alert.master_ip.info')}</span>}
                                                        placeholder={t('cluster.master_ip')}
                                                        fieldProps={{ autoComplete: 'new-password' }}
                                                    />

                                                    <ProFormText
                                                        colProps={{ md: 24, xl: 24 }}
                                                        label={t('cluster.cluster_key')}
                                                        name='cluster_key'
                                                        tooltip={t('cluster.tooltip.cluster_key')}
                                                        placeholder={t('cluster.cluster_key')}
                                                    />
                                </ProForm>
            )}
            {onlyTab === 'steam' && (
                                <ProForm
                                    form={formRef}
                                                    onFinish={onFinish}
                                                    grid
                                                    rowProps={{
                                                        gutter: [16, 0],
                                                    }}
                                                    submitter={{
                                                        render: () => null
                                                    }}
                                                >
                                                    <ProFormText
                                                        colProps={{ md: 24, xl: 24 }}
                                                        label={t('cluster.steam_group_id')}
                                                        name='steam_group_id'
                                                        tooltip={t('cluster.tooltip.steam_group_id')}
                                                        placeholder={t('cluster.steam_group_id')}
                                                    />

                                                    <ProFormSwitch
                                                        colProps={{ md: 24, xl: 24 }}
                                                        label={t('cluster.steam_group_only')}
                                                        name='steam_group_only'
                                                        tooltip={t('cluster.tooltip.steam_group_only')}
                                                        fieldProps={{
                                                            checkedChildren: t('switch.open'),
                                                            unCheckedChildren: t('switch.close')
                                                        }}
                                                    />

                                                    <ProFormSwitch
                                                        colProps={{ md: 24, xl: 24 }}
                                                        label={t('cluster.steam_group_admins')}
                                                        name='steam_group_admins'
                                                        tooltip={t('cluster.tooltip.steam_group_admins')}
                                                        fieldProps={{
                                                            checkedChildren: t('switch.open'),
                                                            unCheckedChildren: t('switch.close')
                                                        }}
                                                    />
                                </ProForm>
            )}
        </div>
    )
}

export default ClusterIni
