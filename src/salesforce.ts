import { Connection } from 'jsforce';
import { AQUAViolationGroup } from './types';

export class SalesforceService {
  private connection: Connection;

  constructor(loginUrl: string) {
    this.connection = new Connection({
      version: '58.0'
    });
  }

  async login(username: string, password: string): Promise<void> {
    try {
      await this.connection.login(username, password);
      console.log('✅ Successfully connected to Salesforce');
    } catch (error) {
      console.log(username, password);
      throw new Error(`Failed to login to Salesforce: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getAllViolationGroups(): Promise<AQUAViolationGroup[]> {
    try {
      const soql = `
        SELECT Id, Name, Component_Screenshot_URL__c, HTML_Source__c, Screenshot_URL__c
        FROM AQUA_ViolationGroup__c
        WHERE Component_Screenshot_URL__c != null 
           OR HTML_Source__c != null 
           OR Screenshot_URL__c != null
        ORDER BY Name
      `;

      // Handle pagination manually to get all records
      let allRecords: AQUAViolationGroup[] = [];
      let result = await this.connection.query<AQUAViolationGroup>(soql);
      
      allRecords = allRecords.concat(result.records);
      
      // Continue fetching remaining records if more exist
      while (!result.done && result.nextRecordsUrl) {
        result = await this.connection.queryMore<AQUAViolationGroup>(result.nextRecordsUrl);
        allRecords = allRecords.concat(result.records);
      }
      
      console.log(`📊 Found ${allRecords.length} AQUA ViolationGroup records with URLs`);
      
      return allRecords;
    } catch (error) {
      throw new Error(`Failed to query AQUA ViolationGroup records: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getViolationGroupById(id: string): Promise<AQUAViolationGroup | null> {
    try {
      const soql = `
        SELECT Id, Name, Component_Screenshot_URL__c, HTML_Source__c, Screenshot_URL__c
        FROM AQUA_ViolationGroup__c
        WHERE Id = '${id}'
      `;

      const result = await this.connection.query<AQUAViolationGroup>(soql);
      return result.records.length > 0 ? result.records[0] : null;
    } catch (error) {
      throw new Error(`Failed to query AQUA ViolationGroup by ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 