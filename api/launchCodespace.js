const axios = require('axios');

const GITHUB_API_URL = 'https://api.github.com';
const RECHECK_INTERVAL = 230 * 60 * 1000; // 230 minutes in milliseconds

// Function to get the list of codespaces
async function getCodespace(githubToken) {
  const response = await axios.get(`${GITHUB_API_URL}/user/codespaces`, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (response.status !== 200) {
    throw new Error(`GitHub API returned status code ${response.status}`);
  }

  return response.data.codespaces ? response.data.codespaces[0] : null; // Returns the first available codespace
}

// Function to stop a running codespace
async function stopCodespace(githubToken, codespaceName) {
  const response = await axios.post(`${GITHUB_API_URL}/user/codespaces/${codespaceName}/stop`, {}, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (response.status !== 202) {
    throw new Error(`Failed to stop codespace: ${response.statusText}`);
  }

  return response.data;
}

// Function to start a codespace
async function startCodespace(githubToken, codespaceName) {
  const response = await axios.post(`${GITHUB_API_URL}/user/codespaces/${codespaceName}/start`, {}, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (response.status !== 202) {
    throw new Error(`Failed to start codespace: ${response.statusText}`);
  }

  return response.data;
}

// Function to handle the request and manage the codespace
async function handleRequest(req, res) {
  try {
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      throw new Error('GitHub access token is not set');
    }

    const codespace = await getCodespace(githubToken);

    if (codespace) {
      console.log(`Found codespace: ${codespace.name} with status: ${codespace.state}`);

      // Check if the codespace is running
      if (codespace.state === 'Running') {
        console.log(`Stopping codespace: ${codespace.name}`);
        await stopCodespace(githubToken, codespace.name); // Stop the running codespace
        console.log(`Codespace ${codespace.name} stopped successfully.`);
      }

      // Start the codespace
      console.log(`Starting codespace: ${codespace.name}`);
      await startCodespace(githubToken, codespace.name);
      console.log(`Codespace ${codespace.name} started successfully.`);
    } else {
      console.log('No codespace found.');
    }

    // Respond with a success message
    res.status(200).send('The project is working fine');
  } catch (error) {
    console.error(error.message);

    // Respond with the error message
    res.status(500).send(`Error: ${error.message}`);
  }
}

// Function to schedule the next run of the serverless function
function scheduleNextRun() {
  setTimeout(async () => {
    console.log(`Relaunching codespace check...`);
    try {
      await handleRequest({}, { status: () => ({ send: console.log }) }); // Run the function and log output for debugging
    } catch (e) {
      console.error('Error during scheduled run:', e.message);
    }
    scheduleNextRun(); // Re-schedule after completion
  }, RECHECK_INTERVAL);
}

// Entry point for the serverless function
module.exports = async (req, res) => {
  await handleRequest(req, res); // Run the function once and respond to the user
  scheduleNextRun(); // Start the scheduling loop
};
