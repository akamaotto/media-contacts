import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle both single log and batched logs
    let logsToProcess: any[] = [];
    
    if (body.logs && Array.isArray(body.logs)) {
      // Batched logs
      logsToProcess = body.logs;
    } else {
      // Single log
      logsToProcess = [body];
    }
    
    // Process each log
    for (const logEntry of logsToProcess) {
      // Log to console/server logs with better formatting
      const timestamp = new Date().toISOString();
      const level = logEntry.level || 'info';
      const component = logEntry.component ? `[${logEntry.component}]` : '';
      
      // Format the log message based on the data
      let logMessage = `[${level.toUpperCase()}]${component} ${timestamp} ${logEntry.message}`;
      
      if (logEntry.data) {
        // For error logs, show more details
        if (level === 'error') {
          console.error(logMessage);
          if (logEntry.data.error) {
            console.error('  Error:', logEntry.data.error);
          }
          if (logEntry.data.stack) {
            console.error('  Stack:', logEntry.data.stack);
          }
        } else {
          console.log(logMessage);
          // For non-error logs, show a brief representation of the data
          if (typeof logEntry.data === 'object' && logEntry.data !== null) {
            const keys = Object.keys(logEntry.data);
            if (keys.length > 0) {
              console.log(`  Data keys: ${keys.join(', ')}`);
              // Show a few sample values for small objects
              if (keys.length <= 5) {
                keys.forEach(key => {
                  const value = logEntry.data[key];
                  if (typeof value !== 'object' || value === null) {
                    console.log(`    ${key}: ${value}`);
                  } else if (Array.isArray(value)) {
                    console.log(`    ${key}: Array[${value.length}]`);
                  } else {
                    console.log(`    ${key}: Object`);
                  }
                });
              }
            }
          } else {
            console.log(`  Data: ${logEntry.data}`);
          }
        }
      } else {
        console.log(logMessage);
      }
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ success: true, message: `Processed ${logsToProcess.length} log(s)` }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[DEBUG LOG ERROR]', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to process log' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}