import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const { name, email, phone, message, program } = data;

        // Basic validation
        if (!name || !email || !phone || !message) {
            return new Response(
                JSON.stringify({
                    message: 'Faltan campos requeridos',
                }),
                { status: 400 }
            );
        }

        // Create transporter
        const host = import.meta.env.SMTP_HOST || 'smtp.example.com';
        const port = parseInt(import.meta.env.SMTP_PORT || '587');
        const secure = import.meta.env.SMTP_SECURE === 'true';
        const user = import.meta.env.SMTP_USER || 'user';
        const pass = import.meta.env.SMTP_PASS || 'pass';

        console.log(`[Email Config] Host: ${host}, Port: ${port}, Secure: ${secure}`);

        if (port === 587 && secure) {
            console.warn('⚠️ ADVERTENCIA: El puerto 587 suele requerir secure: false (STARTTLS). Tienes configurado secure: true.');
        }

        const transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: {
                user,
                pass,
            },
            tls: {
                // Do not fail on invalid certs
                rejectUnauthorized: false,
            },
        });

        const mailOptions = {
            from: `"CEPRIJA Web" <${import.meta.env.SMTP_FROM}>`,
            to: (import.meta.env.CONTACT_EMAIL).split(',').map((email: string) => email.trim()),
            subject: `Nueva Solicitud de Información: ${program}`,
            text: `
        Nueva solicitud de información desde el sitio web.
        
        Programa de interés: ${program}
        
        Detalles del contacto:
        Nombre: ${name}
        Email: ${email}
        Teléfono: ${phone}
        
        Mensaje:
        ${message}
      `,
            html: `
        <h2>Nueva solicitud de información</h2>
        <p><strong>Programa de interés:</strong> ${program}</p>
        <h3>Detalles del contacto:</h3>
        <ul>
          <li><strong>Nombre:</strong> ${name}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Teléfono:</strong> ${phone}</li>
        </ul>
        <h3>Mensaje:</h3>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
        };

        // If no real credentials, just log it for dev
        if (!import.meta.env.SMTP_HOST) {
            console.log('--- SIMULATING EMAIL SEND ---');
            console.log(JSON.stringify(mailOptions, null, 2));
            console.log('-----------------------------');

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            return new Response(
                JSON.stringify({
                    message: 'Email simulado correctamente (modo desarrollo)',
                }),
                { status: 200 }
            );
        }

        // Send email
        await transporter.sendMail(mailOptions);

        return new Response(
            JSON.stringify({
                message: 'Correo enviado exitosamente',
            }),
            { status: 200 }
        );
    } catch (error: any) {
        console.error('Error sending email:', error);

        // Helper for Gmail users
        if (error.code === 'EAUTH' && (import.meta.env.SMTP_HOST || '').includes('gmail')) {
            console.error('\n❌ ERROR DE AUTENTICACIÓN GMAIL:');
            console.error('Es probable que necesites una "Contraseña de Aplicación" en lugar de tu contraseña normal.');
            console.error('1. Activa la Verificación en 2 Pasos en tu cuenta de Google.');
            console.error('2. Ve a: https://myaccount.google.com/apppasswords');
            console.error('3. Genera una nueva contraseña y úsala en SMTP_PASS en tu archivo .env.\n');
        }

        return new Response(
            JSON.stringify({
                message: 'Error interno al enviar el correo',
            }),
            { status: 500 }
        );
    }
};
