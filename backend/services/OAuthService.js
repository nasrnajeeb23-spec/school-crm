const { google } = require('googleapis');
const msal = require('@azure/msal-node');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

class OAuthService {
  constructor() {
    // Google OAuth2 configuration (optional)
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.googleOAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.BACKEND_URL || 'https://school-crschool-crm-backendm.onrender.com'}/api/auth/google/callback`
      );
    }

    // Microsoft Graph configuration (optional)
    if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET) {
      this.msalConfig = {
        auth: {
          clientId: process.env.AZURE_CLIENT_ID,
          clientSecret: process.env.AZURE_CLIENT_SECRET,
          authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}`
        },
        system: {
          loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
              console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: msal.LogLevel.Verbose,
          }
        }
      };

      this.msalClient = new msal.ConfidentialClientApplication(this.msalConfig);
    }

    // Scopes for different integrations
    this.googleScopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/classroom.courses.readonly',
      'https://www.googleapis.com/auth/classroom.rosters.readonly'
    ];

    this.microsoftScopes = [
      'User.Read',
      'Calendars.ReadWrite',
      'Files.Read.All',
      'Sites.Read.All',
      'Team.ReadBasic.All',
      'Channel.ReadBasic.All'
    ];
  }

  /**
   * Generate Google OAuth2 authorization URL
   */
  async generateGoogleAuthUrl(state, userId) {
    try {
      const authUrl = this.googleOAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: this.googleScopes,
        state: JSON.stringify({ provider: 'google', userId, state }),
        prompt: 'consent'
      });

      // Log authorization attempt
      await AuditLog.create({
        userId: userId,
        action: 'OAUTH_AUTHORIZATION_INITIATED',
        resource: 'Google',
        details: { scopes: this.googleScopes },
        ipAddress: 'system',
        userAgent: 'system'
      });

      return authUrl;

    } catch (error) {
      console.error('Google auth URL generation error:', error);
      throw error;
    }
  }

  /**
   * Handle Google OAuth2 callback
   */
  async handleGoogleCallback(code, state) {
    try {
      const { tokens } = await this.googleOAuth2Client.getToken(code);
      this.googleOAuth2Client.setCredentials(tokens);

      // Get user info
      const oauth2 = google.oauth2({ version: 'v2', auth: this.googleOAuth2Client });
      const { data: userInfo } = await oauth2.userinfo.get();

      // Parse state
      const parsedState = JSON.parse(state);
      const userId = parsedState.userId;

      // Update user with Google credentials
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Store OAuth credentials
      if (!user.oauth) {
        user.oauth = {};
      }

      user.oauth.google = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          scope: tokens.scope,
          token_type: tokens.token_type,
          expiry_date: tokens.expiry_date
        },
        connectedAt: new Date(),
        lastSync: new Date()
      };

      await user.save();

      // Log successful connection
      await AuditLog.create({
        userId: user._id,
        action: 'OAUTH_CONNECTED',
        resource: 'Google',
        details: { 
          email: userInfo.email,
          scopes: tokens.scope?.split(' ') || []
        },
        ipAddress: 'system',
        userAgent: 'system'
      });

      // Sync Google Classroom data
      await this.syncGoogleClassroomData(userId);

      return {
        success: true,
        provider: 'google',
        userInfo: {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture
        }
      };

    } catch (error) {
      console.error('Google OAuth callback error:', error);
      
      // Log failure
      try {
        await AuditLog.create({
          action: 'OAUTH_CONNECTION_FAILED',
          resource: 'Google',
          details: { error: error.message },
          ipAddress: 'system',
          userAgent: 'system'
        });
      } catch (auditError) {
        console.error('Failed to log Google OAuth failure:', auditError);
      }
      
      throw error;
    }
  }

  /**
   * Generate Microsoft OAuth2 authorization URL
   */
  async generateMicrosoftAuthUrl(state, userId) {
    try {
      const authCodeUrlParameters = {
        scopes: this.microsoftScopes,
        redirectUri: `${process.env.BACKEND_URL}/api/auth/microsoft/callback`,
        state: JSON.stringify({ provider: 'microsoft', userId, state })
      };

      const authUrl = await this.msalClient.getAuthCodeUrl(authCodeUrlParameters);

      // Log authorization attempt
      await AuditLog.create({
        userId: userId,
        action: 'OAUTH_AUTHORIZATION_INITIATED',
        resource: 'Microsoft',
        details: { scopes: this.microsoftScopes },
        ipAddress: 'system',
        userAgent: 'system'
      });

      return authUrl;

    } catch (error) {
      console.error('Microsoft auth URL generation error:', error);
      throw error;
    }
  }

  /**
   * Handle Microsoft OAuth2 callback
   */
  async handleMicrosoftCallback(code, state) {
    try {
      const tokenRequest = {
        code: code,
        scopes: this.microsoftScopes,
        redirectUri: `${process.env.BACKEND_URL}/api/auth/microsoft/callback`
      };

      const response = await this.msalClient.acquireTokenByCode(tokenRequest);
      const accessToken = response.accessToken;
      const userInfo = response.account;

      // Parse state
      const parsedState = JSON.parse(state);
      const userId = parsedState.userId;

      // Update user with Microsoft credentials
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Store OAuth credentials
      if (!user.oauth) {
        user.oauth = {};
      }

      user.oauth.microsoft = {
        id: userInfo.homeAccountId,
        email: userInfo.username,
        name: userInfo.name,
        tenantId: userInfo.tenantId,
        tokens: {
          access_token: accessToken,
          refresh_token: response.refreshToken,
          scope: this.microsoftScopes.join(' '),
          token_type: 'Bearer',
          expiry_date: new Date(response.expiresOn).getTime()
        },
        connectedAt: new Date(),
        lastSync: new Date()
      };

      await user.save();

      // Log successful connection
      await AuditLog.create({
        userId: user._id,
        action: 'OAUTH_CONNECTED',
        resource: 'Microsoft',
        details: { 
          email: userInfo.username,
          tenantId: userInfo.tenantId,
          scopes: this.microsoftScopes
        },
        ipAddress: 'system',
        userAgent: 'system'
      });

      // Sync Microsoft Teams data
      await this.syncMicrosoftTeamsData(userId);

      return {
        success: true,
        provider: 'microsoft',
        userInfo: {
          email: userInfo.username,
          name: userInfo.name,
          tenantId: userInfo.tenantId
        }
      };

    } catch (error) {
      console.error('Microsoft OAuth callback error:', error);
      
      // Log failure
      try {
        await AuditLog.create({
          action: 'OAUTH_CONNECTION_FAILED',
          resource: 'Microsoft',
          details: { error: error.message },
          ipAddress: 'system',
          userAgent: 'system'
        });
      } catch (auditError) {
        console.error('Failed to log Microsoft OAuth failure:', auditError);
      }
      
      throw error;
    }
  }

  /**
   * Sync Google Classroom data
   */
  async syncGoogleClassroomData(userId) {
    try {
      const user = await User.findById(userId);
      if (!user?.oauth?.google?.tokens?.access_token) {
        throw new Error('Google OAuth not connected');
      }

      this.googleOAuth2Client.setCredentials(user.oauth.google.tokens);

      // Get Google Classroom courses
      const classroom = google.classroom({ version: 'v1', auth: this.googleOAuth2Client });
      
      const coursesResponse = await classroom.courses.list({
        teacherId: 'me',
        courseStates: ['ACTIVE']
      });

      const courses = coursesResponse.data.courses || [];

      // Sync courses to database
      const syncData = {
        courses: courses.map(course => ({
          id: course.id,
          name: course.name,
          section: course.section,
          description: course.description,
          room: course.room,
          ownerId: course.ownerId,
          creationTime: course.creationTime,
          updateTime: course.updateTime,
          enrollmentCode: course.enrollmentCode,
          courseState: course.courseState
        })),
        syncTime: new Date(),
        totalCourses: courses.length
      };

      // Store sync data
      user.oauth.google.classroomData = syncData;
      user.oauth.google.lastSync = new Date();
      await user.save();

      // Log sync
      await AuditLog.create({
        userId: user._id,
        action: 'GOOGLE_CLASSROOM_SYNC',
        resource: 'Google',
        details: { 
          coursesSynced: courses.length,
          syncTime: new Date()
        },
        ipAddress: 'system',
        userAgent: 'system'
      });

      return syncData;

    } catch (error) {
      console.error('Google Classroom sync error:', error);
      throw error;
    }
  }

  /**
   * Sync Microsoft Teams data
   */
  async syncMicrosoftTeamsData(userId) {
    try {
      const user = await User.findById(userId);
      if (!user?.oauth?.microsoft?.tokens?.access_token) {
        throw new Error('Microsoft OAuth not connected');
      }

      // Get Microsoft Teams data using Microsoft Graph
      const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {
        headers: {
          'Authorization': `Bearer ${user.oauth.microsoft.tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!graphResponse.ok) {
        throw new Error('Failed to fetch Teams data');
      }

      const teamsData = await graphResponse.json();
      const teams = teamsData.value || [];

      // Sync teams to database
      const syncData = {
        teams: teams.map(team => ({
          id: team.id,
          displayName: team.displayName,
          description: team.description,
          isArchived: team.isArchived
        })),
        syncTime: new Date(),
        totalTeams: teams.length
      };

      // Store sync data
      user.oauth.microsoft.teamsData = syncData;
      user.oauth.microsoft.lastSync = new Date();
      await user.save();

      // Log sync
      await AuditLog.create({
        userId: user._id,
        action: 'MICROSOFT_TEAMS_SYNC',
        resource: 'Microsoft',
        details: { 
          teamsSynced: teams.length,
          syncTime: new Date()
        },
        ipAddress: 'system',
        userAgent: 'system'
      });

      return syncData;

    } catch (error) {
      console.error('Microsoft Teams sync error:', error);
      throw error;
    }
  }

  /**
   * Refresh OAuth tokens
   */
  async refreshTokens(userId, provider) {
    try {
      const user = await User.findById(userId);
      if (!user?.oauth?.[provider]) {
        throw new Error(`${provider} OAuth not connected`);
      }

      let newTokens;

      if (provider === 'google') {
        this.googleOAuth2Client.setCredentials(user.oauth.google.tokens);
        const { credentials } = await this.googleOAuth2Client.refreshAccessToken();
        newTokens = credentials;
        
        user.oauth.google.tokens = {
          ...user.oauth.google.tokens,
          access_token: newTokens.access_token,
          expiry_date: newTokens.expiry_date
        };
      } else if (provider === 'microsoft') {
        const refreshTokenRequest = {
          refreshToken: user.oauth.microsoft.tokens.refresh_token,
          scopes: this.microsoftScopes
        };

        const response = await this.msalClient.acquireTokenByRefreshToken(refreshTokenRequest);
        newTokens = {
          access_token: response.accessToken,
          refresh_token: response.refreshToken,
          expiry_date: new Date(response.expiresOn).getTime()
        };

        user.oauth.microsoft.tokens = {
          ...user.oauth.microsoft.tokens,
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expiry_date: newTokens.expiry_date
        };
      }

      await user.save();

      // Log token refresh
      await AuditLog.create({
        userId: user._id,
        action: 'OAUTH_TOKENS_REFRESHED',
        resource: provider,
        details: { 
          provider,
          refreshTime: new Date()
        },
        ipAddress: 'system',
        userAgent: 'system'
      });

      return newTokens;

    } catch (error) {
      console.error(`OAuth token refresh error for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect OAuth provider
   */
  async disconnectProvider(userId, provider) {
    try {
      const user = await User.findById(userId);
      if (!user?.oauth?.[provider]) {
        throw new Error(`${provider} OAuth not connected`);
      }

      // Store disconnect info for audit
      const disconnectInfo = {
        provider,
        connectedAt: user.oauth[provider].connectedAt,
        lastSync: user.oauth[provider].lastSync,
        disconnectedAt: new Date()
      };

      // Remove OAuth data
      delete user.oauth[provider];
      await user.save();

      // Log disconnection
      await AuditLog.create({
        userId: user._id,
        action: 'OAUTH_DISCONNECTED',
        resource: provider,
        details: disconnectInfo,
        ipAddress: 'system',
        userAgent: 'system'
      });

      return {
        success: true,
        message: `${provider} OAuth disconnected successfully`
      };

    } catch (error) {
      console.error(`OAuth disconnection error for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Get OAuth connection status
   */
  async getOAuthStatus(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const status = {
        google: {
          connected: !!user.oauth?.google,
          email: user.oauth?.google?.email,
          connectedAt: user.oauth?.google?.connectedAt,
          lastSync: user.oauth?.google?.lastSync
        },
        microsoft: {
          connected: !!user.oauth?.microsoft,
          email: user.oauth?.microsoft?.email,
          tenantId: user.oauth?.microsoft?.tenantId,
          connectedAt: user.oauth?.microsoft?.connectedAt,
          lastSync: user.oauth?.microsoft?.lastSync
        }
      };

      return status;

    } catch (error) {
      console.error('OAuth status check error:', error);
      throw error;
    }
  }
}

module.exports = new OAuthService();