export const prerender = false;

import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';
import { programs } from '../../data/programs';

export const POST: APIRoute = async ({ request }) => {
    const data = await request.json();
    const { name, email, phone, message, program: programTitle, type, modality } = data;

    // Find program details
    const programDetails = programs.find(p => p.title === programTitle) || {};
    const {
        instructor = "Claustro Docente CEPRIJA",
        startDate = "Por confirmar",
        schedule = "Por confirmar",
        address = "Instalaciones de CEPRIJA - Lope de Vega #273, Col. Americana Arcos. C.P. 44500",
        meetingLink = "Se enviará previo al evento"
    } = programDetails;

    // 1. Configure Transporter
    const transporter = nodemailer.createTransport({
        host: import.meta.env.SMTP_HOST,
        port: parseInt(import.meta.env.SMTP_PORT),
        secure: import.meta.env.SMTP_SECURE === 'true',
        auth: {
            user: import.meta.env.SMTP_USER,
            pass: import.meta.env.SMTP_PASS,
        },
    });

    // 2. Send Admin Notification (Internal)
    const adminMailOptions = {
        from: `"Web Ceprija" <${import.meta.env.CONTACT_EMAIL}>`,
        to: import.meta.env.CONTACT_EMAIL,
        subject: `Nuevo ${type === 'registration' ? 'Registro' : 'Mensaje'}: ${programTitle || 'General'}`,
        html: `
      <h2>Nuevo contacto desde la web</h2>
      <p><strong>Tipo:</strong> ${type === 'registration' ? 'Inscripción' : 'Contacto General'}</p>
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Teléfono:</strong> ${phone}</p>
      <p><strong>Programa:</strong> ${programTitle || 'N/A'}</p>
      <p><strong>Modalidad:</strong> ${modality || 'N/A'}</p>
      <p><strong>Mensaje:</strong> ${message || 'N/A'}</p>
    `,
    };

    try {
        await transporter.sendMail(adminMailOptions);
    } catch (error) {
        console.error('Error sending admin email:', error);
    }

    // 3. Send User Confirmation Email (Only for Registrations)
    if (type === 'registration') {
        // Normalize logic to catch 'Online', 'En línea', 'en línea', etc.
        const isOnline = (modality || '').toLowerCase().includes('línea') || (modality || '').toLowerCase().includes('online');

        // Template Content
        const emailSubject = `Confirmación de Registro - ${programTitle}`;

        const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <!-- Header -->
        <div style="background-color: #1e3a8a; padding: 20px; text-align: center;">
             <h1 style="color: white; margin: 0; font-size: 24px;">CEPRIJA</h1>
             <p style="color: #bfdbfe; margin: 5px 0 0;">Centro de Preparación Integral en Materia Jurídica y Administrativa</p>
        </div>

        <!-- Body -->
        <div style="padding: 30px 20px; background-color: #f8fafc;">
            <p style="font-size: 16px; margin-bottom: 20px;">
                <strong>${programTitle}</strong>
            </p>
            <p>Estimado(a): <strong>${name}</strong></p>
            
            <p>Reciba un cordial saludo, le notificamos por este medio que se ha confirmado su participación 
            <strong>${isOnline ? 'en línea' : 'presencial'}</strong> para el <strong>${programTitle}</strong> 
            con el <strong>${instructor}</strong>. Su participación es muy valiosa para nosotros 
            y estamos seguros de que esta capacitación será de mucho aprendizaje para usted.</p>
            
            <p>A continuación le compartimos información valiosa para su asistencia.</p>

            <div style="background-color: white; border-left: 4px solid #1e3a8a; padding: 15px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <h3 style="color: #1e3a8a; margin-top: 0;">Detalles del evento:</h3>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="margin-bottom: 8px;">📅 <strong>Fecha:</strong> ${startDate}</li>
                    <li style="margin-bottom: 8px;">⏰ <strong>Duración:</strong> ${schedule}</li>
                    ${isOnline
                ? `<li style="margin-bottom: 8px;">💻 <strong>Modalidad en línea:</strong> <a href="${meetingLink}" style="color: #2563eb;">${meetingLink}</a></li>
                           <li style="margin-bottom: 8px;">🏢 <strong>Modalidad presencial:</strong> ${address}</li>`
                : `<li style="margin-bottom: 8px;">🏢 <strong>Instalaciones:</strong> ${address}</li>`
            }           </ul>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                Para cualquier duda o aclaración favor de comunicarse al:<br>
                📱 <strong>Whatsapp:</strong> <a href="https://wa.me/+523317674864" style="color: #2563eb; text-decoration: none;">33 1767 4864</a><br>
                ✉️ <strong>Correo electrónico:</strong> <a href="mailto:contacto@ceprija.edu.mx" style="color: #2563eb; text-decoration: none;">contacto@ceprija.edu.mx</a>
            </p>

            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8;">
                <p>Para más información visite nuestros sitios oficiales:<br>
                <a href="https://ceprija.edu.mx/" style="color: #64748b;">Página Web</a> • 
                <a href="https://www.facebook.com/ceprijaedu.mx" style="color: #64748b;">Facebook</a> • 
                <a href="https://www.instagram.com/ceprijaedu" style="color: #64748b;">Instagram</a></p>
            </div>
        </div>
      </div>
    `;

        try {
            await transporter.sendMail({
                from: `"CEPRIJA Académico" <${import.meta.env.CONTACT_EMAIL}>`,
                to: email,
                subject: emailSubject,
                html: emailBody,
            });
        } catch (error) {
            console.error('Error sending user confirmation email:', error);
        }
    }

    // 4. Save to Google Sheets (Via Webhook)
    if (type === 'registration') {
        try {
            const scriptUrl = import.meta.env.GOOGLE_SCRIPT_URL;
            if (!scriptUrl) {
                console.warn("GOOGLE_SCRIPT_URL missing in env.");
            } else {
                // Using global fetch (available in Astro/Node 18+)
                await fetch(scriptUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        phone,
                        program: programTitle,
                        modality: modality || 'No definida'
                    })
                });
            }
        } catch (sheetError) {
            console.error('Error saving to Google Sheet via Webhook:', sheetError);
        }
    }

    return new Response(
        JSON.stringify({
            message: 'Recibido correctamente',
        }),
        { status: 200 }
    );
};
