# WAF Options for Qikiworld

**Recommended:** Use a managed WAF at the edge (Cloudflare/AWS/Azure/GCP) with OWASP Top 10 rulesets and bot mitigation.  
**Alternative:** Self-host Nginx + ModSecurity (OWASP CRS).

Baseline rules:
- SQLi/XSS/RCE generic
- Request size & body limits
- Rate-limits per IP on auth/post/comment endpoints
- Geo/IP blocks if applicable

Remember to allow `/iframely` and media routes if you proxy those through the edge.
