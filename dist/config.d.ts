import { MonitoringConfig } from './types';
import { AuthManager } from './auth-manager';
export declare const authManager: AuthManager;
export declare const config: {
    salesforce: {
        username: string;
        password: string;
        loginUrl: string;
    };
    dataStore: {
        cookies: string;
        sessionId: string;
        useAutoAuth: boolean;
    };
    monitoring: MonitoringConfig;
    output: {
        generateJSON: boolean;
        generateCSV: boolean;
        outputDir: string;
    };
};
export declare function validateConfig(): void;
//# sourceMappingURL=config.d.ts.map