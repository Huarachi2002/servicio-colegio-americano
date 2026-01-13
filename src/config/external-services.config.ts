import { registerAs } from '@nestjs/config';

/**
 * Configuración de servicios externos (BNB, etc.)
 */
export default registerAs('externalServices', () => ({
    bnb: {
        apiUrl: process.env.BNB_API_URL || 'http://test.bnb.com.bo',
        accountId: process.env.BNB_ACCOUNT_ID,
        authId: process.env.BNB_AUTH_ID,
    },
}));
