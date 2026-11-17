import {Button, message} from "antd";
import {SaveOutlined} from '@ant-design/icons';
import React, {useState} from "react";
import {useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {createBackupApi} from "../../../api/backupApi.jsx";


export default ({block, style, disabled})=>{

    const {t} = useTranslation()
    const [createBackupStatus, setCreateBackupStatus] = useState(false)
    const {cluster} = useParams()
    const createBackupOnClick = () => {
        setCreateBackupStatus(true)
        createBackupApi(cluster)
            .then(response => {
                if (response.code === 200) {
                    message.success(t('panel.backup.success'))
                } else {
                    message.warning(t('panel.backup.error'))
                }
                setCreateBackupStatus(false)
            })
            .catch(error => {
                console.log(error)
                setCreateBackupStatus(false)
            })
    }

    return(
        <>
            <Button icon={<SaveOutlined/>}
                block={block}
                type={'primary'}
                disabled={disabled}
                    onClick={() => {
                        createBackupOnClick()
                    }}
                    loading={createBackupStatus}
                    style={style}
            >
                {t('panel.backup.create')}
            </Button>
        </>
    )
}