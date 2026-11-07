/**
 * Loaded lazily by QrService. Importing the CommonJS `qrcode` package dynamically made the production build emit
 * a chunk with no exports (toDataURL was undefined); re-exporting it from our own ES module keeps the export.
 */
export { toDataURL } from 'qrcode';
