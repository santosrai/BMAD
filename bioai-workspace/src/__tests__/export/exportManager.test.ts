import { ExportManager } from '../../services/exportManager';
import { EXPORT_FORMATS } from '../../types/export';

describe('ExportManager', () => {
  let exportManager: ExportManager;

  beforeEach(() => {
    exportManager = new ExportManager();
  });

  describe('PDB Export', () => {
    it('should export PDB data successfully', async () => {
      const mockPDBData = `HEADER    TRANSFERASE/DNA                         01-JUL-93   1ABC              
ATOM      1  N   MET A   1      20.154  16.977  40.316  1.00 20.00           N  
ATOM      2  CA  MET A   1      19.030  16.101  39.931  1.00 20.00           C  
END`;

      const result = await exportManager.exportPDB(mockPDBData, {
        format: EXPORT_FORMATS.PDB,
        includeMetadata: true,
        includeSelections: true
      });

      expect(result.success).toBe(true);
      expect(result.filename).toContain('.pdb');
      expect(result.fileSize).toBeGreaterThan(0);
    });

    it('should handle invalid PDB data', async () => {
      const invalidPDBData = 'invalid pdb data';

      const result = await exportManager.exportPDB(invalidPDBData, {
        format: EXPORT_FORMATS.PDB,
        includeMetadata: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Image Export', () => {
    it('should export canvas as image', async () => {
      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 800;
      mockCanvas.height = 600;
      
      const ctx = mockCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 100, 100);
      }

      const result = await exportManager.exportImage(mockCanvas, {
        format: EXPORT_FORMATS.PNG,
        quality: 'high',
        width: 800,
        height: 600
      });

      expect(result.success).toBe(true);
      expect(result.filename).toContain('.png');
      expect(result.fileSize).toBeGreaterThan(0);
    });

    it('should handle invalid canvas', async () => {
      const invalidCanvas = {} as HTMLCanvasElement;

      const result = await exportManager.exportImage(invalidCanvas, {
        format: EXPORT_FORMATS.PNG,
        quality: 'medium'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Conversation Export', () => {
    const mockConversation = [
      {
        id: '1',
        role: 'user',
        content: 'Hello, can you help me with protein analysis?',
        timestamp: Date.now()
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Of course! I can help you analyze protein structures.',
        timestamp: Date.now()
      }
    ];

    it('should export conversation as JSON', async () => {
      const result = await exportManager.exportConversation(mockConversation, {
        format: EXPORT_FORMATS.JSON,
        includeAIResponses: true,
        includeUserMessages: true,
        includeTimestamps: true
      });

      expect(result.success).toBe(true);
      expect(result.filename).toContain('.json');
      expect(result.fileSize).toBeGreaterThan(0);
    });

    it('should export conversation as CSV', async () => {
      const result = await exportManager.exportConversation(mockConversation, {
        format: EXPORT_FORMATS.CSV,
        includeAIResponses: true,
        includeUserMessages: true,
        includeTimestamps: true
      });

      expect(result.success).toBe(true);
      expect(result.filename).toContain('.csv');
      expect(result.fileSize).toBeGreaterThan(0);
    });

    it('should handle empty conversation', async () => {
      const result = await exportManager.exportConversation([], {
        format: EXPORT_FORMATS.JSON,
        includeAIResponses: true,
        includeUserMessages: true
      });

      expect(result.success).toBe(true);
      expect(result.fileSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Batch Export', () => {
    it('should create batch export with multiple files', async () => {
      const batchOptions = {
        jobs: [
          {
            type: 'pdb' as const,
            options: {
              format: EXPORT_FORMATS.PDB,
              includeMetadata: true
            },
            filename: 'structure.pdb'
          },
          {
            type: 'conversation' as const,
            options: {
              format: EXPORT_FORMATS.JSON,
              includeTimestamps: true
            },
            filename: 'conversation.json'
          }
        ],
        archiveFormat: 'zip' as const,
        archiveName: 'batch_export.zip'
      };

      const result = await exportManager.exportBatch(batchOptions);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('batch_export.zip');
      expect(result.fileSize).toBeGreaterThan(0);
    });
  });

  describe('Job Management', () => {
    it('should track active jobs', async () => {
      const mockPDBData = 'HEADER TEST\nEND';
      
      const exportPromise = exportManager.exportPDB(mockPDBData, {
        format: EXPORT_FORMATS.PDB,
        includeMetadata: true
      });

      const activeJobs = await exportManager.getActiveJobs();
      expect(activeJobs.length).toBeGreaterThan(0);

      await exportPromise;
    });

    it('should cancel pending jobs', async () => {
      const mockPDBData = 'HEADER TEST\nEND';
      
      const exportPromise = exportManager.exportPDB(mockPDBData, {
        format: EXPORT_FORMATS.PDB,
        includeMetadata: true
      });

      const activeJobs = await exportManager.getActiveJobs();
      const jobId = activeJobs[0]?.id;

      if (jobId) {
        const cancelled = await exportManager.cancelJob(jobId);
        expect(cancelled).toBe(true);
      }

      await exportPromise;
    });
  });

  describe('File Download', () => {
    it('should trigger file download', () => {
      const mockCreateElement = jest.spyOn(document, 'createElement');
      const mockAppendChild = jest.spyOn(document.body, 'appendChild');
      const mockRemoveChild = jest.spyOn(document.body, 'removeChild');
      const mockClick = jest.fn();

      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick
      } as any;

      mockCreateElement.mockReturnValue(mockAnchor);
      mockAppendChild.mockImplementation(() => mockAnchor);
      mockRemoveChild.mockImplementation(() => mockAnchor);

      const testUrl = 'blob:test-url';
      const testFilename = 'test.pdb';

      exportManager.downloadFile(testUrl, testFilename);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.href).toBe(testUrl);
      expect(mockAnchor.download).toBe(testFilename);
      expect(mockClick).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalledWith(mockAnchor);
      expect(mockRemoveChild).toHaveBeenCalledWith(mockAnchor);

      mockCreateElement.mockRestore();
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
    });
  });

  describe('Job Cleanup', () => {
    it('should cleanup job resources', async () => {
      const mockPDBData = 'HEADER TEST\nEND';
      
      const result = await exportManager.exportPDB(mockPDBData, {
        format: EXPORT_FORMATS.PDB,
        includeMetadata: true
      });

      if (result.success) {
        const jobsBefore = await exportManager.getActiveJobs();
        const jobId = jobsBefore.find(job => job.filename === result.filename)?.id;

        if (jobId) {
          exportManager.cleanupJob(jobId);
          const jobsAfter = await exportManager.getActiveJobs();
          expect(jobsAfter.length).toBeLessThan(jobsBefore.length);
        }
      }
    });
  });
});