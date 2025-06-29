"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesforceService = void 0;
const jsforce_1 = require("jsforce");
class SalesforceService {
    constructor(loginUrl) {
        this.connection = new jsforce_1.Connection({
            loginUrl: loginUrl,
            version: '58.0',
        });
    }
    async login(username, password) {
        try {
            await this.connection.login(username, password);
            console.log('✅ Successfully connected to Salesforce');
        }
        catch (error) {
            console.log(username, password);
            console.error('🔁 Login URL used:', this.connection.loginUrl);
            throw new Error(`Failed to login to Salesforce: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getAllViolationGroups() {
        try {
            const soql = `
        SELECT Id, Name, Component_Screenshot_URL__c, HTML_Source__c, Screenshot_URL__c
        FROM AQUA_ViolationGroup__c
        WHERE (Component_Screenshot_URL__c != null 
            OR HTML_Source__c != null 
            OR Screenshot_URL__c != null)
          AND Work_Status__c != 'Closed'
        ORDER BY Name
      `;
            // Handle pagination manually to get all records
            let allRecords = [];
            let result = await this.connection.query(soql);
            allRecords = allRecords.concat(result.records);
            // Continue fetching remaining records if more exist
            while (!result.done && result.nextRecordsUrl) {
                result = await this.connection.queryMore(result.nextRecordsUrl);
                allRecords = allRecords.concat(result.records);
            }
            console.log(`📊 Found ${allRecords.length} AQUA ViolationGroup records with URLs`);
            return allRecords;
        }
        catch (error) {
            throw new Error(`Failed to query AQUA ViolationGroup records: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getViolationGroupById(id) {
        try {
            const soql = `
        SELECT Id, Name, Component_Screenshot_URL__c, HTML_Source__c, Screenshot_URL__c
        FROM AQUA_ViolationGroup__c
        WHERE Id = '${id}'
      `;
            const result = await this.connection.query(soql);
            return result.records.length > 0 ? result.records[0] : null;
        }
        catch (error) {
            throw new Error(`Failed to query AQUA ViolationGroup by ID: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.SalesforceService = SalesforceService;
//# sourceMappingURL=salesforce.js.map