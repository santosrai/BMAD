import { PDBFormatter, ConversationFormatter, ImageFormatter, BatchFormatter } from '../../utils/exportFormats';

describe('Export Formats', () => {
  describe('PDBFormatter', () => {
    const mockPDBData = `HEADER    TRANSFERASE/DNA                         01-JUL-93   1ABC              
ATOM      1  N   MET A   1      20.154  16.977  40.316  1.00 20.00           N  
ATOM      2  CA  MET A   1      19.030  16.101  39.931  1.00 20.00           C  
ATOM      3  H   MET A   1      19.030  17.101  39.931  1.00 20.00           H  
HETATM    4  O   HOH A   2      15.100  10.200  25.500  1.00 30.00           O  
END`;

    it('should format PDB data with all options', () => {
      const formatted = PDBFormatter.format(mockPDBData, {
        includeSelections: true,
        includeModifications: true,
        includeWaterMolecules: true,
        includeHydrogens: true,
        includeMetadata: true
      });

      expect(formatted).toContain('REMARK   1 EXPORTED FROM BIOAI WORKSPACE');
      expect(formatted).toContain('ATOM');
      expect(formatted).toContain('HETATM');
      expect(formatted).toContain('H   MET');
      expect(formatted).toContain('HOH');
    });

    it('should remove water molecules when option is false', () => {
      const formatted = PDBFormatter.format(mockPDBData, {
        includeWaterMolecules: false,
        includeHydrogens: true,
        includeMetadata: false
      });

      expect(formatted).not.toContain('HOH');
      expect(formatted).toContain('ATOM');
      expect(formatted).toContain('H   MET');
    });

    it('should remove hydrogens when option is false', () => {
      const formatted = PDBFormatter.format(mockPDBData, {
        includeWaterMolecules: true,
        includeHydrogens: false,
        includeMetadata: false
      });

      expect(formatted).not.toContain('H   MET');
      expect(formatted).toContain('ATOM');
      expect(formatted).toContain('HOH');
    });

    it('should validate PDB format', () => {
      const result = PDBFormatter.validate(mockPDBData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid PDB format', () => {
      const invalidPDB = 'INVALID PDB DATA';
      const result = PDBFormatter.validate(invalidPDB);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('ConversationFormatter', () => {
    const mockMessages = [
      {
        id: '1',
        role: 'user',
        content: 'Hello, can you help me with protein analysis?',
        timestamp: 1234567890000,
        molecularContext: { pdbId: '1ABC', selection: 'chain A' }
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Of course! I can help you analyze protein structures.',
        timestamp: 1234567890001,
        molecularContext: { analysis: 'secondary structure' }
      },
      {
        id: '3',
        role: 'user',
        content: 'What about the binding site?',
        timestamp: 1234567890002
      }
    ];

    describe('JSON format', () => {
      it('should format conversation as JSON with all options', () => {
        const formatted = ConversationFormatter.formatAsJSON(mockMessages, {
          includeAIResponses: true,
          includeUserMessages: true,
          includeMolecularContext: true,
          includeTimestamps: true
        });

        const parsed = JSON.parse(formatted);
        expect(parsed).toHaveLength(3);
        expect(parsed[0]).toHaveProperty('role', 'user');
        expect(parsed[0]).toHaveProperty('timestamp');
        expect(parsed[0]).toHaveProperty('molecularContext');
        expect(parsed[1]).toHaveProperty('role', 'assistant');
      });

      it('should exclude AI responses when option is false', () => {
        const formatted = ConversationFormatter.formatAsJSON(mockMessages, {
          includeAIResponses: false,
          includeUserMessages: true,
          includeMolecularContext: true,
          includeTimestamps: true
        });

        const parsed = JSON.parse(formatted);
        expect(parsed).toHaveLength(2);
        expect(parsed.every((msg: any) => msg.role === 'user')).toBe(true);
      });

      it('should exclude user messages when option is false', () => {
        const formatted = ConversationFormatter.formatAsJSON(mockMessages, {
          includeAIResponses: true,
          includeUserMessages: false,
          includeMolecularContext: true,
          includeTimestamps: true
        });

        const parsed = JSON.parse(formatted);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].role).toBe('assistant');
      });
    });

    describe('CSV format', () => {
      it('should format conversation as CSV', () => {
        const formatted = ConversationFormatter.formatAsCSV(mockMessages, {
          includeAIResponses: true,
          includeUserMessages: true,
          includeMolecularContext: true,
          includeTimestamps: true
        });

        const lines = formatted.split('\n');
        expect(lines[0]).toContain('role,content,timestamp,molecularContext');
        expect(lines[1]).toContain('user');
        expect(lines[2]).toContain('assistant');
        expect(lines[3]).toContain('user');
      });

      it('should handle empty conversation', () => {
        const formatted = ConversationFormatter.formatAsCSV([], {
          includeAIResponses: true,
          includeUserMessages: true
        });

        expect(formatted).toBe('');
      });
    });

    describe('Text format', () => {
      it('should format conversation as plain text', () => {
        const formatted = ConversationFormatter.formatAsText(mockMessages, {
          includeAIResponses: true,
          includeUserMessages: true,
          includeMolecularContext: true,
          includeTimestamps: true
        });

        expect(formatted).toContain('USER: Hello, can you help me with protein analysis?');
        expect(formatted).toContain('ASSISTANT: Of course! I can help you analyze protein structures.');
        expect(formatted).toContain('Timestamp:');
        expect(formatted).toContain('Molecular Context:');
        expect(formatted).toContain('---');
      });
    });
  });

  describe('ImageFormatter', () => {
    let mockCanvas: HTMLCanvasElement;

    beforeEach(() => {
      mockCanvas = document.createElement('canvas');
      mockCanvas.width = 400;
      mockCanvas.height = 300;
      
      const ctx = mockCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 100, 100);
      }
    });

    it('should format canvas to blob', async () => {
      const blob = await ImageFormatter.formatCanvas(mockCanvas, {
        format: { name: 'PNG', extension: 'png', mimeType: 'image/png', description: 'PNG' },
        width: 400,
        height: 300,
        quality: 'high'
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle custom dimensions', async () => {
      const blob = await ImageFormatter.formatCanvas(mockCanvas, {
        format: { name: 'PNG', extension: 'png', mimeType: 'image/png', description: 'PNG' },
        width: 800,
        height: 600,
        quality: 'medium'
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle background color', async () => {
      const blob = await ImageFormatter.formatCanvas(mockCanvas, {
        format: { name: 'PNG', extension: 'png', mimeType: 'image/png', description: 'PNG' },
        backgroundColor: '#ffffff',
        transparent: false,
        quality: 'low'
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('BatchFormatter', () => {
    it('should create ZIP archive', async () => {
      const files = [
        { name: 'test.txt', content: 'Hello World' },
        { name: 'data.json', content: JSON.stringify({ test: true }) }
      ];

      const blob = await BatchFormatter.createZipArchive(files, {
        compression: 'fast',
        includeManifest: true
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/zip');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle binary files', async () => {
      const textBlob = new Blob(['test content'], { type: 'text/plain' });
      const files = [
        { name: 'text.txt', content: 'Hello World' },
        { name: 'binary.bin', content: textBlob }
      ];

      const blob = await BatchFormatter.createZipArchive(files, {
        compression: 'best',
        includeManifest: false
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should handle empty file list', async () => {
      const blob = await BatchFormatter.createZipArchive([], {
        compression: 'none',
        includeManifest: true
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });
  });
});