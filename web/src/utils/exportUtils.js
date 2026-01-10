/**
 * Export data to CSV
 */
export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values with commas, quotes, or newlines
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export data to Excel (CSV format with .xlsx extension)
 * Note: For true Excel format, you'd need a library like xlsx
 */
export const exportToExcel = (data, filename = 'export.xlsx') => {
  // For now, export as CSV with .xlsx extension
  // In production, use a library like 'xlsx' for proper Excel format
  exportToCSV(data, filename.replace('.xlsx', '.csv'));
};

/**
 * Format data for export (flatten nested objects)
 */
export const formatDataForExport = (data, fields) => {
  return data.map(item => {
    const formatted = {};
    fields.forEach(field => {
      if (typeof field === 'string') {
        formatted[field] = getNestedValue(item, field);
      } else if (typeof field === 'object') {
        // field = { key: 'displayName', path: 'nested.path' }
        formatted[field.key] = getNestedValue(item, field.path || field.key);
      }
    });
    return formatted;
  });
};

/**
 * Get nested value from object using dot notation
 */
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, prop) => {
    return current && current[prop] !== undefined ? current[prop] : '';
  }, obj);
};

