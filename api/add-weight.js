import { google } from 'googleapis';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== Starting add-weight function ===');
  console.log('Request body:', req.body);

  try {
    const { date, cat, weight } = req.body;

    // Validate input
    if (!date || !cat || !weight) {
      console.error('Missing fields:', { date, cat, weight });
      return res.status(400).json({ error: 'Missing required fields: date, cat, or weight' });
    }

    // Check environment variables
    const hasClientEmail = !!process.env.GOOGLE_CLIENT_EMAIL;
    const hasPrivateKey = !!process.env.GOOGLE_PRIVATE_KEY;
    
    console.log('Environment check:', {
      hasClientEmail,
      hasPrivateKey,
      clientEmailLength: process.env.GOOGLE_CLIENT_EMAIL?.length || 0,
      privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0
    });

    if (!hasClientEmail) {
      console.error('Missing GOOGLE_CLIENT_EMAIL');
      return res.status(500).json({ error: 'Server configuration error: Missing client email' });
    }

    if (!hasPrivateKey) {
      console.error('Missing GOOGLE_PRIVATE_KEY');
      return res.status(500).json({ error: 'Server configuration error: Missing private key' });
    }

    // Setup Google Sheets API
    console.log('Setting up Google Auth...');
    let auth;
    try {
      const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
      
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      console.log('Google Auth created successfully');
    } catch (authError) {
      console.error('Authentication error:', authError);
      return res.status(500).json({ 
        error: 'Authentication failed', 
        details: authError.message 
      });
    }

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1wOd3OH2QwUGBNfzELaevKqKQhAgL6tmROgfqps5sOfk';

    // Get current data
    console.log('Reading spreadsheet...');
    let getResponse;
    try {
      getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Hoja 1!A:E',
      });
      console.log('Spreadsheet read successfully, rows:', getResponse.data.values?.length || 0);
    } catch (getError) {
      console.error('Error reading spreadsheet:', getError);
      return res.status(500).json({ 
        error: 'Failed to read spreadsheet', 
        details: getError.message 
      });
    }

    const rows = getResponse.data.values || [];
    const dateRowIndex = rows.findIndex(row => row[0] === date);
    console.log('Date row index:', dateRowIndex);
    
    // Cat column mapping
    const catColumnMap = {
      'Gaudí': 1,
      'Maite': 2,
      'Benito': 3,
      'Cleopatra': 4
    };
    
    const columnIndex = catColumnMap[cat];
    if (columnIndex === undefined) {
      console.error('Invalid cat name:', cat);
      return res.status(400).json({ error: `Invalid cat name: ${cat}` });
    }

    const columnLetter = ['A', 'B', 'C', 'D', 'E'][columnIndex];
    console.log('Column:', columnLetter, 'Index:', columnIndex);

    try {
      if (dateRowIndex >= 0) {
        // Update existing row
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
        // Append new row
        const newRow = ['', '', '', '', ''];
        newRow[0] = date;
        newRow[columnIndex] = weight;
        console.log('Appending new row:', newRow);

        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: 'Hoja 1!A:E',
          valueInputOption: 'RAW',
          resource: {
            values: [newRow],
          },
        });
        console.log('Appended successfully');
      }
    } catch (updateError) {
      console.error('Error updating spreadsheet:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update spreadsheet', 
        details: updateError.message 
      });
    }

    console.log('=== Function completed successfully ===');
    return res.status(200).json({ 
      success: true, 
      message: 'Weight added successfully',
      data: { date, cat, weight }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message
    });
  }
}
