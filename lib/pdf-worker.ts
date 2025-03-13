"use client";

import { pdfjs } from 'react-pdf';

// Set worker path
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export default function setupPdfWorker() {
  // This function is just a placeholder to ensure the worker is initialized
  return null;
}