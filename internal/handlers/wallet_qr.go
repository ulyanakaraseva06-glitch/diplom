package handlers

import (
	"fmt"
	"math"
	"os"
	"strings"
)

type sbpReceiverConfig struct {
	Name        string
	PersonalAcc string
	BankName    string
	BIC         string
	CorrespAcc  string
}

func loadSBPReceiverConfig() sbpReceiverConfig {
	return sbpReceiverConfig{
		Name:        envOr("WALLET_SBP_NAME", "GAMER.OK (демо)"),
		PersonalAcc: envOr("WALLET_SBP_ACCOUNT", "40817810800000000000"),
		BankName:    envOr("WALLET_SBP_BANK", "Демо-банк"),
		BIC:         envOr("WALLET_SBP_BIC", "044525225"),
		CorrespAcc:  envOr("WALLET_SBP_CORR_ACCOUNT", "30101810400000000225"),
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// buildSBPPayload — строка для QR СБП (формат ST00012, сумма в копейках).
func buildSBPPayload(cfg sbpReceiverConfig, amount float64, purpose string) string {
	sumKopecks := int64(math.Round(amount * 100))
	if sumKopecks < 1 {
		sumKopecks = 1
	}
	purpose = strings.TrimSpace(purpose)
	if purpose == "" {
		purpose = "Пополнение кошелька GAMER.OK"
	}
	if len(purpose) > 210 {
		purpose = purpose[:210]
	}

	parts := []string{
		"ST00012",
		"Name=" + cfg.Name,
		"PersonalAcc=" + cfg.PersonalAcc,
		"BankName=" + cfg.BankName,
		"BIC=" + cfg.BIC,
		"CorrespAcc=" + cfg.CorrespAcc,
		fmt.Sprintf("Sum=%d", sumKopecks),
		"Purpose=" + purpose,
	}
	return strings.Join(parts, "|")
}
