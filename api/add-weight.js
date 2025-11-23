import { google } from 'googleapis';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { date, cat, weight } = req.body;

    // Validate input
    if (!date || !cat || !weight) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Setup Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1wOd3OH2QwUGBNfzELaevKqKQhAgL6tmROgfqps5sOfk';

    // Get current data to find if date exists
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Hoja 1!A:E',
    });

    const rows = getResponse.data.values || [];
    
    // Find the row with this date
    const dateRowIndex = rows.findIndex(row => row[0] === date);
    
    // Determine column index based on cat name
    // Columns: A=Date, B=Gaudí, C=Maite, D=Benito, E=Cleopatra
    const catColumnMap = {
      'Gaudí': 1,
      'Maite': 2,
      'Benito': 3,
      'Cleopatra': 4
    };
    
    const columnIndex = catColumnMap[cat];
    if (columnIndex === undefined) {
      return res.status(400).json({ error: 'Invalid cat name' });
    }

    const columnLetter = ['A', 'B', 'C', 'D', 'E'][columnIndex];

    if (dateRowIndex >= 0) {
      // Date exists, update the specific cell
      const range = `Hoja 1!${columnLetter}${dateRowIndex + 1}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: {
          values: [[weight]],
        },
      });
    } else {
      // Date doesn't exist, append new row
      // Create new row with date and weight in correct position
      const newRow = ['', '', '', '', ''];
      newRow[0] = date;
      newRow[columnIndex] = weight;

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Hoja 1!A:E',
        valueInputOption: 'RAW',
        resource: {
          values: [newRow],
        },
      });
    }

    return res.status(200).json({ success: true, message: 'Weight added successfully' });
  } catch (error) {
    console.error('Error adding weight:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
