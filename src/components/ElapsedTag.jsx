import {useEffect, useState} from 'react';

// 运行时长本地走秒：从不变的 startedAt（进程创建时刻）推导。
// 时钟绝不进状态流（会顶掉变更去重、引发全树重渲染）；本组件自己每秒更新，
// 重渲染范围仅限自身。
export default ({startedAt}) => {
    const [txt, setTxt] = useState('');
    useEffect(() => {
        const fmt = () => {
            if (!startedAt) {
                setTxt('');
                return;
            }
            const s = Math.floor((Date.now() - startedAt) / 1000);
            setTxt(
                s < 60 ? `${s} 秒`
                    : s < 3600 ? `${Math.floor(s / 60)} 分 ${s % 60} 秒`
                        : s < 86400 ? `${Math.floor(s / 3600)} 小时 ${Math.floor((s % 3600) / 60)} 分`
                            : `${Math.floor(s / 86400)} 天 ${Math.floor((s % 86400) / 3600)} 小时`
            );
        };
        fmt();
        const id = setInterval(fmt, 1000);
        return () => clearInterval(id);
    }, [startedAt]);
    return txt ? <span>{txt}</span> : null;
};
