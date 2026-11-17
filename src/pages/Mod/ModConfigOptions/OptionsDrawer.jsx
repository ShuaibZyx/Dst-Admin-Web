import {Drawer, Typography, Empty} from "antd";
import {useTranslation} from "react-i18next";
import OptionSelect from "./OptionsSelect/index.jsx";

const {Paragraph} = Typography;

// 模组配置项抽屉（由列表条目「选项」按钮打开）
export default ({mod, open, onClose, defaultConfigOptionsRef, modConfigOptionsRef}) => {
    const {t} = useTranslation()
    return (
        <Drawer
            closable={{placement: 'end'}}
            getContainer={document.body}
            title={`${mod?.name || mod?.modid || ''}`}
            open={open}
            onClose={onClose}
            width={860}
            destroyOnClose
            footer={null}
        >
            <div>
                {mod?.mod_config?.configuration_options !== undefined && (
                    <OptionSelect
                        mod={mod}
                        defaultConfigOptionsRef={defaultConfigOptionsRef}
                        modConfigOptionsRef={modConfigOptionsRef}
                    />
                )}
                {mod?.mod_config?.configuration_options === undefined && mod?.mod_config?.author === undefined && <>
                    <Paragraph>
                        {t('mod.download.error.title')}
                    </Paragraph>
                    <Paragraph>
                        {t('mod.download.error.retry')}
                    </Paragraph>
                    <Paragraph>
                        {t('mod.download.error.tips')}
                    </Paragraph>
                </>}
                {mod?.mod_config?.configuration_options === undefined && mod?.mod_config?.author !== undefined &&
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                }
            </div>
        </Drawer>
    )
}
