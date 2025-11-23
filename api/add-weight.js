import { google } from 'googleapis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== Starting add-weight function ===');
  console.log('Request body:', req.body);

  try {
    const { date, cat, weight } = req.body;

    if (!date || !cat || !weight) {
      console.error('Missing fields:', { date, cat, weight });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error('Missing environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Try to fix the private key formatting
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    
    // If it doesn't start with -----, it might be base64 encoded
    if (!privateKey.startsWith('-----BEGIN')) {
      try {
        privateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
        console.log('Decoded private key from base64');
      } catch (e) {
        console.log('Not base64, using as-is');
      }
    }
    
    // Ensure proper line breaks
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // Additional cleanup: ensure it has proper BEGIN/END markers
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      console.error('Invalid private key format');
      return res.status(500).json({ error: 'Invalid private key format' });
    }

    console.log('Private key format check:', {
      hasBegin: privateKey.includes('-----BEGIN'),
      hasEnd: privateKey.includes('-----END'),
      length: privateKey.length
    });

    console.log('Setting up Google Auth...');
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    console.log('Google Auth created successfully');

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1wOd3OH2QwUGBNfzELaevKqKQhAgL6tmROgfqps5sOfk';

    console.log('Reading spreadsheet...');
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Hoja 1!A:E',
    });

    console.log('Spreadsheet read successfully, rows:', getResponse.data.values?.length || 0);

    const rows = getResponse.data.values || [];
    const dateRowIndex = rows.findIndex(row => row[0] === date);
    console.log('Date row index:', dateRowIndex);
    
    const catColumnMap = {
      'Gaudí': 1,
      'Maite': 2,
      'Benito': 3,
      'Cleopatra': 4
    };
    
    const columnIndex = catColumnMap[cat];
    if (columnIndex === undefined) {
      return res.status(400).json({ error: `Invalid cat name: ${cat}` });
    }

    const columnLetter = ['A', 'B', 'C', 'D', 'E'][columnIndex];
    console.log('Column:', columnLetter, 'Index:', columnIndex);

    if (dateRowIndex >= 0) {
      const range = `Hoja 1!${columnLetter}${dateRowIndex + 1}`;
      console.log('Updating range:', range);
      
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: {
          values: [[weight]],
        },
      });
      console.log('Updated successfully');
    } else {
      const newRow = ['', '', '', '', ''];
      newRow[0] = date;
      newRow[columnIndex] = weight;
      console.log('Appending new row:', newRow);

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Hoja 1!A:E',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [newRow],
        },
      });
      console.log('Appended successfully');
    }

    console.log('=== Function completed successfully ===');
    return res.status(200).json({ 
      success: true, 
      message: 'Weight added successfully',
      data: { date, cat, weight }
    });
  } catch (error) {
    console.error('Error:', error);
    console.error('Error stack:', error.stack);
    
    // More detailed error message
    let errorMessage = error.message;
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error.message || errorMessage;
    }
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: errorMessage
    });
  }
}
