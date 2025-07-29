const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://sshqmzleagwonfcphqyj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzaHFtemxlYWd3b25mY3BocXlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTg3ODkzNywiZXhwIjoyMDQ3NDU0OTM3fQ.XR-';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Get HighLevel API key from database
async function getHighLevelApiKey() {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('access_token')
      .single();
    
    if (error) {
      throw new Error('Failed to get HighLevel API key from database');
    }
    
    if (!data || !data.access_token) {
      throw new Error('No HighLevel API key found in companies table');
    }
    
    return data.access_token;
  } catch (error) {
    throw error;
  }
}

// HighLevel tools
const highlevelTools = [
  {
    name: 'search_contacts',
    description: 'Search for contacts in HighLevel CRM',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (name, email, or phone)'
        },
        locationId: {
          type: 'string',
          description: 'HighLevel location ID (optional)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_contact_info',
    description: 'Get detailed contact information from HighLevel',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'HighLevel contact ID'
        },
        locationId: {
          type: 'string',
          description: 'HighLevel location ID (optional)'
        }
      },
      required: ['contactId']
    }
  },
  {
    name: 'lookup_client_location_id',
    description: 'Get HighLevel location_id from client name in master_clients table',
    inputSchema: {
      type: 'object',
      properties: {
        clientName: {
          type: 'string',
          description: 'Client name to look up'
        }
      },
      required: ['clientName']
    }
  }
];

// Tool implementations
async function executeHighLevelTool(toolName, args) {
  const apiKey = await getHighLevelApiKey();
  
  switch (toolName) {
    case 'search_contacts':
      return await searchContacts(args.query, args.locationId, apiKey);
    
    case 'get_contact_info':
      return await getContactInfo(args.contactId, args.locationId, apiKey);
    
    case 'lookup_client_location_id':
      return await lookupClientLocationId(args.clientName);
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function searchContacts(query, locationId, apiKey) {
  try {
    const url = locationId 
      ? `https://rest.gohighlevel.com/v1/contacts/?locationId=${locationId}&query=${encodeURIComponent(query)}`
      : `https://rest.gohighlevel.com/v1/contacts/?query=${encodeURIComponent(query)}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28'
      }
    });
    
    return {
      success: true,
      data: response.data,
      total_contacts: response.data.contacts?.length || 0
    };
  } catch (error) {
    throw new Error(`HighLevel API error: ${error.response?.status} ${error.response?.statusText}`);
  }
}

async function getContactInfo(contactId, locationId, apiKey) {
  try {
    const url = locationId 
      ? `https://rest.gohighlevel.com/v1/contacts/${contactId}?locationId=${locationId}`
      : `https://rest.gohighlevel.com/v1/contacts/${contactId}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28'
      }
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    throw new Error(`HighLevel API error: ${error.response?.status} ${error.response?.statusText}`);
  }
}

async function lookupClientLocationId(clientName) {
  try {
    const { data, error } = await supabase
      .from('master_clients')
      .select('location_id, client_name')
      .ilike('client_name', `%${clientName}%`)
      .single();
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data) {
      return {
        success: false,
        message: `No client found with name containing "${clientName}"`
      };
    }
    
    return {
      success: true,
      client_name: data.client_name,
      location_id: data.location_id
    };
  } catch (error) {
    throw new Error(`Lookup error: ${error.message}`);
  }
}

module.exports = {
  highlevelTools,
  executeHighLevelTool
};