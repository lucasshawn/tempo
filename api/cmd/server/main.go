package main

import (
	"log"
	"net/http"
	"os"

	"tempo-api/internal/generator"
	"tempo-api/internal/handlers"
	"tempo-api/internal/store"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("Initializing Tempo Trace Store with 80 deterministic global trace contexts...")
	initialTraces := generator.GenerateSeedTraces(80)
	traceStore := store.NewTraceStore(initialTraces)

	router := handlers.NewRouter(traceStore)

	log.Printf("Tempo API server listening on :%s\n", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("Server stopped: %v", err)
	}
}
