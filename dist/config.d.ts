import { MonitoringConfig } from './types';
export declare const config: {
    salesforce: {
        username: string;
        password: string;
        loginUrl: string;
    };
    dataStore: {
        cookies: string;
        sessionId: string;
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