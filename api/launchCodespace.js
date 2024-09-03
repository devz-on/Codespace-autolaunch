const axios = require('axios');

const GITHUB_API_URL = 'https://api.github.com';
const RECHECK_INTERVAL = 230 * 60 * 1000; // 230 minutes in milliseconds

async function getCodespace(githubToken) {
  try {
    const response = await axios.get(`${GITHUB_API_URL}/user/codespaces`, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    return response.data.codespaces ? response.data.codespaces[0] : null;
  } catch (error) {
    console.error('Error fetching codespace:', error.message);
    throw error;
  }
}

async function stopCodespace(githubToken, codespaceName) {
  try {
    const response = await axios.post(`${GITHUB_API_URL}/user/codespaces/${codespaceName}/stop`, {}, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error stopping codespace:', error.message);
    throw error;
  }
}

async function startCodespace(githubToken, codespaceName) {
  try {
    const response = await axios.post(`${GITHUB_API_URL}/user/codespaces/${codespaceName}/start`, {}, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error starting codespace:', error.message);
    throw error;
  }
}

async function handleRequest(req, res) {
  try {
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      throw new Error('GitHub access token is not set');
    }

    const codespace = await getCodespace(githubToken);

    if (codespace) {
      console.log(`Found codespace: ${codespace.name} with status: ${codespace.state}`);

      if (codespace.state === 'Running') {
        console.log(`Stopping codespace: ${codespace.name}`);
        await stopCodespace(githubToken, codespace.name);
        console.log(`Codespace ${codespace.name} stopped successfully.`);
      }

      console.log(`Starting codespace: ${codespace.name}`);
      await startCodespace(githubToken, codespace.name);
      console.log(`Codespace ${codespace.name} started successfully.`);
    } else {
      console.log('No codespace found.');
    }

    res.status(200).send('The project is working fine');
  } catch (error) {
    console.error('Error handling request:', error.message);
    res.status(500).send(`Error: ${error.message}`);
  }
}

function scheduleNextRun() {
  setTimeout(async () => {
    console.log(`Relaunching codespace check...`);
    try {
      await handleRequest({}, { status: () => ({ send: console.log }) });
    } catch (e) {
      console.error('Error during scheduled run:', e.message);
    }
    scheduleNextRun();
  }, RECHECK_INTERVAL);
}

module.exports = async (req, res) => {
  await handleRequest(req, res);
  scheduleNextRun();
};
