package payment

import (
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
)

func TestCalculatePlatformFee(t *testing.T) {
	uc := &StripeUseCase{}

	tests := []struct {
		amount   string
		expected string
	}{
		{"100.00", "12.00"},
		{"50.00", "6.00"},
		{"99.99", "11.9988"},
		{"1000.00", "120.00"},
		{"0.00", "0.00"},
	}

	for _, tt := range tests {
		amount, _ := decimal.NewFromString(tt.amount)
		expected, _ := decimal.NewFromString(tt.expected)
		fee := uc.CalculatePlatformFee(amount)
		assert.True(t, fee.Equal(expected), "expected %s but got %s", expected.String(), fee.String())
	}
}

func TestPlatformFeePercentConstant(t *testing.T) {
	assert.Equal(t, 12.0, PlatformFeePercent)
}
