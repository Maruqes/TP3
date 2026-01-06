package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

type webhookPayload struct {
	Status json.RawMessage `json:"status"`
}

func StartWebhookServer() error {
	addr := os.Getenv("WEBHOOK_ADDR")
	if addr == "" {
		addr = ":8080"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/webhook", handleWebhook)

	server := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("webhook server listening on %s", addr)
	return server.ListenAndServe()
}

func handleWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	defer r.Body.Close()
	var payload webhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if len(payload.Status) == 0 {
		http.Error(w, "missing status", http.StatusBadRequest)
		return
	}

	status, err := normalizeStatus(payload.Status)
	if err != nil {
		http.Error(w, "invalid status", http.StatusBadRequest)
		return
	}

	log.Printf("webhook status=%s", status)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

func normalizeStatus(raw json.RawMessage) (string, error) {
	var status string
	if err := json.Unmarshal(raw, &status); err == nil {
		return status, nil
	}
	var num float64
	if err := json.Unmarshal(raw, &num); err == nil {
		return fmt.Sprintf("%v", num), nil
	}
	return "", errors.New("unsupported status")
}
