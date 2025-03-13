"use client";

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
// Ustaw worker dla PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  pdfUrl: string;
  currentPage: number;
  onDocumentLoadSuccess: (data: { numPages: number }) => void;
}


const PDFViewer: React.FC<PDFViewerProps> = ({ 
  pdfUrl, 
  currentPage,
  onDocumentLoadSuccess
}) => {
  const [scale, setScale] = useState<number>(1.0);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex space-x-2">
        <button 
          onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
          className="px-3 py-1 bg-gray-200 rounded"
        >
          -
        </button>
        <span>{Math.round(scale * 100)}%</span>
        <button 
          onClick={() => setScale(prev => Math.min(2, prev + 0.1))}
          className="px-3 py-1 bg-gray-200 rounded"
        >
          +
        </button>
      </div>

      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={<div className="flex justify-center p-10">Ładowanie PDF...</div>}
        error={<div className="text-red-500 p-10">Nie można załadować dokumentu. Sprawdź, czy format pliku jest prawidłowy.</div>}
        options={{
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/cmaps/',
          cMapPacked: true,
        }}
      >
        <Page 
          scale={scale}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className="shadow-lg"
        />
      </Document>
    </div>
  );
};

export default PDFViewer;