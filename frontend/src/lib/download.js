/**
 * Download utilities for invitation images
 */
import { jsPDF } from 'jspdf';

/**
 * Download canvas as PNG
 * @param {HTMLCanvasElement} canvas - Canvas element to download
 * @param {string} filename - Output filename
 */
export function downloadPNG(canvas, filename = 'invitation.png') {
  const dataURL = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download canvas as PDF
 * @param {HTMLCanvasElement} canvas - Canvas element to download
 * @param {string} filename - Output filename
 */
export function downloadPDF(canvas, filename = 'invitation.pdf') {
  // Get canvas dimensions
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Convert pixels to mm (assuming 96 DPI)
  const mmWidth = (imgWidth * 25.4) / 96;
  const mmHeight = (imgHeight * 25.4) / 96;

  // Create PDF with custom dimensions matching the canvas
  const pdf = new jsPDF({
    orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [mmWidth, mmHeight],
    compress: true
  });

  // Convert canvas to high-quality image
  const imgData = canvas.toDataURL('image/jpeg', 1.0);

  // Add image to PDF at full size
  pdf.addImage(imgData, 'JPEG', 0, 0, mmWidth, mmHeight, undefined, 'FAST');

  // Save the PDF
  pdf.save(filename);
}
