package auth_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"tempo-api/internal/auth"
)

func TestGoogleAuth_AuthorizationHeaderCheck(t *testing.T) {
	ga := auth.NewGoogleAuth([]string{"lucasshawn@gmail.com"})
	handler := ga.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("authorized"))
	}))

	// Missing header -> 401
	req1 := httptest.NewRequest("GET", "/api/v1/admin/stats", nil)
	w1 := httptest.NewRecorder()
	handler.ServeHTTP(w1, req1)
	if w1.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized for missing token, got %d", w1.Code)
	}

	// Dev bypass key -> 200
	req2 := httptest.NewRequest("GET", "/api/v1/admin/stats", nil)
	req2.Header.Set("X-Admin-Key", "lucasshawn@gmail.com")
	w2 := httptest.NewRecorder()
	handler.ServeHTTP(w2, req2)
	if w2.Code != http.StatusOK {
		t.Errorf("expected 200 OK for valid dev key, got %d", w2.Code)
	}
}

func TestGoogleAuth_NewGoogleAuth_DefaultsAndEnv(t *testing.T) {
	// Case 1: Empty allowedEmails -> fallback to default
	gaDefault := auth.NewGoogleAuth(nil)
	if !gaDefault.IsAuthorized("lucasshawn@gmail.com") {
		t.Errorf("expected default authorized email lucasshawn@gmail.com")
	}

	// Case 2: Custom env variable
	os.Setenv("AUTHORIZED_ADMIN_EMAILS", "admin1@example.com, admin2@example.com ")
	gaEnv := auth.NewGoogleAuth([]string{})
	if !gaEnv.IsAuthorized("admin1@example.com") || !gaEnv.IsAuthorized("admin2@example.com") {
		t.Errorf("expected emails from AUTHORIZED_ADMIN_EMAILS to be authorized")
	}
	if gaEnv.IsAuthorized("lucasshawn@gmail.com") {
		t.Errorf("expected lucasshawn@gmail.com not to be authorized when env specifies others")
	}
	os.Unsetenv("AUTHORIZED_ADMIN_EMAILS")

	// Case 3: Explicit emails list takes precedence and is case-insensitive
	gaExplicit := auth.NewGoogleAuth([]string{" Lucas@Domain.COM "})
	if !gaExplicit.IsAuthorized("lucas@domain.com") {
		t.Errorf("expected trimmed and lowercased email to be authorized")
	}

	// Case 4: GOOGLE_CLIENT_ID env variable is picked up
	os.Setenv("GOOGLE_CLIENT_ID", "tempo-client-123.apps.googleusercontent.com")
	defer os.Unsetenv("GOOGLE_CLIENT_ID")
	gaWithClientID := auth.NewGoogleAuth(nil)
	// gaWithClientID has expectedClientID set
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(auth.GoogleTokenInfo{
			Email:         "lucasshawn@gmail.com",
			EmailVerified: "true",
			Audience:      "tempo-client-123.apps.googleusercontent.com",
		})
	}))
	defer server.Close()
	gaWithClientID.SetTokenInfoURL(server.URL)
	gaWithClientID.SetHTTPClient(server.Client())
	if _, err := gaWithClientID.VerifyToken("dummy-token"); err != nil {
		t.Errorf("expected token with matching audience from GOOGLE_CLIENT_ID to succeed, got %v", err)
	}
}

