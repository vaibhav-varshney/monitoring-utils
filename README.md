# AQUA ViolationGroup URL Monitoring Utility

A comprehensive monitoring utility that checks the health of URLs in Salesforce AQUA ViolationGroup records. This tool queries all AQUA_ViolationGroup__c records and validates the health of Component_Screenshot_URL__c, HTML_Source__c, and Screenshot_URL__c fields.

## Features

- 🔍 **Autonomous Operation**: Runs without user prompts
- 🚀 **Concurrent Processing**: Checks multiple URLs simultaneously for faster execution
- 🔄 **Retry Logic**: Automatically retries failed requests with exponential backoff
- 📊 **Comprehensive Reporting**: Generates console, JSON, and CSV reports
- 🎯 **Special URL Handling**: Includes support for absctl URLs (HTML_Source__c)
- 🔧 **Configurable**: Customizable timeouts, retry attempts, and concurrency limits
- 🎨 **Rich Console Output**: Color-coded results with detailed summaries

## Installation

1. **Clone or download the project**
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment configuration:**
   ```bash
   cp env.template .env
   ```

4. **Configure your credentials in `.env`:**
   ```bash
   # Salesforce credentials (for SOQL queries)
   SF_USERNAME=your_salesforce_username
   SF_PASSWORD=your_salesforce_password
   SF_LOGIN_URL=https://test.salesforce.com
   
   # Data store cookies (for absctl/HTML_Source__c URLs)
   DATA_STORE_COOKIES="session=abc123; auth=xyz789"
   ```

## Prerequisites

- Node.js 16+ and npm
- Salesforce credentials with access to AQUA_ViolationGroup__c objects
- For HTML_Source__c URLs using absctl: `absctl` command-line tool installed

### Installing absctl (if needed)

If your HTML_Source__c fields contain URLs that require the `absctl` command, you'll need to install it:

```bash
# Check if absctl is installed
which absctl

# If not installed, follow your organization's instructions for installing absctl
# The utility will gracefully handle missing absctl and report it as an error
```

## Usage

### Basic Usage

Run the monitoring utility:

```bash
# Build and run
npm run monitor

# Or run in development mode
npm run dev
```

### Advanced Usage

You can customize the behavior using environment variables:

```bash
# Custom configuration
MAX_CONCURRENT_CHECKS=5 REQUEST_TIMEOUT_MS=60000 npm run monitor
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SF_USERNAME` | Salesforce username | - | Yes |
| `SF_PASSWORD` | Salesforce password | - | Yes |
| `SF_LOGIN_URL` | Salesforce login URL | `https://test.salesforce.com` | Yes |
| `DATA_STORE_COOKIES` | Cookie string for data store authentication | - | For HTML_Source__c |
| `DATA_STORE_SESSION_ID` | Alternative: just session ID | - | For HTML_Source__c |
| `MAX_CONCURRENT_CHECKS` | Maximum concurrent URL checks | `10` | No |
| `REQUEST_TIMEOUT_MS` | Request timeout in milliseconds | `30000` | No |
| `RETRY_ATTEMPTS` | Number of retry attempts for failed requests | `3` | No |
| `GENERATE_JSON` | Generate JSON report | `true` | No |
| `GENERATE_CSV` | Generate CSV report | `true` | No |
| `OUTPUT_DIR` | Output directory for reports | `./` | No |

### Configuration File (.env)

```bash
# Salesforce Configuration (for SOQL queries)
SF_USERNAME=your_username@company.com
SF_PASSWORD=your_password
SF_LOGIN_URL=https://test.salesforce.com

# Data Store Configuration (for absctl/HTML_Source__c URLs)
DATA_STORE_COOKIES="session=abc123; auth=xyz789; csrf=token123"

# Monitoring Configuration
MAX_CONCURRENT_CHECKS=10
REQUEST_TIMEOUT_MS=30000
RETRY_ATTEMPTS=3

# Output Configuration
GENERATE_JSON=true
GENERATE_CSV=true
OUTPUT_DIR=./reports
```

### Getting Data Store Cookies

For HTML_Source__c URLs that use absctl, you need to provide authentication cookies:

1. **Open your browser** and navigate to your data store service
2. **Login** to the service normally
3. **Open Developer Tools** (F12)
4. **Go to Network tab** and make any request
5. **Find a request** in the list and click on it
6. **Look at Headers** section and find `Cookie:` 
7. **Copy the entire cookie string** (everything after `Cookie: `)
8. **Paste it** in your `.env` file as `DATA_STORE_COOKIES`

Example:
```bash
DATA_STORE_COOKIES="sessionid=abc123xyz; csrftoken=def456; auth=ghi789"
```

## Report Types

### 1. Console Report

Real-time colored output with **granular URL type segregation**:
- Executive summary with health statistics
- **📋 Granular URL breakdown** (e.g., "3/18 component screenshot URLs are broken")
- URL type summary table
- Detailed results for broken/partial records
- **📝 Quick summary** with broken URLs by type
- Actionable recommendations with specific URL type information

### 2. JSON Report

