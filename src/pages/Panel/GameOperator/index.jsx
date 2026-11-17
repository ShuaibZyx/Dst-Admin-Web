import React from "react";

import {Col, Row,} from "antd";
import GameLevels from "../GameLevels/index.jsx";
import GameArchive from "../GameArchive/index.jsx";
import ServerLog from "../ServerLog/index.jsx";
import OnlinePlayers from "../OnlinePlayers/index.jsx";
import OS from "../OS/index.jsx";

// 行内等高:同一行的卡片以最高者为准(Col stretch + 卡片填充)
const fillCss = `
.panel-fill { height: 100%; }
.panel-fill > .ant-pro-card,
.panel-fill > .ant-spin-nested-loading,
.panel-fill > .ant-spin-nested-loading > .ant-spin-container,
.panel-fill > .ant-spin-nested-loading > .ant-spin-container > .ant-pro-card { height: 100%; }
`;

export default () => {

    return (
        <>
            <style>{fillCss}</style>
            <OS />
            <br/>
            <Row gutter={[16,16]} align="stretch">
                <Col xs={24} sm={24} md={10} lg={10} xl={10}>
                    <div className="panel-fill"><GameArchive/></div>
                </Col>
                <Col xs={24} sm={24} md={14} lg={14} xl={14}>
                    <div className="panel-fill"><ServerLog/></div>
                </Col>
                <Col xs={24} sm={24} md={10} lg={10} xl={10}>
                    <div className="panel-fill"><GameLevels/></div>
                </Col>
                <Col xs={24} sm={24} md={14} lg={14} xl={14}>
                    <div className="panel-fill"><OnlinePlayers/></div>
                </Col>
            </Row>
        </>
    )
}