func TestGoogleAuth_VerifyToken_MockServer(t *testing.T) {
	// Setup mock Google OAuth tokeninfo server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("id_token")
		switch token {
		case "valid-token":
			info := auth.GoogleTokenInfo{
				Email:         "lucasshawn@gmail.com",
				EmailVerified: "true",
				Audience:      "test-client-id",
				ExpiresIn:     "3600",
			}
			json.NewEncoder(w).Encode(info)
		case "unauthorized-email-token":
			info := auth.GoogleTokenInfo{
				Email:         "intruder@evil.com",
				EmailVerified: "true",
				Audience:      "test-client-id",
				ExpiresIn:     "3600",
			}
			json.NewEncoder(w).Encode(info)
		case "unverified-email-token":
			info := auth.GoogleTokenInfo{
				Email:         "lucasshawn@gmail.com",
				EmailVerified: "false",
				Audience:      "test-client-id",
				ExpiresIn:     "3600",
			}
			json.NewEncoder(w).Encode(info)
		case "invalid-token":
			info := auth.GoogleTokenInfo{
				ErrorDesc: "Invalid Value",
			}
			json.NewEncoder(w).Encode(info)
		default:
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "bad request"})
		}
	}))
	defer server.Close()

	ga := auth.NewGoogleAuth([]string{"lucasshawn@gmail.com"})
	ga.SetTokenInfoURL(server.URL)
	ga.SetHTTPClient(server.Client())

	// 1. Empty token
	if _, err := ga.VerifyToken(""); err == nil {
		t.Errorf("expected error for empty token")
	}

	// 2. Valid token & authorized user
	email, err := ga.VerifyToken("valid-token")
	if err != nil {
		t.Fatalf("expected valid token to pass, got error: %v", err)
	}
	if email != "lucasshawn@gmail.com" {
		t.Errorf("expected email lucasshawn@gmail.com, got %s", email)
	}

	// 3. Unauthorized email token
	_, err = ga.VerifyToken("unauthorized-email-token")
	if err == nil {
		t.Fatalf("expected error for unauthorized email")
	}
	if err != nil && err.Error() != "forbidden: email intruder@evil.com is not authorized" {
		t.Errorf("unexpected forbidden error message: %v", err)
	}

	// 4. Unverified email token
	_, err = ga.VerifyToken("unverified-email-token")
	if err == nil {
		t.Fatalf("expected error for unverified email")
	}

	// 5. Invalid token
	_, err = ga.VerifyToken("invalid-token")
	if err == nil {
		t.Fatalf("expected error for invalid token")
	}
}

func TestGoogleAuth_Middleware_FullFlow(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("id_token")
		if token == "good-token" {
			json.NewEncoder(w).Encode(auth.GoogleTokenInfo{
				Email:         "lucasshawn@gmail.com",
				EmailVerified: "true",
			})
		} else if token == "forbidden-token" {
			json.NewEncoder(w).Encode(auth.GoogleTokenInfo{
				Email:         "stranger@example.com",
				EmailVerified: "true",
			})
		} else {
			json.NewEncoder(w).Encode(auth.GoogleTokenInfo{
				ErrorDesc: "invalid token",
			})
		}
	}))
	defer server.Close()

	ga := auth.NewGoogleAuth([]string{"lucasshawn@gmail.com"})
	ga.SetTokenInfoURL(server.URL)
	ga.SetHTTPClient(server.Client())

	var capturedUser string
	handler := ga.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedUser = r.Header.Get("X-Authenticated-User")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}))

	// Case 1: Missing Bearer prefix
	req1 := httptest.NewRequest("GET", "/api/v1/admin/stats", nil)
	req1.Header.Set("Authorization", "Basic abc")
	w1 := httptest.NewRecorder()
	handler.ServeHTTP(w1, req1)
	if w1.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for Basic auth, got %d", w1.Code)
	}

	// Case 2: Forbidden email -> 403
	req2 := httptest.NewRequest("GET", "/api/v1/admin/stats", nil)
	req2.Header.Set("Authorization", "Bearer forbidden-token")
	w2 := httptest.NewRecorder()
	handler.ServeHTTP(w2, req2)
	if w2.Code != http.StatusForbidden {
		t.Errorf("expected 403 Forbidden for unauthorized email, got %d", w2.Code)
	}

	// Case 3: Invalid token -> 401
	req3 := httptest.NewRequest("GET", "/api/v1/admin/stats", nil)
	req3.Header.Set("Authorization", "Bearer invalid-token")
	w3 := httptest.NewRecorder()
	handler.ServeHTTP(w3, req3)
	if w3.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized for invalid token, got %d", w3.Code)
	}

	// Case 4: Valid Bearer token -> 200 + sets X-Authenticated-User
	req4 := httptest.NewRequest("GET", "/api/v1/admin/stats", nil)
	req4.Header.Set("Authorization", "Bearer good-token")
	w4 := httptest.NewRecorder()
	handler.ServeHTTP(w4, req4)
	if w4.Code != http.StatusOK {
		t.Errorf("expected 200 OK for valid Bearer token, got %d", w4.Code)
	}
	if capturedUser != "lucasshawn@gmail.com" {
		t.Errorf("expected capturedUser lucasshawn@gmail.com, got %s", capturedUser)
	}

	// Case 5: Invalid Dev Key -> Falls through to missing Bearer -> 401
	req5 := httptest.NewRequest("GET", "/api/v1/admin/stats", nil)
	req5.Header.Set("X-Admin-Key", "notauthorized@domain.com")
	w5 := httptest.NewRecorder()
	handler.ServeHTTP(w5, req5)
	if w5.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized for invalid dev key without Bearer, got %d", w5.Code)
	}

	// Case 6: Mismatched Audience -> 403 Forbidden
	ga.SetExpectedClientID("required-client-id")
	req6 := httptest.NewRequest("GET", "/api/v1/admin/stats", nil)
	req6.Header.Set("Authorization", "Bearer good-token")
	w6 := httptest.NewRecorder()
	handler.ServeHTTP(w6, req6)
	if w6.Code != http.StatusForbidden {
		t.Errorf("expected 403 Forbidden for mismatched audience, got %d", w6.Code)
	}
}

