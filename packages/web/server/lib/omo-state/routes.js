import { parse as parseJsonc } from 'jsonc-parser';

export const registerOmoStateRoutes = (app, dependencies) => {
  const {
    fs,
    path,
    os,
  } = dependencies;

  const configPath = path.join(os.homedir(), '.config', 'opencode', 'oh-my-openagent.json');

  const maxBodyBytes = 1024 * 1024;
  const modelPattern = /^[^\s/]+\/[^\s]+$/;
  const unsafeRecordKeys = new Set(['__proto__', 'constructor', 'prototype']);

  const readJsonBody = (req) => new Promise((resolve) => {
    let body = '';
    let complete = false;

    const finish = (result) => {
      if (complete) return;
      complete = true;
      resolve(result);
    };

    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > maxBodyBytes) {
        finish({ ok: false, status: 413, error: 'Payload too large' });
        req.destroy();
      }
    });
    req.on('end', () => {
      if (body.trim().length === 0) {
        finish({ ok: true, body: {} });
        return;
      }

      try {
        finish({ ok: true, body: JSON.parse(body) });
      } catch {
        finish({ ok: false, status: 400, error: 'Invalid JSON' });
      }
    });
    req.on('error', () => finish({ ok: false, status: 400, error: 'Invalid request body' }));
  });

  const parseObject = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value;
  };

  const isUnsafeRecordKey = (key) => key.trim().length === 0 || unsafeRecordKeys.has(key);

  const parseConfig = () => {
    const errors = [];
    const config = parseJsonc(fs.readFileSync(configPath, 'utf-8'), errors, { allowTrailingComma: true });
    if (errors.length > 0) {
      throw new Error('Invalid OMO config JSON');
    }
    const parsed = parseObject(config);
    if (!parsed) {
      throw new Error('OMO config must be an object');
    }
    return parsed;
  };

  const validateAssignment = (value, pointer) => {
    const assignment = parseObject(value);
    if (!assignment) return `${pointer} must be an object`;

    for (const key of Object.keys(assignment)) {
      if (key !== 'model' && key !== 'variant' && key !== 'fallback_models') {
        return `Unsupported field: ${pointer}.${key}`;
      }
    }

    if (typeof assignment.model !== 'string' || !modelPattern.test(assignment.model)) {
      return `${pointer}.model must be provider/model-id`;
    }

    if ('variant' in assignment && typeof assignment.variant !== 'string') {
      return `${pointer}.variant must be a string`;
    }

    if ('fallback_models' in assignment) {
      if (!Array.isArray(assignment.fallback_models)) {
        return `${pointer}.fallback_models must be an array`;
      }

      for (let index = 0; index < assignment.fallback_models.length; index += 1) {
        const fallbackError = validateAssignment(assignment.fallback_models[index], `${pointer}.fallback_models[${index}]`);
        if (fallbackError) return fallbackError;
      }
    }

    return null;
  };

  const normalizeAssignment = (value) => {
    const next = { model: value.model };
    if (typeof value.variant === 'string' && value.variant.length > 0) {
      next.variant = value.variant;
    }
    if (Array.isArray(value.fallback_models)) {
      next.fallback_models = value.fallback_models.map(normalizeAssignment);
    }
    return next;
  };

  const validateAssignmentPatch = (value, currentRecord, label) => {
    if (value === undefined) return null;
    const patch = parseObject(value);
    if (!patch) return `${label} must be an object`;

    if (!currentRecord || typeof currentRecord !== 'object' || Array.isArray(currentRecord)) {
      return `${label} are not configured`;
    }

    for (const [name, assignment] of Object.entries(patch)) {
      if (isUnsafeRecordKey(name)) {
        return `Invalid ${label.slice(0, -1)} name: ${name}`;
      }

      if (!Object.prototype.hasOwnProperty.call(currentRecord, name)) {
        return `Unknown ${label.slice(0, -1)}: ${name}`;
      }

      const assignmentError = validateAssignment(assignment, `${label}.${name}`);
      if (assignmentError) return assignmentError;
    }

    return null;
  };

  const mergeAssignmentPatch = (currentRecord, patch) => {
    if (!patch) return currentRecord;
    const nextRecord = { ...currentRecord };
    for (const [name, assignment] of Object.entries(patch)) {
      nextRecord[name] = {
        ...currentRecord[name],
        ...normalizeAssignment(assignment),
      };
    }
    return nextRecord;
  };

  const writeConfigAtomically = (config) => {
    const dir = path.dirname(configPath);
    const tmpPath = path.join(dir, `.oh-my-openagent.json.${process.pid}.${Date.now()}.tmp`);
    fs.writeFileSync(tmpPath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
    fs.renameSync(tmpPath, configPath);
  };

  const readConfig = () => {
    try {
      if (!fs.existsSync(configPath)) return { installed: false, config: null };
      const config = parseConfig();
      return { installed: true, config };
    } catch (error) {
      console.error('OMO config read failed:', error);
      return { installed: true, config: null, error: 'Failed to read OMO config' };
    }
  };

  app.get('/api/omo/state', (_req, res) => {
    return res.json(readConfig());
  });

  app.put('/api/omo/state', async (req, res) => {
    try {
      if (!fs.existsSync(configPath)) {
        return res.status(404).json({ error: 'OMO config not found' });
      }

      const config = parseConfig();
      const bodyResult = req.body === undefined
        ? await readJsonBody(req)
        : { ok: true, body: req.body };
      if (!bodyResult.ok) {
        return res.status(bodyResult.status).json({ error: bodyResult.error });
      }

      const body = parseObject(bodyResult.body);
      if (!body) {
        return res.status(400).json({ error: 'Body must be an object' });
      }

      for (const key of Object.keys(body)) {
        if (key !== 'agents' && key !== 'categories') {
          return res.status(400).json({ error: `Unsupported field: ${key}` });
        }
      }

      const agentsError = validateAssignmentPatch(body.agents, config.agents, 'agents');
      if (agentsError) return res.status(400).json({ error: agentsError });

      const categoriesError = validateAssignmentPatch(body.categories, config.categories, 'categories');
      if (categoriesError) return res.status(400).json({ error: categoriesError });

      const nextConfig = { ...config };
      if (body.agents !== undefined) {
        nextConfig.agents = mergeAssignmentPatch(config.agents, body.agents);
      }
      if (body.categories !== undefined) {
        nextConfig.categories = mergeAssignmentPatch(config.categories, body.categories);
      }

      writeConfigAtomically(nextConfig);
      return res.json({ installed: true, config: nextConfig });
    } catch (error) {
      console.error('OMO config write failed:', error);
      return res.status(500).json({ error: 'Failed to write OMO config' });
    }
  });
};
