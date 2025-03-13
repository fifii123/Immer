import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Handle CORS preflight requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');

    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Ensure only GET requests are processed
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'No URL provided' });
    }

    try {
        // Fetch the PDF with additional headers
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                // Forward original authorization if needed
                ...(req.headers.authorization ? 
                    { 'Authorization': req.headers.authorization } : 
                    {}
                ),
                'Content-Type': 'application/pdf'
            }
        });

        // Ensure the response is successful
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Set content type to PDF
        res.setHeader('Content-Type', 'application/pdf');

        // Stream the response
        const arrayBuffer = await response.arrayBuffer();
        res.status(200).send(Buffer.from(arrayBuffer));

    } catch (error) {
        console.error('CORS Proxy Error:', error);
        res.status(500).json({ 
            error: 'Proxy request failed', 
            details: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
}