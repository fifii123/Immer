

// Make sure to load PDF.js worker
import pdfjs from './pdfjs-setup';

/**
 * Extracts text from a PDF document
 * @param {string} pdfUrl - URL to the PDF file
 * @param {number} maxPages - Maximum number of pages to extract (optional)
 * @returns {Promise<string>} - The extracted text
 */
export async function extractTextFromPdf(pdfUrl, maxPages = Infinity) {
  if (!pdfUrl) {
    throw new Error('No PDF URL provided');
  }

  try {
    // Load the PDF document
    const loadingTask = pdfjs.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    
    // Determine how many pages to extract
    const pageCount = pdf.numPages;
    const pagesToExtract = Math.min(pageCount, maxPages);
    let extractedText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pagesToExtract; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Join text elements
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      extractedText += pageText + '\n\n';
    }
    
    return extractedText;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Gets the total number of pages in a PDF
 * @param {string} pdfUrl - URL to the PDF file
 * @returns {Promise<number>} - The total number of pages
 */
export async function getPdfPageCount(pdfUrl) {
  if (!pdfUrl) {
    throw new Error('No PDF URL provided');
  }

  try {
    const loadingTask = pdfjs.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    return pdf.numPages;
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    throw new Error(`Failed to get PDF page count: ${error.message}`);
  }
}

/**
 * Get the text of a specific page in a PDF
 * @param {string} pdfUrl - URL to the PDF file
 * @param {number} pageNumber - The page number to extract (1-based)
 * @returns {Promise<string>} - The page text
 */
export async function getPageText(pdfUrl, pageNumber) {
  if (!pdfUrl) {
    throw new Error('No PDF URL provided');
  }

  try {
    const loadingTask = pdfjs.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new Error(`Page number out of range: ${pageNumber}`);
    }
    
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    
    // Join text elements
    return textContent.items
      .map(item => item.str)
      .join(' ');
  } catch (error) {
    console.error('Error getting page text:', error);
    throw new Error(`Failed to get text from page ${pageNumber}: ${error.message}`);
  }
}

/**
 * Find the approximate page containing specific text
 * @param {string} pdfUrl - URL to the PDF file
 * @param {string} searchText - Text to search for
 * @returns {Promise<number|null>} - Page number or null if not found
 */
export async function findPageWithText(pdfUrl, searchText) {
  if (!pdfUrl || !searchText) {
    throw new Error('PDF URL and search text required');
  }

  try {
    const loadingTask = pdfjs.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    
    // Look through each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const pageText = await getPageText(pdfUrl, i);
      if (pageText.includes(searchText)) {
        return i;
      }
    }
    
    // Text not found
    return null;
  } catch (error) {
    console.error('Error searching PDF:', error);
    throw new Error(`Failed to search PDF: ${error.message}`);
  }
}