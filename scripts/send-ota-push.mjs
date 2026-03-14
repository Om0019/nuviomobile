const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const updateMessage = process.env.OTA_UPDATE_MESSAGE || 'A new Nuvio update is available.';

if (!supabaseUrl || !serviceRoleKey) {
  console.log('Skipping OTA push notification: missing Supabase service role configuration.');
  process.exit(0);
}

const chunk = (items, size) => {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

const fetchRegisteredTokens = async () => {
  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, '')}/rest/v1/device_push_tokens?select=expo_push_token&enabled=eq.true`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch push tokens: ${response.status} ${text}`);
  }

  const rows = await response.json();
  return [...new Set(rows.map(row => row.expo_push_token).filter(Boolean))];
};

const sendPushBatch = async (tokens) => {
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title: 'Nuvio update available',
    body: updateMessage,
    data: {
      type: 'ota-update',
      message: updateMessage,
    },
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo push send failed: ${response.status} ${text}`);
  }

  return response.json();
};

try {
  const tokens = await fetchRegisteredTokens();

  if (tokens.length === 0) {
    console.log('No registered push tokens found. Skipping OTA push notification.');
    process.exit(0);
  }

  console.log(`Sending OTA push notification to ${tokens.length} device(s)...`);

  const batches = chunk(tokens, 100);
  for (const batch of batches) {
    await sendPushBatch(batch);
  }

  console.log('OTA push notification send complete.');
} catch (error) {
  console.error(error);
  process.exit(1);
}
