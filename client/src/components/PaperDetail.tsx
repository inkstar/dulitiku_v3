import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { paperApi } from '../services/api';
import { PaperDetail as PaperDetailType } from '../types';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, HeadingLevel, TextRun, ImageRun } from 'docx';
import html2pdf from 'html2pdf.js';
import { renderMarkdownWithLatex } from '../utils/latexRenderer';
import html2canvas from 'html2canvas';

const PaperDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [paper, setPaper] = useState<PaperDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      try {
        const res = await paperApi.getById(id);
        setPaper(res.data as PaperDetailType);
      } catch (e) {
        console.error('获取试卷失败', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!paper) return;
    if (format === 'pdf') {
      const element = contentRef.current;
      if (!element) return;
      const opt = {
        margin: 10,
        filename: `${paper.title || '试卷'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      } as any;
      await html2pdf().set(opt).from(element).save();
      return;
    }

    // DOCX 导出（截图嵌入，保留LaTeX渲染效果）
    const element = contentRef.current;
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const dataUrl = canvas.toDataURL('image/png');
    const byteString = atob(dataUrl.split(',')[1]);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i);
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new ImageRun({
                  data: bytes,
                  transformation: {
                    width: Math.floor(canvas.width / 2),
                    height: Math.floor(canvas.height / 2),
                  },
                }),
              ],
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${paper.title || '试卷'}.docx`);
  };

  if (loading) {
    return <div className="text-gray-600">加载中...</div>;
  }

  if (!paper) {
    return <div className="text-red-600">未找到试卷或请求失败（请检查服务器是否运行，或该试卷是否存在）</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6" ref={contentRef}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{paper.title}</h2>
          {paper.description && (
            <p className="text-gray-600 mt-1">{paper.description}</p>
          )}
        </div>
        <div className="space-x-3">
          <button onClick={() => handleExport('pdf')} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">导出 PDF</button>
          <button onClick={() => handleExport('docx')} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">导出 DOCX</button>
        </div>
      </div>

      {/* 试卷排版（预览区） */}
      <div className="prose max-w-none">
        <div className="text-center mb-6">
          <div className="text-xl font-bold">{paper.title}</div>
          {paper.description && <div className="text-gray-600 mt-1">{paper.description}</div>}
        </div>
        {paper.questions?.map((q, idx) => (
          <div key={q.id} className="mb-6 break-inside-avoid">
            <div className="font-semibold mb-2">{idx + 1}. {q.title || ''}</div>
            <div className="mb-2" dangerouslySetInnerHTML={{ __html: renderMarkdownWithLatex(q.content || '') }} />
            {q.answer && (
              <div className="mt-2 p-3 bg-gray-50 rounded">
                <div className="font-medium mb-1">答案：</div>
                <div dangerouslySetInnerHTML={{ __html: renderMarkdownWithLatex(q.answer || '') }} />
              </div>
            )}
            {q.analysis && (
              <div className="mt-2 p-3 bg-gray-50 rounded">
                <div className="font-medium mb-1">解析：</div>
                <div dangerouslySetInnerHTML={{ __html: renderMarkdownWithLatex(q.analysis || '') }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaperDetail;


