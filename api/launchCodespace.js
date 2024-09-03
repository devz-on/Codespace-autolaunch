const fetch = require('node-fetch');

const GITHUB_API_URL = 'https://api.github.com';
const ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN; // GitHub access token stored as an environment variable in Vercel
const RECHECK_INTERVAL = 230 * 60 * 1000; // 230 minutes in milliseconds

// Function to get the list of codespaces
async function getCodespace() {
  const response = await fetch(`${GITHUB_API_URL}/user/codespaces`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch codespaces: ${response.statusText}`);
  }

  const data = await response.json();
  return data.codespaces ? data.codespaces[0] : null; // Returns the first available codespace
}

// Function to stop a running codespace
async function stopCodespace(codespaceName) {
  const response = await fetch(`${GITHUB_API_URL}/user/codespaces/${codespaceName}/stop`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to stop codespace: ${response.statusText}`);
  }

  return await response.json();
}

// Function to start a codespace
async function startCodespace(codespaceName) {
  const response = await fetch(`${GITHUB_API_URL}/user/codespaces/${codespaceName}/start`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to start codespace: ${response.statusText}`);
  }

  return await response.json();
}

// Function to handle the request and manage the codespace
async function handleRequest(req, res) {
  try {
    const codespace = await getCodespace();

    if (codespace) {
      console.log(`Found codespace: ${codespace.name} with status: ${codespace.state}`);

      // Check if the codespace is running
      if (codespace.state === 'Running') {
        console.log(`Stopping codespace: ${codespace.name}`);
        await stopCodespace(codespace.name); // Stop the running codespace
        console.log(`Codespace ${codespace.name} stopped successfully.`);
      }

      // Start the codespace
      console.log(`Starting codespace: ${codespace.name}`);
      await startCodespace(codespace.name);
      console.log(`Codespace ${codespace.name} started successfully.`);
    } else {
      console.log('No codespace found.');
    }

    // Respond with a success message
    res.status(200).send('The project is working fine');
  } catch (error) {
    console.error(error);

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
