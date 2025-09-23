/**
 * @typedef {Object} Adapter
 * @property {Function} parse - Parse input into structured data
 * @property {Function} format - Format structured data into output
 * @property {boolean} supportsStreaming - Whether the adapter supports streaming
 * @property {boolean} isAI - Whether the adapter is AI-powered
 * @property {string} version - Adapter version
 */

import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * cURL adapter for parsing and formatting HTTP requests
 * @param {string} input - cURL command string
 * @param {Object} [opts] - Optional configuration
 * @returns {Promise<Object>} Parsed HTTP request data
 */
const curlAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const parseCurl = await import('parse-curl');
      const parse = parseCurl.default;

      if (!input || input.trim() === '') {
        throw new Error('cURL input cannot be empty');
      }

      const parsed = parse(input);

      // Transform parsed cURL into a structured format
      const result = {
        method: parsed.method || 'GET',
        url: parsed.url || '',
        headers: parsed.headers || {},
        data: parsed.data || undefined,
        query: parsed.query || {},
        ...opts,
      };

      return {
        data: result,
        metadata: {
          inputSize: input.length,
          method: result.method,
          url: result.url,
          hasHeaders: Object.keys(result.headers).length > 0,
          hasData: !!result.data,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(
          'cURL support requires additional dependencies (parse-curl). Install with: pnpm add parse-curl'
        );
      }
      throw new Error(`Failed to parse cURL command: ${error.message}`);
    }
  },

  /**
   * Format HTTP request data into cURL command
   * @param {Object} data - HTTP request data
   * @param {Object} [opts] - Optional configuration
   * @returns {Promise<Object>} Formatted cURL command
   */
  async format(data, opts = {}) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('cURL format data must be an object');
      }

      const { method = 'GET', url = '', headers = {}, data: body = undefined, query = {} } = data;

      if (!url) {
        throw new Error('URL is required for cURL format');
      }

      // Build cURL command
      let curlCmd = `curl -X ${method.toUpperCase()}`;

      // Add headers
      for (const [key, value] of Object.entries(headers)) {
        curlCmd += ` -H "${key}: ${value}"`;
      }

      // Add query parameters
      if (Object.keys(query).length > 0) {
        const queryString = new URLSearchParams(query).toString();
        const separator = url.includes('?') ? '&' : '?';
        curlCmd += ` "${url}${separator}${queryString}"`;
      } else {
        curlCmd += ` "${url}"`;
      }

      // Add body data
      if (body) {
        curlCmd += typeof body === 'string' ? ` -d '${body}'` : ` -d '${JSON.stringify(body)}'`;
      }

      return {
        data: curlCmd,
        metadata: {
          outputSize: curlCmd.length,
          method: method.toUpperCase(),
          url,
          hasHeaders: Object.keys(headers).length > 0,
          hasData: !!body,
          ...opts,
        },
      };
    } catch (error) {
      throw new Error(`Failed to format cURL command: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * EML adapter for parsing and formatting email messages
 * @param {string} input - EML email content
 * @param {Object} [opts] - Optional configuration
 * @returns {Promise<Object>} Parsed email data
 */
const emlAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const PostalMime = (await import('postal-mime')).default;

      if (!input || input.trim() === '') {
        throw new Error('EML input cannot be empty');
      }

      const parser = new PostalMime();
      const email = await parser.parse(input);

      // Transform parsed email into a structured format
      const result = {
        from: email.from,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        subject: email.subject,
        date: email.date,
        messageId: email.messageId,
        inReplyTo: email.inReplyTo,
        references: email.references,
        text: email.text,
        html: email.html,
        attachments:
          email.attachments?.map(att => ({
            filename: att.filename || 'unknown',
            contentType: att.mimeType || 'application/octet-stream',
            contentId: att.contentId || '',
            size:
              typeof att.content === 'string' ? att.content.length : att.content?.byteLength || 0,
            // Don't include actual content in the main data structure
            // Content can be accessed separately if needed
          })) || [],
        headers: email.headers || {},
        ...opts,
      };

      return {
        data: result,
        metadata: {
          inputSize: input.length,
          hasText: !!result.text,
          hasHtml: !!result.html,
          attachmentCount: result.attachments.length,
          headerCount: Object.keys(result.headers).length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(
          'EML support requires additional dependencies (postal-mime). Install with: pnpm add postal-mime'
        );
      }
      throw new Error(`Failed to parse EML content: ${error.message}`);
    }
  },

  /**
   * Format email data into EML format
   * @param {Object} data - Email data
   * @param {Object} [opts] - Optional configuration
   * @returns {Promise<Object>} Formatted EML content
   */
  async format(data, opts = {}) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('EML format data must be an object');
      }

      const {
        from = '',
        to = [],
        cc = [],
        bcc = [],
        subject = '',
        date = new Date().toISOString(),
        messageId = '',
        inReplyTo = '',
        references = '',
        text = '',
        html = '',
        attachments = [],
        headers = {},
      } = data;

      // Build EML content
      let eml = '';

      // Headers
      eml += `From: ${from}\r\n`;
      if (Array.isArray(to) && to.length > 0) {
        eml += `To: ${to.join(', ')}\r\n`;
      }
      if (Array.isArray(cc) && cc.length > 0) {
        eml += `Cc: ${cc.join(', ')}\r\n`;
      }
      if (Array.isArray(bcc) && bcc.length > 0) {
        eml += `Bcc: ${bcc.join(', ')}\r\n`;
      }
      eml += `Subject: ${subject}\r\n`;
      eml += `Date: ${date}\r\n`;
      if (messageId) eml += `Message-ID: ${messageId}\r\n`;
      if (inReplyTo) eml += `In-Reply-To: ${inReplyTo}\r\n`;
      if (references) eml += `References: ${references}\r\n`;

      // Additional headers
      for (const [key, value] of Object.entries(headers)) {
        eml += `${key}: ${value}\r\n`;
      }

      // MIME version
      eml += `MIME-Version: 1.0\r\n`;

      // Content type and boundary
      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      eml += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

      // Text content
      if (text) {
        eml += `--${boundary}\r\n`;
        eml += `Content-Type: text/plain; charset=utf-8\r\n`;
        eml += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
        eml += `${text}\r\n\r\n`;
      }

      // HTML content
      if (html) {
        eml += `--${boundary}\r\n`;
        eml += `Content-Type: text/html; charset=utf-8\r\n`;
        eml += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
        eml += `${html}\r\n\r\n`;
      }

      // Attachments
      for (const attachment of attachments) {
        eml += `--${boundary}\r\n`;
        eml += `Content-Type: ${attachment.contentType || 'application/octet-stream'}\r\n`;
        eml += `Content-Transfer-Encoding: base64\r\n`;
        if (attachment.filename) {
          eml += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
        }
        if (attachment.contentId) {
          eml += `Content-ID: <${attachment.contentId}>\r\n`;
        }
        eml += `\r\n`;
        // Note: In a real implementation, you'd need to handle base64 encoding of attachment content
        eml += `[Attachment content would be base64 encoded here]\r\n\r\n`;
      }

      eml += `--${boundary}--\r\n`;

      return {
        data: eml,
        metadata: {
          outputSize: eml.length,
          hasText: !!text,
          hasHtml: !!html,
          attachmentCount: attachments.length,
          headerCount: Object.keys(headers).length + 4, // +4 for standard headers
          ...opts,
        },
      };
    } catch (error) {
      throw new Error(`Failed to format EML content: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * ICS adapter for parsing and formatting calendar events
 * @param {string} input - ICS calendar content
 * @param {Object} [opts] - Optional configuration
 * @returns {Promise<Object>} Parsed calendar data
 */
const icsAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const icalModule = await import('ical.js');
      const ICAL = icalModule;

      if (!input || input.trim() === '') {
        throw new Error('ICS input cannot be empty');
      }

      const jcalData = ICAL.parse(input);
      const comp = new ICAL.Component(jcalData);

      // Extract events from the calendar
      const events = comp.getAllSubcomponents('vevent').map(vevent => {
        const event = new ICAL.Event(vevent);
        return {
          uid: event.uid,
          summary: event.summary,
          description: event.description,
          location: event.location,
          startDate: event.startDate?.toJSDate()?.toISOString(),
          endDate: event.endDate?.toJSDate()?.toISOString(),
          duration: event.duration?.toString(),
          organizer: event.organizer,
          attendees:
            event.attendees?.map(att => ({
              email: att.getParameter('cn') || att.getParameter('email'),
              role: att.getParameter('role'),
              status: att.getParameter('partstat'),
              rsvp: att.getParameter('rsvp') === 'true',
            })) || [],
          categories: event.categories,
          status: event.status,
          priority: event.priority,
          transparency: event.transparency,
          recurrenceId: event.recurrenceId?.toJSDate()?.toISOString(),
          recurrenceRule: event.recurrenceRule?.toString(),
          alarms: vevent.getAllSubcomponents('valarm').map(alarm => {
            const alarmComp = new ICAL.Component(alarm);
            return {
              action: alarmComp.getFirstPropertyValue('action'),
              trigger: alarmComp.getFirstPropertyValue('trigger'),
              description: alarmComp.getFirstPropertyValue('description'),
            };
          }),
        };
      });

      // Extract calendar properties
      const calendar = {
        prodid: comp.getFirstPropertyValue('prodid'),
        version: comp.getFirstPropertyValue('version'),
        calscale: comp.getFirstPropertyValue('calscale'),
        method: comp.getFirstPropertyValue('method'),
        name: comp.getFirstPropertyValue('x-wr-calname'),
        description: comp.getFirstPropertyValue('x-wr-caldesc'),
        timezone: comp.getFirstPropertyValue('x-wr-timezone'),
        events,
        ...opts,
      };

      return {
        data: calendar,
        metadata: {
          inputSize: input.length,
          eventCount: events.length,
          hasTimezone: !!calendar.timezone,
          hasAlarms: events.some(e => e.alarms.length > 0),
          hasRecurrence: events.some(e => e.recurrenceRule),
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(
          'ICS support requires additional dependencies (ical.js). Install with: pnpm add ical.js'
        );
      }
      throw new Error(`Failed to parse ICS content: ${error.message}`);
    }
  },

  /**
   * Format calendar data into ICS format
   * @param {Object} data - Calendar data
   * @param {Object} [opts] - Optional configuration
   * @returns {Promise<Object>} Formatted ICS content
   */
  async format(data, opts = {}) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('ICS format data must be an object');
      }

      // Dynamic import to handle optional dependency
      const icalModule = await import('ical.js');
      const ICAL = icalModule;

      const {
        prodid = '-//ZTF//Calendar//EN',
        version = '2.0',
        calscale = 'GREGORIAN',
        method = 'PUBLISH',
        name = '',
        description = '',
        timezone = 'UTC',
        events = [],
      } = data;

      // Create calendar component
      const comp = new ICAL.Component(['vcalendar', [], []]);
      comp.updatePropertyWithValue('prodid', prodid);
      comp.updatePropertyWithValue('version', version);
      comp.updatePropertyWithValue('calscale', calscale);
      comp.updatePropertyWithValue('method', method);

      if (name) comp.updatePropertyWithValue('x-wr-calname', name);
      if (description) comp.updatePropertyWithValue('x-wr-caldesc', description);
      if (timezone) comp.updatePropertyWithValue('x-wr-timezone', timezone);

      // Add events
      for (const eventData of events) {
        const vevent = new ICAL.Component('vevent');

        // Basic event properties
        if (eventData.uid) vevent.updatePropertyWithValue('uid', eventData.uid);
        if (eventData.summary) vevent.updatePropertyWithValue('summary', eventData.summary);
        if (eventData.description)
          vevent.updatePropertyWithValue('description', eventData.description);
        if (eventData.location) vevent.updatePropertyWithValue('location', eventData.location);
        if (eventData.status) vevent.updatePropertyWithValue('status', eventData.status);
        if (eventData.priority) vevent.updatePropertyWithValue('priority', eventData.priority);
        if (eventData.transparency)
          vevent.updatePropertyWithValue('transparency', eventData.transparency);
        if (eventData.categories)
          vevent.updatePropertyWithValue('categories', eventData.categories);

        // Dates
        if (eventData.startDate) {
          const startDate = ICAL.Time.fromJSDate(new Date(eventData.startDate));
          vevent.updatePropertyWithValue('dtstart', startDate);
        }
        if (eventData.endDate) {
          const endDate = ICAL.Time.fromJSDate(new Date(eventData.endDate));
          vevent.updatePropertyWithValue('dtend', endDate);
        }
        if (eventData.duration) {
          vevent.updatePropertyWithValue('duration', ICAL.Duration.fromString(eventData.duration));
        }

        // Organizer
        if (eventData.organizer) {
          const organizer = new ICAL.Property('organizer');
          organizer.setValue(`mailto:${eventData.organizer}`);
          vevent.addProperty(organizer);
        }

        // Attendees
        if (eventData.attendees) {
          for (const attendee of eventData.attendees) {
            const attendeeProp = new ICAL.Property('attendee');
            attendeeProp.setValue(`mailto:${attendee.email}`);
            if (attendee.role) attendeeProp.setParameter('role', attendee.role);
            if (attendee.status) attendeeProp.setParameter('partstat', attendee.status);
            if (attendee.rsvp) attendeeProp.setParameter('rsvp', 'true');
            vevent.addProperty(attendeeProp);
          }
        }

        // Recurrence
        if (eventData.recurrenceRule) {
          vevent.updatePropertyWithValue('rrule', ICAL.Recur.fromString(eventData.recurrenceRule));
        }
        if (eventData.recurrenceId) {
          const recurrenceId = ICAL.Time.fromJSDate(new Date(eventData.recurrenceId));
          vevent.updatePropertyWithValue('recurrence-id', recurrenceId);
        }

        // Alarms
        if (eventData.alarms) {
          for (const alarmData of eventData.alarms) {
            const valarm = new ICAL.Component('valarm');
            if (alarmData.action) valarm.updatePropertyWithValue('action', alarmData.action);
            if (alarmData.trigger) valarm.updatePropertyWithValue('trigger', alarmData.trigger);
            if (alarmData.description)
              valarm.updatePropertyWithValue('description', alarmData.description);
            vevent.addSubcomponent(valarm);
          }
        }

        comp.addSubcomponent(vevent);
      }

      const icsContent = comp.toString();

      return {
        data: icsContent,
        metadata: {
          outputSize: icsContent.length,
          eventCount: events.length,
          hasTimezone: !!timezone,
          hasAlarms: events.some(e => e.alarms?.length > 0),
          hasRecurrence: events.some(e => e.recurrenceRule),
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(
          'ICS support requires additional dependencies (ical.js). Install with: pnpm add ical.js'
        );
      }
      throw new Error(`Failed to format ICS content: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * MessagePack adapter for parsing and formatting binary data
 * @param {Uint8Array|Buffer|string} input - MessagePack binary data
 * @param {Object} [opts] - Optional configuration
 * @returns {Promise<Object>} Parsed data
 */
const msgpackAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const { decode } = await import('@msgpack/msgpack');

      if (!input) {
        throw new Error('MessagePack input cannot be empty');
      }

      let binaryData;
      if (typeof input === 'string') {
        // Assume base64 encoded string
        binaryData = Uint8Array.from(atob(input), c => c.codePointAt(0));
      } else if (input instanceof Uint8Array) {
        binaryData = input;
      } else if (Buffer.isBuffer(input)) {
        binaryData = new Uint8Array(input);
      } else {
        throw new TypeError('MessagePack input must be Uint8Array, Buffer, or base64 string');
      }

      const decoded = decode(binaryData);

      return {
        data: decoded,
        metadata: {
          inputSize: binaryData.length,
          outputSize: JSON.stringify(decoded).length,
          isBinary: true,
          format: 'msgpack',
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(
          'MessagePack support requires additional dependencies (@msgpack/msgpack). Install with: pnpm add @msgpack/msgpack'
        );
      }
      throw new Error(`Failed to parse MessagePack data: ${error.message}`);
    }
  },

  /**
   * Format data into MessagePack binary format
   * @param {any} data - Data to encode
   * @param {Object} [opts] - Optional configuration
   * @returns {Promise<Object>} Formatted MessagePack data
   */
  async format(data, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const { encode } = await import('@msgpack/msgpack');

      if (data === undefined) {
        throw new Error('MessagePack format data cannot be undefined');
      }

      const encoded = encode(data);

      // Return as base64 string by default for easier handling
      const base64String = btoa(String.fromCodePoint(...encoded));

      return {
        data: base64String,
        metadata: {
          inputSize: JSON.stringify(data).length,
          outputSize: encoded.length,
          isBinary: true,
          format: 'msgpack',
          compressionRatio: encoded.length / JSON.stringify(data).length,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(
          'MessagePack support requires additional dependencies (@msgpack/msgpack). Install with: pnpm add @msgpack/msgpack'
        );
      }
      throw new Error(`Failed to format MessagePack data: ${error.message}`);
    }
  },

  supportsStreaming: true,
  isAI: false,
  version: '1.0.0',
};

/**
 * vCard adapter for parsing and formatting contact information
 * @param {string} input - vCard content
 * @param {Object} [opts] - Optional configuration
 * @returns {Promise<Object>} Parsed contact data
 */
const vcardAdapter = {
  async parse(input, opts = {}) {
    try {
      // Dynamic import to handle optional dependency
      const vcardModule = await import('vcard4');

      if (!input || input.trim() === '') {
        throw new Error('vCard input cannot be empty');
      }

      // Simple vCard parsing - extract basic information
      const lines = input
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);
      const result = {
        version: '4.0',
        fn: '',
        n: {},
        nickname: '',
        photo: '',
        bday: '',
        anniversary: '',
        gender: '',
        adr: [],
        tel: [],
        email: [],
        impp: [],
        lang: [],
        tz: [],
        geo: [],
        title: '',
        role: '',
        logo: '',
        org: '',
        member: '',
        related: '',
        categories: [],
        note: '',
        prodid: '',
        rev: '',
        sound: '',
        uid: '',
        clientpidmap: [],
        url: '',
        key: '',
        fburl: '',
        caladruri: '',
        caluri: '',
        source: '',
        kind: 'individual',
        xml: '',
        ...opts,
      };

      // Parse vCard properties
      for (const line of lines) {
        if (line.startsWith('VERSION:')) {
          result.version = line.substring(8);
        } else if (line.startsWith('FN:')) {
          result.fn = line.substring(3);
        } else if (line.startsWith('N:')) {
          const nameParts = line.substring(2).split(';');
          result.n = {
            family: nameParts[0] || '',
            given: nameParts[1] || '',
            additional: nameParts[2] || '',
            prefix: nameParts[3] || '',
            suffix: nameParts[4] || '',
          };
        } else if (line.startsWith('EMAIL:')) {
          result.email.push({ value: line.substring(6) });
        } else if (line.startsWith('TEL:')) {
          result.tel.push({ value: line.substring(4) });
        } else if (line.startsWith('ORG:')) {
          result.org = line.substring(4);
        } else if (line.startsWith('TITLE:')) {
          result.title = line.substring(6);
        } else if (line.startsWith('URL:')) {
          result.url = line.substring(4);
        } else if (line.startsWith('NOTE:')) {
          result.note = line.substring(5);
        }
      }

      return {
        data: result,
        metadata: {
          inputSize: input.length,
          version: result.version,
          hasPhoto: !!result.photo,
          hasAddress: result.adr.length > 0,
          hasPhone: result.tel.length > 0,
          hasEmail: result.email.length > 0,
          hasOrganization: !!result.org,
          hasUrl: !!result.url,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(
          'vCard support requires additional dependencies (vcard4). Install with: pnpm add vcard4'
        );
      }
      throw new Error(`Failed to parse vCard content: ${error.message}`);
    }
  },

  /**
   * Format contact data into vCard format
   * @param {Object} data - Contact data
   * @param {Object} [opts] - Optional configuration
   * @returns {Promise<Object>} Formatted vCard content
   */
  async format(data, opts = {}) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('vCard format data must be an object');
      }

      // Dynamic import to handle optional dependency
      const vcardModule = await import('vcard4');

      const {
        version = '4.0',
        fn = '',
        n = {},
        nickname = '',
        photo = '',
        bday = '',
        anniversary = '',
        gender = '',
        adr = [],
        tel = [],
        email = [],
        impp = [],
        lang = [],
        tz = [],
        geo = [],
        title = '',
        role = '',
        logo = '',
        org = '',
        member = '',
        related = '',
        categories = [],
        note = '',
        prodid = '',
        rev = '',
        sound = '',
        uid = '',
        clientpidmap = [],
        url = '',
        key = '',
        fburl = '',
        caladruri = '',
        caluri = '',
        source = '',
        kind = 'individual',
        xml = '',
      } = data;

      // Build vCard content
      let vcardContent = 'BEGIN:VCARD\r\n';
      vcardContent += `VERSION:${version}\r\n`;

      if (fn) vcardContent += `FN:${fn}\r\n`;

      if (n && (n.family || n.given)) {
        const nameParts = [
          n.family || '',
          n.given || '',
          n.additional || '',
          n.prefix || '',
          n.suffix || '',
        ];
        vcardContent += `N:${nameParts.join(';')}\r\n`;
      }

      if (nickname) vcardContent += `NICKNAME:${nickname}\r\n`;
      if (photo) vcardContent += `PHOTO:${photo}\r\n`;
      if (bday) vcardContent += `BDAY:${bday}\r\n`;
      if (anniversary) vcardContent += `ANNIVERSARY:${anniversary}\r\n`;
      if (gender) vcardContent += `GENDER:${gender}\r\n`;
      if (title) vcardContent += `TITLE:${title}\r\n`;
      if (role) vcardContent += `ROLE:${role}\r\n`;
      if (logo) vcardContent += `LOGO:${logo}\r\n`;
      if (org) vcardContent += `ORG:${org}\r\n`;
      if (note) vcardContent += `NOTE:${note}\r\n`;
      if (prodid) vcardContent += `PRODID:${prodid}\r\n`;
      if (rev) vcardContent += `REV:${rev}\r\n`;
      if (sound) vcardContent += `SOUND:${sound}\r\n`;
      if (uid) vcardContent += `UID:${uid}\r\n`;
      if (url) vcardContent += `URL:${url}\r\n`;
      if (key) vcardContent += `KEY:${key}\r\n`;
      if (fburl) vcardContent += `FBURL:${fburl}\r\n`;
      if (caladruri) vcardContent += `CALADRURI:${caladruri}\r\n`;
      if (caluri) vcardContent += `CALURI:${caluri}\r\n`;
      if (source) vcardContent += `SOURCE:${source}\r\n`;
      if (kind) vcardContent += `KIND:${kind}\r\n`;
      if (xml) vcardContent += `XML:${xml}\r\n`;

      // Add arrays
      for (const emailItem of email) {
        vcardContent += `EMAIL:${emailItem.value}\r\n`;
      }
      for (const telItem of tel) {
        vcardContent += `TEL:${telItem.value}\r\n`;
      }
      for (const adrItem of adr) {
        vcardContent += `ADR:${adrItem.value}\r\n`;
      }
      for (const imppItem of impp) {
        vcardContent += `IMPP:${imppItem.value}\r\n`;
      }
      for (const langItem of lang) {
        vcardContent += `LANG:${langItem.value}\r\n`;
      }
      for (const tzItem of tz) {
        vcardContent += `TZ:${tzItem.value}\r\n`;
      }
      for (const geoItem of geo) {
        vcardContent += `GEO:${geoItem.value}\r\n`;
      }
      for (const memberItem of member) {
        vcardContent += `MEMBER:${memberItem.value}\r\n`;
      }
      for (const relatedItem of related) {
        vcardContent += `RELATED:${relatedItem.value}\r\n`;
      }
      for (const categoryItem of categories) {
        vcardContent += `CATEGORIES:${categoryItem.value}\r\n`;
      }
      for (const clientpidmapItem of clientpidmap) {
        vcardContent += `CLIENTPIDMAP:${clientpidmapItem.value}\r\n`;
      }

      vcardContent += 'END:VCARD\r\n';

      return {
        data: vcardContent,
        metadata: {
          outputSize: vcardContent.length,
          version,
          hasPhoto: !!photo,
          hasAddress: adr.length > 0,
          hasPhone: tel.length > 0,
          hasEmail: email.length > 0,
          hasOrganization: !!org,
          hasUrl: !!url,
          ...opts,
        },
      };
    } catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(
          'vCard support requires additional dependencies (vcard4). Install with: pnpm add vcard4'
        );
      }
      throw new Error(`Failed to format vCard content: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

// Create pack manifest
const packManifest = createPackManifest(
  'ztf-pack-communications',
  ['curl', 'eml', 'ics', 'msgpack', 'vcard'],
  {
    version: '1.0.0',
    description: 'Communications format adapters for ZTF',
    dependencies: [],
  }
);

// Register all adapters
const adapters = {
  curl: curlAdapter,
  eml: emlAdapter,
  ics: icsAdapter,
  msgpack: msgpackAdapter,
  vcard: vcardAdapter,
};

registerPack(packManifest, adapters);

export { curlAdapter, emlAdapter, icsAdapter, msgpackAdapter, vcardAdapter };
