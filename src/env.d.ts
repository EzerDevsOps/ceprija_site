/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
    readonly SMTP_HOST: string;
    readonly SMTP_PORT: string;
    readonly SMTP_SECURE: string;
    readonly SMTP_USER: string;
    readonly SMTP_PASS: string;
    readonly CONTACT_EMAIL: string;
    readonly GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
    readonly GOOGLE_PRIVATE_KEY: string;
    readonly GOOGLE_SHEET_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
