import { expect, it, describe } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Locale [TODO] Check', () => {
  const localesDir = path.resolve(__dirname, '../locales');
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.ts'));

  it.each(files)('should not contain [TODO] markers in %s', (file) => {
    const filePath = path.join(localesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Regular expression to find "[TODO]"
    const todoMatch = content.match(/\[TODO\]/);
    
    if (todoMatch) {
      // Find the line containing [TODO] for better error message
      const lines = content.split('\n');
      const todoLine = lines.find(line => line.includes('[TODO]'));
      expect(todoMatch, `File ${file} contains [TODO] marker: ${todoLine?.trim()}`).toBeNull();
    } else {
      expect(todoMatch).toBeNull();
    }
  });
});
