import "@testing-library/jest-dom";

// jsdom's Blob lacks text(), which every browser has. FileReader decodes the
// same way: UTF-8, byte-order mark stripped, invalid bytes as U+FFFD.
Blob.prototype.text ??= function (this: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(this);
  });
};