Machine-readable report containing:
- Complete monitoring results with granular URL type statistics
- Detailed error information
- Response times and status codes
- Timestamp and summary statistics

### 3. CSV Report

Spreadsheet-compatible format with enhanced URL type information:
- One row per URL check with URL type display names
- Record information and URL details
- Status and error information
- URL type segregation for easy filtering
- Suitable for further analysis and reporting

## URL Types Supported

### 1. Component_Screenshot_URL__c
Standard HTTP/HTTPS URLs pointing to component screenshots.

### 2. Screenshot_URL__c
Standard HTTP/HTTPS URLs pointing to general screenshots.

### 3. HTML_Source__c
Special handling for two types:
- **Standard URLs**: Regular HTTP/HTTPS links
- **absctl URLs**: URLs with `filename` and `runID` parameters that use the `absctl` command

## How It Works

1. **Connect to Salesforce** using provided credentials
2. **Query all AQUA_ViolationGroup__c records** with at least one URL field populated
3. **Process records in batches** to avoid overwhelming the system
4. **Check each URL** with appropriate method:
   - Standard HTTP HEAD requests for regular URLs
   - `absctl` command execution for special HTML_Source__c URLs
5. **Retry failed requests** with exponential backoff
6. **Generate comprehensive reports** with health analysis

## Understanding Results

### Health Status

- **Healthy**: All URLs in the record are working correctly
- **Partial**: Some URLs are working, some are broken
- **Broken**: No URLs are working or no URLs found

### URL Health Criteria

- **Healthy**: HTTP status 200-399 or successful absctl download
- **Broken**: HTTP status 400+, DNS resolution failure, timeout, or absctl failure

## Sample Output

```
🔍 AQUA ViolationGroup URL Monitoring Utility
=========================================

🔧 Validating configuration...
✅ Configuration validated successfully

🔌 Initializing services...
🔐 Connecting to Salesforce...
✅ Successfully connected to Salesforce
🚀 Starting monitoring process...

📊 Found 25 AQUA ViolationGroup records with URLs
🔍 Processing 25 records...

📦 Processing batch 1/3...
✅ Processed AVG-001: healthy (3/3 URLs healthy)
✅ Processed AVG-002: partial (2/3 URLs healthy)
✅ Processed AVG-003: broken (0/2 URLs healthy)

⏱️  Monitoring completed in 45.67 seconds

📊 Generating reports...

================================================================================
AQUA VIOLATIONGROUP URL MONITORING REPORT
================================================================================

📊 EXECUTIVE SUMMARY
--------------------------------------------------
┌─────────────────────────┬──────────┬─────────────────┐
│ Metric                  │ Count    │ Percentage      │
├─────────────────────────┼──────────┼─────────────────┤
│ Total Records           │ 25       │ 100.0%          │
│ Healthy Records         │ 18       │ 72.0%           │
│ Partial Records         │ 5        │ 20.0%           │
│ Broken Records          │ 2        │ 8.0%            │
└─────────────────────────┴──────────┴─────────────────┘

📋 GRANULAR URL BREAKDOWN
--------------------------------------------------
✅ Component Screenshot URLs: 15/18 healthy, 3 broken
   → 3/18 component screenshot urls are broken (16.7%)
⚠️  HTML Source URLs: 12/15 healthy, 3 broken  
   → 3/15 html source urls are broken (20.0%)
✅ Screenshot URLs: 20/22 healthy, 2 broken
   → 2/22 screenshot urls are broken (9.1%)

📝 QUICK SUMMARY
--------------------------------------------------
📊 Overall URL Health: 47/55 healthy (85.5%)
❌ Total Broken URLs: 8 (14.5%)

Broken by Type:
  • 3/18 Component Screenshot URLs
  • 3/15 HTML Source URLs  
  • 2/22 Screenshot URLs
```

## Troubleshooting

### Common Issues

1. **Salesforce Connection Failed**
   - Verify username and password
   - Check login URL (sandbox vs production)
   - Ensure user has permission to access AQUA_ViolationGroup__c

2. **absctl Command Not Found**
   - Install absctl following your organization's guidelines
   - Verify absctl is in your PATH
   - The utility will continue with other URLs even if absctl is missing

3. **Timeout Errors**
   - Increase `REQUEST_TIMEOUT_MS` for slow networks
   - Reduce `MAX_CONCURRENT_CHECKS` to be less aggressive

4. **Memory Issues**
   - Reduce `MAX_CONCURRENT_CHECKS`
   - Monitor large datasets and consider filtering

## Development

### Project Structure

```
src/
├── index.ts          # Main application entry point
├── types.ts          # TypeScript type definitions
├── config.ts         # Configuration management
├── salesforce.ts     # Salesforce API integration
├── url-checker.ts    # URL health checking logic
├── monitor.ts        # Main monitoring orchestration
└── reporter.ts       # Report generation
```

### Building

```bash
# Build the project
npm run build

# Run built version
npm start
```

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled application
- `npm run dev` - Run in development mode with ts-node
- `npm run monitor` - Build and run the monitoring utility

## License

ISC License

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the logs for detailed error messages
3. Ensure your environment configuration is correct
4. Verify network connectivity and permissions 