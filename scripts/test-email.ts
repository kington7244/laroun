import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_GLSyWHCW_MUxkHDWFi17eBXshr1zr1UmC'

async function testEmail() {
    console.log('Testing Resend API...')
    console.log('API Key:', RESEND_API_KEY.substring(0, 10) + '...')
    
    const resend = new Resend(RESEND_API_KEY)
    
    try {
        // Test 1: Using Resend's test email (always works)
        console.log('\n--- Test 1: Using onboarding@resend.dev ---')
        const result1 = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'delivered@resend.dev',
            subject: 'Test Email from Laroun',
            html: '<p>Hello from Laroun! This is a test.</p>'
        })
        console.log('Result:', JSON.stringify(result1, null, 2))
        
        // Test 2: Using custom domain
        console.log('\n--- Test 2: Using noreply@laroun.com ---')
        const result2 = await resend.emails.send({
            from: 'Laroun <noreply@laroun.com>',
            to: 'delivered@resend.dev',
            subject: 'Test Email from Laroun Custom Domain',
            html: '<p>Hello from Laroun with custom domain!</p>'
        })
        console.log('Result:', JSON.stringify(result2, null, 2))
        
    } catch (error: any) {
        console.error('\n❌ Error:', error.message)
        if (error.statusCode) {
            console.error('Status Code:', error.statusCode)
        }
        if (error.name) {
            console.error('Error Name:', error.name)
        }
        
        // Log full error for debugging
        console.error('\nFull Error Details:')
        console.error(JSON.stringify(error, null, 2))
    }
}

testEmail()
