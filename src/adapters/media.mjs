/**
 * @typedef {import('../core/index.mjs').Adapter} Adapter
 */

import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * EXIF adapter for extracting and writing image metadata
 * Uses exifr library for comprehensive EXIF data handling
 */
const exifAdapter = {
  async parse(input, opts = {}) {
    try {
      const exifr = await import('exifr');

      // Handle different input types
      let buffer;
      if (Buffer.isBuffer(input)) {
        buffer = input;
      } else if (typeof input === 'string') {
        // Assume it's a file path
        const fs = await import('node:fs/promises');
        buffer = await fs.readFile(input);
      } else {
        throw new TypeError('EXIF input must be a Buffer or file path string');
      }

      const options = {
        pick: [
          'Make',
          'Model',
          'Software',
          'DateTime',
          'DateTimeOriginal',
          'DateTimeDigitized',
          'ExposureTime',
          'FNumber',
          'ISO',
          'FocalLength',
          'Flash',
          'WhiteBalance',
          'GPSLatitude',
          'GPSLongitude',
          'GPSAltitude',
          'GPSLatitudeRef',
          'GPSLongitudeRef',
          'ImageWidth',
          'ImageHeight',
          'Orientation',
          'ColorSpace',
          'XResolution',
          'YResolution',
          'Artist',
          'Copyright',
          'ImageDescription',
          'UserComment',
        ],
        translateKeys: true,
        translateValues: true,
        reviveValues: true,
        sanitize: true,
        ...opts,
      };

      const exifData = await exifr.parse(buffer, options);

      if (!exifData) {
        return {
          data: {},
          metadata: {
            format: 'exif',
            hasExifData: false,
            message: 'No EXIF data found in image',
            ...opts,
          },
        };
      }

      // Normalize the data structure
      const normalizedData = {
        camera: {
          make: exifData.make || undefined,
          model: exifData.model || undefined,
          software: exifData.software || undefined,
        },
        capture: {
          dateTime:
            exifData.dateTime ||
            exifData.dateTimeOriginal ||
            exifData.dateTimeDigitized ||
            undefined,
          exposureTime: exifData.exposureTime || undefined,
          fNumber: exifData.fNumber || undefined,
          iso: exifData.iso || undefined,
          focalLength: exifData.focalLength || undefined,
          flash: exifData.flash || undefined,
          whiteBalance: exifData.whiteBalance || undefined,
        },
        image: {
          width: exifData.imageWidth || undefined,
          height: exifData.imageHeight || undefined,
          orientation: exifData.orientation || undefined,
          colorSpace: exifData.colorSpace || undefined,
          xResolution: exifData.xResolution || undefined,
          yResolution: exifData.yResolution || undefined,
        },
        gps:
          exifData.gpsLatitude && exifData.gpsLongitude
            ? {
                latitude: exifData.gpsLatitude,
                longitude: exifData.gpsLongitude,
                altitude: exifData.gpsAltitude || undefined,
                latitudeRef: exifData.gpsLatitudeRef || undefined,
                longitudeRef: exifData.gpsLongitudeRef || undefined,
              }
            : undefined,
        metadata: {
          artist: exifData.artist || undefined,
          copyright: exifData.copyright || undefined,
          description: exifData.imageDescription || undefined,
          userComment: exifData.userComment || undefined,
        },
      };

      return {
        data: normalizedData,
        metadata: {
          format: 'exif',
          hasExifData: true,
          dataFields: Object.keys(exifData).length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('EXIF support requires additional dependencies (exifr)');
      }
      throw new Error(`EXIF parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      const exifr = await import('exifr');

      // IMPORTANT: This adapter is READ-ONLY
      // The exifr library only supports reading EXIF data, not writing
      // For writing EXIF data to images, consider using:
      // - piexifjs: https://github.com/hMatoba/piexifjs (browser & Node.js)
      // - exif-writer: https://github.com/mattburns/exif-writer (Node.js)
      // - sharp: https://sharp.pixelplumbing.com/ (includes EXIF manipulation)

      const exifStructure = {
        // Camera information
        Make: data.camera?.make || undefined,
        Model: data.camera?.model || undefined,
        Software: data.camera?.software || undefined,

        // Capture settings
        DateTime: data.capture?.dateTime || undefined,
        DateTimeOriginal: data.capture?.dateTimeOriginal || data.capture?.dateTime || undefined,
        DateTimeDigitized: data.capture?.dateTimeDigitized || data.capture?.dateTime || undefined,
        ExposureTime: data.capture?.exposureTime || undefined,
        FNumber: data.capture?.fNumber || undefined,
        ISO: data.capture?.iso || undefined,
        FocalLength: data.capture?.focalLength || undefined,
        Flash: data.capture?.flash || undefined,
        WhiteBalance: data.capture?.whiteBalance || undefined,

        // Image properties
        ImageWidth: data.image?.width || undefined,
        ImageHeight: data.image?.height || undefined,
        Orientation: data.image?.orientation || undefined,
        ColorSpace: data.image?.colorSpace || undefined,
        XResolution: data.image?.xResolution || undefined,
        YResolution: data.image?.yResolution || undefined,

        // GPS data
        GPSLatitude: data.gps?.latitude || undefined,
        GPSLongitude: data.gps?.longitude || undefined,
        GPSAltitude: data.gps?.altitude || undefined,
        GPSLatitudeRef: data.gps?.latitudeRef || undefined,
        GPSLongitudeRef: data.gps?.longitudeRef || undefined,

        // Metadata
        Artist: data.metadata?.artist || undefined,
        Copyright: data.metadata?.copyright || undefined,
        ImageDescription: data.metadata?.description || undefined,
        UserComment: data.metadata?.userComment || undefined,
      };

      // Remove undefined values
      const cleanStructure = Object.fromEntries(
        Object.entries(exifStructure).filter(([, value]) => value !== undefined)
      );

      return {
        data: cleanStructure,
        metadata: {
          format: 'exif',
          fields: Object.keys(cleanStructure).length,
          readOnly: true,
          note: 'EXIF adapter is read-only. Data structure prepared for external writing tools.',
          writingLibraries: {
            piexifjs: 'https://github.com/hMatoba/piexifjs',
            'exif-writer': 'https://github.com/mattburns/exif-writer',
            sharp: 'https://sharp.pixelplumbing.com/',
          },
          usage: 'Use the prepared data structure with a specialized EXIF writing library',
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('EXIF support requires additional dependencies (exifr)');
      }
      throw new Error(`EXIF formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * ID3 adapter for reading and writing MP3 metadata tags
 * Uses node-id3 library for comprehensive ID3 tag handling
 */
const id3Adapter = {
  async parse(input, opts = {}) {
    try {
      const ID3 = await import('node-id3');

      // Handle different input types
      let buffer;
      if (Buffer.isBuffer(input)) {
        buffer = input;
      } else if (typeof input === 'string') {
        // Assume it's a file path
        const fs = await import('node:fs/promises');
        buffer = await fs.readFile(input);
      } else {
        throw new TypeError('ID3 input must be a Buffer or file path string');
      }

      const options = {
        include: [
          'title',
          'artist',
          'album',
          'year',
          'genre',
          'track',
          'TIT2',
          'TPE1',
          'TALB',
          'TYER',
          'TCON',
          'TRCK',
          'TPE2',
          'TPOS',
          'TDRC',
          'TDRL',
          'TDTG',
          'TENC',
          'TEXT',
          'TFLT',
          'TIME',
          'TIT1',
          'TIT3',
          'TKEY',
          'TLAN',
          'TLEN',
          'TMED',
          'TOAL',
          'TOFN',
          'TOLY',
          'TOPE',
          'TORY',
          'TOWN',
          'TPE3',
          'TPE4',
          'TPUB',
          'TRDA',
          'TRSN',
          'TRSO',
          'TSIZ',
          'TSRC',
          'TSSE',
          'TXXX',
          'WXXX',
          'APIC',
          'USLT',
          'COMM',
        ],
        ...opts,
      };

      const id3Data = ID3.read(buffer, options);

      if (!id3Data) {
        return {
          data: {},
          metadata: {
            format: 'id3',
            hasId3Data: false,
            message: 'No ID3 data found in audio file',
            ...opts,
          },
        };
      }

      // Normalize the data structure
      const normalizedData = {
        basic: {
          title: id3Data.title || undefined,
          artist: id3Data.artist || undefined,
          album: id3Data.album || undefined,
          year: id3Data.year || undefined,
          genre: id3Data.genre || undefined,
          track: id3Data.track || undefined,
        },
        extended: {
          albumArtist: id3Data.albumArtist || id3Data.TPE2 || undefined,
          discNumber: id3Data.TPOS || undefined,
          recordingTime: id3Data.TDRC || id3Data.TDRL || id3Data.TDTG || undefined,
          encoder: id3Data.TENC || undefined,
          lyrics: id3Data.TEXT || undefined,
          fileType: id3Data.TFLT || undefined,
          time: id3Data.TIME || undefined,
          contentGroup: id3Data.TIT1 || undefined,
          subtitle: id3Data.TIT3 || undefined,
          initialKey: id3Data.TKEY || undefined,
          language: id3Data.TLAN || undefined,
          length: id3Data.TLEN || undefined,
          mediaType: id3Data.TMED || undefined,
          originalAlbum: id3Data.TOAL || undefined,
          originalFilename: id3Data.TOFN || undefined,
          originalLyricist: id3Data.TOLY || undefined,
          originalArtist: id3Data.TOPE || undefined,
          originalReleaseYear: id3Data.TORY || undefined,
          fileOwner: id3Data.TOWN || undefined,
          conductor: id3Data.TPE3 || undefined,
          interpretedBy: id3Data.TPE4 || undefined,
          publisher: id3Data.TPUB || undefined,
          recordingDates: id3Data.TRDA || undefined,
          internetRadioStationName: id3Data.TRSN || undefined,
          internetRadioOwner: id3Data.TRSO || undefined,
          size: id3Data.TSIZ || undefined,
          isrc: id3Data.TSRC || undefined,
          softwareHardwareSettings: id3Data.TSSE || undefined,
        },
        custom: id3Data.TXXX || undefined,
        url: id3Data.WXXX || undefined,
        images: id3Data.image || id3Data.APIC || undefined,
        lyrics: id3Data.USLT || undefined,
        comments: id3Data.COMM || undefined,
      };

      return {
        data: normalizedData,
        metadata: {
          format: 'id3',
          hasId3Data: true,
          version: id3Data.version !== undefined ? id3Data.version : undefined,
          dataFields: Object.keys(id3Data).length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('ID3 support requires additional dependencies (node-id3)');
      }
      throw new Error(`ID3 parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      const ID3 = await import('node-id3');

      // Prepare ID3 tag structure
      const id3Tags = {
        // Basic tags
        title: data.basic?.title || data.title || undefined,
        artist: data.basic?.artist || data.artist || undefined,
        album: data.basic?.album || data.album || undefined,
        year: data.basic?.year || data.year || undefined,
        genre: data.basic?.genre || data.genre || undefined,
        track: data.basic?.track || data.track || undefined,

        // Extended tags
        albumArtist: data.extended?.albumArtist || undefined,
        TPE2: data.extended?.albumArtist || undefined,
        TPOS: data.extended?.discNumber || undefined,
        TDRC: data.extended?.recordingTime || undefined,
        TENC: data.extended?.encoder || undefined,
        TEXT: data.extended?.lyrics || undefined,
        TFLT: data.extended?.fileType || undefined,
        TIME: data.extended?.time || undefined,
        TIT1: data.extended?.contentGroup || undefined,
        TIT3: data.extended?.subtitle || undefined,
        TKEY: data.extended?.initialKey || undefined,
        TLAN: data.extended?.language || undefined,
        TLEN: data.extended?.length || undefined,
        TMED: data.extended?.mediaType || undefined,
        TOAL: data.extended?.originalAlbum || undefined,
        TOFN: data.extended?.originalFilename || undefined,
        TOLY: data.extended?.originalLyricist || undefined,
        TOPE: data.extended?.originalArtist || undefined,
        TORY: data.extended?.originalReleaseYear || undefined,
        TOWN: data.extended?.fileOwner || undefined,
        TPE3: data.extended?.conductor || undefined,
        TPE4: data.extended?.interpretedBy || undefined,
        TPUB: data.extended?.publisher || undefined,
        TRDA: data.extended?.recordingDates || undefined,
        TRSN: data.extended?.internetRadioStationName || undefined,
        TRSO: data.extended?.internetRadioOwner || undefined,
        TSIZ: data.extended?.size || undefined,
        TSRC: data.extended?.isrc || undefined,
        TSSE: data.extended?.softwareHardwareSettings || undefined,

        // Custom tags
        TXXX: data.custom || undefined,
        WXXX: data.url || undefined,
        image: data.images || undefined,
        APIC: data.images || undefined,
        USLT: data.lyrics || undefined,
        COMM: data.comments || undefined,
      };

      // Remove undefined values
      const cleanTags = Object.fromEntries(
        Object.entries(id3Tags).filter(([, value]) => value !== undefined)
      );

      // Create ID3 buffer
      const id3Buffer = ID3.write(cleanTags);

      return {
        data: id3Buffer,
        metadata: {
          format: 'id3',
          tags: Object.keys(cleanTags).length,
          bufferSize: id3Buffer.length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('ID3 support requires additional dependencies (node-id3)');
      }
      throw new Error(`ID3 formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * PDF Text adapter for extracting text content from PDF documents
 * Uses pdf-parse library for comprehensive PDF text extraction
 */
const pdfTextAdapter = {
  async parse(input, opts = {}) {
    try {
      const pdfParse = await import('pdf-parse');

      // Handle different input types
      let buffer;
      if (Buffer.isBuffer(input)) {
        buffer = input;
      } else if (typeof input === 'string') {
        // Assume it's a file path
        const fs = await import('node:fs/promises');
        buffer = await fs.readFile(input);
      } else {
        throw new TypeError('PDF input must be a Buffer or file path string');
      }

      const options = {
        // Text extraction options
        max: 0, // No page limit
        version: 'v1.10.100', // PDF.js version
        ...opts,
      };

      const pdfData = await pdfParse.default(buffer, options);

      if (!pdfData || !pdfData.text) {
        return {
          data: {
            text: '',
            pages: [],
            metadata: {},
          },
          metadata: {
            format: 'pdf-text',
            hasText: false,
            message: 'No text content found in PDF',
            ...opts,
          },
        };
      }

      // Split text into pages (approximate based on page breaks)
      const pages = [];
      const textLines = pdfData.text.split('\n');
      let currentPage = { pageNumber: 1, text: '', lineCount: 0 };
      const linesPerPage = Math.max(
        1,
        Math.floor(textLines.length / Math.max(1, pdfData.numpages || 1))
      );

      for (let i = 0; i < textLines.length; i++) {
        currentPage.text += textLines[i] + '\n';
        currentPage.lineCount++;

        // Create new page when we reach the estimated lines per page
        if (currentPage.lineCount >= linesPerPage && i < textLines.length - 1) {
          currentPage.text = currentPage.text.trim();
          pages.push(currentPage);
          currentPage = {
            pageNumber: pages.length + 1,
            text: '',
            lineCount: 0,
          };
        }
      }

      // Add the last page if it has content
      if (currentPage.text.trim()) {
        currentPage.text = currentPage.text.trim();
        pages.push(currentPage);
      }

      // Normalize the data structure
      const normalizedData = {
        text: pdfData.text.trim(),
        pages: pages,
        metadata: {
          title: pdfData.info?.Title || undefined,
          author: pdfData.info?.Author || undefined,
          subject: pdfData.info?.Subject || undefined,
          keywords: pdfData.info?.Keywords || undefined,
          creator: pdfData.info?.Creator || undefined,
          producer: pdfData.info?.Producer || undefined,
          creationDate: pdfData.info?.CreationDate || undefined,
          modificationDate: pdfData.info?.ModDate || undefined,
          pageCount: pdfData.numpages || pages.length,
          textLength: pdfData.text.length,
          wordCount: pdfData.text.split(/\s+/).filter((word) => word.length > 0).length,
        },
      };

      return {
        data: normalizedData,
        metadata: {
          format: 'pdf-text',
          hasText: true,
          pageCount: normalizedData.metadata.pageCount,
          textLength: normalizedData.metadata.textLength,
          wordCount: normalizedData.metadata.wordCount,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('PDF Text support requires additional dependencies (pdf-parse)');
      }
      throw new Error(`PDF text extraction failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      // Note: pdf-parse is for reading PDFs, not creating them
      // For PDF creation, you would need libraries like pdf-lib or puppeteer
      // This adapter focuses on text extraction, so we'll return structured text data

      const { includeMetadata = true, includePages = true, format = 'structured' } = opts;

      let output;

      if (format === 'plain') {
        // Return just the text content
        output = data.text || '';
      } else if (format === 'pages') {
        // Return page-by-page text
        output =
          data.pages?.map(page => `--- Page ${page.pageNumber} ---\n${page.text}`).join('\n\n') ||
          data.text ||
          '';
      } else {
        // Return structured format
        output = {
          text: data.text || '',
          pages: includePages ? data.pages || [] : undefined,
          metadata: includeMetadata ? data.metadata || {} : undefined,
        };
      }

      return {
        data: output,
        metadata: {
          format: 'pdf-text',
          outputFormat: format,
          textLength: typeof output === 'string' ? output.length : data.text?.length || 0,
          pageCount: data.pages?.length || 0,
          note: 'PDF text data formatted for output (use pdf-lib for PDF creation)',
          ...opts,
        },
      };
    } catch (error) {
      throw new Error(`PDF text formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * TAR adapter for reading and creating TAR archives
 * Uses tar-stream library for streaming TAR archive operations
 */
const tarAdapter = {
  async parse(input, opts = {}) {
    try {
      const tar = await import('tar-stream');
      const { PassThrough } = await import('node:stream');

      // Handle different input types
      let buffer;
      if (Buffer.isBuffer(input)) {
        buffer = input;
      } else if (typeof input === 'string') {
        // Assume it's a file path
        const fs = await import('node:fs/promises');
        buffer = await fs.readFile(input);
      } else {
        throw new TypeError('TAR input must be a Buffer or file path string');
      }

      const {
        extractMetadata = true,
        maxFileSize = 10 * 1024 * 1024, // 10MB default
        includeContent = true,
      } = opts;

      return new Promise((resolve, reject) => {
        const extract = tar.extract();
        const files = [];
        let totalSize = 0;
        let fileCount = 0;

        extract.on('entry', (header, stream, next) => {
          const file = {
            name: header.name,
            type: header.type,
            size: header.size,
            mode: header.mode,
            mtime: new Date(header.mtime * 1000).toISOString(),
            uid: header.uid,
            gid: header.gid,
            uname: header.uname,
            gname: header.gname,
            devmajor: header.devmajor,
            devminor: header.devminor,
            content: undefined,
          };

          // Check file size limit
          if (header.size > maxFileSize) {
            reject(
              new Error(`File ${header.name} exceeds maximum size limit of ${maxFileSize} bytes`)
            );
            return;
          }

          if (includeContent && header.type === 'file') {
            const chunks = [];
            let contentSize = 0;

            stream.on('data', chunk => {
              contentSize += chunk.length;
              if (contentSize > maxFileSize) {
                reject(new Error(`File ${header.name} content exceeds maximum size limit`));
                return;
              }
              chunks.push(chunk);
            });

            stream.on('end', () => {
              file.content = Buffer.concat(chunks);
              files.push(file);
              next();
            });

            stream.on('error', err => {
              reject(new Error(`Error reading file ${header.name}: ${err.message}`));
            });
          } else {
            // Skip content for directories, symlinks, etc.
            stream.on('end', () => {
              files.push(file);
              next();
            });

            stream.on('error', err => {
              reject(new Error(`Error processing entry ${header.name}: ${err.message}`));
            });
          }

          totalSize += header.size;
          fileCount++;
        });

        extract.on('finish', () => {
          const normalizedData = {
            files: files,
            metadata: {
              fileCount: fileCount,
              totalSize: totalSize,
              compression: 'none', // TAR is uncompressed by default
              format: 'tar',
            },
          };

          resolve({
            data: normalizedData,
            metadata: {
              format: 'tar',
              fileCount: fileCount,
              totalSize: totalSize,
              extracted: true,
              ...opts,
            },
          });
        });

        extract.on('error', err => {
          reject(new Error(`TAR extraction failed: ${err.message}`));
        });

        // Create a readable stream from the buffer
        const bufferStream = new PassThrough();
        bufferStream.end(buffer);
        bufferStream.pipe(extract);
      });
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('TAR support requires additional dependencies (tar-stream)');
      }
      throw new Error(`TAR parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      const tar = await import('tar-stream');
      const { PassThrough } = await import('node:stream');

      const { compression = 'none', includeMetadata = true } = opts;

      return new Promise((resolve, reject) => {
        const pack = tar.pack();
        const chunks = [];

        pack.on('data', chunk => {
          chunks.push(chunk);
        });

        pack.on('end', () => {
          const tarBuffer = Buffer.concat(chunks);

          resolve({
            data: tarBuffer,
            metadata: {
              format: 'tar',
              fileCount: data.files?.length || 0,
              totalSize: tarBuffer.length,
              compression: compression,
              ...opts,
            },
          });
        });

        pack.on('error', err => {
          reject(new Error(`TAR creation failed: ${err.message}`));
        });

        // Add files to the archive
        if (data.files && Array.isArray(data.files)) {
          for (const file of data.files) {
            // Ensure mtime is a valid Date object
            let mtimeValue;
            if (file.mtime) {
              const mtimeDate = file.mtime instanceof Date ? file.mtime : new Date(file.mtime);
              mtimeValue = mtimeDate;
            } else {
              mtimeValue = new Date();
            }

            const header = {
              name: file.name,
              type: file.type || 'file',
              size: file.content ? file.content.length : 0,
              mode: file.mode || 0o644,
              mtime: mtimeValue,
              uid: file.uid || 0,
              gid: file.gid || 0,
              uname: file.uname || '',
              gname: file.gname || '',
              devmajor: file.devmajor || 0,
              devminor: file.devminor || 0,
            };

            const entry = pack.entry(header, err => {
              if (err) {
                reject(new Error(`Error adding file ${file.name}: ${err.message}`));
              }
            });

            if (file.content && file.type !== 'directory') {
              entry.write(file.content);
            }

            entry.end();
          }
        }

        pack.finalize();
      });
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('TAR support requires additional dependencies (tar-stream)');
      }
      throw new Error(`TAR formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: true,
  isAI: false,
  version: '1.0.0',
};

/**
 * ZIP adapter for reading and creating ZIP archives
 * Uses jszip library for comprehensive ZIP archive operations
 */
const zipAdapter = {
  async parse(input, opts = {}) {
    try {
      const JSZip = await import('jszip');

      // Handle different input types
      let buffer;
      if (Buffer.isBuffer(input)) {
        buffer = input;
      } else if (typeof input === 'string') {
        // Assume it's a file path
        const fs = await import('node:fs/promises');
        buffer = await fs.readFile(input);
      } else {
        throw new TypeError('ZIP input must be a Buffer or file path string');
      }

      const {
        extractContent = true,
        maxFileSize = 10 * 1024 * 1024, // 10MB default
        includeMetadata = true,
      } = opts;

      const zip = new JSZip.default();
      const zipData = await zip.loadAsync(buffer);

      const files = [];
      let totalSize = 0;
      let fileCount = 0;

      // Process each file in the ZIP
      for (const [relativePath, zipEntry] of Object.entries(zipData.files)) {
        if (zipEntry.dir) {
          // Directory entry
          files.push({
            name: relativePath,
            type: 'directory',
            size: 0,
            compression: undefined,
            crc32: undefined,
            content: undefined,
            lastModified: zipEntry.date ? zipEntry.date.toISOString() : undefined,
            comment: zipEntry.comment || undefined,
          });
        } else {
          // File entry
          const file = {
            name: relativePath,
            type: 'file',
            size: zipEntry._data?.uncompressedSize || 0,
            compression: zipEntry._data?.compression || undefined,
            crc32: zipEntry._data?.crc32 || undefined,
            content: undefined,
            lastModified: zipEntry.date ? zipEntry.date.toISOString() : undefined,
            comment: zipEntry.comment || undefined,
          };

          // Check file size limit
          if (file.size > maxFileSize) {
            throw new Error(
              `File ${relativePath} exceeds maximum size limit of ${maxFileSize} bytes`
            );
          }

          // Extract content if requested
          if (extractContent) {
            try {
              file.content = await zipEntry.async('nodebuffer');
            } catch (error_) {
              // If content extraction fails, continue without content
              console.warn(
                `Warning: Could not extract content for ${relativePath}: ${error_.message}`
              );
            }
          }

          files.push(file);
          totalSize += file.size;
          fileCount++;
        }
      }

      // Normalize the data structure
      const normalizedData = {
        files: files,
        metadata: {
          fileCount: fileCount,
          totalSize: totalSize,
          compression: 'deflate', // ZIP typically uses deflate compression
          format: 'zip',
          comment: zipData.comment || undefined,
        },
      };

      return {
        data: normalizedData,
        metadata: {
          format: 'zip',
          fileCount: fileCount,
          totalSize: totalSize,
          extracted: true,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('ZIP support requires additional dependencies (jszip)');
      }
      throw new Error(`ZIP parsing failed: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      const JSZip = await import('jszip');

      const { compression = 'deflate', compressionLevel = 6, includeMetadata = true } = opts;

      const zip = new JSZip.default();

      // Add files to the ZIP
      if (data.files && Array.isArray(data.files)) {
        for (const file of data.files) {
          if (file.type === 'directory') {
            // Add directory
            zip.folder(file.name);
          } else if (file.content) {
            // Add file with content
            const zipOptions = {
              compression: compression,
              compressionOptions: {
                level: compressionLevel,
              },
              date: file.lastModified ? new Date(file.lastModified) : new Date(),
              comment: file.comment || undefined,
            };

            if (Buffer.isBuffer(file.content)) {
              zip.file(file.name, file.content, zipOptions);
            } else if (typeof file.content === 'string') {
              zip.file(file.name, file.content, zipOptions);
            } else {
              throw new TypeError(`Unsupported content type for file ${file.name}`);
            }
          }
        }
      }

      // Set ZIP comment if provided
      if (data.metadata?.comment) {
        zip.comment = data.metadata.comment;
      }

      // Generate ZIP buffer
      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: compression,
        compressionOptions: {
          level: compressionLevel,
        },
      });

      return {
        data: zipBuffer,
        metadata: {
          format: 'zip',
          fileCount: data.files?.length || 0,
          totalSize: zipBuffer.length,
          compression: compression,
          compressionLevel: compressionLevel,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new Error('ZIP support requires additional dependencies (jszip)');
      }
      throw new Error(`ZIP formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

// Create pack manifest
const packManifest = createPackManifest(
  'ztf-pack-media',
  ['exif', 'id3', 'pdf-text', 'tar', 'zip'],
  {
    version: '1.0.0',
    description: 'Media & Meta format adapters for ZTF',
    dependencies: ['exifr', 'node-id3', 'pdf-parse', 'tar-stream', 'jszip'],
  }
);

// Register all adapters
const adapters = {
  exif: exifAdapter,
  id3: id3Adapter,
  'pdf-text': pdfTextAdapter,
  tar: tarAdapter,
  zip: zipAdapter,
};

registerPack(packManifest, adapters);

export { exifAdapter, id3Adapter, pdfTextAdapter, tarAdapter, zipAdapter };
