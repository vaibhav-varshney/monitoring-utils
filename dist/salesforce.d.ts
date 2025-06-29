import { AQUAViolationGroup } from './types';
export declare class SalesforceService {
    private connection;
    constructor(loginUrl: string);
    login(username: string, password: string): Promise<void>;
    getAllViolationGroups(): Promise<AQUAViolationGroup[]>;
    getViolationGroupById(id: string): Promise<AQUAViolationGroup | null>;
}
//# sourceMappingURL=salesforce.d.ts.map