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
        
        // Log full response for debugging
        console.log('Full API response:', data);
        
        // Check which format the API is returning
        if (data.signedUrl) {
          // Original expected format
          setSignedUrl(data.signedUrl);
          console.log('Using direct signedUrl from API');
        } else if (data.hasSignedUrl && data.signedUrlPrefix) {
          // Format from console logs
          console.log('Using signedUrlPrefix from API');
          
          // Check if the prefix already includes the filename or if we need to append it
          const prefix = data.signedUrlPrefix.endsWith('/') 
            ? data.signedUrlPrefix.slice(0, -1) 
            : data.signedUrlPrefix;
            
          // Extract filename from original URL
          const filename = fileUrl.split('/').pop();
          
          // If the prefix already seems to contain the full path, use it directly
          if (prefix.includes(filename || '')) {
            setSignedUrl(prefix);
          } else {
            // Otherwise construct the URL by appending the filename
            setSignedUrl(`${prefix}/${filename}`);
          }
          
          console.log('Constructed signed URL:', `${prefix}/${filename}`);
        } else {
          // Fallback to original URL if API response isn't in expected format
          console.warn('Unexpected API response format, using original URL');
          setSignedUrl(fileUrl);
        }
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