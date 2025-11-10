const { google } = require('googleapis');

// Environment variables used:
// - GOOGLE_CLIENT_ID: Google OAuth2 Client ID
// - GOOGLE_CLIENT_SECRET: Google OAuth2 Client Secret
// - GOOGLE_REDIRECT_URI: Google OAuth2 Redirect URI for this function
// - APP_REDIRECT_URI: The final URL to redirect the user back to the calendar page

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

exports.handler = async function(event, context) {
  const { code } = event.queryStringParameters;

  if (!code) {
    return {
      statusCode: 400,
      body: 'Missing authorization code.'
    };
  }

  try {
    // Exchange the authorization code for an access token
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Here, you would typically save the `tokens` (especially the refresh_token)
    // to a secure database, associated with the user.
    // For this example, we are not persisting the token.

    // Redirect the user back to the calendar page with a success indicator
    const finalRedirectUrl = `${process.env.APP_REDIRECT_URI}?gcal_connected=true`;
    
    return {
      statusCode: 302,
      headers: {
        'Location': finalRedirectUrl,
        'Cache-Control': 'no-cache'
      },
      body: ''
    };
  } catch (error) {
    console.error('Error exchanging token:', error);
    return {
      statusCode: 500,
      body: 'Failed to connect to Google Calendar. Please try again.'
    };
  }
};
