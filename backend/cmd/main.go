package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"boutline/internal/config"
	"boutline/internal/server"
)

const shutdownTimeout = 10 * time.Second

func main() {
	if err := run(); err != nil {
		slog.Error("server exited with error", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.LoadConfiguration()
	if err != nil {
		return fmt.Errorf("load configuration: %w", err)
	}

	app := server.CreateApp(cfg)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Buffered so the listener goroutine can exit even if we already returned
	// through the ctx.Done branch.
	listenErr := make(chan error, 1)
	go func() {
		addr := fmt.Sprintf(":%d", cfg.App.Port)
		slog.Info("server starting", "addr", addr, "environment", cfg.Environment)
		listenErr <- app.Listen(addr)
	}()

	select {
	case err := <-listenErr:
		return fmt.Errorf("listen: %w", err)
	case <-ctx.Done():
	}

	slog.Info("shutting down", "timeout", shutdownTimeout)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	if err := app.ShutdownWithContext(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown server: %w", err)
	}

	slog.Info("server exited gracefully")

	return nil
}
