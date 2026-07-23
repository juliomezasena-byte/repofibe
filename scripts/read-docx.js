import fs from 'fs';
import path from 'path';

// Parse basic zip file structures natively in Node
const docxBuffer = fs.readFileSync(path.resolve('COMANDOS DE AMADEUS.docx'));
const str = docxBuffer.toString('latin1');

// Locate document.xml text content
const xmlStart = str.indexOf('<w:document');
const xmlEnd = str.indexOf('</w:document>');

if (xmlStart !== -1 && xmlEnd !== -1) {
  const xml = str.slice(xmlStart, xmlEnd + 13);
  const textMatches = xml.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
  const extractedText = textMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
  console.log('--- TEXTO EXTRAÍDO DE COMANDOS DE AMADEUS.docx ---');
  console.log(extractedText);
} else {
  console.log('No xml tag found directly, raw text snippets:');
  const cleanStr = str.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
  console.log(cleanStr.slice(0, 2000));
}
