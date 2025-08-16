interface ParsedLatex {
  title: string;
  content: string;
  answer: string;
  analysis: string;
}

export const parseLatexContent = (latexContent: string): ParsedLatex => {
  const lines = latexContent.split('\n');
  let title = '';
  let content = '';
  let answer = '';
  let analysis = '';

  let currentSection = '';
  let isInMathBlock = false;
  let mathBlockContent = '';

  // 首先尝试识别明确的结构
  let hasExplicitStructure = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 跳过空行
    if (!line) continue;

    // 检测enumerate环境开始和结束
    if (line === '\\begin{enumerate}') {
      // 跳过\begin{enumerate}，不添加到任何部分
      continue;
    }
    if (line === '\\end{enumerate}') {
      // 停止解析，不将\end{enumerate}添加到任何部分
      break;
    }

    // 检测题目开始
    if (line.startsWith('\\item')) {
      hasExplicitStructure = true;
      currentSection = 'content';
      content = line.replace('\\item', '').trim();
      continue;
    }

    // 检测答案部分
    if (line.includes('\\textbf{答案：}') || line.includes('\\textbf{答案:}') || 
        line.includes('**答案：**') || line.includes('**答案:**')) {
      hasExplicitStructure = true;
      currentSection = 'answer';
      answer = line.replace(/\\textbf\{答案[：:]\}|\\*\\*答案[：:]\*\\*/, '').trim();
      continue;
    }

    // 检测解析部分
    if (line.includes('\\textbf{解析：}') || line.includes('\\textbf{解析:}') ||
        line.includes('**解析：**') || line.includes('**解析:**')) {
      hasExplicitStructure = true;
      currentSection = 'analysis';
      analysis = line.replace(/\\textbf\{解析[：:]\}|\\*\\*解析[：:]\*\\*/, '').trim();
      continue;
    }

    // 检测数学公式块开始
    if (line.startsWith('\\[')) {
      isInMathBlock = true;
      mathBlockContent = line.replace('\\[', '$$').replace('\\]', '$$');
      continue;
    }

    // 检测数学公式块结束
    if (line.includes('\\]') && isInMathBlock) {
      isInMathBlock = false;
      mathBlockContent += '\n' + line.replace('\\]', '$$');
      
      // 将完整的数学公式块添加到当前部分
      switch (currentSection) {
        case 'content':
          content += '\n' + mathBlockContent;
          break;
        case 'answer':
          answer += '\n' + mathBlockContent;
          break;
        case 'analysis':
          analysis += '\n' + mathBlockContent;
          break;
        default:
          // 如果没有明确的部分，添加到内容中
          content += '\n' + mathBlockContent;
      }
      mathBlockContent = '';
      continue;
    }

    // 如果在数学公式块内，累积内容
    if (isInMathBlock) {
      mathBlockContent += '\n' + line;
      continue;
    }

    // 处理当前行的内容
    switch (currentSection) {
      case 'content':
        content += (content ? '\n' : '') + line;
        break;
      case 'answer':
        answer += (answer ? '\n' : '') + line;
        break;
      case 'analysis':
        analysis += (analysis ? '\n' : '') + line;
        break;
      default:
        // 如果没有明确的部分，添加到内容中
        content += (content ? '\n' : '') + line;
    }
  }

  // 清理内容
  const cleanContent = (text: string) => {
    return text
      .replace(/^\s+|\s+$/g, '') // 去除首尾空白
      .replace(/\n\s*\n/g, '\n') // 去除多余空行
      .trim();
  };

  // 如果没有明确的结构，将全部内容作为题目内容
  if (!hasExplicitStructure) {
    return {
      title: '',
      content: cleanContent(latexContent),
      answer: '',
      analysis: ''
    };
  }

  return {
    title: cleanContent(title),
    content: cleanContent(content),
    answer: cleanContent(answer),
    analysis: cleanContent(analysis)
  };
};

// 示例LaTeX内容
export const getLatexExample = (): string => {
  return `\\item 解方程：$2x^2 - 5x + 3 = 0$

\\textbf{答案：} $x = 1$ 或 $x = \\dfrac{3}{2}$

\\textbf{解析：} 使用求根公式：
\\[
x = \\frac{5 \\pm \\sqrt{(-5)^2 - 4 \\times 2 \\times 3}}{2 \\times 2} = \\frac{5 \\pm 1}{4}
\\]
所以得到两个解：$x = \\frac{6}{4} = \\dfrac{3}{2}$ 和 $x = \\frac{4}{4} = 1$。`;
};

// 高斯积分示例（复杂内容）
export const getGaussianIntegralExample = (): string => {
  return `这个公式是著名的**高斯积分（Gaussian Integral）**，也称为**泊松积分（Poisson Integral）**。具体表达式为：

\\[
\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
\\]

### 公式说明：
1. **被积函数**：\\( e^{-x^2} \\) 是一个高斯函数（正态分布的核心部分），在实数范围内快速衰减。
2. **积分范围**：从负无穷到正无穷，表示对整个实数域的积分。
3. **积分结果**：收敛到 \\( \\sqrt{\\pi} \\)。

### 证明方法：
该积分的证明有多种方式，常见的方法包括：
- **极坐标变换法**（最经典）：
  考虑平方后的积分 \\( I^2 = \\left( \\int_{-\\infty}^{\\infty} e^{-x^2} dx \\right)^2 \\)，通过转换为二重积分并利用极坐标（\\( x^2 + y^2 = r^2 \\)）求解：
  \\[
  I^2 = \\int_{-\\infty}^{\\infty} \\int_{-\\infty}^{\\infty} e^{-(x^2 + y^2)} dx dy = \\int_{0}^{2\\pi} \\int_{0}^{\\infty} e^{-r^2} r dr d\\theta = \\pi
  \\]
  因此 \\( I = \\sqrt{\\pi} \\)。

- **复变函数法**：利用围道积分和解析函数的性质。
- **概率学方法**：通过正态分布的归一化性质推导。

### 应用领域：
- **概率论与统计学**：正态分布的归一化常数。
- **物理学**：量子力学、热力学中的波函数和分布函数。
- **工程学**：信号处理中的高斯滤波。

### 推广形式：
高斯积分可以推广到更一般的形式（含线性项或高维情况），例如：
\\[
\\int_{-\\infty}^{\\infty} e^{-ax^2 + bx + c} dx = \\sqrt{\\frac{\\pi}{a}} e^{\\frac{b^2}{4a} + c} \\quad (a > 0)
\\]

这个公式因其简洁性和广泛的应用，成为数学和科学中最基础的积分结果之一。`;
};
