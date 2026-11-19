// 共享：Steam 简介 BBCode 渲染（我的订阅详情抽屉 / 模组设置右半区简介同用）
// 渲染 Steam 简介 BBCode：[h1]/[h2]/[h3]/[b]/[u]/[i]/[s]/[url=..]，未知标签透传为纯文本，裸链接自动成链
const renderBb = (text) => {
    // —— 行内：b/u/i/s/h1-3/url 样式栈 + 裸链接自动成链 ——
    const styleOf = (stack) => {
        const s = {}
        for (const t of stack) {
            if (t === 'b') s.fontWeight = 600
            else if (t === 'u') s.textDecoration = 'underline'
            else if (t === 'i') s.fontStyle = 'italic'
            else if (t === 's') s.textDecoration = 'line-through'
            else if (t === 'h1') { s.fontWeight = 700; s.fontSize = 15 }
            else if (t === 'h2') { s.fontWeight = 700; s.fontSize = 14 }
            else if (t === 'h3') { s.fontWeight = 600; s.fontSize = 13 }
        }
        return s
    }
    const inline = (raw) => {
        const out = []
        const stack = []
        let key = 0
        const pushText = (piece) => {
            if (!piece) return
            const style = styleOf(stack)
            let urlHref = ''
            for (let i = stack.length - 1; i >= 0; i--) {
                if (stack[i].startsWith('url:')) { urlHref = stack[i].slice(4); break }
            }
            piece.split(/(https?:\/\/[^\s\]]+)/g).forEach(seg => {
                if (!seg) return
                const href = urlHref || (seg.startsWith('http') ? seg : '')
                if (href) out.push(<a key={key++} href={href} target="_blank" rel="noreferrer" style={style}>{seg}</a>)
                else out.push(<span key={key++} style={style}>{seg}</span>)
            })
        }
        const re = /\[(\/?)(h1|h2|h3|b|u|i|s|url)(?:=([^\]]*))?\]/gi
        let last = 0
        let m = re.exec(raw)
        while (m !== null) {
            pushText(raw.slice(last, m.index))
            last = re.lastIndex
            const closing = m[1] === '/'
            const tag = m[2].toLowerCase()
            if (tag === 'url') {
                if (closing) {
                    for (let i = stack.length - 1; i >= 0; i--) {
                        if (stack[i].startsWith('url:')) { stack.splice(i, 1); break }
                    }
                } else {
                    stack.push('url:' + (m[3] ? m[3].trim() : ''))
                }
            } else if (closing) {
                const i = stack.lastIndexOf(tag)
                if (i >= 0) stack.splice(i, 1)
            } else {
                stack.push(tag)
            }
            m = re.exec(raw)
        }
        pushText(raw.slice(last))
        return out
    }

    // —— 块级：[img] 图、[list]/[*] 列表、> 引用行、正文段 ——
    const out = []
    let key = 0
    const pushChunk = (raw) => {
        if (!raw) return
        let buf = []
        let quotes = []
        const flushBuf = () => {
            if (!buf.length) return
            out.push(<div key={key++} style={{whiteSpace: 'pre-wrap', margin: '8px 0'}}>{inline(buf.join('\n'))}</div>)
            buf = []
        }
        const flushQuotes = () => {
            if (!quotes.length) return
            out.push(
                <div key={key++} style={{
                    margin: '8px 0', padding: '2px 12px',
                    borderLeft: '3px solid rgba(232, 196, 106, 0.5)',
                    color: 'rgba(150, 150, 150, 1)',
                }}>{inline(quotes.join('\n'))}</div>
            )
            quotes = []
        }
        for (const line of raw.split('\n')) {
            const t = line.trimStart()
            if (t.startsWith('> ')) { flushBuf(); quotes.push(t.slice(2)) }
            else if (t === '>') { flushBuf(); quotes.push('') }
            else { flushQuotes(); buf.push(line) }
        }
        flushBuf()
        flushQuotes()
    }
    const re = /\[img\]([\s\S]*?)\[\/img\]|\[list\]([\s\S]*?)(?:\[\/list\]|$)/gi
    let last = 0
    let m = re.exec(text)
    while (m !== null) {
        pushChunk(text.slice(last, m.index))
        last = re.lastIndex
        if (m[1] !== undefined) {
            out.push(<img key={key++} src={m[1].trim()} alt="" style={{maxWidth: '100%', borderRadius: 8, display: 'block', margin: '8px 0'}}/>)
        } else {
            const items = m[2].split(/\[\*\]/i).slice(1).map(s => s.trim()).filter(Boolean)
            out.push(
                <ul key={key++} style={{margin: '8px 0', paddingLeft: 20}}>
                    {items.map((it, i) => <li key={i} style={{margin: '4px 0'}}>{inline(it)}</li>)}
                </ul>
            )
        }
        m = re.exec(text)
    }
    pushChunk(text.slice(last))
    return out
}

export { renderBb }