func TestGoogleAuth_AudienceVerification(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("id_token")
		switch token {
		case "client-a-token":
			json.NewEncoder(w).Encode(auth.GoogleTokenInfo{
				Email:         "lucasshawn@gmail.com",
				EmailVerified: "true",
				Audience:      "client-a.apps.googleusercontent.com",
			})
		case "client-b-token":
			json.NewEncoder(w).Encode(auth.GoogleTokenInfo{
				Email:         "lucasshawn@gmail.com",
				EmailVerified: "true",
				Audience:      "client-b.apps.googleusercontent.com",
			})
		default:
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "unknown token"})
		}
	}))
	defer server.Close()

	ga := auth.NewGoogleAuth([]string{"lucasshawn@gmail.com"})
	ga.SetTokenInfoURL(server.URL)
	ga.SetHTTPClient(server.Client())

	// 1. Empty expectedClientID allows any valid audience
	ga.SetExpectedClientID("")
	email, err := ga.VerifyToken("client-a-token")
	if err != nil || email != "lucasshawn@gmail.com" {
		t.Fatalf("expected empty expectedClientID to accept client-a-token, got err: %v, email: %s", err, email)
	}
	email, err = ga.VerifyToken("client-b-token")
	if err != nil || email != "lucasshawn@gmail.com" {
		t.Fatalf("expected empty expectedClientID to accept client-b-token, got err: %v, email: %s", err, email)
	}

	// 2. Matching expectedClientID passes
	ga.SetExpectedClientID("client-a.apps.googleusercontent.com")
	email, err = ga.VerifyToken("client-a-token")
	if err != nil || email != "lucasshawn@gmail.com" {
		t.Fatalf("expected matching expectedClientID to accept client-a-token, got err: %v, email: %s", err, email)
	}

	// 3. Mismatched expectedClientID fails with exact error message
	_, err = ga.VerifyToken("client-b-token")
	if err == nil {
		t.Fatalf("expected error for mismatched client-b-token")
	}
	expectedErrMsg := "forbidden: token audience does not match configured Google Client ID"
	if err.Error() != expectedErrMsg {
		t.Errorf("expected error '%s', got '%s'", expectedErrMsg, err.Error())
	}
}
