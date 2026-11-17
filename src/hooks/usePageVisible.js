import {useEffect, useState} from "react"

// 页面可见性：隐藏(切后台/刷新前)时释放 SSE 长连接——HTTP/1.1 同域只有 6 条连接,
// 4 条常驻 SSE 会挤满连接池,刷新时新页面请求排队(一直转圈)。可见恢复时重连。
export function usePageVisible() {
    const [visible, setVisible] = useState(() => !document.hidden)
    useEffect(() => {
        const onChange = () => setVisible(!document.hidden)
        document.addEventListener('visibilitychange', onChange)
        return () => document.removeEventListener('visibilitychange', onChange)
    }, [])
    return visible
}
