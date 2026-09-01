package auth

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

// GoogleTokenInfo represents the payload returned by Google's tokeninfo endpoint.
type GoogleTokenInfo struct {
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Audience      string `json:"aud"`
	ExpiresIn     string `json:"expires_in"`
	ErrorDesc     string `json:"error_description"`
}

// GoogleAuth handles Google OAuth2 ID token verification and HTTP auth middleware.
type GoogleAuth struct {
	authorizedEmails map[string]bool
	expectedClientID string
	httpClient       *http.Client
	tokenInfoURL     string
}

// NewGoogleAuth creates a new GoogleAuth instance.
// If allowedEmails is empty, it falls back to AUTHORIZED_ADMIN_EMAILS env variable,
// or defaults to "lucasshawn@gmail.com".
func NewGoogleAuth(allowedEmails []string) *GoogleAuth {
	emailMap := make(map[string]bool)
	for _, email := range allowedEmails {
		trimmed := strings.ToLower(strings.TrimSpace(email))
		if trimmed != "" {
			emailMap[trimmed] = true
		}
	}

	// Fallback to env var or default
	if len(emailMap) == 0 {
		envEmails := os.Getenv("AUTHORIZED_ADMIN_EMAILS")
		if envEmails != "" {
			for _, e := range strings.Split(envEmails, ",") {
				trimmed := strings.ToLower(strings.TrimSpace(e))
				if trimmed != "" {
					emailMap[trimmed] = true
				}
			}
		} else {
			emailMap["lucasshawn@gmail.com"] = true
		}
	}

	return &GoogleAuth{
		authorizedEmails: emailMap,
		expectedClientID: os.Getenv("GOOGLE_CLIENT_ID"),
		httpClient:       &http.Client{Timeout: 5 * time.Second},
	}
}

// IsAuthorized checks if the specified email is present in the authorized list.
func (g *GoogleAuth) IsAuthorized(email string) bool {
	return g.authorizedEmails[strings.ToLower(strings.TrimSpace(email))]
}

// SetExpectedClientID configures the expected Google Client ID audience (useful for unit testing or runtime config).
func (g *GoogleAuth) SetExpectedClientID(clientID string) {
	g.expectedClientID = clientID
}

// SetHTTPClient configures a custom HTTP client (useful for unit testing).
func (g *GoogleAuth) SetHTTPClient(client *http.Client) {
	g.httpClient = client
}

// SetTokenInfoURL configures a custom tokeninfo URL (useful for unit testing).
func (g *GoogleAuth) SetTokenInfoURL(url string) {
	g.tokenInfoURL = url
}

// VerifyToken validates a Google ID token with Google's tokeninfo API
// and verifies that the email is verified and on the authorized list.
func (g *GoogleAuth) VerifyToken(idToken string) (string, error) {
	if idToken == "" {
		return "", errors.New("empty id token")
	}

	baseURL := g.tokenInfoURL
	if baseURL == "" {
		baseURL = "https://oauth2.googleapis.com/tokeninfo"
	}

	url := fmt.Sprintf("%s?id_token=%s", baseURL, idToken)
	client := g.httpClient
	if client == nil {
		client = &http.Client{Timeout: 5 * time.Second}
	}

	resp, err := client.Get(url)
	if err != nil {
		return "", fmt.Errorf("failed to call Google tokeninfo: %w", err)
	}
	defer resp.Body.Close()

	var info GoogleTokenInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return "", fmt.Errorf("failed to decode Google token response: %w", err)
	}

	if info.ErrorDesc != "" || info.Email == "" {
		return "", fmt.Errorf("invalid token: %s", info.ErrorDesc)
	}

	if g.expectedClientID != "" && info.Audience != g.expectedClientID {
		return "", errors.New("forbidden: token audience does not match configured Google Client ID")
	}

	if strings.ToLower(info.EmailVerified) != "true" {
		return "", errors.New("google email is not verified")
	}

	userEmail := strings.ToLower(strings.TrimSpace(info.Email))
	if !g.authorizedEmails[userEmail] {
		return userEmail, fmt.Errorf("forbidden: email %s is not authorized", userEmail)
	}

	return userEmail, nil
}

// Middleware returns an http.Handler middleware that validates authentication
// via X-Admin-Key (development / internal bypass) or Authorization: Bearer <id_token>.
// Downstream handlers receive the verified user email via the X-Authenticated-User header.
func (g *GoogleAuth) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Dev Key / Test Header Support
		if devKey := r.Header.Get("X-Admin-Key"); devKey != "" {
			normalizedKey := strings.ToLower(strings.TrimSpace(devKey))
			if g.authorizedEmails[normalizedKey] {
				r.Header.Set("X-Authenticated-User", normalizedKey)
				next.ServeHTTP(w, r)
				return
			}
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, `{"error":"Missing or invalid Authorization header"}`, http.StatusUnauthorized)
			return
		}

		idToken := strings.TrimPrefix(authHeader, "Bearer ")
		userEmail, err := g.VerifyToken(idToken)
		if err != nil {
			if strings.Contains(err.Error(), "forbidden") {
				http.Error(w, fmt.Sprintf(`{"error":"Forbidden: %s"}`, err.Error()), http.StatusForbidden)
			} else {
				http.Error(w, fmt.Sprintf(`{"error":"Unauthorized: %s"}`, err.Error()), http.StatusUnauthorized)
			}
			return
		}

		// Inject user email into header for downstream handlers
		r.Header.Set("X-Authenticated-User", userEmail)
		next.ServeHTTP(w, r)
	})
}
