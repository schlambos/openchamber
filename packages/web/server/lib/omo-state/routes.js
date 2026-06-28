export const registerOmoStateRoutes = (app, dependencies) => {
  const {
    fs,
    path,
    os,
  } = dependencies;

  const configPath = path.join(os.homedir(), '.config', 'opencode', 'oh-my-openagent.json');

  const readConfig = () => {
    try {
      if (!fs.existsSync(configPath)) return { installed: false, config: null };
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return { installed: true, config };
    } catch (error) {
      console.error('OMO config read failed:', error);
      return { installed: true, config: null, error: 'Failed to read OMO config' };
    }
  };

  app.get('/api/omo/state', (_req, res) => {
    return res.json(readConfig());
  });
};
