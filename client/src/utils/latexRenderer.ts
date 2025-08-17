import katex from 'katex';
import 'katex/dist/katex.min.css';

// 预处理LaTeX内容，处理各种格式
export const preprocessLatex = (content: string): string => {
  // 检查输入是否为undefined或null
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  // 清洗不可见字符：NBSP(\u00A0)、ZWSP(\u200B)、ZWNJ(\u200C)、ZWJ(\u200D)、BOM(\uFEFF)
  let processed = content
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ');
  
  // 处理转义的美元符号格式 \$...\$ (改进正则表达式)
  processed = processed.replace(/\\\$(.*?)\\\$/g, (match, formula) => {
    // 清理公式内容，移除末尾的反斜杠
    const cleanFormula = formula.trim().replace(/\\$/, '');
    return `$$${cleanFormula}$$`;
  });
  
  // 处理 [ ... ] 格式的块级公式
  processed = processed.replace(/\[([\s\S]*?)\]/g, (match, formula) => {
    // 清理公式内容
    const cleanFormula = formula.trim();
    if (cleanFormula.includes('\\')) {
      return `$$${cleanFormula}$$`;
    }
    return match;
  });
  
  // 处理 \( ... \) 格式的行内公式
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, '$$1$');
  
  // 处理 \[ ... \] 格式的块级公式
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$1$$');
  
  // 处理 \begin{equation} ... \end{equation} 格式
  processed = processed.replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, '$$$$1$$');
  
  // 处理 \begin{align} ... \end{align} 格式
  processed = processed.replace(/\\begin\{align\}([\s\S]*?)\\end\{align\}/g, '$$$$1$$');
  
  // 处理 \begin{cases} ... \end{cases}
  // 场景：有些题型其实是集合的“竖线”表示法，被识别成了两列表达式（cases）。
  // 这里将其转换为集合的构造表示：{ expr \mid condition }
  processed = processed.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_m, content) => {
    let inner = String(content)
      .replace(/^\s*\\_\s*$/gm, '') // 去除无效占位
      .replace(/\\{3,}/g, '\\')     // 归一化换行标记 \\
      .trim();
    // 支持“|”或“&”作为两列分隔
    inner = inner.replace(/\|/g, ' & ');
    // 去掉末尾多余的换行
    inner = inner.replace(/\\\s*$/g, '').trim();
    const parts = inner.split(/\s*&\s*/);
    if (parts.length >= 2) {
      const left = parts[0].trim();
      const right = parts.slice(1).join(' & ').trim();
      // 返回为行内数学，便于在句中显示
      return `$\\{ ${left} \\mid ${right} \\}$`;
    }
    // 若无法解析为两列，兜底包裹为块级显示，避免报错
    return `$$${inner}$$`;
  });

  return processed;
};

// 渲染单个LaTeX公式
export const renderLatex = (formula: string, displayMode: boolean = false): string => {
  // 检查输入是否为undefined或null
  if (!formula || typeof formula !== 'string') {
    return '';
  }
  
  try {
    // 清理公式内容
    let cleanFormula = formula.trim();
    // 移除末尾的反斜杠（但保留LaTeX命令的反斜杠）
    cleanFormula = cleanFormula.replace(/\\$/, '');
    
    return katex.renderToString(cleanFormula, {
      displayMode,
      throwOnError: false,
      errorColor: '#cc0000',
      macros: {
        "\\RR": "\\mathbb{R}",
        "\\NN": "\\mathbb{N}",
        "\\ZZ": "\\mathbb{Z}",
        "\\QQ": "\\mathbb{Q}",
        "\\CC": "\\mathbb{C}"
      }
    });
  } catch (error) {
    console.error('LaTeX渲染错误:', error);
    return `<span class="latex-error" style="color: #cc0000;">${formula}</span>`;
  }
};

// 渲染Markdown语法
export const renderMarkdown = (content: string): string => {
  // 检查输入是否为undefined或null
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  let processed = content;
  
  // 处理标题 (支持1-6级标题)
  processed = processed.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
  processed = processed.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
  processed = processed.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
  processed = processed.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  processed = processed.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  processed = processed.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  
  // 处理粗体 **文本** (只处理双星号，避免与LaTeX冲突)
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // 处理斜体 *文本* (只处理单星号，避免与LaTeX冲突)
  processed = processed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // 处理删除线 ~~文本~~
  processed = processed.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  
  // 处理行内代码 `代码`
  processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // 处理代码块 ```代码块```
  processed = processed.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // 处理引用 > 文本
  processed = processed.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
  
  // 处理无序列表 - 项目
  processed = processed.replace(/^- (.*$)/gm, '<li>$1</li>');
  
  // 处理有序列表 1. 项目
  processed = processed.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
  
  // 将连续的li标签包装在ul中
  processed = processed.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  
  // 处理链接 [文本](链接)
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // 处理水平分割线 ---
  processed = processed.replace(/^---$/gm, '<hr>');
  
  return processed;
};

// 渲染LaTeX文本命令
export const renderLatexText = (content: string): string => {
  // 检查输入是否为undefined或null
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  let processed = content;
  
  // 处理 \item 命令
  processed = processed.replace(/\\item\s*/g, '• ');
  
  // 处理 \textbf{...} 命令
  processed = processed.replace(/\\textbf\{([^}]*)\}/g, '<strong>$1</strong>');
  
  // 处理 \textit{...} 命令
  processed = processed.replace(/\\textit\{([^}]*)\}/g, '<em>$1</em>');
  
  // 处理 \underline{...} 命令
  processed = processed.replace(/\\underline\{([^}]*)\}/g, '<u>$1</u>');
  
  return processed;
};

// 渲染包含LaTeX的Markdown内容
export const renderMarkdownWithLatex = (content: string): string => {
  // 检查输入是否为undefined或null
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  // 预处理LaTeX内容
  let processed = preprocessLatex(content);
  
  // 渲染块级公式 $$...$$ (先处理块级公式，避免与行内公式冲突)
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    return renderLatex(formula, true);
  });
  
  // 渲染行内公式 $...$ (后处理行内公式)
  processed = processed.replace(/\$([^\$]+?)\$/g, (match, formula) => {
    return renderLatex(formula, false);
  });
  
  // 渲染LaTeX文本命令
  processed = renderLatexText(processed);
  
  // 渲染Markdown语法
  processed = renderMarkdown(processed);
  
  return processed;
};
