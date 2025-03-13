"use client";

import { useState, useEffect } from 'react';

interface UsePdfFileProps {
  fileId: number;
  fileUrl: string; // Original URL (not signed)
}

interface UsePdfFileResult {
  signedUrl: string | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function usePdfFile({ fileId, fileUrl }: UsePdfFileProps): UsePdfFileResult {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0); // For retry mechanism

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // For debugging
        console.log(`Fetching signed URL for fileId: ${fileId}`);
        
        // Always fetch the signed URL from the API
        const token = localStorage.getItem('token'); // Assuming you store JWT in localStorage
        
        if (!token) {
          console.error('No authentication token found');
          throw new Error('Authentication required');
        }
        
        // Use camelCase 'fileId' as expected by the API
        const response = await fetch(`/api/files/getSignedUrl?fileId=${fileId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        console.log(`Response status: ${response.status}`);
        
        // Clone the response for multiple reads
        const responseClone = response.clone();
        
        if (!response.ok) {
          let errorMessage = `HTTP error ${response.status}`;
          
          try {
            const errorData = await responseClone.json();
            console.error('Error response data:', errorData);
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            console.error('Could not parse error response:', parseError);
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        // Debug response data (without showing the full signed URL for security)
        console.log('API response received', { 
          hasSignedUrl: !!data.signedUrl,
          signedUrlPrefix: data.signedUrl ? data.signedUrl.substring(0, 30) + '...' : null 
        });
        
        if (!data.signedUrl) {
          throw new Error('No signed URL returned from server');
        }
        
        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('Error fetching signed URL:', err);
        setError(typeof err === 'object' && err !== null && 'message' in err 
          ? String(err.message) 
          : 'Failed to load PDF. Please try again later.');
          
        // If we still have the original URL, we can try to use it directly as a fallback
        if (fileUrl && fetchCount > 1) {
          console.log('Attempting to use original fileUrl as fallback');
          setSignedUrl(fileUrl);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [fileId, fileUrl, fetchCount]);

  const retry = () => {
    setFetchCount(prev => prev + 1);
  };

  return { signedUrl, loading, error, retry };
}