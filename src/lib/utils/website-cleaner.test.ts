// Test for the website cleaner function
const cleanWebsiteUrl = (url: string | null | undefined): string => {
  if (!url) return 'N/A';
  
  try {
    // Remove protocol (http://, https://, etc.)
    let cleanUrl = url.replace(/^https?:\/\//, '');
    
    // Remove everything after the first slash (including the slash)
    cleanUrl = cleanUrl.split('/')[0];
    
    // Remove trailing slashes
    cleanUrl = cleanUrl.replace(/\/+$/, '');
    
    return cleanUrl || url; // Fallback to original if cleaning results in empty string
  } catch (error) {
    return url; // Return original URL if there's an error
  }
};

// Test cases
console.log(cleanWebsiteUrl("https://www.example.com")); // Should output: www.example.com
console.log(cleanWebsiteUrl("http://example.com/path")); // Should output: example.com
console.log(cleanWebsiteUrl("https://www.example.com/")); // Should output: www.example.com
console.log(cleanWebsiteUrl("example.com/path/to/page")); // Should output: example.com
console.log(cleanWebsiteUrl(null)); // Should output: N/A
console.log(cleanWebsiteUrl(undefined)); // Should output: N/A
console.log(cleanWebsiteUrl("")); // Should output: N/A